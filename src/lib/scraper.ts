import { prisma } from "./prisma";
import { geocodeAddress, queryNearbyBusinesses } from "./osm";
import { computeNextRunAt } from "./schedule";

const running = new Set<string>();

export function isScrapeRunning(projectId: string) {
  return running.has(projectId);
}

export async function startScrape(projectId: string): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { ok: false, error: "Project not found", status: 404 };
  if (project.status === "SCRAPING" || running.has(projectId)) {
    return { ok: false, error: "Scrape already in progress", status: 409 };
  }
  if (!project.locations.length || !project.searchQuery.trim()) {
    return { ok: false, error: "Project needs search query and locations", status: 400 };
  }

  running.add(projectId);
  await prisma.project.update({
    where: { id: projectId },
    data: {
      status: "SCRAPING",
      progressCurrent: 0,
      progressTotal: project.locations.length,
      errorMessage: null,
    },
  });

  // Fire-and-forget for demo (in-process)
  void runScrapeJob(projectId).finally(() => running.delete(projectId));

  return { ok: true };
}

async function runScrapeJob(projectId: string) {
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return;

    let index = 0;
    for (const location of project.locations) {
      index += 1;
      try {
        const geo = await geocodeAddress(location);
        if (geo) {
          const leads = await queryNearbyBusinesses(
            project.searchQuery,
            geo.lat,
            geo.lon,
            location
          );
          const now = new Date();
          console.log(
            `[scrape] ${location} → ${leads.length} POIs near ${geo.lat},${geo.lon}`
          );
          // Batch upserts (sequential chunks keep unique constraint safe)
          for (const lead of leads) {
            await prisma.lead.upsert({
              where: {
                projectId_osmType_osmId: {
                  projectId,
                  osmType: lead.osmType,
                  osmId: lead.osmId,
                },
              },
              create: {
                projectId,
                osmType: lead.osmType,
                osmId: lead.osmId,
                name: lead.name,
                category: lead.category,
                address: lead.address || geo.displayName,
                phone: lead.phone,
                website: lead.website,
                lat: lead.lat,
                lon: lead.lon,
                rawTags: lead.rawTags,
                firstSeenAt: now,
                lastSeenAt: now,
              },
              update: {
                name: lead.name,
                category: lead.category,
                address: lead.address || geo.displayName,
                phone: lead.phone,
                website: lead.website,
                lat: lead.lat,
                lon: lead.lon,
                rawTags: lead.rawTags,
                lastSeenAt: now,
              },
            });
          }
        } else {
          console.warn(`[scrape] geocode miss: ${location}`);
        }
      } catch (err) {
        console.error(`[scrape] location failed: ${location}`, err);
      }

      await prisma.project.update({
        where: { id: projectId },
        data: { progressCurrent: index },
      });
    }

    const fresh = await prisma.project.findUnique({ where: { id: projectId } });
    const nextRunAt = fresh
      ? computeNextRunAt(fresh.schedule, new Date())
      : null;

    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: "DONE",
        lastScrapedAt: new Date(),
        nextRunAt,
        errorMessage: null,
        progressCurrent: project.locations.length,
        progressTotal: project.locations.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown scrape error";
    console.error(`[scrape] project ${projectId} failed`, err);
    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: "ERROR",
        errorMessage: message,
      },
    });
  }
}
