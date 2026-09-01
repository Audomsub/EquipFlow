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

export interface FormFieldDefinition {
  name: string;
  label: string;
  type: "text" | "number" | "checkbox" | "select";
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export interface ChecklistItemDefinition {
  key: string;
  label: string;
  type: "boolean" | "number" | "text";
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  required_form_fields?: FormFieldDefinition[];
  checklist_template?: ChecklistItemDefinition[];
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

export interface BorrowTransaction {
  id: string;
  request_id: string;
  asset_id: string;
  handed_over_by: string;
  handover_officer?: Profile;
  handover_at: string;
  handover_condition: ConditionStatus;
  handover_notes?: string;
  handover_photos?: string[];
  handover_checklist_results?: Record<string, any>;

  received_by?: string;
  return_officer?: Profile;
  received_at?: string;
  return_condition?: ConditionStatus;
  return_notes?: string;
  return_photos?: string[];
  return_checklist_results?: Record<string, any>;
  is_damaged: boolean;
  damage_fine_amount: number;
  created_at: string;
}

export interface BorrowRequest {
  id: string;
  request_number: string;
  user_id: string;
  user?: Profile;
  asset_id: string;
  asset?: Asset;
  purpose: string;
  request_data?: Record<string, any>;
  start_date: string;
  end_date: string;
  status: RequestStatus;
  reviewed_by?: string;
  reviewer?: Profile;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  transaction?: BorrowTransaction;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ALERT";
  is_read: boolean;
  link?: string;
  created_at: string;
}
