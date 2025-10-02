/**
 * Tableau Extensions API Module
 * Handles all interactions with Tableau
 */

export class TableauAPI {
  constructor() {
    this.initialized = false;
    this.dashboard = null;
  }

  /**
   * Initialize Tableau Extensions
   */
  async initialize() {
    try {
      // Check if Tableau API is available
      if (typeof tableau === 'undefined' || !tableau.extensions) {
        throw new Error('Tableau Extensions API not found. Make sure this is loaded as a Dashboard Extension.');
      }

      // Initialize the extension
      await tableau.extensions.initializeAsync();
      this.dashboard = tableau.extensions.dashboardContent.dashboard;
      this.initialized = true;

      console.log('Tableau Extension initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Tableau Extension:', error);
      throw error;
    }
  }

  /**
   * Get list of available worksheets
   */
  getWorksheets() {
    if (!this.initialized) {
      throw new Error('Tableau API not initialized');
    }
    return this.dashboard.worksheets;
  }

  /**
   * Fetch data from a specific worksheet
   */
  async fetchData(worksheetName = null) {
    if (!this.initialized) {
      throw new Error('Tableau API not initialized');
    }

    const worksheets = this.getWorksheets();

    if (worksheets.length === 0) {
      throw new Error('No worksheets found in dashboard');
    }

    // Use specified worksheet or first available
    const worksheet = worksheetName ?
      worksheets.find(ws => ws.name === worksheetName) :
      worksheets[0];

    if (!worksheet) {
      throw new Error(`Worksheet "${worksheetName}" not found`);
    }

    const summary = await worksheet.getSummaryDataAsync({ ignoreSelection: false });

    const data = {
      worksheetName: worksheet.name,
      columns: summary.columns.map(c => c.fieldName),
      rows: summary.data.map(row => row.map(cell => cell?.formattedValue || '')),
      columnTypes: summary.columns.map(c => ({
        name: c.fieldName,
        dataType: c.dataType
      }))
    };

    return data;
  }

  /**
   * Set up data change listeners
   */
  setupDataChangeListeners(callback) {
    if (!this.initialized) {
      throw new Error('Tableau API not initialized');
    }

    this.dashboard.worksheets.forEach(worksheet => {
      worksheet.addEventListener(
        tableau.TableauEventType.SummaryDataChanged,
        async () => {
          console.log('Data changed in worksheet:', worksheet.name);
          if (callback) {
            const data = await this.fetchData(worksheet.name);
            callback(data);
          }
        }
      );
    });
  }
}

export default TableauAPI;