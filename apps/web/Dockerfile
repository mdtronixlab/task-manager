# syntax=docker/dockerfile:1
#
# Built from the REPO ROOT (see docker-compose.yml's `context: .`) for the
# same reason as apps/api/Dockerfile — one npm-workspaces lockfile at the
# root. Not how this app is actually deployed today (README.md: a static
# build to Cloudflare Pages) — this Dockerfile exists for self-hosting
# alongside apps/api instead of Cloudflare, e.g. via docker-compose.yml.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
# --no-audit/--no-fund: skip npm's remote advisory-database fetch — a Docker
# build shouldn't depend on that endpoint's availability. The retry/timeout
# bump is real hardening, not superstition: building this exact step hit a
# genuine registry.npmjs.org fetch ETIMEDOUT (npm's own defaults are only 2
# retries at a 10–60s backoff) — worth surviving a transient registry blip
# without failing the whole build.
RUN npm ci --no-audit --no-fund \
      --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

FROM deps AS build
# Vite inlines VITE_* vars into the JS bundle at build time (there's no
# runtime env for a static build) — these have to be build args, not
# container env vars. Defaults match apps/web/.env.example's placeholders;
# docker-compose.yml's build.args is the normal way to override them.
ARG VITE_API_URL=http://localhost:4000
ARG VITE_APP_NAME="Organisation Task Manager"
ARG VITE_APP_ENV=production
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID=task-manager-app-2d85c
ARG VITE_FIREBASE_APP_ID
ENV VITE_API_URL=$VITE_API_URL \
    VITE_APP_NAME=$VITE_APP_NAME \
    VITE_APP_ENV=$VITE_APP_ENV \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
COPY apps/web apps/web
RUN npm run build -w web

FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
