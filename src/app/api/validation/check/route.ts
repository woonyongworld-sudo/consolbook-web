import { NextResponse } from "next/server";
import {
  COLUMN_MAPPING,
  RULES,
  SJ_PATTERNS,
  readPackageXlsx,
  runValidation,
  type SheetMappingInput,
} from "@/modules/validation";
import {
  DEFAULT_DICTIONARY,
  type StandardDictionary,
} from "@/modules/standards";

// 두 가지 입력 방식 지원:
//  1. JSON body { fileBase64, mappings? } — 사용자 시트 매핑이 있을 때
//  2. raw .xlsx body — 호환성 유지 (DART 임포터 표준 양식 그대로)
export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  let buf: ArrayBuffer;
  let mappings: SheetMappingInput[] | undefined;
  let dict: StandardDictionary = DEFAULT_DICTIONARY;

  try {
    if (contentType.includes("application/json")) {
      const body = (await req.json()) as {
        fileBase64?: string;
        mappings?: SheetMappingInput[];
        dict?: StandardDictionary;
      };
      if (!body.fileBase64) {
        return NextResponse.json(
          { error: "fileBase64가 필요합니다." },
          { status: 400 },
        );
      }
      buf = base64ToArrayBuffer(body.fileBase64);
      mappings = body.mappings;
      if (body.dict) dict = body.dict;
    } else {
      buf = await req.arrayBuffer();
    }
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
    const ctx = await readPackageXlsx(buf, mappings);
    ctx.dict = dict;
    if (ctx.fs.length === 0) {
      return NextResponse.json(
        {
          error: mappings
            ? "사용자 매핑된 시트에서 재무제표 데이터를 추출하지 못했습니다."
            : "재무제표 시트를 찾을 수 없습니다. 시트 매핑을 진행하거나 DART 임포터로 만든 .xlsx인지 확인하세요.",
          extraction_meta: extractionMeta(),
        },
        { status: 422 },
      );
    }
    const report = runValidation(ctx, RULES);
    return NextResponse.json({
      report,
      extraction_meta: extractionMeta(),
      fs_summary: summarizeFs(ctx),
      mapping_used: mappings ?? null,
    });
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
    preview: s.rows.slice(0, 8).map((r) => ({
      rowIndex: r.rowIndex,
      account_id: r.account_id,
      account_nm: r.account_nm,
      thstrm_amount: r.thstrm_amount ?? null,
      frmtrm_amount: r.frmtrm_amount ?? null,
    })),
  }));
}

function extractionMeta() {
  return {
    expectedSheets: SJ_PATTERNS.map((p) => ({
      fs_div: p.fs_div,
      sj_div: p.sj_div,
      expectedName: p.expectedName,
    })),
    columnMapping: COLUMN_MAPPING,
  };
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = Buffer.from(b64, "base64");
  const ab = new ArrayBuffer(bin.byteLength);
  const view = new Uint8Array(ab);
  for (let i = 0; i < bin.byteLength; i++) view[i] = bin[i];
  return ab;
}

export const maxDuration = 60;
