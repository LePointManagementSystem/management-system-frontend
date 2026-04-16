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
  | "8h"

/**
 * Calculates check-in/out timestamps.
 *
 * Rules:
 * - Hourly (1h..8h): checkOut = checkIn + X hours
 * - Overnight: starts at 21:00 and ends next day 09:00 (keeps your existing logic)
 * - Stay: user selects a check-out date (must be after check-in)
 */
export const calculateCheckInOut = (
  date: Date,
  duration: BookingDurationUI,
  stayCheckOutDate?: Date
) => {
  const checkIn = new Date(date)

  // ✅ Stay (24h+): check-out date chosen by user
  if (duration === "stay") {
    if (!stayCheckOutDate) {
      throw new Error("Stay requires a check-out date.")
    }

    const out = new Date(stayCheckOutDate)

    // keep the same time-of-day as check-in to ensure 24h blocks
    out.setHours(
      checkIn.getHours(),
      checkIn.getMinutes(),
      checkIn.getSeconds(),
      checkIn.getMilliseconds()
    )

    if (out.getTime() <= checkIn.getTime()) {
      throw new Error("Check-out date must be after check-in date.")
    }

    return {
      checkInDateUtc: checkIn.toISOString(),
      checkOutDateUtc: out.toISOString(),
    }
  }

  // ✅ Overnight: 21:00 -> 09:00 next day (unchanged)
  if (duration === "overnight") {
    checkIn.setHours(21, 0, 0, 0)
    const checkOut = new Date(checkIn)
    checkOut.setDate(checkOut.getDate() + 1)
    checkOut.setHours(9, 0, 0, 0)

    return {
      checkInDateUtc: checkIn.toISOString(),
      checkOutDateUtc: checkOut.toISOString(),
    }
  }

  // ✅ Hourly durations
  const hours = parseInt(duration.replace("h", ""), 10)
  const checkOut = new Date(checkIn)
  checkOut.setHours(checkOut.getHours() + hours)

  return {
    checkInDateUtc: checkIn.toISOString(),
    checkOutDateUtc: checkOut.toISOString(),
  }
}
