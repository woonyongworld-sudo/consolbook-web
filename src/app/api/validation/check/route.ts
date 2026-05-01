import { NextResponse } from "next/server";
import {
  RULES,
  readPackageXlsx,
  runValidation,
} from "@/modules/validation";

export async function POST(req: Request) {
  let buf: ArrayBuffer;
  try {
    buf = await req.arrayBuffer();
  } catch {
    return NextResponse.json(
      { error: "요청 본문을 읽지 못했습니다." },
      { status: 400 },
    );
  }
  if (buf.byteLength === 0) {
    return NextResponse.json(
      { error: "비어있는 파일입니다." },
      { status: 400 },
    );
  }
  if (buf.byteLength > 50 * 1024 * 1024) {
    return NextResponse.json(
      { error: "파일이 너무 큽니다 (50MB 초과)." },
      { status: 413 },
    );
  }

  try {
    const ctx = await readPackageXlsx(buf);
    if (ctx.fs.length === 0) {
      return NextResponse.json(
        {
          error:
            "재무제표 시트를 찾을 수 없습니다. dart-package-importer가 만든 .xlsx인지 확인하세요.",
        },
        { status: 422 },
      );
    }
    const report = runValidation(ctx, RULES);
    return NextResponse.json({ report, fs_summary: summarizeFs(ctx) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "검증 실패" },
      { status: 500 },
    );
  }
}

function summarizeFs(ctx: Awaited<ReturnType<typeof readPackageXlsx>>) {
  return ctx.fs.map((s) => ({
    fs_div: s.fs_div,
    sj_div: s.sj_div,
    sheetName: s.sheetName,
    rowCount: s.rows.length,
  }));
}

export const maxDuration = 60;
