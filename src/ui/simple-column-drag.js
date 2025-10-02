// Simple column drag reordering that actually works
export function enableColumnDrag() {
  let draggedIndex = null;

  function setupDrag() {
    const table = document.querySelector('.flextable');
    if (!table) return;

    const headers = table.querySelectorAll('thead tr:first-child th');

    headers.forEach((header, index) => {
      // Make header draggable
      header.draggable = true;
      header.style.cursor = 'move';
      header.dataset.columnIndex = index;

      // Drag start
      header.ondragstart = (e) => {
        draggedIndex = index;
        e.dataTransfer.effectAllowed = 'move';
        header.style.opacity = '0.5';
      };

      // Drag over
      header.ondragover = (e) => {
        e.preventDefault();
        return false;
      };

      // Drop
      header.ondrop = (e) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        // Move columns
        moveColumn(table, draggedIndex, index);
        draggedIndex = null;

        // Re-setup drag for new order
        setTimeout(setupDrag, 10);
        return false;
      };

      // Drag end
      header.ondragend = () => {
        header.style.opacity = '1';
        headers.forEach(h => h.style.opacity = '1');
      };
    });
  }

  function moveColumn(table, from, to) {
    const rows = table.querySelectorAll('tr');

    rows.forEach(row => {
      const cells = Array.from(row.children);
      if (from >= cells.length || to >= cells.length) return;

      const draggedCell = cells[from];
      const targetCell = cells[to];

      // Remove dragged cell
      draggedCell.parentNode.removeChild(draggedCell);

      // Insert at new position
      if (from < to) {
        // Moving right
        if (targetCell.nextSibling) {
          row.insertBefore(draggedCell, targetCell.nextSibling);
        } else {
          row.appendChild(draggedCell);
        }
      } else {
        // Moving left
        row.insertBefore(draggedCell, targetCell);
      }
    });

    console.log(`[Column Drag] Moved column from position ${from} to ${to}`);

    // Save column order to localStorage
    saveColumnOrder();
  }

  function saveColumnOrder() {
    const table = document.querySelector('.flextable');
    if (!table) return;

    const headers = table.querySelectorAll('thead tr:first-child th');
    const columnOrder = Array.from(headers).map(th => th.textContent.trim());

    const wsName = getWorksheetName();
    const key = `flextable-column-order-${wsName}`;
    localStorage.setItem(key, JSON.stringify(columnOrder));

    console.log('[Column Drag] Saved column order:', columnOrder);
  }

  function getWorksheetName() {
    try {
      return tableau.extensions.worksheetContent.worksheet.name || 'default';
    } catch {
      return 'default';
    }
  }

  // Initial setup
  setupDrag();

  // Apply saved column order if exists
  applySavedColumnOrder();
}

export function applySavedColumnOrder() {
  const table = document.querySelector('.flextable');
  if (!table) return;

  const wsName = getWorksheetName();
  const key = `flextable-column-order-${wsName}`;
  const savedOrder = localStorage.getItem(key);

  if (!savedOrder) return;

  try {
    const columnOrder = JSON.parse(savedOrder);
    console.log('[Column Drag] Applying saved column order:', columnOrder);

    const rows = table.querySelectorAll('tr');

    rows.forEach(row => {
      const cells = Array.from(row.children);
      const cellMap = {};

      // Create map of column name to cell
      cells.forEach((cell, i) => {
        const columnName = i === 0 && row.parentNode.tagName === 'THEAD'
          ? cell.textContent.trim()
          : table.querySelector(`thead tr:first-child th:nth-child(${i + 1})`).textContent.trim();

        if (!cellMap[columnName]) {
          cellMap[columnName] = cell;
        }
      });

      // Clear row
      while (row.firstChild) {
        row.removeChild(row.firstChild);
      }

      // Re-add cells in saved order
      columnOrder.forEach(columnName => {
        if (cellMap[columnName]) {
          row.appendChild(cellMap[columnName]);
        }
      });

      // Add any missing cells (new columns)
      Object.values(cellMap).forEach(cell => {
        if (!row.contains(cell)) {
          row.appendChild(cell);
        }
      });
    });

  } catch (error) {
    console.error('[Column Drag] Failed to apply saved order:', error);
  }

  function getWorksheetName() {
    try {
      return tableau.extensions.worksheetContent.worksheet.name || 'default';
    } catch {
      return 'default';
    }
  }
}