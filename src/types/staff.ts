export interface Staff {
  id: number;
  firstName: string;
  lastName: string;
  fullName?: string;
  role: string;
  email?: string | null;
  phoneNumber?: string | null;
  hotelId: number;
  hotelName?: string | null;
  isActive: boolean;
  createdAtUtc?: string;
  updatedAtUtc?: string;
}

export interface StaffCreateRequest {
  firstName: string;
  lastName: string;
  role: string;
  email?: string | null;
  phoneNumber?: string | null;
  hotelId: number;
  isActive?: boolean;
}
