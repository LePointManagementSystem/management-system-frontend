// src/services/hotelService.ts

import { Hotel, Room, Amenity, Image, RoomClass } from "@/types/hotel";

const API_BASE = 'http://174.129.54.133:5000/api';

// const getAuthHeaders = () => {
//   const token = localStorage.getItem('token');
//   if (!token) throw new Error("No auth token");
//   return {
//     'Authorization': `Bearer ${token}`,
//   };
// };


async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
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
  return response.json();
};


export const getHotels = async (): Promise<Hotel[]> => {
  const response = await fetch(`${API_BASE}/City/1/hotels`);

  if (!response.ok) {
    throw new Error("Failed to fetch hotels");
  }

  const json = await response.json();
  const hotels = json.data;

  return hotels.map((h: any, index: number) => ({
    id: index + 1,
    name: h.name ?? "Unnamed Hotel",
    starRating: h.starRating ?? 0,
    description: h.description ?? "",
    phoneNumber: "N/A",
    ownerName: h.ownerName ?? "Unknown Owner",
  }));
};


export const deleteHotel = async (id: number): Promise<void> => {
  const token = localStorage.getItem('token');
  fetch(`${API_BASE}/City/1/hotel/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    }
  }).then((res) => {
    if (!res.ok) throw new Error('Failed to delete hotel');
  });
};


const getHotelById = (id: number): Promise<Hotel> =>
  fetchJson(`${API_BASE}/${id}`);

const updateHotel = (id: number, hotel: Partial<Hotel>): Promise<Hotel> =>
  fetchJson(`${API_BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(hotel),
  });


const getHotelRooms = (hotelId: number): Promise<Room[]> =>
  fetchJson(`${API_BASE}/${hotelId}/rooms`);

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
  fetchJson(`${API_BASE}/${hotelId}/rating`);

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
