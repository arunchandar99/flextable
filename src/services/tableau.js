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

    // For worksheet extensions, get data from the current worksheet
    const worksheet = tableau.extensions.worksheetContent.worksheet;
    const summary = await worksheet.getSummaryDataAsync({ ignoreSelection: true });

    console.log('[Tableau Service] fetchData called with settings:', settings);

    // IMPORTANT: The columns in summary.columns are ALREADY in marks card order!
    console.log('[Tableau Service] Column order from Tableau:', summary.columns.map(c => c.fieldName));

    // If no settings provided (null/undefined), return all fields in marks card order
    if (settings === null || settings === undefined) {
      const columns = summary.columns.map(c => c.fieldName);
      const rows = summary.data.map(row =>
        row.map(cell => cell?.formattedValue || '')
      );

      const shelfData = {
        measureColumns: [],
        dimensionColumns: [],
        details: columns.map(col => ({ name: col, type: 'unknown' })),
        tooltips: []
      };

      return {
        columns,
        rows,
        shelfData,
        tooltipFields: []
      };
    }

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

    console.log('[Tableau Service] Using direct Tableau column order:', columns);

    return {
      columns,
      rows,
      shelfData,
      tooltipFields: []
    };
  }
  
  export function getWorksheetName() {
    try {
      const worksheet = tableau.extensions.worksheetContent.worksheet;
      return worksheet.name || "";
    } catch { return ""; }
  }
  
  export function onSummaryDataChange(handler) {
    try {
      const worksheet = tableau.extensions.worksheetContent.worksheet;

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
    } catch (e) {
      console.warn("Failed to setup data change listeners:", e);
    }
  }
  