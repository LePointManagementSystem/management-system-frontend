// src/services/hotelService.ts

import { Hotel, Room, Amenity, Image, RoomClass } from "@/types/hotel";

const API_BASE = 'http://localhost:5004/api';

// const getAuthHeaders = () => {
//   const token = localStorage.getItem('token');
//   if (!token) throw new Error("No auth token");
//   return {
//     'Authorization': `Bearer ${token}`,
//   };
// };


async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', ...options.headers },
    ...options,
  });

  const raw = await res.text()
  let json: any = null
  try { json = raw ? JSON.parse(raw) : null; } catch {}

  if (!res.ok) {
    throw new Error(json?.message || json?.error || raw || `API error: ${res.status}`);

  }
  return (json ?? null ) as T;
}


export const addHotel = async (hotel: Omit<Hotel, 'id'>): Promise<Hotel> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}/City/1/hotels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(hotel),
  });

  const raw = await response.text();
  let json: any = null;
  try { json = raw ? JSON.parse(raw) : null; } catch {}
  if (!response.ok) {
    throw new Error(json?.message || raw || "Failed to add hotel");
  }

  //const json = await response.json();
  const data = json?.data ?? json;

  //const id = Number(data?.id ?? data?.hotelId ?? data?.hotelID);
  return {
    id: Number(data.id ?? data.hotelId ?? data.hotelID),
    name: data.name,
    starRating: data.starRating,
    description: data.description,
    phoneNumber: data.phoneNumber,
    ownerName: data.ownerName,
    ownerID: data?.ownerID ?? data?.ownerId ?? data?.OwnerId,
  } as Hotel;
  //return response.json();
};


export const getHotels = async (): Promise<Hotel[]> => {
  const response = await fetch(`${API_BASE}/City/1/hotels`);

  const raw = await response.text();
  let json: any = null;
  try { json = raw ? JSON.parse(raw): null; } catch{}

  if (!response.ok) {
    throw new Error(json?.message || raw || "Failed to fetch hotels");

  }

  //const json = await response.json();
  //const hotels = json.data;
  const hotels = (json?.data ?? json) as any[];
  if (!Array.isArray(hotels)) {
    console.error("Unexpected hotels response:", json);
    throw new Error("Invalid hotels response format");
  }

  return hotels
    .map((h: any) => {
      const id = Number(h?.id ?? h?.hotelId ?? h?.hotelID);
      return {
        id,
        name: h?.name ?? "Unnamed Hotel",
        starRating: h?.starRating ?? 0,
        description: h?.description ?? "",
        phoneNumber: h?.phoneNumber ?? "N/A",
        ownerName: h?.ownerName ?? "Unknow Owner",
        ownerID: h?.ownerID ?? h?.ownerId,
      } as Hotel;
    })
    .filter((h) => Number.isFinite(h.id) && h.id > 0);
};


export const deleteHotel = async (id: number): Promise<void> => {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE}/Hotel/${id}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}`} : {}),

    },
  });

  const raw = await res.text();
  let json: any = null;
  try { json = raw ? JSON.parse(raw) : null } catch {}

  if(!res.ok) {
    throw new Error(
      json?.message ||
      json?.error ||
      raw ||
      `Delete failed (${res.status})`
    );
  }
};


const getHotelById = (id: number): Promise<Hotel> =>
  fetchJson(`${API_BASE}/Hotel/${id}`);

const updateHotel = (id: number, hotel: Partial<Hotel>): Promise<Hotel> =>
  fetchJson(`${API_BASE}/Hotel/${id}`, {
    method: 'PUT',
    headers: { "Content-Type": "application/json"},
    body: JSON.stringify(hotel),
  });


const getHotelRooms = (hotelId: number): Promise<Room[]> =>
  fetchJson(`${API_BASE}/Hotel/${hotelId}/rooms`);

const getHotelAmenities = (hotelId: number): Promise<Amenity[]> =>
  fetchJson(`${API_BASE}/${hotelId}/amenities`);

const addHotelAmenity = (hotelId: number, amenity: Amenity): Promise<void> =>
  fetchJson(`${API_BASE}/${hotelId}/amenities`, {
    method: 'POST',
    body: JSON.stringify(amenity),
  });

const removeHotelAmenity = (hotelId: number, amenityId: number): Promise<void> =>
  fetch(`${API_BASE}/${hotelId}/amenities/${amenityId}`, { method: 'DELETE' }).then((res) => {
    if (!res.ok) throw new Error('Failed to delete amenity');
  });

const getHotelRating = (hotelId: number): Promise<number> =>
  fetchJson(`${API_BASE}/Hotel/${hotelId}/rating`);

const uploadHotelImage = (hotelId: number, formData: FormData): Promise<void> =>
  fetch(`${API_BASE}/${hotelId}/upload-image`, {
    method: 'POST',
    body: formData,
  }).then((res) => {
    if (!res.ok) throw new Error('Image upload failed');
  });

const deleteHotelImage = (hotelId: number, publicId: string): Promise<void> =>
  fetch(`${API_BASE}/${hotelId}/delete-image/${publicId}`, {
    method: 'DELETE',
  }).then((res) => {
    if (!res.ok) throw new Error('Failed to delete image');
  });

const getHotelImages = (hotelId: number): Promise<Image[]> =>
  fetchJson(`${API_BASE}/${hotelId}/images`);

const getHotelRoomClasses = (hotelId: number): Promise<RoomClass[]> =>
  fetchJson(`${API_BASE}/${hotelId}/roomclasses`);

const addHotelRoomClass = (hotelId: number, roomClass: RoomClass): Promise<void> =>
  fetchJson(`${API_BASE}/${hotelId}/roomclasses`, {
    method: 'POST',
    body: JSON.stringify(roomClass),
  });

const searchHotels = (query: string): Promise<Hotel[]> =>
  fetchJson(`${API_BASE}/search?query=${encodeURIComponent(query)}`);

export const hotelService = {
  getHotelById,
  updateHotel,
  deleteHotel,
  getHotelRooms,
  getHotelAmenities,
  addHotelAmenity,
  removeHotelAmenity,
  getHotelRating,
  uploadHotelImage,
  deleteHotelImage,
  getHotelImages,
  getHotelRoomClasses,
  addHotelRoomClass,
  searchHotels,
};
