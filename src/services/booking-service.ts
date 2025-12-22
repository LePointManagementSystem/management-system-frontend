// services/booking-service.ts

import { BookingPayload } from "@/types/boking"; // ⚠️ Vérifie l'orthographe du chemin (boking vs booking)

const BASE_URL = "http://localhost:5004/api";

/** Récupère l'en-tête Authorization avec le token stocké en local */
function getAuthHeader(): string {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Utilisateur non authentifié : token introuvable.");
  return `Bearer ${token}`;
}

/** Crée une réservation (booking) */
export const createBooking = async (bookingPayload: BookingPayload) => {
  // (Optionnel) inutile de relire le token ici puisque getAuthHeader() le fait déjà
  const res = await fetch(`${BASE_URL}/Booking/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(bookingPayload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Échec de création du booking : ${errText}`);
  }

  return await res.json();
};

/** Récupère un booking par son id */
export const fetchBookingById = async (id: string) => {
  const res = await fetch(`${BASE_URL}/Booking/${id}`, {
    method: "GET",
    headers: {
      Authorization: getAuthHeader(),
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Échec de récupération du booking : ${errText}`);
  }

  return await res.json();
};

/** Récupère tous les bookings */
export const fetchAllBookings = async () => {
  const res = await fetch(`${BASE_URL}/Booking/all`, {
    method: "GET",
    headers: {
      Authorization: getAuthHeader(),
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Échec de récupération des bookings : ${errText}`);
  }

  const data = await res.json();

  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.bookings)) return data.bookings;

  return [];
};

/** Met à jour le statut d'un booking */
export const updateBookingStatus = async (
  bookingId: number,
  statusId: number
): Promise<void> => {
  const res = await fetch(`${BASE_URL}/Booking/${bookingId}/Update_status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(statusId),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Échec de mise à jour du statut : ${errText}`);
  }
};
