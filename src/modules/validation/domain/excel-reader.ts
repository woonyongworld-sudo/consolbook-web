import ExcelJS from "exceljs";
import type { NormalizedRow, ValidationContext } from "./types";

// dart-package-importer가 만든 .xlsx를 읽어 ValidationContext로 변환.
// 시트명 규약:
//   별도_재무상태표 / 연결_재무상태표 / 별도_손익계산서 / ... / 별도_자본변동표 ...
// 그 외 시트(요약, 주석_*)는 무시.

const SJ_PATTERNS: Array<{
  fs_div: "OFS" | "CFS";
  sj_div: "BS" | "IS" | "CIS" | "CF" | "SCE";
  match: (name: string) => boolean;
}> = [
  { fs_div: "OFS", sj_div: "BS", match: (n) => n === "별도_재무상태표" },
  { fs_div: "CFS", sj_div: "BS", match: (n) => n === "연결_재무상태표" },
  { fs_div: "OFS", sj_div: "IS", match: (n) => n === "별도_손익계산서" },
  { fs_div: "CFS", sj_div: "IS", match: (n) => n === "연결_손익계산서" },
  {
    fs_div: "OFS",
    sj_div: "CIS",
    match: (n) => n === "별도_포괄손익계산서",
  },
  {
    fs_div: "CFS",
    sj_div: "CIS",
    match: (n) => n === "연결_포괄손익계산서",
  },
  { fs_div: "OFS", sj_div: "CF", match: (n) => n === "별도_현금흐름표" },
  { fs_div: "CFS", sj_div: "CF", match: (n) => n === "연결_현금흐름표" },
  { fs_div: "OFS", sj_div: "SCE", match: (n) => n === "별도_자본변동표" },
  { fs_div: "CFS", sj_div: "SCE", match: (n) => n === "연결_자본변동표" },
];

export async function readPackageXlsx(
  buf: ArrayBuffer,
): Promise<ValidationContext> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  const fs: ValidationContext["fs"] = [];
  const meta = readSummary(wb);

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
