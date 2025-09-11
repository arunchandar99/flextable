// src/main.js
// ============================================================================
// FlexTable main entry
// Core functionality: fetch Tableau data, render table, export CSV
// ============================================================================
   import { fetchData, onSummaryDataChange, getWorksheetName } from "./services/tableau.js";
   import { renderTable } from "./ui/table-renderer.js";
   import { exportCSVFromDOM } from "./services/export.js";
   import { log } from "./utils/logger.js";
   
   
   async function init() {
     try {
       // Fetch the current worksheet's summary data
       const data = await fetchData();
   
       // Set the toolbar title to include the worksheet name
       const wsName = getWorksheetName();
       const titleEl = document.getElementById("ft-title");
       if (titleEl && wsName) titleEl.textContent = `FlexTable • ${wsName}`;
   
       // Render the base table (columns/rows)
       renderTable(data);
   
       // Wire Export CSV button
       wireExport();
   
       // React to Tableau data changes
       onSummaryDataChange((newData) => {
         renderTable(newData);
       });
   
       log("FlexTable initialized successfully.");
     } catch (err) {
       log("Initialization failed", err);
       const c = document.getElementById("flextable-container");
       if (c) c.innerHTML = `<div style="padding:12px;color:#a00;">Error: ${err?.message || err}</div>`;
     }
   }
   
   function wireExport() {
     const exportBtn = document.getElementById("export-btn");
     if (exportBtn) exportBtn.addEventListener("click", exportCSVFromDOM);
   }
   
   // Initialize on DOM ready
   document.addEventListener("DOMContentLoaded", init);

// ============================================================================


