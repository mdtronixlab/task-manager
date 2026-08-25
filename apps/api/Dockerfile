# syntax=docker/dockerfile:1
#
# Built from the REPO ROOT (see docker-compose.yml's `context: .`), not
# apps/api itself — this is an npm-workspaces monorepo with one lockfile at
# the root (package-lock.json), same as `npm run dev`/`npm run db:*` already
# require running from the root locally.

FROM node:22-alpine AS base
# Prisma's query engine binary is linked against glibc's OpenSSL; alpine's
# musl libc doesn't ship libssl by default, so `prisma generate`/migrations
# fail without this (a well-known Prisma-on-alpine gotcha).
RUN apk add --no-cache openssl
WORKDIR /app

# --- deps: installed once, cached separately from source so editing
# apps/api/src/*.js doesn't invalidate the (slow) npm ci layer. ---
FROM base AS deps
COPY package.json package-lock.json ./
# npm workspaces' `apps/*` glob (root package.json) is resolved against
# what's actually on disk — both workspace package.json files need to be
# present for `npm ci` to match the lockfile's recorded workspace graph,
# even though this image only ever runs apps/api.
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
# --no-audit/--no-fund: skip npm's remote advisory-database fetch — a Docker
# build shouldn't depend on that endpoint's availability. The retry/timeout
# bump is real hardening, not superstition: building this exact image hit a
# genuine registry.npmjs.org fetch ETIMEDOUT (npm's own defaults are only 2
# retries at a 10–60s backoff) — worth surviving a transient registry blip
# without failing the whole build.
RUN npm ci --no-audit --no-fund \
      --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

# --- build: generate the Prisma client against the real schema. ---
FROM deps AS build
COPY apps/api apps/api
RUN npm run db:generate -w api

# --- runtime: only what's needed to run the server. ---
FROM base AS runtime
ENV NODE_ENV=production
# DATABASE_URL="file:./dev.db" (the .env.example default) resolves relative
# to prisma/schema.prisma's own directory, not the process cwd — a genuine
# gotcha we hit firsthand while developing this project. An absolute path
# here sidesteps it entirely; docker-compose.yml mounts /app/data as a
# volume so the SQLite file survives container recreation.
ENV DATABASE_URL="file:/app/data/app.db"

COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api apps/api
RUN mkdir -p /app/data

WORKDIR /app/apps/api
RUN chmod +x docker-entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "src/server.js"]
