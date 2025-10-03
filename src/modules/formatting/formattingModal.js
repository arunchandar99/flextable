/**
 * Formatting Modal Module
 * Provides UI for configuring all table formatting options
 */

export class FormattingModal {
  constructor(tableFormatter) {
    this.tableFormatter = tableFormatter;
    this.modal = null;
    this.isOpen = false;
    this.currentData = null;
  }

  /**
   * Open the formatting modal
   */
  open(data = null) {
    if (this.isOpen) return;

    this.currentData = data || (window.flextableApp ? window.flextableApp.currentData : null);
    this.createModal();
    this.modal.style.display = 'block';
    this.isOpen = true;

    // Trigger re-render after settings change
    if (window.flextableApp && window.flextableApp.refresh) {
      this.onSettingsChange = () => window.flextableApp.refresh();
    }
  }

  /**
   * Close the formatting modal
   */
  close() {
    if (this.modal) {
      this.modal.style.display = 'none';
      this.isOpen = false;
    }
  }

  /**
   * Create the formatting modal
   */
  createModal() {
    // Remove existing modal if any
    const existingModal = document.getElementById('formatting-modal');
    if (existingModal) {
      existingModal.remove();
    }

    this.modal = document.createElement('div');
    this.modal.id = 'formatting-modal';
    this.modal.className = 'modal';

    this.modal.innerHTML = `
      <div class="modal-content formatting-modal-content">
        <div class="modal-header">
          <h2>Table Formatting</h2>
          <span class="close" onclick="document.getElementById('formatting-modal').style.display='none'">&times;</span>
        </div>

        <div class="formatting-tabs">
          <button class="tab-button active" onclick="window.formattingModal.showTab('numbers')">Numbers</button>
          <button class="tab-button" onclick="window.formattingModal.showTab('columns')">Column Format</button>
          <button class="tab-button" onclick="window.formattingModal.showTab('cells')">Cell Style</button>
          <button class="tab-button" onclick="window.formattingModal.showTab('rows')">Rows & Columns</button>
          <button class="tab-button" onclick="window.formattingModal.showTab('table')">Table Structure</button>
          <button class="tab-button" onclick="window.formattingModal.showTab('conditional')">Conditional</button>
        </div>

        <div class="formatting-content">
          ${this.createNumbersTab()}
          ${this.createColumnFormatTab()}
          ${this.createCellStyleTab()}
          ${this.createRowsColumnsTab()}
          ${this.createTableStructureTab()}
          ${this.createConditionalTab()}
        </div>

        <div class="modal-footer">
          <button class="save-btn" onclick="window.formattingModal.applyFormatting()">Apply</button>
          <button class="cancel-btn" onclick="window.formattingModal.close()">Cancel</button>
          <button class="reset-btn" onclick="window.formattingModal.resetDefaults()">Reset to Defaults</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);
    window.formattingModal = this;

    // Populate current values
    this.populateCurrentValues();

    // Populate column list
    this.populateColumns();

    // Add event listeners
    this.addEventListeners();
  }

  /**
   * Create Numbers formatting tab
   */
  createNumbersTab() {
    return `
      <div id="numbers-tab" class="tab-content active">
        <div class="formatting-section">
          <h3>Number Format</h3>
          <div class="form-group">
            <label>Format Type:</label>
            <select id="number-format-type">
              <option value="auto">Auto</option>
              <option value="number">Number</option>
              <option value="currency">Currency</option>
              <option value="percentage">Percentage</option>
              <option value="accounting">Accounting</option>
              <option value="scientific">Scientific</option>
            </select>
          </div>

          <div class="form-group">
            <label>Currency:</label>
            <select id="number-currency">
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
              <option value="CAD">CAD (C$)</option>
              <option value="AUD">AUD (A$)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Decimal Places:</label>
            <input type="number" id="number-decimals" min="0" max="10" value="2">
          </div>

          <div class="form-group">
            <label>
              <input type="checkbox" id="thousands-separator">
              Use Thousands Separator
            </label>
          </div>

          <div class="form-group">
            <label>Negative Numbers:</label>
            <select id="negative-numbers">
              <option value="minus">-1,234</option>
              <option value="parentheses">(1,234)</option>
              <option value="red">-1,234 (Red)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Prefix:</label>
            <input type="text" id="number-prefix" placeholder="e.g., $, #">
          </div>

          <div class="form-group">
            <label>Suffix:</label>
            <input type="text" id="number-suffix" placeholder="e.g., %, units">
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create Column Format tab
   */
  createColumnFormatTab() {
    return `
      <div id="columns-tab" class="tab-content">
        <div class="formatting-section">
          <h3>Column-Specific Number Formatting</h3>
          <div class="form-group">
            <label>Select Column:</label>
            <select id="column-select">
              <option value="">Choose a column...</option>
            </select>
          </div>

          <div id="column-format-settings" style="display: none;">
            <div class="form-group">
              <label>Format Type:</label>
              <select id="column-format-type">
                <option value="inherit">Use Default</option>
                <option value="number">Number</option>
                <option value="currency">Currency</option>
                <option value="percentage">Percentage</option>
                <option value="accounting">Accounting</option>
                <option value="scientific">Scientific</option>
              </select>
            </div>

            <div class="form-group">
              <label>Currency:</label>
              <select id="column-currency">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>

            <div class="form-group">
              <label>Decimal Places:</label>
              <input type="number" id="column-decimals" min="0" max="10" value="2">
            </div>

            <div class="form-group">
              <label>
                <input type="checkbox" id="column-thousands">
                Use Thousands Separator
              </label>
            </div>

            <div class="form-group">
              <label>Negative Numbers:</label>
              <select id="column-negatives">
                <option value="minus">-1,234</option>
                <option value="parentheses">(1,234)</option>
                <option value="red">-1,234 (Red)</option>
              </select>
            </div>

            <div class="form-group">
              <label>Prefix:</label>
              <input type="text" id="column-prefix" placeholder="e.g., $, #">
            </div>

            <div class="form-group">
              <label>Suffix:</label>
              <input type="text" id="column-suffix" placeholder="e.g., %, units">
            </div>

            <div class="form-group">
              <button class="save-btn" onclick="window.formattingModal.saveColumnFormat()">Apply to Column</button>
              <button class="cancel-btn" onclick="window.formattingModal.removeColumnFormat()">Remove Format</button>
            </div>
          </div>
        </div>

        <div class="formatting-section">
          <h3>Applied Column Formats</h3>
          <div id="column-formats-list">
            <!-- Applied formats will be listed here -->
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create Cell Style tab
   */
  createCellStyleTab() {
    return `
      <div id="cells-tab" class="tab-content">
        <div class="formatting-section">
          <h3>Font Settings</h3>
          <div class="form-group">
            <label>Font Family:</label>
            <select id="font-family">
              <option value="inherit">Default</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="'Times New Roman', serif">Times New Roman</option>
              <option value="'Courier New', monospace">Courier New</option>
              <option value="Helvetica, sans-serif">Helvetica</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="Verdana, sans-serif">Verdana</option>
            </select>
          </div>

          <div class="form-group">
            <label>Font Size:</label>
            <input type="text" id="font-size" value="13px">
          </div>

          <div class="form-group">
            <label>Font Weight:</label>
            <select id="font-weight">
              <option value="normal">Normal</option>
              <option value="bold">Bold</option>
              <option value="lighter">Lighter</option>
              <option value="bolder">Bolder</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="300">300</option>
              <option value="400">400</option>
              <option value="500">500</option>
              <option value="600">600</option>
              <option value="700">700</option>
              <option value="800">800</option>
              <option value="900">900</option>
            </select>
          </div>

          <div class="form-group">
            <label>
              <input type="checkbox" id="font-italic">
              Italic
            </label>
          </div>
        </div>

        <div class="formatting-section">
          <h3>Text Alignment</h3>
          <div class="form-group">
            <label>Horizontal:</label>
            <select id="text-align">
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
              <option value="justify">Justify</option>
            </select>
          </div>

          <div class="form-group">
            <label>Vertical:</label>
            <select id="vertical-align">
              <option value="top">Top</option>
              <option value="middle">Middle</option>
              <option value="bottom">Bottom</option>
            </select>
          </div>
        </div>

        <div class="formatting-section">
          <h3>Colors</h3>
          <div class="form-group">
            <label>Text Color:</label>
            <input type="color" id="text-color" value="#000000">
          </div>

          <div class="form-group">
            <label>Background Color:</label>
            <input type="color" id="background-color" value="#ffffff">
          </div>
        </div>

        <div class="formatting-section">
          <h3>Cell Padding</h3>
          <div class="form-group">
            <label>Padding:</label>
            <input type="text" id="cell-padding" value="8px 12px" placeholder="e.g., 8px 12px">
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create Rows & Columns tab
   */
  createRowsColumnsTab() {
    return `
      <div id="rows-tab" class="tab-content">
        <div class="formatting-section">
          <h3>Row Formatting</h3>
          <div class="form-group">
            <label>
              <input type="checkbox" id="alternating-rows">
              Alternating Row Colors
            </label>
          </div>

          <div class="form-group">
            <label>Even Row Color:</label>
            <input type="color" id="even-row-color" value="#fafafa">
          </div>

          <div class="form-group">
            <label>Odd Row Color:</label>
            <input type="color" id="odd-row-color" value="#ffffff">
          </div>

          <div class="form-group">
            <label>Hover Color:</label>
            <input type="color" id="hover-color" value="#f5f8fa">
          </div>

          <div class="form-group">
            <label>Row Height:</label>
            <input type="text" id="row-height" value="auto" placeholder="e.g., auto, 40px">
          </div>
        </div>

        <div class="formatting-section">
          <h3>Column Formatting</h3>
          <div class="form-group">
            <label>Column Width:</label>
            <input type="text" id="column-width" value="auto" placeholder="e.g., auto, 150px">
          </div>

          <div class="form-group">
            <label>Min Column Width:</label>
            <input type="text" id="min-column-width" value="80px">
          </div>

          <div class="form-group">
            <label>Max Column Width:</label>
            <input type="text" id="max-column-width" value="none" placeholder="e.g., none, 300px">
          </div>
        </div>

        <div class="formatting-section">
          <h3>Header Styling</h3>
          <div class="form-group">
            <label>Header Font Weight:</label>
            <select id="header-font-weight">
              <option value="normal">Normal</option>
              <option value="bold">Bold</option>
              <option value="500">500</option>
              <option value="600">600</option>
              <option value="700">700</option>
            </select>
          </div>

          <div class="form-group">
            <label>Header Background:</label>
            <input type="color" id="header-background" value="#f8f8f8">
          </div>

          <div class="form-group">
            <label>Header Text Color:</label>
            <input type="color" id="header-text-color" value="#555555">
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create Table Structure tab
   */
  createTableStructureTab() {
    return `
      <div id="table-tab" class="tab-content">
        <div class="formatting-section">
          <h3>Table Layout</h3>
          <div class="form-group">
            <label>Table Layout:</label>
            <select id="table-layout">
              <option value="auto">Auto</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>

          <div class="form-group">
            <label>Border Collapse:</label>
            <select id="border-collapse">
              <option value="collapse">Collapse</option>
              <option value="separate">Separate</option>
            </select>
          </div>
        </div>

        <div class="formatting-section">
          <h3>Borders</h3>
          <div class="form-group">
            <label>
              <input type="checkbox" id="grid-lines">
              Show Grid Lines
            </label>
          </div>

          <div class="form-group">
            <label>
              <input type="checkbox" id="outer-border">
              Show Outer Border
            </label>
          </div>

          <div class="form-group">
            <label>Border Color:</label>
            <input type="color" id="border-color" value="#e0e0e0">
          </div>

          <div class="form-group">
            <label>Border Width:</label>
            <input type="text" id="border-width" value="1px">
          </div>

          <div class="form-group">
            <label>Border Style:</label>
            <select id="border-style">
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
              <option value="double">Double</option>
              <option value="groove">Groove</option>
              <option value="ridge">Ridge</option>
              <option value="inset">Inset</option>
              <option value="outset">Outset</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create Conditional Formatting tab
   */
  createConditionalTab() {
    return `
      <div id="conditional-tab" class="tab-content">
        <div class="formatting-section">
          <h3>Conditional Formatting Rules</h3>
          <div class="form-group">
            <label>
              <input type="checkbox" id="conditional-enabled">
              Enable Conditional Formatting
            </label>
          </div>

          <div id="conditional-rules">
            <!-- Rules will be populated here -->
          </div>

          <button class="add-rule-btn" onclick="window.formattingModal.addConditionalRule()">+ Add Rule</button>
        </div>

        <div class="formatting-section">
          <h3>New Rule</h3>
          <div class="form-group">
            <label>Column:</label>
            <select id="rule-column">
              <option value="">All Columns</option>
              <!-- Will be populated with column names -->
            </select>
          </div>

          <div class="form-group">
            <label>Condition:</label>
            <select id="rule-condition">
              <option value="greaterThan">Greater Than</option>
              <option value="lessThan">Less Than</option>
              <option value="equalTo">Equal To</option>
              <option value="between">Between</option>
              <option value="top10">Top 10</option>
              <option value="bottom10">Bottom 10</option>
            </select>
          </div>

          <div class="form-group">
            <label>Value:</label>
            <input type="number" id="rule-value" placeholder="Enter value">
          </div>

          <div class="form-group" id="rule-max-value-group" style="display: none;">
            <label>Max Value:</label>
            <input type="number" id="rule-max-value" placeholder="Enter max value">
          </div>

          <div class="form-group">
            <label>Format Type:</label>
            <select id="rule-format-type">
              <option value="backgroundColor">Background Color</option>
              <option value="textColor">Text Color</option>
              <option value="dataBar">Data Bar</option>
              <option value="colorScale">Color Scale</option>
              <option value="iconSet">Icon Set</option>
            </select>
          </div>

          <div class="form-group">
            <label>Color:</label>
            <input type="color" id="rule-color" value="#ffeb3b">
          </div>

          <div class="form-group" id="rule-icon-group" style="display: none;">
            <label>Icon:</label>
            <select id="rule-icon">
              <option value="▲">▲ Up Arrow</option>
              <option value="▼">▼ Down Arrow</option>
              <option value="●">● Circle</option>
              <option value="■">■ Square</option>
              <option value="★">★ Star</option>
              <option value="✓">✓ Check</option>
              <option value="✗">✗ X</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Show specific tab
   */
  showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));

    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));

    // Show selected tab content
    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
      selectedTab.classList.add('active');
    }

    // Mark tab button as active
    const selectedButton = [...tabButtons].find(button =>
      button.textContent.toLowerCase().includes(tabName)
    );
    if (selectedButton) {
      selectedButton.classList.add('active');
    }
  }

  /**
   * Populate current values in the form
   */
  populateCurrentValues() {
    const settings = this.tableFormatter.getSettings();

    // Number formatting
    document.getElementById('number-format-type').value = settings.numberFormat.type;
    document.getElementById('number-currency').value = settings.numberFormat.currency;
    document.getElementById('number-decimals').value = settings.numberFormat.decimals;
    document.getElementById('thousands-separator').checked = settings.numberFormat.thousandsSeparator;
    document.getElementById('negative-numbers').value = settings.numberFormat.negativeNumbers;
    document.getElementById('number-prefix').value = settings.numberFormat.prefix;
    document.getElementById('number-suffix').value = settings.numberFormat.suffix;

    // Cell styling
    document.getElementById('font-family').value = settings.cellStyling.fontFamily;
    document.getElementById('font-size').value = settings.cellStyling.fontSize;
    document.getElementById('font-weight').value = settings.cellStyling.fontWeight;
    document.getElementById('font-italic').checked = settings.cellStyling.fontStyle === 'italic';
    document.getElementById('text-align').value = settings.cellStyling.textAlign;
    document.getElementById('vertical-align').value = settings.cellStyling.verticalAlign;
    document.getElementById('text-color').value = settings.cellStyling.textColor === 'inherit' ? '#000000' : settings.cellStyling.textColor;
    document.getElementById('background-color').value = settings.cellStyling.backgroundColor === 'transparent' ? '#ffffff' : settings.cellStyling.backgroundColor;
    document.getElementById('cell-padding').value = settings.cellStyling.padding;

    // Row formatting
    document.getElementById('alternating-rows').checked = settings.rowFormatting.alternatingRows;
    document.getElementById('even-row-color').value = settings.rowFormatting.evenRowColor;
    document.getElementById('odd-row-color').value = settings.rowFormatting.oddRowColor;
    document.getElementById('hover-color').value = settings.rowFormatting.hoverColor;
    document.getElementById('row-height').value = settings.rowFormatting.rowHeight;

    // Column formatting
    document.getElementById('column-width').value = settings.columnFormatting.columnWidth;
    document.getElementById('min-column-width').value = settings.columnFormatting.minColumnWidth;
    document.getElementById('max-column-width').value = settings.columnFormatting.maxColumnWidth;

    // Header styling
    document.getElementById('header-font-weight').value = settings.headerStyling.fontWeight;
    document.getElementById('header-background').value = settings.headerStyling.backgroundColor;
    document.getElementById('header-text-color').value = settings.headerStyling.textColor === 'inherit' ? '#000000' : settings.headerStyling.textColor;

    // Table structure
    document.getElementById('table-layout').value = settings.tableStructure.tableLayout;
    document.getElementById('border-collapse').value = settings.tableStructure.borderCollapse;
    document.getElementById('grid-lines').checked = settings.tableStructure.gridLines;
    document.getElementById('outer-border').checked = settings.tableStructure.outerBorder;
    document.getElementById('border-color').value = settings.tableStructure.borderColor;
    document.getElementById('border-width').value = settings.tableStructure.borderWidth;
    document.getElementById('border-style').value = settings.tableStructure.borderStyle;

    // Conditional formatting
    document.getElementById('conditional-enabled').checked = settings.conditionalFormatting.enabled;
  }

  /**
   * Add event listeners
   */
  addEventListeners() {
    // Column selection change
    const columnSelect = document.getElementById('column-select');
    if (columnSelect) {
      columnSelect.addEventListener('change', (e) => {
        const settings = document.getElementById('column-format-settings');
        if (e.target.value) {
          settings.style.display = 'block';
          this.loadColumnFormatSettings(e.target.value);
        } else {
          settings.style.display = 'none';
        }
      });
    }

    // Rule condition change
    const ruleCondition = document.getElementById('rule-condition');
    if (ruleCondition) {
      ruleCondition.addEventListener('change', (e) => {
        const maxValueGroup = document.getElementById('rule-max-value-group');
        if (e.target.value === 'between') {
          maxValueGroup.style.display = 'block';
        } else {
          maxValueGroup.style.display = 'none';
        }
      });
    }

    // Rule format type change
    const ruleFormatType = document.getElementById('rule-format-type');
    if (ruleFormatType) {
      ruleFormatType.addEventListener('change', (e) => {
        const iconGroup = document.getElementById('rule-icon-group');
        if (e.target.value === 'iconSet') {
          iconGroup.style.display = 'block';
        } else {
          iconGroup.style.display = 'none';
        }
      });
    }
  }

  /**
   * Load column format settings for selected column
   */
  loadColumnFormatSettings(columnName) {
    const format = this.tableFormatter.getColumnNumberFormat(columnName);

    if (format) {
      document.getElementById('column-format-type').value = format.type || 'number';
      document.getElementById('column-currency').value = format.currency || 'USD';
      document.getElementById('column-decimals').value = format.decimals || 2;
      document.getElementById('column-thousands').checked = format.thousandsSeparator !== false;
      document.getElementById('column-negatives').value = format.negativeNumbers || 'minus';
      document.getElementById('column-prefix').value = format.prefix || '';
      document.getElementById('column-suffix').value = format.suffix || '';
    } else {
      // Reset to defaults
      document.getElementById('column-format-type').value = 'inherit';
      document.getElementById('column-currency').value = 'USD';
      document.getElementById('column-decimals').value = 2;
      document.getElementById('column-thousands').checked = true;
      document.getElementById('column-negatives').value = 'minus';
      document.getElementById('column-prefix').value = '';
      document.getElementById('column-suffix').value = '';
    }
  }

  /**
   * Apply formatting settings
   */
  applyFormatting() {
    const settings = this.collectFormValues();
    this.tableFormatter.updateSettings(settings);

    if (this.onSettingsChange) {
      this.onSettingsChange();
    }

    this.close();
  }

  /**
   * Collect form values
   */
  collectFormValues() {
    const settings = {};

    // Number formatting
    settings.numberFormat = {
      type: document.getElementById('number-format-type').value,
      currency: document.getElementById('number-currency').value,
      decimals: parseInt(document.getElementById('number-decimals').value),
      thousandsSeparator: document.getElementById('thousands-separator').checked,
      negativeNumbers: document.getElementById('negative-numbers').value,
      prefix: document.getElementById('number-prefix').value,
      suffix: document.getElementById('number-suffix').value
    };

    // Cell styling
    const textColor = document.getElementById('text-color').value;
    const backgroundColor = document.getElementById('background-color').value;

    settings.cellStyling = {
      fontFamily: document.getElementById('font-family').value,
      fontSize: document.getElementById('font-size').value,
      fontWeight: document.getElementById('font-weight').value,
      fontStyle: document.getElementById('font-italic').checked ? 'italic' : 'normal',
      textAlign: document.getElementById('text-align').value,
      verticalAlign: document.getElementById('vertical-align').value,
      textColor: textColor === '#000000' ? 'inherit' : textColor,
      backgroundColor: backgroundColor === '#ffffff' ? 'transparent' : backgroundColor,
      padding: document.getElementById('cell-padding').value
    };

    // Row formatting
    settings.rowFormatting = {
      alternatingRows: document.getElementById('alternating-rows').checked,
      evenRowColor: document.getElementById('even-row-color').value,
      oddRowColor: document.getElementById('odd-row-color').value,
      hoverColor: document.getElementById('hover-color').value,
      rowHeight: document.getElementById('row-height').value
    };

    // Column formatting
    settings.columnFormatting = {
      columnWidth: document.getElementById('column-width').value,
      minColumnWidth: document.getElementById('min-column-width').value,
      maxColumnWidth: document.getElementById('max-column-width').value
    };

    // Header styling
    const headerTextColor = document.getElementById('header-text-color').value;

    settings.headerStyling = {
      ...this.tableFormatter.getSettings().headerStyling,
      fontWeight: document.getElementById('header-font-weight').value,
      backgroundColor: document.getElementById('header-background').value,
      textColor: headerTextColor === '#000000' ? 'inherit' : headerTextColor
    };

    // Table structure
    settings.tableStructure = {
      tableLayout: document.getElementById('table-layout').value,
      borderCollapse: document.getElementById('border-collapse').value,
      gridLines: document.getElementById('grid-lines').checked,
      outerBorder: document.getElementById('outer-border').checked,
      borderColor: document.getElementById('border-color').value,
      borderWidth: document.getElementById('border-width').value,
      borderStyle: document.getElementById('border-style').value
    };

    // Conditional formatting
    settings.conditionalFormatting = {
      enabled: document.getElementById('conditional-enabled').checked,
      rules: this.tableFormatter.getSettings().conditionalFormatting.rules
    };

    return settings;
  }

  /**
   * Add conditional formatting rule
   */
  addConditionalRule() {
    // Implementation for adding conditional rules
    console.log('Adding conditional rule...');
  }

  /**
   * Reset to default settings
   */
  resetDefaults() {
    this.tableFormatter.resetToDefaults();
    this.populateCurrentValues();

    if (this.onSettingsChange) {
      this.onSettingsChange();
    }
  }

  /**
   * Populate column list
   */
  populateColumns() {
    const columnSelect = document.getElementById('column-select');
    if (!columnSelect || !this.currentData) return;

    columnSelect.innerHTML = '<option value="">Choose a column...</option>';

    if (this.currentData.columns) {
      console.log('Available columns:', this.currentData.columns);
      this.currentData.columns.forEach((column, index) => {
        // Include all columns for now (users may want to format any column)
        const option = document.createElement('option');
        option.value = column;
        option.textContent = column;
        columnSelect.appendChild(option);
      });
    }

    this.updateColumnFormatsList();
  }

  /**
   * Update applied column formats list
   */
  updateColumnFormatsList() {
    const listContainer = document.getElementById('column-formats-list');
    if (!listContainer) return;

    const columnFormats = this.tableFormatter.getAllColumnFormatting();
    listContainer.innerHTML = '';

    if (Object.keys(columnFormats).length === 0) {
      listContainer.innerHTML = '<p style="color: #666; font-style: italic;">No column-specific formats applied</p>';
      return;
    }

    Object.entries(columnFormats).forEach(([columnKey, format]) => {
      if (format.numberFormat) {
        const formatDiv = document.createElement('div');
        formatDiv.className = 'column-format-item';
        formatDiv.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f5f5f5; margin: 5px 0; border-radius: 3px;">
            <div>
              <strong>${columnKey}</strong>: ${format.numberFormat.type || 'number'}
              ${format.numberFormat.currency ? ` (${format.numberFormat.currency})` : ''}
              ${format.numberFormat.decimals !== undefined ? `, ${format.numberFormat.decimals} decimals` : ''}
            </div>
            <button class="remove-rule" onclick="window.formattingModal.removeColumnFormat('${columnKey}')">Remove</button>
          </div>
        `;
        listContainer.appendChild(formatDiv);
      }
    });
  }

  /**
   * Save column format
   */
  saveColumnFormat() {
    const columnName = document.getElementById('column-select').value;
    if (!columnName) {
      alert('Please select a column first');
      return;
    }

    const formatType = document.getElementById('column-format-type').value;
    if (formatType === 'inherit') {
      this.removeColumnFormat(columnName);
      return;
    }

    const numberFormat = {
      type: formatType,
      currency: document.getElementById('column-currency').value,
      decimals: parseInt(document.getElementById('column-decimals').value),
      thousandsSeparator: document.getElementById('column-thousands').checked,
      negativeNumbers: document.getElementById('column-negatives').value,
      prefix: document.getElementById('column-prefix').value,
      suffix: document.getElementById('column-suffix').value
    };

    console.log('Saving column format for:', columnName, numberFormat);
    this.tableFormatter.setColumnNumberFormat(columnName, numberFormat);
    this.updateColumnFormatsList();

    if (this.onSettingsChange) {
      console.log('Triggering settings change/refresh');
      this.onSettingsChange();
    }
  }

  /**
   * Remove column format
   */
  removeColumnFormat(columnName = null) {
    const column = columnName || document.getElementById('column-select').value;
    if (!column) return;

    this.tableFormatter.removeColumnFormatting(column);
    this.updateColumnFormatsList();

    // Reset form if this was the selected column
    if (!columnName) {
      document.getElementById('column-format-type').value = 'inherit';
    }

    if (this.onSettingsChange) {
      this.onSettingsChange();
    }
  }
}

export default FormattingModal;