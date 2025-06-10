import { RoomClass } from "@/types/hotel";

export const getRoomClasses = async (): Promise<RoomClass[]> => {
  const response = await fetch("http://localhost:5004/api/RoomClass"); 
  if (!response.ok) {
    throw new Error('Failed to fetch room classes');
  }
  const data = await response.json();
  return data.data; 
};
