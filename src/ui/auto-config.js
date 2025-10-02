// Auto-configure fields based on Tableau field types
export class AutoConfig {

  static async generateSettings() {
    try {
      const worksheet = tableau.extensions.worksheetContent.worksheet;
      const summary = await worksheet.getSummaryDataAsync({ ignoreSelection: true });

      console.log('[AutoConfig] Auto-configuring fields...');

      const measureColumns = [];
      const dimensionColumns = [];
      const details = [];

      summary.columns.forEach(col => {
        const field = {
          name: col.fieldName,
          type: this.inferFieldType(col)
        };

        // Auto-assign based on data type
        switch (col.dataType) {
          case 'int':
          case 'float':
            measureColumns.push(field);
            break;
          case 'string':
          case 'bool':
          case 'date':
          case 'datetime':
            dimensionColumns.push(field);
            break;
          default:
            details.push(field);
        }
      });

      const settings = {
        measureColumns,
        dimensionColumns,
        details,
        tooltips: []
      };

      console.log('[AutoConfig] Auto-generated settings:', settings);
      return settings;

    } catch (error) {
      console.error('[AutoConfig] Failed to auto-configure:', error);
      return {
        measureColumns: [],
        dimensionColumns: [],
        details: [],
        tooltips: []
      };
    }
  }

  static inferFieldType(column) {
    switch (column.dataType) {
      case 'int':
      case 'float':
        return 'measure';
      case 'string':
      case 'bool':
      case 'date':
      case 'datetime':
        return 'dimension';
      default:
        return 'dimension';
    }
  }
}