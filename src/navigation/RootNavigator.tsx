import React, {useMemo} from 'react';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type LinkingOptions,
  type Theme as NavTheme,
  getStateFromPath,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import BootSplash from 'react-native-bootsplash';
import {AttendanceTabScreen} from '../features/attendance/screens/AttendanceTabScreen';
import {DeviceApprovalScreen} from '../features/auth/screens/DeviceApprovalScreen';
import {LoginScreen} from '../features/auth/screens/LoginScreen';
import {OnboardingScreen} from '../features/auth/screens/OnboardingScreen';
import {ApprovalsScreen} from '../features/approvals/ApprovalsScreen';
import {OtpScreen} from '../features/auth/screens/OtpScreen';
import {EmployeeRouteScreen} from '../features/location/EmployeeRouteScreen';
import {AddEmployeeScreen} from '../features/employees/AddEmployeeScreen';
import {EditEmployeeScreen} from '../features/employees/EditEmployeeScreen';
import {EmployeeAddedScreen} from '../features/employees/EmployeeAddedScreen';
import {LiveLocationScreen} from '../features/location/LiveLocationScreen';
import {PayrollRunScreen} from '../features/payroll/PayrollRunScreen';
import {PayrollScreen} from '../features/payroll/PayrollScreen';
import {ReportsScreen} from '../features/payroll/ReportsScreen';
import {SalaryComponentsScreen} from '../features/payroll/SalaryComponentsScreen';
import {BranchEditScreen} from '../features/setup/BranchEditScreen';
import {BranchesScreen} from '../features/setup/BranchesScreen';
import {DepartmentsScreen, PoliciesScreen} from '../features/setup/DepartmentsPoliciesScreens';
import {HolidaysScreen} from '../features/setup/HolidaysScreen';
import {LeaveTypesScreen} from '../features/setup/LeaveTypesScreen';
import {SetupHubScreen} from '../features/setup/SetupHubScreen';
import {ShiftsScreen} from '../features/setup/ShiftsScreen';
import {FaceCaptureScreen} from '../features/face/FaceCaptureScreen';
import {GeoPunchScreen} from '../features/punch/GeoPunchScreen';
import {MyLeaveScreen} from '../features/leave/MyLeaveScreen';
import {MyPayslipsScreen} from '../features/payslips/MyPayslipsScreen';
import {MyBranchScreen} from '../features/info/MyBranchScreen';
import {MyHolidaysScreen} from '../features/info/MyHolidaysScreen';
import {MyPoliciesScreen} from '../features/info/MyPoliciesScreen';
import {AttendanceQrScreen} from '../features/qr/AttendanceQrScreen';
import {NotificationsScreen} from '../features/notifications/NotificationsScreen';
import {PerformanceScreen, ScoringTypesScreen} from '../features/performance/PerformanceScreen';
import {RankDetailScreen, RankingsScreen} from '../features/performance/RankingsScreen';
import {SalaryPayoutsScreen} from '../features/performance/SubscriptionScreen';
import {ChoosePlanScreen} from '../features/subscription/ChoosePlanScreen';
import {PaymentResultScreen} from '../features/subscription/PaymentResultScreen';
import {SubscriptionScreen} from '../features/subscription/SubscriptionScreen';
import {RegisterScreen} from '../features/auth/screens/RegisterScreen';
import {VerifyCompanyScreen} from '../features/kyc/VerifyCompanyScreen';
import {WelcomeScreen} from '../features/kyc/WelcomeScreen';
import {BillersScreen, BillResultScreen, BillsScreen, PayBillScreen} from '../features/bbps/BillsScreens';
import {BillHistoryScreen} from '../features/bbps/BillHistoryScreen';
import {CelebrationsScreen} from '../features/home/screens/CelebrationsScreen';
import {OnLeaveScreen} from '../features/home/screens/OnLeaveScreen';
import {
  CompanyDocumentsScreen,
  CompanyProfileEditScreen,
  FeedbackScreen,
  HelpSupportScreen,
  MyDocumentsScreen,
  ReferScreen,
} from '../features/profile/screens/AccountScreens';
import {CategoriesScreen, CategoryFormScreen} from '../features/expenses/CategoriesScreen';
import {ClaimFormScreen} from '../features/expenses/ClaimFormScreen';
import {ClaimScreen} from '../features/expenses/ClaimScreen';
import {ExpensesScreen} from '../features/expenses/ExpensesScreen';
import {TripExpensesScreen} from '../features/trips/TripExpensesScreen';
import {TripFormScreen} from '../features/trips/TripFormScreen';
import {TripScreen} from '../features/trips/TripScreen';
import {TripsScreen} from '../features/trips/TripsScreen';
import {VehicleFormScreen, VehiclesScreen} from '../features/trips/VehiclesScreen';
import {TasksScreen} from '../features/tasks/TasksScreen';
import {CrmScreen} from '../features/crm/CrmScreen';
import {LeadScreen} from '../features/crm/LeadScreen';
import {LeadFormScreen} from '../features/crm/LeadFormScreen';
import {TaskDetailScreen} from '../features/tasks/TaskDetailScreen';
import {TaskFormScreen} from '../features/tasks/TaskFormScreen';
import {QrPunchScreen} from '../features/punch/QrPunchScreen';
import {CompanyHomeScreen} from '../features/home/screens/CompanyHomeScreen';
import {EmployeeHomeScreen} from '../features/home/screens/EmployeeHomeScreen';
import {AppsScreen} from '../features/modules/screens/AppsScreen';
import {ModuleScreen} from '../features/modules/screens/ModuleScreen';
import {EmployeeDetailScreen} from '../features/people/employee/EmployeeDetailScreen';
import {PeopleTabScreen} from '../features/people/screens/PeopleTabScreen';
import {ProfileScreen} from '../features/profile/screens/ProfileScreen';
import {storage, StorageKeys} from '../lib/storage';
import {useSession} from '../store/session';
import {useTheme} from '../theme/ThemeProvider';
import {TabBar} from './TabBar';
import type {AppStackParamList, AuthStackParamList, CompanyTabParamList, EmployeeTabParamList} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const EmployeeTabs = createBottomTabNavigator<EmployeeTabParamList>();
const CompanyTabs = createBottomTabNavigator<CompanyTabParamList>();

/**
 * stafo:// deep links. Used for push notifications (open the right screen)
 * and for testing: `xcrun simctl openurl booted stafo://employee/24`.
 */
/** Screens only one kind of account may open from a link. */
const ROLE_ONLY: Partial<Record<keyof AppStackParamList, 'company' | 'employee'>> = {
  EmployeeDetail: 'company',
  Approvals: 'company',
  AttendanceQr: 'company',
  TaskForm: 'company',
  LiveLocation: 'company',
  EmployeeRoute: 'company',
  Setup: 'company',
  SetupBranches: 'company',
  SetupBranchEdit: 'company',
  SetupShifts: 'company',
  SetupHolidays: 'company',
  SetupLeaveTypes: 'company',
  SetupDepartments: 'company',
  SetupPolicies: 'company',
  Payroll: 'company',
  SalaryComponents: 'company',
  Reports: 'company',
  AddEmployee: 'company',
  EditEmployee: 'company',
  MyLeave: 'employee',
  MyPayslips: 'employee',
  MyHolidays: 'employee',
  MyPolicies: 'employee',
  MyBranch: 'employee',
  CompanyProfileEdit: 'company',
  VerifyCompany: 'company',
  Welcome: 'company',
  CompanyDocuments: 'company',
  MyDocuments: 'employee',
};

const linking: LinkingOptions<AppStackParamList> = {
  prefixes: ['stafo://'],
  config: {
    screens: {
      EmployeeDetail: {path: 'employee/:id', parse: {id: Number}},
      Module: 'module/:id',
      Approvals: 'approvals/:filter?',
      MyLeave: 'leave',
      MyPayslips: 'payslips',
      MyHolidays: 'holidays',
      MyPolicies: 'policies',
      MyBranch: 'branch',
      AttendanceQr: 'setup/qr',
      Tasks: 'tasks',
      Crm: 'crm',
      Trips: 'trips',
      Trip: {path: 'trip/:id', parse: {id: Number}},
      Vehicles: 'vehicles',
      Expenses: 'expenses',
      Performance: 'performance',
      Notifications: 'notifications',
      Rankings: 'rankings',
      Subscription: 'subscription',
      CompanyProfileEdit: 'company/edit',
      VerifyCompany: 'verify',
      Bills: 'bills',
      Celebrations: 'celebrations',
      OnLeave: 'on-leave',
      BillHistory: 'bills/history',
      CompanyDocuments: 'company/documents',
      MyDocuments: 'documents',
      HelpSupport: 'help',
      Feedback: 'feedback',
      Refer: 'refer',
      Claim: {path: 'claim/:id', parse: {id: Number}},
      ClaimForm: 'expenses/new',
      Lead: {path: 'lead/:id', parse: {id: Number}},
      LeadForm: 'crm/new',
      TaskDetail: {path: 'task/:id', parse: {id: Number}},
      TaskForm: 'tasks/new',
      LiveLocation: 'live',
      EmployeeRoute: {path: 'route/:id/:date?', parse: {id: Number}},
      Setup: 'setup',
      SetupBranches: 'setup/branches',
      SetupBranchEdit: {path: 'setup/branch/:id?', parse: {id: Number}},
      SetupShifts: 'setup/shifts',
      SetupHolidays: 'setup/holidays',
      SetupLeaveTypes: 'setup/leave-types',
      SetupDepartments: 'setup/departments',
      SetupPolicies: 'setup/policies',
      Payroll: 'payroll',
      SalaryComponents: 'payroll/components',
      Reports: 'reports',
      AddEmployee: 'employees/new',
      EditEmployee: {path: 'employee/:id/edit', parse: {id: Number}},
    },
  },
  // A deep link opened from cold start would otherwise be the only screen, so Back
  // would do nothing. Put the role's home tabs underneath it.
  getStateFromPath(path, options) {
    const state = getStateFromPath(path, options);
    const role = useSession.getState().role;
    const home = role === 'company' ? 'CompanyTabs' : 'EmployeeTabs';
    const first = state?.routes[0];
    // A link meant for the other kind of account opens home instead.
    const only = first ? ROLE_ONLY[first.name as keyof AppStackParamList] : undefined;
    if (only && only !== role) {
      return {index: 0, routes: [{name: home}]} as NonNullable<typeof state>;
    }
    if (state && state.routes.length === 1 && first && first.name !== home) {
      return {...state, index: 1, routes: [{name: home}, ...state.routes]} as typeof state;
    }
    return state;
  },
};

const renderTabBar = (props: React.ComponentProps<typeof TabBar>) => <TabBar {...props} />;

function EmployeeTabNavigator() {
  return (
    <EmployeeTabs.Navigator tabBar={renderTabBar} screenOptions={{headerShown: false, animation: 'shift'}}>
      <EmployeeTabs.Screen name="Home" component={EmployeeHomeScreen} />
      <EmployeeTabs.Screen name="Attendance" component={AttendanceTabScreen} />
      <EmployeeTabs.Screen name="Apps" component={AppsScreen} />
      <EmployeeTabs.Screen name="Profile" component={ProfileScreen} />
    </EmployeeTabs.Navigator>
  );
}

function CompanyTabNavigator() {
  return (
    <CompanyTabs.Navigator tabBar={renderTabBar} screenOptions={{headerShown: false, animation: 'shift'}}>
      <CompanyTabs.Screen name="Home" component={CompanyHomeScreen} />
      <CompanyTabs.Screen name="People" component={PeopleTabScreen} />
      <CompanyTabs.Screen name="Apps" component={AppsScreen} />
      <CompanyTabs.Screen name="Profile" component={ProfileScreen} />
    </CompanyTabs.Navigator>
  );
}

export function RootNavigator() {
  const theme = useTheme();
  const token = useSession(s => s.token);
  const role = useSession(s => s.role);
  const pendingDevice = useSession(s => s.pendingDeviceEmployee);
  // Read once when the signed-in stack mounts: a new company opens on the welcome checklist.
  const welcome = useSession(s => s.welcome);
  const onboardingSeen = storage.getBoolean(StorageKeys.onboardingSeen) ?? false;

  const navTheme = useMemo<NavTheme>(() => {
    const base = theme.dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
      },
    };
  }, [theme]);

  const signedIn = !!token && !!role;

  return (
    <NavigationContainer theme={navTheme} linking={linking} onReady={() => BootSplash.hide({fade: true})}>
      {signedIn ? (
        <AppStack.Navigator
          screenOptions={{headerShown: false}}
          initialRouteName={role === 'company' && welcome ? 'Welcome' : undefined}>
          {role === 'company' ? (
            <AppStack.Screen name="CompanyTabs" component={CompanyTabNavigator} />
          ) : (
            <AppStack.Screen name="EmployeeTabs" component={EmployeeTabNavigator} />
          )}
          <AppStack.Screen name="Module" component={ModuleScreen} options={{animation: 'slide_from_right'}} />
          <AppStack.Screen
            name="EmployeeDetail"
            component={EmployeeDetailScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="Approvals"
            component={ApprovalsScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="LiveLocation"
            component={LiveLocationScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="EmployeeRoute"
            component={EmployeeRouteScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="Setup"
            component={SetupHubScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="SetupBranches"
            component={BranchesScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="SetupBranchEdit"
            component={BranchEditScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="SetupShifts"
            component={ShiftsScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="SetupHolidays"
            component={HolidaysScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="SetupLeaveTypes"
            component={LeaveTypesScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="SetupDepartments"
            component={DepartmentsScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="SetupPolicies"
            component={PoliciesScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="Payroll"
            component={PayrollScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="PayrollRun"
            component={PayrollRunScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="SalaryComponents"
            component={SalaryComponentsScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="Reports"
            component={ReportsScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="AddEmployee"
            component={AddEmployeeScreen}
            options={{animation: 'slide_from_bottom'}}
          />
          <AppStack.Screen
            name="EmployeeAdded"
            component={EmployeeAddedScreen}
            options={{animation: 'fade'}}
          />
          <AppStack.Screen
            name="EditEmployee"
            component={EditEmployeeScreen}
            options={{animation: 'slide_from_right'}}
          />
          {/* A card, not a native modal: iOS can't show the next sheet while a modal is dismissing. */}
          <AppStack.Screen
            name="FaceCapture"
            component={FaceCaptureScreen}
            options={{animation: 'slide_from_bottom', gestureEnabled: false}}
          />
          <AppStack.Screen name="Crm" component={CrmScreen} options={{animation: 'slide_from_right'}} />
          <AppStack.Screen name="Lead" component={LeadScreen} options={{animation: 'slide_from_right'}} />
          <AppStack.Screen
            name="LeadForm"
            component={LeadFormScreen}
            options={{animation: 'slide_from_bottom'}}
          />
          <AppStack.Screen name="Tasks" component={TasksScreen} options={{animation: 'slide_from_right'}} />
          <AppStack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="Performance"
            component={PerformanceScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="ScoringTypes"
            component={ScoringTypesScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="Rankings"
            component={RankingsScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="RankDetail"
            component={RankDetailScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="Subscription"
            component={SubscriptionScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="ChoosePlan"
            component={ChoosePlanScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="PaymentResult"
            component={PaymentResultScreen}
            options={{animation: 'fade', gestureEnabled: false}}
          />
          <AppStack.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{animation: 'fade', gestureEnabled: false}}
          />
          <AppStack.Screen name="Bills" component={BillsScreen} options={{animation: 'slide_from_right'}} />
          <AppStack.Screen
            name="OnLeave"
            component={OnLeaveScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="Celebrations"
            component={CelebrationsScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="BillHistory"
            component={BillHistoryScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="Billers"
            component={BillersScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="PayBill"
            component={PayBillScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="BillResult"
            component={BillResultScreen}
            options={{animation: 'fade', gestureEnabled: false}}
          />
          <AppStack.Screen
            name="VerifyCompany"
            component={VerifyCompanyScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="CompanyProfileEdit"
            component={CompanyProfileEditScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="CompanyDocuments"
            component={CompanyDocumentsScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="MyDocuments"
            component={MyDocumentsScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="HelpSupport"
            component={HelpSupportScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="Feedback"
            component={FeedbackScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen name="Refer" component={ReferScreen} options={{animation: 'slide_from_right'}} />
          <AppStack.Screen
            name="SalaryPayouts"
            component={SalaryPayoutsScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="Expenses"
            component={ExpensesScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen name="Claim" component={ClaimScreen} options={{animation: 'slide_from_right'}} />
          <AppStack.Screen
            name="ClaimForm"
            component={ClaimFormScreen}
            options={{animation: 'slide_from_bottom'}}
          />
          <AppStack.Screen
            name="ExpenseCategories"
            component={CategoriesScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="CategoryForm"
            component={CategoryFormScreen}
            options={{animation: 'slide_from_bottom'}}
          />
          <AppStack.Screen name="Trips" component={TripsScreen} options={{animation: 'slide_from_right'}} />
          <AppStack.Screen name="Trip" component={TripScreen} options={{animation: 'slide_from_right'}} />
          <AppStack.Screen
            name="TripForm"
            component={TripFormScreen}
            options={{animation: 'slide_from_bottom'}}
          />
          <AppStack.Screen
            name="TripExpenses"
            component={TripExpensesScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="Vehicles"
            component={VehiclesScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="VehicleForm"
            component={VehicleFormScreen}
            options={{animation: 'slide_from_bottom'}}
          />
          <AppStack.Screen
            name="TaskDetail"
            component={TaskDetailScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="TaskForm"
            component={TaskFormScreen}
            options={{animation: 'slide_from_bottom'}}
          />
          <AppStack.Screen
            name="AttendanceQr"
            component={AttendanceQrScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="MyHolidays"
            component={MyHolidaysScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="MyBranch"
            component={MyBranchScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="MyPolicies"
            component={MyPoliciesScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="MyPayslips"
            component={MyPayslipsScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="MyLeave"
            component={MyLeaveScreen}
            options={{animation: 'slide_from_right'}}
          />
          <AppStack.Screen
            name="GeoPunch"
            component={GeoPunchScreen}
            options={{animation: 'slide_from_bottom'}}
          />
          <AppStack.Screen
            name="QrPunch"
            component={QrPunchScreen}
            options={{animation: 'slide_from_bottom', gestureEnabled: false}}
          />
        </AppStack.Navigator>
      ) : (
        <AuthStack.Navigator
          // Remount when switching stacks so initialRouteName applies again;
          // otherwise leaving DeviceApproval would land on Onboarding.
          key={pendingDevice ? 'device' : 'sign-in'}
          initialRouteName={pendingDevice ? 'DeviceApproval' : onboardingSeen ? 'Login' : 'Onboarding'}
          screenOptions={{headerShown: false, animation: 'slide_from_right'}}>
          {pendingDevice ? (
            <AuthStack.Screen name="DeviceApproval" component={DeviceApprovalScreen} />
          ) : (
            <>
              <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
              <AuthStack.Screen name="Login" component={LoginScreen} />
              <AuthStack.Screen name="Otp" component={OtpScreen} />
              <AuthStack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
