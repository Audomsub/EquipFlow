export type UserRole = "EMPLOYEE" | "IT_ADMIN" | "SUPER_ADMIN";
export type AssetStatus = "AVAILABLE" | "RESERVED" | "BORROWED" | "MAINTENANCE" | "LOST" | "DISPOSED";
export type ConditionStatus = "EXCELLENT" | "GOOD" | "FAIR" | "DAMAGED" | "BROKEN";
export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "BORROWED" | "RETURNED" | "OVERDUE" | "CANCELLED";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  employee_code?: string;
  department?: string;
  phone_number?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Location {
  id: string;
  name: string;
  building?: string;
  room?: string;
}

export interface Asset {
  id: string;
  asset_tag: string;
  serial_number?: string;
  name: string;
  model?: string;
  brand?: string;
  category_id?: string;
  category?: Category;
  location_id?: string;
  location?: Location;
  status: AssetStatus;
  current_condition: ConditionStatus;
  image_url?: string;
  specifications?: Record<string, any>;
  notes?: string;
  is_borrowable: boolean;
  created_at: string;
  updated_at: string;
}

export interface BorrowRequest {
  id: string;
  request_number: string;
  user_id: string;
  user?: Profile;
  asset_id: string;
  asset?: Asset;
  purpose: string;
  start_date: string;
  end_date: string;
  status: RequestStatus;
  reviewed_by?: string;
  reviewer?: Profile;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}
