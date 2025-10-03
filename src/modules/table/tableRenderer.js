/**
 * Table Renderer Module
 * Handles all table rendering logic
 */

export class TableRenderer {
  constructor(measureGrouping, pivotGrouping, tableFormatter) {
    this.measureGrouping = measureGrouping;
    this.pivotGrouping = pivotGrouping;
    this.tableFormatter = tableFormatter;
    this.container = null;
  }

  /**
   * Set the container element
   */
  setContainer(container) {
    this.container = container;
  }

  /**
   * Render the complete table
   */
  render(data) {
    if (!this.container) {
      console.error('No container set for table renderer');
      return;
    }

    this.container.innerHTML = '';

    const table = document.createElement('table');
    table.className = 'simple-table';

    // Create header
    this.renderHeader(table, data);

    // Create body with pivot structure
    this.renderBody(table, data);

    // Apply table structure formatting
    if (this.tableFormatter) {
      this.tableFormatter.applyTableStructure(table);
    }

    this.container.appendChild(table);
  }

  /**
   * Render table header with two levels for measure groups
   */
  renderHeader(table, data) {
    const thead = document.createElement('thead');
    const firstLevelRow = document.createElement('tr');
    const secondLevelRow = document.createElement('tr');

    // Determine how many dimension columns to skip based on hierarchy
    const hierarchyLevels = this.pivotGrouping.getHierarchyLevels(data);
    const columnsToSkip = Math.min(hierarchyLevels - 1, 2); // Skip 1 for 2-level, 2 for 3-level

    data.columns.forEach((col, index) => {
      // Skip dimension columns based on hierarchy level
      if (index > 0 && index <= columnsToSkip) return;

      const measureGroup = this.measureGrouping.findGroupByMeasure(col);

      // First level header
      const th1 = document.createElement('th');
      th1.style.borderBottom = 'none';

      if (measureGroup) {
        if (measureGroup.measures[0] === col) {
          th1.innerHTML = `<span class="expand-icon">▼</span>${measureGroup.name}`;
          th1.className = 'group-header';
          th1.dataset.groupId = this.measureGrouping.groups.indexOf(measureGroup);
          th1.onclick = () => this.toggleMeasureGroup(measureGroup);
          th1.colSpan = this.measureGrouping.getGroupColspan(measureGroup);
        } else if (!measureGroup.collapsed) {
          th1.style.display = 'none';
        } else {
          th1.style.display = 'none';
        }
      } else {
        th1.innerHTML = '&nbsp;';
        th1.style.background = '#fff';
      }

      // Apply header formatting to first level
      if (this.tableFormatter) {
        this.tableFormatter.applyCellStyling(th1, true, 0, index);
      }

      firstLevelRow.appendChild(th1);

      // Second level header
      const th2 = document.createElement('th');
      th2.style.borderTop = 'none';

      if (measureGroup) {
        if (measureGroup.collapsed) {
          if (measureGroup.measures[0] === col) {
            th2.innerHTML = '&nbsp;';
            th2.className = 'group-header-second';
            th2.onclick = () => this.sortTable(index);
          } else {
            th2.style.display = 'none';
            th2.className = 'group-member hidden';
          }
        } else {
          th2.textContent = col;
          th2.className = measureGroup.measures[0] === col ? 'group-header-second' : 'group-member';
          th2.onclick = () => this.sortTable(index);
        }
      } else {
        th2.textContent = col;
        th2.onclick = () => this.sortTable(index);
      }

      // Apply header formatting
      if (this.tableFormatter) {
        this.tableFormatter.applyCellStyling(th2, true, 0, index);
      }

      secondLevelRow.appendChild(th2);
    });

    thead.appendChild(firstLevelRow);
    thead.appendChild(secondLevelRow);
    table.appendChild(thead);
  }

  /**
   * Render table body with pivot structure
   */
  renderBody(table, data) {
    const tbody = document.createElement('tbody');

    // Determine how many hierarchy levels to show
    const hierarchyLevels = this.pivotGrouping.getHierarchyLevels(data);

    // Group data by first column (category)
    const groups = this.pivotGrouping.groupRowsByCategory(data);

    groups.forEach((rowData, category) => {
      // Add category row
      const categoryRow = this.createCategoryRow(category, rowData, data);
      tbody.appendChild(categoryRow);

      // Add sub-levels if expanded and available
      if (!this.pivotGrouping.isCategoryCollapsed(category)) {
        if (hierarchyLevels >= 2) {
          const subGroups = this.pivotGrouping.groupBySubCategory(rowData);

          subGroups.forEach((subRows, subCategory) => {
            const subRow = this.createSubCategoryRow(category, subCategory, subRows, data);
            tbody.appendChild(subRow);

            // Add segment level if expanded and available
            if (hierarchyLevels >= 3 && !this.pivotGrouping.isSubCategoryCollapsed(category, subCategory)) {
              const segmentGroups = this.pivotGrouping.groupBySegment(subRows);

              segmentGroups.forEach((segmentRows, segment) => {
                const segmentRow = this.createSegmentRow(segment, segmentRows, data);
                tbody.appendChild(segmentRow);
              });
            }
          });
        }
      }
    });

    table.appendChild(tbody);
  }

  /**
   * Create a category row
   */
  createCategoryRow(category, rowData, data) {
    const tr = document.createElement('tr');
    tr.className = 'pivot-level-0';
    tr.style.cursor = 'pointer';

    const isCollapsed = this.pivotGrouping.isCategoryCollapsed(category);

    tr.onclick = () => {
      this.pivotGrouping.toggleCategory(category);
      this.render(data); // Re-render
    };

    // Determine how many dimension columns to skip
    const hierarchyLevels = this.pivotGrouping.getHierarchyLevels(data);
    const columnsToSkip = Math.min(hierarchyLevels - 1, 2);

    data.columns.forEach((col, cellIndex) => {
      // Skip dimension columns based on hierarchy level
      if (cellIndex > 0 && cellIndex <= columnsToSkip) return;

      const td = document.createElement('td');
      const measureGroup = this.measureGrouping.findGroupByMeasure(col);

      if (cellIndex === 0) {
        // First column with expand icon
        const icon = isCollapsed ? '▶' : '▼';
        td.innerHTML = `<span class="pivot-expand-icon">${icon}</span> ${category}`;
      } else if (measureGroup && measureGroup.collapsed && measureGroup.measures[0] === col) {
        // Sum for collapsed measure group
        const sum = this.calculateMeasureGroupSum(rowData, measureGroup, data.columns);
        const formattedSum = this.tableFormatter ?
          this.tableFormatter.formatNumber(sum, cellIndex, null, data.columns[cellIndex]) :
          sum.toLocaleString();
        td.textContent = formattedSum;
      } else if (measureGroup && measureGroup.collapsed && measureGroup.measures[0] !== col) {
        td.style.display = 'none';
      } else {
        // Regular aggregation
        const aggregates = this.pivotGrouping.calculateGroupAggregates(rowData, data.columns);
        const value = aggregates[cellIndex];
        if (!isNaN(value) && cellIndex > columnsToSkip) {
          const formattedValue = this.tableFormatter ?
            this.tableFormatter.formatNumber(value, cellIndex, null, data.columns[cellIndex]) :
            value.toLocaleString();
          td.textContent = formattedValue;
        } else {
          td.textContent = '';
        }
      }

      // Apply cell formatting (but preserve pivot row styling)
      if (this.tableFormatter && cellIndex !== 0) {
        this.tableFormatter.applyCellStyling(td, false, 0, cellIndex);
      }

      tr.appendChild(td);
    });

    return tr;
  }

  /**
   * Create a sub-category row
   */
  createSubCategoryRow(category, subCategory, subRows, data) {
    const tr = document.createElement('tr');
    tr.className = 'pivot-level-1';

    // Determine how many hierarchy levels we have
    const hierarchyLevels = this.pivotGrouping.getHierarchyLevels(data);

    // Add click functionality for 3-level hierarchy
    if (hierarchyLevels >= 3) {
      tr.style.cursor = 'pointer';
      tr.onclick = () => {
        this.pivotGrouping.toggleSubCategory(category, subCategory);
        this.render(data); // Re-render
      };
    }

    // Determine how many dimension columns to skip
    const columnsToSkip = Math.min(hierarchyLevels - 1, 2);

    data.columns.forEach((col, cellIndex) => {
      // Skip dimension columns based on hierarchy level
      if (cellIndex > 0 && cellIndex <= columnsToSkip) return;

      const td = document.createElement('td');
      const measureGroup = this.measureGrouping.findGroupByMeasure(col);

      if (cellIndex === 0) {
        // Show sub-category indented in first column
        if (hierarchyLevels >= 3) {
          const isSubCollapsed = this.pivotGrouping.isSubCategoryCollapsed(category, subCategory);
          const icon = isSubCollapsed ? '▶' : '▼';
          td.innerHTML = `&nbsp;&nbsp;&nbsp;&nbsp;<span class="pivot-expand-icon">${icon}</span> ${subCategory}`;
        } else {
          td.innerHTML = `&nbsp;&nbsp;&nbsp;&nbsp;${subCategory}`;
        }
      } else if (measureGroup && measureGroup.collapsed && measureGroup.measures[0] === col) {
        // Sum for collapsed measure group
        const sum = this.calculateMeasureGroupSum(subRows, measureGroup, data.columns);
        const formattedSum = this.tableFormatter ?
          this.tableFormatter.formatNumber(sum, cellIndex, null, data.columns[cellIndex]) :
          sum.toLocaleString();
        td.textContent = formattedSum;
      } else if (measureGroup && measureGroup.collapsed && measureGroup.measures[0] !== col) {
        td.style.display = 'none';
      } else {
        // Regular aggregation
        const aggregates = this.pivotGrouping.calculateGroupAggregates(subRows, data.columns);
        const value = aggregates[cellIndex];
        if (!isNaN(value) && cellIndex > columnsToSkip) {
          const formattedValue = this.tableFormatter ?
            this.tableFormatter.formatNumber(value, cellIndex, null, data.columns[cellIndex]) :
            value.toLocaleString();
          td.textContent = formattedValue;
        } else {
          td.textContent = '';
        }
      }

      // Apply cell formatting (but preserve pivot row styling)
      if (this.tableFormatter && cellIndex !== 0) {
        this.tableFormatter.applyCellStyling(td, false, 1, cellIndex);
      }

      tr.appendChild(td);
    });

    return tr;
  }

  /**
   * Create a segment row (third level)
   */
  createSegmentRow(segment, segmentRows, data) {
    const tr = document.createElement('tr');
    tr.className = 'pivot-level-2';

    // Determine how many dimension columns to skip
    const hierarchyLevels = this.pivotGrouping.getHierarchyLevels(data);
    const columnsToSkip = Math.min(hierarchyLevels - 1, 2);

    data.columns.forEach((col, cellIndex) => {
      // Skip dimension columns based on hierarchy level
      if (cellIndex > 0 && cellIndex <= columnsToSkip) return;

      const td = document.createElement('td');
      const measureGroup = this.measureGrouping.findGroupByMeasure(col);

      if (cellIndex === 0) {
        // Show segment indented more in first column
        td.innerHTML = `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${segment}`;
      } else if (measureGroup && measureGroup.collapsed && measureGroup.measures[0] === col) {
        // Sum for collapsed measure group
        const sum = this.calculateMeasureGroupSum(segmentRows, measureGroup, data.columns);
        const formattedSum = this.tableFormatter ?
          this.tableFormatter.formatNumber(sum, cellIndex, null, data.columns[cellIndex]) :
          sum.toLocaleString();
        td.textContent = formattedSum;
      } else if (measureGroup && measureGroup.collapsed && measureGroup.measures[0] !== col) {
        td.style.display = 'none';
      } else {
        // Regular aggregation
        const aggregates = this.pivotGrouping.calculateGroupAggregates(segmentRows, data.columns);
        const value = aggregates[cellIndex];
        if (!isNaN(value) && cellIndex > columnsToSkip) {
          const formattedValue = this.tableFormatter ?
            this.tableFormatter.formatNumber(value, cellIndex, null, data.columns[cellIndex]) :
            value.toLocaleString();
          td.textContent = formattedValue;
        } else {
          td.textContent = '';
        }
      }

      // Apply cell formatting (but preserve pivot row styling)
      if (this.tableFormatter && cellIndex !== 0) {
        this.tableFormatter.applyCellStyling(td, false, 2, cellIndex);
      }

      tr.appendChild(td);
    });

    return tr;
  }

  /**
   * Calculate sum for a collapsed measure group
   */
  calculateMeasureGroupSum(rowData, measureGroup, columns) {
    return rowData.reduce((total, { row }) => {
      return total + this.measureGrouping.calculateGroupSum(measureGroup, row, columns);
    }, 0);
  }

  /**
   * Toggle measure group
   */
  toggleMeasureGroup(measureGroup) {
    const groupId = this.measureGrouping.groups.indexOf(measureGroup);
    if (this.measureGrouping.toggleGroup(groupId)) {
      // Trigger re-render
      if (window.flextableApp && window.flextableApp.refresh) {
        window.flextableApp.refresh();
      }
    }
  }

  /**
   * Sort table by column (placeholder for future implementation)
   */
  sortTable(columnIndex) {
    console.log('Sorting by column:', columnIndex);
    // TODO: Implement sorting logic
  }
}

export default TableRenderer;