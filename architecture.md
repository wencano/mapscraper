# MapScraper — Architecture

Senior fullstack overview for the demo leadgen scraper. Companion deck: [`architecture.html`](./architecture.html). Spec: [`spec.md`](./spec.md).

---

## 1. System Context

```mermaid
C4Context
title MapScraper — System Context

Person(op, "Demo Operator", "Creates projects, runs scrapes, reviews leads")
System(app, "MapScraper", "Next.js dashboard + scrape orchestration")
System_Ext(nominatim, "Nominatim", "OSM geocoding (public)")
System_Ext(overpass, "Overpass API", "OSM POI queries (public)")
SystemDb(pg, "PostgreSQL", "Projects & leads")

Rel(op, app, "HTTPS / browser")
Rel(app, nominatim, "Geocode address lines")
Rel(app, overpass, "Query businesses near points")
Rel(app, pg, "Prisma CRUD / upsert")
```

---

## 2. Container View

```mermaid
flowchart LR
  subgraph Client
    UI[Next.js App Router UI<br/>Notion design system]
  end

  subgraph NextServer["Next.js Server"]
    API[Route Handlers<br/>/api/projects/*]
    SCR[Scrape Engine<br/>async in-process]
    CRON[Cron Tick<br/>/api/cron/tick]
  end

  subgraph Data
    PG[(PostgreSQL)]
  end

  subgraph OSM["Public OSM APIs"]
    NOM[Nominatim]
    OVP[Overpass]
  end

  UI -->|REST JSON| API
  UI -->|poll status| API
  API --> PG
  API -->|start job| SCR
  SCR --> NOM
  SCR --> OVP
  SCR --> PG
  CRON --> SCR
  CRON --> PG
```

---

## 3. Request Lifecycle — Create Project

```mermaid
sequenceDiagram
  actor U as Operator
  participant M as Project Modal
  participant API as POST /api/projects
  participant DB as PostgreSQL
  participant D as Project Detail

  U->>M: Name, search query, locations, schedule
  M->>API: JSON payload
  API->>API: Validate + compute nextRunAt
  API->>DB: INSERT Project status=READY
  API-->>M: 201 { id }
  M->>D: navigate /projects/:id
  D->>API: GET project + leads
  API->>DB: SELECT
  API-->>D: empty leads[], status READY
```

---

## 4. Scrape Pipeline

```mermaid
flowchart TD
  A[POST /scrape] --> B{status != SCRAPING?}
  B -->|no| X[409 Conflict]
  B -->|yes| C[Set SCRAPING<br/>progress 0/N]
  C --> D[Return 202 immediately]
  C --> E[Background job]
  E --> F[For each location line]
  F --> G[Nominatim geocode<br/>1 req/s]
  G --> H{coords?}
  H -->|no| I[Skip / log]
  H -->|yes| J[Overpass around point<br/>radius ~1200m]
  J --> K[Map tags → Lead DTO]
  K --> L[Upsert by projectId+osmType+osmId]
  I --> M[progress++]
  L --> M
  M --> N{more locations?}
  N -->|yes| F
  N -->|no| O[status DONE<br/>lastScrapedAt / nextRunAt]
```

---

## 5. Status State Machine

```mermaid
stateDiagram-v2
  [*] --> READY: create with valid config
  READY --> SCRAPING: Run scrape / cron
  SCRAPING --> DONE: all locations processed
  SCRAPING --> ERROR: fatal provider/DB error
  DONE --> SCRAPING: re-run
  ERROR --> SCRAPING: retry
  DONE --> READY: edit config (optional)
  ERROR --> READY: edit config
```

---

## 6. Data Model

```mermaid
erDiagram
  PROJECT ||--o{ LEAD : contains
  PROJECT {
    string id PK
    string name
    string searchQuery
    string[] locations
    enum schedule
    enum status
    int progressCurrent
    int progressTotal
    datetime lastScrapedAt
    datetime nextRunAt
  }
  LEAD {
    string id PK
    string projectId FK
    string osmType
    string osmId
    string name
    string category
    string address
    string phone
    string website
    float lat
    float lon
    json rawTags
  }
```

---

## 7. Scheduling

```mermaid
sequenceDiagram
  participant T as Cron Tick (interval / external)
  participant API as POST /api/cron/tick
  participant DB as PostgreSQL
  participant S as Scrape Engine

  T->>API: trigger
  API->>DB: FIND projects WHERE nextRunAt <= now AND status != SCRAPING
  loop each due project
    API->>S: startScrape(projectId)
    S->>DB: SCRAPING → … → DONE + nextRunAt
  end
  API-->>T: { started: [...] }
```

---

## 8. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Map data source | Nominatim search first, Overpass enrich | Free public APIs; Nominatim is stable when Overpass mirrors rate-limit |
| Job runner | In-process async after 202 | Zero infra for demo; swap for queue later |
| Dedup | Unique `(projectId, osmType, osmId)` | Idempotent re-scrapes / schedules |
| UI | Notion design tokens | Familiar ops UI; dense tables + soft modal |
| ORM | Prisma 5 | Typed schema, fast local migrate |

---

## 9. Deployment Topology (Local Demo)

```mermaid
flowchart TB
  DEV[Developer machine]
  NEXT[next dev :3000]
  COMPOSE[docker compose<br/>postgres :5432]
  NET[Public internet<br/>Nominatim / Overpass]

  DEV --> NEXT
  NEXT --> COMPOSE
  NEXT --> NET
```

---

## 10. Extension Points

- Replace in-process jobs with BullMQ / Inngest
- Self-host Nominatim + Overpass for volume
- Add auth + workspace isolation
- Export CSV / webhook to CRM
- Leaflet map of lead pins
