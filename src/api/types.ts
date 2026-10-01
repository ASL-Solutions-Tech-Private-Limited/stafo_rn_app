/**
 * Response shapes for the STAFO backend. Field names follow the server's
 * snake_case. Fields the native app treated as `Any?`, or that come back as
 * either strings or numbers, are typed loosely on purpose.
 */

type Id = number | string;

// ---------- Auth ----------

export type SendOtpResponse = {
  success: boolean;
  message: string;
  otp?: string;
};

export type VerifyOtpRequest = {
  mobile_number: string;
  otp: string;
  device_id: string;
  firebase_token: string;
  device_name: string;
  android_version: string;
};

export type CompanyAccount = {
  id?: Id;
  company_name: string;
  company_type?: string;
  gst_number?: string | null;
  pan_number?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  address?: string | null;
  pin?: string | null;
  mobile_no?: string;
  email?: string;
};

export type EmployeeAccount = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  company_id?: Id;
  branch_id?: Id;
  department_id?: Id;
  emp_id?: string | null;
  image?: string | null;
};

export type VerifyOtpResponse = {
  success: boolean;
  message: string;
  data?: {
    token: string;
    company?: CompanyAccount | null;
    employee?: EmployeeAccount | null;
    device_id?: string | null;
    device_name?: string | null;
    device_version?: string | null;
    /** "yes" when the employee logged in from an unregistered device. */
    device_change?: string | null;
  } | null;
};

export type BasicResponse = {
  success?: boolean;
  status?: boolean;
  message: string;
};

// ---------- Shared people lists ----------

export type LeaveEntry = {
  id: number;
  employee_id: number;
  from_date: string;
  to_date: string;
  reason?: string | null;
  leave_type?: string | null;
  employee_basic_info?: {
    id: number;
    emp_id?: string | null;
    name: string;
    email?: string | null;
    phone?: string | null;
    image?: string | null;
  } | null;
};

export type BirthdayEntry = {
  id: number;
  emp_id?: string | null;
  date_of_birth?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  image?: string | null;
};

export type AnniversaryEntry = {
  id: number;
  emp_id?: string | null;
  date_of_joining?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  image?: string | null;
};

// ---------- Employee dashboard ----------

export type Shift = {
  id: number;
  shift_name?: string | null;
  start_time: string;
  end_time: string;
};

export type Punch = {
  id: number;
  employee_id: number;
  punch_in?: string | null;
  punch_out?: string | null;
};

/**
 * geo_status: "0" none/declined, "1" admin has requested tracking,
 * "2" employee accepted and tracking is active.
 */
export type GeoStatus = '0' | '1' | '2';

export type EmployeeInfo = {
  id: number;
  emp_id?: string | null;
  company_id: Id;
  branch_id: Id;
  department_id?: Id | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  image?: string | null;
  position?: string | null;
  date_of_birth?: string | null;
  date_of_joining?: string | null;
  geo_status?: GeoStatus | string | null;
  /** "geo" | "selfie" | "qr code"; defaults to selfie when missing. */
  attendance_type?: string | null;
  branch?: {
    id: number;
    branch_name: string;
    branch_address?: string | null;
    latitude?: string | null;
    longitude?: string | null;
    radar?: number | null;
  } | null;
  shifts?: Shift[] | null;
  punches?: Punch[] | null;
};

export type EmployeeDashboardResponse = {
  status: boolean;
  message: string;
  employeeCount?: number;
  presentCount?: number;
  isLeaveToday?: boolean;
  employeesOnLeave?: LeaveEntry[] | null;
  birthday?: BirthdayEntry[] | null;
  /** Server spelling. */
  annyversary?: AnniversaryEntry[] | null;
  employee_info: EmployeeInfo;
};

export type EmployeeDetailsResponse = {
  status: boolean;
  message: string;
  image_url?: string | null;
  company_name?: string | null;
  data?: {
    id: number;
    emp_id?: string | null;
    name: string;
    email?: string | null;
    phone?: string | null;
    image?: string | null;
    position?: string | null;
    branch_name?: string | null;
    department_name?: string | null;
    date_of_joining?: string | null;
    date_of_birth?: string | null;
    geo_status?: string | null;
    device_id?: string | null;
    device_name?: string | null;
  } | null;
};

// ---------- Company dashboard ----------

export type CompanyDashboardResponse = {
  status: boolean;
  message: string;
  employeeCount: number;
  presentCount: number;
  maxEmployeeAdd?: string | number | null;
  company_id: number;
  employeesOnLeave?: LeaveEntry[] | null;
  birthday?: BirthdayEntry[] | null;
  anniversary?: AnniversaryEntry[] | null;
  companyInfo?: {
    id?: number | null;
    company_name?: string | null;
    company_code?: string | null;
    /** "Yes" once the company's KYC documents are verified. */
    is_verified?: string | null;
    max_employee_add?: number | null;
  } | null;
};

export type CompanyProfileResponse = {
  status: boolean;
  message: string;
  data?: {
    company_logo?: string | null;
    [key: string]: unknown;
  } | null;
};

// ---------- Banners ----------

export type BannerResponse = {
  status: boolean;
  data: {
    path: string;
    banner: {id: number; title?: string | null; image: string; status?: string}[];
  };
};

// ---------- Company: people ----------

export type ShiftWithDays = Shift & {
  sunday?: number;
  monday?: number;
  tuesday?: number;
  wednesday?: number;
  thursday?: number;
  friday?: number;
  saturday?: number;
};

export type DailyAttendance = {
  id: number;
  /** "Present" | "Absent" | leave/holiday variants. */
  attendance: string;
  halfday: number;
  date: string;
  in_time?: string | null;
  out_time?: string | null;
  punchin_image?: string | null;
  punchout_image?: string | null;
};

/** An employee row from `employees-list`, scoped to one date when `date` is sent. */
export type CompanyEmployee = {
  id: number;
  emp_id?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  salary?: string | null;
  image?: string | null;
  image_path?: string | null;
  selfie_image?: string | null;
  selfie_image_path?: string | null;
  hasSelfie?: boolean;
  company_id: number;
  branch_name?: string | null;
  department_name?: string | null;
  geo_status?: string | null;
  /** "1" active. */
  status?: string | null;
  device_status?: string | null;
  device_name?: string | null;
  attendance_type?: string | null;
  punches?: Punch[] | null;
  attendances?: DailyAttendance[] | null;
  shifts?: ShiftWithDays[] | null;
};

export type EmployeesListResponse = {
  status: boolean;
  message: string;
  data: CompanyEmployee[];
};

// ---------- Company: one employee ----------

export type EmployeeProfile = {
  id: number;
  emp_id?: string | null;
  company_id: number;
  branch_id?: number | null;
  department_id?: number | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  image?: string | null;
  selfie_image?: string | null;
  position?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  blood_group?: string | null;
  address?: string | null;
  date_of_birth?: string | null;
  date_of_joining?: string | null;
  salary?: string | null;
  ctc?: string | null;
  tax_regime?: string | null;
  geo_status?: string | null;
  /** "1" active, "0" inactive. */
  status?: string | null;
  device_status?: string | null;
  device_name?: string | null;
  attendance_type?: string | null;
  privileged_leave?: number | null;
  sick_leave?: number | null;
  casual_leave?: number | null;
  aadhar?: string | null;
  pan?: string | null;
  voter?: string | null;
  driving_license?: string | null;
  uan?: string | null;
  aadhar_verify?: number | string | null;
  pan_verify?: number | string | null;
  voter_verify?: number | string | null;
  dl_verify?: number | string | null;
  uan_verify?: number | string | null;
};

export type EmployeeProfileResponse = {
  status: boolean;
  message: string;
  image_url?: string | null;
  company_name?: string | null;
  data?: EmployeeProfile | null;
};

export type MonthAttendanceRecord = DailyAttendance & {employee_id: number};

export type MonthAttendanceResponse = {status: boolean; message: string; data: MonthAttendanceRecord[]};

export type LeaveType = {id: number; name: string; no_of_days?: number | null; is_paid?: number | null};

export type LeaveRequestRecord = {
  id: number;
  employee_id: number;
  from_date: string;
  to_date: string;
  reason?: string | null;
  leave_type?: number | null;
  days?: number | null;
  /** "pending" | "approved" | "rejected" */
  status: string;
  created_at?: string | null;
  leavetype?: LeaveType | null;
  employee_basic_info?: {id: number; name: string; image?: string | null} | null;
};

export type LeaveListResponse = {status: boolean; message: string; data: LeaveRequestRecord[]};

export type MissedPunchRequest = {
  id: number;
  employee_id: number;
  date: string;
  in_time?: string | null;
  out_time?: string | null;
  reason?: string | null;
  reject_reason?: string | null;
  /** "Pending" | "Approved" | "Rejected" */
  status: string;
  created_at?: string | null;
  employee?: {id: number; name: string; emp_id?: string | null} | null;
  branch?: {id: number; branch_name: string} | null;
  department?: {id: number; name: string} | null;
};

export type MissedPunchListResponse = {status: boolean; message: string; data: MissedPunchRequest[]};

export type EmployeeDocument = {
  id: number;
  document_type_id?: number | null;
  employee_id?: number | null;
  document_name?: string | null;
  /** Full URL of the uploaded file. */
  file_path?: string | null;
  created_at?: string | null;
  document_type?: {id: number; document_name: string} | null;
};

export type EmployeeDocumentsResponse = {status: string | boolean; message: string; data: EmployeeDocument[]};

export type ShiftListResponse = {success: boolean; message: string; data: ShiftWithDays[]};

export type SalarySlipResponse = {
  success: boolean;
  message: string;
  data?: {filename: string; download_url: string} | null;
};

/** An employee row from device-requests-list; `device_*` describe the phone asking to sign in. */
export type DeviceRequest = {
  id: number;
  name: string;
  emp_id?: string | null;
  image?: string | null;
  device_id: string;
  device_name?: string | null;
  /** "pending" | "approved" | "rejected" */
  device_status?: string | null;
  updated_at?: string | null;
};

export type DeviceRequestsResponse = {success: boolean; message: string; data: DeviceRequest[]};

/** One location fix from get-geo-location. Coordinates arrive as strings. */
export type RawGeoPoint = {
  id: number;
  employee_id: number;
  latitude: string;
  longitude: string;
  battery_status?: string | number | null;
  created_at: string;
};

export type GeoTrackResponse = {status: boolean; message: string; data: RawGeoPoint[]};

// ---------- Company setup ----------

export type Branch = {
  id: number;
  branch_name: string;
  branch_address?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  /** Punch-in radius in metres; 0 when no geofence is set. */
  radar?: number | string | null;
  status?: number;
};

export type Department = {id: number; name: string; description?: string | null};

export type Holiday = {
  id: number;
  title: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  festival_data?: {emoji?: string | null; color?: string | null; category?: string | null} | null;
};

export type LeaveTypeRecord = {
  id: number;
  name: string;
  no_of_days: number;
  description?: string | null;
  /** 1 paid, 0 unpaid. */
  is_paid: number | string;
};

export type Policy = {
  id: number;
  title: string;
  description?: string | null;
  file?: string | null;
  created_at?: string | null;
};

export type ListResponse<T> = {success?: boolean; status?: boolean; message: string; data: T[]};
export type PolicyListResponse = ListResponse<Policy> & {file_path?: string | null};
