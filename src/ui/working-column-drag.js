// Column reordering that ACTUALLY WORKS
export function enableWorkingColumnDrag() {
  console.log('[ColumnDrag] Initializing column drag...');

  // Wait for table to be fully rendered
  setTimeout(() => {
    setupColumnDragging();
  }, 100);
}

function setupColumnDragging() {
  const table = document.querySelector('.flextable');
  if (!table) {
    console.error('[ColumnDrag] No table found!');
    return;
  }

  // Remove any existing sort handlers that might interfere
  const headers = table.querySelectorAll('thead tr:first-child th');
  console.log('[ColumnDrag] Found', headers.length, 'headers');

  let draggedColumnIndex = null;

  headers.forEach((header, index) => {
    // Remove existing click handlers that might interfere
    const newHeader = header.cloneNode(true);
    header.parentNode.replaceChild(newHeader, header);

    // Make draggable
    newHeader.draggable = true;
    newHeader.style.cursor = 'move';
    newHeader.style.userSelect = 'none';

    // Add visual style
    newHeader.addEventListener('mouseenter', () => {
      newHeader.style.background = '#e0e0e0';
    });

    newHeader.addEventListener('mouseleave', () => {
      newHeader.style.background = '';
    });

    // Drag start
    newHeader.addEventListener('dragstart', (e) => {
      draggedColumnIndex = index;
      e.dataTransfer.effectAllowed = 'move';
      newHeader.style.opacity = '0.4';
      console.log('[ColumnDrag] Started dragging column', index);
    });

    // Drag end
    newHeader.addEventListener('dragend', () => {
      newHeader.style.opacity = '';
      draggedColumnIndex = null;
    });

    // Drag over - allow drop
    newHeader.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      return false;
    });

    // Drop
    newHeader.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (draggedColumnIndex === null || draggedColumnIndex === index) {
        console.log('[ColumnDrag] Invalid drop');
        return;
      }

      console.log('[ColumnDrag] Dropping column', draggedColumnIndex, 'at position', index);

      // Move the actual columns
      swapColumns(table, draggedColumnIndex, index);

      // Reset
      draggedColumnIndex = null;

      // Re-setup after DOM changes
      setTimeout(() => setupColumnDragging(), 100);

      return false;
    });
  });
}

function swapColumns(table, fromIndex, toIndex) {
  console.log('[ColumnDrag] Swapping columns', fromIndex, 'and', toIndex);

  const rows = table.querySelectorAll('tr');

  rows.forEach(row => {
    const cells = [...row.children];

    if (fromIndex >= cells.length || toIndex >= cells.length) {
      console.error('[ColumnDrag] Index out of bounds');
      return;
    }

    const fromCell = cells[fromIndex];
    const toCell = cells[toIndex];

    // Create placeholders to mark positions
    const fromPlaceholder = document.createElement('td');
    const toPlaceholder = document.createElement('td');

    // Insert placeholders
    row.insertBefore(fromPlaceholder, fromCell);
    row.insertBefore(toPlaceholder, toCell);

    // Move cells
    row.insertBefore(fromCell, toPlaceholder);
    row.insertBefore(toCell, fromPlaceholder);

    // Remove placeholders
    row.removeChild(fromPlaceholder);
    row.removeChild(toPlaceholder);
  });

  console.log('[ColumnDrag] Column swap complete');
}