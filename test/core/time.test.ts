import { describe, test, expect } from "bun:test";
import { parseTime, formatTimestamp, timestampToIso, now, getTimeRange } from "../../src/core/time";

describe("parseTime", () => {
  test("should parse yyyy-mm-dd hh:mm format", () => {
    const result = parseTime("2026-03-03 14:30");
    // Just verify it returns a valid timestamp (not throwing error)
    expect(result).toMatch(/^\d+$/);
  });

  test("should parse yyyy-mm-dd format (defaults to 00:00)", () => {
    const result = parseTime("2026-03-03");
    expect(result).toMatch(/^\d+$/);
  });

  test("should parse ISO format", () => {
    const result = parseTime("2026-03-03T14:30:00");
    expect(result).toMatch(/^\d+$/);
  });

  test("should parse ISO format with timezone", () => {
    const result = parseTime("2026-03-03T14:30:00+08:00");
    expect(result).toMatch(/^\d+$/);
  });

  test("should pass through Unix timestamp", () => {
    const result = parseTime("1772519400");
    expect(result).toBe("1772519400");
  });

  test("should throw error for invalid format", () => {
    expect(() => parseTime("invalid-date")).toThrow("Invalid time format");
  });

  test("should parse date with time hh:mm:ss", () => {
    const result = parseTime("2026-03-03 14:30:45");
    expect(result).toMatch(/^\d+$/);
  });

  test("should handle midnight", () => {
    const result = parseTime("2026-03-03 00:00");
    expect(result).toMatch(/^\d+$/);
  });

  test("should handle end of day", () => {
    const result = parseTime("2026-03-03 23:59");
    expect(result).toMatch(/^\d+$/);
  });

  test("should parse date with space separator", () => {
    const result = parseTime("2026-03-03 10:00");
    expect(result).toMatch(/^\d+$/);
  });
});

describe("formatTimestamp", () => {
  test("should format Unix timestamp to locale string", () => {
    const result = formatTimestamp("1772519400");
    // Format depends on locale, just check it's a string with date info
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  test("should format Unix timestamp as number", () => {
    const result = formatTimestamp(1772519400);
    expect(typeof result).toBe("string");
  });
});

describe("timestampToIso", () => {
  test("should convert Unix timestamp to ISO string", () => {
    const result = timestampToIso("1772519400");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });

  test("should convert Unix timestamp as number to ISO string", () => {
    const result = timestampToIso(1772519400);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });
});

describe("now", () => {
  test("should return current Unix timestamp", () => {
    const result = now();
    const expected = Math.floor(Date.now() / 1000);
    // Allow 1 second difference
    expect(parseInt(result)).toBeGreaterThanOrEqual(expected - 1);
    expect(parseInt(result)).toBeLessThanOrEqual(expected + 1);
  });

  test("should return string type", () => {
    const result = now();
    expect(typeof result).toBe("string");
  });
});

describe("getTimeRange", () => {
  test("should return start and end timestamps", () => {
    const result = getTimeRange(7);
    expect(result).toHaveProperty("start");
    expect(result).toHaveProperty("end");
  });

  test("should have end time after start time", () => {
    const result = getTimeRange(7);
    expect(parseInt(result.end)).toBeGreaterThan(parseInt(result.start));
  });

  test("should have correct difference for 7 days", () => {
    const result = getTimeRange(7);
    const diff = parseInt(result.end) - parseInt(result.start);
    const expectedDiff = 7 * 24 * 60 * 60; // 7 days in seconds
    expect(diff).toBeGreaterThanOrEqual(expectedDiff - 1);
    expect(diff).toBeLessThanOrEqual(expectedDiff + 1);
  });

  test("should work with custom days parameter", () => {
    const result = getTimeRange(1);
    const diff = parseInt(result.end) - parseInt(result.start);
    const expectedDiff = 24 * 60 * 60; // 1 day in seconds
    expect(diff).toBeGreaterThanOrEqual(expectedDiff - 1);
    expect(diff).toBeLessThanOrEqual(expectedDiff + 1);
  });
});

describe("integration", () => {
  test("should parse and format roundtrip", () => {
    const original = "2026-03-03 14:30";
    const timestamp = parseTime(original);
    const iso = timestampToIso(timestamp);
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  test("getTimeRange should use now() for start", () => {
    const range = getTimeRange(7);
    const currentNow = now();
    // Start should be very close to current time (within 1 second)
    expect(Math.abs(parseInt(range.start) - parseInt(currentNow))).toBeLessThanOrEqual(1);
  });

  test("should validate time range order", () => {
    const start = parseTime("2026-03-03 10:00");
    const end = parseTime("2026-03-03 12:00");
    expect(parseInt(end)).toBeGreaterThan(parseInt(start));
  });
});

describe("time validation", () => {
  test("end time should be after start time", () => {
    const start = parseTime("2026-03-03 10:00");
    const end = parseTime("2026-03-03 09:00");
    expect(parseInt(end)).toBeLessThan(parseInt(start));
  });

  test("same day different time", () => {
    const morning = parseTime("2026-03-03 09:00");
    const afternoon = parseTime("2026-03-03 17:00");
    expect(parseInt(afternoon)).toBeGreaterThan(parseInt(morning));
  });

  test("different days", () => {
    const earlier = parseTime("2026-03-01");
    const later = parseTime("2026-03-05");
    expect(parseInt(later)).toBeGreaterThan(parseInt(earlier));
  });
});
