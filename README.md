# Organisation Task Manager

Internal daily task management for staff and Super Admins.

## Monorepo layout

```text
apps/
├── web/    React + Vite + Tailwind frontend
└── api/    Express + Prisma + SQLite backend
```

npm workspaces tie the two together — run everything from the repo root.

## Development

```bash
npm install

# copy env files and fill in real values
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env

# one-time database setup
npm run db:migrate
npm run db:seed

# run both apps together
npm run dev
```

Or run one app at a time with `npm run dev:web` / `npm run dev:api`.

The application architecture is:

```text
React (apps/web) -> Express API (apps/api) -> SQLite (via Prisma)
```

See the project specification documents in `documents/` for requirements, architecture, rules, phases, and design decisions.

## Deployment

`apps/web` is a static build, so it deploys to Cloudflare Pages. `apps/api` is a
long-running Express server with a SQLite database via Prisma — Cloudflare
Pages/Workers can't run that as-is, so it needs its own Node host (Render,
Fly.io, Railway, a VPS, etc.) with a persisted disk for the SQLite file (or a
migration to a hosted database).

**One-time setup**, once the API has a public URL:

1. Set `VITE_API_URL` in `apps/web/.env` (or as a Cloudflare Pages build
   environment variable) to that URL instead of `http://localhost:4000`.
2. Add the Cloudflare Pages domain to Firebase Auth's **Authorized domains**
   list — Google Sign-In rejects unlisted origins.

**Deploying** (from `apps/web`, once the above is done):

```bash
npm run deploy   # builds, then `wrangler pages deploy`
```

This machine is already logged in to Wrangler (see `npx wrangler whoami`)
against project name `organisation-task-manager` (`apps/web/wrangler.jsonc`).
First deploy creates the Pages project; the live URL is
`organisation-task-manager.pages.dev` (plus any custom domain added later).

`apps/web/public/_redirects` sends every path to `index.html` — required
because routing (`react-router`'s `BrowserRouter`) is client-side, so a
direct link or refresh on e.g. `/dashboard` would otherwise 404 on Pages.

## Docker

An alternative to the split Cloudflare Pages + separate Node host deployment
above: run both apps in containers on one machine via
[`docker-compose.yml`](docker-compose.yml). Useful for self-hosting (a VPS
you already run Docker on) or just a local environment that doesn't depend
on `npm install`/Node being set up on the host at all.

```bash
# one-time setup (same files the non-Docker flow above uses)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# ...fill in real values in both, and put a real Firebase service-account
# key at apps/api/service-account.json (see apps/api/.env.example) — the
# API container won't start without it.

docker compose up --build
```

- **apps/api** → `http://localhost:4000` (Express + Prisma). On every
  container start, [`apps/api/docker-entrypoint.sh`](apps/api/docker-entrypoint.sh)
  runs `prisma migrate deploy` then the idempotent seed script — the
  Docker equivalent of the non-Docker flow's one-time `npm run db:migrate &&
  npm run db:seed`, safe to run on every restart. The SQLite file lives in
  the `api-data` named volume (`/app/data/app.db` inside the container), so
  it survives `docker compose down` and image rebuilds — only
  `docker compose down -v` or deleting the volume loses it.
  `docker-compose.yml` also force-overrides `CORS_ORIGIN` to
  `http://localhost:8080` regardless of what's in `apps/api/.env` (whose
  `.env.example` default, `:5173`, is Vite's *dev-server* port — right for
  non-Docker `npm run dev:web`, wrong for the nginx-served `web` container
  here) — every API call would otherwise fail with a CORS error the moment
  you tried to sign in.
- **apps/web** → `http://localhost:8080` (static build served by nginx,
  [`apps/web/nginx.conf`](apps/web/nginx.conf) doing the same SPA-fallback
  job as `_redirects` does on Pages).

Vite bakes `VITE_*` values into the JS bundle at *build* time — there's no
running Node process to read a container's environment at runtime for a
static build — so real Firebase config has to reach `docker compose build`
as build args, not just sit in `apps/web/.env`. Point Compose at that file
directly instead of duplicating it:

```bash
docker compose --env-file apps/web/.env up --build
```

Without `--env-file`, the `web` build args default to blanks/localhost —
still builds and runs fine, just with Firebase sign-in showing the same
"not configured" message the non-Docker `apps/web` dev server shows with an
empty `.env` ([`services/auth.js`](apps/web/src/services/auth.js)'s
`isFirebaseConfigured` guard).

Note: this Dockerized `apps/web` isn't how the app is actually deployed
today (see **Deployment** above — Cloudflare Pages) — it exists for running
both apps together without Cloudflare, e.g. entirely on a self-hosted VPS
alongside `apps/api`.

### CasaOS

`docker-compose.yml` carries an `x-casaos` metadata block (title, icon,
category, the port CasaOS's dashboard should link to) — once the stack is
running, CasaOS picks this up and shows it like any other installed app
instead of an unlabelled container pair. It also persists the SQLite data
and the Firebase service-account key under CasaOS's own
`/DATA/AppData/$AppID` convention (`$AppID` defaults to `task-manager`,
overridable via a root `.env` — see `.env.example`) instead of an opaque
Docker-managed volume, so both show up in CasaOS's File Manager and get
swept into its backups.

Two things to do once per CasaOS host, before the first `docker compose up`:

```bash
mkdir -p /DATA/AppData/task-manager/data
# put the real Firebase service-account key here (not apps/api/service-account.json —
# that path only matters for the non-Docker flow):
cp apps/api/service-account.json /DATA/AppData/task-manager/service-account.json
```

That covers running an already-checked-out copy of the repo through CasaOS
(e.g. over SSH — `docker compose up -d --build`, same as any other host).

For CasaOS's own **"App Store → Custom Install → Import → Docker
Compose"** dialog (no repo checkout at all — you just paste YAML), use
[`docker-compose.casaos.yml`](docker-compose.casaos.yml) instead: same
`x-casaos` metadata and `/DATA/AppData/$AppID` layout, but `image:` instead
of `build:`, pulling pre-built images from GitHub Container Registry
(published by [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml)
on every push to `main`, so they never go stale — public images even
though this repo is private, so the pull needs no login). One-time setup
before pasting it in:

```bash
mkdir -p /DATA/AppData/task-manager/data
cp apps/api/service-account.json /DATA/AppData/task-manager/service-account.json
```

Then paste the file's contents in, and set at least `CORS_ORIGIN` (under
the `api` service's environment variables, editable right there in
CasaOS's import screen) to wherever you'll actually reach the app from —
it's left blank in that file since, unlike `docker-compose.yml`, there's no
per-host root `.env` to read a real value from.

The first time the workflow runs, its GHCR packages are created **private**
by default (GITHUB_TOKEN can't flip that itself) — go to the package's
Settings on GitHub and change visibility to Public once, or the compose
paste above will fail to pull.
