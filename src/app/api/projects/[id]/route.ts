import { NextRequest, NextResponse } from "next/server";
import { ScheduleInterval } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeNextRunAt, parseLocations } from "@/lib/schedule";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      leads: { orderBy: [{ name: "asc" }] },
      _count: { select: { leads: true } },
    },
  });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(project);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status === "SCRAPING") {
    return NextResponse.json(
      { error: "Cannot edit while scraping" },
      { status: 409 }
    );
  }

  const body = await req.json();
  const name = String(body.name ?? existing.name).trim();
  const searchQuery = String(body.searchQuery ?? existing.searchQuery).trim();
  const locations =
    body.locationsText !== undefined || body.locations !== undefined
      ? parseLocations(body.locationsText ?? body.locations)
      : existing.locations;
  const schedule = (body.schedule ?? existing.schedule) as ScheduleInterval;

  if (!name || !searchQuery || !locations.length) {
    return NextResponse.json(
      { error: "Name, search query, and at least one location are required" },
      { status: 400 }
    );
  }

  const scheduleChanged = schedule !== existing.schedule;
  const project = await prisma.project.update({
    where: { id },
    data: {
      name,
      searchQuery,
      locations,
      schedule,
      // Editing config returns the project to READY for another run
      status: "READY",
      nextRunAt: scheduleChanged
        ? computeNextRunAt(schedule)
        : existing.nextRunAt,
      errorMessage: null,
    },
  });

  return NextResponse.json(project);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
