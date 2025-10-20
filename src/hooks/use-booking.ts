import { useState } from "react";
import { createBooking } from "@/services/booking-service";
import { BookingPayload } from "@/types/boking";

export const useBooking = () => {
  const [loading, setLoading] = useState(false);

  const submitBooking = async (payload: BookingPayload) => {
    setLoading(true);
    try {
      const result = await createBooking(payload);
      return result;
    } catch (error) {
      console.error("Booking error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { submitBooking, loading };
};
