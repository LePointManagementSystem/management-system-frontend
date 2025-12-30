export interface Staff {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  email?: string | null;
  phoneNumber?: string | null;
  hotelId: number;
  isActive: boolean;
}

export interface StaffCreateRequest {
  firstName: string;
  lastName: string;
  role: string;
  email?: string | null;       // ✅ optionnel pour RH-only
  phoneNumber?: string | null;
  hotelId: number;
  isActive: boolean;
}
