# AI API Documentation Generator

A full-stack developer experience platform that generates interactive API documentation from Postman collections or OpenAPI/Swagger files.

## What It Includes

- Angular frontend with:
   - Auth-first landing page with sign up / log in / Google OAuth
  - Dashboard upload + parse workflow
  - Swagger-style docs viewer
  - Endpoint explorer with SDK snippets and mock testing
  - Chat with API page
  - API flow visualization page
  - Project history page
  - Dark/light theme and responsive sidebar navigation
- Node.js + Express backend with:
   - JWT-protected project APIs
  - `POST /upload-spec`
  - `POST /parse-spec`
  - `GET /projects`
  - `GET /project/:id`
  - `DELETE /project/:id`
  - `POST /project/:id/chat`
  - `ALL /project/:id/mock/*`
  - `GET /project/:id/flow`
  - `GET /share/:slug`
- Supabase PostgreSQL schema + Supabase Storage integration
- Vercel deployment configs for both frontend and backend

## Step-by-Step Setup

### 1) Install Dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2) Configure Supabase

1. Create a Supabase project.
2. In Supabase SQL Editor, run [`backend/supabase/schema.sql`](backend/supabase/schema.sql).
3. In Supabase Project Settings, copy:
   - Project URL
   - Project API Anon Key
   - Service Role Key
4. In Supabase Auth > Providers, enable Google provider and configure OAuth credentials.
5. In Supabase Auth > URL Configuration, add allowed redirect URL:
   - `http://localhost:4200/auth/callback`
   - Your deployed frontend callback URL (for production)
6. Verify Storage bucket exists:
   - Bucket name: `spec-files`
   - Private bucket is recommended.

### 3) Configure Environment Variables

#### Backend

Copy [`backend/.env.example`](backend/.env.example) to `backend/.env` and set values:

```env
PORT=4000
CORS_ORIGIN=http://localhost:4200
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET=spec-files
PUBLIC_DOC_BASE_URL=http://localhost:4200/share
OPENAI_API_KEY=
OPENROUTER_API_KEY=
OPENAI_BASE_URL=
OPENROUTER_BASE_URL=
OPENAI_MODEL=gpt-4o-mini
OPENAI_TIMEOUT_MS=15000
OPENROUTER_PREFER_FREE=true
OPENROUTER_FREE_MODELS=openrouter/free,openai/gpt-oss-20b:free,google/gemma-3-12b-it:free,meta-llama/llama-3.3-70b-instruct:free
```

Notes:
- If `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are empty, backend falls back to in-memory storage for development.
- `OPENAI_API_KEY` is optional. If provided, `/project/:id/chat` uses OpenAI with grounded endpoint context.
- You can also use `OPENROUTER_API_KEY` (keys typically start with `sk-or-v1`).
- Optional: set `OPENAI_BASE_URL` or `OPENROUTER_BASE_URL` only if you want to force a custom endpoint URL.
- With OpenRouter keys, API Lens automatically retries free `:free` models when paid models fail with `402/429/404`.
- If OpenAI is unavailable (missing key, timeout, API failure), chat automatically falls back to deterministic rule-based responses.

#### Frontend

Copy [`frontend/.env.example`](frontend/.env.example) to `frontend/.env` and set:

```env
NG_APP_API_BASE_URL=http://localhost:4000
NG_APP_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NG_APP_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Notes:
- Frontend authentication is powered by Supabase Auth.
- Backend private routes require a valid `Authorization: Bearer <access_token>` header from the logged-in user.
- `GET /share/:slug` remains public for documentation sharing.

### 4) Run Locally

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm start
```

Open: `http://localhost:4200`

## Deployment

## Backend on Vercel (Serverless Express)

The backend is already configured for Vercel in [`backend/vercel.json`](backend/vercel.json).

1. Create a Vercel project from the `backend` folder.
2. Set runtime environment variables in Vercel Project Settings:
   - `CORS_ORIGIN`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_STORAGE_BUCKET`
   - `PUBLIC_DOC_BASE_URL`
   - `OPENAI_API_KEY` (optional)
3. Deploy.

## Frontend on Vercel (Static Angular Build)

The frontend is configured in [`frontend/vercel.json`](frontend/vercel.json).

1. Create a Vercel project from the `frontend` folder.
2. Add environment variable:
   - `NG_APP_API_BASE_URL=https://YOUR_BACKEND_DOMAIN`
   - `NG_APP_SUPABASE_URL=https://YOUR_PROJECT.supabase.co`
   - `NG_APP_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY`
3. Deploy.

The build script writes runtime config to [`frontend/src/assets/runtime-config.js`](frontend/src/assets/runtime-config.js).

## Project Structure

- [`ARCHITECTURE.md`](ARCHITECTURE.md): high-level architecture
- [`backend/src/routes/project.routes.js`](backend/src/routes/project.routes.js): core project APIs
- [`backend/src/routes/feature.routes.js`](backend/src/routes/feature.routes.js): chat/mock features
- [`backend/src/services/spec-parser.service.js`](backend/src/services/spec-parser.service.js): OpenAPI/Postman parser
- [`frontend/src/app/pages`](frontend/src/app/pages): all UI pages

## Validation Commands

Backend:

```bash
cd backend
npm run check
```

Frontend:

```bash
cd frontend
npm run build
```

## Notes

- Shareable docs endpoint: `GET /share/:slug`
- Mock testing endpoint: `ALL /project/:id/mock/*`
- The frontend uses standalone Angular components and route-based pages for scalability.
