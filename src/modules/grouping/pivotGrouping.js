/**
 * Pivot Table Row Grouping Module
 * Handles hierarchical row grouping like pivot tables
 */

export class PivotGrouping {
  constructor() {
    this.rowGroups = new Map(); // Track collapsed state of row groups
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
  }

  /**
   * Expand all groups
   */
  expandAll() {
    for (const [key] of this.rowGroups) {
      this.rowGroups.set(key, false);
    }
  }

  /**
   * Collapse all groups
   */
  collapseAll() {
    for (const [key] of this.rowGroups) {
      this.rowGroups.set(key, true);
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