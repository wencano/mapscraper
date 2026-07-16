const USER_AGENT =
  process.env.SCRAPER_USER_AGENT ||
  "MapScraperDemo/1.0 (demo leadgen; contact: demo@localhost)";

const NOMINATIM_URL =
  process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function overpassEndpoints(): string[] {
  // Resolve at call time so .env changes / hot reload are picked up
  return [
    process.env.OVERPASS_URL,
    // z.overpass-api.de works with Node fetch + has global data
    "https://z.overpass-api.de/api/interpreter",
    "https://overpass.osm.ch/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
  ].filter((u, i, arr): u is string => Boolean(u) && arr.indexOf(u) === i);
}

export type GeoPoint = { lat: number; lon: number; displayName: string };

export type OsmLead = {
  osmType: string;
  osmId: string;
  name: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  lat: number | null;
  lon: number | null;
  rawTags: Record<string, string>;
};

let lastNominatimAt = 0;

export async function geocodeAddress(query: string): Promise<GeoPoint | null> {
  const elapsed = Date.now() - lastNominatimAt;
  if (elapsed < 1100) await sleep(1100 - elapsed);

  const url = new URL("/search", NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  lastNominatimAt = Date.now();
  const res = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Nominatim ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;

  if (!data?.length) return null;
  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
}

const KNOWN_AMENITIES = new Set([
  "cafe",
  "restaurant",
  "fast_food",
  "bar",
  "pub",
  "pharmacy",
  "bank",
  "atm",
  "hospital",
  "clinic",
  "dentist",
  "doctors",
  "fuel",
  "parking",
  "school",
  "university",
  "library",
  "theatre",
  "cinema",
  "marketplace",
  "place_of_worship",
]);

const KNOWN_SHOPS = new Set([
  "supermarket",
  "convenience",
  "bakery",
  "butcher",
  "clothes",
  "shoes",
  "books",
  "electronics",
  "hardware",
  "hairdresser",
  "beauty",
  "chemist",
  "florist",
  "jewelry",
  "mall",
  "department_store",
]);

function buildOverpassQuery(searchQuery: string, lat: number, lon: number, radius = 1200) {
  const q = searchQuery.trim().toLowerCase().replace(/\s+/g, "_");
  const around = `(around:${radius},${lat},${lon})`;

  if (KNOWN_AMENITIES.has(q)) {
    return `
[out:json][timeout:25];
(
  node["amenity"="${q}"]${around};
  way["amenity"="${q}"]${around};
);
out center tags;
`;
  }

  if (KNOWN_SHOPS.has(q)) {
    return `
[out:json][timeout:25];
(
  node["shop"="${q}"]${around};
  way["shop"="${q}"]${around};
);
out center tags;
`;
  }

  // Broader: amenity/shop with name matching, plus amenity/shop exact if raw
  const safe = searchQuery.trim().replace(/["\\]/g, "");
  return `
[out:json][timeout:25];
(
  node["amenity"]["name"~"${safe}",i]${around};
  node["shop"]["name"~"${safe}",i]${around};
  node["amenity"="${q}"]${around};
  node["shop"="${q}"]${around};
  node["tourism"]["name"~"${safe}",i]${around};
);
out center tags;
`;
}

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function formatAddress(tags: Record<string, string>): string | null {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:city"] || tags["addr:town"] || tags["addr:suburb"],
    tags["addr:postcode"],
  ].filter(Boolean);
  if (parts.length) return parts.join(", ");
  return tags["addr:full"] || null;
}

function categoryFromTags(tags: Record<string, string>): string | null {
  return tags.amenity || tags.shop || tags.tourism || tags.office || null;
}

function mapElements(elements: OverpassElement[]): OsmLead[] {
  return elements
    .map((el): OsmLead | null => {
      const tags = el.tags || {};
      const name = tags.name || tags.brand || tags.operator;
      if (!name) return null;
      const latVal = el.lat ?? el.center?.lat ?? null;
      const lonVal = el.lon ?? el.center?.lon ?? null;
      return {
        osmType: el.type,
        osmId: String(el.id),
        name,
        category: categoryFromTags(tags),
        address: formatAddress(tags),
        phone: tags.phone || tags["contact:phone"] || null,
        website: tags.website || tags["contact:website"] || tags.url || null,
        lat: latVal,
        lon: lonVal,
        rawTags: tags,
      };
    })
    .filter((x): x is OsmLead => Boolean(x));
}

type NominatimRow = {
  osm_type?: string;
  osm_id?: number;
  place_id?: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type?: string;
  class?: string;
  extratags?: Record<string, string>;
};

function mapNominatimRows(data: NominatimRow[], searchQuery: string): OsmLead[] {
  return data
    .filter((row) => row.lat && row.lon)
    .map((row) => {
      const tags = row.extratags || {};
      const name =
        row.name ||
        tags.name ||
        row.display_name.split(",")[0]?.trim() ||
        "Unknown";
      const osmId =
        row.osm_id != null
          ? String(row.osm_id)
          : `place:${row.place_id ?? `${row.lat},${row.lon}`}`;
      return {
        osmType: row.osm_type || "node",
        osmId,
        name,
        category: row.type || row.class || searchQuery,
        address: row.display_name,
        phone: tags.phone || tags["contact:phone"] || null,
        website: tags.website || tags["contact:website"] || tags.url || null,
        lat: parseFloat(row.lat),
        lon: parseFloat(row.lon),
        rawTags: { ...tags, class: row.class || "", type: row.type || "" },
      } satisfies OsmLead;
    });
}

async function nominatimSearchOnce(q: string): Promise<NominatimRow[]> {
  const elapsed = Date.now() - lastNominatimAt;
  if (elapsed < 1100) await sleep(1100 - elapsed);

  const url = new URL("/search", NOMINATIM_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("limit", "40");

  lastNominatimAt = Date.now();
  const res = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Nominatim search ${res.status}: ${(await res.text()).slice(0, 120)}`);
  }
  const data = (await res.json()) as NominatimRow[];
  console.log(`[nominatim] search "${q}" → ${Array.isArray(data) ? data.length : 0} hits`);
  return Array.isArray(data) ? data : [];
}

/** Nominatim POI search — primary free path for the demo. */
export async function searchBusinessesNominatim(
  searchQuery: string,
  nearLabel: string
): Promise<OsmLead[]> {
  const term = searchQuery.trim();
  const variants = [
    `${term} in ${nearLabel}`,
    `${term}, ${nearLabel}`,
    // "coffee shop" → also try "cafe" / first token
    ...(term.includes(" ")
      ? [`${term.split(/\s+/)[0]} in ${nearLabel}`, `cafe in ${nearLabel}`]
      : []),
  ];

  for (const q of variants) {
    const rows = await nominatimSearchOnce(q);
    if (rows.length > 0) return mapNominatimRows(rows, searchQuery);
  }
  return [];
}

export async function queryNearbyBusinesses(
  searchQuery: string,
  lat: number,
  lon: number,
  nearLabel?: string
): Promise<OsmLead[]> {
  // Demo default: Nominatim search first (stable under Overpass rate limits)
  if (nearLabel) {
    try {
      const fromNominatim = await searchBusinessesNominatim(searchQuery, nearLabel);
      if (fromNominatim.length > 0) {
        console.log(`[nominatim] search ok: ${fromNominatim.length} for "${searchQuery}" near ${nearLabel}`);
        // Optionally enrich via Overpass when available (best-effort)
        try {
          const fromOverpass = await queryOverpass(searchQuery, lat, lon);
          if (fromOverpass.length > fromNominatim.length) {
            console.log(`[overpass] enriched to ${fromOverpass.length}`);
            return mergeLeads(fromNominatim, fromOverpass);
          }
        } catch {
          /* ignore — Nominatim already succeeded */
        }
        return fromNominatim;
      }
    } catch (err) {
      console.warn("[nominatim] search failed, trying Overpass", err);
    }
  }

  return queryOverpass(searchQuery, lat, lon);
}

function mergeLeads(a: OsmLead[], b: OsmLead[]): OsmLead[] {
  const map = new Map<string, OsmLead>();
  for (const lead of [...a, ...b]) {
    map.set(`${lead.osmType}:${lead.osmId}`, lead);
  }
  return [...map.values()];
}

async function queryOverpass(
  searchQuery: string,
  lat: number,
  lon: number
): Promise<OsmLead[]> {
  const query = buildOverpassQuery(searchQuery, lat, lon);
  let lastError: Error | null = null;

  for (const endpoint of overpassEndpoints()) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "*/*",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "data=" + encodeURIComponent(query),
          cache: "no-store",
        });

        if (res.status === 429 || res.status === 504 || res.status === 502) {
          lastError = new Error(`Overpass ${res.status} @ ${endpoint}`);
          await sleep(1500 * attempt);
          continue;
        }

        if (!res.ok) {
          lastError = new Error(`Overpass ${res.status} @ ${endpoint}`);
          break;
        }

        const data = (await res.json()) as { elements?: OverpassElement[] };
        const leads = mapElements(data.elements || []);
        if (leads.length === 0) {
          lastError = new Error(`Overpass empty @ ${endpoint}`);
          break;
        }
        console.log(`[overpass] ok @ ${endpoint}: ${leads.length}`);
        return leads;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        await sleep(800 * attempt);
      }
    }
  }

  // Soft-fail for demo: empty is better than aborting the whole location
  console.warn(`[overpass] giving up: ${lastError?.message || "unknown"}`);
  return [];
}
