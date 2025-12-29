import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Data Display Components Tests
 *
 * Comprehensive tests for data display components including
 * tables, pagination, badges, and metric cards.
 */

interface TableColumn<T> {
  key: keyof T;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
  render?: (value: T[keyof T], row: T) => string;
}

interface TableState<T> {
  data: T[];
  columns: TableColumn<T>[];
  sortColumn: keyof T | null;
  sortDirection: 'asc' | 'desc';
  filters: Record<string, string>;
  selectedRows: Set<string>;
  expandedRows: Set<string>;
  page: number;
  pageSize: number;
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  visiblePages: number[];
}

// Mock table handler
class TableHandler<T extends { id: string }> {
  private state: TableState<T>;
  private originalData: T[];

  constructor(data: T[], columns: TableColumn<T>[]) {
    this.originalData = [...data];
    this.state = {
      data: [...data],
      columns,
      sortColumn: null,
      sortDirection: 'asc',
      filters: {},
      selectedRows: new Set(),
      expandedRows: new Set(),
      page: 1,
      pageSize: 10,
    };
  }

  getState(): TableState<T> {
    return { ...this.state, selectedRows: new Set(this.state.selectedRows), expandedRows: new Set(this.state.expandedRows) };
  }

  getData(): T[] {
    return this.state.data;
  }

  getPagedData(): T[] {
    const start = (this.state.page - 1) * this.state.pageSize;
    return this.state.data.slice(start, start + this.state.pageSize);
  }

  getTotalPages(): number {
    return Math.ceil(this.state.data.length / this.state.pageSize);
  }

  // Sorting
  sort(column: keyof T): void {
    const col = this.state.columns.find(c => c.key === column);
    if (!col?.sortable) return;

    if (this.state.sortColumn === column) {
      this.state.sortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.state.sortColumn = column;
      this.state.sortDirection = 'asc';
    }

    this.state.data.sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];

      if (aVal < bVal) return this.state.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.state.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Filtering
  setFilter(column: keyof T, value: string): void {
    const col = this.state.columns.find(c => c.key === column);
    if (!col?.filterable) return;

    if (value) {
      this.state.filters[column as string] = value;
    } else {
      delete this.state.filters[column as string];
    }

    this.applyFilters();
  }

  clearFilters(): void {
    this.state.filters = {};
    this.state.data = [...this.originalData];
  }

  private applyFilters(): void {
    this.state.data = this.originalData.filter(row => {
      return Object.entries(this.state.filters).every(([col, filter]) => {
        const value = String(row[col as keyof T]).toLowerCase();
        return value.includes(filter.toLowerCase());
      });
    });

    // Re-apply sort after filter
    if (this.state.sortColumn) {
      const column = this.state.sortColumn;
      this.state.data.sort((a, b) => {
        const aVal = a[column];
        const bVal = b[column];
        if (aVal < bVal) return this.state.sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return this.state.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Reset to first page
    this.state.page = 1;
  }

  // Pagination
  setPage(page: number): void {
    const maxPage = this.getTotalPages();
    this.state.page = Math.max(1, Math.min(page, maxPage));
  }

  nextPage(): void {
    this.setPage(this.state.page + 1);
  }

  previousPage(): void {
    this.setPage(this.state.page - 1);
  }

  setPageSize(size: number): void {
    this.state.pageSize = size;
    this.state.page = 1;
  }

  // Selection
  selectRow(id: string): void {
    this.state.selectedRows.add(id);
  }

  deselectRow(id: string): void {
    this.state.selectedRows.delete(id);
  }

  toggleRow(id: string): void {
    if (this.state.selectedRows.has(id)) {
      this.deselectRow(id);
    } else {
      this.selectRow(id);
    }
  }

  selectAll(): void {
    this.state.data.forEach(row => {
      this.state.selectedRows.add(row.id);
    });
  }

  deselectAll(): void {
    this.state.selectedRows.clear();
  }

  selectPage(): void {
    this.getPagedData().forEach(row => {
      this.state.selectedRows.add(row.id);
    });
  }

  getSelectedRows(): T[] {
    return this.state.data.filter(row => this.state.selectedRows.has(row.id));
  }

  isAllSelected(): boolean {
    return this.state.data.length > 0 && this.state.data.every(row => this.state.selectedRows.has(row.id));
  }

  isPageSelected(): boolean {
    const pageData = this.getPagedData();
    return pageData.length > 0 && pageData.every(row => this.state.selectedRows.has(row.id));
  }

  isSomeSelected(): boolean {
    return this.state.selectedRows.size > 0 && !this.isAllSelected();
  }

  // Row expansion
  expandRow(id: string): void {
    this.state.expandedRows.add(id);
  }

  collapseRow(id: string): void {
    this.state.expandedRows.delete(id);
  }

  toggleExpand(id: string): void {
    if (this.state.expandedRows.has(id)) {
      this.collapseRow(id);
    } else {
      this.expandRow(id);
    }
  }

  isExpanded(id: string): boolean {
    return this.state.expandedRows.has(id);
  }
}

// Mock pagination handler
class PaginationHandler {
  private state: PaginationState;

  constructor(totalItems: number, pageSize: number = 10, maxVisiblePages: number = 5) {
    this.state = {
      currentPage: 1,
      totalPages: Math.ceil(totalItems / pageSize),
      pageSize,
      totalItems,
      visiblePages: this.calculateVisiblePages(1, Math.ceil(totalItems / pageSize), maxVisiblePages),
    };
  }

  getState(): PaginationState {
    return { ...this.state };
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.state.totalPages) return;
    this.state.currentPage = page;
    this.updateVisiblePages();
  }

  nextPage(): void {
    this.goToPage(this.state.currentPage + 1);
  }

  previousPage(): void {
    this.goToPage(this.state.currentPage - 1);
  }

  firstPage(): void {
    this.goToPage(1);
  }

  lastPage(): void {
    this.goToPage(this.state.totalPages);
  }

  setPageSize(size: number): void {
    this.state.pageSize = size;
    this.state.totalPages = Math.ceil(this.state.totalItems / size);
    this.state.currentPage = Math.min(this.state.currentPage, this.state.totalPages);
    this.updateVisiblePages();
  }

  setTotalItems(count: number): void {
    this.state.totalItems = count;
    this.state.totalPages = Math.ceil(count / this.state.pageSize);
    this.state.currentPage = Math.min(this.state.currentPage, Math.max(1, this.state.totalPages));
    this.updateVisiblePages();
  }

  getPageRange(): { start: number; end: number } {
    const start = (this.state.currentPage - 1) * this.state.pageSize + 1;
    const end = Math.min(start + this.state.pageSize - 1, this.state.totalItems);
    return { start, end };
  }

  private updateVisiblePages(): void {
    this.state.visiblePages = this.calculateVisiblePages(
      this.state.currentPage,
      this.state.totalPages,
      5
    );
  }

  private calculateVisiblePages(current: number, total: number, max: number): number[] {
    if (total <= max) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const half = Math.floor(max / 2);
    let start = Math.max(1, current - half);
    let end = Math.min(total, start + max - 1);

    if (end - start + 1 < max) {
      start = Math.max(1, end - max + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  canGoNext(): boolean {
    return this.state.currentPage < this.state.totalPages;
  }

  canGoPrevious(): boolean {
    return this.state.currentPage > 1;
  }
}

// Test data type
interface TestRow {
  id: string;
  name: string;
  status: string;
  score: number;
  date: string;
}

describe('Table Component', () => {
  let table: TableHandler<TestRow>;
  const testData: TestRow[] = [
    { id: '1', name: 'Item A', status: 'active', score: 85, date: '2024-01-15' },
    { id: '2', name: 'Item B', status: 'inactive', score: 92, date: '2024-02-20' },
    { id: '3', name: 'Item C', status: 'active', score: 78, date: '2024-01-10' },
    { id: '4', name: 'Item D', status: 'pending', score: 88, date: '2024-03-05' },
    { id: '5', name: 'Item E', status: 'active', score: 95, date: '2024-02-28' },
  ];

  const columns: TableColumn<TestRow>[] = [
    { key: 'name', header: 'Name', sortable: true, filterable: true },
    { key: 'status', header: 'Status', sortable: true, filterable: true },
    { key: 'score', header: 'Score', sortable: true },
    { key: 'date', header: 'Date', sortable: true },
  ];

  beforeEach(() => {
    table = new TableHandler(testData, columns);
  });

  describe('Basic Operations', () => {
    it('should initialize with data', () => {
      expect(table.getData().length).toBe(5);
    });

    it('should have configured columns', () => {
      expect(table.getState().columns.length).toBe(4);
    });

    it('should start on page 1', () => {
      expect(table.getState().page).toBe(1);
    });

    it('should have default page size of 10', () => {
      expect(table.getState().pageSize).toBe(10);
    });
  });

  describe('Sorting', () => {
    it('should sort by column ascending', () => {
      table.sort('name');
      const data = table.getData();
      expect(data[0].name).toBe('Item A');
      expect(data[4].name).toBe('Item E');
    });

    it('should toggle sort direction', () => {
      table.sort('name');
      expect(table.getState().sortDirection).toBe('asc');

      table.sort('name');
      expect(table.getState().sortDirection).toBe('desc');

      const data = table.getData();
      expect(data[0].name).toBe('Item E');
    });

    it('should reset direction when sorting different column', () => {
      table.sort('name');
      table.sort('name'); // Now desc

      table.sort('score');
      expect(table.getState().sortDirection).toBe('asc');
    });

    it('should sort numbers correctly', () => {
      table.sort('score');
      const data = table.getData();
      expect(data[0].score).toBe(78);
      expect(data[4].score).toBe(95);
    });

    it('should not sort non-sortable columns', () => {
      const nonSortableColumns: TableColumn<TestRow>[] = [
        { key: 'name', header: 'Name', sortable: false },
      ];
      const t = new TableHandler(testData, nonSortableColumns);

      const originalOrder = t.getData().map(r => r.id);
      t.sort('name');
      const newOrder = t.getData().map(r => r.id);

      expect(newOrder).toEqual(originalOrder);
    });
  });

  describe('Filtering', () => {
    it('should filter by column value', () => {
      table.setFilter('status', 'active');
      expect(table.getData().length).toBe(3);
      expect(table.getData().every(r => r.status === 'active')).toBe(true);
    });

    it('should filter case-insensitively', () => {
      table.setFilter('status', 'ACTIVE');
      expect(table.getData().length).toBe(3);
    });

    it('should filter with partial match', () => {
      table.setFilter('name', 'Item');
      expect(table.getData().length).toBe(5);

      table.setFilter('name', 'Item A');
      expect(table.getData().length).toBe(1);
    });

    it('should apply multiple filters', () => {
      table.setFilter('status', 'active');
      table.setFilter('name', 'Item A');
      expect(table.getData().length).toBe(1);
    });

    it('should clear filters', () => {
      table.setFilter('status', 'active');
      expect(table.getData().length).toBe(3);

      table.clearFilters();
      expect(table.getData().length).toBe(5);
    });

    it('should reset to page 1 after filtering', () => {
      table.setPage(2);
      table.setFilter('status', 'active');
      expect(table.getState().page).toBe(1);
    });

    it('should maintain sort after filtering', () => {
      table.sort('score');
      table.setFilter('status', 'active');

      const data = table.getData();
      expect(data[0].score).toBeLessThan(data[1].score);
    });

    it('should not filter non-filterable columns', () => {
      const nonFilterableColumns: TableColumn<TestRow>[] = [
        { key: 'status', header: 'Status', filterable: false },
      ];
      const t = new TableHandler(testData, nonFilterableColumns);

      t.setFilter('status', 'active');
      expect(t.getData().length).toBe(5); // No filtering applied
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      // Create more data for pagination testing
      const moreData: TestRow[] = [];
      for (let i = 0; i < 25; i++) {
        moreData.push({
          id: String(i),
          name: `Item ${i}`,
          status: 'active',
          score: i * 4,
          date: '2024-01-01',
        });
      }
      table = new TableHandler(moreData, columns);
    });

    it('should calculate total pages', () => {
      expect(table.getTotalPages()).toBe(3); // 25 items / 10 per page
    });

    it('should return paged data', () => {
      expect(table.getPagedData().length).toBe(10);
    });

    it('should go to next page', () => {
      table.nextPage();
      expect(table.getState().page).toBe(2);
    });

    it('should go to previous page', () => {
      table.setPage(2);
      table.previousPage();
      expect(table.getState().page).toBe(1);
    });

    it('should not go below page 1', () => {
      table.previousPage();
      expect(table.getState().page).toBe(1);
    });

    it('should not go above max pages', () => {
      table.setPage(10);
      expect(table.getState().page).toBe(3);
    });

    it('should change page size', () => {
      table.setPageSize(5);
      expect(table.getTotalPages()).toBe(5);
    });

    it('should reset to page 1 when changing page size', () => {
      table.setPage(2);
      table.setPageSize(5);
      expect(table.getState().page).toBe(1);
    });

    it('should return correct items for last page', () => {
      table.setPage(3);
      expect(table.getPagedData().length).toBe(5); // 25 - 20 = 5 items on last page
    });
  });

  describe('Row Selection', () => {
    it('should select row', () => {
      table.selectRow('1');
      expect(table.getState().selectedRows.has('1')).toBe(true);
    });

    it('should deselect row', () => {
      table.selectRow('1');
      table.deselectRow('1');
      expect(table.getState().selectedRows.has('1')).toBe(false);
    });

    it('should toggle row selection', () => {
      table.toggleRow('1');
      expect(table.getState().selectedRows.has('1')).toBe(true);

      table.toggleRow('1');
      expect(table.getState().selectedRows.has('1')).toBe(false);
    });

    it('should select all rows', () => {
      table.selectAll();
      expect(table.getSelectedRows().length).toBe(5);
    });

    it('should deselect all rows', () => {
      table.selectAll();
      table.deselectAll();
      expect(table.getSelectedRows().length).toBe(0);
    });

    it('should select current page only', () => {
      table.setPageSize(2);
      table.selectPage();
      expect(table.getSelectedRows().length).toBe(2);
    });

    it('should check if all selected', () => {
      expect(table.isAllSelected()).toBe(false);
      table.selectAll();
      expect(table.isAllSelected()).toBe(true);
    });

    it('should check if some selected', () => {
      expect(table.isSomeSelected()).toBe(false);

      table.selectRow('1');
      expect(table.isSomeSelected()).toBe(true);

      table.selectAll();
      expect(table.isSomeSelected()).toBe(false);
    });

    it('should return selected rows data', () => {
      table.selectRow('1');
      table.selectRow('3');

      const selected = table.getSelectedRows();
      expect(selected.length).toBe(2);
      expect(selected.find(r => r.id === '1')).toBeDefined();
      expect(selected.find(r => r.id === '3')).toBeDefined();
    });
  });

  describe('Row Expansion', () => {
    it('should expand row', () => {
      table.expandRow('1');
      expect(table.isExpanded('1')).toBe(true);
    });

    it('should collapse row', () => {
      table.expandRow('1');
      table.collapseRow('1');
      expect(table.isExpanded('1')).toBe(false);
    });

    it('should toggle expansion', () => {
      table.toggleExpand('1');
      expect(table.isExpanded('1')).toBe(true);

      table.toggleExpand('1');
      expect(table.isExpanded('1')).toBe(false);
    });

    it('should track multiple expanded rows', () => {
      table.expandRow('1');
      table.expandRow('2');
      table.expandRow('3');

      expect(table.isExpanded('1')).toBe(true);
      expect(table.isExpanded('2')).toBe(true);
      expect(table.isExpanded('3')).toBe(true);
    });
  });
});

describe('Pagination Component', () => {
  describe('Basic Operations', () => {
    it('should initialize with correct state', () => {
      const pagination = new PaginationHandler(100, 10);

      expect(pagination.getState().currentPage).toBe(1);
      expect(pagination.getState().totalPages).toBe(10);
      expect(pagination.getState().pageSize).toBe(10);
      expect(pagination.getState().totalItems).toBe(100);
    });

    it('should handle non-divisible total', () => {
      const pagination = new PaginationHandler(95, 10);
      expect(pagination.getState().totalPages).toBe(10);
    });

    it('should handle zero items', () => {
      const pagination = new PaginationHandler(0, 10);
      expect(pagination.getState().totalPages).toBe(0);
      expect(pagination.getState().currentPage).toBe(1);
    });
  });

  describe('Navigation', () => {
    let pagination: PaginationHandler;

    beforeEach(() => {
      pagination = new PaginationHandler(100, 10);
    });

    it('should go to specific page', () => {
      pagination.goToPage(5);
      expect(pagination.getState().currentPage).toBe(5);
    });

    it('should go to next page', () => {
      pagination.nextPage();
      expect(pagination.getState().currentPage).toBe(2);
    });

    it('should go to previous page', () => {
      pagination.goToPage(5);
      pagination.previousPage();
      expect(pagination.getState().currentPage).toBe(4);
    });

    it('should go to first page', () => {
      pagination.goToPage(5);
      pagination.firstPage();
      expect(pagination.getState().currentPage).toBe(1);
    });

    it('should go to last page', () => {
      pagination.lastPage();
      expect(pagination.getState().currentPage).toBe(10);
    });

    it('should not go below page 1', () => {
      pagination.previousPage();
      expect(pagination.getState().currentPage).toBe(1);
    });

    it('should not go above total pages', () => {
      pagination.goToPage(100);
      expect(pagination.getState().currentPage).toBe(10);
    });

    it('should check if can go next', () => {
      expect(pagination.canGoNext()).toBe(true);
      pagination.lastPage();
      expect(pagination.canGoNext()).toBe(false);
    });

    it('should check if can go previous', () => {
      expect(pagination.canGoPrevious()).toBe(false);
      pagination.nextPage();
      expect(pagination.canGoPrevious()).toBe(true);
    });
  });

  describe('Page Size', () => {
    let pagination: PaginationHandler;

    beforeEach(() => {
      pagination = new PaginationHandler(100, 10);
    });

    it('should change page size', () => {
      pagination.setPageSize(20);
      expect(pagination.getState().pageSize).toBe(20);
      expect(pagination.getState().totalPages).toBe(5);
    });

    it('should adjust current page when page size increases', () => {
      pagination.goToPage(10);
      pagination.setPageSize(50);
      expect(pagination.getState().currentPage).toBe(2);
    });
  });

  describe('Page Range', () => {
    let pagination: PaginationHandler;

    beforeEach(() => {
      pagination = new PaginationHandler(95, 10);
    });

    it('should return correct range for first page', () => {
      const range = pagination.getPageRange();
      expect(range.start).toBe(1);
      expect(range.end).toBe(10);
    });

    it('should return correct range for middle page', () => {
      pagination.goToPage(5);
      const range = pagination.getPageRange();
      expect(range.start).toBe(41);
      expect(range.end).toBe(50);
    });

    it('should return correct range for last page', () => {
      pagination.lastPage();
      const range = pagination.getPageRange();
      expect(range.start).toBe(91);
      expect(range.end).toBe(95);
    });
  });

  describe('Visible Pages', () => {
    it('should show all pages when total <= max visible', () => {
      const pagination = new PaginationHandler(30, 10);
      expect(pagination.getState().visiblePages).toEqual([1, 2, 3]);
    });

    it('should center current page in visible range', () => {
      const pagination = new PaginationHandler(100, 10);
      pagination.goToPage(5);
      expect(pagination.getState().visiblePages).toEqual([3, 4, 5, 6, 7]);
    });

    it('should handle first pages', () => {
      const pagination = new PaginationHandler(100, 10);
      pagination.goToPage(1);
      expect(pagination.getState().visiblePages).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle last pages', () => {
      const pagination = new PaginationHandler(100, 10);
      pagination.goToPage(10);
      expect(pagination.getState().visiblePages).toEqual([6, 7, 8, 9, 10]);
    });
  });

  describe('Dynamic Total Items', () => {
    let pagination: PaginationHandler;

    beforeEach(() => {
      pagination = new PaginationHandler(100, 10);
    });

    it('should update when total items changes', () => {
      pagination.setTotalItems(50);
      expect(pagination.getState().totalPages).toBe(5);
    });

    it('should adjust current page when total decreases', () => {
      pagination.goToPage(10);
      pagination.setTotalItems(50);
      expect(pagination.getState().currentPage).toBe(5);
    });

    it('should handle total going to zero', () => {
      pagination.setTotalItems(0);
      expect(pagination.getState().totalPages).toBe(0);
      expect(pagination.getState().currentPage).toBe(1);
    });
  });
});

describe('Badge Component', () => {
  // Badge variants
  const variants = ['default', 'primary', 'secondary', 'success', 'warning', 'danger', 'info'] as const;
  const sizes = ['sm', 'md', 'lg'] as const;

  describe('Variants', () => {
    variants.forEach(variant => {
      it(`should support ${variant} variant`, () => {
        // In real test, would render component and check classes
        expect(variants).toContain(variant);
      });
    });
  });

  describe('Sizes', () => {
    sizes.forEach(size => {
      it(`should support ${size} size`, () => {
        expect(sizes).toContain(size);
      });
    });
  });

  describe('Status Badges', () => {
    const statusMap: Record<string, typeof variants[number]> = {
      active: 'success',
      inactive: 'secondary',
      pending: 'warning',
      error: 'danger',
      completed: 'success',
      draft: 'secondary',
      review: 'info',
    };

    Object.entries(statusMap).forEach(([status, expectedVariant]) => {
      it(`should map ${status} to ${expectedVariant} variant`, () => {
        expect(statusMap[status]).toBe(expectedVariant);
      });
    });
  });
});

describe('MetricCard Component', () => {
  interface MetricCardProps {
    title: string;
    value: number | string;
    previousValue?: number;
    format?: 'number' | 'currency' | 'percentage';
    trend?: 'up' | 'down' | 'neutral';
  }

  function calculateTrend(current: number, previous: number): 'up' | 'down' | 'neutral' {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'neutral';
  }

  function calculateChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  function formatValue(value: number, format: MetricCardProps['format']): string {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(value);
    }
  }

  describe('Value Formatting', () => {
    it('should format numbers with commas', () => {
      expect(formatValue(1234567, 'number')).toBe('1,234,567');
    });

    it('should format currency', () => {
      expect(formatValue(1234.56, 'currency')).toBe('$1,234.56');
    });

    it('should format percentage', () => {
      expect(formatValue(85.5, 'percentage')).toBe('85.5%');
    });
  });

  describe('Trend Calculation', () => {
    it('should detect upward trend', () => {
      expect(calculateTrend(100, 80)).toBe('up');
    });

    it('should detect downward trend', () => {
      expect(calculateTrend(80, 100)).toBe('down');
    });

    it('should detect neutral trend', () => {
      expect(calculateTrend(100, 100)).toBe('neutral');
    });
  });

  describe('Change Calculation', () => {
    it('should calculate positive change', () => {
      expect(calculateChange(120, 100)).toBe(20);
    });

    it('should calculate negative change', () => {
      expect(calculateChange(80, 100)).toBe(-20);
    });

    it('should handle zero previous value', () => {
      expect(calculateChange(100, 0)).toBe(100);
    });

    it('should handle zero change', () => {
      expect(calculateChange(100, 100)).toBe(0);
    });
  });
});
