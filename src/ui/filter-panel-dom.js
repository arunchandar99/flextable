// src/ui/filter-panel-dom.js
// Per-column filters rendered inside a second header row.
// - Idempotent: rebuilding replaces the old filter row
// - Skips the row-number (“#”) column
// - Mirrors header cell visibility for perfect alignment
// - Uses CSS var --ft-filter-top (falls back to headerRow.offsetHeight)
// Exports: mountDomFilters(), clearDomFilters()

const filterState = new Map(); // colIndex -> { type: 'text'|'number'|'date', op?, v1?, v2? }

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
    // Calculate the data column index (what data column this filter controls)
    const dataColIndex = rowNumIdx === 0 ? i - 1 : i; // If row# at 0, shift data cols
    const th = createFilterCell(headerRow.cells[i], i, dataColIndex, columnTypes[i], rowNumIdx);
    filterRow.appendChild(th);
  }
  
  return filterRow;
}

function createFilterCell(headerCell, headerIndex, dataColIndex, columnType, rowNumIdx) {
  const th = document.createElement("th");
  th.className = "ft-filter-cell";
  
  // Mirror visibility of header cell
  th.style.display = getComputedStyle(headerCell).display;
  
  // Let CSS handle the sticky positioning to prevent conflicts
  // Only set essential inline styles
  th.style.padding = "4px";

  // Add filter control (skip row number column and invalid data column indices)
  if (headerIndex !== rowNumIdx && dataColIndex >= 0 && columnType !== "skip") {
    const control = createFilterControl(dataColIndex, headerIndex, columnType || "text");
    if (control) th.appendChild(control);
  }

  return th;
}

function createFilterControl(dataColIndex, headerIndex, type) {
  try {
    switch (type) {
      case "number": return renderNumberFilter(dataColIndex, headerIndex);
      case "date": return renderDateFilter(dataColIndex, headerIndex);  
      default: return renderTextFilter(dataColIndex, headerIndex);
    }
  } catch (error) {
    console.warn(`[FlexTable] Failed to create ${type} filter for column ${dataColIndex}:`, error);
    return renderTextFilter(dataColIndex, headerIndex); // Fallback to text filter
  }
}

export function clearDomFilters() {
  filterState.clear();

  const table = document.querySelector(".flextable");
  if (!(table instanceof HTMLTableElement)) return;

  const thead = table.querySelector("thead");
  if (!thead || thead.rows.length < 2) { applyFilters(table); return; }

  const filterRow = thead.rows[1];
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

  const rows = Array.from(tbody.rows).filter(tr => !isHidden(tr)).slice(0, 200);
  const colCount = rows[0] ? rows[0].cells.length : 0;

  const stats = Array.from({ length: colCount }, () => ({ n: 0, nums: 0, dates: 0 }));
  for (const tr of rows) {
    for (let c = 0; c < colCount; c++) {
      if (c === rowNumIdx) continue; // ignore "#"
      const td = tr.cells[c]; if (!td || isHidden(td)) continue;
      const raw = (td.textContent || "").trim();
      if (!raw) continue;
      stats[c].n++;
      if (toNumber(raw) !== null) stats[c].nums++;
      else if (toDate(raw)) stats[c].dates++;
    }
  }

  return stats.map((s, idx) => {
    if (idx === rowNumIdx) return "skip";
    if (!s.n) return "text";
    if (s.nums / s.n >= 0.6) return "number";
    if (s.dates / s.n >= 0.6) return "date";
    return "text";
  });
}

function findRowNumIndex(firstHeaderRow) {
  if (!firstHeaderRow) return -1;
  for (let i = 0; i < firstHeaderRow.cells.length; i++) {
    const th = firstHeaderRow.cells[i];
    const name = (th.textContent || "").trim();
    if (th.dataset?.ftRownum === "1" || th.classList.contains("ft-rownum") || name === "#") {
      return i;
    }
  }
  return -1;
}

/* ------------------------------ Controls ------------------------------ */

function renderTextFilter(dataColIndex, headerIndex) {
  const wrap = rowFlex();
  const input = inputEl("text", "filter…");
  const st = filterState.get(dataColIndex);
  if (st && st.type === "text") input.value = st.v1 || "";

  input.addEventListener("input", () => {
    const v = input.value.trim();
    if (v) filterState.set(dataColIndex, { type: "text", v1: v.toLowerCase(), headerIndex });
    else filterState.delete(dataColIndex);
    applyFilters(document.querySelector(".flextable"));
  });

  wrap.appendChild(input);
  return wrap;
}

function renderNumberFilter(dataColIndex, headerIndex) {
  const wrap = rowFlex();

  const op = selectEl(["=", "!=", ">", ">=", "<", "<=", "between"]);
  const v1 = inputEl("number", "value");
  const v2 = inputEl("number", "and");
  v2.style.display = "none";

  const st = filterState.get(dataColIndex);
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
    if (valid) filterState.set(dataColIndex, { type: "number", op: o, v1: a, v2: b, headerIndex });
    else filterState.delete(dataColIndex);
    applyFilters(document.querySelector(".flextable"));
  };

  op.addEventListener("change", () => { v2.style.display = op.value === "between" ? "" : "none"; trigger(); });
  v1.addEventListener("input", trigger);
  v2.addEventListener("input", trigger);

  wrap.append(op, v1, v2);
  return wrap;
}

function renderDateFilter(dataColIndex, headerIndex) {
  const wrap = rowFlex();

  const op = selectEl([["on","On"],["before","Before"],["after","After"],["between","Between"]]);
  const d1 = inputEl("date");
  const d2 = inputEl("date");
  d2.style.display = "none";

  const st = filterState.get(dataColIndex);
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
    if (valid) filterState.set(dataColIndex, { type: "date", op: o, v1: a, v2: b, headerIndex });
    else filterState.delete(dataColIndex);
    applyFilters(document.querySelector(".flextable"));
  };

  op.addEventListener("change", () => { d2.style.display = op.value === "between" ? "" : "none"; trigger(); });
  d1.addEventListener("input", trigger);
  d2.addEventListener("input", trigger);

  wrap.append(op, d1, d2);
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

function evaluateRowFilter(tr, dataColIndex, filter) {
  // Use the stored header index to get the correct DOM column
  const headerIndex = filter.headerIndex;
  const td = tr.cells[headerIndex];
  if (!td) return true;
  
  const raw = td.textContent || "";
  
  switch (filter.type) {
    case "text":
      return evaluateTextFilter(raw, filter);
    case "number":
      return evaluateNumberFilter(raw, filter);
    case "date":
      return evaluateDateFilter(raw, filter);
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
