import { NextResponse } from "next/server";
import { searchCorps } from "@/modules/dart-package-importer";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json({ hits: [] });
  }
  const hits = await searchCorps(q, 30);
  return NextResponse.json({ hits });
}
