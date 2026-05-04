import { addMinutes } from "date-fns";
import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";

// ---------------------------------------------------------------------------
// generateTimeSlots
// ---------------------------------------------------------------------------

interface GenerateTimeSlotsParams {
  /** Array of calendar dates in YYYY-MM-DD format (may be non-contiguous) */
  dates: string[];
  /** Wall-clock start/end of the daily scheduling window, e.g. "09:00" / "17:00" */
  timeRange: { start: string; end: string };
  granularity: 15 | 30 | 60;
  /** IANA tz name, e.g. "America/New_York" */
  timezone: string;
}

/**
 * Expands an array of calendar dates + daily time window into discrete UTC slot intervals.
 *
 * Dates may be non-contiguous (e.g. Mon + Wed + Fri only).
 * "24:00" is accepted as the end time and represents end-of-day (last slot ends at midnight).
 */
export function generateTimeSlots(
  params: GenerateTimeSlotsParams,
): Array<{ startTime: Date; endTime: Date }> {
  const { dates, timeRange, granularity, timezone } = params;

  const [startH, startM] = timeRange.start.split(":").map(Number);
  const [endH, endM] = timeRange.end.split(":").map(Number);
  const windowStartMinutes = startH * 60 + startM;
  const windowEndMinutes = endH * 60 + endM; // may be 1440 for "24:00"

  const slots: Array<{ startTime: Date; endTime: Date }> = [];

  for (const dateStr of dates) {
    const [yearStr, monthStr, dayStr] = dateStr.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1; // 0-indexed
    const date = parseInt(dayStr, 10);

    for (
      let minutes = windowStartMinutes;
      minutes < windowEndMinutes;
      minutes += granularity
    ) {
      const slotHour = Math.floor(minutes / 60);
      const slotMinute = minutes % 60;

      // new Date(y, m, d, h, min) in JS-local time; fromZonedTime reinterprets
      // the same y/m/d/h/min as wall-clock in `timezone` → UTC instant.
      const wallClock = new Date(year, month, date, slotHour, slotMinute, 0, 0);
      const utcStart = fromZonedTime(wallClock, timezone);

      // Skip slots that don't exist in this timezone (e.g. spring-forward gap).
      const roundTrip = toZonedTime(utcStart, timezone);
      const sameLocalTime =
        roundTrip.getFullYear() === year &&
        roundTrip.getMonth() === month &&
        roundTrip.getDate() === date &&
        roundTrip.getHours() === slotHour &&
        roundTrip.getMinutes() === slotMinute;

      if (!sameLocalTime) continue;

      const utcEnd = addMinutes(utcStart, granularity);
      slots.push({ startTime: utcStart, endTime: utcEnd });
    }
  }

  return slots;
}

// ---------------------------------------------------------------------------
// getSlotLocalTime
// ---------------------------------------------------------------------------

/**
 * Returns the wall-clock time of a UTC instant in the given timezone, as "HH:MM".
 * Used to match time slots against slot label time ranges.
 */
export function getSlotLocalTime(utcDate: Date, timezone: string): string {
  return formatInTimeZone(utcDate, timezone, "HH:mm");
}

// ---------------------------------------------------------------------------
// formatSlotTime
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable time string like "9:00 AM" or "12:30 PM".
 */
export function formatSlotTime(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "h:mm a");
}

// ---------------------------------------------------------------------------
// formatSlotDate
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable date string like "Mon Jan 6".
 */
export function formatSlotDate(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "EEE MMM d");
}

// ---------------------------------------------------------------------------
// groupSlotsByDay
// ---------------------------------------------------------------------------

type SlotRecord = { id: string; start_time: string; end_time: string };

/**
 * Groups an array of slot records by their calendar date in the given timezone.
 * Returns a Map keyed by "YYYY-MM-DD" strings.
 */
export function groupSlotsByDay(
  slots: SlotRecord[],
  timezone: string,
): Map<string, SlotRecord[]> {
  const map = new Map<string, SlotRecord[]>();

  for (const slot of slots) {
    const utcDate = new Date(slot.start_time);
    const dayKey = formatInTimeZone(utcDate, timezone, "yyyy-MM-dd");

    if (!map.has(dayKey)) {
      map.set(dayKey, []);
    }
    map.get(dayKey)!.push(slot);
  }

  return map;
}
