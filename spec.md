# MapScraper — Product & Technical Specification

**Version:** 1.0.0  
**Status:** Demo / MVP  
**Stack:** Next.js 15 (App Router), PostgreSQL, Prisma, OpenStreetMap public APIs  
**Audience:** Internal demo of area-based B2B lead generation from map data

---

## 1. Purpose

MapScraper is a lead-generation demo that discovers businesses in user-defined geographic areas using free public map APIs (Nominatim + Overpass). Users create projects, define a search intent and address list, run scrapes, inspect results in a Notion-styled dashboard, and optionally schedule recurring updates that upsert new leads into PostgreSQL.

This product is **demo-only**. It must not scrape proprietary map UIs (e.g. Google Maps). All discovery uses OpenStreetMap public endpoints with polite rate limiting.

---

## 2. Goals & Non-Goals

### 2.1 Goals

- Create and manage leadgen **projects** (named areas / campaigns).
- Configure **search intent** (what to look for) separately from **locations** (one address per line).
- Persist projects and leads in **PostgreSQL**.
- Run scrapes with visible **status** and **progress**.
- Deduplicate / upsert leads so scheduled re-scrapes only add or refresh new items.
- Present a clean **Notion-like** UI for dashboard, modal form, and project detail.
- Document architecture for senior-level presentation (`architecture.md`, `architecture.html`).

### 2.2 Non-Goals

- Production-grade anti-bot / proxy infrastructure.
- Paid Places APIs (Google, Foursquare paid tiers).
- Multi-tenant auth / SSO (single-user demo).
- Mobile-native apps.
- Legal/compliance tooling beyond documenting OSM usage policies.

---

## 3. Personas

| Persona | Need |
|---------|------|
| Demo operator | Quickly spin up a project, scrape cafes/shops in a few neighborhoods, show a live table |
| Stakeholder | Understand system flow via architecture diagrams |

---

## 4. User Stories

1. **As an operator**, I can open a dashboard listing all projects with status and lead counts.
2. **As an operator**, I can open a modal to create a project with name, search query, multiline locations, and optional schedule.
3. **As an operator**, after save I land on the project detail page with an empty leads table and **Ready** status when runnable.
4. **As an operator**, I can start a scrape and see **Scraping** status with progress (locations processed / total).
5. **As an operator**, when scrape completes I see **Done** and a populated leads table persisted in Postgres.
6. **As an operator**, I can open settings (gear) to edit locations, search query, and schedule; re-scrape updates the DB with new items.
7. **As an operator**, if a schedule is set, the system can auto-run scrapes when due.

---

## 5. Functional Requirements

### 5.1 Dashboard (`/`)

| ID | Requirement |
|----|-------------|
| FR-01 | List projects: name, status badge, lead count, last scrape time, schedule summary |
| FR-02 | Primary CTA: “New project” opens project modal |
| FR-03 | Clicking a project row navigates to project detail |
| FR-04 | Empty state when no projects exist |

### 5.2 Project Modal (create / edit)

| ID | Requirement |
|----|-------------|
| FR-10 | Fields: **Name**, **What to look for** (search query), **Locations** (textarea, one address/location per line), **Schedule** (None / Every 6h / Daily / Weekly) |
| FR-11 | Create mode: POST project, redirect to `/projects/[id]` |
| FR-12 | Edit mode: opened via settings icon; PATCH project; preserve existing leads unless re-scrape |
| FR-13 | Validation: name required; at least one non-empty location line; search query required |

### 5.3 Project Detail (`/projects/[id]`)

| ID | Requirement |
|----|-------------|
| FR-20 | Header: project name, search query, settings (gear), Run scrape button |
| FR-21 | Status chip: `DRAFT` \| `READY` \| `SCRAPING` \| `DONE` \| `ERROR` |
| FR-22 | Progress bar when `SCRAPING` (currentLocation / totalLocations) |
| FR-23 | Leads table: name, category, address, phone, website, lat/lon, first seen |
| FR-24 | Empty table message when zero leads |
| FR-25 | Poll status while scraping (client interval ~1.5s) |

### 5.4 Scraping Engine

| ID | Requirement |
|----|-------------|
| FR-30 | Geocode each location line via **Nominatim** public API |
| FR-31 | Discover POIs via **Nominatim search** (`{query} in {location}`), optionally enrich with **Overpass** around the geocoded point |
| FR-32 | Map OSM tags (`amenity`, `shop`, `tourism`, `name`, `phone`, `website`, `addr:*`) to lead records |
| FR-33 | Upsert by `(projectId, osmType, osmId)` — new items inserted; existing refreshed |
| FR-34 | Respect rate limits: Nominatim ≤ 1 req/s; Overpass with backoff on 429/504 |
| FR-35 | Update project `progressCurrent`, `progressTotal`, `status`, `lastScrapedAt`, `errorMessage` |
| FR-36 | Identify as demo client via descriptive `User-Agent` |

### 5.5 Scheduling

| ID | Requirement |
|----|-------------|
| FR-40 | Store `schedule` enum: `NONE`, `EVERY_6H`, `DAILY`, `WEEKLY` |
| FR-41 | Compute `nextRunAt` on save and after each scrape |
| FR-42 | Background tick endpoint `/api/cron/tick` (or in-process interval in demo) runs due projects |
| FR-43 | Scheduled runs behave like manual scrape (upsert semantics) |

---

## 6. Data Model

### 6.1 `Project`

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| name | string | Display name |
| searchQuery | string | What to look for (e.g. `cafe`, `pharmacy`) |
| locations | string[] | Address lines |
| schedule | enum | NONE / EVERY_6H / DAILY / WEEKLY |
| status | enum | DRAFT / READY / SCRAPING / DONE / ERROR |
| progressCurrent | int | Locations completed |
| progressTotal | int | Locations total |
| lastScrapedAt | datetime? | |
| nextRunAt | datetime? | |
| errorMessage | string? | |
| createdAt / updatedAt | datetime | |

### 6.2 `Lead`

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| projectId | FK | Cascade delete |
| osmType | string | node / way / relation |
| osmId | string | OSM element id |
| name | string | |
| category | string? | |
| address | string? | |
| phone | string? | |
| website | string? | |
| lat / lon | float? | |
| rawTags | json | Original OSM tags |
| firstSeenAt / lastSeenAt | datetime | |

Unique: `(projectId, osmType, osmId)`

---

## 7. API Surface

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List projects + lead counts |
| POST | `/api/projects` | Create project → status READY |
| GET | `/api/projects/[id]` | Project + leads |
| PATCH | `/api/projects/[id]` | Update config; recompute nextRunAt |
| DELETE | `/api/projects/[id]` | Delete project |
| POST | `/api/projects/[id]/scrape` | Start scrape (async) |
| GET | `/api/projects/[id]/status` | Lightweight status/progress poll |
| POST | `/api/cron/tick` | Process due scheduled projects |

---

## 8. External Providers (Demo)

| Provider | Role | Cost | Notes |
|----------|------|------|-------|
| Nominatim | Geocoding | Free (public) | Rate limit 1 req/s; require User-Agent |
| Overpass | POI query | Free (public) | Use `overpass-api.de` or fallback mirrors |

Search intent mapping (demo heuristic):

- Prefer `amenity`/`shop` exact tag match when query is a known key value.
- Else name/brand regex around geocoded point (radius ~1200m).

---

## 9. UI Design System — Notion

- Canvas `#ffffff`, sidebar/surface `#f7f6f3`, text `#37352f`
- Borders `rgba(55,53,47,0.09)`, hover `rgba(55,53,47,0.08)`
- Accent blue `#2383e2`, red for errors, green/amber for status
- Typography: Notion system stack (`ui-sans-serif`, `-apple-system`, `Segoe UI`, …)
- Components: soft modals, icon buttons, pill status badges, dense but airy tables
- Motion: subtle fade/scale on modal; progress bar transition

---

## 10. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-01 | Scrape runs must not block HTTP response > 2s (fire-and-forget + poll) |
| NFR-02 | Upserts must be idempotent under concurrent scheduled + manual runs (status guard) |
| NFR-03 | Docker Compose for Postgres local demo |
| NFR-04 | Document setup in README; architecture in MD + animated HTML |

---

## 11. Status State Machine

```
DRAFT ──(save with valid config)──► READY
READY ──(start scrape)──► SCRAPING ──(success)──► DONE
                              │
                              └──(failure)──► ERROR
DONE / ERROR ──(edit / re-scrape)──► READY or SCRAPING
```

A project is **Ready** when it has name, searchQuery, ≥1 location, and is not currently scraping.

---

## 12. Acceptance Criteria (Demo)

- [ ] Dashboard lists projects; empty state works
- [ ] Create project via modal; redirect to detail with empty table + Ready
- [ ] Run scrape shows progress; Done lists leads from OSM
- [ ] Leads persisted in Postgres and survive refresh
- [ ] Settings modal updates locations/query/schedule
- [ ] Re-scrape upserts; count can grow with new OSM items
- [ ] Schedule field stored; cron tick can start due projects
- [ ] Docs: `spec.md`, `todo.md`, `architecture.md`, `architecture.html`, `README.md`

---

## 13. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Public API rate limits / downtime | Backoff, clear ERROR status, document self-host option |
| Sparse OSM coverage | Demo copy notes data quality varies by city |
| Long scrapes | Async job + polling; progress per location |

---

## 14. Out of Scope Follow-ups

- Auth, multi-user workspaces
- Export CSV / CRM sync
- Map visualization of leads
- Self-hosted Nominatim / Overpass
