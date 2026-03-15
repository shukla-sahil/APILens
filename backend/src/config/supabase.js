const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

let supabase = null;

if (env.isSupabaseConfigured) {
  supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

module.exports = {
  supabase,
  isSupabaseConfigured: env.isSupabaseConfigured
};
