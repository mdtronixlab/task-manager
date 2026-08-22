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
