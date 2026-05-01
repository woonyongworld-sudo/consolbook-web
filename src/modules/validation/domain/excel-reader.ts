import ExcelJS from "exceljs";
import type { NormalizedRow, ValidationContext } from "./types";

// dart-package-importer가 만든 .xlsx를 읽어 ValidationContext로 변환.
// 시트명 규약:
//   별도_재무상태표 / 연결_재무상태표 / 별도_손익계산서 / ... / 별도_자본변동표 ...
// 그 외 시트(요약, 주석_*)는 무시.

// 시트명 규약 — 사용자가 검증 페이지에서 직접 볼 수 있도록 export.
export const SJ_PATTERNS: Array<{
  fs_div: "OFS" | "CFS";
  sj_div: "BS" | "IS" | "CIS" | "CF" | "SCE";
  expectedName: string;
  match: (name: string) => boolean;
}> = [
  {
    fs_div: "OFS",
    sj_div: "BS",
    expectedName: "별도_재무상태표",
    match: (n) => n === "별도_재무상태표",
  },
  {
    fs_div: "CFS",
    sj_div: "BS",
    expectedName: "연결_재무상태표",
    match: (n) => n === "연결_재무상태표",
  },
  {
    fs_div: "OFS",
    sj_div: "IS",
    expectedName: "별도_손익계산서",
    match: (n) => n === "별도_손익계산서",
  },
  {
    fs_div: "CFS",
    sj_div: "IS",
    expectedName: "연결_손익계산서",
    match: (n) => n === "연결_손익계산서",
  },
  {
    fs_div: "OFS",
    sj_div: "CIS",
    expectedName: "별도_포괄손익계산서",
    match: (n) => n === "별도_포괄손익계산서",
  },
  {
    fs_div: "CFS",
    sj_div: "CIS",
    expectedName: "연결_포괄손익계산서",
    match: (n) => n === "연결_포괄손익계산서",
  },
  {
    fs_div: "OFS",
    sj_div: "CF",
    expectedName: "별도_현금흐름표",
    match: (n) => n === "별도_현금흐름표",
  },
  {
    fs_div: "CFS",
    sj_div: "CF",
    expectedName: "연결_현금흐름표",
    match: (n) => n === "연결_현금흐름표",
  },
  {
    fs_div: "OFS",
    sj_div: "SCE",
    expectedName: "별도_자본변동표",
    match: (n) => n === "별도_자본변동표",
  },
  {
    fs_div: "CFS",
    sj_div: "SCE",
    expectedName: "연결_자본변동표",
    match: (n) => n === "연결_자본변동표",
  },
];

// 컬럼 매핑 정의 — 검증 페이지의 "데이터 추출 단계"에서 사용자에게 노출.
export const COLUMN_MAPPING = [
  { col: 1, field: "account_id", label: "표준계정과목코드", required: true },
  { col: 2, field: "account_nm", label: "계정과목명", required: true },
  { col: 3, field: "thstrm_amount", label: "당기금액", required: true },
  { col: 4, field: "frmtrm_amount", label: "전기금액", required: false },
  { col: 5, field: "bfefrmtrm_amount", label: "전전기금액", required: false },
  { col: 6, field: "currency", label: "통화", required: false },
] as const;

// 사용자 시트 매핑 — 외부 시트명을 표준 시트 유형(BS/IS/...)에 연결.
// 추가로 별도/연결 구분(fs_div)도 명시. 둘 다 사용자가 매핑 단계에서 결정.
export type SheetMappingInput = {
  externalSheetName: string;
  standardType: "BS" | "IS" | "CIS" | "CF" | "SCE" | "NOTE";
  fs_div: "OFS" | "CFS";
};

export async function readPackageXlsx(
  buf: ArrayBuffer,
  mappings?: SheetMappingInput[],
): Promise<ValidationContext> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  const fs: ValidationContext["fs"] = [];
  const meta = readSummary(wb);

  if (mappings && mappings.length > 0) {
    // 사용자 매핑 사용
    for (const m of mappings) {
      // FS 4종만 정규 검증 대상 (NOTE는 향후)
      if (m.standardType === "NOTE") continue;
      const ws = wb.getWorksheet(m.externalSheetName);
      if (!ws) continue;
      const rows = readFsSheet(ws);
      fs.push({
        fs_div: m.fs_div,
        sj_div: m.standardType,
        sheetName: m.externalSheetName,
        rows,
      });
    }
  } else {
    // 기본 동작: 시트명 정확 매칭 (DART 임포터 호환)
    for (const ws of wb.worksheets) {
      const matched = SJ_PATTERNS.find((p) => p.match(ws.name));
      if (!matched) continue;
      const rows = readFsSheet(ws);
      fs.push({
        fs_div: matched.fs_div,
        sj_div: matched.sj_div,
        sheetName: ws.name,
        rows,
      });
    }
  }

  return { fs, meta };
}

function readSummary(wb: ExcelJS.Workbook): ValidationContext["meta"] {
  const ws = wb.getWorksheet("요약");
  if (!ws) return {};
  const meta: ValidationContext["meta"] = {};
  ws.eachRow((row) => {
    const k = String(row.getCell(1).value ?? "").trim();
    const v = String(row.getCell(2).value ?? "").trim();
    if (k === "회사명") meta.corp_name = v;
    else if (k === "사업연도") meta.bsns_year = v;
    else if (k === "보고서 종류") meta.reprt_code = v;
  });
  return meta;
}

function readFsSheet(ws: ExcelJS.Worksheet): NormalizedRow[] {
  // 컬럼 순서: 표준계정과목코드 | 계정과목명 | 당기금액 | 전기금액 | 전전기금액 | 통화
  const out: NormalizedRow[] = [];
  ws.eachRow((row, rowIndex) => {
    if (rowIndex === 1) return; // header
    const account_id = String(row.getCell(1).value ?? "").trim();
    const account_nm = String(row.getCell(2).value ?? "").trim();
    if (!account_nm) return;
    out.push({
      account_id,
      account_nm,
      thstrm_amount: cellToNumber(row.getCell(3).value),
      frmtrm_amount: cellToNumber(row.getCell(4).value),
      bfefrmtrm_amount: cellToNumber(row.getCell(5).value),
      rowIndex,
    });
  });
  return out;
}

function cellToNumber(v: unknown): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/,/g, "").trim();
    if (cleaned === "" || cleaned === "-") return undefined;
    const n = Number(cleaned);
    if (Number.isNaN(n)) return undefined;
    return n;
  }
  // ExcelJS Result/Formula objects
  if (typeof v === "object" && v !== null) {
    const obj = v as { result?: unknown; value?: unknown };
    if (typeof obj.result === "number") return obj.result;
    if (typeof obj.value === "number") return obj.value;
  }
  return undefined;
}
