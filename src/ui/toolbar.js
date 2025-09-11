// src/ui/toolbar.js
// Mounts a search box inside the toolbar
export function mountToolbar({ onSearch }) {
    const bar = document.querySelector(".ft-toolbar");
    if (!bar) return;
  
    // Reuse if already exists
    let input = document.getElementById("ft-search");
    if (!input) {
      input = document.createElement("input");
      input.id = "ft-search";
      input.type = "search";
      input.placeholder = "Search…";
      input.className = "ft-search";
  
      const exportBtn = document.getElementById("export-btn");
      bar.insertBefore(input, exportBtn || null);
    }
  
    // Debounce typing
    let t;
    input.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (typeof onSearch === "function") onSearch(input.value);
      }, 200);
    });
  }
  