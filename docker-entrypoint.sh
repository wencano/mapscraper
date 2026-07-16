#!/bin/sh
set -e

echo "[mapscraper] Waiting for database..."
# Simple retry loop for Postgres readiness
i=0
until npx prisma migrate deploy; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "[mapscraper] Migrations failed after 30 attempts"
    exit 1
  fi
  echo "[mapscraper] DB not ready (attempt $i/30), retrying in 2s..."
  sleep 2
done

echo "[mapscraper] Starting Next.js on ${HOSTNAME:-0.0.0.0}:${PORT:-3000}"
exec node server.js
