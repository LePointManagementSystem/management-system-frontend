// services/booking-service.ts

import { BookingPayload } from "@/types/boking";


export const createBooking = async (bookingData: BookingPayload) => {
  const token = localStorage.getItem('token');

   if (!token) {
    throw new Error("User is not authenticated. Token not found.");
  }
  const res = await fetch("http://localhost:5004/api/Booking/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(bookingData),
  });

  if (!res.ok) {
    throw new Error("Failed to create booking");
  }

  return await res.json();
};


