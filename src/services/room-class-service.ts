import { RoomClass } from "@/types/hotel";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const getRoomClasses = async (): Promise<RoomClass[]> => {
  const response = await fetch(`${BASE_URL}/RoomClass`); 
  if (!response.ok) {
    throw new Error('Failed to fetch room classes');
  }
  const data = await response.json();
  return data.data; 
};
