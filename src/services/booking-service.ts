// services/booking-service.ts

import { BookingPayload } from "@/types/boking";

const BASE_URL = "http://localhost:5004/api";

export const createBooking = async (bookingPayload: BookingPayload) => {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("User is not authenticated. Token not found.");
  }

  const res = await fetch(`${BASE_URL}/Booking/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(bookingPayload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create booking: ${errText}`);
  }

  return await res.json();
};

export const fetchBookingById = async (id: string) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("User is not authenticated. Token not found.");

  const res = await fetch(`${BASE_URL}/Booking/${id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch booking");
  }
  return await res.json();
};

export const fetchAllBookings = async () => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("User is not authenticated. Token not found.");

  const res = await fetch(`${BASE_URL}/Booking/all`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch bookings");
  }

  const data = await res.json();

  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.bookings)) return data.bookings;

  return [];
};

export const freeBooking = async (id: string) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("User is not authenticated. Token not found.");
}
