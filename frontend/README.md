# PMIS frontend

Nuxt 3 web app of the Port Management Information System. The API it talks to lives in `../backend` (see the root `README.md` for the full setup and the demo accounts).

**Stack:** Nuxt 3, Vue 3, TypeScript, Pinia, Nuxt UI + Tailwind CSS, Axios, nuxt-i18n (Thai/English), Chart.js, Leaflet, jsPDF + AutoTable, V-Calendar.

## Run

```bash
npm install
npm run dev          # http://localhost:3000, talks to http://localhost:4100/api/v1
```

The API base URL per target is in `deployment.config.js` (`dev` uses the local backend; override with `NUXT_PUBLIC_API_BASE_URL`). Production bundles: `npm run generate:prd`.

## How the app talks to the API

- `plugins/axios.js` adds `Authorization: Bearer <access_token>` from `localStorage` to every call and, on a 401 with an expired token, posts the refresh token to `/auth/refresh` and retries.
- `core/services/*` are the API clients (one per module), `stores/*` hold options and the session, `core/interfaces/*` the response shapes.
- `middleware/auth.global.ts` guards private pages and runs the **automatic demo login** (`utils/demo.ts`): a tab without a session, or a new tab whose stored session is the shared demo account, calls `POST /auth/demo` and lands on the dashboard. Logging out disables it for that tab so the login/register pages work normally.

## Main modules

Request forms (agency filing, review, approval, berth confirmation), vessel registry, ship tables (MIT/TCT), VTMS (log book, anchor drops, sailing log), vessel in-out reports and reconciliation, port dues invoicing, berth contracts, master data, user and permission management, surveys, AIS map, Excel/PDF reports.
