// Clean column reordering interface
export function addColumnReorderMenu() {
  console.log('[ColumnReorder] Adding clean reorder menu...');

  // Add reorder button to toolbar
  const toolbar = document.querySelector('.ft-toolbar');
  if (!toolbar) return;

  // Remove existing reorder button if it exists
  const existingBtn = document.getElementById('reorder-columns-btn');
  if (existingBtn) existingBtn.remove();

  const reorderBtn = document.createElement('button');
  reorderBtn.id = 'reorder-columns-btn';
  reorderBtn.className = 'ft-btn';
  reorderBtn.textContent = 'Reorder Columns';
  reorderBtn.style.marginRight = '8px';

  // Insert before export button
  const exportBtn = document.getElementById('export-btn');
  toolbar.insertBefore(reorderBtn, exportBtn);

  reorderBtn.addEventListener('click', () => {
    showColumnReorderDialog();
  });
}

function showColumnReorderDialog() {
  const table = document.querySelector('.flextable');
  if (!table) return;

  const headers = [...table.querySelectorAll('thead tr:first-child th')];
  const columnNames = headers.map(th => {
    // Get text without any controls
    const clone = th.cloneNode(true);
    const controls = clone.querySelector('.ft-column-controls');
    if (controls) controls.remove();
    return clone.textContent.trim();
  });

  // Create modal dialog
  const dialog = document.createElement('div');
  dialog.className = 'ft-reorder-modal';
  dialog.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    border-radius: 8px;
    padding: 20px;
    width: 400px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  `;

  content.innerHTML = `
    <h3 style="margin: 0 0 16px 0;">Reorder Columns</h3>
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #666;">
      Drag columns to reorder them, or use the up/down buttons.
    </p>
    <div id="column-list" style="border: 1px solid #ddd; border-radius: 4px; max-height: 300px; overflow-y: auto;"></div>
    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
      <button id="cancel-reorder" class="ft-btn ft-btn-secondary">Cancel</button>
      <button id="apply-reorder" class="ft-btn ft-btn-primary">Apply</button>
    </div>
  `;

  dialog.appendChild(content);
  document.body.appendChild(dialog);

  // Create column list
  const columnList = content.querySelector('#column-list');
  let currentOrder = [...columnNames];

  function renderColumnList() {
    columnList.innerHTML = '';

    currentOrder.forEach((columnName, index) => {
      const item = document.createElement('div');
      item.style.cssText = `
        display: flex;
        align-items: center;
        padding: 8px 12px;
        border-bottom: 1px solid #eee;
        background: white;
        cursor: move;
      `;

      item.innerHTML = `
        <div style="flex: 1; padding: 0 8px;">${columnName}</div>
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <button class="move-up-btn" style="padding: 2px 6px; font-size: 12px; border: 1px solid #ccc; background: white; cursor: pointer;" ${index === 0 ? 'disabled' : ''}>▲</button>
          <button class="move-down-btn" style="padding: 2px 6px; font-size: 12px; border: 1px solid #ccc; background: white; cursor: pointer;" ${index === currentOrder.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
      `;

      // Add event listeners
      const moveUpBtn = item.querySelector('.move-up-btn');
      const moveDownBtn = item.querySelector('.move-down-btn');

      moveUpBtn?.addEventListener('click', () => {
        if (index > 0) {
          [currentOrder[index], currentOrder[index - 1]] = [currentOrder[index - 1], currentOrder[index]];
          renderColumnList();
        }
      });

      moveDownBtn?.addEventListener('click', () => {
        if (index < currentOrder.length - 1) {
          [currentOrder[index], currentOrder[index + 1]] = [currentOrder[index + 1], currentOrder[index]];
          renderColumnList();
        }
      });

      columnList.appendChild(item);
    });
  }

  renderColumnList();

  // Handle buttons
  content.querySelector('#cancel-reorder').addEventListener('click', () => {
    document.body.removeChild(dialog);
  });

  content.querySelector('#apply-reorder').addEventListener('click', () => {
    applyColumnOrder(table, currentOrder);
    document.body.removeChild(dialog);
  });

  // Handle click outside
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      document.body.removeChild(dialog);
    }
  });
}

function applyColumnOrder(table, newOrder) {
  console.log('[ColumnReorder] Applying new order:', newOrder);

  const rows = table.querySelectorAll('tr');

  // Get current column mapping
  const headers = [...table.querySelectorAll('thead tr:first-child th')];
  const currentOrder = headers.map(th => {
    const clone = th.cloneNode(true);
    const controls = clone.querySelector('.ft-column-controls');
    if (controls) controls.remove();
    return clone.textContent.trim();
  });

  // Create mapping from column name to current index
  const columnIndexMap = {};
  currentOrder.forEach((name, index) => {
    columnIndexMap[name] = index;
  });

  // Reorder each row
  rows.forEach(row => {
    const cells = [...row.children];
    const newCells = [];

    // Collect cells in new order
    newOrder.forEach(columnName => {
      const oldIndex = columnIndexMap[columnName];
      if (oldIndex !== undefined && cells[oldIndex]) {
        newCells.push(cells[oldIndex].cloneNode(true));
      }
    });

    // Clear row
    while (row.firstChild) {
      row.removeChild(row.firstChild);
    }

    // Add cells in new order
    newCells.forEach(cell => {
      row.appendChild(cell);
    });
  });

  // Save the new order
  saveColumnOrder(table);

  console.log('[ColumnReorder] Column order applied successfully');
}

function saveColumnOrder(table) {
  const headers = table.querySelectorAll('thead tr:first-child th');
  const columnOrder = Array.from(headers).map(th => {
    const clone = th.cloneNode(true);
    const controls = clone.querySelector('.ft-column-controls');
    if (controls) controls.remove();
    return clone.textContent.trim();
  });

  try {
    const wsName = tableau.extensions.dashboardContent?.dashboard?.name || 'default';
    const key = `flextable-column-order-${wsName}`;
    localStorage.setItem(key, JSON.stringify(columnOrder));
    console.log('[ColumnReorder] Saved column order:', columnOrder);
  } catch (e) {
    console.error('[ColumnReorder] Failed to save order:', e);
  }
}

export function restoreColumnOrder() {
  try {
    const wsName = tableau.extensions.dashboardContent?.dashboard?.name || 'default';
    const key = `flextable-column-order-${wsName}`;
    const savedOrder = localStorage.getItem(key);

    if (savedOrder) {
      const columnOrder = JSON.parse(savedOrder);
      const table = document.querySelector('.flextable');
      if (table) {
        applyColumnOrder(table, columnOrder);
      }
    }
  } catch (e) {
    console.error('[ColumnReorder] Failed to restore order:', e);
  }
}