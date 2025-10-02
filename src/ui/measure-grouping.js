// Measure grouping for commission breakdown tables
export class MeasureGrouping {
  constructor() {
    this.groups = {
      'Revenue': [],
      'Costs': [],
      'Commission %': [],
      'Payout': [],
      'Other': []
    };
    this.customGroups = [];
  }

  // Create measure grouping interface
  createGroupingInterface(measures) {
    const dialog = document.createElement('div');
    dialog.className = 'ft-grouping-modal';
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      width: 90%;
      max-width: 1000px;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    `;

    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <h2 style="margin: 0; color: #2c3e50;">Commission Breakdown Setup</h2>
        <button id="close-grouping" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
      </div>

      <div style="display: grid; grid-template-columns: 300px 1fr; gap: 24px;">
        <!-- Available Measures -->
        <div>
          <h3 style="margin: 0 0 12px 0; color: #34495e;">Available Measures</h3>
          <div id="available-measures" style="
            border: 2px dashed #bdc3c7;
            border-radius: 8px;
            min-height: 400px;
            padding: 12px;
            background: #f8f9fa;
            max-height: 400px;
            overflow-y: auto;
          "></div>
        </div>

        <!-- Grouping Area -->
        <div>
          <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0; color: #34495e;">Commission Groups</h3>
            <button id="add-custom-group" style="
              padding: 6px 12px;
              background: #3498db;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
            ">+ Custom Group</button>
          </div>

          <div id="measure-groups" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;"></div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; margin-top: 24px;">
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <label style="display: flex; align-items: center; gap: 8px; font-size: 14px;">
            <input type="checkbox" id="show-subtotals" checked>
            Show group subtotals
          </label>
          <label style="display: flex; align-items: center; gap: 8px; font-size: 14px;">
            <input type="checkbox" id="enable-drill-down" checked>
            Enable drill down/up (Excel-like)
          </label>
          <label style="display: flex; align-items: center; gap: 8px; font-size: 14px;">
            <input type="checkbox" id="auto-collapse" checked>
            Auto-collapse groups initially
          </label>
        </div>
        <div style="display: flex; gap: 12px;">
          <button id="reset-groups" style="
            padding: 10px 20px;
            background: #95a5a6;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
          ">Reset</button>
          <button id="apply-groups" style="
            padding: 10px 24px;
            background: #27ae60;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
          ">Apply Groups</button>
        </div>
      </div>
    `;

    dialog.appendChild(content);
    document.body.appendChild(dialog);

    // Populate available measures
    this.populateAvailableMeasures(measures);
    this.populateGroupingAreas();
    this.setupGroupingEventListeners(dialog);

    return dialog;
  }

  populateAvailableMeasures(measures) {
    const container = document.getElementById('available-measures');
    if (!container) return;

    measures.forEach(measure => {
      if (this.isMeasureGrouped(measure.name)) return; // Skip already grouped

      const item = document.createElement('div');
      item.className = 'ft-measure-item';
      item.draggable = true;
      item.dataset.measureName = measure.name;
      item.style.cssText = `
        padding: 8px 12px;
        margin: 4px 0;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        cursor: move;
        font-size: 13px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 0.2s;
      `;

      item.innerHTML = `
        <span>${measure.name}</span>
        <span style="
          background: #3498db;
          color: white;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 500;
        ">MEASURE</span>
      `;

      // Drag events
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', measure.name);
        item.style.opacity = '0.5';
      });

      item.addEventListener('dragend', () => {
        item.style.opacity = '1';
      });

      container.appendChild(item);
    });
  }

  populateGroupingAreas() {
    const container = document.getElementById('measure-groups');
    if (!container) return;

    // Create default groups
    Object.keys(this.groups).forEach(groupName => {
      this.createGroupArea(container, groupName, this.groups[groupName]);
    });

    // Create custom groups
    this.customGroups.forEach(group => {
      this.createGroupArea(container, group.name, group.measures);
    });
  }

  createGroupArea(container, groupName, measures) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'ft-group-area';
    groupDiv.dataset.groupName = groupName;

    // Color coding for default groups
    const groupColors = {
      'Revenue': '#27ae60',
      'Costs': '#e74c3c',
      'Commission %': '#f39c12',
      'Payout': '#9b59b6',
      'Other': '#95a5a6'
    };

    const color = groupColors[groupName] || '#3498db';

    groupDiv.style.cssText = `
      border: 2px solid ${color};
      border-radius: 8px;
      padding: 12px;
      background: ${color}10;
      min-height: 120px;
    `;

    groupDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h4 style="margin: 0; color: ${color}; font-size: 14px; font-weight: 600;">${groupName}</h4>
        ${!Object.keys(this.groups).includes(groupName) ?
          `<button class="delete-group" style="background: none; border: none; color: #e74c3c; cursor: pointer; font-size: 16px;">&times;</button>` :
          ''
        }
      </div>
      <div class="group-measures" style="min-height: 80px;"></div>
    `;

    // Make droppable
    this.makeGroupDroppable(groupDiv);

    // Add existing measures
    const measuresContainer = groupDiv.querySelector('.group-measures');
    measures.forEach(measureName => {
      this.addMeasureToGroup(measuresContainer, measureName);
    });

    // Delete custom group handler
    const deleteBtn = groupDiv.querySelector('.delete-group');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this.deleteCustomGroup(groupName);
        container.removeChild(groupDiv);
      });
    }

    container.appendChild(groupDiv);
  }

  makeGroupDroppable(groupDiv) {
    groupDiv.addEventListener('dragover', (e) => {
      e.preventDefault();
      groupDiv.style.background = groupDiv.style.background.replace('10', '20');
    });

    groupDiv.addEventListener('dragleave', () => {
      groupDiv.style.background = groupDiv.style.background.replace('20', '10');
    });

    groupDiv.addEventListener('drop', (e) => {
      e.preventDefault();
      const measureName = e.dataTransfer.getData('text/plain');
      const groupName = groupDiv.dataset.groupName;

      this.addMeasureToGroup(groupDiv.querySelector('.group-measures'), measureName);
      this.updateGrouping(groupName, measureName);

      // Remove from available measures
      const measureItem = document.querySelector(`[data-measure-name="${measureName}"]`);
      if (measureItem && measureItem.parentNode.id === 'available-measures') {
        measureItem.remove();
      }

      groupDiv.style.background = groupDiv.style.background.replace('20', '10');
    });
  }

  addMeasureToGroup(container, measureName) {
    const measureDiv = document.createElement('div');
    measureDiv.style.cssText = `
      padding: 6px 10px;
      margin: 3px 0;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    measureDiv.innerHTML = `
      <span>${measureName}</span>
      <button class="remove-measure" style="
        background: none;
        border: none;
        color: #e74c3c;
        cursor: pointer;
        font-size: 14px;
      ">&times;</button>
    `;

    measureDiv.querySelector('.remove-measure').addEventListener('click', () => {
      this.removeMeasureFromGroup(measureName);
      container.removeChild(measureDiv);
    });

    container.appendChild(measureDiv);
  }

  setupGroupingEventListeners(dialog) {
    // Close dialog
    dialog.querySelector('#close-grouping').addEventListener('click', () => {
      document.body.removeChild(dialog);
    });

    // Add custom group
    dialog.querySelector('#add-custom-group').addEventListener('click', () => {
      const name = prompt('Enter group name:');
      if (name && name.trim()) {
        this.addCustomGroup(name.trim());
        this.populateGroupingAreas();
      }
    });

    // Apply groups
    dialog.querySelector('#apply-groups').addEventListener('click', () => {
      const showSubtotals = dialog.querySelector('#show-subtotals').checked;
      const enableDrillDown = dialog.querySelector('#enable-drill-down').checked;
      const autoCollapse = dialog.querySelector('#auto-collapse').checked;
      this.applyGrouping(showSubtotals, enableDrillDown, autoCollapse);
      document.body.removeChild(dialog);
    });

    // Reset groups
    dialog.querySelector('#reset-groups').addEventListener('click', () => {
      this.resetGroups();
      location.reload(); // Simple reset
    });
  }

  updateGrouping(groupName, measureName) {
    if (this.groups[groupName]) {
      this.groups[groupName].push(measureName);
    } else {
      // Custom group
      const customGroup = this.customGroups.find(g => g.name === groupName);
      if (customGroup) {
        customGroup.measures.push(measureName);
      }
    }
  }

  addCustomGroup(name) {
    this.customGroups.push({ name, measures: [] });
  }

  deleteCustomGroup(name) {
    this.customGroups = this.customGroups.filter(g => g.name !== name);
  }

  isMeasureGrouped(measureName) {
    // Check default groups
    for (let group of Object.values(this.groups)) {
      if (group.includes(measureName)) return true;
    }

    // Check custom groups
    for (let group of this.customGroups) {
      if (group.measures.includes(measureName)) return true;
    }

    return false;
  }

  removeMeasureFromGroup(measureName) {
    // Remove from default groups
    Object.keys(this.groups).forEach(groupName => {
      this.groups[groupName] = this.groups[groupName].filter(m => m !== measureName);
    });

    // Remove from custom groups
    this.customGroups.forEach(group => {
      group.measures = group.measures.filter(m => m !== measureName);
    });

    // Add back to available measures
    // Implementation would refresh the available measures list
  }

  resetGroups() {
    this.groups = {
      'Revenue': [],
      'Costs': [],
      'Commission %': [],
      'Payout': [],
      'Other': []
    };
    this.customGroups = [];
  }

  applyGrouping(showSubtotals, enableDrillDown = true, autoCollapse = true) {
    console.log('Applying measure grouping:', this.groups, this.customGroups);
    console.log('Show subtotals:', showSubtotals);
    console.log('Enable drill down:', enableDrillDown);
    console.log('Auto collapse:', autoCollapse);

    // Trigger table re-render with grouping
    window.dispatchEvent(new CustomEvent('measureGroupingChanged', {
      detail: {
        groups: this.groups,
        customGroups: this.customGroups,
        showSubtotals,
        enableDrillDown,
        autoCollapse
      }
    }));
  }
}