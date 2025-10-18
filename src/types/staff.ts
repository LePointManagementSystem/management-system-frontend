export interface Staff {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  phoneNumber: string;
  hotelId: number;
  isActive: boolean;
}

export interface StaffCreateRequest {
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  phoneNumber: string;
  hotelId: number;
  isActive: boolean;
}
