// src/types/hotel.ts

export interface Room {
  id: number;
  number: string;
  type: string;
  capacity: number;
  price: number;
  status: 'available' | 'occupied' | 'maintenance';
}

export interface Hotel {
  id: number;
  name: string;
  starRating: number;
  description: string;
  phoneNumber: string;
  ownerID: number;
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

type BookingDuration = "2_hours" | "overnight";

export interface Booking {
  id: number;
  roomId: number;
  startTime: Date;
  endTime: Date;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  duration: BookingDuration;
}
