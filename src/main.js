// src/main.js
// ============================================================================
// FlexTable main entry
// Phase 1: Core functionality (table, sorting, CSV export)
// Phase 2: Advanced features (filtering, row numbers, column controls, aggregation)
// ============================================================================

// Phase 1 imports
import { fetchData, onSummaryDataChange, getWorksheetName } from "./services/tableau.js";
import { renderTable } from "./ui/table-renderer.js";
import { exportCSVFromDOM } from "./services/export.js";
import { log } from "./utils/logger.js";

// Phase 2 imports
import { mountDomFilters, clearDomFilters } from "./ui/filter-panel-dom.js";
import { initRowNumbers } from "./ui/row-number-dom.js";
import { initColumnsMenu } from "./ui/columns-menu-dom.js";
import { initAggregateByVisibleDims } from "./ui/aggregate-by-visible-dims-dom.js";
   
   
   async function init() {
     try {
       // Phase 1: Core functionality
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
   
       // Phase 2: Advanced features
       // Initialize all Phase 2 features after table is rendered
       initializePhase2Features();
   
       // Wire Clear Filters button
       ensureClearFiltersButton();
   
       // React to Tableau data changes
       onSummaryDataChange((newData) => {
         renderTable(newData);
         // Re-initialize Phase 2 features after data changes
         initializePhase2Features();
       });
   
       // Safety net: Re-mount features if DOM changes externally
       observeDOMChanges();
   
       // Expose global shortcuts for debugging
       window.FlexTable = Object.assign(window.FlexTable || {}, {
         clearFilters: () => clearDomFilters(),
         refreshFeatures: () => initializePhase2Features()
       });
   
       log("FlexTable initialized successfully with Phase 1 + Phase 2 features.");
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
   
   // Phase 2 feature initialization with proper sequencing
   function initializePhase2Features() {
     try {
       // Step 1: Initialize row numbers first (creates # column and sets CSS variables)
       initRowNumbers();
       
       // Step 2: Small delay to let DOM settle before adding filters
       setTimeout(() => {
         // Initialize column filtering (creates filter row)
         mountDomFilters();
         
         // Step 3: Initialize other features after DOM is stable
         setTimeout(() => {
           initColumnsMenu();
           initAggregateByVisibleDims();
         }, 50);
       }, 100);
       
       log("Phase 2 features initialization started.");
     } catch (err) {
       log("Phase 2 feature initialization failed:", err);
     }
   }
   
   // Clear Filters button management
   function ensureClearFiltersButton() {
     const bar = document.querySelector(".ft-toolbar");
     if (!bar) return;
   
     let btn = document.getElementById("ft-clear-filters");
     if (!btn) {
       btn = document.createElement("button");
       btn.id = "ft-clear-filters";
       btn.className = "ft-btn";
       btn.textContent = "Clear Filters";
       // Insert before Export button
       const exportBtn = document.getElementById("export-btn");
       bar.insertBefore(btn, exportBtn || null);
     }
   
     // Bind/rebind the click handler
     btn.onclick = () => {
       try { 
         clearDomFilters(); 
         log("Filters cleared successfully.");
       } catch (e) { 
         log("Clear filters failed:", e); 
       }
     };
   }
   
   // DOM change observer for automatic feature re-mounting (reduced frequency)
   function observeDOMChanges() {
     const container = document.getElementById("flextable-container") || document.body;
     const observer = new MutationObserver(() => {
       clearTimeout(observer._debounceTimer);
       observer._debounceTimer = setTimeout(() => {
         try { 
           // Only re-mount if the table structure actually changed
           const table = document.querySelector(".flextable");
           const hasFilters = table && table.querySelector("thead tr:nth-child(2)");
           if (table && !hasFilters) {
             mountDomFilters(); 
           }
         } catch (e) { 
           log("Auto-remount filters failed:", e); 
         }
       }, 300); // Increased delay to reduce frequency
     });
     observer.observe(container, { childList: true, subtree: false }); // Less intrusive watching
   }
   
   // Initialize on DOM ready
   document.addEventListener("DOMContentLoaded", init);
