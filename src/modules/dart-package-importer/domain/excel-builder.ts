import ExcelJS from "exceljs";
import type {
  DartFsRow,
  FsDiv,
  NoteSection,
  ReprtCode,
  SjDiv,
} from "./types";
import { FS_DIV_LABELS, REPRT_CODE_LABELS, SJ_DIV_LABELS } from "./types";

export type PackageMeta = {
  corp_name: string;
  corp_code: string;
  stock_code?: string;
  bsns_year: string;
  reprt_code: ReprtCode;
  hasOFS: boolean;
  hasCFS: boolean;
  hasNotes: boolean;
  generated_at: string; // ISO
};

export type PackageContents = {
  meta: PackageMeta;
  ofsRows: DartFsRow[];
  cfsRows: DartFsRow[];
  notes: NoteSection[];
};

export async function buildPackageWorkbook(
  pkg: PackageContents,
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ConsolBook · DART Package Importer";
  wb.created = new Date();

  addSummarySheet(wb, pkg.meta);

  if (pkg.meta.hasOFS) {
    addFsSheets(wb, pkg.ofsRows, "OFS");
  }
  if (pkg.meta.hasCFS) {
    addFsSheets(wb, pkg.cfsRows, "CFS");
  }

  addNoteSheets(wb, pkg.notes, pkg.meta.hasNotes);

  const buf = await wb.xlsx.writeBuffer();
  return buf as ArrayBuffer;
}

function addSummarySheet(wb: ExcelJS.Workbook, meta: PackageMeta) {
  const ws = wb.addWorksheet("요약");
  ws.columns = [
    { header: "항목", key: "label", width: 22 },
    { header: "값", key: "value", width: 60 },
  ];
  styleHeader(ws.getRow(1));

  const rows: [string, string][] = [
    ["회사명", meta.corp_name],
    ["고유번호 (corp_code)", meta.corp_code],
    ["종목코드 (stock_code)", meta.stock_code || "(비상장)"],
    ["사업연도", meta.bsns_year],
    ["보고서 종류", REPRT_CODE_LABELS[meta.reprt_code]],
    ["별도 재무제표 포함", meta.hasOFS ? "Y" : "N"],
    ["연결 재무제표 포함", meta.hasCFS ? "Y" : "N"],
    ["주석 자동 추출 시도", meta.hasNotes ? "Y" : "N"],
    ["생성일시", meta.generated_at],
    ["출처", "DART OpenAPI · https://opendart.fss.or.kr"],
  ];
  for (const [k, v] of rows) {
    ws.addRow({ label: k, value: v });
  }
}

function addFsSheets(
  wb: ExcelJS.Workbook,
  rows: DartFsRow[],
  fs_div: FsDiv,
) {
  const grouped = groupBySjDiv(rows);
  const fsLabel = fs_div === "OFS" ? "별도" : "연결";

  for (const sj of ["BS", "IS", "CIS", "CF", "SCE"] as SjDiv[]) {
    const items = grouped.get(sj);
    if (!items || items.length === 0) continue;
    const sheetName = sanitizeSheetName(`${fsLabel}_${SJ_DIV_LABELS[sj]}`);
    const ws = wb.addWorksheet(sheetName);
    ws.columns = [
      { header: "표준계정과목코드", key: "account_id", width: 28 },
      { header: "계정과목명", key: "account_nm", width: 30 },
      { header: "당기금액", key: "thstrm_amount", width: 20 },
      { header: "전기금액", key: "frmtrm_amount", width: 20 },
      { header: "전전기금액", key: "bfefrmtrm_amount", width: 20 },
      { header: "통화", key: "currency", width: 10 },
    ];
    styleHeader(ws.getRow(1));

    for (const r of items) {
      ws.addRow({
        account_id: r.account_id ?? "",
        account_nm: r.account_nm,
        thstrm_amount: parseAmount(r.thstrm_amount),
        frmtrm_amount: parseAmount(r.frmtrm_amount),
        bfefrmtrm_amount: parseAmount(r.bfefrmtrm_amount),
        currency: r.currency,
      });
    }
    formatNumberColumns(ws, ["thstrm_amount", "frmtrm_amount", "bfefrmtrm_amount"]);
  }
}

function addNoteSheets(
  wb: ExcelJS.Workbook,
  notes: NoteSection[],
  hasNotes: boolean,
) {
  if (!hasNotes || notes.length === 0) {
    const ws = wb.addWorksheet("주석");
    ws.columns = [{ header: "안내", key: "msg", width: 80 }];
    styleHeader(ws.getRow(1));
    ws.addRow({
      msg: hasNotes
        ? "사업보고서 본문에서 주석 섹션을 인식하지 못했습니다."
        : "이 회사는 사업보고서 본문 데이터가 없어 주석 자동 추출이 불가능합니다.",
    });
    return;
  }

  // 주석 인덱스 시트
  const idx = wb.addWorksheet("주석_목차");
  idx.columns = [
    { header: "번호", key: "no", width: 6 },
    { header: "시트명", key: "sheet", width: 36 },
    { header: "주석 제목", key: "title", width: 60 },
  ];
  styleHeader(idx.getRow(1));

  const used = new Set<string>();
  notes.forEach((note, i) => {
    const baseName = sanitizeSheetName(`주석_${i + 1}_${note.title}`);
    const sheetName = ensureUnique(baseName, used);
    used.add(sheetName);

    idx.addRow({ no: i + 1, sheet: sheetName, title: note.title });

    const ws = wb.addWorksheet(sheetName);
    ws.columns = [{ header: note.title, key: "content", width: 100 }];
    styleHeader(ws.getRow(1));
    const lines = note.plain_text.split(/\n/);
    for (const line of lines) {
      ws.addRow({ content: line });
    }
    ws.getColumn("content").alignment = { wrapText: true, vertical: "top" };
  });
}

function groupBySjDiv(rows: DartFsRow[]): Map<SjDiv, DartFsRow[]> {
  const m = new Map<SjDiv, DartFsRow[]>();
  for (const r of rows) {
    if (!m.has(r.sj_div)) m.set(r.sj_div, []);
    m.get(r.sj_div)!.push(r);
  }
  for (const list of m.values()) {
    list.sort((a, b) => Number(a.ord || 0) - Number(b.ord || 0));
  }
  return m;
}

function parseAmount(s?: string): number | string {
  if (!s) return "";
  const cleaned = s.replace(/,/g, "").trim();
  if (cleaned === "" || cleaned === "-") return "";
  const n = Number(cleaned);
  if (Number.isNaN(n)) return s;
  return n;
}

function formatNumberColumns(ws: ExcelJS.Worksheet, keys: string[]) {
  for (const key of keys) {
    const col = ws.getColumn(key);
    col.numFmt = "#,##0;[Red]-#,##0";
    col.alignment = { horizontal: "right" };
  }
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };
  row.alignment = { vertical: "middle" };
}

function sanitizeSheetName(name: string): string {
  // Excel 시트명: 31자 제한 + : \ / ? * [ ] 금지
  const cleaned = name.replace(/[:\\/?*\[\]]/g, "_").slice(0, 31);
  return cleaned || "Sheet";
}

function ensureUnique(base: string, used: Set<string>): string {
  if (!used.has(base)) return base;
  let i = 2;
  while (true) {
    const candidate = `${base.slice(0, 28)}_${i}`;
    if (!used.has(candidate)) return candidate;
    i++;
  }
}
