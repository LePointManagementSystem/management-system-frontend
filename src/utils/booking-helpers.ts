// src/utils/booking-helpers.ts
export const formatDateTime = (date: Date): string => {
  return date.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const calculateCheckInOut = (
  date: Date,
  duration: "2h" | "overnight"
) => {
  const checkInDate = new Date(date);
  const checkOutDate = new Date(checkInDate);

  if (duration === "2h") {
    checkInDate.setHours(checkInDate.getHours(), 0, 0);
    checkOutDate.setHours(checkInDate.getHours() + 2, 0, 0);
  } else {
    checkInDate.setHours(21, 0, 0);
    checkOutDate.setDate(checkOutDate.getDate() + 1);
    checkOutDate.setHours(7, 0, 0);
  }

  return {
    checkInDateUtc: checkInDate.toISOString(),
    checkOutDateUtc: checkOutDate.toISOString(),
  };
};
