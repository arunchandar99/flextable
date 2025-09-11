// src/ui/aggregate-by-visible-dims-dom.js
// DOM-only aggregation when a dimension column is hidden.
// If any DIMENSION (non-numeric) column is hidden, we group by the remaining
// VISIBLE dimensions and SUM the VISIBLE measure columns.
// When all dimensions are visible again, we restore the original detail rows.

let colTypes = null;          // Array<'dimension'|'measure'>
let originalRows = null;      // Snapshot of detail rows: string[][] in column order
let aggregatedMode = false;   // Are we showing aggregated rows?

let debounceTimer = null;

export function initAggregateByVisibleDims() {
  // First pass: detect types and snapshot rows
  initTypesAndSnapshot();

  // Run once to set initial mode
  recalcAggregationIfNeeded();

  // Observe header style changes (hide/show)
  const thead = getThead();
  if (thead) {
    const headObs = new MutationObserver(() => debounce(recalcAggregationIfNeeded, 30));
    headObs.observe(thead, { attributes: true, attributeFilter: ["style"], subtree: true });
  }

  // Observe tbody child replacements (re-renders) and row style changes (filters)
  const tbody = getTbody();
  if (tbody) {
    const bodyObs = new MutationObserver(() => debounce(() => {
      // If Phase-1 re-rendered the table, we need to reset types + snapshot
      // BUT only if we are not in aggregated mode (we own tbody contents in aggregate mode).
      if (!aggregatedMode) {
        initTypesAndSnapshot(); // refresh base snapshot
        recalcAggregationIfNeeded();
      } else {
        // If already aggregated, recompute in case filters changed visibility
        // (filter-panel changes tr.style.display; attributes observer catches it)
        recomputeAggregateFromCurrentDOM();
      }
    }, 30));
    bodyObs.observe(tbody, { childList: true, attributes: true, attributeFilter: ["style"], subtree: false });
  }
}

/* ---------------------------- Core logic ---------------------------- */

function recalcAggregationIfNeeded() {
  const table = getTable(); if (!table) return;
  if (!colTypes) initTypesAndSnapshot();

  const hidden = hiddenMap();
  const dims = dimIndices();
  const anyHiddenDim = dims.some(i => hidden[i]);

  if (anyHiddenDim) {
    enterAggregatedMode();
  } else {
    exitAggregatedMode();
  }
}

function enterAggregatedMode() {
  if (!aggregatedMode) {
    // First time entering: snapshot original rows from DOM
    const currentRows = readRowsFromDOM();
    if (currentRows && currentRows.length > 0) {
      originalRows = currentRows;
      console.log(`[FlexTable] Snapshot saved: ${originalRows.length} rows for aggregation`);
    } else {
      console.warn("[FlexTable] No rows found to snapshot - may cause restore issues");
      originalRows = [];
    }
    aggregatedMode = true;
  }
  recomputeAggregateFromCurrentDOM();
}

function exitAggregatedMode() {
  if (!aggregatedMode) return;
  
  // Check if we have valid original data to restore
  if (!originalRows || originalRows.length === 0) {
    console.warn("[FlexTable] No original rows to restore, requesting fresh data from Tableau");
    // Force a complete refresh from Tableau instead of trying to restore stale data
    aggregatedMode = false;
    
    // Trigger a fresh data fetch by dispatching a custom event
    // The main extension will catch this and re-render with fresh data
    window.dispatchEvent(new CustomEvent('flextable-refresh-needed'));
    return;
  }
  
  // Restore original detail rows
  writeRowsToDOM(originalRows);
  aggregatedMode = false;
  console.log(`[FlexTable] Restored ${originalRows.length} original rows from snapshot`);
}

function recomputeAggregateFromCurrentDOM() {
  const table = getTable(); if (!table) return;
  const tbody = getTbody(); if (!tbody) return;

  // Build dataset from CURRENT DOM detail rows if we have it,
  // else from the last known original snapshot.
  // We prefer current DOM rows only if not already aggregated; otherwise use snapshot
  // plus current visibility of rows (filter) inferred from DOM before aggregation.
  let sourceRows;
  if (!originalRows || !originalRows.length || !hasDetailRowsInDOM()) {
    // fallback
    sourceRows = originalRows || [];
  } else {
    // Read directly from DOM to respect any live filters before first aggregation
    sourceRows = readRowsFromDOM();
    // Update snapshot so we can restore with current detail set later
    originalRows = sourceRows;
  }

  const hidden = hiddenMap();
  const dims = dimIndices().filter(i => !hidden[i]);      // group by VISIBLE dims
  const meas = measIndices().filter(i => !hidden[i]);     // aggregate VISIBLE measures

  const grouped = groupAndSum(sourceRows, dims, meas);

  // Replace tbody contents with aggregated rows (keep the same <tbody> element!)
  writeRowsToDOM(grouped);
}

/* ---------------------------- Grouping helpers ---------------------------- */

function groupAndSum(rows, dimIdx, measIdx) {
  const keySep = "\u241F"; // symbol for visual debugging; logically a unique separator
  const map = new Map();
  for (const r of rows) {
    if (!r) continue;
    // Only group rows that are currently visible in DOM (best-effort)
    // We can't read per-row visibility from the snapshot; assume snapshot already reflects filter.
    const key = dimIdx.map(i => r[i] ?? "").join(keySep);
    let entry = map.get(key);
    if (!entry) {
      entry = { dims: dimIdx.map(i => r[i] ?? ""), sums: measIdx.map(() => 0) };
      map.set(key, entry);
    }
    measIdx.forEach((i, j) => {
      const n = toNumber(r[i]);
      if (n !== null) entry.sums[j] += n;
    });
  }

  // Build rows restoring full column order: fill dims, sums, blanks for hidden/non-target cols.
  const colCount = getColumnCount();
  const rowsOut = [];
  for (const { dims: dvals, sums } of map.values()) {
    const out = new Array(colCount).fill("");
    // place dimension values
    dimIdx.forEach((i, k) => { out[i] = dvals[k]; });
    // place measure sums
    measIdx.forEach((i, k) => { out[i] = formatNumber(sums[k]); });
    rowsOut.push(out);
  }
  return rowsOut;
}

/* ---------------------------- DOM I/O ---------------------------- */

function readRowsFromDOM() {
  const tbody = getTbody(); if (!tbody) return [];
  const trs = Array.from(tbody.rows);
  // Use ONLY currently visible rows as baseline (so existing DOM filters are honored)
  // If a row is display:none, skip it.
  return trs.filter(tr => !isHidden(tr)).map(tr => {
    const tds = Array.from(tr.cells);
    return tds.map(td => (td.textContent || "").trim());
  });
}

function writeRowsToDOM(rows) {
  const tbody = getTbody(); if (!tbody) return;
  tbody.innerHTML = "";
  for (const r of rows) {
    const tr = document.createElement("tr");
    r.forEach(txt => {
      const td = document.createElement("td");
      td.textContent = txt ?? "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
}

function hasDetailRowsInDOM() {
  const tbody = getTbody(); if (!tbody) return false;
  return tbody.rows.length > 0;
}

/* ---------------------------- Type/visibility utils ---------------------------- */

function initTypesAndSnapshot() {
  colTypes = detectColTypes();
  if (!aggregatedMode) {
    originalRows = readRowsFromDOM();
  }
}

function detectColTypes() {
  const tbody = getTbody(); if (!tbody) return [];
  const rows = Array.from(tbody.rows).filter(tr => !isHidden(tr)).slice(0, 200);
  const colCount = rows[0] ? rows[0].cells.length : 0;
  const out = new Array(colCount).fill("dimension");

  for (let c = 0; c < colCount; c++) {
    let n = 0, total = 0;
    for (const tr of rows) {
      const td = tr.cells[c]; if (!td) continue;
      const raw = (td.textContent || "").trim();
      if (!raw) continue;
      total++;
      if (toNumber(raw) !== null) n++;
    }
    out[c] = (total && n / total >= 0.6) ? "measure" : "dimension";
  }
  return out;
}

function hiddenMap() {
  const thead = getThead();
  const first = thead && thead.rows[0];
  const colCount = first ? first.cells.length : 0;
  const map = new Array(colCount).fill(false);
  if (!first) return map;
  for (let i = 0; i < colCount; i++) {
    map[i] = isHidden(first.cells[i]);
  }
  return map;
}

function dimIndices() {
  if (!colTypes) return [];
  return colTypes.map((t, i) => t === "dimension" ? i : null).filter(i => i !== null);
}

function measIndices() {
  if (!colTypes) return [];
  return colTypes.map((t, i) => t === "measure" ? i : null).filter(i => i !== null);
}

function getTable() {
  const t = document.querySelector(".flextable");
  return (t instanceof HTMLTableElement) ? t : null;
}
function getThead() {
  const t = getTable(); if (!t) return null;
  const h = t.querySelector("thead");
  return (h instanceof HTMLTableSectionElement) ? h : null;
}
function getTbody() {
  const t = getTable(); if (!t) return null;
  return t.tBodies && t.tBodies[0] || null;
}

function getColumnCount() {
  const thead = getThead(); const r = thead && thead.rows[0];
  return r ? r.cells.length : 0;
}

function isHidden(el) {
  if (!el) return true;
  const cs = getComputedStyle(el);
  return cs.display === "none" || cs.visibility === "hidden";
}

function debounce(fn, ms) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fn, ms);
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

function formatNumber(n) {
  const opts = Number.isInteger(n) ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return new Intl.NumberFormat(undefined, opts).format(n);
}
