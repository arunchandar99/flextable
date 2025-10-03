/**
 * Table Formatter Module
 * Handles all table formatting options including numbers, colors, fonts, and conditional formatting
 */

export class TableFormatter {
  constructor() {
    this.settings = {
      // Number Formatting
      numberFormat: {
        type: 'auto', // auto, number, currency, percentage, accounting, scientific
        currency: 'USD',
        decimals: 2,
        thousandsSeparator: true,
        negativeNumbers: 'parentheses', // parentheses, red, minus
        prefix: '',
        suffix: ''
      },

      // Cell Styling
      cellStyling: {
        fontFamily: 'inherit',
        fontSize: '13px',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'left', // left, center, right
        verticalAlign: 'middle', // top, middle, bottom
        textColor: 'inherit',
        backgroundColor: 'transparent',
        padding: '8px 12px'
      },

      // Header Styling
      headerStyling: {
        fontFamily: 'inherit',
        fontSize: '13px',
        fontWeight: '500',
        fontStyle: 'normal',
        textAlign: 'left',
        textColor: 'inherit',
        backgroundColor: '#f8f8f8',
        padding: '8px 12px',
        borderBottom: '1px solid #e0e0e0'
      },

      // Row Formatting
      rowFormatting: {
        alternatingRows: true,
        evenRowColor: '#fafafa',
        oddRowColor: 'transparent',
        hoverColor: '#f5f8fa',
        rowHeight: 'auto',
        rowBorder: 'none'
      },

      // Column Formatting
      columnFormatting: {
        columnWidth: 'auto',
        minColumnWidth: '80px',
        maxColumnWidth: 'none',
        columnBorder: '1px solid #e0e0e0'
      },

      // Table Structure
      tableStructure: {
        borderCollapse: 'collapse',
        tableLayout: 'auto', // auto, fixed
        gridLines: true,
        outerBorder: true,
        borderColor: '#e0e0e0',
        borderWidth: '1px',
        borderStyle: 'solid'
      },

      // Conditional Formatting Rules
      conditionalFormatting: {
        enabled: false,
        rules: []
      },

      // Column-specific formatting
      columnFormatting: {
        // Map of column index or name to specific formatting
        columns: {}
      }
    };

    this.loadFromStorage();
  }

  /**
   * Format a number value based on current settings
   */
  formatNumber(value, columnIndex = null, customFormat = null, columnName = null) {
    if (value === null || value === undefined || value === '') return '';

    // Check for column-specific formatting first
    let format = customFormat || this.settings.numberFormat;

    if (columnName || columnIndex !== null) {
      const columnKey = columnName || columnIndex.toString();
      if (this.settings.columnFormatting && this.settings.columnFormatting.columns) {
        const columnSpecificFormat = this.settings.columnFormatting.columns[columnKey];
        if (columnSpecificFormat && columnSpecificFormat.numberFormat) {
          format = { ...format, ...columnSpecificFormat.numberFormat };
          console.log('Applying column format for:', columnKey, format);
        }
      }
    }

    const numValue = typeof value === 'string' ? parseFloat(value.replace(/[,$%]/g, '')) : value;

    if (isNaN(numValue)) return value;

    let formatted = '';

    switch (format.type) {
      case 'currency':
        formatted = this.formatCurrency(numValue, format);
        break;
      case 'percentage':
        formatted = this.formatPercentage(numValue, format);
        break;
      case 'accounting':
        formatted = this.formatAccounting(numValue, format);
        break;
      case 'scientific':
        formatted = this.formatScientific(numValue, format);
        break;
      case 'number':
      default:
        formatted = this.formatRegularNumber(numValue, format);
        break;
    }

    return format.prefix + formatted + format.suffix;
  }

  /**
   * Format currency
   */
  formatCurrency(value, format) {
    const options = {
      style: 'currency',
      currency: format.currency,
      minimumFractionDigits: format.decimals,
      maximumFractionDigits: format.decimals
    };

    if (!format.thousandsSeparator) {
      options.useGrouping = false;
    }

    try {
      return new Intl.NumberFormat('en-US', options).format(value);
    } catch (e) {
      return this.formatRegularNumber(value, format);
    }
  }

  /**
   * Format percentage
   */
  formatPercentage(value, format) {
    const options = {
      style: 'percent',
      minimumFractionDigits: format.decimals,
      maximumFractionDigits: format.decimals
    };

    if (!format.thousandsSeparator) {
      options.useGrouping = false;
    }

    try {
      return new Intl.NumberFormat('en-US', options).format(value / 100);
    } catch (e) {
      return (value * 100).toFixed(format.decimals) + '%';
    }
  }

  /**
   * Format accounting style
   */
  formatAccounting(value, format) {
    const formatted = Math.abs(value).toLocaleString('en-US', {
      minimumFractionDigits: format.decimals,
      maximumFractionDigits: format.decimals,
      useGrouping: format.thousandsSeparator
    });

    if (value < 0) {
      return `(${formatted})`;
    }
    return ` ${formatted} `;
  }

  /**
   * Format scientific notation
   */
  formatScientific(value, format) {
    return value.toExponential(format.decimals);
  }

  /**
   * Format regular number
   */
  formatRegularNumber(value, format) {
    const options = {
      minimumFractionDigits: format.decimals,
      maximumFractionDigits: format.decimals,
      useGrouping: format.thousandsSeparator
    };

    let formatted = Math.abs(value).toLocaleString('en-US', options);

    if (value < 0) {
      switch (format.negativeNumbers) {
        case 'parentheses':
          formatted = `(${formatted})`;
          break;
        case 'red':
          formatted = `-${formatted}`;
          break;
        default:
          formatted = `-${formatted}`;
      }
    }

    return formatted;
  }

  /**
   * Apply cell styling to an element
   */
  applyCellStyling(element, isHeader = false, rowIndex = 0, columnIndex = 0) {
    const styling = isHeader ? this.settings.headerStyling : this.settings.cellStyling;

    // Check if this is a pivot row (has pivot-level class)
    const parentRow = element.parentElement;
    const isPivotRow = parentRow && (
      parentRow.classList.contains('pivot-level-0') ||
      parentRow.classList.contains('pivot-level-1') ||
      parentRow.classList.contains('pivot-level-2')
    );

    // Only apply certain styles to pivot rows to preserve their hierarchy styling
    if (isPivotRow) {
      // For pivot rows, only apply padding and alignment, preserve CSS colors
      element.style.padding = styling.padding;
      element.style.textAlign = styling.textAlign;
      element.style.verticalAlign = styling.verticalAlign;

      // Don't override font properties or colors for pivot rows
      // Let CSS handle the hierarchy styling
    } else {
      // Normal cells get full styling
      element.style.fontFamily = styling.fontFamily;
      element.style.fontSize = styling.fontSize;
      element.style.fontWeight = styling.fontWeight;
      element.style.fontStyle = styling.fontStyle;
      element.style.textAlign = styling.textAlign;
      element.style.verticalAlign = styling.verticalAlign;
      element.style.color = styling.textColor;
      element.style.padding = styling.padding;

      // Apply background color
      let backgroundColor = styling.backgroundColor;

      // Apply row formatting if not header
      if (!isHeader && this.settings.rowFormatting.alternatingRows) {
        backgroundColor = rowIndex % 2 === 0
          ? this.settings.rowFormatting.evenRowColor
          : this.settings.rowFormatting.oddRowColor;
      }

      element.style.backgroundColor = backgroundColor;

      // Apply conditional formatting
      if (!isHeader && this.settings.conditionalFormatting.enabled) {
        this.applyConditionalFormatting(element, rowIndex, columnIndex);
      }
    }
  }

  /**
   * Apply conditional formatting to a cell
   */
  applyConditionalFormatting(element, rowIndex, columnIndex) {
    const rules = this.settings.conditionalFormatting.rules;
    const value = parseFloat(element.textContent?.replace(/[,$%]/g, '') || 0);

    rules.forEach(rule => {
      if (rule.columnIndex !== null && rule.columnIndex !== columnIndex) return;

      if (this.meetsCondition(value, rule)) {
        this.applyFormattingRule(element, rule);
      }
    });
  }

  /**
   * Check if value meets conditional formatting condition
   */
  meetsCondition(value, rule) {
    switch (rule.condition) {
      case 'greaterThan':
        return value > rule.value;
      case 'lessThan':
        return value < rule.value;
      case 'equalTo':
        return value === rule.value;
      case 'between':
        return value >= rule.minValue && value <= rule.maxValue;
      case 'top10':
        // Would need to implement ranking logic
        return false;
      case 'bottom10':
        // Would need to implement ranking logic
        return false;
      default:
        return false;
    }
  }

  /**
   * Apply formatting rule to element
   */
  applyFormattingRule(element, rule) {
    switch (rule.type) {
      case 'backgroundColor':
        element.style.backgroundColor = rule.color;
        break;
      case 'textColor':
        element.style.color = rule.color;
        break;
      case 'dataBar':
        this.addDataBar(element, rule);
        break;
      case 'colorScale':
        element.style.backgroundColor = this.getColorScaleColor(rule);
        break;
      case 'iconSet':
        this.addIcon(element, rule);
        break;
    }
  }

  /**
   * Add data bar to cell
   */
  addDataBar(element, rule) {
    const value = parseFloat(element.textContent?.replace(/[,$%]/g, '') || 0);
    const percentage = Math.min((value / rule.maxValue) * 100, 100);

    element.style.position = 'relative';
    element.style.background = `linear-gradient(to right, ${rule.color} ${percentage}%, transparent ${percentage}%)`;
  }

  /**
   * Get color scale color
   */
  getColorScaleColor(rule) {
    // Implement color scale logic
    return rule.color;
  }

  /**
   * Add icon to cell
   */
  addIcon(element, rule) {
    const icon = document.createElement('span');
    icon.textContent = rule.icon;
    icon.style.marginRight = '4px';
    element.insertBefore(icon, element.firstChild);
  }

  /**
   * Apply table structure styling
   */
  applyTableStructure(table) {
    const structure = this.settings.tableStructure;

    table.style.borderCollapse = structure.borderCollapse;
    table.style.tableLayout = structure.tableLayout;

    if (structure.outerBorder) {
      table.style.border = `${structure.borderWidth} ${structure.borderStyle} ${structure.borderColor}`;
    }

    // Apply grid lines
    if (structure.gridLines) {
      const cells = table.querySelectorAll('td, th');
      cells.forEach(cell => {
        cell.style.border = `${structure.borderWidth} ${structure.borderStyle} ${structure.borderColor}`;
      });
    }
  }

  /**
   * Add conditional formatting rule
   */
  addConditionalFormattingRule(rule) {
    this.settings.conditionalFormatting.rules.push(rule);
    this.saveToStorage();
  }

  /**
   * Remove conditional formatting rule
   */
  removeConditionalFormattingRule(index) {
    this.settings.conditionalFormatting.rules.splice(index, 1);
    this.saveToStorage();
  }

  /**
   * Update formatting settings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveToStorage();
  }

  /**
   * Get current settings
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Reset to default settings
   */
  resetToDefaults() {
    // Save current rules before reset
    const currentRules = this.settings.conditionalFormatting.rules;

    // Reset everything else but keep rules
    this.settings = new TableFormatter().settings;
    this.settings.conditionalFormatting.rules = currentRules;

    this.saveToStorage();
  }

  /**
   * Save settings to localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem('flextable_formatting', JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save formatting settings:', e);
    }
  }

  /**
   * Load settings from localStorage
   */
  loadFromStorage() {
    try {
      const saved = localStorage.getItem('flextable_formatting');
      if (saved) {
        const loadedSettings = JSON.parse(saved);
        this.settings = { ...this.settings, ...loadedSettings };

        // Ensure columnFormatting structure exists
        if (!this.settings.columnFormatting) {
          this.settings.columnFormatting = { columns: {} };
        }
        if (!this.settings.columnFormatting.columns) {
          this.settings.columnFormatting.columns = {};
        }

        return true;
      }
    } catch (e) {
      console.error('Failed to load formatting settings:', e);
    }
    return false;
  }

  /**
   * Export formatting settings
   */
  exportSettings() {
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      formatting: this.settings
    };
  }

  /**
   * Import formatting settings
   */
  importSettings(importedData) {
    if (importedData.formatting) {
      this.settings = { ...this.settings, ...importedData.formatting };
      this.saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * Set column-specific number formatting
   */
  setColumnNumberFormat(columnKey, numberFormat) {
    // Ensure columnFormatting exists
    if (!this.settings.columnFormatting) {
      this.settings.columnFormatting = { columns: {} };
    }
    if (!this.settings.columnFormatting.columns) {
      this.settings.columnFormatting.columns = {};
    }
    if (!this.settings.columnFormatting.columns[columnKey]) {
      this.settings.columnFormatting.columns[columnKey] = {};
    }
    this.settings.columnFormatting.columns[columnKey].numberFormat = numberFormat;
    console.log('Column format set for:', columnKey, this.settings.columnFormatting.columns[columnKey]);
    console.log('All column formats:', this.settings.columnFormatting.columns);
    this.saveToStorage();
  }

  /**
   * Get column-specific number formatting
   */
  getColumnNumberFormat(columnKey) {
    if (!this.settings.columnFormatting || !this.settings.columnFormatting.columns) {
      return null;
    }
    const columnFormat = this.settings.columnFormatting.columns[columnKey];
    return columnFormat ? columnFormat.numberFormat : null;
  }

  /**
   * Remove column-specific formatting
   */
  removeColumnFormatting(columnKey) {
    if (this.settings.columnFormatting && this.settings.columnFormatting.columns) {
      delete this.settings.columnFormatting.columns[columnKey];
      this.saveToStorage();
    }
  }

  /**
   * Get all column-specific formatting
   */
  getAllColumnFormatting() {
    if (!this.settings.columnFormatting || !this.settings.columnFormatting.columns) {
      return {};
    }
    return this.settings.columnFormatting.columns;
  }

  /**
   * Clear all column-specific formatting
   */
  clearAllColumnFormatting() {
    if (!this.settings.columnFormatting) {
      this.settings.columnFormatting = { columns: {} };
    } else {
      this.settings.columnFormatting.columns = {};
    }
    this.saveToStorage();
  }
}

export default TableFormatter;