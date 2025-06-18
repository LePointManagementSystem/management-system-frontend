import { useState, useEffect } from 'react';
import { getHotels, addHotel, deleteHotel } from '@/services/hotel-service';
import { Hotel } from '@/types/hotel';

export const useHotelManagement = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getHotels();
        setHotels(data || []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const createHotel = async (hotel: Omit<Hotel, 'id'>) => {
    const newHotel = await addHotel(hotel);
    setHotels((prev) => [...prev, newHotel]);
  };

  const removeHotel = async (id: number) => {
    await deleteHotel(id);
    setHotels((prev) => prev.filter((h) => h.id !== id));
  };

  return { hotels, loading, error, createHotel, removeHotel };
};
