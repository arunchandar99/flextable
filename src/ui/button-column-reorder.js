// Button-based column reordering that works in Tableau
export function addColumnMoveButtons() {
  console.log('[ColumnReorder] Adding move buttons to columns...');

  const table = document.querySelector('.flextable');
  if (!table) return;

  const headerRow = table.querySelector('thead tr:first-child');
  if (!headerRow) return;

  const headers = headerRow.querySelectorAll('th');

  headers.forEach((header, index) => {
    // Skip if buttons already added
    if (header.querySelector('.ft-column-controls')) return;

    // Create control container
    const controls = document.createElement('div');
    controls.className = 'ft-column-controls';
    controls.style.cssText = 'display: inline-flex; gap: 2px; margin-left: 4px;';

    // Create left arrow button
    if (index > 0) {
      const leftBtn = document.createElement('button');
      leftBtn.innerHTML = '◀';
      leftBtn.style.cssText = 'padding: 2px 4px; font-size: 10px; cursor: pointer; border: 1px solid #ccc; background: white;';
      leftBtn.title = 'Move left';
      leftBtn.onclick = (e) => {
        e.stopPropagation();
        moveColumn(table, index, index - 1);
      };
      controls.appendChild(leftBtn);
    }

    // Create right arrow button
    if (index < headers.length - 1) {
      const rightBtn = document.createElement('button');
      rightBtn.innerHTML = '▶';
      rightBtn.style.cssText = 'padding: 2px 4px; font-size: 10px; cursor: pointer; border: 1px solid #ccc; background: white;';
      rightBtn.title = 'Move right';
      rightBtn.onclick = (e) => {
        e.stopPropagation();
        moveColumn(table, index, index + 1);
      };
      controls.appendChild(rightBtn);
    }

    // Add controls to header
    header.appendChild(controls);
  });
}

function moveColumn(table, fromIndex, toIndex) {
  console.log(`[ColumnReorder] Moving column from ${fromIndex} to ${toIndex}`);

  const rows = table.querySelectorAll('tr');

  rows.forEach(row => {
    const cells = [...row.children];

    if (fromIndex >= cells.length || toIndex >= cells.length) return;

    const fromCell = cells[fromIndex];
    const toCell = cells[toIndex];

    if (toIndex > fromIndex) {
      // Moving right
      row.insertBefore(fromCell, toCell.nextSibling);
    } else {
      // Moving left
      row.insertBefore(fromCell, toCell);
    }
  });

  // Save the new order
  saveColumnOrder(table);

  // Re-add buttons with new positions
  setTimeout(() => {
    addColumnMoveButtons();
  }, 100);
}

function saveColumnOrder(table) {
  const headers = table.querySelectorAll('thead tr:first-child th');
  const columnOrder = Array.from(headers).map(th => {
    // Get text without the control buttons
    const clone = th.cloneNode(true);
    const controls = clone.querySelector('.ft-column-controls');
    if (controls) controls.remove();
    return clone.textContent.trim();
  });

  try {
    const wsName = tableau.extensions.worksheetContent.worksheet.name || 'default';
    const key = `flextable-column-order-${wsName}`;
    localStorage.setItem(key, JSON.stringify(columnOrder));
    console.log('[ColumnReorder] Saved column order:', columnOrder);
  } catch (e) {
    console.error('[ColumnReorder] Failed to save order:', e);
  }
}

export function restoreColumnOrder() {
  try {
    const wsName = tableau.extensions.worksheetContent.worksheet.name || 'default';
    const key = `flextable-column-order-${wsName}`;
    const savedOrder = localStorage.getItem(key);

    if (!savedOrder) return;

    const columnOrder = JSON.parse(savedOrder);
    console.log('[ColumnReorder] Restoring column order:', columnOrder);

    const table = document.querySelector('.flextable');
    if (!table) return;

    // Create a map of column name to column index
    const headerRow = table.querySelector('thead tr:first-child');
    const headers = [...headerRow.querySelectorAll('th')];
    const currentOrder = headers.map(th => {
      const clone = th.cloneNode(true);
      const controls = clone.querySelector('.ft-column-controls');
      if (controls) controls.remove();
      return clone.textContent.trim();
    });

    // Reorder columns to match saved order
    columnOrder.forEach((colName, targetIndex) => {
      const currentIndex = currentOrder.indexOf(colName);
      if (currentIndex !== -1 && currentIndex !== targetIndex) {
        moveColumnSimple(table, currentIndex, targetIndex);
        // Update current order
        currentOrder.splice(currentIndex, 1);
        currentOrder.splice(targetIndex, 0, colName);
      }
    });

  } catch (e) {
    console.error('[ColumnReorder] Failed to restore order:', e);
  }
}

function moveColumnSimple(table, fromIndex, toIndex) {
  const rows = table.querySelectorAll('tr');

  rows.forEach(row => {
    const cells = [...row.children];
    if (fromIndex >= cells.length || toIndex >= cells.length) return;

    const fromCell = cells[fromIndex];

    // Remove from current position
    row.removeChild(fromCell);

    // Insert at new position
    if (toIndex >= row.children.length) {
      row.appendChild(fromCell);
    } else {
      row.insertBefore(fromCell, row.children[toIndex]);
    }
  });
}