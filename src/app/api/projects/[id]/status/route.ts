import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      progressCurrent: true,
      progressTotal: true,
      errorMessage: true,
      lastScrapedAt: true,
      nextRunAt: true,
      _count: { select: { leads: true } },
    },
  });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(project);
}
