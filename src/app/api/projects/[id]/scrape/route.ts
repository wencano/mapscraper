import { NextRequest, NextResponse } from "next/server";
import { startScrape } from "@/lib/scraper";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const result = await startScrape(id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status || 400 }
    );
  }
  return NextResponse.json({ ok: true, status: "SCRAPING" }, { status: 202 });
}
