const dotenv = require('dotenv');

dotenv.config();

const env = {
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'spec-files',
  publicDocBaseUrl: process.env.PUBLIC_DOC_BASE_URL || 'http://localhost:4200/share',
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
  openAiBaseUrl: process.env.OPENAI_BASE_URL || process.env.OPENROUTER_BASE_URL || '',
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  openAiTimeoutMs: Number(process.env.OPENAI_TIMEOUT_MS || 15000),
  openRouterPreferFree: String(process.env.OPENROUTER_PREFER_FREE || 'true').toLowerCase() !== 'false',
  openRouterFreeModels: process.env.OPENROUTER_FREE_MODELS || ''
};

env.isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);

module.exports = env;
