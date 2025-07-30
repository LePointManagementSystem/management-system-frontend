// components/TestBookingButton.tsx
"use client";
import { createBooking } from "@/services/booking-service";

const TestBookingButton = () => {
  const handleTestBooking = async () => {
    try {
      const bookingPayload = {
        hotelId: 1,
        checkInDateUtc: new Date("2025-07-30T15:54:37.055Z").toISOString(),
        checkOutDateUtc: new Date("2025-07-31T15:54:37.055Z").toISOString(),
        roomIds: [1],
        paymentMethod: 0,
        durationType: 2,
        guest: {
          firstName: "John",
          lastName: "Doe",
          cin: "AB1234567",
        },
      };

      const response = await createBooking(bookingPayload);
      console.log("Booking successful:", response);
    } catch (error: any) {
      console.error("Booking failed:", error.message);
    }
  };

  return (
    <button
      className="bg-green-500 text-white px-4 py-2 rounded"
      onClick={handleTestBooking}
    >
      Test Create Booking
    </button>
  );
};

export default TestBookingButton;
