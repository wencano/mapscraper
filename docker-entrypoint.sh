#!/bin/sh
set -e

echo "[mapscraper] Waiting for database / running migrations..."
i=0
until ./node_modules/.bin/prisma migrate deploy; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "[mapscraper] Migrations failed after 30 attempts"
    exit 1
  fi
  echo "[mapscraper] DB not ready (attempt $i/30), retrying in 2s..."
  sleep 2
done

echo "[mapscraper] Starting Next.js on ${HOSTNAME:-0.0.0.0}:${PORT:-3000}"
exec ./node_modules/.bin/next start -H "${HOSTNAME:-0.0.0.0}" -p "${PORT:-3000}"
