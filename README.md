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
