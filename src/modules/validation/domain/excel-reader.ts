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
// v2: 헤더 행 + 컬럼 매핑(외부 컬럼 ↔ 표준 헤더 키) 포함.
export type SheetMappingInput = {
  externalSheetName: string;
  standardType: "BS" | "IS" | "CIS" | "CF" | "SCE" | "NOTE";
  fs_div: "OFS" | "CFS";
  // v2: 헤더 행 + 컬럼 매핑 (생략 가능 — 디폴트 = 1행 헤더, 표준 6컬럼 순서)
  headerRow?: number; // 1-based
  columnMappings?: ColumnMappingInput[];
};

export type ColumnMappingInput = {
  standardKey: string; // "account_id" 등
  externalCol: number | null; // 1-based, null = 매핑 안 함
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
      if (m.standardType === "NOTE") continue;
      const ws = wb.getWorksheet(m.externalSheetName);
      if (!ws) continue;
      const rows =
        m.columnMappings && m.columnMappings.length > 0
          ? readFsSheetWithMapping(ws, m.headerRow ?? 1, m.columnMappings)
          : readFsSheet(ws);
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

// v2: 사용자 컬럼 매핑 + 헤더 행 기반으로 시트 읽기.
// 매핑이 없는 표준 키는 빈 값. 매핑된 키는 외부 컬럼에서 읽음.
function readFsSheetWithMapping(
  ws: ExcelJS.Worksheet,
  headerRow: number,
  mappings: ColumnMappingInput[],
): NormalizedRow[] {
  const out: NormalizedRow[] = [];
  // 매핑을 standardKey 키로 빠르게 조회
  const map: Record<string, number | null> = {};
  for (const m of mappings) map[m.standardKey] = m.externalCol;

  ws.eachRow((row, rowIndex) => {
    if (rowIndex <= headerRow) return; // 헤더 + 그 이전 행은 건너뜀
    const values: Record<string, string | number | null> = {};
    let hasContent = false;

    for (const [key, col] of Object.entries(map)) {
      if (col == null) {
        values[key] = null;
        continue;
      }
      const raw = row.getCell(col).value;
      // 숫자형 키는 number 시도, 그 외는 text
      const isNumericKey = NUMERIC_KEYS.has(key);
      if (isNumericKey) {
        const n = cellToNumber(raw);
        values[key] = n ?? null;
        if (n != null) hasContent = true;
      } else {
        const t = cellToText(raw);
        values[key] = t || null;
        if (t) hasContent = true;
      }
    }

    if (!hasContent) return;

    out.push({
      account_id: String(values.account_id ?? ""),
      account_nm: String(values.account_nm ?? ""),
      thstrm_amount:
        typeof values.thstrm_amount === "number"
          ? values.thstrm_amount
          : undefined,
      frmtrm_amount:
        typeof values.frmtrm_amount === "number"
          ? values.frmtrm_amount
          : undefined,
      bfefrmtrm_amount:
        typeof values.bfefrmtrm_amount === "number"
          ? values.bfefrmtrm_amount
          : undefined,
      rowIndex,
      values,
    });
  });
  return out;
}

const NUMERIC_KEYS = new Set([
  "amount",
  "thstrm_amount",
  "frmtrm_amount",
  "bfefrmtrm_amount",
]);

function cellToText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const obj = v as {
      result?: unknown;
      richText?: Array<{ text: string }>;
      text?: string;
    };
    if (typeof obj.result === "string") return obj.result.trim();
    if (typeof obj.result === "number") return String(obj.result);
    if (Array.isArray(obj.richText)) {
      return obj.richText
        .map((rt) => rt.text || "")
        .join("")
        .trim();
    }
    if (typeof obj.text === "string") return obj.text.trim();
  }
  return "";
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
