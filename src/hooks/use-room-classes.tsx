import { getRoomClasses } from "@/services/room-class-service";
import { RoomClass } from "@/types/hotel";
import { useEffect, useState } from "react"

export const useRoomClasses = () => {
    const [roomClasses, setRoomClasses] = useState<RoomClass[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const data = await getRoomClasses()
                setRoomClasses(data)

            } catch (error) {
                console.log("Error to fetch Room Classes");
            }finally{
                setLoading(false);
            }
        }
        fetchData();
    }, [])
    return { roomClasses, loading }
}