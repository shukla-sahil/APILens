declare global {
  interface Window {
    __APP_CONFIG__?: {
      API_BASE_URL?: string;
      SUPABASE_URL?: string;
      SUPABASE_ANON_KEY?: string;
    };
  }
}

const runtimeBaseUrl = window.__APP_CONFIG__?.API_BASE_URL;
const runtimeSupabaseUrl = window.__APP_CONFIG__?.SUPABASE_URL;
const runtimeSupabaseAnonKey = window.__APP_CONFIG__?.SUPABASE_ANON_KEY;

export const environment = {
  apiBaseUrl: runtimeBaseUrl || 'http://localhost:4000',
  supabaseUrl: runtimeSupabaseUrl || '',
  supabaseAnonKey: runtimeSupabaseAnonKey || ''
};
