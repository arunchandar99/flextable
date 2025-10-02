import { log } from "../utils/logger.js";

export class SimpleSettingsUI {
  constructor(worksheetSettings, onSettingsChange) {
    this.worksheetSettings = worksheetSettings;
    this.onSettingsChange = onSettingsChange;
    this.allFields = [];
    this.modal = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Configure button
    document.getElementById('configure-btn').addEventListener('click', () => {
      this.openModal();
    });

    // Close modal
    document.getElementById('close-modal').addEventListener('click', () => {
      this.closeModal();
    });

    // Apply settings
    document.getElementById('apply-settings').addEventListener('click', () => {
      this.applySettings();
    });

    // Reset settings
    document.getElementById('reset-settings').addEventListener('click', () => {
      this.resetSettings();
    });

    this.modal = document.getElementById('settings-modal');
  }

  async openModal() {
    await this.refreshAvailableFields();
    this.renderFieldLists();
    this.modal.style.display = 'flex';
  }

  closeModal() {
    this.modal.style.display = 'none';
  }

  async refreshAvailableFields() {
    try {
      const worksheet = tableau.extensions.worksheetContent.worksheet;
      const summary = await worksheet.getSummaryDataAsync({ ignoreSelection: true });

      this.allFields = summary.columns.map(col => ({
        name: col.fieldName,
        dataType: col.dataType,
        type: this.inferFieldType(col),
        isInUse: this.isFieldInUse(col.fieldName)
      }));

      log('Available fields:', this.allFields);
    } catch (error) {
      console.error('Failed to get fields:', error);
      this.allFields = [];
    }
  }

  inferFieldType(column) {
    switch (column.dataType) {
      case 'int':
      case 'float':
        return 'measure';
      case 'string':
      case 'bool':
      case 'date':
      case 'datetime':
        return 'dimension';
      default:
        return 'dimension';
    }
  }

  isFieldInUse(fieldName) {
    const settings = this.worksheetSettings.getSettings();
    const allConfiguredFields = [
      ...settings.measureColumns,
      ...settings.dimensionColumns,
      ...settings.details,
      ...settings.tooltips
    ];

    return allConfiguredFields.some(field => field.name === fieldName);
  }

  renderFieldLists() {
    this.allFields.forEach(field => {
      field.isInUse = this.isFieldInUse(field.name);
    });

    this.renderAvailableFields();
    this.renderFieldCategory('measure-columns');
    this.renderFieldCategory('dimension-columns');
    this.renderFieldCategory('details');
    this.renderFieldCategory('tooltips');
  }

  renderAvailableFields() {
    const container = document.getElementById('available-fields');
    container.innerHTML = '';

    const availableFields = this.allFields.filter(field => !field.isInUse);

    availableFields.forEach(field => {
      const div = document.createElement('div');
      div.className = 'ft-field-item';
      div.innerHTML = `
        <span class="ft-field-name">${field.name}</span>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="ft-field-type ${field.type}">${field.type.charAt(0).toUpperCase() + field.type.slice(1)}</span>
          <button class="ft-field-add" title="Click to add">+</button>
        </div>
      `;

      div.querySelector('.ft-field-add').addEventListener('click', () => {
        this.showFieldMoveDialog(field);
      });

      container.appendChild(div);
    });

    if (availableFields.length === 0) {
      container.innerHTML = '<div style="color: #999; font-style: italic; padding: 20px;">All fields are configured</div>';
    }
  }

  renderFieldCategory(categoryId) {
    const container = document.getElementById(categoryId);
    container.innerHTML = '';

    const settings = this.worksheetSettings.getSettings();
    const categoryFields = settings[this.categoryIdToKey(categoryId)] || [];

    categoryFields.forEach((field) => {
      const div = document.createElement('div');
      div.className = 'ft-field-item';
      div.innerHTML = `
        <span class="ft-field-name">${field.name}</span>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="ft-field-type ${field.type}">${field.type.charAt(0).toUpperCase() + field.type.slice(1)}</span>
          <button class="ft-field-remove" title="Remove">&times;</button>
        </div>
      `;

      div.querySelector('.ft-field-remove').addEventListener('click', () => {
        this.removeFieldFromCategory(field.name);
        this.renderFieldLists();
      });

      container.appendChild(div);
    });
  }

  showFieldMoveDialog(field) {
    const categories = [
      { id: 'measure-columns', name: 'Measure Columns' },
      { id: 'dimension-columns', name: 'Dimension Columns' },
      { id: 'details', name: 'Details' },
      { id: 'tooltips', name: 'Tooltips' }
    ];

    const buttons = categories.map(cat =>
      `<button class="ft-btn ft-category-btn" data-category="${cat.id}">${cat.name}</button>`
    ).join('');

    const dialog = document.createElement('div');
    dialog.className = 'ft-field-dialog';
    dialog.innerHTML = `
      <div class="ft-dialog-content">
        <h4>Move "${field.name}" to:</h4>
        <div class="ft-dialog-buttons">
          ${buttons}
          <button class="ft-btn ft-btn-secondary ft-cancel-btn">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    dialog.querySelectorAll('.ft-category-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const categoryId = btn.dataset.category;
        this.addFieldToCategory(field.name, field.type, categoryId);
        this.renderFieldLists();
        document.body.removeChild(dialog);
      });
    });

    dialog.querySelector('.ft-cancel-btn').addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
  }

  addFieldToCategory(fieldName, fieldType, categoryId) {
    const settings = this.worksheetSettings.getSettings();

    // Remove from other categories first
    this.removeFieldFromCategory(fieldName);

    // Add to new category
    const categoryKey = this.categoryIdToKey(categoryId);
    if (!settings[categoryKey]) {
      settings[categoryKey] = [];
    }

    settings[categoryKey].push({
      name: fieldName,
      type: fieldType
    });

    this.worksheetSettings.updateSettings(settings);
    log(`Added ${fieldName} to ${categoryKey}`);
  }

  removeFieldFromCategory(fieldName) {
    const settings = this.worksheetSettings.getSettings();

    Object.keys(settings).forEach(categoryKey => {
      settings[categoryKey] = settings[categoryKey].filter(
        field => field.name !== fieldName
      );
    });

    this.worksheetSettings.updateSettings(settings);
  }

  categoryIdToKey(categoryId) {
    const mapping = {
      'measure-columns': 'measureColumns',
      'dimension-columns': 'dimensionColumns',
      'details': 'details',
      'tooltips': 'tooltips'
    };
    return mapping[categoryId] || categoryId;
  }

  async applySettings() {
    try {
      console.log('APPLYING SETTINGS - SAVING TO WORKSHEET NAME...');

      const success = await this.worksheetSettings.save();

      if (success) {
        alert('Settings saved successfully to worksheet name!');

        if (this.onSettingsChange) {
          this.onSettingsChange(this.worksheetSettings.getSettings());
        }

        this.closeModal();
      } else {
        alert('Failed to save settings. Check console for details.');
      }

    } catch (error) {
      console.error('Failed to apply settings:', error);
      alert('Error saving settings: ' + error.message);
    }
  }

  resetSettings() {
    this.worksheetSettings.updateSettings({
      measureColumns: [],
      dimensionColumns: [],
      details: [],
      tooltips: []
    });
    this.renderFieldLists();
  }
}