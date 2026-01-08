// src/utils/datetime.ts
export const HAITI_TIMEZONE = "America/Port-au-Prince";

/**
 * Safe parse for ISO UTC strings (ex: "2026-01-06T12:00:00Z")
 */
export function parseIsoUtc(isoUtc: string): Date | null {
  if (!isoUtc) return null;
  const d = new Date(isoUtc);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Formats: "Tuesday, January 6, 2026 at 07:16 AM" (Haiti timezone)
 */
export function formatHaitiLongDateTime(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: HAITI_TIMEZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  // Build: Tuesday, January 6, 2026 at 07:16 AM
  const weekday = get("weekday");
  const month = get("month");
  const day = get("day");
  const year = get("year");
  const hour = get("hour");
  const minute = get("minute");
  const dayPeriod = get("dayPeriod");

  return `${weekday}, ${month} ${day}, ${year} at ${hour}:${minute} ${dayPeriod}`.replace(/\s+/g, " ").trim();
}

/**
 * Formats: "Jan 06, 2026, 07:16 AM" (Haiti timezone)
 */
export function formatHaitiShortDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: HAITI_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/**
 * Formats time only: "07:16 AM" (Haiti timezone)
 */
export function formatHaitiTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: HAITI_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/**
 * Formats date only: "Jan 06, 2026" (Haiti timezone)
 */
export function formatHaitiDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: HAITI_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

/**
 * Convenience: ISO UTC -> "Jan 06, 2026, 07:16 AM"
 */
export function formatIsoUtcToHaitiShort(isoUtc: string): string {
  const d = parseIsoUtc(isoUtc);
  return d ? formatHaitiShortDateTime(d) : isoUtc;
}

/**
 * Convenience: ISO UTC -> "Tuesday, January 6, 2026 at 07:16 AM"
 */
export function formatIsoUtcToHaitiLong(isoUtc: string): string {
  const d = parseIsoUtc(isoUtc);
  return d ? formatHaitiLongDateTime(d) : isoUtc;
}
