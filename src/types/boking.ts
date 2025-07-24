// types/booking.ts

import { Guest } from "./client";

export interface CreateBookingRequest {
  hotelId: number;
  checkInDateUtc: string; // ISO string
  checkOutDateUtc: string; // ISO string
  roomIds: number[];
  paymentMethod: number;
  durationType: number;
  guest: Guest;
}
