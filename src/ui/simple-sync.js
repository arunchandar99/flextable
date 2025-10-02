// Simple sync - just use Tableau's column order directly
import { log } from "../utils/logger.js";

export class SimpleSync {

  static async generateSettings() {
    try {
      const worksheet = tableau.extensions.worksheetContent.worksheet;
      const summary = await worksheet.getSummaryDataAsync({ ignoreSelection: true });

      console.log('[SimpleSync] Using Tableau column order directly');

      // The columns are ALREADY in marks card order!
      // Just categorize them by type while preserving order
      const settings = {
        columns: summary.columns.map(col => ({
          name: col.fieldName,
          type: this.inferFieldType(col),
          dataType: col.dataType,
          index: col.index
        }))
      };

      console.log('[SimpleSync] Column order:', settings.columns.map(c => c.name));
      return settings;

    } catch (error) {
      console.error('[SimpleSync] Failed to get columns:', error);
      return { columns: [] };
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