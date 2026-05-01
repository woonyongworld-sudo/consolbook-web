import { NextResponse } from "next/server";
import {
  buildPackage,
  checkAvailability,
  getCorpByCode,
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
  const b = (body ?? {}) as Record<string, unknown>;
  const corp_code = String(b.corp_code ?? "");
  const bsns_year = String(b.bsns_year ?? "");
  const reprt_code = String(b.reprt_code ?? "11011") as ReprtCode;
  const include_ofs = b.include_ofs !== false;
  const include_cfs = b.include_cfs !== false;
  const include_notes = b.include_notes !== false;

  if (!/^\d{8}$/.test(corp_code) || !/^\d{4}$/.test(bsns_year) ||
      !VALID_REPRTS.includes(reprt_code)) {
    return NextResponse.json(
      { error: "필수 파라미터가 잘못되었습니다." },
      { status: 400 },
    );
  }

  const corp = await getCorpByCode(corp_code);
  if (!corp) {
    return NextResponse.json(
      { error: "회사를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  try {
    const availability = await checkAvailability({
      corp_code,
      corp_name: corp.corp_name,
      bsns_year,
      reprt_code,
    });

    if (!availability.hasOFS && !availability.hasCFS) {
      return NextResponse.json(
        {
          error:
            "이 회사는 해당 연도의 사업보고서 데이터가 DART에 없어 패키지를 만들 수 없습니다.",
        },
        { status: 422 },
      );
    }

    const xlsx = await buildPackage(
      {
        corp_code,
        bsns_year,
        reprt_code,
        include_ofs,
        include_cfs,
        include_notes,
      },
      corp,
      availability,
    );

    const filename = `consolbook_${corp.corp_name}_${bsns_year}_${reprt_code}.xlsx`;
    return new NextResponse(xlsx, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
          filename,
        )}`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "패키지 생성 중 오류" },
      { status: 500 },
    );
  }
}

// XBRL 다운로드/파싱이 무거울 수 있어 함수 타임아웃을 명시.
// Vercel Hobby: 10s, Pro: 60s. 값은 Vercel 한도 안에서 자동 적용됨.
export const maxDuration = 60;
