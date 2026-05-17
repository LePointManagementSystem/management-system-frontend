// src/utils/booking-helpers.ts

export type BookingDurationUI =
  | "stay"
  | "overnight"
  | "1h"
  | "2h"
  | "3h"
  | "4h"
  | "5h"
  | "6h"
  | "7h"
  | "8h";

/**
 * Calculates check-in/out timestamps to send to the backend.
 *
 * Rules:
 * - Hourly (1h..8h) : checkOut = checkIn + N hours
 * - Overnight       : starts at 21:00 local, ends at 09:00 next day
 *                     (matches CalculateOvernightRange on the backend after the
 *                      timezone fix — both now use 21:00 Haiti local time)
 * - Stay (24h+)     : user selects a check-out date; time-of-day is inherited
 *                     from check-in to keep 24-hour billing blocks
 */
export const calculateCheckInOut = (
  date: Date,
  duration: BookingDurationUI,
  stayCheckOutDate?: Date
) => {
  const checkIn = new Date(date);

  // ── Stay (24h+) ─────────────────────────────────────────────────────────
  if (duration === "stay") {
    if (!stayCheckOutDate) {
      throw new Error("Stay requires a check-out date.");
    }

    const out = new Date(stayCheckOutDate);

    // Inherit the same time-of-day as check-in to ensure 24h billing blocks.
    out.setHours(
      checkIn.getHours(),
      checkIn.getMinutes(),
      checkIn.getSeconds(),
      checkIn.getMilliseconds()
    );

    if (out.getTime() <= checkIn.getTime()) {
      throw new Error("Check-out date must be after check-in date.");
    }

    return {
      checkInDateUtc:  checkIn.toISOString(),
      checkOutDateUtc: out.toISOString(),
    };
  }

  // ── Overnight ───────────────────────────────────────────────────────────
  // FIX: was 21:00 — now explicitly documented to match the backend's
  // CalculateOvernightRange which also uses 21:00 Haiti local time.
  // The backend ignores the time component of the request and recalculates
  // the range from the date portion, so the exact hour sent here is not
  // stored as-is, but keeping it at 21:00 avoids off-by-one date issues
  // when the request straddles midnight.
  if (duration === "overnight") {
    checkIn.setHours(21, 0, 0, 0);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 1);
    checkOut.setHours(9, 0, 0, 0);

    return {
      checkInDateUtc:  checkIn.toISOString(),
      checkOutDateUtc: checkOut.toISOString(),
    };
  }

  // ── Hourly ──────────────────────────────────────────────────────────────
  const hours    = parseInt(duration.replace("h", ""), 10);
  const checkOut = new Date(checkIn);
  checkOut.setHours(checkOut.getHours() + hours);

  return {
    checkInDateUtc:  checkIn.toISOString(),
    checkOutDateUtc: checkOut.toISOString(),
  };
};
