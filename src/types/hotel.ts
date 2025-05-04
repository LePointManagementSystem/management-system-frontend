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
    address: string;
    rooms: Room[];
    rating: number;
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
    id: number;
    name: string;
    description?: string;
  }
  