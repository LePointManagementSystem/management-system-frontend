// services/booking-service.ts
import { Booking } from "@/types/hotel";

export const createBooking = async (bookingData: {
  hotelId: number;
  checkInDateUtc: string;
  checkOutDateUtc: string;
  roomIds: number[];
  paymentMethod: number;
  durationType: number;
  guest: {
    firstName: string;
    lastName: string;
    cin: string;
  };
}) :Promise<Booking[]>=> {
  const token = localStorage.getItem('token');

   if (!token) {
    throw new Error("User is not authenticated. Token not found.");
  }
  const res = await fetch("/api/Booking/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      //include authorization header if required
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(bookingData),
  });

  if (!res.ok) {
    throw new Error("Failed to create booking");
  }

  return await res.json();
};
