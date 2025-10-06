// src/types/hotel.ts

export interface Room {
  roomId: number
  roomClassName?: string
  number: string
  adultsCapacity: number
  childrenCapacity?: number
  pricePerNight?: number
  createdAtUtc?: string
  hotelId?: number 
}

export interface Hotel {
  id: number;
  name: string;
  starRating: number;
  description: string;
  phoneNumber: string;
  ownerName: string;
  ownerID?: number;
}


export interface Amenity {
  id: number;
  name: string;
  description?: string;
}

export interface Image {
  id: string;
  url: string;
  publicId: string;
}

export interface RoomClass {
  roomClassID: number;
  roomType: string;
  name: string;
  description: string;
  hotelName: string;
}

export type AvailableRoom = {
  roomId: number;
  roomClassName: string;
  number: string;
  adultsCapacity: number;
  childrenCapacity: number;
  pricePerNight: number;
  createdAtUtc: string;
};

type BookingDuration = "2_hours" | "overnight";

export interface Booking {
  id: number;
  roomId: [number];
  bookingId: number;
  startTime: Date;
  checkOutDateUtc: Date;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  duration: BookingDuration;
  numbers:[string];
}
