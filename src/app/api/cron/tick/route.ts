import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startScrape } from "@/lib/scraper";

export async function POST() {
  const due = await prisma.project.findMany({
    where: {
      schedule: { not: "NONE" },
      nextRunAt: { lte: new Date() },
      status: { not: "SCRAPING" },
    },
    select: { id: true, name: true },
  });

  const started: string[] = [];
  const skipped: Array<{ id: string; error: string }> = [];

  for (const p of due) {
    const result = await startScrape(p.id);
    if (result.ok) started.push(p.id);
    else skipped.push({ id: p.id, error: result.error });
  }

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    due: due.length,
    started,
    skipped,
  });
}

export async function GET() {
  return POST();
}
