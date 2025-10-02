// Enable drag-and-drop column reordering
import { log } from "../utils/logger.js";

export function initColumnDragReorder() {
  const table = document.querySelector('.flextable');
  if (!table) return;

  const headers = table.querySelectorAll('thead tr:first-child th');
  let draggedColumn = null;
  let draggedColumnIndex = -1;

  headers.forEach((header, index) => {
    // Skip row number column and make headers draggable
    if (header.classList.contains('ft-rownum')) return;

    header.draggable = true;
    header.style.cursor = 'move';

    // Add visual indicator on hover
    header.addEventListener('mouseenter', () => {
      if (!header.classList.contains('ft-dragging')) {
        header.style.opacity = '0.9';
      }
    });

    header.addEventListener('mouseleave', () => {
      if (!header.classList.contains('ft-dragging')) {
        header.style.opacity = '1';
      }
    });

    // Drag start
    header.addEventListener('dragstart', (e) => {
      draggedColumn = header;
      draggedColumnIndex = index;
      header.classList.add('ft-dragging');
      header.style.opacity = '0.5';

      // Store column index for moving
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', header.innerHTML);

      log(`Started dragging column: ${header.textContent.trim()}`);
    });

    // Drag over - allow drop
    header.addEventListener('dragover', (e) => {
      if (e.preventDefault) {
        e.preventDefault(); // Allows us to drop
      }
      e.dataTransfer.dropEffect = 'move';

      // Visual feedback - show drop location
      const rect = header.getBoundingClientRect();
      const midpoint = rect.left + rect.width / 2;

      if (e.clientX < midpoint) {
        header.style.borderLeft = '3px solid #007acc';
        header.style.borderRight = '';
      } else {
        header.style.borderRight = '3px solid #007acc';
        header.style.borderLeft = '';
      }

      return false;
    });

    // Drag leave - remove visual feedback
    header.addEventListener('dragleave', () => {
      header.style.borderLeft = '';
      header.style.borderRight = '';
    });

    // Drop - perform the column move
    header.addEventListener('drop', (e) => {
      if (e.stopPropagation) {
        e.stopPropagation(); // Stops some browsers from redirecting
      }

      header.style.borderLeft = '';
      header.style.borderRight = '';

      if (draggedColumn !== header) {
        const targetIndex = index;

        // Determine if dropping before or after
        const rect = header.getBoundingClientRect();
        const midpoint = rect.left + rect.width / 2;
        const insertBefore = e.clientX < midpoint;

        log(`Dropping column at position ${targetIndex}, insertBefore: ${insertBefore}`);

        // Move the columns
        moveTableColumn(table, draggedColumnIndex, targetIndex, insertBefore);
      }

      return false;
    });

    // Drag end - cleanup
    header.addEventListener('dragend', () => {
      header.classList.remove('ft-dragging');
      header.style.opacity = '1';

      // Clean up all headers
      headers.forEach(h => {
        h.style.borderLeft = '';
        h.style.borderRight = '';
      });

      draggedColumn = null;
      draggedColumnIndex = -1;
    });
  });

  log('Column drag reordering initialized');
}

function moveTableColumn(table, fromIndex, toIndex, insertBefore) {
  // Get all rows (header and body)
  const rows = table.querySelectorAll('tr');

  rows.forEach(row => {
    const cells = row.querySelectorAll('th, td');

    if (fromIndex < cells.length && toIndex < cells.length) {
      const cellToMove = cells[fromIndex];
      const targetCell = cells[toIndex];

      if (insertBefore && fromIndex > toIndex) {
        // Moving left - insert before target
        row.insertBefore(cellToMove, targetCell);
      } else if (!insertBefore && fromIndex < toIndex) {
        // Moving right - insert after target
        row.insertBefore(cellToMove, targetCell.nextSibling);
      } else if (insertBefore && fromIndex < toIndex) {
        // Moving right but dropping on left side of target
        row.insertBefore(cellToMove, targetCell);
      } else if (!insertBefore && fromIndex > toIndex) {
        // Moving left but dropping on right side of target
        row.insertBefore(cellToMove, targetCell.nextSibling);
      }
    }
  });

  // Re-initialize drag handlers with new indices
  setTimeout(() => {
    initColumnDragReorder();
  }, 100);

  log(`Column moved from index ${fromIndex} to ${toIndex}`);
}

// Add CSS for dragging state
export function addDragStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .flextable th.ft-dragging {
      opacity: 0.5;
      cursor: grabbing !important;
    }

    .flextable th[draggable="true"] {
      cursor: grab;
      transition: opacity 0.2s;
      user-select: none;
    }

    .flextable th[draggable="true"]:active {
      cursor: grabbing;
    }

    /* Prevent text selection during drag */
    .flextable th[draggable="true"] * {
      pointer-events: none;
      user-select: none;
    }

    /* Visual feedback for drop zone */
    .flextable th {
      transition: border 0.2s;
    }
  `;
  document.head.appendChild(style);
}