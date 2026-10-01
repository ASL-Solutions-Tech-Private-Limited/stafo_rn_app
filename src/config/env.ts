/**
 * Backend environments. These are the same servers the native Android app
 * uses (`production` and `staging` product flavours).
 *
 * Debug builds talk to staging and release builds to production. To point a
 * debug build at production, set `DEBUG_ENV_OVERRIDE` to 'production'.
 */
type AppEnv = 'production' | 'staging';

const ENDPOINTS: Record<AppEnv, string> = {
  production: 'https://stafo.in/',
  staging: 'http://aslhr.2ndwork.in/',
};

// The staging host (aslhr.2ndwork.in) stopped resolving in Sep 2026; the
// shared test accounts live on production, so debug builds use it for now.
const DEBUG_ENV_OVERRIDE: AppEnv | null = 'production';

export const APP_ENV: AppEnv = __DEV__ ? DEBUG_ENV_OVERRIDE ?? 'staging' : 'production';

export const API_BASE_URL = ENDPOINTS[APP_ENV];

export const API_TIMEOUT_MS = 30_000;
