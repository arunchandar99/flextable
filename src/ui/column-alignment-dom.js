// src/ui/column-alignment-dom.js
// Per-column text alignment controls (left, center, right)
// Adds small alignment buttons to column headers

const alignmentState = new Map(); // colIndex -> 'left'|'center'|'right'

export function initColumnAlignment() {
  try {
    const table = document.querySelector(".flextable");
    if (!(table instanceof HTMLTableElement)) return false;

    const thead = table.querySelector("thead");
    if (!thead || thead.rows.length === 0) return false;

    const headerRow = thead.rows[0];
    if (!headerRow) return false;

    // Add alignment controls to each column header
    Array.from(headerRow.cells).forEach((th, colIndex) => {
      // Skip if already has alignment controls
      if (th.querySelector(".ft-align-controls")) return;

      addAlignmentControls(th, colIndex);
    });

    // Apply initial alignment (smart defaults)
    applySmartDefaults();
    
    console.log("[FlexTable] Column alignment initialized");
    return true;

  } catch (error) {
    console.error("[FlexTable] Failed to initialize column alignment:", error);
    return false;
  }
}

function addAlignmentControls(headerCell, colIndex) {
  // Create alignment control container
  const controlsDiv = document.createElement("div");
  controlsDiv.className = "ft-align-controls";
  Object.assign(controlsDiv.style, {
    display: "inline-flex",
    gap: "2px",
    marginLeft: "8px",
    verticalAlign: "middle"
  });

  // Create alignment buttons
  const alignments = [
    { type: "left", symbol: "⬅️", title: "Align Left" },
    { type: "center", symbol: "⬆️", title: "Align Center" },
    { type: "right", symbol: "➡️", title: "Align Right" }
  ];

  alignments.forEach(({ type, symbol, title }) => {
    const button = document.createElement("button");
    button.className = `ft-align-btn ft-align-${type}`;
    button.textContent = symbol;
    button.title = title;
    button.type = "button";
    
    Object.assign(button.style, {
      background: "transparent",
      border: "none",
      cursor: "pointer",
      fontSize: "10px",
      padding: "2px",
      borderRadius: "3px",
      opacity: "0.6"
    });

    // Hover effects
    button.addEventListener("mouseenter", () => button.style.opacity = "1");
    button.addEventListener("mouseleave", () => {
      button.style.opacity = isActive(colIndex, type) ? "1" : "0.6";
    });

    // Click handler
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      setColumnAlignment(colIndex, type);
    });

    controlsDiv.appendChild(button);
  });

  // Add controls to header cell
  headerCell.appendChild(controlsDiv);
}

function setColumnAlignment(colIndex, alignment) {
  // Store alignment preference
  alignmentState.set(colIndex, alignment);
  
  // Apply to all cells in this column
  applyColumnAlignment(colIndex, alignment);
  
  // Update button states
  updateButtonStates(colIndex);
  
  console.log(`[FlexTable] Column ${colIndex} aligned to ${alignment}`);
}

function applyColumnAlignment(colIndex, alignment) {
  const table = document.querySelector(".flextable");
  if (!table) return;

  // Apply to header cell
  const headerCell = table.querySelector(`thead tr:first-child th:nth-child(${colIndex + 1})`);
  if (headerCell) {
    headerCell.style.textAlign = alignment;
  }

  // Apply to all body cells in this column
  const bodyCells = table.querySelectorAll(`tbody td:nth-child(${colIndex + 1})`);
  bodyCells.forEach(cell => {
    cell.style.textAlign = alignment;
  });

  // Apply to filter cell if it exists
  const filterCell = table.querySelector(`thead tr:nth-child(2) th:nth-child(${colIndex + 1})`);
  if (filterCell) {
    // Don't change filter input alignment, just the cell
    filterCell.style.textAlign = alignment;
  }
}

function updateButtonStates(colIndex) {
  const table = document.querySelector(".flextable");
  if (!table) return;

  const headerCell = table.querySelector(`thead tr:first-child th:nth-child(${colIndex + 1})`);
  if (!headerCell) return;

  const currentAlignment = alignmentState.get(colIndex) || "left";
  
  // Update button opacity
  const buttons = headerCell.querySelectorAll(".ft-align-btn");
  buttons.forEach(btn => {
    const isCurrentAlignment = btn.classList.contains(`ft-align-${currentAlignment}`);
    btn.style.opacity = isCurrentAlignment ? "1" : "0.6";
    btn.style.backgroundColor = isCurrentAlignment ? "rgba(0,0,0,0.1)" : "transparent";
  });
}

function isActive(colIndex, alignment) {
  return alignmentState.get(colIndex) === alignment;
}

function applySmartDefaults() {
  const table = document.querySelector(".flextable");
  if (!table) return;

  const tbody = table.querySelector("tbody");
  if (!tbody || tbody.rows.length === 0) return;

  // Analyze first few rows to determine column types
  const sampleRows = Array.from(tbody.rows).slice(0, 5);
  const headerCells = table.querySelectorAll("thead tr:first-child th");

  headerCells.forEach((headerCell, colIndex) => {
    // Skip if alignment already set
    if (alignmentState.has(colIndex)) return;

    // Analyze column content
    const columnType = detectColumnType(sampleRows, colIndex);
    
    let defaultAlignment;
    switch (columnType) {
      case "number":
        defaultAlignment = "right";
        break;
      case "date":
        defaultAlignment = "center";
        break;
      default:
        defaultAlignment = "left";
    }

    setColumnAlignment(colIndex, defaultAlignment);
  });
}

function detectColumnType(sampleRows, colIndex) {
  let numberCount = 0;
  let dateCount = 0;
  let totalCount = 0;

  sampleRows.forEach(row => {
    const cell = row.cells[colIndex];
    if (!cell) return;

    const text = (cell.textContent || "").trim();
    if (!text) return;

    totalCount++;

    // Check if it's a number
    if (/^-?[\d,]+\.?\d*$/.test(text.replace(/[$%,]/g, ""))) {
      numberCount++;
    }
    // Check if it's a date
    else if (isDateString(text)) {
      dateCount++;
    }
  });

  if (totalCount === 0) return "text";
  
  const numberRatio = numberCount / totalCount;
  const dateRatio = dateCount / totalCount;

  if (numberRatio >= 0.7) return "number";
  if (dateRatio >= 0.7) return "date";
  return "text";
}

function isDateString(str) {
  // Simple date detection
  const datePatterns = [
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,  // MM/DD/YYYY
    /^\d{2,4}-\d{1,2}-\d{1,2}$/,   // YYYY-MM-DD
    /^\d{1,2}-\w{3}-\d{2,4}$/,     // DD-MMM-YYYY
  ];
  
  return datePatterns.some(pattern => pattern.test(str)) || !isNaN(Date.parse(str));
}

// Re-apply alignments when table is re-rendered
export function reapplyColumnAlignments() {
  alignmentState.forEach((alignment, colIndex) => {
    applyColumnAlignment(colIndex, alignment);
    updateButtonStates(colIndex);
  });
}

// Clear all alignment preferences
export function clearColumnAlignments() {
  alignmentState.clear();
  
  const table = document.querySelector(".flextable");
  if (!table) return;

  // Reset all cells to default (left)
  const allCells = table.querySelectorAll("th, td");
  allCells.forEach(cell => {
    cell.style.textAlign = "";
  });

  console.log("[FlexTable] All column alignments cleared");
}