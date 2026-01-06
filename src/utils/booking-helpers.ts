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

// src/utils/booking-helpers.ts
export const calculateCheckInOut = (
  date: Date,
  duration: "2h" | "overnight"
) => {
  const checkInDate = new Date(date);

  if (duration === "2h") {
    // ✅ Garde l'heure ET les minutes exactes (ex: 10:30 reste 10:30)
    // ✅ Ajoute 2 heures en millisecondes (plus fiable que setHours + minutes=0)
    const checkOutDate = new Date(checkInDate.getTime() + 2 * 60 * 60 * 1000);

    return {
      checkInDateUtc: checkInDate.toISOString(),
      checkOutDateUtc: checkOutDate.toISOString(),
    };
  }

  // overnight (tu peux garder cette logique)
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
