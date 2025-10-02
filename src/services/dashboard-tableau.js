// Dashboard extension API services
import { log } from "../utils/logger.js";

// Ensure the Tableau Extensions API is available (local -> web fallbacks)
async function ensureExtensionsApi() {
    if (typeof window.tableau !== "undefined" && window.tableau?.extensions) return;

    const candidates = [
      // Local copy (preferred)
      "lib/tableau.extensions.1.13.0.js",
      // Official GitHub
      "https://tableau.github.io/extensions-api/lib/tableau.extensions.1.13.0.js",
      "https://tableau.github.io/extensions-api/lib/tableau.extensions.1.latest.js",
      // CDNs (fallbacks)
      "https://cdn.jsdelivr.net/npm/tableau-extensions-api@1.13.0/lib/tableau.extensions.1.13.0.js",
      "https://unpkg.com/tableau-extensions-api@1.13.0/lib/tableau.extensions.1.13.0.js"
    ];

    for (const src of candidates) {
      try {
        await injectScript(src, 7000);
        if (typeof window.tableau !== "undefined" && window.tableau?.extensions) return;
      } catch { /* try next */ }
    }
    throw new Error("Tableau Extensions API failed to load. Check lib/ or network access.");
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

export async function fetchData(settings = null) {
  await ensureExtensionsApi();
  await tableau.extensions.initializeAsync();

  console.log('[Dashboard Tableau] Dashboard extension initialized');

  // For dashboard extensions, we need to get worksheets first
  const dashboard = tableau.extensions.dashboardContent.dashboard;
  const worksheets = dashboard.worksheets;

  console.log('[Dashboard Tableau] Found worksheets:', worksheets.map(ws => ws.name));

  if (worksheets.length === 0) {
    throw new Error('No worksheets found in dashboard');
  }

  // Use the first worksheet (or we could show a selector later)
  const worksheet = worksheets[0];
  console.log('[Dashboard Tableau] Using worksheet:', worksheet.name);

  const summary = await worksheet.getSummaryDataAsync({ ignoreSelection: true });

  console.log('[Dashboard Tableau] fetchData called with settings:', settings);

  // IMPORTANT: The columns in summary.columns are ALREADY in marks card order!
  console.log('[Dashboard Tableau] Column order from Tableau:', summary.columns.map(c => c.fieldName));

  // SIMPLE APPROACH: Just use the columns in their natural Tableau order
  const columns = summary.columns.map(c => c.fieldName);
  const rows = summary.data.map(row =>
    row.map(cell => cell?.formattedValue || '')
  );

  // Build shelf data with column types for styling
  const shelfData = {
    columns: summary.columns.map(col => ({
      name: col.fieldName,
      type: col.dataType === 'int' || col.dataType === 'float' ? 'measure' : 'dimension',
      dataType: col.dataType
    }))
  };

  console.log('[Dashboard Tableau] Using direct Tableau column order:', columns);

  return {
    columns,
    rows,
    shelfData,
    tooltipFields: [],
    worksheetName: worksheet.name
  };
}

export function getDashboardName() {
  try {
    const dashboard = tableau.extensions.dashboardContent.dashboard;
    return dashboard.name || "";
  } catch { return ""; }
}

export function getAvailableWorksheets() {
  try {
    const dashboard = tableau.extensions.dashboardContent.dashboard;
    return dashboard.worksheets.map(ws => ({
      name: ws.name,
      id: ws.id
    }));
  } catch { return []; }
}

export async function fetchDataFromWorksheet(worksheetName, settings = null) {
  await ensureExtensionsApi();
  await tableau.extensions.initializeAsync();

  const dashboard = tableau.extensions.dashboardContent.dashboard;
  const worksheet = dashboard.worksheets.find(ws => ws.name === worksheetName);

  if (!worksheet) {
    throw new Error(`Worksheet "${worksheetName}" not found`);
  }

  const summary = await worksheet.getSummaryDataAsync({ ignoreSelection: true });

  // SIMPLE APPROACH: Just use the columns in their natural Tableau order
  const columns = summary.columns.map(c => c.fieldName);
  const rows = summary.data.map(row =>
    row.map(cell => cell?.formattedValue || '')
  );

  // Build shelf data with column types for styling
  const shelfData = {
    columns: summary.columns.map(col => ({
      name: col.fieldName,
      type: col.dataType === 'int' || col.dataType === 'float' ? 'measure' : 'dimension',
      dataType: col.dataType
    }))
  };

  return {
    columns,
    rows,
    shelfData,
    tooltipFields: [],
    worksheetName: worksheet.name
  };
}

export function onSummaryDataChange(handler) {
  try {
    const dashboard = tableau.extensions.dashboardContent.dashboard;
    const worksheets = dashboard.worksheets;

    // Listen to all worksheets for data changes
    worksheets.forEach(worksheet => {
      worksheet.addEventListener(
        tableau.TableauEventType.SummaryDataChanged,
        async () => {
          try {
            const data = await fetchData();
            handler(data);
          } catch (e) {
            console.warn("SummaryDataChanged refresh failed:", e);
          }
        }
      );
    });
  } catch (e) {
    console.warn("Failed to setup data change listeners:", e);
  }
}