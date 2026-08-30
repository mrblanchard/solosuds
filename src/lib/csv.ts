// Shared CSV-writing helper for data export routes. Mirrors the quoting rules
// used by the existing CSV import parser (src/app/api/clients/import/route.ts)
// so a round trip through export -> import behaves as expected.

export interface CsvColumn {
  key: string;
  label: string;
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(columns: CsvColumn[], rows: Record<string, unknown>[]): string {
  const header = columns.map((c) => escapeCsvValue(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCsvValue(row[c.key])).join(","));
  return [header, ...lines].join("\r\n") + "\r\n";
}

export function csvFilename(dataType: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${dataType}-export-${date}.csv`;
}
