# AI API Documentation Generator Architecture

## Monorepo Layout

- `frontend/` Angular single page application for dashboard, docs viewer, endpoint explorer, and AI tools.
- `backend/` Express API packaged for Vercel Serverless Functions.
- `backend/supabase/` SQL schema and storage setup for Supabase PostgreSQL + Storage.

## System Flow

1. User uploads OpenAPI/Postman spec from Angular dashboard.
2. User identity is handled by Supabase Auth (email/password or Google OAuth).
3. Backend receives file (`/upload-spec`), persists original file to Supabase Storage.
4. Backend parses specification (`/parse-spec`) and normalizes endpoint data.
5. Parser output is enriched by AI helper service (summaries, auth detection, missing docs hints).
6. Project, endpoint metadata, generated snippets, and docs are stored in Supabase PostgreSQL.
7. Angular sends Supabase access token to backend on private API requests.
8. Backend validates JWT and scopes project data by `user_id`.
9. Angular reads data from `/projects` and `/project/:id` to render interactive docs.
10. Optional tools: API chat, mock endpoint server, and flow visualization.

## Backend Modules

- `routes/` REST endpoints and feature routes.
- `services/spec-parser.service.js` OpenAPI/Postman parsers and normalization.
- `services/snippet.service.js` JavaScript, Python, and cURL snippet generation.
- `services/ai-assist.service.js` endpoint explanations and metadata suggestions.
- `services/mock.service.js` dynamic mock response generation.
- `repositories/project.repository.js` Supabase persistence abstraction.
- `utils/` helpers for schema/example transformation and graph generation.

## Frontend Modules

- `pages/landing` Product intro and value proposition.
- `pages/dashboard` Upload and parse workflow.
- `pages/docs-viewer` Interactive endpoint documentation.
- `pages/endpoint-explorer` Searchable endpoint matrix with collapsible groups.
- `pages/history` Previously generated projects.
- `pages/chat-api` Chat with parsed API.
- `pages/flow-visualization` API relationship graph.
- `shared/components` Reusable widgets (upload dropzone, endpoint card, snippets, theme toggle).

## Deployment

- Frontend: Angular static build deployed on Vercel.
- Backend: Express wrapped with `serverless-http` in Vercel function entrypoint.
- Data: Hosted Supabase PostgreSQL and Supabase Storage bucket `spec-files`.
