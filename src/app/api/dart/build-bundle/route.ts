import { NextResponse } from "next/server";
import {
  buildBundle,
  type BundleItemRequest,
  type ReprtCode,
} from "@/modules/dart-package-importer";

const VALID_REPRTS: ReprtCode[] = ["11011", "11012", "11013", "11014"];

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 본문입니다." },
      { status: 400 },
    );
  }
  const b = (body ?? {}) as { items?: unknown };
  const items = Array.isArray(b.items) ? b.items : [];
  if (items.length === 0) {
    return NextResponse.json(
      { error: "최소 1개 회사가 필요합니다." },
      { status: 400 },
    );
  }
  if (items.length > 20) {
    return NextResponse.json(
      { error: "한 번에 최대 20개 회사까지 처리 가능합니다." },
      { status: 400 },
    );
  }

  const requests: BundleItemRequest[] = [];
  for (const raw of items) {
    const it = (raw ?? {}) as Record<string, unknown>;
    const corp_code = String(it.corp_code ?? "");
    const bsns_year = String(it.bsns_year ?? "");
    const reprt_code = String(it.reprt_code ?? "11011") as ReprtCode;
    if (
      !/^\d{8}$/.test(corp_code) ||
      !/^\d{4}$/.test(bsns_year) ||
      !VALID_REPRTS.includes(reprt_code)
    ) {
      return NextResponse.json(
        { error: `잘못된 항목: ${JSON.stringify(it)}` },
        { status: 400 },
      );
    }
    requests.push({
      corp_code,
      bsns_year,
      reprt_code,
      include_ofs: it.include_ofs !== false,
      include_cfs: it.include_cfs !== false,
      include_notes: it.include_notes !== false,
      role: typeof it.role === "string" ? it.role : undefined,
    });
  }

  try {
    const { zip, items: results } = await buildBundle(requests);
    const filename = `consolbook_bundle_${Date.now()}.zip`;
    const headers = new Headers({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
        filename,
      )}`,
      "X-Bundle-Manifest": encodeURIComponent(
        JSON.stringify({ items: results }),
      ),
    });
    return new NextResponse(zip, { status: 200, headers });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "번들 생성 실패" },
      { status: 500 },
    );
  }
}

export const maxDuration = 300; // 다중 회사 처리에 시간 더 필요
