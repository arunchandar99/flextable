// src/ui/global-search-dom.js
// Global search functionality - single search box that searches across all columns
// Adds search input to toolbar and implements real-time filtering

let searchInput = null;
let debounceTimer = null;

export function initGlobalSearch() {
  try {
    // Add search input to toolbar
    addSearchInputToToolbar();
    
    // Initialize search functionality
    setupSearchHandlers();
    
    console.log("[FlexTable] Global search initialized");
    return true;

  } catch (error) {
    console.error("[FlexTable] Failed to initialize global search:", error);
    return false;
  }
}

function addSearchInputToToolbar() {
  const toolbar = document.querySelector(".ft-toolbar");
  if (!toolbar) return;

  // Skip if search input already exists
  if (document.getElementById("ft-global-search")) return;

  // Create search container
  const searchContainer = document.createElement("div");
  searchContainer.className = "ft-search-container";
  Object.assign(searchContainer.style, {
    display: "inline-flex",
    alignItems: "center",
    marginRight: "12px",
    gap: "6px"
  });

  // Create search icon/label
  const searchLabel = document.createElement("span");
  searchLabel.textContent = "🔍";
  searchLabel.style.fontSize = "14px";
  searchLabel.style.opacity = "0.7";

  // Create search input
  searchInput = document.createElement("input");
  searchInput.id = "ft-global-search";
  searchInput.type = "text";
  searchInput.placeholder = "Search all columns...";
  searchInput.className = "ft-search-input";
  
  Object.assign(searchInput.style, {
    padding: "4px 8px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "13px",
    width: "200px",
    outline: "none"
  });

  // Add hover and focus effects
  searchInput.addEventListener("focus", () => {
    searchInput.style.borderColor = "#007acc";
    searchInput.style.boxShadow = "0 0 0 2px rgba(0,122,204,0.1)";
  });

  searchInput.addEventListener("blur", () => {
    searchInput.style.borderColor = "#ddd";
    searchInput.style.boxShadow = "none";
  });

  // Assemble search container
  searchContainer.appendChild(searchLabel);
  searchContainer.appendChild(searchInput);

  // Insert at the beginning of toolbar
  toolbar.insertBefore(searchContainer, toolbar.firstChild);
}

function setupSearchHandlers() {
  if (!searchInput) return;

  // Real-time search with debouncing
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    debounceSearch(query);
  });

  // Clear search on Escape key
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      clearGlobalSearch();
    }
  });
}

function debounceSearch(query) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    performGlobalSearch(query);
  }, 150); // 150ms delay for smooth typing
}

function performGlobalSearch(query) {
  const table = document.querySelector(".flextable");
  if (!table) return;

  const tbody = table.querySelector("tbody");
  if (!tbody) return;

  const rows = Array.from(tbody.rows);
  let visibleCount = 0;

  if (!query) {
    // Show all rows if search is empty
    rows.forEach(row => {
      row.style.display = "";
      visibleCount++;
    });
  } else {
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
    
    rows.forEach(row => {
      const rowText = Array.from(row.cells)
        .map(cell => (cell.textContent || "").toLowerCase())
        .join(" ");

      // Check if ALL search terms are found in the row
      const matchesAllTerms = searchTerms.every(term => rowText.includes(term));
      
      if (matchesAllTerms) {
        row.style.display = "";
        visibleCount++;
      } else {
        row.style.display = "none";
      }
    });
  }

  // Update search input styling based on results
  updateSearchInputStyling(query, visibleCount);
  
  console.log(`[FlexTable] Global search for "${query}": ${visibleCount} rows visible`);
}

function updateSearchInputStyling(query, visibleCount) {
  if (!searchInput) return;

  if (!query) {
    // No search query - default styling
    searchInput.style.backgroundColor = "";
    searchInput.title = "";
  } else if (visibleCount === 0) {
    // No results - red background
    searchInput.style.backgroundColor = "#fff2f2";
    searchInput.title = "No matching rows found";
  } else {
    // Results found - green background
    searchInput.style.backgroundColor = "#f2fff2";
    searchInput.title = `${visibleCount} matching rows found`;
  }
}

// Clear global search and show all rows
export function clearGlobalSearch() {
  if (searchInput) {
    searchInput.value = "";
    searchInput.style.backgroundColor = "";
    searchInput.title = "";
  }

  // Show all rows
  const table = document.querySelector(".flextable");
  if (table) {
    const tbody = table.querySelector("tbody");
    if (tbody) {
      Array.from(tbody.rows).forEach(row => {
        row.style.display = "";
      });
    }
  }

  console.log("[FlexTable] Global search cleared");
}

// Get current search query (for external access)
export function getGlobalSearchQuery() {
  return searchInput ? searchInput.value.trim() : "";
}

// Set search query programmatically
export function setGlobalSearchQuery(query) {
  if (searchInput) {
    searchInput.value = query || "";
    performGlobalSearch(query || "");
  }
}

// Check if global search is currently active
export function isGlobalSearchActive() {
  return searchInput && searchInput.value.trim().length > 0;
}