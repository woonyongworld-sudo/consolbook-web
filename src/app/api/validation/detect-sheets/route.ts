import { NextResponse } from "next/server";
import { detectSheetsFromXlsx } from "@/modules/validation";
import { DEFAULT_DICTIONARY } from "@/modules/standards";

// 외부 .xlsx의 시트 목록을 분석하고 표준 유형을 자동 추론.
// 클라이언트가 그 다음에 사용자 매핑을 받아 /api/validation/check로 검증 진행.
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
    // 서버는 디폴트 사전으로 추론. 클라이언트가 커스텀 사전이 있으면
    // 추후 수정 가능하므로 부정확해도 OK.
    const sheets = await detectSheetsFromXlsx(buf, DEFAULT_DICTIONARY);
    return NextResponse.json({ sheets });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "시트 감지 실패" },
      { status: 500 },
    );
  }
}

export const maxDuration = 30;
