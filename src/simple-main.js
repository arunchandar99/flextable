// Simple Tableau Table replica - Dashboard Extension
// Clean, minimal table display like Tableau's built-in Table extension

import { log } from "./utils/logger.js";

// Ensure Tableau Extensions API is available
async function ensureExtensionsApi() {
  // In Tableau Desktop, the API should already be injected
  if (typeof window.tableau !== "undefined" && window.tableau?.extensions) {
    console.log('[Simple Table] Tableau API already available');
    return;
  }

  // Try to load from CDN as fallback
  try {
    await injectScript("https://tableau.github.io/extensions-api/lib/tableau.extensions.1.latest.js", 5000);
    if (typeof window.tableau !== "undefined" && window.tableau?.extensions) {
      console.log('[Simple Table] Tableau API loaded from CDN');
      return;
    }
  } catch (err) {
    console.error('[Simple Table] Failed to load Tableau API:', err);
  }

  throw new Error("Tableau Extensions API not available");
}

function injectScript(src, timeoutMs = 7000) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    let done = false;
    s.src = src;
    s.onload = () => { if (!done) { done = true; resolve(); } };
    s.onerror = () => { if (!done) { done = true; reject(new Error("load error")); } };
    document.head.appendChild(s);
    setTimeout(() => { if (!done) { done = true; reject(new Error("load timeout")); } }, timeoutMs);
  });
}

// Fetch data from selected worksheet
async function fetchData(worksheetName = null) {
  const dashboard = tableau.extensions.dashboardContent.dashboard;
  const worksheets = dashboard.worksheets;

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

  return {
    worksheetName: worksheet.name,
    columns: summary.columns.map(c => c.fieldName),
    rows: summary.data.map(row => row.map(cell => cell?.formattedValue || '')),
    columnTypes: summary.columns.map(c => ({
      name: c.fieldName,
      dataType: c.dataType
    }))
  };
}

// Simple table renderer
function renderTable(data) {
  const container = document.getElementById('table-container');
  if (!container) return;

  // Clear existing content
  container.innerHTML = '';

  // Create simple table
  const table = document.createElement('table');
  table.className = 'simple-table';

  // Create header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  data.columns.forEach((col, index) => {
    const th = document.createElement('th');
    th.textContent = col;
    th.style.cursor = 'pointer';
    th.onclick = () => sortTable(index);
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create body
  const tbody = document.createElement('tbody');

  data.rows.forEach(row => {
    const tr = document.createElement('tr');
    row.forEach(cell => {
      const td = document.createElement('td');
      td.textContent = cell;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

// Simple sort function
function sortTable(columnIndex) {
  const table = document.querySelector('.simple-table');
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));

  // Simple toggle between ascending and descending
  const isAscending = table.dataset.sortColumn !== String(columnIndex) ||
                      table.dataset.sortOrder !== 'asc';

  rows.sort((a, b) => {
    const aText = a.children[columnIndex].textContent;
    const bText = b.children[columnIndex].textContent;

    // Try numeric comparison first
    const aNum = parseFloat(aText.replace(/[,$%]/g, ''));
    const bNum = parseFloat(bText.replace(/[,$%]/g, ''));

    if (!isNaN(aNum) && !isNaN(bNum)) {
      return isAscending ? aNum - bNum : bNum - aNum;
    }

    // Fall back to string comparison
    return isAscending ?
      aText.localeCompare(bText) :
      bText.localeCompare(aText);
  });

  // Update table
  tbody.innerHTML = '';
  rows.forEach(row => tbody.appendChild(row));

  // Update sort indicators
  table.dataset.sortColumn = columnIndex;
  table.dataset.sortOrder = isAscending ? 'asc' : 'desc';

  // Update header indicators
  const headers = table.querySelectorAll('th');
  headers.forEach((th, index) => {
    th.className = '';
    if (index === columnIndex) {
      th.className = isAscending ? 'sort-asc' : 'sort-desc';
    }
  });
}

// Setup worksheet selector
function setupWorksheetSelector() {
  const dashboard = tableau.extensions.dashboardContent.dashboard;
  const worksheets = dashboard.worksheets;
  const selector = document.getElementById('worksheet-selector');

  if (!selector || worksheets.length <= 1) return;

  // Show selector
  selector.style.display = 'block';
  selector.innerHTML = '';

  // Add options
  worksheets.forEach(ws => {
    const option = document.createElement('option');
    option.value = ws.name;
    option.textContent = ws.name;
    selector.appendChild(option);
  });

  // Handle selection
  selector.addEventListener('change', async (e) => {
    if (e.target.value) {
      const data = await fetchData(e.target.value);
      renderTable(data);
      updateTitle(data.worksheetName);
    }
  });
}

// Update title
function updateTitle(worksheetName) {
  const titleEl = document.getElementById('table-title');
  if (titleEl && worksheetName) {
    titleEl.textContent = worksheetName;
  }
}

// Export to CSV
function exportCSV() {
  const table = document.querySelector('.simple-table');
  if (!table) return;

  let csv = '';

  // Headers
  const headers = Array.from(table.querySelectorAll('thead th'))
    .map(th => `"${th.textContent.replace(/"/g, '""')}"`);
  csv += headers.join(',') + '\n';

  // Data
  const rows = table.querySelectorAll('tbody tr');
  rows.forEach(row => {
    const cells = Array.from(row.querySelectorAll('td'))
      .map(td => `"${td.textContent.replace(/"/g, '""')}"`);
    csv += cells.join(',') + '\n';
  });

  // Download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tableau-table-export.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// Initialize
async function init() {
  const container = document.getElementById('table-container');

  try {
    // Show loading message
    if (container) {
      container.innerHTML = '<div class="loading">Initializing Tableau Extension...</div>';
    }

    // Load Tableau API
    await ensureExtensionsApi();

    // Initialize extension
    await tableau.extensions.initializeAsync();
    console.log('[Simple Table] Extension initialized');

    // Setup worksheet selector
    setupWorksheetSelector();

    // Load initial data
    const data = await fetchData();
    console.log('[Simple Table] Data loaded:', data.columns.length, 'columns,', data.rows.length, 'rows');

    renderTable(data);
    updateTitle(data.worksheetName);

    // Wire export button
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportCSV);
    }

    // Listen for data changes
    const dashboard = tableau.extensions.dashboardContent.dashboard;
    dashboard.worksheets.forEach(worksheet => {
      worksheet.addEventListener(
        tableau.TableauEventType.SummaryDataChanged,
        async () => {
          console.log('[Simple Table] Data changed in worksheet:', worksheet.name);
          const data = await fetchData(worksheet.name);
          renderTable(data);
        }
      );
    });

    console.log('[Simple Table] Extension ready');

  } catch (err) {
    console.error('[Simple Table] Initialization failed:', err);
    if (container) {
      container.innerHTML = `
        <div class="error">
          <h3>Failed to Initialize</h3>
          <p>${err?.message || 'Unknown error'}</p>
          <p style="font-size: 11px; color: #666;">
            Make sure you're loading this as a Dashboard Extension in Tableau Desktop.
          </p>
        </div>
      `;
    }
  }
}

// Start on DOM ready
document.addEventListener("DOMContentLoaded", init);