# MapScraper

Demo lead-generation app that discovers businesses in specific areas using **free public OpenStreetMap APIs** (Nominatim + Overpass), stores results in **PostgreSQL**, and presents a **Notion-styled** Next.js dashboard.

> Demo only — does not scrape Google Maps or other proprietary UIs.

## Features

- Dashboard of projects / areas
- Modal form: **what to look for** + **addresses** (one per line) + schedule
- Project detail: Ready → Scraping (progress) → Done table
- Settings gear reopens the form (edit locations, schedule, search intent)
- Upsert into Postgres so re-scrapes / schedules add new items
- Auto-scrape via schedule + `/api/cron/tick`

## Docs

| File | Purpose |
|------|---------|
| [`spec.md`](./spec.md) | Formal product & technical specification |
| [`todo.md`](./todo.md) | High-level implementation checklist |
| [`architecture.md`](./architecture.md) | Design + Mermaid diagrams |
| [`architecture.html`](./architecture.html) | Animated presentation deck (open in browser) |
| [`dokploy.md`](./dokploy.md) | Dokploy / Docker Compose deploy guide |

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- PostgreSQL 16 + Prisma 5
- Nominatim (geocode) + Overpass (POIs)

## Quick start

### Option A — Full stack (Docker / Dokploy-shaped)

```bash
cp .env.example .env
docker compose up -d --build
```

App: [http://localhost:3000](http://localhost:3000). Migrations run on container start.

### Option B — Local Next + Postgres

```bash
docker compose up -d db
# or Homebrew Postgres — then set DATABASE_URL to localhost in .env
npm install
# .env: DATABASE_URL=postgresql://mapscraper:mapscraper@localhost:5432/mapscraper?schema=public
npx prisma migrate dev
npm run dev
```

### Dokploy

See [`dokploy.md`](./dokploy.md). Use compose file `docker-compose.yml`, set `DATABASE_URL` with host `db`, keep **1 replica**.

### Architecture deck

```bash
open architecture.html
```

## Demo flow

1. **New project** → name, e.g. search `cafe`, locations:

   ```
   Makati City, Philippines
   Bonifacio Global City, Taguig
   ```

2. Save → project detail with empty table + **Ready**
3. **Run scrape** → watch progress
4. **Done** → leads table populated from OSM
5. Gear → edit locations / schedule → re-run to pick up new items

## Environment

Copy `.env.example` → `.env` (defaults work with Docker Compose):

```env
DATABASE_URL="postgresql://mapscraper:mapscraper@localhost:5432/mapscraper?schema=public"
OVERPASS_URL="https://z.overpass-api.de/api/interpreter"
NOMINATIM_URL="https://nominatim.openstreetmap.org"
SCRAPER_USER_AGENT="MapScraperDemo/1.0 (demo leadgen; contact: demo@localhost)"
```

## API (summary)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/projects` | List / create |
| GET/PATCH/DELETE | `/api/projects/[id]` | Read / update / delete |
| POST | `/api/projects/[id]/scrape` | Start scrape (202) |
| GET | `/api/projects/[id]/status` | Poll progress |
| POST | `/api/cron/tick` | Start due scheduled scrapes |

Trigger schedule tick manually:

```bash
curl -X POST http://localhost:3000/api/cron/tick
```

## Provider notes

Free public OSM stack (no Google scraping):

1. **Nominatim** — geocode address lines + POI text search (`cafe in Makati…`)  
   - ≤ 1 request/second; requires a descriptive User-Agent
2. **Overpass** — optional enrichment around geocoded points  
   - Public mirrors often 406/504 under load; app tries several endpoints and soft-fails to Nominatim-only results

OSM coverage varies by city. Prefer short amenity keys (`cafe`, `pharmacy`, `restaurant`) in **What to look for**.

## License

Demo / internal use.
