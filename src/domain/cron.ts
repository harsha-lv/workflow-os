/**
 * Minimal 5-field cron matcher: minute hour day-of-month month day-of-week.
 * Supports *, lists, ranges, and /steps. Designed for the schedule trigger worker.
 */
function parseField(field: string, min: number, max: number): number[] {
  if (field === "*") {
    return Array.from({ length: max - min + 1 }, (_, i) => i + min);
  }
  const values = new Set<number>();
  for (const part of field.split(",")) {
    const [range, stepRaw] = part.split("/");
    const step = stepRaw ? Number(stepRaw) : 1;
    if (!range) continue;
    if (range.includes("-")) {
      const [a, b] = range.split("-").map(Number);
      if (a == null || b == null) continue;
      for (let n = a; n <= b; n += step) {
        if (n >= min && n <= max) values.add(n);
      }
    } else if (range === "*") {
      for (let n = min; n <= max; n += step) values.add(n);
    } else {
      const n = Number(range);
      if (n >= min && n <= max) values.add(n);
    }
  }
  return [...values];
}

export function cronMatches(expr: string, date: Date): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [minute, hour, day, month, weekday] = parts as [string, string, string, string, string];
  const m = parseField(minute, 0, 59);
  const h = parseField(hour, 0, 23);
  const d = parseField(day, 1, 31);
  const mo = parseField(month, 1, 12);
  const w = parseField(weekday, 0, 6);
  return (
    m.includes(date.getUTCMinutes()) &&
    h.includes(date.getUTCHours()) &&
    d.includes(date.getUTCDate()) &&
    mo.includes(date.getUTCMonth() + 1) &&
    w.includes(date.getUTCDay())
  );
}

export function nextCron(expr: string, from: Date): Date | null {
  const start = new Date(from.getTime());
  start.setUTCSeconds(0, 0);
  start.setUTCMinutes(start.getUTCMinutes() + 1);
  for (let i = 0; i < 60 * 24 * 400; i += 1) {
    const candidate = new Date(start.getTime() + i * 60_000);
    if (cronMatches(expr, candidate)) return candidate;
  }
  return null;
}
