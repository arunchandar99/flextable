// src/ui/row-number-dom.js
// Adds a leading "#" column and sets a stable CSS var --ft-filter-top.

let tableObs, tbodyObs, headerResizeObs;
let _debounceTimer;

export function initRowNumbers() {
  safeApply("init");

  // Watch structure changes (Phase-1 re-renders)
  const container = document.getElementById("flextable-container") || document.body;
  tableObs?.disconnect();
  tableObs = new MutationObserver(() => debounce(() => safeApply("table-mutation"), 30));
  tableObs.observe(container, { childList: true, subtree: true });

  // Watch body changes (filters hide/show rows)
  attachTbodyObserver();
}

/* --------------------------- core mounting --------------------------- */

function safeApply() {
  const table = document.querySelector(".flextable");
  if (!(table instanceof HTMLTableElement)) {
    setTimeout(() => safeApply(), 50);
    return;
  }

  ensureHeaderFirstCol();
  ensureBodyFirstCol();

  // set/refresh the CSS var that the filter row uses
  syncFilterTopVar();
  alignFilterRowToVar();

  renumberVisibleRows();
  attachTbodyObserver();
  watchHeaderResize(); // update CSS var only when header actually resizes
}

function ensureHeaderFirstCol() {
  const thead = getThead(); if (!thead) return;

  Array.from(thead.rows).forEach((row, idx) => {
    const first = row.cells[0];
    if (first?.dataset?.ftRownum === "1") {
      if (idx > 0) mirrorStickyTopFromVar(first);
      return;
    }

    const th = document.createElement("th");
    th.dataset.ftRownum = "1";
    th.className = "ft-rownum";
    th.style.whiteSpace = "nowrap";
    th.style.textAlign = "right";
    th.style.color = "#666";
    th.style.zIndex = "2";

    if (idx === 0) {
      th.textContent = "#";
      th.style.position = "sticky";
      th.style.top = "0";
      th.style.background = "var(--ft-header-bg, #f7f7f7)";
    } else {
      mirrorStickyTopFromVar(th);
      th.textContent = "";
    }

    row.insertBefore(th, row.firstElementChild || null);
  });
}

function ensureBodyFirstCol() {
  const tbody = getTbody(); if (!tbody) return;
  Array.from(tbody.rows).forEach((tr) => {
    const first = tr.cells[0];
    if (first?.dataset?.ftRownumCell === "1") return;

    const td = document.createElement("td");
    td.dataset.ftRownumCell = "1";
    td.className = "ft-rownum";
    td.style.whiteSpace = "nowrap";
    td.style.textAlign = "right";
    td.style.color = "#666";
    td.textContent = "";
    tr.insertBefore(td, tr.firstElementChild || null);
  });
}

/* -------------------------- numbering + align ------------------------- */

function renumberVisibleRows() {
  const tbody = getTbody(); if (!tbody) return;
  let idx = 1;
  Array.from(tbody.rows).forEach((tr) => {
    const cell = tr.cells[0];
    if (cell?.dataset?.ftRownumCell !== "1") return;
    cell.textContent = isHidden(tr) ? "" : String(idx++);
  });
}

function alignFilterRowToVar() {
  const thead = getThead(); if (!thead || thead.rows.length < 2) return;
  const filterRow = thead.rows[1];
  Array.from(filterRow.cells).forEach((cell) => {
    cell.style.position = "sticky";
    cell.style.top = "var(--ft-filter-top, 24px)";
    cell.style.zIndex = "1";
    if (!cell.style.background) cell.style.background = "#fff";
  });
}

/* ---------------------- CSS var: --ft-filter-top ---------------------- */

function syncFilterTopVar() {
  const table = document.querySelector(".flextable");
  const first = getFirstHeaderRow();
  if (!table || !first) return;
  const px = `${first.offsetHeight}px`;            // stable, no subpixel jitter
  if (table.style.getPropertyValue("--ft-filter-top") !== px) {
    table.style.setProperty("--ft-filter-top", px);
  }
}

function watchHeaderResize() {
  const first = getFirstHeaderRow();
  if (!first) return;
  headerResizeObs?.disconnect();
  headerResizeObs = new ResizeObserver(() => {
    syncFilterTopVar();
    alignFilterRowToVar();
  });
  headerResizeObs.observe(first);
}

/* ------------------------------ observers ----------------------------- */

function attachTbodyObserver() {
  const tbody = getTbody();
  if (!tbody) return;
  tbodyObs?.disconnect();
  tbodyObs = new MutationObserver((recs) => {
    const relevant =
      recs.some(r => r.type === "attributes" && r.attributeName === "style") ||
      recs.some(r => r.type === "childList");
    if (relevant) debounce(() => renumberVisibleRows(), 16);
  });
  tbodyObs.observe(tbody, { attributes: true, attributeFilter: ["style"], childList: true, subtree: false });
}

/* ------------------------------ helpers ------------------------------ */

function getThead() {
  const table = document.querySelector(".flextable");
  if (!(table instanceof HTMLTableElement)) return null;
  const thead = table.querySelector("thead");
  return thead instanceof HTMLTableSectionElement ? thead : null;
}
function getTbody() {
  const table = document.querySelector(".flextable");
  if (!(table instanceof HTMLTableElement)) return null;
  return table.tBodies && table.tBodies[0] || null;
}
function getFirstHeaderRow() {
  const thead = getThead();
  return thead && thead.rows[0] || null;
}
function isHidden(el) {
  if (!el) return true;
  const cs = getComputedStyle(el);
  return cs.display === "none" || cs.visibility === "hidden";
}
function mirrorStickyTopFromVar(cell) {
  cell.style.position = "sticky";
  cell.style.top = "var(--ft-filter-top, 24px)";
  cell.style.background = "#fff";
  cell.style.zIndex = "1";
}
function debounce(fn, ms) {
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(fn, ms);
}
