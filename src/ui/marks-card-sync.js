// Sync table column order with Tableau marks card field order
import { log } from "../utils/logger.js";

export class MarksCardSync {

  static async getFieldOrder() {
    try {
      const worksheet = tableau.extensions.worksheetContent.worksheet;

      // Get the worksheet's data sources to understand field ordering
      const dataSources = await worksheet.getDataSourcesAsync();

      // Get summary data to see the actual column order from Tableau
      const summary = await worksheet.getSummaryDataAsync({ ignoreSelection: true });

      // The columns in summary.columns are already in the order they appear in the marks card
      const orderedFields = summary.columns.map(col => ({
        name: col.fieldName,
        index: col.index,
        dataType: col.dataType,
        isReferenced: col.isReferenced || false
      }));

      log('[MarksCardSync] Field order from marks card:', orderedFields.map(f => f.name));

      return orderedFields;
    } catch (error) {
      console.error('[MarksCardSync] Failed to get field order:', error);
      return [];
    }
  }

  static async generateOrderedSettings() {
    try {
      const worksheet = tableau.extensions.worksheetContent.worksheet;
      const summary = await worksheet.getSummaryDataAsync({ ignoreSelection: true });

      console.log('[MarksCardSync] Syncing with marks card order...');

      // Get fields in their marks card order
      const orderedFields = summary.columns;

      const measureColumns = [];
      const dimensionColumns = [];
      const details = [];

      // Process fields in the exact order they appear in marks card
      orderedFields.forEach(col => {
        const field = {
          name: col.fieldName,
          type: this.inferFieldType(col)
        };

        // Categorize by type but maintain marks card order
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

      // Create settings that preserve marks card order
      // But group by type (dimensions first, then measures, then details)
      const settings = {
        measureColumns,
        dimensionColumns,
        details,
        tooltips: [],
        // Store the original marks card order for reference
        marksCardOrder: orderedFields.map(col => col.fieldName)
      };

      console.log('[MarksCardSync] Generated settings with marks card order:', settings);
      return settings;

    } catch (error) {
      console.error('[MarksCardSync] Failed to sync with marks card:', error);
      return {
        measureColumns: [],
        dimensionColumns: [],
        details: [],
        tooltips: [],
        marksCardOrder: []
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

  // Monitor marks card changes
  static async setupChangeListener(onChangeCallback) {
    try {
      const worksheet = tableau.extensions.worksheetContent.worksheet;

      // Listen for filter changes (which often accompany marks card changes)
      worksheet.addEventListener(
        tableau.TableauEventType.FilterChanged,
        async () => {
          console.log('[MarksCardSync] Filter changed, checking marks card order...');
          const newSettings = await this.generateOrderedSettings();
          onChangeCallback(newSettings);
        }
      );

      // Listen for mark selection changes
      worksheet.addEventListener(
        tableau.TableauEventType.MarkSelectionChanged,
        async () => {
          console.log('[MarksCardSync] Mark selection changed, checking marks card order...');
          const newSettings = await this.generateOrderedSettings();
          onChangeCallback(newSettings);
        }
      );

      log('[MarksCardSync] Change listeners setup complete');
    } catch (error) {
      console.error('[MarksCardSync] Failed to setup listeners:', error);
    }
  }
}