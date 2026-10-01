import {api, ensureOk} from '../client';
import type {
  BannerResponse,
  CompanyDashboardResponse,
  CompanyProfileResponse,
  EmployeeDashboardResponse,
  EmployeeDetailsResponse,
} from '../types';

export async function getEmployeeDashboard() {
  const {data} = await api.post<EmployeeDashboardResponse>('api/employee-dashboard');
  return ensureOk(data);
}

export async function getEmployeeDetails(employeeId: number | string) {
  const {data} = await api.get<EmployeeDetailsResponse>(`api/employee-details/${employeeId}`);
  return ensureOk(data);
}

export async function getCompanyDashboard() {
  const {data} = await api.post<CompanyDashboardResponse>('api/company-dashboard');
  return ensureOk(data);
}

export async function getCompanyProfile() {
  const {data} = await api.get<CompanyProfileResponse>('api/company/profile');
  return ensureOk(data);
}

export type Banner = {id: number; title?: string | null; imageUrl: string};

export async function getBanners(): Promise<Banner[]> {
  const {data} = await api.get<BannerResponse>('api/app-banner');
  if (!data.status || !data.data?.banner?.length) {
    return [];
  }
  const base = data.data.path.replace(/\/$/, '');
  return data.data.banner.map(b => ({id: b.id, title: b.title, imageUrl: `${base}/${b.image}`}));
}
