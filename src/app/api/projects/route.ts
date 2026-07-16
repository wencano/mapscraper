import { NextRequest, NextResponse } from "next/server";
import { ScheduleInterval } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeNextRunAt, parseLocations } from "@/lib/schedule";

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { leads: true } } },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = String(body.name || "").trim();
  const searchQuery = String(body.searchQuery || "").trim();
  const locations = parseLocations(body.locationsText ?? body.locations ?? "");
  const schedule = (body.schedule || "NONE") as ScheduleInterval;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!searchQuery) {
    return NextResponse.json({ error: "Search query is required" }, { status: 400 });
  }
  if (!locations.length) {
    return NextResponse.json(
      { error: "Add at least one location (one per line)" },
      { status: 400 }
    );
  }
  if (!Object.values(ScheduleInterval).includes(schedule)) {
    return NextResponse.json({ error: "Invalid schedule" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      name,
      searchQuery,
      locations,
      schedule,
      status: "READY",
      nextRunAt: computeNextRunAt(schedule),
      progressCurrent: 0,
      progressTotal: 0,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
