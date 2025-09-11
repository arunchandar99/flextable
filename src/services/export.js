/** Export the CURRENT rendered table to CSV (WYSIWYG) */
export function exportCSVFromDOM() {
    const table = document.querySelector(".flextable");
    if (!table) return;
  
    const lines = [];
  
    // Header (last <tr> in <thead> for future multi-row headers)
    if (table.tHead && table.tHead.rows.length) {
      const last = table.tHead.rows[table.tHead.rows.length - 1];
      lines.push(cells(last.cells).map(csvEscape));
    }
  
    // Body
    if (table.tBodies.length) {
      Array.from(table.tBodies[0].rows).forEach(tr => {
        lines.push(cells(tr.cells).map(csvEscape));
      });
    }
  
    const csv = lines.map(cols => cols.join(",")).join("\n");
    download(csv, "flextable_export.csv");
  }
  
  function cells(htmlCollection) {
    return Array.from(htmlCollection).map(td => td.textContent ?? "");
  }
  
  function csvEscape(v) {
    const needsQuotes = /[",\n]/.test(v);
    const s = String(v).replace(/"/g, '""');
    return needsQuotes ? `"${s}"` : s;
  }
  
  function download(content, filename) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.setAttribute("download", filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  