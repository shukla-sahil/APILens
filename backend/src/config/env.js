const dotenv = require('dotenv');

dotenv.config();

const env = {
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'spec-files',
  publicDocBaseUrl: process.env.PUBLIC_DOC_BASE_URL || 'http://localhost:4200/share',
  openAiApiKey: process.env.OPENAI_API_KEY || ''
};

env.isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);

module.exports = env;
