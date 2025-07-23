// types/booking.ts
export interface Guest {
  firstName: string;
  lastName: string;
  cin: string;
}

export interface CreateBookingRequest {
  hotelId: number;
  checkInDateUtc: string; // ISO string
  checkOutDateUtc: string; // ISO string
  roomIds: number[];
  paymentMethod: number;
  durationType: number;
  guest: Guest;
}
