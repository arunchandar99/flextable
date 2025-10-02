import { log } from "../utils/logger.js";

export class SettingsManager {
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

    // Don't load settings here - wait for explicit loadSettings call
    // Show loading status for debugging
    console.log('[FlexTable] SettingsManager initialized (settings not loaded yet)');
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

    // Modal backdrop click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
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

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.style.display !== 'none') {
        this.closeModal();
      }
    });
  }

  async openModal() {
    await this.refreshAvailableFields();
    this.renderFieldLists();
    this.modal.style.display = 'flex';
  }

  closeModal() {
    this.modal.style.display = 'none';
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

    // Handle category selection
    dialog.querySelectorAll('.ft-category-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const categoryId = btn.dataset.category;
        this.addFieldToCategory(field.name, field.type, categoryId);
        this.renderFieldLists();
        document.body.removeChild(dialog);
      });
    });

    // Handle cancel
    dialog.querySelector('.ft-cancel-btn').addEventListener('click', () => {
      document.body.removeChild(dialog);
    });

    // Click outside to close
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        document.body.removeChild(dialog);
      }
    });
  }

  async refreshAvailableFields() {
    try {
      // Get current worksheet and its fields
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
    // Tableau field types: string, int, float, bool, date, datetime
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
    // Update isInUse status for all fields
    this.allFields.forEach(field => {
      field.isInUse = this.isFieldInUse(field.name);
    });

    // Render available fields
    this.renderAvailableFields();

    // Render configured field categories
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
      const fieldElement = this.createFieldElement(field);
      container.appendChild(fieldElement);
    });

    if (availableFields.length === 0) {
      container.innerHTML = '<div style="color: #999; font-style: italic; padding: 20px;">All fields are configured</div>';
    }
  }

  renderFieldCategory(categoryId) {
    const container = document.getElementById(categoryId);
    container.innerHTML = '';

    const categoryFields = this.settings[this.categoryIdToKey(categoryId)] || [];

    categoryFields.forEach((field, index) => {
      const fieldElement = this.createFieldElement(field, true, index, categoryId);
      container.appendChild(fieldElement);
    });
  }

  createFieldElement(field, showRemove = false, fieldIndex = -1, categoryId = null) {
    const div = document.createElement('div');
    div.className = 'ft-field-item';
    div.draggable = false; // Disable all dragging to prevent Tableau interference
    div.dataset.fieldName = field.name;
    div.dataset.fieldType = field.type;

    div.innerHTML = `
      ${showRemove ? `
        <div class="ft-reorder-buttons">
          <button class="ft-move-btn ft-move-up" title="Move up" ${fieldIndex === 0 ? 'disabled' : ''}>▲</button>
          <button class="ft-move-btn ft-move-down" title="Move down">▼</button>
        </div>
      ` : ''}
      <span class="ft-field-name">${field.name}</span>
      <div style="display: flex; align-items: center; gap: 6px;">
        <span class="ft-field-type ${field.type}">${field.type.charAt(0).toUpperCase() + field.type.slice(1)}</span>
        ${showRemove ? '<button class="ft-field-remove" title="Remove">&times;</button>' : '<button class="ft-field-add" title="Click to add">+</button>'}
      </div>
    `;

    // Click to select field (for available fields)
    if (!showRemove) {
      div.addEventListener('click', () => {
        this.showFieldMoveDialog(field);
      });
    }

    // Reorder buttons for configured fields
    if (showRemove && categoryId) {
      const moveUpBtn = div.querySelector('.ft-move-up');
      const moveDownBtn = div.querySelector('.ft-move-down');

      if (moveUpBtn) {
        moveUpBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.moveFieldUp(field.name, categoryId);
        });
      }

      if (moveDownBtn) {
        moveDownBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.moveFieldDown(field.name, categoryId);
        });
      }

      // Update move down button state
      const categoryFields = this.settings[this.categoryIdToKey(categoryId)] || [];
      if (fieldIndex === categoryFields.length - 1) {
        moveDownBtn.disabled = true;
      }
    }

    // Remove button
    if (showRemove) {
      const removeBtn = div.querySelector('.ft-field-remove');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeFieldFromCategory(field.name);
        this.renderFieldLists();
      });
    }

    return div;
  }

  setupReorderDropZone(container, categoryId) {
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      // Get the dragged element and target position
      const afterElement = this.getDragAfterElement(container, e.clientY);
      const dragging = document.querySelector('.ft-dragging');

      if (afterElement == null) {
        container.appendChild(dragging);
      } else {
        container.insertBefore(dragging, afterElement);
      }
    });

    container.addEventListener('drop', (e) => {
      e.preventDefault();

      let fieldData;
      try {
        fieldData = JSON.parse(e.dataTransfer.getData('application/json'));
      } catch {
        return;
      }

      if (fieldData && fieldData.action === 'reorder') {
        // Update the order in settings based on DOM order
        this.updateFieldOrder(categoryId);
        this.renderFieldLists();
      }
    });
  }

  getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.ft-field-item:not(.ft-dragging)')];

    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  moveFieldUp(fieldName, categoryId) {
    const categoryKey = this.categoryIdToKey(categoryId);
    const fields = this.settings[categoryKey];
    const index = fields.findIndex(f => f.name === fieldName);

    if (index > 0) {
      // Swap with previous field
      [fields[index], fields[index - 1]] = [fields[index - 1], fields[index]];
      this.renderFieldLists();
    }
  }

  moveFieldDown(fieldName, categoryId) {
    const categoryKey = this.categoryIdToKey(categoryId);
    const fields = this.settings[categoryKey];
    const index = fields.findIndex(f => f.name === fieldName);

    if (index < fields.length - 1) {
      // Swap with next field
      [fields[index], fields[index + 1]] = [fields[index + 1], fields[index]];
      this.renderFieldLists();
    }
  }

  addFieldToCategory(fieldName, fieldType, categoryId) {
    // Remove from other categories first
    this.removeFieldFromCategory(fieldName);

    // Add to new category
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
      await this.saveSettings();
      // Verify settings were actually saved
      await this.verifySettings();

      // Show success message in UI
      this.showStatusMessage('Settings saved successfully!', 'success');

      if (this.onSettingsChange) {
        this.onSettingsChange(this.settings);
      }

      // Close modal after brief delay to show success message
      setTimeout(() => {
        this.closeModal();
      }, 1000);

      log('Settings applied and verified:', this.settings);
    } catch (error) {
      console.error('Failed to apply settings:', error);
      this.showStatusMessage('Failed to save settings. Please try again.', 'error');
    }
  }

  showStatusMessage(message, type = 'info') {
    // Remove any existing status message
    const existing = document.querySelector('.ft-status-message');
    if (existing) existing.remove();

    const statusDiv = document.createElement('div');
    statusDiv.className = `ft-status-message ft-status-${type}`;
    statusDiv.textContent = message;

    // Add to modal footer
    const modalFooter = document.querySelector('.ft-modal-footer');
    if (modalFooter) {
      modalFooter.insertBefore(statusDiv, modalFooter.firstChild);

      // Auto-remove after 3 seconds
      setTimeout(() => {
        if (statusDiv.parentNode) {
          statusDiv.remove();
        }
      }, 3000);
    }
  }

  async verifySettings() {
    const settingsKey = 'flextable-field-config';
    const saved = tableau.extensions.settings.get(settingsKey);
    if (!saved) {
      throw new Error('Settings were not saved properly');
    }
    const parsed = JSON.parse(saved);
    log('Settings verification successful:', parsed);
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

  async saveSettings() {
    try {
      // Use a stable key that doesn't depend on worksheet name
      const settingsKey = 'flextable-field-config';
      const settingsJson = JSON.stringify(this.settings);

      console.log('[FlexTable] Attempting to save settings:', settingsJson);

      // Method 1: Save to Tableau settings
      await tableau.extensions.settings.set(settingsKey, settingsJson);
      await tableau.extensions.settings.saveAsync();

      // Method 2: ALSO save to localStorage as backup
      try {
        localStorage.setItem('flextable-backup-settings', settingsJson);
        console.log('[FlexTable] Backup settings saved to localStorage');
      } catch (localError) {
        console.warn('[FlexTable] Failed to save backup settings:', localError);
      }

      // Method 3: AGGRESSIVE - Save to window object (survives some reloads)
      try {
        window.flextableSettings = settingsJson;
        console.log('[FlexTable] Settings saved to window object');
      } catch (windowError) {
        console.warn('[FlexTable] Failed to save to window:', windowError);
      }

      // Method 4: DESPERATE - Try sessionStorage
      try {
        sessionStorage.setItem('flextable-session-settings', settingsJson);
        console.log('[FlexTable] Settings saved to sessionStorage');
      } catch (sessionError) {
        console.warn('[FlexTable] Failed to save to sessionStorage:', sessionError);
      }

      // Verify the save worked
      const savedValue = tableau.extensions.settings.get(settingsKey);
      console.log('[FlexTable] Settings saved and verified:', savedValue);

      log('Settings saved successfully');
    } catch (error) {
      console.error('[FlexTable] Failed to save settings:', error);
      throw error;
    }
  }

  async loadSettings() {
    try {
      // IMMEDIATE: Set up persistence monitoring
      this.startPersistenceMonitoring();

      // Ensure Tableau extensions API is ready
      if (!tableau || !tableau.extensions || !tableau.extensions.settings) {
        console.log('[FlexTable] Tableau extensions API not ready, using defaults');
        this.settings = {
          measureColumns: [],
          dimensionColumns: [],
          details: [],
          tooltips: []
        };
        return;
      }

      // Use the same stable key
      const settingsKey = 'flextable-field-config';
      const saved = tableau.extensions.settings.get(settingsKey);

      console.log('[FlexTable] Loading settings, raw value:', saved);
      console.log('[FlexTable] All stored settings:', tableau.extensions.settings.getAll());

      if (saved && saved.trim() !== '') {
        try {
          const parsedSettings = JSON.parse(saved);
          console.log('[FlexTable] Parsed settings:', parsedSettings);

          // Validate the structure
          if (this.validateSettings(parsedSettings)) {
            this.settings = parsedSettings;
            console.log('[FlexTable] Settings loaded successfully:', this.settings);
            log('Settings loaded successfully:', this.settings);

            // Trigger immediate UI update
            if (this.onSettingsChange) {
              setTimeout(() => this.onSettingsChange(this.settings), 100);
            }
            return;
          } else {
            console.log('[FlexTable] Invalid settings format, using defaults');
            log('Invalid settings format, using defaults');
          }
        } catch (parseError) {
          console.error('[FlexTable] Failed to parse settings JSON:', parseError);
        }
      } else {
        console.log('[FlexTable] No settings found for key:', settingsKey);
      }

      // Try ALL backup methods - one of them has to work!
      console.log('[FlexTable] Trying ALL backup storage methods...');

      // Method 2: localStorage backup
      try {
        const backupSettings = localStorage.getItem('flextable-backup-settings');
        console.log('[FlexTable] localStorage backup value:', backupSettings);

        if (backupSettings && backupSettings.trim() !== '') {
          const parsedBackup = JSON.parse(backupSettings);
          if (this.validateSettings(parsedBackup)) {
            this.settings = parsedBackup;
            console.log('[FlexTable] Settings loaded from localStorage backup:', this.settings);
            log('Settings loaded from localStorage backup:', this.settings);

            // Trigger immediate UI update
            if (this.onSettingsChange) {
              setTimeout(() => this.onSettingsChange(this.settings), 100);
            }
            return;
          }
        }
      } catch (backupError) {
        console.error('[FlexTable] Failed to load backup settings:', backupError);
      }

      // Method 3: window object
      try {
        if (window.flextableSettings && window.flextableSettings.trim() !== '') {
          const parsedWindow = JSON.parse(window.flextableSettings);
          console.log('[FlexTable] window object value:', window.flextableSettings);

          if (this.validateSettings(parsedWindow)) {
            this.settings = parsedWindow;
            console.log('[FlexTable] Settings loaded from window object:', this.settings);
            log('Settings loaded from window object:', this.settings);

            // Trigger immediate UI update
            if (this.onSettingsChange) {
              setTimeout(() => this.onSettingsChange(this.settings), 100);
            }
            return;
          }
        }
      } catch (windowError) {
        console.error('[FlexTable] Failed to load from window:', windowError);
      }

      // Method 4: sessionStorage
      try {
        const sessionSettings = sessionStorage.getItem('flextable-session-settings');
        console.log('[FlexTable] sessionStorage value:', sessionSettings);

        if (sessionSettings && sessionSettings.trim() !== '') {
          const parsedSession = JSON.parse(sessionSettings);
          if (this.validateSettings(parsedSession)) {
            this.settings = parsedSession;
            console.log('[FlexTable] Settings loaded from sessionStorage:', this.settings);
            log('Settings loaded from sessionStorage:', this.settings);

            // Trigger immediate UI update
            if (this.onSettingsChange) {
              setTimeout(() => this.onSettingsChange(this.settings), 100);
            }
            return;
          }
        }
      } catch (sessionError) {
        console.error('[FlexTable] Failed to load from sessionStorage:', sessionError);
      }

      // Try loading from old key as fallback (for existing users)
      const oldSaved = tableau.extensions.settings.get('flextable-settings');
      console.log('[FlexTable] Checking old key, value:', oldSaved);

      if (oldSaved && oldSaved.trim() !== '') {
        try {
          const parsedOldSettings = JSON.parse(oldSaved);
          if (this.validateSettings(parsedOldSettings)) {
            this.settings = parsedOldSettings;
            // Migrate to new key
            await this.saveSettings();
            console.log('[FlexTable] Settings migrated from old key');
            log('Settings migrated from old key');

            // Trigger immediate UI update
            if (this.onSettingsChange) {
              setTimeout(() => this.onSettingsChange(this.settings), 100);
            }
            return;
          }
        } catch (parseError) {
          console.error('[FlexTable] Failed to parse old settings JSON:', parseError);
        }
      }

      // If no valid settings found, use defaults
      this.settings = {
        measureColumns: [],
        dimensionColumns: [],
        details: [],
        tooltips: []
      };
      console.log('[FlexTable] Using default settings');
      log('Using default settings');

    } catch (error) {
      console.error('[FlexTable] Failed to load settings:', error);
      // Fallback to default settings
      this.settings = {
        measureColumns: [],
        dimensionColumns: [],
        details: [],
        tooltips: []
      };
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
    return this.settings;
  }

  showDebugInfo() {
    const settingsKey = 'flextable-field-config';
    const oldKey = 'flextable-settings';

    const current = tableau.extensions.settings.get(settingsKey);
    const old = tableau.extensions.settings.get(oldKey);
    const allSettings = tableau.extensions.settings.getAll();

    // Test storage capabilities
    const storageTest = this.testStorageMethods();

    const debugInfo = `
SETTINGS DEBUG INFO:

Current Key (${settingsKey}):
${current || 'NOT FOUND'}

Old Key (${oldKey}):
${old || 'NOT FOUND'}

In-Memory Settings:
${JSON.stringify(this.settings, null, 2)}

All Stored Keys:
${Object.keys(allSettings).join(', ') || 'NONE'}

STORAGE TEST RESULTS:
${storageTest}

All Settings:
${JSON.stringify(allSettings, null, 2)}
    `;

    alert(debugInfo);
  }

  testStorageMethods() {
    const testKey = 'flextable-storage-test';
    const testValue = JSON.stringify({ test: 'data', timestamp: Date.now() });
    let results = [];

    // Test 1: Tableau Extensions Settings
    try {
      tableau.extensions.settings.set(testKey, testValue);
      const retrieved = tableau.extensions.settings.get(testKey);
      results.push(`✓ Tableau Settings: ${retrieved === testValue ? 'WORKING' : 'BROKEN'}`);
      tableau.extensions.settings.set(testKey, ''); // cleanup
    } catch (e) {
      results.push(`✗ Tableau Settings: ERROR - ${e.message}`);
    }

    // Test 2: localStorage
    try {
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      results.push(`✓ localStorage: ${retrieved === testValue ? 'WORKING' : 'BROKEN'}`);
      localStorage.removeItem(testKey); // cleanup
    } catch (e) {
      results.push(`✗ localStorage: ERROR - ${e.message}`);
    }

    // Test 3: sessionStorage
    try {
      sessionStorage.setItem(testKey, testValue);
      const retrieved = sessionStorage.getItem(testKey);
      results.push(`✓ sessionStorage: ${retrieved === testValue ? 'WORKING' : 'BROKEN'}`);
      sessionStorage.removeItem(testKey); // cleanup
    } catch (e) {
      results.push(`✗ sessionStorage: ERROR - ${e.message}`);
    }

    // Test 4: window object
    try {
      window[testKey] = testValue;
      const retrieved = window[testKey];
      results.push(`✓ window object: ${retrieved === testValue ? 'WORKING' : 'BROKEN'}`);
      delete window[testKey]; // cleanup
    } catch (e) {
      results.push(`✗ window object: ERROR - ${e.message}`);
    }

    return results.join('\\n');
  }

  // AGGRESSIVE: Real-time persistence monitoring
  startPersistenceMonitoring() {
    if (this.monitoringStarted) return;
    this.monitoringStarted = true;

    console.log('[FlexTable] Starting aggressive persistence monitoring...');
    this.updatePersistenceMonitor('Monitoring active');

    // Monitor every 3 seconds
    setInterval(() => {
      this.checkPersistence();
    }, 3000);

    // Monitor on various events that might cause resets
    const events = ['focus', 'blur', 'beforeunload', 'pagehide', 'pageshow', 'visibilitychange'];
    events.forEach(event => {
      window.addEventListener(event, () => {
        console.log(`[FlexTable] Event ${event} - checking persistence`);
        this.updatePersistenceMonitor(`Event: ${event}`);
        this.aggressiveSave();
      });
    });
  }

  updatePersistenceMonitor(message) {
    const monitor = document.getElementById('ft-persistence-monitor');
    if (monitor) {
      const timestamp = new Date().toLocaleTimeString();
      monitor.textContent = `${timestamp}: ${message}`;

      // Add visual indicators
      if (message.includes('FAILURE') || message.includes('lost')) {
        monitor.style.color = '#d32f2f';
        monitor.style.fontWeight = 'bold';
      } else if (message.includes('Recovery') || message.includes('saved')) {
        monitor.style.color = '#388e3c';
        monitor.style.fontWeight = 'normal';
      } else {
        monitor.style.color = '#666';
        monitor.style.fontWeight = 'normal';
      }
    }
  }

  checkPersistence() {
    const settingsKey = 'flextable-field-config';
    const saved = tableau.extensions.settings.get(settingsKey);

    if (!saved && this.hasConfiguredFields()) {
      console.warn('[FlexTable] PERSISTENCE FAILURE DETECTED - Settings lost, attempting recovery');
      this.updatePersistenceMonitor('PERSISTENCE FAILURE - attempting recovery');
      this.attemptRecovery();
    } else if (saved && this.hasConfiguredFields()) {
      this.updatePersistenceMonitor('Settings persist OK');
    }
  }

  hasConfiguredFields() {
    const fieldCount = this.settings.measureColumns.length +
                      this.settings.dimensionColumns.length +
                      this.settings.details.length +
                      this.settings.tooltips.length;
    return fieldCount > 0;
  }

  async attemptRecovery() {
    console.log('[FlexTable] Attempting settings recovery...');

    // Try all backup methods immediately
    const backupMethods = [
      () => localStorage.getItem('flextable-backup-settings'),
      () => window.flextableSettings,
      () => sessionStorage.getItem('flextable-session-settings'),
      () => document.flextableBackup // NEW: DOM-based backup
    ];

    for (let i = 0; i < backupMethods.length; i++) {
      try {
        const backupData = backupMethods[i]();
        if (backupData && backupData.trim() !== '') {
          const parsed = JSON.parse(backupData);
          if (this.validateSettings(parsed)) {
            this.settings = parsed;
            console.log(`[FlexTable] Recovery successful from method ${i + 1}`);
            this.updatePersistenceMonitor(`Recovery successful from backup ${i + 1}`);

            // Immediately re-save to all locations
            await this.aggressiveSave();

            // Trigger UI update
            if (this.onSettingsChange) {
              this.onSettingsChange(this.settings);
            }
            return true;
          }
        }
      } catch (e) {
        console.warn(`[FlexTable] Recovery method ${i + 1} failed:`, e);
      }
    }

    console.error('[FlexTable] All recovery methods failed');
    this.updatePersistenceMonitor('Recovery failed - all methods exhausted');
    return false;
  }

  async aggressiveSave() {
    if (!this.hasConfiguredFields()) return;

    const settingsJson = JSON.stringify(this.settings);
    console.log('[FlexTable] Aggressive save initiated:', settingsJson);

    // Save to ALL possible locations simultaneously
    const promises = [];

    // 1. Tableau settings (primary)
    promises.push(this.saveToTableau(settingsJson));

    // 2. Multiple browser storage methods
    promises.push(this.saveToBrowserStorage(settingsJson));

    // 3. DOM-based storage (NEW)
    promises.push(this.saveToDom(settingsJson));

    // 4. URL-based storage (NEW)
    promises.push(this.saveToUrl(settingsJson));

    await Promise.allSettled(promises);
    console.log('[FlexTable] Aggressive save completed');
    this.updatePersistenceMonitor('Settings saved to all methods');
  }

  async saveToTableau(settingsJson) {
    try {
      await tableau.extensions.settings.set('flextable-field-config', settingsJson);
      await tableau.extensions.settings.saveAsync();
      console.log('[FlexTable] Tableau settings save successful');
      this.updatePersistenceMonitor('✓ Tableau saved');
    } catch (e) {
      console.error('[FlexTable] Tableau settings save failed:', e);
    }
  }

  async saveToBrowserStorage(settingsJson) {
    try {
      localStorage.setItem('flextable-backup-settings', settingsJson);
      sessionStorage.setItem('flextable-session-settings', settingsJson);
      window.flextableSettings = settingsJson;
      console.log('[FlexTable] Browser storage save successful');
      this.updatePersistenceMonitor('✓ Browser saved');
    } catch (e) {
      console.error('[FlexTable] Browser storage save failed:', e);
    }
  }

  async saveToDom(settingsJson) {
    try {
      // Create hidden element to store settings
      let hiddenEl = document.getElementById('flextable-hidden-settings');
      if (!hiddenEl) {
        hiddenEl = document.createElement('div');
        hiddenEl.id = 'flextable-hidden-settings';
        hiddenEl.style.display = 'none';
        document.body.appendChild(hiddenEl);
      }
      hiddenEl.textContent = settingsJson;
      document.flextableBackup = settingsJson;
      console.log('[FlexTable] DOM storage save successful');
      this.updatePersistenceMonitor('✓ DOM saved');
    } catch (e) {
      console.error('[FlexTable] DOM storage save failed:', e);
    }
  }

  async saveToUrl(settingsJson) {
    try {
      // Only for small settings to avoid URL length limits
      if (settingsJson.length < 500) {
        const encoded = btoa(settingsJson);
        const url = new URL(window.location);
        url.searchParams.set('flextable_config', encoded);
        window.history.replaceState({}, '', url);
        console.log('[FlexTable] URL storage save successful');
        this.updatePersistenceMonitor('✓ URL saved');
      }
    } catch (e) {
      console.error('[FlexTable] URL storage save failed:', e);
    }
  }

  // Enhanced save method that uses aggressive save
  async saveSettings() {
    await this.aggressiveSave();
  }

  // Debug function to check what's actually stored
  debugSettings() {
    const settingsKey = 'flextable-field-config';
    const oldKey = 'flextable-settings';

    const current = tableau.extensions.settings.get(settingsKey);
    const old = tableau.extensions.settings.get(oldKey);

    log('=== SETTINGS DEBUG ===');
    log('Current key value:', current);
    log('Old key value:', old);
    log('In-memory settings:', this.settings);
    log('All settings keys:', Object.keys(tableau.extensions.settings.getAll()));
    log('=====================');

    return {
      currentKey: current,
      oldKey: old,
      inMemory: this.settings,
      allKeys: Object.keys(tableau.extensions.settings.getAll())
    };
  }
}