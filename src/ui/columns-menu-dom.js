// src/ui/columns-menu-dom.js
// DOM-only hide/show columns; excludes row-number column from the menu.

const hiddenCols = new Set(); // indices of hidden columns

export function initColumnsMenu() {
  const bar = document.querySelector(".ft-toolbar");
  if (!bar || document.getElementById("ft-colmenu-btn")) return;

  // Button
  const btn = document.createElement("button");
  btn.id = "ft-colmenu-btn";
  btn.className = "ft-btn";
  btn.textContent = "Columns ▾";
  btn.style.position = "relative";

  // Panel
  const panel = document.createElement("div");
  panel.id = "ft-colmenu-panel";
  Object.assign(panel.style, {
    position: "absolute", top: "100%", right: "0", minWidth: "220px", maxHeight: "280px",
    overflow: "auto", border: "1px solid #e2e2e2", borderRadius: "8px", background: "#fff",
    boxShadow: "0 8px 24px rgba(0,0,0,0.10)", padding: "8px", display: "none", zIndex: "9999"
  });

  // Actions
  const header = document.createElement("div");
  Object.assign(header.style, { display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "6px" });

  const showAll = document.createElement("button");
  showAll.className = "ft-btn"; showAll.textContent = "Show all"; showAll.style.padding = "4px 8px";
  showAll.addEventListener("click", () => {
    hiddenCols.clear();
    applyVisibilityToCurrentTable();
    refreshList(panel);
  });

  const hideAll = document.createElement("button");
  hideAll.className = "ft-btn"; hideAll.textContent = "Hide all"; hideAll.style.padding = "4px 8px";
  hideAll.addEventListener("click", () => {
    const cols = getHeaderCells();
    hiddenCols.clear();
    cols.forEach(c => { if (!c.isRowNum) hiddenCols.add(c.idx); });
    applyVisibilityToCurrentTable();
    refreshList(panel);
  });

  header.append(showAll, hideAll);

  const list = document.createElement("div");
  list.id = "ft-colmenu-list";
  Object.assign(list.style, { display: "grid", gridTemplateColumns: "1fr", gap: "6px" });

  panel.append(header, list);
  btn.appendChild(panel);

  // Toggle
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (panel.style.display === "none") {
      buildList(panel);
      panel.style.display = "block";
    } else panel.style.display = "none";
  });
  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target) && e.target !== btn) panel.style.display = "none";
  });

  const exportBtn = document.getElementById("export-btn");
  bar.insertBefore(btn, exportBtn || null);

  applyVisibilityToCurrentTable();
  startReapplyObserver();
}

function getHeaderCells() {
  const table = document.querySelector(".flextable");
  if (!(table instanceof HTMLTableElement)) return [];
  const thead = table.querySelector("thead");
  if (!(thead instanceof HTMLTableSectionElement)) return [];
  const r = thead.rows[0]; if (!r) return [];
  return Array.from(r.cells).map((th, idx) => {
    const name = (th.textContent || "").trim();
    const isRowNum = th.dataset?.ftRownum === "1" || th.classList.contains("ft-rownum") || name === "#";
    return { idx, name, isRowNum };
  });
}

function buildList(panel) {
  const list = panel.querySelector("#ft-colmenu-list"); if (!list) return;
  list.innerHTML = "";

  const cols = getHeaderCells();
  cols.filter(c => !c.isRowNum).forEach(({ idx, name }) => {
    const row = document.createElement("label");
    Object.assign(row.style, { display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" });

    const cb = document.createElement("input");
    cb.type = "checkbox"; cb.checked = !hiddenCols.has(idx);
    cb.addEventListener("change", () => {
      if (cb.checked) hiddenCols.delete(idx); else hiddenCols.add(idx);
      applyVisibilityToCurrentTable();
    });

    const span = document.createElement("span");
    span.textContent = name || `Column ${idx + 1}`;

    row.append(cb, span);
    list.appendChild(row);
  });

  // Clean up in case index 0 (rownum) got in
  const rowNum = cols.find(c => c.isRowNum)?.idx;
  if (rowNum !== undefined && hiddenCols.has(rowNum)) hiddenCols.delete(rowNum);
}

function refreshList(panel) {
  if (!panel || panel.style.display === "none") return;
  buildList(panel);
}

function startReapplyObserver() {
  const container = document.getElementById("flextable-container") || document.body;
  const obs = new MutationObserver(() => {
    clearTimeout(obs._t);
    obs._t = setTimeout(() => {
      applyVisibilityToCurrentTable();
      const panel = document.getElementById("ft-colmenu-panel");
      if (panel) refreshList(panel);
    }, 50);
  });
  obs.observe(container, { childList: true, subtree: true });
}

export function applyVisibilityToCurrentTable() {
  const table = document.querySelector(".flextable");
  if (!(table instanceof HTMLTableElement)) return;

  const cols = getHeaderCells();
  const rowNumIdx = cols.find(c => c.isRowNum)?.idx;

  const thead = table.querySelector("thead");
  const tbody = table.tBodies[0];

  if (thead) {
    Array.from(thead.rows).forEach((row) => {
      Array.from(row.cells).forEach((th, idx) => {
        const hidden = hiddenCols.has(idx) && idx !== rowNumIdx;
        th.style.display = hidden ? "none" : "";
      });
    });
  }
  if (tbody) {
    Array.from(tbody.rows).forEach((tr) => {
      Array.from(tr.cells).forEach((td, idx) => {
        const hidden = hiddenCols.has(idx) && idx !== rowNumIdx;
        td.style.display = hidden ? "none" : "";
      });
    });
  }
}
