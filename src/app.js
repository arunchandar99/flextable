/**
 * FlexTable Main Application
 * Orchestrates all modules and provides the main application logic
 */

import TableauAPI from './modules/tableau/tableauAPI.js';
import MeasureGrouping from './modules/grouping/measureGrouping.js';
import PivotGrouping from './modules/grouping/pivotGrouping.js';
import ConfigModal from './modules/config/configModal.js';
import TableRenderer from './modules/table/tableRenderer.js';
import ExportManager from './modules/export/exportManager.js';

class FlexTableApp {
  constructor() {
    // Initialize modules
    this.tableauAPI = new TableauAPI();
    this.measureGrouping = new MeasureGrouping();
    this.pivotGrouping = new PivotGrouping();
    this.tableRenderer = new TableRenderer(this.measureGrouping, this.pivotGrouping);
    this.configModal = new ConfigModal(this.measureGrouping);
    this.exportManager = new ExportManager();

    // State
    this.currentData = null;
    this.currentWorksheet = null;

    // Make app available globally for module callbacks
    window.flextableApp = this;
  }

  /**
   * Initialize the application
   */
  async initialize() {
    try {
      // Show loading state
      this.showLoading();

      // Initialize Tableau Extensions API
      await this.tableauAPI.initialize();

      // Load saved configurations
      this.loadConfigurations();

      // Setup UI elements
      this.setupUI();

      // Setup worksheet selector
      this.setupWorksheetSelector();

      // Load initial data
      await this.loadData();

      // Setup data change listeners
      this.tableauAPI.setupDataChangeListeners((data) => {
        this.currentData = data;
        this.render();
      });

      console.log('FlexTable initialized successfully');

    } catch (error) {
      console.error('Failed to initialize FlexTable:', error);
      this.showError(error.message);
    }
  }

  /**
   * Setup UI event handlers
   */
  setupUI() {
    // Set table container
    const container = document.getElementById('table-container');
    this.tableRenderer.setContainer(container);

    // Configure button
    const configBtn = document.getElementById('configure-btn');
    if (configBtn) {
      configBtn.addEventListener('click', () => {
        this.configModal.open(this.currentData);
      });
    }

    // Export button
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportManager.exportToCSV();
      });
    }

    // Copy button
    const copyBtn = document.getElementById('copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        this.exportManager.copyToClipboard();
      });
    }

    // Additional export options (if present)
    const exportVisibleBtn = document.getElementById('export-visible-btn');
    if (exportVisibleBtn) {
      exportVisibleBtn.addEventListener('click', () => {
        this.exportManager.exportVisibleToCSV();
      });
    }

    const exportRawBtn = document.getElementById('export-raw-btn');
    if (exportRawBtn) {
      exportRawBtn.addEventListener('click', () => {
        this.exportManager.exportRawData(this.currentData);
      });
    }

    // Expand/Collapse all buttons
    const expandAllBtn = document.getElementById('expand-all-btn');
    if (expandAllBtn) {
      expandAllBtn.addEventListener('click', () => {
        this.pivotGrouping.expandAll();
        this.render();
      });
    }

    const collapseAllBtn = document.getElementById('collapse-all-btn');
    if (collapseAllBtn) {
      collapseAllBtn.addEventListener('click', () => {
        this.pivotGrouping.collapseAll();
        this.render();
      });
    }
  }

  /**
   * Setup worksheet selector
   */
  setupWorksheetSelector() {
    const worksheets = this.tableauAPI.getWorksheets();
    const selector = document.getElementById('worksheet-selector');

    if (!selector || worksheets.length <= 1) return;

    selector.style.display = 'block';
    selector.innerHTML = '';

    worksheets.forEach(ws => {
      const option = document.createElement('option');
      option.value = ws.name;
      option.textContent = ws.name;
      selector.appendChild(option);
    });

    selector.addEventListener('change', async (e) => {
      if (e.target.value) {
        this.currentWorksheet = e.target.value;
        await this.loadData(e.target.value);
      }
    });
  }

  /**
   * Load data from Tableau
   */
  async loadData(worksheetName = null) {
    try {
      this.showLoading();
      this.currentData = await this.tableauAPI.fetchData(worksheetName);
      this.updateTitle(this.currentData.worksheetName);
      this.render();
    } catch (error) {
      console.error('Failed to load data:', error);
      this.showError(error.message);
    }
  }

  /**
   * Render the table
   */
  render() {
    if (!this.currentData) return;
    this.tableRenderer.render(this.currentData);
    this.saveConfigurations();
  }

  /**
   * Refresh the display
   */
  refresh() {
    this.render();
  }

  /**
   * Load saved configurations
   */
  loadConfigurations() {
    // Load measure groups
    this.measureGrouping.loadFromStorage();

    // Load pivot state
    this.pivotGrouping.loadFromStorage();
  }

  /**
   * Save configurations
   */
  saveConfigurations() {
    // Save measure groups
    this.measureGrouping.saveToStorage();

    // Save pivot state
    this.pivotGrouping.saveToStorage();
  }

  /**
   * Update title
   */
  updateTitle(worksheetName) {
    const titleEl = document.getElementById('table-title');
    if (titleEl && worksheetName) {
      titleEl.textContent = worksheetName;
    }
  }

  /**
   * Show loading state
   */
  showLoading() {
    const container = document.getElementById('table-container');
    if (container) {
      container.innerHTML = '<div class="loading">Loading data...</div>';
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const container = document.getElementById('table-container');
    if (container) {
      container.innerHTML = `
        <div class="error">
          <h3>Error</h3>
          <p>${message}</p>
          <p style="font-size: 11px; color: #666; margin-top: 10px;">
            Make sure you're loading this as a Dashboard Extension in Tableau Desktop.
          </p>
        </div>
      `;
    }
  }

  /**
   * Export current configuration
   */
  exportConfig() {
    this.exportManager.exportConfiguration(
      this.measureGrouping.getGroups(),
      this.pivotGrouping.getExpansionState()
    );
  }

  /**
   * Import configuration
   */
  async importConfig() {
    try {
      const config = await this.exportManager.importConfiguration();

      if (config.measureGroups) {
        this.measureGrouping.groups = config.measureGroups;
      }

      if (config.pivotState) {
        this.pivotGrouping.restoreExpansionState(config.pivotState);
      }

      this.render();
      this.exportManager.showToast('Configuration imported successfully');
    } catch (error) {
      console.error('Failed to import configuration:', error);
      alert('Failed to import configuration: ' + error);
    }
  }
}

// Export the app class
export default FlexTableApp;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new FlexTableApp();
  app.initialize();
});