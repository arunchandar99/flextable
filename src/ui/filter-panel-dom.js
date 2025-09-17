// src/ui/filter-panel-dom.js
// Per-column filters rendered inside a second header row.
// - Idempotent: rebuilding replaces the old filter row
// - Skips the row-number (“#”) column
// - Mirrors header cell visibility for perfect alignment
// - Uses CSS var --ft-filter-top (falls back to headerRow.offsetHeight)
// Exports: mountDomFilters(), clearDomFilters()

const filterState = new Map(); // colIndex -> { type: 'text'|'number'|'date'|'discrete', op?, v1?, v2?, selected? }
const uniqueValues = new Map(); // colIndex -> Set of unique values for discrete columns

export function mountDomFilters() {
  try {
    const table = document.querySelector(".flextable");
    if (!(table instanceof HTMLTableElement)) {
      console.warn("[FlexTable] No table found for filters");
      return false;
    }

    const thead = table.querySelector("thead");
    if (!(thead instanceof HTMLTableSectionElement)) {
      console.warn("[FlexTable] No table header found for filters");
      return false;
    }

    const headerRow = thead.rows[0];
    if (!headerRow) {
      console.warn("[FlexTable] No header row found for filters");
      return false;
    }

    // Remove existing filter row to rebuild fresh
    if (thead.rows.length > 1) {
      thead.deleteRow(1);
    }

    // Set sticky positioning offset (prevents visual jitter)
    updateStickyOffset(table, headerRow);

    const rowNumIdx = findRowNumIndex(headerRow);
    const columnTypes = detectColumnTypesFromDom(table, rowNumIdx);
    const colCount = headerRow.cells.length;

    // Clean up stale filter state
    cleanupFilterState(colCount);

    // Build filter row
    const filterRow = createFilterRow(headerRow, columnTypes, rowNumIdx);
    
    thead.appendChild(filterRow);
    applyFilters(table);
    
    console.log("[FlexTable] Filters mounted successfully");
    return true;
    
  } catch (error) {
    console.error("[FlexTable] Failed to mount filters:", error);
    return false;
  }
}

function updateStickyOffset(table, headerRow) {
  // Only update if not already set, to prevent jitter
  if (!table.style.getPropertyValue("--ft-filter-top")) {
    // Use requestAnimationFrame to ensure DOM is settled
    requestAnimationFrame(() => {
      const height = headerRow.offsetHeight || 35;
      table.style.setProperty("--ft-filter-top", `${height}px`);
      console.log(`[FlexTable] Set filter offset to ${height}px`);
    });
  }
}

function cleanupFilterState(colCount) {
  // Remove filter state for columns that no longer exist
  Array.from(filterState.keys()).forEach(k => {
    if (k >= colCount) filterState.delete(k);
  });
}

function createFilterRow(headerRow, columnTypes, rowNumIdx) {
  const filterRow = document.createElement("tr");
  filterRow.className = "ft-filter-row";
  
  for (let i = 0; i < headerRow.cells.length; i++) {
    // Create filter cell - will handle row number detection internally
    const th = createFilterCell(headerRow.cells[i], i, columnTypes[i], rowNumIdx);
    filterRow.appendChild(th);
  }
  
  return filterRow;
}

function createFilterCell(headerCell, headerIndex, columnType, rowNumIdx) {
  const th = document.createElement("th");
  th.className = "ft-filter-cell";
  
  // Mirror visibility of header cell
  th.style.display = getComputedStyle(headerCell).display;
  
  // Let CSS handle the sticky positioning to prevent conflicts
  // Only set essential inline styles
  th.style.padding = "4px";

  // Add filter control to all columns (no row numbers to worry about)
  if (columnType !== "skip") {
    const control = createFilterControl(headerIndex, columnType || "text");
    if (control) th.appendChild(control);
  }

  return th;
}

function createFilterControl(colIndex, type) {
  try {
    switch (type) {
      case "number": return renderNumberFilter(colIndex);
      case "date": return renderDateFilter(colIndex);
      case "discrete": return renderDiscreteFilter(colIndex);
      default: return renderTextFilter(colIndex);
    }
  } catch (error) {
    console.warn(`[FlexTable] Failed to create ${type} filter for column ${colIndex}:`, error);
    return renderTextFilter(colIndex); // Fallback to text filter
  }
}

export function clearDomFilters() {
  filterState.clear();
  uniqueValues.clear();

  // Clean up any dropdown panels appended to body
  document.querySelectorAll(".ft-discrete-panel").forEach(panel => {
    if (panel.parentNode) {
      panel.parentNode.removeChild(panel);
    }
  });

  const table = document.querySelector(".flextable");
  if (!(table instanceof HTMLTableElement)) return;

  const thead = table.querySelector("thead");
  if (!thead || thead.rows.length < 2) { applyFilters(table); return; }

  const filterRow = thead.rows[1];

  // Clean up discrete filter wrappers with cleanup functions
  filterRow.querySelectorAll("[data-cleanup]").forEach(wrapper => {
    if (wrapper.cleanup) {
      wrapper.cleanup();
    }
  });

  filterRow.querySelectorAll("input").forEach((el) => {
    const ph = (el.getAttribute("placeholder") || "").toLowerCase();
    el.value = "";
    if (ph === "and") el.style.display = "none"; // second box of "between"
  });
  filterRow.querySelectorAll("select").forEach((s) => {
    s.selectedIndex = 0;
    const th = s.closest("th");
    const inputs = th ? th.querySelectorAll("input") : [];
    if (inputs.length > 1) inputs[1].style.display = "none";
  });

  applyFilters(table);
}

/* -------------------------- Type detection -------------------------- */

function detectColumnTypesFromDom(table, rowNumIdx) {
  const tbody = table.tBodies[0];
  if (!tbody) return [];

  const rows = Array.from(tbody.rows).filter(tr => !isHidden(tr)); // Use ALL rows, not just first 200
  const colCount = rows[0] ? rows[0].cells.length : 0;

  const stats = Array.from({ length: colCount }, () => ({ n: 0, nums: 0, dates: 0, unique: new Set() }));
  for (const tr of rows) {
    for (let c = 0; c < colCount; c++) {
      if (c === rowNumIdx) continue; // ignore "#"
      const td = tr.cells[c]; if (!td || isHidden(td)) continue;
      const raw = (td.textContent || "").trim();
      if (!raw) continue;
      stats[c].n++;
      stats[c].unique.add(raw);
      if (toNumber(raw) !== null) stats[c].nums++;
      else if (toDate(raw)) stats[c].dates++;
    }
  }

  return stats.map((s, idx) => {
    if (idx === rowNumIdx) return "skip";
    if (!s.n) return "text";
    if (s.nums / s.n >= 0.6) return "number";
    if (s.dates / s.n >= 0.6) return "date";
    
    // If column is not numeric or date, use dropdown for ALL discrete values (no limits)
    const uniqueCount = s.unique.size;
    const totalCount = s.n;
    
    // Use dropdown for any non-numeric, non-date column with unique values
    if (uniqueCount > 0) {
      // Store unique values for this discrete column
      uniqueValues.set(idx, s.unique);
      console.log(`[FlexTable] Column ${idx}: ${uniqueCount} unique values out of ${totalCount} → discrete filter (no limits)`);
      return "discrete";
    }
    
    console.log(`[FlexTable] Column ${idx}: No unique values found → text filter`);
    return "text";
  });
}

function findRowNumIndex(firstHeaderRow) {
  // Row numbers disabled for now - always return -1
  return -1;
}

/* ------------------------------ Controls ------------------------------ */

function renderTextFilter(colIndex) {
  const wrap = rowFlex();
  const input = inputEl("text", "filter…");
  const st = filterState.get(colIndex);
  if (st && st.type === "text") input.value = st.v1 || "";

  input.addEventListener("input", () => {
    const v = input.value.trim();
    if (v) filterState.set(colIndex, { type: "text", v1: v.toLowerCase() });
    else filterState.delete(colIndex);
    applyFilters(document.querySelector(".flextable"));
  });

  wrap.appendChild(input);
  return wrap;
}

function renderNumberFilter(colIndex) {
  const wrap = rowFlex();

  const op = selectEl(["=", "!=", ">", ">=", "<", "<=", "between"]);
  const v1 = inputEl("number", "value");
  const v2 = inputEl("number", "and");
  v2.style.display = "none";

  const st = filterState.get(colIndex);
  if (st && st.type === "number") {
    op.value = st.op || "=";
    v1.value = st.v1 || "";
    v2.value = st.v2 || "";
    v2.style.display = op.value === "between" ? "" : "none";
  }

  const trigger = () => {
    const o = op.value;
    const a = v1.value.trim();
    const b = v2.value.trim();
    const valid = o === "between" ? (a !== "" && b !== "") : a !== "";
    if (valid) filterState.set(colIndex, { type: "number", op: o, v1: a, v2: b });
    else filterState.delete(colIndex);
    applyFilters(document.querySelector(".flextable"));
  };

  op.addEventListener("change", () => { v2.style.display = op.value === "between" ? "" : "none"; trigger(); });
  v1.addEventListener("input", trigger);
  v2.addEventListener("input", trigger);

  wrap.append(op, v1, v2);
  return wrap;
}

function renderDateFilter(colIndex) {
  const wrap = rowFlex();

  const op = selectEl([["on","On"],["before","Before"],["after","After"],["between","Between"]]);
  const d1 = inputEl("date");
  const d2 = inputEl("date");
  d2.style.display = "none";

  const st = filterState.get(colIndex);
  if (st && st.type === "date") {
    op.value = st.op || "on";
    d1.value = st.v1 || "";
    d2.value = st.v2 || "";
    d2.style.display = op.value === "between" ? "" : "none";
  }

  const trigger = () => {
    const o = op.value;
    const a = d1.value;
    const b = d2.value;
    const valid = o === "between" ? (a && b) : !!a;
    if (valid) filterState.set(colIndex, { type: "date", op: o, v1: a, v2: b });
    else filterState.delete(colIndex);
    applyFilters(document.querySelector(".flextable"));
  };

  op.addEventListener("change", () => { d2.style.display = op.value === "between" ? "" : "none"; trigger(); });
  d1.addEventListener("input", trigger);
  d2.addEventListener("input", trigger);

  wrap.append(op, d1, d2);
  return wrap;
}

function renderDiscreteFilter(colIndex) {
  const wrap = document.createElement("div");
  wrap.style.cssText = `
    position: relative !important;
    width: 100% !important;
    display: block !important;
  `;
  
  // Get unique values for this column
  const values = uniqueValues.get(colIndex);
  console.log(`[FlexTable] Rendering discrete filter for column ${colIndex}, found ${values ? values.size : 0} unique values:`, values ? Array.from(values) : 'none');
  
  if (!values || values.size === 0) {
    // Fallback to text filter if no values found
    console.warn(`[FlexTable] No unique values found for discrete column ${colIndex}, falling back to text filter`);
    return renderTextFilter(colIndex);
  }
  
  // Create dropdown button
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "All";
  button.style.cssText = `
    width: 100%;
    padding: 2px 6px;
    border: 1px solid #ddd;
    background: white;
    cursor: pointer;
    font-size: 11px;
    text-align: left;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  
  // Add dropdown arrow
  const arrow = document.createElement("span");
  arrow.textContent = "▾";
  arrow.style.fontSize = "10px";
  button.appendChild(arrow);
  
  // Create dropdown panel - append to body to escape table overflow
  const panel = document.createElement("div");
  panel.style.cssText = `
    position: fixed !important;
    width: 220px !important;
    background: white !important;
    background-color: #ffffff !important;
    border: 1px solid #ddd !important;
    max-height: 300px !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    display: none !important;
    z-index: 10000 !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
    border-radius: 4px !important;
  `;
  
  // Create "Select All" option
  const selectAllDiv = document.createElement("div");
  selectAllDiv.style.cssText = `
    padding: 4px 8px;
    border-bottom: 1px solid #eee;
    background: #f9f9f9;
    font-size: 11px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
  `;
  
  const selectAllCheckbox = document.createElement("input");
  selectAllCheckbox.type = "checkbox";
  selectAllCheckbox.checked = true;
  
  const selectAllLabel = document.createElement("span");
  selectAllLabel.textContent = "Select All";
  selectAllLabel.style.fontWeight = "bold";
  
  selectAllDiv.appendChild(selectAllCheckbox);
  selectAllDiv.appendChild(selectAllLabel);
  panel.appendChild(selectAllDiv);
  
  // Create search input for filtering dropdown options
  const searchContainer = document.createElement("div");
  searchContainer.style.cssText = `
    padding: 4px 8px;
    border-bottom: 1px solid #eee;
    background: #fff;
  `;
  
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Search values...";
  searchInput.style.cssText = `
    width: 100%;
    padding: 4px 6px;
    border: 1px solid #ddd;
    border-radius: 3px;
    font-size: 11px;
    outline: none;
  `;
  
  searchContainer.appendChild(searchInput);
  panel.appendChild(searchContainer);
  
  // Create container for checkboxes (for easy search filtering)
  const valuesContainer = document.createElement("div");
  panel.appendChild(valuesContainer);
  
  // Create checkboxes for each unique value
  const valueElements = [];
  const sortedValues = Array.from(values).sort();
  
  sortedValues.forEach(value => {
    const optionDiv = document.createElement("div");
    optionDiv.className = "ft-dropdown-option";
    optionDiv.dataset.value = value.toLowerCase(); // For search filtering
    optionDiv.style.cssText = `
      padding: 3px 8px;
      font-size: 11px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      min-height: 20px;
      overflow: hidden;
    `;
    
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.value = value;
    checkbox.style.cssText = `
      flex-shrink: 0;
      margin: 0;
    `;
    
    const label = document.createElement("span");
    label.textContent = value;
    label.style.cssText = `
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    `;
    label.title = value; // Show full text on hover
    
    optionDiv.appendChild(checkbox);
    optionDiv.appendChild(label);
    valuesContainer.appendChild(optionDiv);
    
    valueElements.push({ checkbox, value, element: optionDiv });
    
    // Handle individual checkbox changes
    checkbox.addEventListener("change", updateDiscreteFilter);
    optionDiv.addEventListener("click", (e) => {
      if (e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
        updateDiscreteFilter();
      }
    });
  });
  
  // Search functionality
  const performSearch = (searchTerm) => {
    let visibleCount = 0;
    
    valueElements.forEach(({ element, value }) => {
      const matches = value.toLowerCase().includes(searchTerm);
      element.style.display = matches ? "flex" : "none";
      if (matches) visibleCount++;
    });
    
    // Update "Select All" visibility and state
    if (visibleCount === 0) {
      selectAllDiv.style.display = "none";
    } else {
      selectAllDiv.style.display = "flex";
      // Update "Select All" checkbox based on visible items
      const visibleElements = valueElements.filter(({ element }) => 
        element.style.display !== "none"
      );
      const checkedVisible = visibleElements.filter(({ checkbox }) => checkbox.checked);
      selectAllCheckbox.checked = checkedVisible.length === visibleElements.length;
    }
  };
  
  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    performSearch(searchTerm);
  });
  
  // Keyboard support for search input
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      panel.style.display = "none";
      e.stopPropagation();
    }
  });
  
  // Update "Select All" to work with search results
  selectAllCheckbox.addEventListener("change", () => {
    const checked = selectAllCheckbox.checked;
    // Only affect visible elements
    valueElements.forEach(({ checkbox, element }) => {
      if (element.style.display !== "none") {
        checkbox.checked = checked;
      }
    });
    updateDiscreteFilter();
  });
  
  selectAllDiv.addEventListener("click", (e) => {
    if (e.target !== selectAllCheckbox) {
      selectAllCheckbox.checked = !selectAllCheckbox.checked;
      const checked = selectAllCheckbox.checked;
      // Only affect visible elements
      valueElements.forEach(({ checkbox, element }) => {
        if (element.style.display !== "none") {
          checkbox.checked = checked;
        }
      });
      updateDiscreteFilter();
    }
  });
  
  // Note: "Select All" functionality is handled above in the search section
  
  // Toggle panel visibility
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = panel.style.display !== "none";
    console.log(`[FlexTable] Toggle dropdown for column ${colIndex}, currently visible: ${isVisible}`);

    // Close all other discrete filter panels
    document.querySelectorAll(".ft-discrete-panel").forEach(p => p.style.display = "none");

    if (isVisible) {
      panel.style.display = "none";
    } else {
      // Position panel relative to button
      const buttonRect = button.getBoundingClientRect();
      panel.style.top = `${buttonRect.bottom + 2}px`;
      panel.style.left = `${buttonRect.left}px`;
      panel.style.display = "block";

      console.log(`[FlexTable] Positioned panel at top: ${panel.style.top}, left: ${panel.style.left}`);
    }

    console.log(`[FlexTable] Panel display set to: ${panel.style.display}, panel has ${valueElements.length} values`);

    // Focus search input when opening dropdown
    if (panel.style.display === "block") {
      setTimeout(() => searchInput.focus(), 100);
    }
  });
  
  // Append panel to body to escape table overflow
  panel.className = "ft-discrete-panel";
  document.body.appendChild(panel);

  // Close panel when clicking outside
  const closeHandler = (e) => {
    if (!wrap.contains(e.target) && !panel.contains(e.target)) {
      panel.style.display = "none";
    }
  };
  document.addEventListener("click", closeHandler);

  // Handle scroll to reposition panel
  const repositionPanel = () => {
    if (panel.style.display === "block") {
      const buttonRect = button.getBoundingClientRect();
      panel.style.top = `${buttonRect.bottom + 2}px`;
      panel.style.left = `${buttonRect.left}px`;
    }
  };

  // Listen for scroll events to reposition panel
  document.addEventListener("scroll", repositionPanel, true);
  window.addEventListener("resize", repositionPanel);

  // Clean up when filter is removed
  const cleanup = () => {
    document.removeEventListener("click", closeHandler);
    document.removeEventListener("scroll", repositionPanel, true);
    window.removeEventListener("resize", repositionPanel);
    if (panel.parentNode) {
      panel.parentNode.removeChild(panel);
    }
  };

  // Store cleanup function for later use
  wrap.dataset.cleanup = "true";
  wrap.cleanup = cleanup;

  function updateDiscreteFilter() {
    const selectedValues = valueElements
      .filter(({ checkbox }) => checkbox.checked)
      .map(({ value }) => value);
      
    // Update "Select All" checkbox state
    selectAllCheckbox.checked = selectedValues.length === valueElements.length;
    
    // Update button text
    if (selectedValues.length === 0) {
      button.firstChild.textContent = "None";
    } else if (selectedValues.length === valueElements.length) {
      button.firstChild.textContent = "All";
    } else {
      button.firstChild.textContent = `${selectedValues.length} selected`;
    }
    
    // Update filter state and apply
    if (selectedValues.length === 0 || selectedValues.length === valueElements.length) {
      filterState.delete(colIndex);
    } else {
      filterState.set(colIndex, { type: "discrete", selected: new Set(selectedValues) });
    }
    
    applyFilters(document.querySelector(".flextable"));
  }
  
  wrap.appendChild(button);

  console.log(`[FlexTable] Discrete filter created for column ${colIndex}: button=${!!button}, panel=${!!panel}, values=${valueElements.length}`);
  console.log(`[FlexTable] Panel children:`, panel.children.length, 'elements');

  return wrap;
}

/* ------------------------------ Apply ------------------------------ */

function applyFilters(table) {
  if (!(table instanceof HTMLTableElement)) return;
  const tbody = table.tBodies[0]; 
  if (!tbody) return;

  const active = Array.from(filterState.entries());
  const rows = Array.from(tbody.rows);

  // Early exit if no filters active
  if (active.length === 0) {
    rows.forEach(tr => (tr.style.display = ""));
    return;
  }

  // Track visible rows for statistics
  let visibleCount = 0;

  rows.forEach(tr => {
    const show = active.every(([idx, filter]) => evaluateRowFilter(tr, idx, filter));
    tr.style.display = show ? "" : "none";
    if (show) visibleCount++;
  });

  // Update aggregations if they exist
  updateFilterStats(visibleCount, rows.length);
}

function evaluateRowFilter(tr, colIndex, filter) {
  // Use the column index directly - it matches the DOM position
  const td = tr.cells[colIndex];
  if (!td) return true;
  
  const raw = td.textContent || "";
  
  switch (filter.type) {
    case "text":
      return evaluateTextFilter(raw, filter);
    case "number":
      return evaluateNumberFilter(raw, filter);
    case "date":
      return evaluateDateFilter(raw, filter);
    case "discrete":
      return evaluateDiscreteFilter(raw, filter);
    default:
      return true;
  }
}

function evaluateTextFilter(raw, filter) {
  const text = raw.toLowerCase();
  const searchTerm = (filter.v1 || "").toLowerCase();
  return text.includes(searchTerm);
}

function evaluateNumberFilter(raw, filter) {
  const n = toNumber(raw);
  if (n === null) return false;
  
  const a = toNumber(filter.v1);
  const b = toNumber(filter.v2);
  
  switch (filter.op) {
    case "=":  return a !== null && n === a;
    case "!=": return a !== null && n !== a;
    case ">":  return a !== null && n > a;
    case ">=": return a !== null && n >= a;
    case "<":  return a !== null && n < a;
    case "<=": return a !== null && n <= a;
    case "between":
      if (a === null || b === null) return false;
      const [lo, hi] = [Math.min(a, b), Math.max(a, b)];
      return n >= lo && n <= hi;
    default: 
      return true;
  }
}

function evaluateDateFilter(raw, filter) {
  const d = toDate(raw);
  if (!d) return false;
  
  const d1 = toDate(filter.v1);
  const d2 = toDate(filter.v2);
  
  switch (filter.op) {
    case "on":
      return d1 && sameDay(d, d1);
    case "before":
      return !!d1 && d < d1;
    case "after":
      return !!d1 && d > d1;
    case "between":
      if (!d1 || !d2) return false;
      const [lo, hi] = d1 <= d2 ? [d1, d2] : [d2, d1];
      return d >= lo && d <= hi;
    default:
      return true;
  }
}

function evaluateDiscreteFilter(raw, filter) {
  // For discrete filters, check if the value is in the selected set
  const value = (raw || "").trim();
  return filter.selected && filter.selected.has(value);
}

function updateFilterStats(visibleCount, totalCount) {
  // Update filter statistics if stats element exists
  const statsEl = document.getElementById("ft-filter-stats");
  if (statsEl) {
    statsEl.textContent = `Showing ${visibleCount} of ${totalCount} rows`;
  }
}

/* ------------------------------ Helpers ------------------------------ */

function rowFlex() {
  const d = document.createElement("div");
  d.style.display = "flex";
  d.style.gap = "6px";
  d.style.alignItems = "center";
  d.style.padding = "2px";
  return d;
}

function inputEl(type, placeholder = "") {
  const i = document.createElement("input");
  i.type = type;
  if (placeholder) i.placeholder = placeholder;
  i.className = "ft-filter-input";
  return i;
}

function selectEl(items) {
  const s = document.createElement("select");
  s.className = "ft-filter-op";
  items.forEach(opt => {
    const [value, label] = Array.isArray(opt) ? opt : [opt, opt];
    const o = document.createElement("option");
    o.value = value; o.textContent = label;
    s.appendChild(o);
  });
  return s;
}

function isHidden(el) {
  if (!el) return true;
  const cs = getComputedStyle(el);
  return cs.display === "none" || cs.visibility === "hidden";
}

function toNumber(str) {
  if (str === null || str === undefined) return null;
  const s = String(str)
    .replace(/[,\s]/g, "")
    .replace(/[%]/g, "")
    .replace(/[$£€₹]/g, "")
    .replace(/−/g, "-");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toDate(str) {
  if (!str) return null;
  const d = new Date(str);
  if (!isNaN(d)) return stripTime(d);
  const m = String(str).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    let a = parseInt(m[1], 10), b = parseInt(m[2], 10), y = parseInt(m[3], 10);
    const yyyy = y < 100 ? 2000 + y : y;
    const c1 = new Date(yyyy, a - 1, b); if (!isNaN(c1)) return stripTime(c1);
    const c2 = new Date(yyyy, b - 1, a); if (!isNaN(c2)) return stripTime(c2);
  }
  return null;
}
function stripTime(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}
