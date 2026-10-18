# PMIS backend

REST + GraphQL API for the Port Management Information System frontend in `../frontend`. It re-creates the original (now closed) backend so the Nuxt app works unchanged: same paths, same `{ data }` / `{ error }` envelopes, same JWT access/refresh flow.

**Stack:** Node.js 22, Express 5, TypeScript, PostgreSQL 17 (`pg`, `db-migrate`), JSON Web Tokens, GraphQL (`graphql-http`) with the Altair explorer, Zod validation, Pino logging, Multer uploads stored locally or on Cloudflare R2.

## Run it

```bash
cp .env.example .env            # fill PASSWORD_PEPPER and TOKEN_SECRET (32+ chars each)
docker compose up -d            # PostgreSQL on 127.0.0.1:5435 + Adminer on :8082
npm install
npm run setup                   # migrate:up + seed (all mock data)
npm run dev                     # http://localhost:4100
```

| URL | What |
| --- | --- |
| `http://localhost:4100/api/v1` | REST API (the frontend's `apiBaseUrl`) |
| `http://localhost:4100/graphql` | GraphQL endpoint (same JWT, `Authorization: Bearer ...`) |
| `http://localhost:4100/altair/` | Altair GraphQL explorer, opens signed in as the demo account with sample queries |
| `http://localhost:4100/docs/` | OpenAPI reference of every REST endpoint |
| `http://localhost:4100/healthz` | Health check |

`npm run seed` is idempotent: it truncates every table and reloads the mock data (master data, 24 accounts, 78 vessels, 66 request forms across every status, VTMS log books and anchor drops, 32 vessel in-out reports, port-due invoices, berth contracts, surveys with answers, AIS positions and placeholder PDFs).

## Seeded accounts

| Account | Password | Role |
| --- | --- | --- |
| `demo@pmis.local` | `Demo@12345678` | Demo (SuperAdmin) — what `POST /auth/demo` signs visitors in as |
| `admin@pmis.local` | `Admin@12345678` | SuperAdmin |
| `officer@pmis.local` | `Officer@12345678` | Admin |
| `reviewer@pmis.local` | `Officer@12345678` | Document reviewer |
| `approver@pmis.local` | `Officer@12345678` | Document approver |
| `mit@pmis.local` / `tct@pmis.local` / `spacial@pmis.local` | `Officer@12345678` | Berth officers (MIT / TCT / special berths) |
| `stat@pmis.local` / `statapprove@pmis.local` | `Officer@12345678` | Statistics officer / head of statistics |
| `vtms@pmis.local` | `Officer@12345678` | VTMS officer |
| `agency@pmis.local` (+12 more, see `src/scripts/seed/people.ts`) | `Agency@12345678` | Vessel agencies |

## Authentication

1. `POST /auth/login` (or `POST /auth/demo`) returns `{ token: { access_token, refresh_token }, user }`.
2. Every request sends `Authorization: Bearer <access_token>` (HS256, 1 hour).
3. On a 401 the frontend posts the refresh token to `POST /auth/refresh`; refresh tokens rotate on every use (7 days, reuse of a retired token revokes the whole session family).
4. `POST /auth/logout` revokes only the caller's session, so demo visitors never log each other out.

Permissions: `SuperAdmin`, `Admin` and `Agency` accounts pass every check; `User` accounts are limited to the permission codes of their role (`admin/roles`), evaluated on every request.

## Production

`ENV=production` switches the API to production behaviour. `NODE_ENV=production`, which the Docker image sets, counts too, so an `ENV=dev` copied from `.env.example` cannot undo it.

- Registration links, password-reset links and e-mail-change codes go out by e-mail only. Outside production the API also returns them in its responses, so the flows can be tested without a mail server.
- `DEMO_READ_ONLY` defaults to `true`: demo visitors can browse everything, but every write is rejected with `403 read_only`. Set `DEMO_READ_ONLY=false` for a writable demo.
- `npm run release` (production migrations + seed) refuses the published `ADMIN_PASSWORD` and gives the mock officer and agency accounts random passwords that are never printed, so only the admin and the demo entry can sign in. The passwords in the table above are for local use.

## Layout

```
src/
  app.ts, server.ts          Express app and process lifecycle
  config.ts                  Environment (Zod-validated, fails fast)
  routes/                    URL -> controller wiring (REST)
  controllers/               Request parsing, response envelope
  services/                  Business rules (request-form workflow, VTMS, port dues, reports ...)
  repositories/              SQL (pg), no business rules
  graphql/                   Schema, resolvers (delegate to the services), Altair sample operations
  middleware/                JWT auth, permissions, demo read-only guard, rate limit, uploads, errors, activity log
  storage/                   File drivers: local folder or Cloudflare R2
  scripts/seed.ts            Mock data (npm run seed)
migrations/                  db-migrate SQL, one file pair per module
public/docs/                 OpenAPI reference
```

## Cloudflare R2 Object Storage

Uploads (registration documents, vessel certificates, request-form attachments, contract files, vessel in-out reports, vessel flag images) go through `src/storage`. The default driver writes to `./uploads` and serves them at `/uploads/...`. To store them on R2:

```env
STORAGE_DRIVER=r2
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET=pmis-files
R2_PUBLIC_URL=https://pub-xxxx.r2.dev        # optional; presigned URLs are used when empty
R2_KEY_PREFIX=pmis
```

The placeholders above are refused at startup, so a copied `.env.example` can never reach the storage provider with fake keys.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start with reload (`tsx watch`) |
| `npm run build` / `npm start` | Compile to `dist/` and run |
| `npm run migrate:up` / `migrate:down` / `migrate:reset` | Database migrations |
| `npm run seed` | Reload all mock data |
| `npm run setup` | `migrate:up` + `seed` |
| `npm run release` | Production `migrate:prod` + `seed:prod` (see Production) |
| `npm run typecheck` / `lint` / `format` | Quality checks |
