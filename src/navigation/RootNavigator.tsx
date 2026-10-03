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
const linking: LinkingOptions<AppStackParamList> = {
  prefixes: ['stafo://'],
  config: {
    screens: {
      EmployeeDetail: {path: 'employee/:id', parse: {id: Number}},
      Module: 'module/:id',
      Approvals: 'approvals/:filter?',
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
    const home = useSession.getState().role === 'company' ? 'CompanyTabs' : 'EmployeeTabs';
    const first = state?.routes[0];
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
        <AppStack.Navigator screenOptions={{headerShown: false}}>
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
          <AppStack.Screen name="MyLeave" component={MyLeaveScreen} options={{animation: 'slide_from_right'}} />
          <AppStack.Screen name="GeoPunch" component={GeoPunchScreen} options={{animation: 'slide_from_bottom'}} />
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
            </>
          )}
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
