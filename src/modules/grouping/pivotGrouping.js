/**
 * Pivot Table Row Grouping Module
 * Handles hierarchical row grouping like pivot tables
 */

export class PivotGrouping {
  constructor() {
    this.rowGroups = new Map(); // Track collapsed state of row groups
    this.subCategoryGroups = new Map(); // Track collapsed state of sub-category groups
    this.maxFieldsPerColumn = 5; // Limit for fields in the first column
  }

  /**
   * Group rows by first column (category)
   */
  groupRowsByCategory(data) {
    const groups = new Map();

    data.rows.forEach((row, rowIndex) => {
      const category = row[0];
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category).push({ row, rowIndex });
    });

    return groups;
  }

  /**
   * Group rows by sub-category (second column)
   */
  groupBySubCategory(rowData) {
    const subGroups = new Map();

    rowData.forEach(({ row, rowIndex }) => {
      const subCategory = row[1] || 'Other';
      if (!subGroups.has(subCategory)) {
        subGroups.set(subCategory, []);
      }
      subGroups.get(subCategory).push({ row, rowIndex });
    });

    return subGroups;
  }

  /**
   * Group rows by segment (third column)
   */
  groupBySegment(rowData) {
    const segmentGroups = new Map();

    rowData.forEach(({ row, rowIndex }) => {
      const segment = row[2] || 'Other';
      if (!segmentGroups.has(segment)) {
        segmentGroups.set(segment, []);
      }
      segmentGroups.get(segment).push({ row, rowIndex });
    });

    return segmentGroups;
  }

  /**
   * Determine how many hierarchy levels to show based on field count
   */
  getHierarchyLevels(data) {
    const dimensionColumns = this.getDimensionColumns(data);
    return Math.min(dimensionColumns.length, 3); // Max 3 levels
  }

  /**
   * Get dimension columns (non-measure columns)
   */
  getDimensionColumns(data) {
    const dimensionColumns = [];
    for (let i = 0; i < Math.min(data.columns.length, this.maxFieldsPerColumn); i++) {
      if (this.isDimensionColumn(data, i)) {
        dimensionColumns.push(i);
      }
    }
    return dimensionColumns;
  }

  /**
   * Check if a column is a dimension (contains text data)
   */
  isDimensionColumn(data, columnIndex) {
    if (data.rows.length === 0) return true;

    // Check first few rows to determine if column contains mostly text
    const sampleRows = data.rows.slice(0, Math.min(5, data.rows.length));
    let textCount = 0;

    sampleRows.forEach(row => {
      const value = row[columnIndex];
      if (value && isNaN(parseFloat(value?.replace(/[,$%]/g, '')))) {
        textCount++;
      }
    });

    return textCount > sampleRows.length / 2;
  }

  /**
   * Toggle category expansion
   */
  toggleCategory(category) {
    const isCollapsed = this.rowGroups.get(category) !== false;
    this.rowGroups.set(category, !isCollapsed);
    return !isCollapsed; // Return new state
  }

  /**
   * Check if category is collapsed
   */
  isCategoryCollapsed(category) {
    return this.rowGroups.get(category) !== false;
  }

  /**
   * Toggle sub-category expansion
   */
  toggleSubCategory(category, subCategory) {
    const key = `${category}|${subCategory}`;
    const isCollapsed = this.subCategoryGroups.get(key) !== false;
    this.subCategoryGroups.set(key, !isCollapsed);
    return !isCollapsed; // Return new state
  }

  /**
   * Check if sub-category is collapsed
   */
  isSubCategoryCollapsed(category, subCategory) {
    const key = `${category}|${subCategory}`;
    return this.subCategoryGroups.get(key) !== false;
  }

  /**
   * Calculate aggregated values for a group
   */
  calculateGroupAggregates(rowData, columns) {
    const aggregates = new Array(columns.length).fill(0);

    rowData.forEach(({ row }) => {
      row.forEach((cell, index) => {
        const value = parseFloat(cell?.replace(/[,$%]/g, '') || 0);
        if (!isNaN(value)) {
          aggregates[index] += value;
        }
      });
    });

    return aggregates;
  }

  /**
   * Format aggregated value
   */
  formatAggregateValue(value, columnIndex, isNumeric = true) {
    if (!isNumeric || columnIndex === 0) {
      return ''; // Don't show aggregates for text columns
    }
    return value.toLocaleString();
  }

  /**
   * Clear all row groups
   */
  clearGroups() {
    this.rowGroups.clear();
    this.subCategoryGroups.clear();
  }

  /**
   * Expand all groups
   */
  expandAll() {
    for (const [key] of this.rowGroups) {
      this.rowGroups.set(key, false);
    }
    for (const [key] of this.subCategoryGroups) {
      this.subCategoryGroups.set(key, false);
    }
  }

  /**
   * Collapse all groups
   */
  collapseAll() {
    for (const [key] of this.rowGroups) {
      this.rowGroups.set(key, true);
    }
    for (const [key] of this.subCategoryGroups) {
      this.subCategoryGroups.set(key, true);
    }
  }

  /**
   * Get expansion state for all groups
   */
  getExpansionState() {
    return Array.from(this.rowGroups.entries());
  }

  /**
   * Restore expansion state
   */
  restoreExpansionState(state) {
    this.rowGroups.clear();
    state.forEach(([key, value]) => {
      this.rowGroups.set(key, value);
    });
  }

  /**
   * Save state to localStorage
   */
  saveToStorage() {
    try {
      const state = this.getExpansionState();
      localStorage.setItem('flextable_pivot_state', JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save pivot state:', e);
    }
  }

  /**
   * Load state from localStorage
   */
  loadFromStorage() {
    try {
      const saved = localStorage.getItem('flextable_pivot_state');
      if (saved) {
        const state = JSON.parse(saved);
        this.restoreExpansionState(state);
        return true;
      }
    } catch (e) {
      console.error('Failed to load pivot state:', e);
    }
    return false;
  }
}

export default PivotGrouping;