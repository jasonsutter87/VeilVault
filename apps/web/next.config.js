/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@veilvault/ui'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

module.exports = nextConfig;
