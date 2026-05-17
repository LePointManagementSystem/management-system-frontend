// BUG FIX: Added `error` state so callers can detect and display load failures.
// The original hook caught errors with only console.log("Error to fetch Room Classes"),
// giving no signal to the UI. The booking page showed an empty room-type dropdown
// with no explanation when the API was unreachable or returned an error.

import { getRoomClasses } from "@/services/room-class-service";
import { RoomClass } from "@/types/hotel";
import { useEffect, useState } from "react"

export const useRoomClasses = () => {
    const [roomClasses, setRoomClasses] = useState<RoomClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);  // BUG FIX: was missing

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);                               // BUG FIX: reset error on retry
                const data = await getRoomClasses()
                setRoomClasses(data)
            } catch (err) {
                // BUG FIX: was console.log only — callers had no way to know it failed
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load room classes. Please try again."
                );
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [])

    return { roomClasses, loading, error }   // BUG FIX: error now exported
}
