// src/utils/booking-helpers.ts
import { formatHaitiLongDateTime } from "@/utils/datetime";

export const formatDateTime = (date: Date): string => {
  // ✅ Single source of truth (Haiti timezone)
  return formatHaitiLongDateTime(date);
};

export const calculateCheckInOut = (date: Date, duration: "2h" | "overnight") => {
  const checkInDate = new Date(date);

  if (duration === "2h") {
    const checkOutDate = new Date(checkInDate.getTime() + 2 * 60 * 60 * 1000);
    return {
      checkInDateUtc: checkInDate.toISOString(),
      checkOutDateUtc: checkOutDate.toISOString(),
    };
  }

  const overnightCheckIn = new Date(checkInDate);
  overnightCheckIn.setHours(21, 0, 0, 0);

  const overnightCheckOut = new Date(overnightCheckIn);
  overnightCheckOut.setDate(overnightCheckOut.getDate() + 1);
  overnightCheckOut.setHours(7, 0, 0, 0);

  return {
    checkInDateUtc: overnightCheckIn.toISOString(),
    checkOutDateUtc: overnightCheckOut.toISOString(),
  };
};
