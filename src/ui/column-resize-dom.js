// src/ui/column-resize-dom.js
// Draggable column width adjustment
// Adds resize handles to column headers for interactive width control

const columnWidths = new Map(); // colIndex -> width in pixels
let isResizing = false;
let currentColIndex = -1;
let startX = 0;
let startWidth = 0;

export function initColumnResize() {
  try {
    const table = document.querySelector(".flextable");
    if (!(table instanceof HTMLTableElement)) return false;

    // Ensure table layout is suitable for column resizing
    table.style.tableLayout = "fixed";
    table.style.width = "100%";

    const thead = table.querySelector("thead");
    if (!thead || thead.rows.length === 0) return false;

    const headerRow = thead.rows[0];
    if (!headerRow) return false;

    // Add resize handles to each column header
    Array.from(headerRow.cells).forEach((th, colIndex) => {
      addResizeHandle(th, colIndex);
      // Set initial width if not already set
      if (!columnWidths.has(colIndex)) {
        const currentWidth = th.offsetWidth;
        columnWidths.set(colIndex, currentWidth);
        th.style.width = `${currentWidth}px`;
      }
    });

    // Add global mouse event listeners
    setupGlobalListeners();
    
    console.log("[FlexTable] Column resize initialized");
    return true;

  } catch (error) {
    console.error("[FlexTable] Failed to initialize column resize:", error);
    return false;
  }
}

function addResizeHandle(headerCell, colIndex) {
  // Skip if already has resize handle
  if (headerCell.querySelector(".ft-resize-handle")) return;

  // Create resize handle
  const handle = document.createElement("div");
  handle.className = "ft-resize-handle";
  handle.dataset.colIndex = colIndex;
  
  Object.assign(handle.style, {
    position: "absolute",
    right: "0",
    top: "0",
    width: "8px",
    height: "100%",
    cursor: "col-resize",
    background: "transparent",
    borderRight: "2px solid transparent",
    zIndex: "10"
  });

  // Hover effects
  handle.addEventListener("mouseenter", () => {
    handle.style.borderRight = "2px solid #007acc";
  });

  handle.addEventListener("mouseleave", () => {
    if (!isResizing) {
      handle.style.borderRight = "2px solid transparent";
    }
  });

  // Mouse down - start resizing
  handle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    startResize(colIndex, e.clientX);
  });

  // Make header cell relative positioned for absolute handle
  headerCell.style.position = "relative";
  headerCell.appendChild(handle);
}

function startResize(colIndex, clientX) {
  isResizing = true;
  currentColIndex = colIndex;
  startX = clientX;
  startWidth = columnWidths.get(colIndex) || 100;
  
  // Add visual feedback
  document.body.style.cursor = "col-resize";
  const handle = document.querySelector(`.ft-resize-handle[data-col-index="${colIndex}"]`);
  if (handle) {
    handle.style.borderRight = "2px solid #007acc";
  }
  
  console.log(`[FlexTable] Started resizing column ${colIndex}`);
}

function doResize(clientX) {
  if (!isResizing) return;
  
  const deltaX = clientX - startX;
  const newWidth = Math.max(50, startWidth + deltaX); // Minimum width of 50px
  
  setColumnWidth(currentColIndex, newWidth);
}

function stopResize() {
  if (!isResizing) return;
  
  isResizing = false;
  document.body.style.cursor = "";
  
  // Remove visual feedback
  const handle = document.querySelector(`.ft-resize-handle[data-col-index="${currentColIndex}"]`);
  if (handle) {
    handle.style.borderRight = "2px solid transparent";
  }
  
  console.log(`[FlexTable] Finished resizing column ${currentColIndex}`);
  currentColIndex = -1;
}

function setColumnWidth(colIndex, width) {
  const table = document.querySelector(".flextable");
  if (!table) return;

  // Store the width
  columnWidths.set(colIndex, width);

  // Apply to header cell
  const headerCell = table.querySelector(`thead tr:first-child th:nth-child(${colIndex + 1})`);
  if (headerCell) {
    headerCell.style.width = `${width}px`;
    headerCell.style.minWidth = `${width}px`;
    headerCell.style.maxWidth = `${width}px`;
  }

  // Apply to filter cell if it exists
  const filterCell = table.querySelector(`thead tr:nth-child(2) th:nth-child(${colIndex + 1})`);
  if (filterCell) {
    filterCell.style.width = `${width}px`;
    filterCell.style.minWidth = `${width}px`;
    filterCell.style.maxWidth = `${width}px`;
  }

  // Apply to all body cells in this column
  const bodyCells = table.querySelectorAll(`tbody td:nth-child(${colIndex + 1})`);
  bodyCells.forEach(cell => {
    cell.style.width = `${width}px`;
    cell.style.minWidth = `${width}px`;
    cell.style.maxWidth = `${width}px`;
  });
}

function setupGlobalListeners() {
  // Remove existing listeners to prevent duplicates
  document.removeEventListener("mousemove", handleGlobalMouseMove);
  document.removeEventListener("mouseup", handleGlobalMouseUp);
  
  // Add global mouse listeners
  document.addEventListener("mousemove", handleGlobalMouseMove);
  document.addEventListener("mouseup", handleGlobalMouseUp);
}

function handleGlobalMouseMove(e) {
  if (isResizing) {
    e.preventDefault();
    doResize(e.clientX);
  }
}

function handleGlobalMouseUp(e) {
  if (isResizing) {
    e.preventDefault();
    stopResize();
  }
}

// Re-apply column widths when table is re-rendered
export function reapplyColumnWidths() {
  const table = document.querySelector(".flextable");
  if (!table) return;

  // Ensure table layout is fixed
  table.style.tableLayout = "fixed";
  table.style.width = "100%";

  columnWidths.forEach((width, colIndex) => {
    setColumnWidth(colIndex, width);
  });

  // Re-add resize handles if missing
  const thead = table.querySelector("thead");
  if (thead && thead.rows.length > 0) {
    const headerRow = thead.rows[0];
    Array.from(headerRow.cells).forEach((th, colIndex) => {
      if (!th.querySelector(".ft-resize-handle")) {
        addResizeHandle(th, colIndex);
      }
    });
  }

  console.log("[FlexTable] Column widths reapplied");
}

// Auto-size column to fit content
export function autoSizeColumn(colIndex) {
  const table = document.querySelector(".flextable");
  if (!table) return;

  // Temporarily remove width constraints to measure content
  const headerCell = table.querySelector(`thead tr:first-child th:nth-child(${colIndex + 1})`);
  const bodyCells = table.querySelectorAll(`tbody td:nth-child(${colIndex + 1})`);
  
  if (!headerCell) return;

  // Remove width constraints temporarily
  headerCell.style.width = "auto";
  headerCell.style.minWidth = "auto";
  headerCell.style.maxWidth = "none";
  
  bodyCells.forEach(cell => {
    cell.style.width = "auto";
    cell.style.minWidth = "auto";
    cell.style.maxWidth = "none";
  });

  // Measure the natural width
  setTimeout(() => {
    let maxWidth = headerCell.offsetWidth;
    
    bodyCells.forEach(cell => {
      maxWidth = Math.max(maxWidth, cell.offsetWidth);
    });

    // Add some padding
    const finalWidth = Math.max(60, maxWidth + 20);
    
    // Apply the calculated width
    setColumnWidth(colIndex, finalWidth);
    
    console.log(`[FlexTable] Auto-sized column ${colIndex} to ${finalWidth}px`);
  }, 10);
}

// Double-click to auto-size
export function enableDoubleClickAutoSize() {
  const table = document.querySelector(".flextable");
  if (!table) return;

  const thead = table.querySelector("thead");
  if (!thead || thead.rows.length === 0) return;

  const headerRow = thead.rows[0];
  Array.from(headerRow.cells).forEach((th, colIndex) => {
    // Add double-click listener to resize handle
    const handle = th.querySelector(".ft-resize-handle");
    if (handle) {
      handle.addEventListener("dblclick", (e) => {
        e.preventDefault();
        e.stopPropagation();
        autoSizeColumn(colIndex);
      });
      
      // Update title to show double-click functionality
      handle.title = "Drag to resize, double-click to auto-size";
    }
  });
}

// Reset all column widths to default
export function resetColumnWidths() {
  const table = document.querySelector(".flextable");
  if (!table) return;

  columnWidths.clear();
  
  // Remove width constraints from all cells
  const allCells = table.querySelectorAll("th, td");
  allCells.forEach(cell => {
    cell.style.width = "";
    cell.style.minWidth = "";
    cell.style.maxWidth = "";
  });

  // Reset table layout
  table.style.tableLayout = "auto";
  
  setTimeout(() => {
    // Re-initialize with natural widths
    table.style.tableLayout = "fixed";
    const headerRow = table.querySelector("thead tr:first-child");
    if (headerRow) {
      Array.from(headerRow.cells).forEach((th, colIndex) => {
        const naturalWidth = th.offsetWidth;
        columnWidths.set(colIndex, naturalWidth);
        setColumnWidth(colIndex, naturalWidth);
      });
    }
  }, 10);

  console.log("[FlexTable] All column widths reset");
}