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
  
  export async function fetchData() {
    await ensureExtensionsApi();
    await tableau.extensions.initializeAsync();
  
    const worksheet = tableau.extensions.worksheetContent.worksheet;
    const summary = await worksheet.getSummaryDataAsync({ ignoreSelection: true });
  
    const columns = summary.columns.map(c => c.fieldName);
    const rows = summary.data.map(r => r.map(cell => cell.formattedValue));
  
    return { columns, rows };
  }
  
  export function getWorksheetName() {
    try {
      const ws = tableau.extensions.worksheetContent.worksheet;
      return ws?.name || "";
    } catch { return ""; }
  }
  
  export function onSummaryDataChange(handler) {
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
  }
  