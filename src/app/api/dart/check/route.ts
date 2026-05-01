import { NextResponse } from "next/server";
import {
  checkAvailability,
  getCorpByCode,
  type ReprtCode,
} from "@/modules/dart-package-importer";

const VALID_REPRTS: ReprtCode[] = ["11011", "11012", "11013", "11014"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const corp_code = searchParams.get("corp_code") ?? "";
  const bsns_year = searchParams.get("bsns_year") ?? "";
  const reprt_code = (searchParams.get("reprt_code") ?? "11011") as ReprtCode;

  if (!corp_code || !/^\d{8}$/.test(corp_code)) {
    return NextResponse.json(
      { error: "corp_code (8자리 숫자)가 필요합니다." },
      { status: 400 },
    );
  }
  if (!bsns_year || !/^\d{4}$/.test(bsns_year)) {
    return NextResponse.json(
      { error: "bsns_year (4자리 연도)가 필요합니다." },
      { status: 400 },
    );
  }
  if (!VALID_REPRTS.includes(reprt_code)) {
    return NextResponse.json(
      { error: "reprt_code가 유효하지 않습니다." },
      { status: 400 },
    );
  }

  const corp = await getCorpByCode(corp_code);
  if (!corp) {
    return NextResponse.json(
      { error: "해당 corp_code의 회사를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  try {
    const result = await checkAvailability({
      corp_code,
      corp_name: corp.corp_name,
      bsns_year,
      reprt_code,
    });
    return NextResponse.json({ corp, availability: result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "DART API 오류" },
      { status: 500 },
    );
  }
}
