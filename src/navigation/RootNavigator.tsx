import React, {useMemo} from 'react';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type LinkingOptions,
  type Theme as NavTheme,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import BootSplash from 'react-native-bootsplash';
import {AttendanceTabScreen} from '../features/attendance/screens/AttendanceTabScreen';
import {DeviceApprovalScreen} from '../features/auth/screens/DeviceApprovalScreen';
import {LoginScreen} from '../features/auth/screens/LoginScreen';
import {OnboardingScreen} from '../features/auth/screens/OnboardingScreen';
import {OtpScreen} from '../features/auth/screens/OtpScreen';
import {FaceCaptureScreen} from '../features/face/FaceCaptureScreen';
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
    },
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
          {/* A card, not a native modal: iOS can't show the next sheet while a modal is dismissing. */}
          <AppStack.Screen
            name="FaceCapture"
            component={FaceCaptureScreen}
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
