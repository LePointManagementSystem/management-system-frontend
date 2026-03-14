// src/services/hotelService.ts

import { Hotel, Room, Amenity, Image, RoomClass } from "@/types/hotel";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
  const response = await fetch(`${BASE_URL}/City/1/hotels`, {
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
  const response = await fetch(`${BASE_URL}/City/1/hotels`);

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
  fetch(`${BASE_URL}/City/1/hotel/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    }
  }).then((res) => {
    if (!res.ok) throw new Error('Failed to delete hotel');
  });
};


const getHotelById = (id: number): Promise<Hotel> =>
  fetchJson(`${BASE_URL}/${id}`);

const updateHotel = (id: number, hotel: Partial<Hotel>): Promise<Hotel> =>
  fetchJson(`${BASE_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(hotel),
  });


const getHotelRooms = (hotelId: number): Promise<Room[]> =>
  fetchJson(`${BASE_URL}/${hotelId}/rooms`);

const getHotelAmenities = (hotelId: number): Promise<Amenity[]> =>
  fetchJson(`${BASE_URL}/${hotelId}/amenities`);

const addHotelAmenity = (hotelId: number, amenity: Amenity): Promise<void> =>
  fetchJson(`${BASE_URL}/${hotelId}/amenities`, {
    method: 'POST',
    body: JSON.stringify(amenity),
  });

const removeHotelAmenity = (hotelId: number, amenityId: number): Promise<void> =>
  fetch(`${BASE_URL}/${hotelId}/amenities/${amenityId}`, { method: 'DELETE' }).then((res) => {
    if (!res.ok) throw new Error('Failed to delete amenity');
  });

const getHotelRating = (hotelId: number): Promise<number> =>
  fetchJson(`${BASE_URL}/${hotelId}/rating`);

const uploadHotelImage = (hotelId: number, formData: FormData): Promise<void> =>
  fetch(`${BASE_URL}/${hotelId}/upload-image`, {
    method: 'POST',
    body: formData,
  }).then((res) => {
    if (!res.ok) throw new Error('Image upload failed');
  });

const deleteHotelImage = (hotelId: number, publicId: string): Promise<void> =>
  fetch(`${BASE_URL}/${hotelId}/delete-image/${publicId}`, {
    method: 'DELETE',
  }).then((res) => {
    if (!res.ok) throw new Error('Failed to delete image');
  });

const getHotelImages = (hotelId: number): Promise<Image[]> =>
  fetchJson(`${BASE_URL}/${hotelId}/images`);

const getHotelRoomClasses = (hotelId: number): Promise<RoomClass[]> =>
  fetchJson(`${BASE_URL}/${hotelId}/roomclasses`);

const addHotelRoomClass = (hotelId: number, roomClass: RoomClass): Promise<void> =>
  fetchJson(`${BASE_URL}/${hotelId}/roomclasses`, {
    method: 'POST',
    body: JSON.stringify(roomClass),
  });

const searchHotels = (query: string): Promise<Hotel[]> =>
  fetchJson(`${BASE_URL}/search?query=${encodeURIComponent(query)}`);

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
