import { log } from "../utils/logger.js";

/** Render table with click-to-sort (asc/desc toggle) */
export function renderTable({ columns, rows }) {
  const container = document.getElementById("flextable-container");
  if (!container) return;

  container.innerHTML = "";

  const table = document.createElement("table");
  table.className = "flextable";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  // Keep sort state in closure
  let sortState = { colIndex: null, dir: null }; // 'asc' | 'desc'

  columns.forEach((col, idx) => {
    const th = document.createElement("th");
    th.textContent = col;
    // Add title for hover tooltip to show full text
    if (col.length > 20) {
      th.title = col;
    }

    th.addEventListener("click", () => {
      if (sortState.colIndex === idx) {
        sortState.dir = sortState.dir === "asc" ? "desc" : "asc";
      } else {
        sortState.colIndex = idx;
        sortState.dir = "asc";
      }
      // Update header indicators
      [...thead.querySelectorAll("th")].forEach(h => h.classList.remove("ft-sort-asc", "ft-sort-desc"));
      th.classList.add(sortState.dir === "asc" ? "ft-sort-asc" : "ft-sort-desc");

      sortBody(tbody, sortState.colIndex, sortState.dir);
    });

    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((cell) => {
      const td = document.createElement("td");
      const cellText = cell ?? "";
      td.textContent = cellText;
      // Add title for hover tooltip to show full text
      if (cellText.length > 30) {
        td.title = cellText;
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  container.appendChild(table);

  log("Rendered table with", rows.length, "rows.");
}

function sortBody(tbody, colIndex, dir) {
  const rows = Array.from(tbody.querySelectorAll("tr"));
  const mult = dir === "asc" ? 1 : -1;

  rows.sort((ra, rb) => {
    const a = ra.children[colIndex]?.textContent ?? "";
    const b = rb.children[colIndex]?.textContent ?? "";

    const an = toNumber(a);
    const bn = toNumber(b);
    if (an !== null && bn !== null) return (an - bn) * mult;

    return a.localeCompare(b, undefined, { numeric: true }) * mult;
  });

  tbody.innerHTML = "";
  rows.forEach(r => tbody.appendChild(r));
}

function toNumber(v) {
  if (typeof v !== "string") return null;
  const cleaned = v.replace(/[%,$\s]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}
