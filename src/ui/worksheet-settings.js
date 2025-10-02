// Store settings in worksheet name - survives refresh/duplicate
export class WorksheetSettings {
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
      const worksheet = tableau.extensions.worksheetContent.worksheet;
      const currentName = worksheet.name;

      // Encode settings into base64
      const settingsJson = JSON.stringify(this.settings);
      const encoded = btoa(settingsJson);

      // Store in worksheet name with prefix
      const newName = `${currentName.split('[FT:')[0]}[FT:${encoded}]`;

      console.log('SAVING TO WORKSHEET NAME:', newName);

      // Change worksheet name to include settings
      await worksheet.changeName(newName);

      console.log('SAVED TO WORKSHEET NAME SUCCESSFULLY');
      return true;
    } catch (error) {
      console.error('WORKSHEET SAVE FAILED:', error);
      return false;
    }
  }

  async load() {
    try {
      const worksheet = tableau.extensions.worksheetContent.worksheet;
      const name = worksheet.name;

      console.log('LOADING FROM WORKSHEET NAME:', name);

      // Look for our settings in the name
      const match = name.match(/\[FT:([^\]]+)\]/);

      if (!match) {
        console.log('NO SETTINGS FOUND IN WORKSHEET NAME');
        return false;
      }

      const encoded = match[1];
      const decoded = atob(encoded);
      this.settings = JSON.parse(decoded);

      console.log('LOADED FROM WORKSHEET NAME:', this.settings);
      return true;

    } catch (error) {
      console.error('WORKSHEET LOAD FAILED:', error);
      return false;
    }
  }

  getSettings() {
    return this.settings;
  }

  updateSettings(newSettings) {
    this.settings = newSettings;
  }

  // Clean up worksheet name (remove our settings)
  async cleanWorksheetName() {
    try {
      const worksheet = tableau.extensions.worksheetContent.worksheet;
      const currentName = worksheet.name;
      const cleanName = currentName.split('[FT:')[0];

      if (cleanName !== currentName) {
        await worksheet.changeName(cleanName);
        console.log('WORKSHEET NAME CLEANED');
      }
    } catch (error) {
      console.error('FAILED TO CLEAN WORKSHEET NAME:', error);
    }
  }
}