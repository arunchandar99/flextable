export function toNumber(str) {
    if (str === null || str === undefined) return null;
    const s = String(str)
      .replace(/[,\s]/g, "")    // remove thousands separators & spaces
      .replace(/[%]/g, "")      // drop percent sign
      .replace(/[$£€₹]/g, "")   // drop common currency symbols
      .replace(/−/g, "-");      // normalize minus
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  
  export function toDate(str) {
    if (!str) return null;
    // First try native
    const d = new Date(str);
    if (!isNaN(d)) return stripTime(d);
  
    // Try simple d{1,2}/d{1,2}/yyyy or dd-mm-yyyy
    const m = String(str).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      let a = parseInt(m[1], 10);
      let b = parseInt(m[2], 10);
      let y = parseInt(m[3], 10);
      const yyyy = y < 100 ? 2000 + y : y;
  
      // Heuristic: prefer MM/DD/YYYY, fallback to DD/MM/YYYY if invalid
      const cand1 = new Date(yyyy, a - 1, b);
      if (!isNaN(cand1)) return stripTime(cand1);
      const cand2 = new Date(yyyy, b - 1, a);
      if (!isNaN(cand2)) return stripTime(cand2);
    }
    return null;
  }
  
  function stripTime(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  
  export function includesCaseInsensitive(haystack, needle) {
    if (!needle) return true;
    return String(haystack).toLowerCase().includes(String(needle).toLowerCase());
  }
  
  // Best-effort type detection for a column
  export function detectType(sampleValues) {
    let numbers = 0, dates = 0, total = 0;
    for (const v of sampleValues) {
      if (v === null || v === undefined || v === "") continue;
      total++;
      if (toNumber(v) !== null) numbers++;
      else if (toDate(v)) dates++;
    }
    if (total && numbers / total >= 0.6) return "number";
    if (total && dates / total >= 0.6) return "date";
    return "text";
  }
  