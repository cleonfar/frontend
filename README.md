# Frontend (Vue + Vite)

This is a minimal Vue 3 + Vite frontend. The development server proxies /api to http://localhost:8000.

Quick start

1. Install dependencies: npm install
2. Start dev server: npm run dev
3. Open http://localhost:5173 in your browser

The sample component calls /api/hello which will be proxied to http://localhost:8000/hello.

MVP pages
---------

Visit the Register Animal page at `/register` to try the Register Animal form which POSTs to `/api/AnimalIdentity/registerAnimal`.

API spec
--------
The OpenAPI spec lives at `api/openapi.yaml`. Run `swagger-cli validate api\openapi.yaml` to check it.

Backend connectivity and fallback behavior
----------------------------------------

The frontend attempts to call relative paths like `/api/...` which the Vite dev server should proxy to the backend at `http://localhost:8000` (see `vite.config.ts`). If the dev-server proxy is unavailable, the frontend falls back to the direct backend URL defined in `.env.development` as `VITE_BACKEND_URL`.

To use the fallback (already configured): ensure `.env.development` points to your backend (default is `http://localhost:8000`) and start the frontend dev server via `npm run dev`.

CORS note
---------
If the fallback calls the backend directly (not via the proxy), your backend must allow CORS from `http://localhost:5173` (or whatever origin you use) for the browser to succeed.

Diagnostics
-----------
Open `/diag` in the frontend and click "Call /api/hello" to test whether the proxy or fallback reaches your backend. The page will show the backend response or an error message.
