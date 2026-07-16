# Dokploy deployment

MapScraper deploys as a **Docker Compose** stack: `app` (Next.js) + `db` (Postgres 16).

## 1. Create application

1. In Dokploy → **Compose** (or Application with Docker Compose)
2. Connect this repo (or upload)
3. Compose file: `docker-compose.yml`
4. Build path / context: repository root

## 2. Environment variables

Set in the Dokploy UI (override defaults as needed):

| Variable | Example | Notes |
|----------|---------|--------|
| `DATABASE_URL` | `postgresql://mapscraper:STRONG_PASSWORD@db:5432/mapscraper?schema=public` | Host must be `db` (compose service name) |
| `POSTGRES_USER` | `mapscraper` | Must match URL user |
| `POSTGRES_PASSWORD` | `STRONG_PASSWORD` | Must match URL password |
| `POSTGRES_DB` | `mapscraper` | Must match URL db |
| `NEXT_PUBLIC_APP_NAME` | `MapScraper` | Optional |
| `OVERPASS_URL` | `https://z.overpass-api.de/api/interpreter` | Optional |
| `NOMINATIM_URL` | `https://nominatim.openstreetmap.org` | Optional |
| `SCRAPER_USER_AGENT` | `MapScraperDemo/1.0 (…your contact…)` | Required by OSM etiquette |

## 3. Domain / port

- App listens on **3000** inside the container
- Point your Dokploy domain / Traefik to the `app` service port `3000`
- Postgres is **not** published publicly (`expose` only)

## 4. Deploy notes

- On start, `docker-entrypoint.sh` runs `prisma migrate deploy` (retries until DB is up)
- Keep **1 replica** for `app` — scrapes run in-process
- Outbound HTTPS must be allowed (Nominatim + Overpass)

## 5. Local compose check

```bash
docker compose up -d --build
# http://localhost:3000
```

DB-only for local Next dev:

```bash
docker compose up -d db
# then set DATABASE_URL to localhost:5432 and npm run dev
```

## Alternative: Dockerfile-only app + managed Postgres

If you use Dokploy’s Postgres service separately:

1. Deploy app from `Dockerfile`
2. Set `DATABASE_URL` to the Dokploy Postgres connection string
3. Do **not** use the compose `db` service
