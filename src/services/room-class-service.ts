import { RoomClass } from "@/types/hotel";

const BASE_URL = "http://localhost:5004/api"

export const getRoomClasses = async (): Promise<RoomClass[]> => {
  const response = await fetch(`${BASE_URL}/RoomClass`); 
  if (!response.ok) {
    throw new Error('Failed to fetch room classes');
  }
  const data = await response.json();
  return data.data; 
};
