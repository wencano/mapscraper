# MapScraper — Implementation Todo

High-level checklist derived from `spec.md`.

## Documentation

- [x] `spec.md` — formal product & technical specification
- [x] `todo.md` — this list
- [x] `architecture.md` — system design + Mermaid diagrams
- [x] `architecture.html` — animated presentation deck
- [x] `README.md` — setup, demo flow, API notes

## Infrastructure

- [x] Docker Compose PostgreSQL (+ local Homebrew fallback)
- [x] Prisma schema (`Project`, `Lead`) + migrate
- [x] `.env.example` / local `.env`
- [x] Next.js App Router scaffold + Notion design tokens

## Backend

- [x] Prisma client singleton
- [x] `GET/POST /api/projects`
- [x] `GET/PATCH/DELETE /api/projects/[id]`
- [x] `POST /api/projects/[id]/scrape` (async job)
- [x] `GET /api/projects/[id]/status`
- [x] Nominatim geocoder (rate-limited)
- [x] Overpass POI scraper + tag mapping
- [x] Lead upsert by `(projectId, osmType, osmId)`
- [x] Schedule `nextRunAt` computation
- [x] `POST /api/cron/tick` for due projects

## Frontend (Notion DS)

- [x] App shell / layout
- [x] Dashboard project list + empty state
- [x] Project modal (create/edit): name, search query, locations, schedule
- [x] Project detail: status, progress, leads table, Run + Settings
- [x] Client polling while `SCRAPING`
- [x] Status badges & progress bar

## Demo Acceptance

- [x] Create project → detail Ready + empty table
- [x] Scrape → progress → Done + Postgres leads
- [x] Edit via settings; re-scrape upserts new items
- [x] Schedule persisted; cron tick / ScheduleTicker can fire
