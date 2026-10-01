import type {NavigatorScreenParams} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {FaceCaptureParams} from '../features/face/captureFace';
import type {ModuleId} from '../features/modules/catalog';

export type AuthStackParamList = {
  Onboarding: undefined;
  Login: {mobile?: string} | undefined;
  Otp: {mobile: string; devOtp?: string};
  DeviceApproval: undefined;
};

export type EmployeeTabParamList = {
  Home: undefined;
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
  EmployeeDetail: {id: number; name?: string; tab?: string};
  FaceCapture: FaceCaptureParams;
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
