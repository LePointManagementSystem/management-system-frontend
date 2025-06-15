// services/booking-service.ts
import { Booking } from "@/types/hotel";

const API_BASE = 'http://localhost:5004/api';


export const createBooking = async (booking: Omit<Booking, "id">) => {
  const response = await fetch("http://localhost:5004/api/Booking/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(booking),
  });

  if (!response.ok) {
    throw new Error("Failed to create booking");
  }

  const data = await response.json();
  return data;
};
