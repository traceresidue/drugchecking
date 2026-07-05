// samples.date_collected comes from the lab's collection-card pipeline in a
// "DDMonYYYY" format (e.g. "20Oct2022") -- not ISO-8601, so it can't be
// compared as a string or parsed with SQLite's date functions. We parse it
// here in JS for date-range filtering and display.

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Parses "DDMonYYYY" (e.g. "20Oct2022"). Falls back to native Date parsing
 * for already-ISO-ish values. Returns null if unparseable. */
export function parseCardDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  const m = /^(\d{1,2})([A-Za-z]{3})(\d{4})$/.exec(trimmed);
  if (m) {
    const [, dd, mon, yyyy] = m as unknown as [string, string, string, string];
    const month = MONTHS[mon.toLowerCase()];
    if (month === undefined) return null;
    const d = new Date(Number(yyyy), month, Number(dd));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** yyyy-mm-dd for display / sorting, or an em-dash if unparseable. */
export function formatDateForDisplay(value: string | null | undefined): string {
  const d = parseCardDate(value);
  if (!d) return value ?? '—';
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}
