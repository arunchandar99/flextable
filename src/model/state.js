// src/model/state.js
export const state = {
    columnFilters: {} // { colIndex: "string" }
  };
  
  export function setColumnFilter(idx, value) {
    if (value) state.columnFilters[idx] = value;
    else delete state.columnFilters[idx];
  }
  
  export function clearColumnFilter(idx) {
    delete state.columnFilters[idx];
  }
  
  export function applyColumnFilters({ columns, rows }) {
    const filters = state.columnFilters;
    if (!Object.keys(filters).length) return { columns, rows };
  
    const filtered = rows.filter(r =>
      Object.entries(filters).every(([idx, val]) => {
        const cell = String(r[idx] ?? "").toLowerCase();
        return cell.includes(val.toLowerCase());
      })
    );
  
    return { columns, rows: filtered };
  }
  