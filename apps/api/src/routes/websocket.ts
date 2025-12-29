// ==========================================================================
// WEBSOCKET ROUTES
// Real-time collaboration and updates
// ==========================================================================

import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import {
  createPresenceStore,
  createTypingStore,
  createMessage,
  createUserJoinedMessage,
  createUserLeftMessage,
  createTypingMessage,
  createViewingMessage,
  getOrganizationRoomId,
  getEntityRoomId,
  getUserRoomId,
  type RealtimeMessage,
  type RealtimeEventType,
  type EntityType,
} from '@veilvault/core';

// ==========================================================================
// STORES
// ==========================================================================

const presenceStore = createPresenceStore();
const typingStore = createTypingStore();

// Connection tracking: Map<roomId, Set<WebSocket>>
const rooms = new Map<string, Set<WebSocket>>();

// Connection to user mapping: Map<WebSocket, ConnectionInfo>
interface ConnectionInfo {
  userId: string;
  userName: string;
  organizationId: string;
  rooms: Set<string>;
}
const connections = new Map<WebSocket, ConnectionInfo>();

// ==========================================================================
// HELPER FUNCTIONS
// ==========================================================================

function joinRoom(socket: WebSocket, roomId: string): void {
  let room = rooms.get(roomId);
  if (!room) {
    room = new Set();
    rooms.set(roomId, room);
  }
  room.add(socket);

  const info = connections.get(socket);
  if (info) {
    info.rooms.add(roomId);
  }
}

function leaveRoom(socket: WebSocket, roomId: string): void {
  const room = rooms.get(roomId);
  if (room) {
    room.delete(socket);
    if (room.size === 0) {
      rooms.delete(roomId);
    }
  }

  const info = connections.get(socket);
  if (info) {
    info.rooms.delete(roomId);
  }
}

function leaveAllRooms(socket: WebSocket): void {
  const info = connections.get(socket);
  if (info) {
    for (const roomId of info.rooms) {
      const room = rooms.get(roomId);
      if (room) {
        room.delete(socket);
        if (room.size === 0) {
          rooms.delete(roomId);
        }
      }
    }
    info.rooms.clear();
  }
}

function broadcastToRoom(roomId: string, message: RealtimeMessage, excludeSocket?: WebSocket): void {
  const room = rooms.get(roomId);
  if (!room) return;

  const data = JSON.stringify(message);
  for (const socket of room) {
    if (socket !== excludeSocket && socket.readyState === 1) {
      socket.send(data);
    }
  }
}

function sendToUser(userId: string, message: RealtimeMessage): void {
  const roomId = getUserRoomId(userId);
  broadcastToRoom(roomId, message);
}

function broadcastToOrganization(organizationId: string, message: RealtimeMessage, excludeSocket?: WebSocket): void {
  const roomId = getOrganizationRoomId(organizationId);
  broadcastToRoom(roomId, message, excludeSocket);
}

function sendToSocket(socket: WebSocket, message: RealtimeMessage): void {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(message));
  }
}

// ==========================================================================
// MESSAGE HANDLERS
// ==========================================================================

interface ClientMessage {
  type: string;
  payload?: unknown;
}

function handleClientMessage(socket: WebSocket, message: ClientMessage): void {
  const info = connections.get(socket);
  if (!info) return;

  switch (message.type) {
    case 'ping':
      sendToSocket(socket, createMessage('pong', { timestamp: new Date() }));
      break;

    case 'subscribe:entity': {
      const payload = message.payload as { entityType: EntityType; entityId: string };
      const roomId = getEntityRoomId(payload.entityType, payload.entityId);
      joinRoom(socket, roomId);

      // Notify others that user is viewing
      const viewingMsg = createViewingMessage(
        info.userId,
        info.userName,
        payload.entityType,
        payload.entityId
      );
      broadcastToRoom(roomId, viewingMsg, socket);

      // Update presence
      presenceStore.setViewing(info.userId, payload.entityType, payload.entityId);

      // Send current viewers to the user
      const viewers = presenceStore.getViewers(payload.entityType, payload.entityId);
      sendToSocket(socket, createMessage('viewers:list', { entityType: payload.entityType, entityId: payload.entityId, viewers }));
      break;
    }

    case 'unsubscribe:entity': {
      const payload = message.payload as { entityType: EntityType; entityId: string };
      const roomId = getEntityRoomId(payload.entityType, payload.entityId);
      leaveRoom(socket, roomId);
      presenceStore.clearViewing(info.userId);
      break;
    }

    case 'typing:start': {
      const payload = message.payload as { entityType: EntityType; entityId: string };
      typingStore.startTyping(info.userId, info.userName, payload.entityType, payload.entityId);

      const roomId = getEntityRoomId(payload.entityType, payload.entityId);
      broadcastToRoom(
        roomId,
        createTypingMessage(info.userId, info.userName, payload.entityType, payload.entityId, true),
        socket
      );
      break;
    }

    case 'typing:stop': {
      const payload = message.payload as { entityType: EntityType; entityId: string };
      typingStore.stopTyping(info.userId, payload.entityType, payload.entityId);

      const roomId = getEntityRoomId(payload.entityType, payload.entityId);
      broadcastToRoom(
        roomId,
        createTypingMessage(info.userId, info.userName, payload.entityType, payload.entityId, false),
        socket
      );
      break;
    }

    case 'presence:away':
      presenceStore.setAway(info.userId);
      broadcastToOrganization(
        info.organizationId,
        createMessage('user:away', { userId: info.userId, userName: info.userName }),
        socket
      );
      break;

    case 'presence:online':
      presenceStore.setOnline(info.userId, info.userName);
      broadcastToOrganization(
        info.organizationId,
        createMessage('user:online', { userId: info.userId, userName: info.userName }),
        socket
      );
      break;

    case 'presence:busy':
      presenceStore.setBusy(info.userId);
      broadcastToOrganization(
        info.organizationId,
        createMessage('user:busy', { userId: info.userId, userName: info.userName }),
        socket
      );
      break;

    default:
      console.warn('Unknown message type:', message.type);
  }
}

// ==========================================================================
// ROUTES
// ==========================================================================

export async function websocketRoutes(fastify: FastifyInstance) {
  // Main WebSocket endpoint
  fastify.get('/ws', { websocket: true }, (socket, request) => {
    // Extract user info from query params (in production, use auth token)
    const query = request.query as { userId?: string; userName?: string; organizationId?: string };

    if (!query.userId || !query.userName || !query.organizationId) {
      socket.close(4001, 'Missing required query params: userId, userName, organizationId');
      return;
    }

    const { userId, userName, organizationId } = query;

    // Register connection
    const info: ConnectionInfo = {
      userId,
      userName,
      organizationId,
      rooms: new Set(),
    };
    connections.set(socket, info);

    // Join organization room automatically
    joinRoom(socket, getOrganizationRoomId(organizationId));
    joinRoom(socket, getUserRoomId(userId));

    // Update presence
    presenceStore.setOnline(userId, userName);

    // Notify organization of user joining
    broadcastToOrganization(
      organizationId,
      createUserJoinedMessage(userId, userName, organizationId),
      socket
    );

    // Send current online users to the new connection
    const onlineUsers = presenceStore.getOnlineUsers();
    sendToSocket(socket, createMessage('users:online', { users: onlineUsers }));

    // Handle incoming messages
    socket.on('message', (raw: Buffer | string) => {
      try {
        const message = JSON.parse(raw.toString()) as ClientMessage;
        handleClientMessage(socket, message);
      } catch (err: unknown) {
        console.error('Failed to parse WebSocket message:', err);
      }
    });

    // Handle disconnection
    socket.on('close', () => {
      const info = connections.get(socket);
      if (info) {
        // Update presence
        presenceStore.setOffline(info.userId);

        // Notify organization
        broadcastToOrganization(
          info.organizationId,
          createUserLeftMessage(info.userId, info.userName, info.organizationId)
        );

        // Cleanup
        leaveAllRooms(socket);
        connections.delete(socket);
      }
    });

    socket.on('error', (err: Error) => {
      console.error('WebSocket error:', err);
    });
  });

  // REST endpoint to get online users
  fastify.get('/presence', async (request) => {
    const query = request.query as { organizationId?: string };
    const users = presenceStore.getOnlineUsers();

    return {
      success: true,
      data: users,
      total: users.length,
    };
  });

  // REST endpoint to get entity viewers
  fastify.get<{
    Params: { entityType: string; entityId: string };
  }>('/presence/:entityType/:entityId/viewers', async (request) => {
    const { entityType, entityId } = request.params;
    const viewers = presenceStore.getViewers(entityType as EntityType, entityId);

    return {
      success: true,
      data: viewers,
    };
  });

  // REST endpoint to get typing indicators
  fastify.get<{
    Params: { entityType: string; entityId: string };
  }>('/typing/:entityType/:entityId', async (request) => {
    const { entityType, entityId } = request.params;

    // Cleanup expired indicators first
    typingStore.cleanup();

    const typing = typingStore.getTyping(entityType as EntityType, entityId);

    return {
      success: true,
      data: typing,
    };
  });

  // Broadcast endpoint (for server-side notifications)
  fastify.post<{
    Body: {
      organizationId: string;
      type: RealtimeEventType;
      payload: unknown;
    };
  }>('/broadcast', async (request, reply) => {
    const { organizationId, type, payload } = request.body;

    const message = createMessage(type, payload, { organizationId });
    broadcastToOrganization(organizationId, message);

    return {
      success: true,
      message: 'Broadcast sent',
      messageId: message.id,
    };
  });

  // Send to specific user
  fastify.post<{
    Body: {
      userId: string;
      type: RealtimeEventType;
      payload: unknown;
    };
  }>('/send', async (request, reply) => {
    const { userId, type, payload } = request.body;

    const message = createMessage(type, payload);
    sendToUser(userId, message);

    return {
      success: true,
      message: 'Message sent',
      messageId: message.id,
    };
  });

  // Broadcast entity update
  fastify.post<{
    Body: {
      entityType: EntityType;
      entityId: string;
      action: 'created' | 'updated' | 'deleted';
      entity?: unknown;
      changes?: Record<string, { old: unknown; new: unknown }>;
      userId?: string;
      userName?: string;
    };
  }>('/entity-update', async (request) => {
    const { entityType, entityId, action, entity, changes, userId, userName } = request.body;

    const eventType = `entity:${action}` as RealtimeEventType;
    const message = createMessage(
      eventType,
      { entityType, entityId, entity, changes },
      { senderId: userId, senderName: userName }
    );

    const roomId = getEntityRoomId(entityType, entityId);
    broadcastToRoom(roomId, message);

    return {
      success: true,
      message: 'Entity update broadcast',
      messageId: message.id,
    };
  });
}
