// CSV export. Cells that start with = + - @ are prefixed with ' so a spreadsheet never
// runs them as a formula (CSV injection).
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value) {
  if (value === null || value === undefined) return '';
  let s = value instanceof Date ? value.toISOString() : String(value);
  if (FORMULA_START.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// columns: [{ key, label }]. A leading BOM makes Excel read the file as UTF-8.
export function toCsv(columns, rows) {
  const lines = [columns.map((c) => csvCell(c.label)).join(',')];
  for (const row of rows) lines.push(columns.map((c) => csvCell(row[c.key])).join(','));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
