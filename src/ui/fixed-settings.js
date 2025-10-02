import { log } from "../utils/logger.js";

export class FixedSettings {
  constructor() {
    this.settings = {
      measureColumns: [],
      dimensionColumns: [],
      details: [],
      tooltips: []
    };
    this.allFields = [];
    this.modal = null;
    this.onSettingsChange = null;
  }

  async initialize(onSettingsChange) {
    this.onSettingsChange = onSettingsChange;
    this.modal = document.getElementById('settings-modal');
    this.setupEventListeners();

    // CRITICAL: Load settings IMMEDIATELY during initialization
    console.log('[FixedSettings] Starting initialization...');
    const success = await this.loadSettings();
    console.log('[FixedSettings] Load result:', success);
    console.log('[FixedSettings] Settings after load:', this.settings);
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

    // Debug settings
    document.getElementById('debug-settings').addEventListener('click', () => {
      this.showDebugInfo();
    });
  }

  async loadSettings() {
    try {
      console.log('[FixedSettings] Loading settings...');

      // Wait for Tableau API
      if (!tableau || !tableau.extensions || !tableau.extensions.settings) {
        console.log('[FixedSettings] Tableau API not ready');
        return false;
      }

      const settingsKey = 'flextable-field-config';
      const saved = tableau.extensions.settings.get(settingsKey);

      console.log('[FixedSettings] Raw saved value:', saved);

      if (saved && saved.trim() !== '') {
        try {
          const parsedSettings = JSON.parse(saved);
          console.log('[FixedSettings] Parsed settings:', parsedSettings);

          if (this.validateSettings(parsedSettings)) {
            this.settings = parsedSettings;
            console.log('[FixedSettings] Settings loaded successfully!');

            // CRITICAL: Trigger settings change immediately
            if (this.onSettingsChange) {
              console.log('[FixedSettings] Triggering settings change callback');
              setTimeout(() => {
                this.onSettingsChange(this.settings);
              }, 100);
            }

            return true;
          }
        } catch (parseError) {
          console.error('[FixedSettings] Failed to parse settings:', parseError);
        }
      }

      console.log('[FixedSettings] No valid settings found, using defaults');
      return false;

    } catch (error) {
      console.error('[FixedSettings] Load failed:', error);
      return false;
    }
  }

  async saveSettings() {
    try {
      const settingsKey = 'flextable-field-config';
      const settingsJson = JSON.stringify(this.settings);

      console.log('[FixedSettings] Saving settings:', settingsJson);

      tableau.extensions.settings.set(settingsKey, settingsJson);
      await tableau.extensions.settings.saveAsync();

      console.log('[FixedSettings] Settings saved successfully');
      return true;
    } catch (error) {
      console.error('[FixedSettings] Save failed:', error);
      return false;
    }
  }

  validateSettings(settings) {
    if (!settings || typeof settings !== 'object') return false;

    const requiredKeys = ['measureColumns', 'dimensionColumns', 'details', 'tooltips'];
    return requiredKeys.every(key =>
      Array.isArray(settings[key]) &&
      settings[key].every(item =>
        item && typeof item === 'object' &&
        typeof item.name === 'string' &&
        typeof item.type === 'string'
      )
    );
  }

  getSettings() {
    console.log('[FixedSettings] getSettings() called, returning:', this.settings);
    return this.settings;
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
    const allConfiguredFields = [
      ...this.settings.measureColumns,
      ...this.settings.dimensionColumns,
      ...this.settings.details,
      ...this.settings.tooltips
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

    const categoryFields = this.settings[this.categoryIdToKey(categoryId)] || [];

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
    this.removeFieldFromCategory(fieldName);

    const categoryKey = this.categoryIdToKey(categoryId);
    if (!this.settings[categoryKey]) {
      this.settings[categoryKey] = [];
    }

    this.settings[categoryKey].push({
      name: fieldName,
      type: fieldType
    });

    log(`Added ${fieldName} to ${categoryKey}`);
  }

  removeFieldFromCategory(fieldName) {
    Object.keys(this.settings).forEach(categoryKey => {
      this.settings[categoryKey] = this.settings[categoryKey].filter(
        field => field.name !== fieldName
      );
    });
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
      console.log('[FixedSettings] Applying settings...');
      const success = await this.saveSettings();

      if (success) {
        alert('Settings saved successfully!');

        if (this.onSettingsChange) {
          this.onSettingsChange(this.settings);
        }

        this.closeModal();
      } else {
        alert('Failed to save settings.');
      }
    } catch (error) {
      console.error('Failed to apply settings:', error);
      alert('Error saving settings: ' + error.message);
    }
  }

  resetSettings() {
    this.settings = {
      measureColumns: [],
      dimensionColumns: [],
      details: [],
      tooltips: []
    };
    this.renderFieldLists();
  }

  showDebugInfo() {
    const settingsKey = 'flextable-field-config';
    const current = tableau.extensions.settings.get(settingsKey);
    const allSettings = tableau.extensions.settings.getAll();

    const debugInfo = `
SETTINGS DEBUG INFO:

Current Key (${settingsKey}):
${current || 'NOT FOUND'}

In-Memory Settings:
${JSON.stringify(this.settings, null, 2)}

All Stored Keys:
${Object.keys(allSettings).join(', ') || 'NONE'}

All Settings:
${JSON.stringify(allSettings, null, 2)}
    `;

    alert(debugInfo);
  }
}