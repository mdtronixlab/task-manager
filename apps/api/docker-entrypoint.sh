#!/bin/sh
# Runs on every container start, before the actual server (see Dockerfile's
# ENTRYPOINT/CMD split — `exec "$@"` below runs whatever CMD provided).
# Both steps are idempotent — this automates the "one-time database setup"
# README.md otherwise has a developer run by hand (`npm run db:migrate &&
# npm run db:seed`), so `docker compose up` alone is enough on a fresh volume
# and a no-op on every later restart.
set -e

echo "Applying database migrations..."
npx prisma migrate deploy

echo "Seeding default settings/categories/departments..."
node prisma/seed.js

exec "$@"
