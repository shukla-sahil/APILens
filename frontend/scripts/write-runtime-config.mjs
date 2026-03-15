import fs from 'node:fs';
import path from 'node:path';

const apiBaseUrl = process.env.NG_APP_API_BASE_URL || 'http://localhost:4000';
const supabaseUrl = process.env.NG_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NG_APP_SUPABASE_ANON_KEY || '';

const outputPath = path.join(process.cwd(), 'src', 'assets', 'runtime-config.js');
const output = `window.__APP_CONFIG__ = { API_BASE_URL: '${apiBaseUrl}', SUPABASE_URL: '${supabaseUrl}', SUPABASE_ANON_KEY: '${supabaseAnonKey}' };\n`;

fs.writeFileSync(outputPath, output, 'utf8');
console.log(`runtime-config.js generated with API base: ${apiBaseUrl}`);
