// Commission calculation features for detailed breakdown analysis
export class CommissionCalculator {
  constructor() {
    this.calculations = {
      'Commission %': this.calculateCommissionPercentage,
      'Commission Amount': this.calculateCommissionAmount,
      'Net Revenue': this.calculateNetRevenue,
      'Gross Margin': this.calculateGrossMargin,
      'Margin %': this.calculateMarginPercentage,
      'Payout Amount': this.calculatePayoutAmount,
      'Override Amount': this.calculateOverrideAmount,
      'Total Compensation': this.calculateTotalCompensation
    };
  }

  // Create commission calculator interface
  createCalculatorInterface() {
    const dialog = document.createElement('div');
    dialog.className = 'ft-calculator-modal';
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
      max-width: 900px;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    `;

    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <h2 style="margin: 0; color: #2c3e50;">Commission Calculator</h2>
        <button id="close-calculator" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <!-- Available Columns ---->
        <div>
          <h3 style="margin: 0 0 12px 0; color: #34495e;">Available Columns</h3>
          <div id="available-columns" style="
            border: 2px dashed #bdc3c7;
            border-radius: 8px;
            min-height: 300px;
            padding: 12px;
            background: #f8f9fa;
            max-height: 300px;
            overflow-y: auto;
          "></div>
        </div>

        <!-- Calculation Setup ---->
        <div>
          <h3 style="margin: 0 0 12px 0; color: #34495e;">Calculation Setup</h3>
          <div id="calculation-setup" style="
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 16px;
            background: white;
            min-height: 300px;
          ">
            <div style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 4px; font-weight: 500;">Calculation Type:</label>
              <select id="calc-type" style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;">
                <option value="">Select calculation type...</option>
                <option value="Commission %">Commission Percentage</option>
                <option value="Commission Amount">Commission Amount</option>
                <option value="Net Revenue">Net Revenue</option>
                <option value="Gross Margin">Gross Margin</option>
                <option value="Margin %">Margin Percentage</option>
                <option value="Payout Amount">Payout Amount</option>
                <option value="Override Amount">Override Amount</option>
                <option value="Total Compensation">Total Compensation</option>
              </select>
            </div>

            <div id="calc-inputs" style="display: none;">
              <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 4px; font-weight: 500;">Result Column Name:</label>
                <input type="text" id="result-column" style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;" placeholder="Enter column name...">
              </div>

              <div id="dynamic-inputs"></div>
            </div>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; margin-top: 24px;">
        <div>
          <label style="display: flex; align-items: center; gap: 8px; font-size: 14px;">
            <input type="checkbox" id="add-to-table" checked>
            Add calculated column to table
          </label>
        </div>
        <div style="display: flex; gap: 12px;">
          <button id="preview-calc" style="
            padding: 10px 20px;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
          ">Preview</button>
          <button id="apply-calc" style="
            padding: 10px 24px;
            background: #27ae60;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
          ">Apply Calculation</button>
        </div>
      </div>
    `;

    dialog.appendChild(content);
    document.body.appendChild(dialog);

    // Populate available columns
    this.populateAvailableColumns();
    this.setupCalculatorEventListeners(dialog);

    return dialog;
  }

  populateAvailableColumns() {
    const container = document.getElementById('available-columns');
    if (!container) return;

    const table = document.querySelector('.flextable');
    if (!table) return;

    const headers = [...table.querySelectorAll('thead tr:last-child th')];
    headers.forEach(header => {
      const columnName = header.textContent.trim();
      if (!columnName) return;

      const item = document.createElement('div');
      item.className = 'ft-column-item';
      item.style.cssText = `
        padding: 8px 12px;
        margin: 4px 0;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.2s;
      `;

      item.innerHTML = `
        <span>${columnName}</span>
      `;

      item.addEventListener('click', () => {
        this.selectColumn(columnName);
      });

      container.appendChild(item);
    });
  }

  selectColumn(columnName) {
    const calcType = document.getElementById('calc-type').value;
    if (!calcType) {
      alert('Please select a calculation type first');
      return;
    }

    // Add column to active inputs
    this.addColumnToCalculation(columnName);
  }

  addColumnToCalculation(columnName) {
    const dynamicInputs = document.getElementById('dynamic-inputs');
    if (!dynamicInputs) return;

    const inputDiv = document.createElement('div');
    inputDiv.style.cssText = 'margin-bottom: 8px; display: flex; align-items: center; gap: 8px;';

    inputDiv.innerHTML = `
      <input type="text" value="${columnName}" readonly style="
        flex: 1;
        padding: 6px;
        border: 1px solid #ced4da;
        border-radius: 4px;
        background: #f8f9fa;
      ">
      <button class="remove-input" style="
        padding: 4px 8px;
        background: #e74c3c;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      ">Remove</button>
    `;

    inputDiv.querySelector('.remove-input').addEventListener('click', () => {
      dynamicInputs.removeChild(inputDiv);
    });

    dynamicInputs.appendChild(inputDiv);
  }

  setupCalculatorEventListeners(dialog) {
    // Close dialog
    dialog.querySelector('#close-calculator').addEventListener('click', () => {
      document.body.removeChild(dialog);
    });

    // Calculation type change
    dialog.querySelector('#calc-type').addEventListener('change', (e) => {
      const calcInputs = document.getElementById('calc-inputs');
      const dynamicInputs = document.getElementById('dynamic-inputs');

      if (e.target.value) {
        calcInputs.style.display = 'block';
        dynamicInputs.innerHTML = '';

        // Set default column name
        const resultColumn = document.getElementById('result-column');
        resultColumn.value = e.target.value;

        this.setupCalculationInputs(e.target.value);
      } else {
        calcInputs.style.display = 'none';
      }
    });

    // Preview calculation
    dialog.querySelector('#preview-calc').addEventListener('click', () => {
      this.previewCalculation();
    });

    // Apply calculation
    dialog.querySelector('#apply-calc').addEventListener('click', () => {
      this.applyCalculation();
      document.body.removeChild(dialog);
    });

    // Click outside to close
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        document.body.removeChild(dialog);
      }
    });
  }

  setupCalculationInputs(calcType) {
    const dynamicInputs = document.getElementById('dynamic-inputs');
    if (!dynamicInputs) return;

    // Add instruction based on calculation type
    const instruction = document.createElement('div');
    instruction.style.cssText = 'margin-bottom: 12px; padding: 8px; background: #e3f2fd; border-radius: 4px; font-size: 12px; color: #1976d2;';

    switch (calcType) {
      case 'Commission %':
        instruction.textContent = 'Select columns for: Commission Amount, Revenue';
        break;
      case 'Commission Amount':
        instruction.textContent = 'Select columns for: Revenue, Commission %';
        break;
      case 'Net Revenue':
        instruction.textContent = 'Select columns for: Gross Revenue, Costs/Deductions';
        break;
      case 'Gross Margin':
        instruction.textContent = 'Select columns for: Revenue, Cost of Goods Sold';
        break;
      case 'Margin %':
        instruction.textContent = 'Select columns for: Gross Margin, Revenue';
        break;
      case 'Payout Amount':
        instruction.textContent = 'Select columns for: Commission Amount, Payout %';
        break;
      case 'Override Amount':
        instruction.textContent = 'Select columns for: Base Commission, Override %';
        break;
      case 'Total Compensation':
        instruction.textContent = 'Select columns for: Base Pay, Commission, Bonuses, etc.';
        break;
    }

    dynamicInputs.appendChild(instruction);
  }

  previewCalculation() {
    console.log('[CommissionCalculator] Previewing calculation...');
    // TODO: Implement preview logic
    alert('Preview calculation results would be shown here');
  }

  applyCalculation() {
    const calcType = document.getElementById('calc-type').value;
    const resultColumn = document.getElementById('result-column').value;
    const addToTable = document.getElementById('add-to-table').checked;

    if (!calcType || !resultColumn) {
      alert('Please select calculation type and enter result column name');
      return;
    }

    const inputs = [...document.querySelectorAll('#dynamic-inputs input[readonly]')].map(input => input.value);

    console.log('[CommissionCalculator] Applying calculation:', {
      calcType,
      resultColumn,
      inputs,
      addToTable
    });

    // Trigger calculation application
    window.dispatchEvent(new CustomEvent('commissionCalculationApplied', {
      detail: {
        calcType,
        resultColumn,
        inputs,
        addToTable
      }
    }));
  }

  // Calculation methods
  calculateCommissionPercentage(commissionAmount, revenue) {
    if (!revenue || revenue === 0) return 0;
    return (commissionAmount / revenue) * 100;
  }

  calculateCommissionAmount(revenue, commissionPercent) {
    return (revenue * commissionPercent) / 100;
  }

  calculateNetRevenue(grossRevenue, costs) {
    return grossRevenue - costs;
  }

  calculateGrossMargin(revenue, cogs) {
    return revenue - cogs;
  }

  calculateMarginPercentage(grossMargin, revenue) {
    if (!revenue || revenue === 0) return 0;
    return (grossMargin / revenue) * 100;
  }

  calculatePayoutAmount(commissionAmount, payoutPercent) {
    return (commissionAmount * payoutPercent) / 100;
  }

  calculateOverrideAmount(baseCommission, overridePercent) {
    return (baseCommission * overridePercent) / 100;
  }

  calculateTotalCompensation(...amounts) {
    return amounts.reduce((total, amount) => total + (parseFloat(amount) || 0), 0);
  }
}