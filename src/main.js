// src/main.js
// ============================================================================
// FlexTable main entry
// Phase 1: Core functionality (table, sorting, CSV export)
// Phase 2: Advanced features (filtering, row numbers, column controls, aggregation)
// ============================================================================

// Phase 1 imports
import { fetchData, onSummaryDataChange, getDashboardName, getAvailableWorksheets, fetchDataFromWorksheet } from "./services/dashboard-tableau.js";
import { renderTable } from "./ui/table-renderer.js";
import { exportCSVFromDOM } from "./services/export.js";
import { log } from "./utils/logger.js";
// import { MarksCardSync } from "./ui/marks-card-sync.js";

// Phase 2 imports
import { mountDomFilters, clearDomFilters } from "./ui/filter-panel-dom.js";
import { initColumnAlignment, reapplyColumnAlignments } from "./ui/column-alignment-dom.js";
import { initColumnResize, reapplyColumnWidths, enableDoubleClickAutoSize } from "./ui/column-resize-dom.js";
import { initRowNumbers } from "./ui/row-number-dom.js";
import { initColumnsMenu } from "./ui/columns-menu-dom.js";
import { initAggregateByVisibleDims } from "./ui/aggregate-by-visible-dims-dom.js";
import { addColumnReorderMenu, restoreColumnOrder } from "./ui/clean-column-reorder.js";

// Phase 3 imports
import { initGlobalSearch, clearGlobalSearch } from "./ui/global-search-dom.js";

// Commission breakdown imports
import { MeasureGrouping } from "./ui/measure-grouping.js";
import { CommissionCalculator } from "./ui/commission-calculator.js";

// Initialize global instances
let measureGrouping = null;
let commissionCalculator = null;

// No settings management needed - direct Tableau sync

// Refresh the table with latest data
async function refreshTable() {
  try {
    const data = await fetchData();
    renderTable(data);
    initializePhase2Features();
    // Re-apply customizations after table rebuild
    setTimeout(() => {
      reapplyColumnAlignments();
      reapplyColumnWidths();
    }, 50);
  } catch (error) {
    console.error('Failed to refresh table:', error);
  }
}

// Helper function to update title
function updateTitle(data = null) {
  const dashboardName = getDashboardName();
  const titleEl = document.getElementById("ft-title");

  let title = "FlexTable";

  if (dashboardName) {
    title += ` • ${dashboardName}`;
  }

  if (data && data.worksheetName) {
    title += ` • ${data.worksheetName}`;
  }

  if (titleEl) {
    titleEl.textContent = title;
  }
}

async function setupWorksheetSelector() {
  try {
    const worksheets = getAvailableWorksheets();
    const selector = document.getElementById('worksheet-selector');

    if (worksheets.length > 1) {
      // Multiple worksheets - show selector
      selector.style.display = 'block';

      // Clear existing options except first
      selector.innerHTML = '<option value="">Select Worksheet...</option>';

      // Add worksheet options
      worksheets.forEach(ws => {
        const option = document.createElement('option');
        option.value = ws.name;
        option.textContent = ws.name;
        selector.appendChild(option);
      });

      // Handle worksheet selection
      selector.addEventListener('change', async (e) => {
        const worksheetName = e.target.value;
        if (worksheetName) {
          console.log('[FlexTable] Switching to worksheet:', worksheetName);

          try {
            const data = await fetchDataFromWorksheet(worksheetName);
            updateTitle(data);
            renderTable(data);

            // Re-add column reorder menu after table re-renders
            setTimeout(() => {
              restoreColumnOrder();
              addColumnReorderMenu();
            }, 100);

            initializePhase2Features();
          } catch (error) {
            console.error('Failed to switch worksheet:', error);
          }
        }
      });

      console.log('[FlexTable] Worksheet selector setup complete');
    }
  } catch (error) {
    console.error('[FlexTable] Failed to setup worksheet selector:', error);
  }
}

async function init() {
  try {
    // Show loading state
    const titleEl = document.getElementById("ft-title");
    if (titleEl) titleEl.textContent = "FlexTable • Loading...";

    // Setup worksheet selector for dashboard extensions
    await setupWorksheetSelector();

    // Phase 1: Core functionality
    // Fetch data directly - columns already in marks card order
    const data = await fetchData();

    // Set the toolbar title to include the dashboard and worksheet name
    updateTitle(data);

    // Render the base table (columns/rows)
    renderTable(data);

    // Add column reorder menu and restore order
    setTimeout(() => {
      restoreColumnOrder();
      addColumnReorderMenu();
    }, 100);

    // Wire Export CSV button
    wireExport();

    // Phase 2: Advanced features
    // Initialize all Phase 2 features after table is rendered
    initializePhase2Features();

    // Wire Clear Filters button
    ensureClearFiltersButton();

    // React to Tableau data changes
    onSummaryDataChange(async (newData) => {
      console.log('[FlexTable] Data change detected, refreshing...');

      // Fetch fresh data - it's already in marks card order
      const dataWithSettings = await fetchData();
      renderTable(dataWithSettings);

      // Re-add column reorder menu after table re-renders
      setTimeout(() => {
        restoreColumnOrder();
        addColumnReorderMenu();
      }, 100);

      // Re-initialize Phase 2 features after data changes
      initializePhase2Features();
      // Re-apply customizations after table rebuild
      setTimeout(() => {
        reapplyColumnAlignments();
        reapplyColumnWidths();
      }, 100);
    });
   
       // Safety net: Re-mount features if DOM changes externally
       observeDOMChanges();
   
       // Listen for refresh requests from aggregation module
       window.addEventListener('flextable-refresh-needed', async () => {
         try {
           console.log("[FlexTable] Refreshing data from Tableau due to aggregation restore failure");
           const freshData = await fetchData();
           renderTable(freshData);
           initializePhase2Features();
         } catch (err) {
           console.error("[FlexTable] Failed to refresh data:", err);
         }
       });

       // Expose global shortcuts for debugging
       window.FlexTable = Object.assign(window.FlexTable || {}, {
         clearFilters: () => { clearDomFilters(); clearGlobalSearch(); },
         refreshFeatures: () => initializePhase2Features(),
         refreshTable: () => refreshTable(),
         measureGrouping: () => measureGrouping,
         commissionCalculator: () => commissionCalculator,
         showGroupingInterface: () => {
           if (measureGrouping) {
             const measures = getCurrentMeasures();
             measureGrouping.createGroupingInterface(measures);
           }
         },
         showCalculatorInterface: () => {
           if (commissionCalculator) {
             commissionCalculator.createCalculatorInterface();
           }
         }
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

   // Commission breakdown initialization
   function initCommissionBreakdown() {
     try {
       // Initialize measure grouping
       if (!measureGrouping) {
         measureGrouping = new MeasureGrouping();
       }

       // Initialize commission calculator
       if (!commissionCalculator) {
         commissionCalculator = new CommissionCalculator();
       }

       // Add measure grouping button to toolbar
       addMeasureGroupingButton();

       // Add commission calculator button to toolbar
       addCommissionCalculatorButton();

       // Listen for measure grouping changes
       window.addEventListener('measureGroupingChanged', (event) => {
         console.log('[FlexTable] Measure grouping changed:', event.detail);
         applyMeasureGrouping(event.detail);
       });

       // Listen for commission calculation changes
       window.addEventListener('commissionCalculationApplied', (event) => {
         console.log('[FlexTable] Commission calculation applied:', event.detail);
         applyCommissionCalculation(event.detail);
       });

       log("Commission breakdown features initialized successfully.");
     } catch (err) {
       log("Commission breakdown initialization failed:", err);
     }
   }

   // Add measure grouping button to toolbar
   function addMeasureGroupingButton() {
     const toolbar = document.querySelector('.ft-toolbar');
     if (!toolbar) return;

     // Remove existing button if it exists
     const existingBtn = document.getElementById('measure-grouping-btn');
     if (existingBtn) existingBtn.remove();

     const groupingBtn = document.createElement('button');
     groupingBtn.id = 'measure-grouping-btn';
     groupingBtn.className = 'ft-btn';
     groupingBtn.textContent = 'Group Measures';
     groupingBtn.style.marginRight = '8px';

     // Insert before reorder button or export button
     const reorderBtn = document.getElementById('reorder-columns-btn');
     const exportBtn = document.getElementById('export-btn');
     const insertBefore = reorderBtn || exportBtn;
     toolbar.insertBefore(groupingBtn, insertBefore);

     groupingBtn.addEventListener('click', () => {
       if (measureGrouping) {
         // Get current measures from table
         const measures = getCurrentMeasures();
         measureGrouping.createGroupingInterface(measures);
       }
     });
   }

   // Add commission calculator button to toolbar
   function addCommissionCalculatorButton() {
     const toolbar = document.querySelector('.ft-toolbar');
     if (!toolbar) return;

     // Remove existing button if it exists
     const existingBtn = document.getElementById('commission-calc-btn');
     if (existingBtn) existingBtn.remove();

     const calcBtn = document.createElement('button');
     calcBtn.id = 'commission-calc-btn';
     calcBtn.className = 'ft-btn';
     calcBtn.textContent = 'Calculate';
     calcBtn.style.marginRight = '8px';

     // Insert before group measures button
     const groupingBtn = document.getElementById('measure-grouping-btn');
     const reorderBtn = document.getElementById('reorder-columns-btn');
     const exportBtn = document.getElementById('export-btn');
     const insertBefore = groupingBtn || reorderBtn || exportBtn;
     toolbar.insertBefore(calcBtn, insertBefore);

     calcBtn.addEventListener('click', () => {
       if (commissionCalculator) {
         commissionCalculator.createCalculatorInterface();
       }
     });
   }

   // Get current measures from the table
   function getCurrentMeasures() {
     try {
       const table = document.querySelector('.flextable');
       if (!table) return [];

       const headers = [...table.querySelectorAll('thead tr:first-child th')];
       return headers.map(th => {
         const clone = th.cloneNode(true);
         const controls = clone.querySelector('.ft-column-controls');
         if (controls) controls.remove();
         return {
           name: clone.textContent.trim(),
           type: 'measure' // For now, treat all as measures - we can enhance this later
         };
       }).filter(col => col.name); // Remove empty names
     } catch (err) {
       console.error('[FlexTable] Failed to get current measures:', err);
       return [];
     }
   }

   // Apply measure grouping to the table
   function applyMeasureGrouping(groupingData) {
     try {
       console.log('[FlexTable] Applying measure grouping:', groupingData);

       const { groups, customGroups, showSubtotals, enableDrillDown, autoCollapse } = groupingData;
       const table = document.querySelector('.flextable');
       if (!table) return;

       // Get current column order and data
       const currentHeaders = [...table.querySelectorAll('thead tr:first-child th')];
       const currentColumns = currentHeaders.map(th => {
         const clone = th.cloneNode(true);
         const controls = clone.querySelector('.ft-column-controls');
         if (controls) controls.remove();
         return clone.textContent.trim();
       });

       // Store original column mapping before we modify the table
       const originalColumnIndexMap = {};
       currentColumns.forEach((name, index) => {
         originalColumnIndexMap[name] = index;
       });

       // Create new column order based on grouping
       const newColumnOrder = createGroupedColumnOrder(currentColumns, groups, customGroups);

       // Store grouped order globally for toggle functions
       window.currentGroupedOrder = newColumnOrder;

       // Restructure the table with group headers
       restructureTableWithGroups(table, newColumnOrder, showSubtotals, enableDrillDown, autoCollapse, originalColumnIndexMap);

       log(`Measure grouping applied: ${Object.keys(groups).length} default groups, ${customGroups.length} custom groups, subtotals: ${showSubtotals}, drill down: ${enableDrillDown}, auto collapse: ${autoCollapse}`);

     } catch (err) {
       log("Failed to apply measure grouping:", err);
     }
   }

   // Create new column order based on grouping
   function createGroupedColumnOrder(currentColumns, groups, customGroups) {
     const groupedOrder = [];
     const usedColumns = new Set();

     // Add columns by groups
     Object.entries(groups).forEach(([groupName, measures]) => {
       if (measures.length > 0) {
         groupedOrder.push({
           type: 'group',
           name: groupName,
           columns: measures.filter(col => currentColumns.includes(col))
         });
         measures.forEach(col => usedColumns.add(col));
       }
     });

     // Add custom groups
     customGroups.forEach(group => {
       if (group.measures.length > 0) {
         groupedOrder.push({
           type: 'group',
           name: group.name,
           columns: group.measures.filter(col => currentColumns.includes(col))
         });
         group.measures.forEach(col => usedColumns.add(col));
       }
     });

     // Add ungrouped columns
     const ungroupedColumns = currentColumns.filter(col => !usedColumns.has(col));
     if (ungroupedColumns.length > 0) {
       groupedOrder.push({
         type: 'group',
         name: 'Other',
         columns: ungroupedColumns
       });
     }

     return groupedOrder;
   }

   // Restructure table with group headers
   function restructureTableWithGroups(table, groupedOrder, showSubtotals, enableDrillDown, autoCollapse, originalColumnIndexMap) {
     try {
       const thead = table.querySelector('thead');
       const tbody = table.querySelector('tbody');
       if (!thead || !tbody) return;

       // Get current rows data
       const rows = [...tbody.querySelectorAll('tr')];

       // Clear existing structure
       thead.innerHTML = '';
       tbody.innerHTML = '';

       // Create group header row
       const groupHeaderRow = document.createElement('tr');
       groupHeaderRow.className = 'ft-group-header-row';

       // Create column header row
       const columnHeaderRow = document.createElement('tr');
       columnHeaderRow.className = 'ft-column-header-row';

       groupedOrder.forEach((group, groupIndex) => {
         // Add group header spanning multiple columns
         const groupHeader = document.createElement('th');
         groupHeader.colSpan = group.columns.length;
         groupHeader.className = 'ft-group-header';
         groupHeader.dataset.groupIndex = groupIndex;
         groupHeader.style.cssText = `
           background: #f8f9fa;
           border: 1px solid #dee2e6;
           padding: 8px 12px;
           font-weight: 600;
           text-align: center;
           color: #495057;
           position: relative;
         `;

         if (enableDrillDown) {
           // Add expand/collapse button
           const expandBtn = document.createElement('button');
           expandBtn.className = 'ft-expand-btn';
           expandBtn.innerHTML = autoCollapse ? '▶' : '▼';
           expandBtn.style.cssText = `
             background: none;
             border: none;
             cursor: pointer;
             margin-right: 8px;
             font-size: 12px;
             color: #495057;
           `;

           const groupLabel = document.createElement('span');
           groupLabel.textContent = group.name;

           groupHeader.appendChild(expandBtn);
           groupHeader.appendChild(groupLabel);

           // Add click event for expand/collapse
           expandBtn.addEventListener('click', (e) => {
             e.stopPropagation();
             toggleGroupCollapse(groupIndex, expandBtn);
           });
         } else {
           groupHeader.textContent = group.name;
         }

         groupHeaderRow.appendChild(groupHeader);

         // Add individual column headers
         group.columns.forEach(columnName => {
           const colHeader = document.createElement('th');
           colHeader.textContent = columnName;
           colHeader.className = 'ft-column-header';
           colHeader.dataset.groupIndex = groupIndex;
           colHeader.style.cssText = `
             background: white;
             border: 1px solid #dee2e6;
             padding: 8px 12px;
             font-weight: 500;
             ${autoCollapse && enableDrillDown ? 'display: none;' : ''}
           `;
           columnHeaderRow.appendChild(colHeader);
         });
       });

       thead.appendChild(groupHeaderRow);
       thead.appendChild(columnHeaderRow);

       // Reorder data rows based on new column order
       const flatColumnOrder = [];
       groupedOrder.forEach(group => {
         flatColumnOrder.push(...group.columns);
       });

       // Recreate rows with new column order
       rows.forEach(row => {
         const newRow = document.createElement('tr');
         let columnIndex = 0;

         groupedOrder.forEach((group, groupIndex) => {
           group.columns.forEach(columnName => {
             const originalIndex = originalColumnIndexMap[columnName];
             if (originalIndex !== undefined && row.children[originalIndex]) {
               const newCell = row.children[originalIndex].cloneNode(true);
               newCell.dataset.groupIndex = groupIndex;

               // Hide cells if group is collapsed initially
               if (autoCollapse && enableDrillDown) {
                 newCell.style.display = 'none';
               }

               newRow.appendChild(newCell);
             }
             columnIndex++;
           });
         });

         tbody.appendChild(newRow);
       });

       // Add subtotal rows if enabled
       if (showSubtotals) {
         addSubtotalRows(tbody, groupedOrder, flatColumnOrder);
       }

       console.log('[FlexTable] Table restructured with grouped headers');

     } catch (err) {
       console.error('[FlexTable] Failed to restructure table:', err);
     }
   }

   // Add subtotal rows for each group
   function addSubtotalRows(tbody, groupedOrder, flatColumnOrder) {
     try {
       const dataRows = [...tbody.querySelectorAll('tr')];
       if (dataRows.length === 0) return;

       // Calculate subtotals for each group
       groupedOrder.forEach((group, groupIndex) => {
         if (group.columns.length === 0) return;

         const subtotalRow = document.createElement('tr');
         subtotalRow.className = 'ft-subtotal-row';
         subtotalRow.style.cssText = `
           background: #f8f9fa;
           border-top: 2px solid #dee2e6;
           font-weight: 600;
         `;

         let columnIndex = 0;

         // Add cells for previous groups (empty)
         for (let i = 0; i < groupIndex; i++) {
           groupedOrder[i].columns.forEach(() => {
             const emptyCell = document.createElement('td');
             emptyCell.style.cssText = 'padding: 8px 12px; border: 1px solid #dee2e6;';
             subtotalRow.appendChild(emptyCell);
             columnIndex++;
           });
         }

         // Add subtotal label and calculations for current group
         group.columns.forEach((columnName, colIndex) => {
           const cell = document.createElement('td');
           cell.style.cssText = 'padding: 8px 12px; border: 1px solid #dee2e6;';

           if (colIndex === 0) {
             // First column gets the subtotal label
             cell.textContent = `${group.name} Subtotal`;
             cell.style.fontWeight = '600';
           } else {
             // Try to calculate sum for numeric columns
             const columnSum = calculateColumnSum(dataRows, columnIndex);
             if (columnSum !== null) {
               cell.textContent = formatNumber(columnSum);
             } else {
               cell.textContent = '-';
             }
           }

           subtotalRow.appendChild(cell);
           columnIndex++;
         });

         // Add empty cells for remaining groups
         for (let i = groupIndex + 1; i < groupedOrder.length; i++) {
           groupedOrder[i].columns.forEach(() => {
             const emptyCell = document.createElement('td');
             emptyCell.style.cssText = 'padding: 8px 12px; border: 1px solid #dee2e6;';
             subtotalRow.appendChild(emptyCell);
           });
         }

         tbody.appendChild(subtotalRow);
       });

       console.log('[FlexTable] Subtotal rows added');

     } catch (err) {
       console.error('[FlexTable] Failed to add subtotal rows:', err);
     }
   }

   // Calculate sum for a numeric column
   function calculateColumnSum(rows, columnIndex) {
     try {
       let sum = 0;
       let hasNumericValues = false;

       rows.forEach(row => {
         const cell = row.children[columnIndex];
         if (cell) {
           const text = cell.textContent.trim();
           const num = parseFloat(text.replace(/[,$%]/g, ''));
           if (!isNaN(num)) {
             sum += num;
             hasNumericValues = true;
           }
         }
       });

       return hasNumericValues ? sum : null;
     } catch (err) {
       return null;
     }
   }

   // Format number for display
   function formatNumber(num) {
     try {
       if (Math.abs(num) >= 1000000) {
         return (num / 1000000).toFixed(1) + 'M';
       } else if (Math.abs(num) >= 1000) {
         return (num / 1000).toFixed(1) + 'K';
       } else {
         return num.toLocaleString();
       }
     } catch (err) {
       return num.toString();
     }
   }

   // Toggle group collapse/expand (Excel-like functionality)
   function toggleGroupCollapse(groupIndex, expandBtn) {
     try {
       const table = document.querySelector('.flextable');
       if (!table) return;

       const isCollapsed = expandBtn.innerHTML === '▶';

       // Toggle column headers
       const columnHeaders = table.querySelectorAll(`th[data-group-index="${groupIndex}"]`);
       columnHeaders.forEach(header => {
         if (header.className === 'ft-column-header') {
           header.style.display = isCollapsed ? '' : 'none';
         }
       });

       // Toggle data cells
       const dataCells = table.querySelectorAll(`td[data-group-index="${groupIndex}"]`);
       dataCells.forEach(cell => {
         cell.style.display = isCollapsed ? '' : 'none';
       });

       // Update button icon
       expandBtn.innerHTML = isCollapsed ? '▼' : '▶';

       // Update group header colspan
       const groupHeader = expandBtn.closest('th');
       if (groupHeader) {
         const group = getCurrentGroupByIndex(groupIndex);
         if (group) {
           groupHeader.colSpan = isCollapsed ? group.columns.length : 1;
         }
       }

       console.log(`[FlexTable] Group ${groupIndex} ${isCollapsed ? 'expanded' : 'collapsed'}`);

     } catch (err) {
       console.error('[FlexTable] Failed to toggle group collapse:', err);
     }
   }

   // Get current group by index (helper function)
   function getCurrentGroupByIndex(groupIndex) {
     try {
       if (window.currentGroupedOrder && window.currentGroupedOrder[groupIndex]) {
         return window.currentGroupedOrder[groupIndex];
       }
       return null;
     } catch (err) {
       return null;
     }
   }

   // Apply commission calculation to the table
   function applyCommissionCalculation(calculationData) {
     try {
       console.log('[FlexTable] Applying commission calculation:', calculationData);

       const { calcType, resultColumn, inputs, addToTable } = calculationData;

       if (!addToTable) {
         console.log('[FlexTable] Calculation completed but not added to table');
         return;
       }

       const table = document.querySelector('.flextable');
       if (!table) return;

       // Get calculation function
       const calcFunction = commissionCalculator.calculations[calcType];
       if (!calcFunction) {
         console.error('[FlexTable] Unknown calculation type:', calcType);
         return;
       }

       // Add new column to table
       addCalculatedColumn(table, resultColumn, calcType, inputs, calcFunction);

       log(`Commission calculation applied: ${calcType} -> ${resultColumn}`);

     } catch (err) {
       log("Failed to apply commission calculation:", err);
     }
   }

   // Add calculated column to the table
   function addCalculatedColumn(table, columnName, calcType, inputColumns, calcFunction) {
     try {
       const thead = table.querySelector('thead');
       const tbody = table.querySelector('tbody');
       if (!thead || !tbody) return;

       // Add header for new column
       const headerRows = thead.querySelectorAll('tr');
       headerRows.forEach((row, index) => {
         const newHeader = document.createElement('th');

         if (index === 0 && headerRows.length > 1) {
           // This is a group header row - add to "Other" group or create new group
           newHeader.textContent = 'Calculated';
           newHeader.colSpan = 1;
           newHeader.className = 'ft-group-header';
           newHeader.style.cssText = `
             background: #e8f5e8;
             border: 1px solid #dee2e6;
             padding: 8px 12px;
             font-weight: 600;
             text-align: center;
             color: #2e7d32;
           `;
         } else {
           // This is the column header row
           newHeader.textContent = columnName;
           newHeader.className = 'ft-column-header';
           newHeader.style.cssText = `
             background: white;
             border: 1px solid #dee2e6;
             padding: 8px 12px;
             font-weight: 500;
           `;
         }

         row.appendChild(newHeader);
       });

       // Add data cells for new column
       const dataRows = tbody.querySelectorAll('tr:not(.ft-subtotal-row)');
       const columnMapping = getColumnMapping(table);

       dataRows.forEach(row => {
         const newCell = document.createElement('td');
         newCell.style.cssText = 'padding: 8px 12px; border: 1px solid #dee2e6;';

         // Extract input values for calculation
         const inputValues = inputColumns.map(columnName => {
           const columnIndex = columnMapping[columnName];
           if (columnIndex !== undefined && row.children[columnIndex]) {
             const text = row.children[columnIndex].textContent.trim();
             const num = parseFloat(text.replace(/[,$%]/g, ''));
             return isNaN(num) ? 0 : num;
           }
           return 0;
         });

         // Perform calculation
         let result = 0;
         try {
           result = calcFunction.apply(commissionCalculator, inputValues);
         } catch (err) {
           console.error('[FlexTable] Calculation error:', err);
         }

         // Format result
         newCell.textContent = formatCalculationResult(result, calcType);
         row.appendChild(newCell);
       });

       console.log('[FlexTable] Calculated column added successfully');

     } catch (err) {
       console.error('[FlexTable] Failed to add calculated column:', err);
     }
   }

   // Get column name to index mapping
   function getColumnMapping(table) {
     const mapping = {};
     const headerRow = table.querySelector('thead tr:last-child');
     if (headerRow) {
       [...headerRow.children].forEach((th, index) => {
         const columnName = th.textContent.trim();
         if (columnName) {
           mapping[columnName] = index;
         }
       });
     }
     return mapping;
   }

   // Format calculation result based on type
   function formatCalculationResult(value, calcType) {
     if (calcType.includes('%')) {
       return value.toFixed(2) + '%';
     } else if (calcType.includes('Amount') || calcType.includes('Revenue') || calcType.includes('Margin') || calcType.includes('Compensation')) {
       return '$' + value.toLocaleString();
     } else {
       return value.toLocaleString();
     }
   }

   // Phase 2/3 feature initialization
   function initializePhase2Features() {
     try {
       // Phase 3: Global search (must be first to add to toolbar)
       initGlobalSearch();
       
       // Skip row numbers - removed per user request (causes alignment issues)
       // initRowNumbers();
       
       // Phase 2: Column filtering 
       mountDomFilters();
       
       // Phase 2: Column alignment controls
       initColumnAlignment();
       
       // Phase 2: Column resize handles
       initColumnResize();
       enableDoubleClickAutoSize();

       // Add column reorder menu
       addColumnReorderMenu();

       // Commission breakdown features
       initCommissionBreakdown();

       // Skip column visibility control - removed per user request
       // initColumnsMenu();

       // Skip data aggregation for now - keep it simple and stable
       // initAggregateByVisibleDims();

       log("Phase 2/3 features initialized successfully (global search + discrete filters + column filters + alignment + resize + commission breakdown).");
     } catch (err) {
       log("Phase 2/3 feature initialization failed:", err);
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
         clearGlobalSearch();
         log("All filters and search cleared successfully.");
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
