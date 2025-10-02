// MINIMAL SETTINGS - Just what actually works in Tableau
export class SimpleSettings {
  constructor() {
    this.settings = {
      measureColumns: [],
      dimensionColumns: [],
      details: [],
      tooltips: []
    };
  }

  async save() {
    try {
      const key = `flextable-${Date.now()}`; // Unique key to avoid collisions
      const value = JSON.stringify(this.settings);

      console.log('SAVING:', key, value);

      tableau.extensions.settings.set(key, value);
      await tableau.extensions.settings.saveAsync();

      // Store the current key so we can find it later
      tableau.extensions.settings.set('flextable-current-key', key);
      await tableau.extensions.settings.saveAsync();

      console.log('SAVED SUCCESSFULLY');
      return true;
    } catch (error) {
      console.error('SAVE FAILED:', error);
      return false;
    }
  }

  async load() {
    try {
      // Find the current key
      const currentKey = tableau.extensions.settings.get('flextable-current-key');

      if (!currentKey) {
        console.log('NO CURRENT KEY FOUND');
        return false;
      }

      const value = tableau.extensions.settings.get(currentKey);

      if (!value) {
        console.log('NO VALUE FOUND FOR KEY:', currentKey);
        return false;
      }

      this.settings = JSON.parse(value);
      console.log('LOADED:', this.settings);
      return true;

    } catch (error) {
      console.error('LOAD FAILED:', error);
      return false;
    }
  }

  getSettings() {
    return this.settings;
  }

  updateSettings(newSettings) {
    this.settings = newSettings;
  }
}