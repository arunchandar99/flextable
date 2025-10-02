/**
 * Configuration Modal Module
 * Handles the measure groups configuration interface
 */

export class ConfigModal {
  constructor(measureGrouping) {
    this.measureGrouping = measureGrouping;
    this.modal = null;
    this.currentData = null;
  }

  /**
   * Initialize the modal HTML
   */
  initializeModal() {
    // Create modal structure
    const modalHTML = `
      <div id="config-modal" class="modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Configure Measure Groups</h2>
            <span class="close">&times;</span>
          </div>
          <div id="groups-container"></div>
          <button id="add-group-btn" class="add-group-btn">Add Group</button>
          <div class="modal-footer">
            <button id="save-config-btn" class="save-btn">Save</button>
            <button id="cancel-config-btn" class="cancel-btn">Cancel</button>
          </div>
        </div>
      </div>
    `;

    // Add to document if not already present
    if (!document.getElementById('config-modal')) {
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      this.modal = document.getElementById('config-modal');
      this.setupEventListeners();
    }
  }

  /**
   * Setup modal event listeners
   */
  setupEventListeners() {
    // Close button
    document.querySelector('.close').onclick = () => this.close();

    // Add group button
    document.getElementById('add-group-btn').onclick = () => this.addGroupToConfig();

    // Save button
    document.getElementById('save-config-btn').onclick = () => this.saveConfiguration();

    // Cancel button
    document.getElementById('cancel-config-btn').onclick = () => this.close();

    // Click outside modal to close
    window.onclick = (event) => {
      if (event.target === this.modal) {
        this.close();
      }
    };
  }

  /**
   * Open the configuration modal
   */
  open(currentData) {
    if (!currentData) {
      alert('Please load data first');
      return;
    }

    this.currentData = currentData;
    this.initializeModal();

    const container = document.getElementById('groups-container');
    container.innerHTML = '';

    // Add existing groups
    this.measureGrouping.getGroups().forEach((group, index) => {
      this.addGroupToConfig(group, index);
    });

    this.modal.style.display = 'block';
  }

  /**
   * Close the modal
   */
  close() {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
  }

  /**
   * Add a group configuration to the modal
   */
  addGroupToConfig(group = null, index = null) {
    const container = document.getElementById('groups-container');
    const groupDiv = document.createElement('div');
    groupDiv.className = 'group-config';

    const isNew = group === null;
    const groupData = group || { name: '', measures: [] };

    // Get numeric columns
    const numericColumns = this.currentData.columnTypes
      .filter(col => {
        const dataType = col.dataType.toLowerCase();
        return dataType === 'float' ||
               dataType === 'integer' ||
               dataType === 'real' ||
               dataType === 'number' ||
               dataType === 'int' ||
               dataType === 'double';
      })
      .map(col => col.name);

    groupDiv.innerHTML = `
      <h4>${isNew ? 'New Group' : 'Edit Group'}</h4>
      <input type="text" placeholder="Group Name (e.g., Revenue)"
             value="${groupData.name}" class="group-name" />
      <div class="measures-list">
        <strong>Select Measures:</strong>
        ${numericColumns.map(col => `
          <div class="measure-checkbox">
            <input type="checkbox" value="${col}"
                   ${groupData.measures.includes(col) ? 'checked' : ''} />
            <label>${col}</label>
          </div>
        `).join('')}
      </div>
      <button class="remove-group-btn" onclick="this.parentElement.remove()">Remove</button>
    `;

    container.appendChild(groupDiv);
  }

  /**
   * Save the configuration
   */
  saveConfiguration() {
    const container = document.getElementById('groups-container');
    const groupConfigs = Array.from(container.querySelectorAll('.group-config'));

    this.measureGrouping.clearGroups();

    groupConfigs.forEach(groupDiv => {
      const name = groupDiv.querySelector('.group-name').value.trim();
      const checkedMeasures = Array.from(groupDiv.querySelectorAll('input[type="checkbox"]:checked'))
        .map(cb => cb.value);

      if (name && checkedMeasures.length >= 2) {
        this.measureGrouping.addGroup(name, checkedMeasures, false);
      }
    });

    // Save to storage
    this.measureGrouping.saveToStorage();

    // Close modal
    this.close();

    // Trigger re-render (this should be handled by the main app)
    if (window.flextableApp && window.flextableApp.refresh) {
      window.flextableApp.refresh();
    }
  }

  /**
   * Get all numeric columns from data
   */
  getNumericColumns(data) {
    if (!data || !data.columnTypes) return [];

    return data.columnTypes
      .filter(col => {
        const dataType = col.dataType.toLowerCase();
        return ['float', 'integer', 'real', 'number', 'int', 'double'].includes(dataType);
      })
      .map(col => col.name);
  }
}

export default ConfigModal;