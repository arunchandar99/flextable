// src/ui/filter-panel.js
import { setColumnFilter, clearColumnFilter } from "../model/state.js";

// Mounts a second header row with text inputs for filtering
export function mountColumnFilters({ columns, onFilterChange }) {
  const table = document.querySelector(".flextable");
  if (!(table instanceof HTMLTableElement)) return;

  const thead = table.querySelector("thead");
  if (!thead || thead.rows.length > 1) return; // already mounted

  const filterRow = document.createElement("tr");

  columns.forEach((_, colIndex) => {
    const th = document.createElement("th");
    th.style.background = "#fff";
    th.style.position = "sticky";
    th.style.top = "24px";
    th.style.zIndex = "1";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "filter…";
    input.className = "ft-filter-input";

    input.addEventListener("input", () => {
      const val = input.value.trim();
      if (val) setColumnFilter(colIndex, val);
      else clearColumnFilter(colIndex);
      if (onFilterChange) onFilterChange();
    });

    th.appendChild(input);
    filterRow.appendChild(th);
  });

  thead.appendChild(filterRow);
}
