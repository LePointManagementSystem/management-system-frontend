// services/booking-service.ts
import { Booking } from "@/types/hotel";

const createBooking = async (bookingData: {
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
}) => {
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
