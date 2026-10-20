import type {NavigatorScreenParams} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {ApprovalFilter} from '../features/approvals/ApprovalsScreen';
import type {FaceCaptureParams} from '../features/face/captureFace';
import type {ModuleId} from '../features/modules/catalog';

export type AuthStackParamList = {
  Onboarding: undefined;
  Login: {mobile?: string} | undefined;
  Otp: {mobile: string; devOtp?: string};
  Register: {mobile?: string} | undefined;
  DeviceApproval: undefined;
};

export type EmployeeTabParamList = {
  Home: undefined;
  /** Manager (demo): their team today. */
  Team: undefined;
  /** HR (demo): the employees they look after. */
  People: undefined;
  Attendance: undefined;
  Apps: undefined;
  Profile: undefined;
};

export type CompanyTabParamList = {
  Home: undefined;
  People: undefined;
  Apps: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  EmployeeTabs: NavigatorScreenParams<EmployeeTabParamList>;
  CompanyTabs: NavigatorScreenParams<CompanyTabParamList>;
  Module: {id: ModuleId};
  EmployeeDetail: {id: number; name?: string; tab?: string; open?: 'selfie'};
  FaceCapture: FaceCaptureParams;
  GeoPunch: {direction: 'in' | 'out'};
  MyLeave: {apply?: boolean} | undefined;
  MyPayslips: undefined;
  MyHolidays: undefined;
  MyPolicies: undefined;
  MyBranch: undefined;
  AttendanceQr: undefined;
  Tasks: undefined;
  TaskDetail: {id: number};
  TaskForm: {id?: number} | undefined;
  Crm: undefined;
  Lead: {id: number};
  LeadForm: {id?: number} | undefined;
  Trips: undefined;
  Trip: {id: number};
  TripForm: {id?: number} | undefined;
  /** open: the trip is still on, so bills can be added. */
  TripExpenses: {id: number; title: string; open: boolean};
  Vehicles: undefined;
  Expenses: undefined;
  Claim: {id: number};
  ClaimForm: {id?: number} | undefined;
  ExpenseCategories: undefined;
  CategoryForm: {id?: number} | undefined;
  Performance: {month?: {month: number; year: number}} | undefined;
  ScoringTypes: undefined;
  Rankings: undefined;
  RankDetail: {employeeId: number; name: string; month: number; year: number; rank?: number; of?: number};
  Subscription: undefined;
  ChoosePlan: undefined;
  PaymentResult: {
    status: 'success' | 'failed' | 'pending';
    txnid: string;
    amount: string;
    mode?: string;
    plan: string;
  };
  SalaryPayouts: undefined;
  Welcome: undefined;
  TeamRequests: {role: 'manager' | 'hr'; kind?: import('../features/roles/roleLogic').RequestKind};
  TeamRequest: {role: 'manager' | 'hr'; id: number};
  Bills: undefined;
  Billers: {category: string};
  PayBill: {category: string; operatorCode: string; name: string};
  BillResult: {
    status: 'success' | 'failed' | 'pending';
    txnid: string;
    amount: string;
    biller: string;
    category: string;
  };
  VerifyCompany: undefined;
  CompanyProfileEdit: undefined;
  CompanyDocuments: undefined;
  MyDocuments: undefined;
  HelpSupport: undefined;
  Feedback: undefined;
  Refer: undefined;
  Notifications: undefined;
  VehicleForm: {id?: number} | undefined;
  QrPunch: {direction: 'in' | 'out'};
  Approvals: {filter?: ApprovalFilter} | undefined;
  LiveLocation: undefined;
  EmployeeRoute: {id: number; name?: string; date?: string};
  Setup: undefined;
  SetupBranches: undefined;
  SetupBranchEdit: {id?: number};
  SetupShifts: undefined;
  SetupHolidays: undefined;
  SetupLeaveTypes: undefined;
  SetupDepartments: undefined;
  SetupPolicies: undefined;
  Payroll: undefined;
  /** month is 1–12 of the current year. */
  PayrollRun: {employeeId: number; name: string; month: number};
  SalaryComponents: undefined;
  Reports: undefined;
  AddEmployee: undefined;
  EmployeeAdded: {
    id: number;
    empId: string | null;
    name: string;
    phone: string;
    mode: 'geo' | 'selfie' | 'qr code';
    branch: string | null;
    department: string | null;
    shift: string | null;
    steps: Record<'position' | 'branch' | 'department' | 'mode', 'done' | 'failed' | 'skipped'>;
  };
  EditEmployee: {id: number; name?: string};
};

export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;
export type AppScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<AppStackParamList, T>;
export type EmployeeTabProps<T extends keyof EmployeeTabParamList> = BottomTabScreenProps<
  EmployeeTabParamList,
  T
>;
export type CompanyTabProps<T extends keyof CompanyTabParamList> = BottomTabScreenProps<
  CompanyTabParamList,
  T
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends AppStackParamList {}
  }
}
