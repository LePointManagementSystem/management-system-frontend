// src/utils/booking-helpers.ts
import { formatHaitiLongDateTime } from "@/utils/datetime";

export const formatDateTime = (date: Date): string => {
  // ✅ Single source of truth (Haiti timezone)
  return formatHaitiLongDateTime(date);
};

export type BookingDurationUI =
  | "overnight"
  | "1h"
  | "2h"
  | "3h"
  | "4h"
  | "5h"
  | "6h"
  | "7h"
  | "8h";

export const calculateCheckInOut = (date: Date, duration: BookingDurationUI) => {
  const checkInDate = new Date(date);

  // ✅ Hourly durations
  if (duration !== "overnight") {
    const hours = parseInt(duration.replace("h", ""), 10);
    const checkOutDate = new Date(checkInDate.getTime() + hours * 60 * 60 * 1000);

    return {
      checkInDateUtc: checkInDate.toISOString(),
      checkOutDateUtc: checkOutDate.toISOString(),
    };
  }

  // ✅ Overnight: fixed 9PM -> 9AM (next day)
  const overnightCheckIn = new Date(checkInDate);
  overnightCheckIn.setHours(21, 0, 0, 0);

  const overnightCheckOut = new Date(overnightCheckIn);
  overnightCheckOut.setDate(overnightCheckOut.getDate() + 1);
  overnightCheckOut.setHours(9, 0, 0, 0);

  return {
    checkInDateUtc: overnightCheckIn.toISOString(),
    checkOutDateUtc: overnightCheckOut.toISOString(),
  };
};
