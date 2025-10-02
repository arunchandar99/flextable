/**
 * Export Manager Module
 * Handles exporting table data to various formats
 */

export class ExportManager {

  /**
   * Export table to CSV
   */
  exportToCSV() {
    const table = document.querySelector('.simple-table');
    if (!table) {
      alert('No table found to export');
      return;
    }

    let csv = '';

    // Get headers
    const headers = Array.from(table.querySelectorAll('thead tr:last-child th'))
      .filter(th => th.style.display !== 'none')
      .map(th => `"${th.textContent.replace(/"/g, '""').trim()}"`);
    csv += headers.join(',') + '\n';

    // Get data rows
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const cells = Array.from(row.querySelectorAll('td'))
        .filter(td => td.style.display !== 'none')
        .map(td => `"${td.textContent.replace(/"/g, '""').trim()}"`);
      csv += cells.join(',') + '\n';
    });

    // Download
    this.downloadFile(csv, 'table-export.csv', 'text/csv');
  }

  /**
   * Export table to Excel (simplified - actually creates CSV that Excel can open)
   */
  exportToExcel() {
    // For now, just export as CSV which Excel can open
    this.exportToCSV();
  }

  /**
   * Export visible data only (respecting collapsed groups)
   */
  exportVisibleToCSV() {
    const table = document.querySelector('.simple-table');
    if (!table) {
      alert('No table found to export');
      return;
    }

    let csv = '';

    // Get visible headers
    const headers = Array.from(table.querySelectorAll('thead tr:last-child th'))
      .filter(th => th.style.display !== 'none' && !th.classList.contains('hidden'))
      .map(th => `"${th.textContent.replace(/"/g, '""').trim()}"`);
    csv += headers.join(',') + '\n';

    // Get visible data rows
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
      if (row.style.display === 'none' || row.classList.contains('hidden')) {
        return; // Skip hidden rows
      }

      const cells = Array.from(row.querySelectorAll('td'))
        .filter(td => td.style.display !== 'none' && !td.classList.contains('hidden'))
        .map(td => `"${td.textContent.replace(/"/g, '""').trim()}"`);

      if (cells.length > 0) {
        csv += cells.join(',') + '\n';
      }
    });

    // Download
    this.downloadFile(csv, 'table-export-visible.csv', 'text/csv');
  }

  /**
   * Export raw data (original data without grouping)
   */
  exportRawData(data) {
    if (!data || !data.columns || !data.rows) {
      alert('No data available to export');
      return;
    }

    let csv = '';

    // Headers
    csv += data.columns.map(col => `"${col.replace(/"/g, '""')}"`).join(',') + '\n';

    // Data
    data.rows.forEach(row => {
      csv += row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',') + '\n';
    });

    // Download
    this.downloadFile(csv, 'raw-data-export.csv', 'text/csv');
  }

  /**
   * Copy table to clipboard
   */
  async copyToClipboard() {
    const table = document.querySelector('.simple-table');
    if (!table) {
      alert('No table found to copy');
      return;
    }

    try {
      // Create a temporary element with the table HTML
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNode(table);
      selection.removeAllRanges();
      selection.addRange(range);

      // Copy to clipboard
      document.execCommand('copy');

      // Clear selection
      selection.removeAllRanges();

      // Show success message
      this.showToast('Table copied to clipboard');
    } catch (err) {
      console.error('Failed to copy table:', err);
      alert('Failed to copy table to clipboard');
    }
  }

  /**
   * Download file helper
   */
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Show toast notification
   */
  showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #333;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * Export configuration
   */
  exportConfiguration(measureGroups, pivotState) {
    const config = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      measureGroups: measureGroups,
      pivotState: pivotState
    };

    const json = JSON.stringify(config, null, 2);
    this.downloadFile(json, 'flextable-config.json', 'application/json');
  }

  /**
   * Import configuration
   */
  async importConfiguration() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';

      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
          reject('No file selected');
          return;
        }

        try {
          const text = await file.text();
          const config = JSON.parse(text);
          resolve(config);
        } catch (err) {
          reject('Failed to parse configuration file');
        }
      };

      input.click();
    });
  }
}

export default ExportManager;