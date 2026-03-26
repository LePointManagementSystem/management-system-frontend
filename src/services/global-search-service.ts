const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type GlobalSearchItemType = "booking" | "room" | "guest" | "staff";

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
  guestId: string; // Guid string
  fullName: string;
  cin: string;
  email: string;
};

export type StaffSearchResultDto = {
  staffId: number;
  fullName: string;
  role: string;
  email: string;
  phone: string;
};

export type GlobalSearchResponseDto = {
  bookings: BookingSearchResultDto[];
  rooms: RoomSearchResultDto[];
  guests: GuestSearchResultDto[];
  staff: StaffSearchResultDto[];
};

function tokenOrThrow(): string {
  const t = localStorage.getItem("token");
  if (!t) throw new Error("Not authenticated");
  return t;
}

export async function globalSearch(q: string, hotelId?: number, limit = 6) {
  const token = tokenOrThrow();

  const params = new URLSearchParams();
  params.set("q", q);
  params.set("limit", String(limit));
  if (hotelId != null) params.set("hotelId", String(hotelId));

  const url = `${BASE_URL}/search/global?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Global search failed: ${res.status} ${text}`);
  }

  return (await res.json()) as GlobalSearchResponseDto;
}
