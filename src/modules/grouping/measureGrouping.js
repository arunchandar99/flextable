/**
 * Measure Grouping Module
 * Handles column grouping and aggregation (e.g., Revenue = Spread + Fee Income)
 */

export class MeasureGrouping {
  constructor() {
    this.groups = [];
  }

  /**
   * Add a new measure group
   */
  addGroup(name, measures, collapsed = false) {
    this.groups.push({
      name,
      measures,
      collapsed
    });
  }

  /**
   * Remove a group by index
   */
  removeGroup(index) {
    if (index >= 0 && index < this.groups.length) {
      this.groups.splice(index, 1);
    }
  }

  /**
   * Toggle group collapsed state
   */
  toggleGroup(groupId) {
    if (groupId >= 0 && groupId < this.groups.length) {
      this.groups[groupId].collapsed = !this.groups[groupId].collapsed;
      return true;
    }
    return false;
  }

  /**
   * Get all groups
   */
  getGroups() {
    return this.groups;
  }

  /**
   * Clear all groups
   */
  clearGroups() {
    this.groups = [];
  }

  /**
   * Find group containing a specific measure
   */
  findGroupByMeasure(measureName) {
    return this.groups.find(g => g.measures.includes(measureName));
  }

  /**
   * Calculate sum for collapsed measure group
   */
  calculateGroupSum(group, row, columns) {
    return group.measures.reduce((sum, measureCol) => {
      const measureIndex = columns.indexOf(measureCol);
      if (measureIndex === -1) return sum;

      const value = parseFloat(row[measureIndex]?.replace(/[,$%]/g, '') || 0);
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
  }

  /**
   * Get column span for a group
   */
  getGroupColspan(group) {
    return group.collapsed ? 1 : group.measures.length;
  }

  /**
   * Check if column should be hidden
   */
  isColumnHidden(columnName, group) {
    if (!group || !group.collapsed) return false;
    return group.measures.includes(columnName) && group.measures[0] !== columnName;
  }

  /**
   * Save groups to localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem('flextable_measure_groups', JSON.stringify(this.groups));
    } catch (e) {
      console.error('Failed to save measure groups:', e);
    }
  }

  /**
   * Load groups from localStorage
   */
  loadFromStorage() {
    try {
      const saved = localStorage.getItem('flextable_measure_groups');
      if (saved) {
        this.groups = JSON.parse(saved);
        return true;
      }
    } catch (e) {
      console.error('Failed to load measure groups:', e);
    }
    return false;
  }
}

export default MeasureGrouping;