// src/types/hotel.ts

export interface Room {
  roomId: number
  roomClassName?: string
  number: string
  adultsCapacity: number
  childrenCapacity?: number
  // REMOVED: pricePerNight — le prix est sur la grille RoomClassPricing de la RoomClass.
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

/**
 * Un tarif d'une catégorie de chambre pour un type de durée donné.
 * Modèle haïtien : 1h, 2h, 3h, 4h, 5h, 6h, 7h, 8h, Nuit, Séjour (24h).
 */
export interface RoomClassPricing {
  id: number;
  durationType: number;      // valeur de l'enum BookingDurationType
  durationLabel: string;     // libellé lisible, ex: "2 heures", "Nuit (Overnight)"
  price: number;             // prix en HTG
}

export interface RoomClass {
  roomClassID: number;
  roomType: string;
  name: string;
  description: string;
  hotelName: string;
  hotelId: number;
  /** Grille de prix par durée (peut être vide si non encore configurée). */
  pricings: RoomClassPricing[];
}

export type AvailableRoom = {
  roomId: number;
  roomClassName: string;
  number: string;
  adultsCapacity: number;
  childrenCapacity: number;
  // REMOVED: pricePerNight — le prix dépend du DurationType choisi à la réservation.
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
  numbers: [string];
}
