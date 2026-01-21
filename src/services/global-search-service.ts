import { API_BASE_URL} from "@/config/api-base";

export type BookingSearchResultDto = {
    bookingId: number;
    confirmationNumber: string;
    guestName: string;
    roomNumbers: string;
    checkInDateUtc: string;
    checkOutDateUtc: string;
    status: string;
};

export type RoomSearchResultDto = {
    roomId: number;
    number: string;
    roomClassId: number;
    roomClassName: string;
};

export type GuestSearchResultDto = {
    guestId: string;
    fullName: string;
    cin: string;
    email: string;
};

export type GlobalSearchResponseDto = {
    bookings: BookingSearchResultDto[];
    rooms: RoomSearchResultDto[];
    guests: GuestSearchResultDto[];
};

type ApiEnvelope<T> = {
    succeeded?: boolean;
    Succeeded?: boolean;
    message?: string;
    Message?: string;
    data?: T;
    Data?: T;
};

function tokenOrThrow(): string {
    const t = localStorage.getItem("token");
    if (!t) throw new Error("Not authenticated");
    return t;
}

function unwrap<T>(raw: ApiEnvelope<T> | T): T {
    const anyRaw: any = raw as any;
    return (anyRaw?.data ?? anyRaw?.Data ?? raw) as T;
}

export async function globalSearch(q: string, hotelId?: number, limit: number = 6): Promise<GlobalSearchResponseDto> {
    const token = tokenOrThrow();
    const qs = new URLSearchParams();
    qs.set("q", q);
    qs.set("limit", String(limit));
    if (hotelId != null) qs.set("hotelId", String(hotelId));

    const res = await fetch(`${API_BASE_URL}/api/Search/global?${qs.toString()}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
        },
    });

    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Global search failed");
    }

    const json = await res.json();
    return unwrap<GlobalSearchResponseDto>(json);
}