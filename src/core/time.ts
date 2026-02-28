/**
 * Parse human-readable time string to Unix timestamp (seconds)
 *
 * Supported formats:
 * - "yyyy-mm-dd hh:mm" (e.g., "2026-02-28 14:30")
 * - "yyyy-mm-dd" (e.g., "2026-02-28", defaults to 00:00)
 * - "yyyy-mm-ddThh:mm:ss" (ISO format)
 * - Unix timestamp (seconds as string)
 *
 * @param timeStr - Human-readable time string or Unix timestamp
 * @returns Unix timestamp in seconds (as string)
 */
export function parseTime(timeStr: string): string {
  // If it's already a Unix timestamp (all digits), return as is
  if (/^\d+$/.test(timeStr)) {
    return timeStr;
  }

  // Parse the time string
  const date = new Date(timeStr);

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid time format: ${timeStr}. Expected format: yyyy-mm-dd hh:mm or yyyy-mm-dd`);
  }

  return Math.floor(date.getTime() / 1000).toString();
}

/**
 * Format Unix timestamp to human-readable string
 *
 * @param timestamp - Unix timestamp in seconds (as string or number)
 * @returns Human-readable date string (e.g., "2026-02-28 14:30:00")
 */
export function formatTimestamp(timestamp: string | number): string {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
  const date = new Date(ts * 1000);
  return date.toLocaleString();
}

/**
 * Format Unix timestamp to ISO date string
 *
 * @param timestamp - Unix timestamp in seconds (as string or number)
 * @returns ISO date string (e.g., "2026-02-28T14:30:00.000Z")
 */
export function timestampToIso(timestamp: string | number): string {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
  return new Date(ts * 1000).toISOString();
}

/**
 * Get current time as Unix timestamp
 *
 * @returns Current Unix timestamp in seconds (as string)
 */
export function now(): string {
  return Math.floor(Date.now() / 1000).toString();
}

/**
 * Get time range from now to N days from now
 *
 * @param days - Number of days from now (default: 7)
 * @returns Object with start and end timestamps
 */
export function getTimeRange(days: number = 7): { start: string; end: string } {
  const start = now();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  const end = Math.floor(endDate.getTime() / 1000).toString();
  return { start, end };
}
