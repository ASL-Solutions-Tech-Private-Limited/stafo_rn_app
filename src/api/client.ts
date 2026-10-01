import axios, {AxiosError} from 'axios';
import {API_BASE_URL, API_TIMEOUT_MS} from '../config/env';
import {signOut, useSession} from '../store/session';
import {toast} from '../components/ui/toast';

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const AUTH_PATH = /(login|otp|register|verify|change-device)/i;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {Accept: 'application/json'},
});

api.interceptors.request.use(config => {
  const token = useSession.getState().token;
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async (error: AxiosError<{message?: string}>) => {
    const status = error.response?.status;
    const path = error.config?.url ?? '';
    const isAuthCall = AUTH_PATH.test(path);

    if ((status === 401 || status === 403) && !isAuthCall && useSession.getState().token) {
      toast.error('Your session has expired. Please sign in again.');
      await signOut();
    }

    throw toApiError(error);
  },
);

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const serverMessage = (error.response?.data as {message?: string} | undefined)?.message;
    if (serverMessage) {
      return new ApiError(serverMessage, status);
    }
    if (!error.response) {
      return new ApiError("Can't reach the server. Check your internet connection.", status);
    }
    return new ApiError('Something went wrong. Please try again.', status);
  }
  return new ApiError(error instanceof Error ? error.message : 'Something went wrong.');
}

/**
 * The backend reports failures inside 200 responses as
 * `{status:false}` or `{success:false}`. Throw so callers get one error path.
 */
export function ensureOk<T extends {status?: boolean; success?: boolean; message?: string}>(body: T): T {
  if (body.status === false || body.success === false) {
    throw new ApiError(body.message || 'Request failed.');
  }
  return body;
}
