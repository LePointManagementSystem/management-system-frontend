// types/booking.ts

import { Guest } from "./client";

export interface BookingPayload {
  hotelId: number;
  checkInDateUtc: string;
  checkOutDateUtc: string;
  roomIds: number[];
  paymentMethod: number;
  durationType: number;
  guest: Guest;
}