import ExcelJS from "exceljs";
import type { StandardDictionary, StandardSheetSpec } from "@/modules/standards";

// 외부 .xlsx 파일의 시트 목록을 분석하고 표준 유형을 자동 추론.
// 사용자는 그 다음 단계에서 추론을 확인·수정.

export type DetectedSheet = {
  name: string;
  rowCount: number;
  colCount: number;
  // 자동 추론 결과 (사용자가 수정 가능)
  suggestedStandardType: string | null;
  suggestionScore: number; // 0~1
  // 시트 첫 몇 행의 raw 미리보기 (표준 유형이 정해지면 헤더 매핑에 사용)
  preview: string[][];
};

export async function detectSheetsFromXlsx(
  buf: ArrayBuffer,
  dict: StandardDictionary,
  previewRows = 8,
): Promise<DetectedSheet[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  const detected: DetectedSheet[] = [];
  for (const ws of wb.worksheets) {
    const preview: string[][] = [];
    for (let r = 1; r <= Math.min(previewRows, ws.rowCount); r++) {
      const row = ws.getRow(r);
      const cells: string[] = [];
      for (let c = 1; c <= Math.min(ws.columnCount, 12); c++) {
        const v = row.getCell(c).value;
        cells.push(cellToText(v));
      }
      preview.push(cells);
    }

    const suggestion = suggestStandardType(ws.name, preview, dict);

    detected.push({
      name: ws.name,
      rowCount: ws.rowCount,
      colCount: ws.columnCount,
      suggestedStandardType: suggestion.type,
      suggestionScore: suggestion.score,
      preview,
    });
  }
  return detected;
}

function cellToText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const obj = v as { result?: unknown; richText?: Array<{ text: string }>; text?: string };
    if (typeof obj.result === "string" || typeof obj.result === "number") {
      return String(obj.result);
    }
    if (Array.isArray(obj.richText)) {
      return obj.richText.map((rt) => rt.text || "").join("");
    }
    if (typeof obj.text === "string") return obj.text;
  }
  return "";
}

// 시트명·미리보기 텍스트와 표준 사전을 비교해 가장 그럴듯한 유형을 추론.
function suggestStandardType(
  sheetName: string,
  preview: string[][],
  dict: StandardDictionary,
): { type: string | null; score: number } {
  const candidates: Array<{ type: string; score: number }> = [];

  const normName = normalize(sheetName);
  const previewText = preview.flat().map(normalize).join(" ");

  for (const spec of dict.sheets) {
    const labelNorm = normalize(spec.label);
    const typeNorm = normalize(spec.type);

    let score = 0;
    if (normName.includes(labelNorm) || labelNorm.includes(normName)) score += 0.7;
    else if (normName.includes(typeNorm) || typeNorm.includes(normName)) score += 0.6;
    // 시트 유형 별칭 (간단 휴리스틱)
    score += aliasMatch(normName, spec) * 0.5;
    // 미리보기에 라벨이 들어있으면 약한 신호
    if (previewText.includes(labelNorm)) score += 0.15;

    if (score > 0) candidates.push({ type: spec.type, score });
  }

  candidates.sort((a, b) => b.score - a.score);
  if (candidates.length === 0 || candidates[0].score < 0.3) {
    return { type: null, score: 0 };
  }
  return candidates[0];
}

function aliasMatch(normName: string, spec: StandardSheetSpec): number {
  const aliases: Record<string, string[]> = {
    BS: ["bs", "재무상태표", "balancesheet", "balance"],
    IS: ["is", "손익계산서", "incomestatement", "pl", "profitandloss"],
    CIS: ["cis", "포괄손익계산서", "comprehensiveincome"],
    CF: ["cf", "현금흐름표", "cashflow"],
    SCE: ["sce", "자본변동표", "equitychange", "changesinequity"],
    NOTE: ["note", "주석", "footnote"],
  };
  const list = aliases[spec.type];
  if (!list) return 0;
  for (const a of list) {
    if (normName.includes(normalize(a))) return 1;
  }
  return 0;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s\-_·.]+/g, "");
}

// v2: 외부 시트의 헤더 행에 있는 컬럼 이름들과 표준 사전의 헤더를 매칭.
// 정확 매칭 → 부분 포함 → 동의어 사전 → 라벨 유사도.
export type HeaderMatchInput = {
  externalHeaders: string[]; // 외부 헤더 행에서 읽은 컬럼명 (1-based, [0]은 비워두거나 1열)
  standardHeaders: Array<{ key: string; label: string }>;
};

export type HeaderMatchResult = {
  // 표준 키별로 외부 컬럼 인덱스(1-based) 추론. 매칭 못 찾으면 null.
  matches: Record<string, number | null>;
  // 자동 매칭 신뢰도(0~1) per standardKey
  scores: Record<string, number>;
};

const HEADER_SYNONYMS: Record<string, string[]> = {
  account_id: ["계정코드", "계정번호", "코드", "계정과목코드", "표준계정과목코드", "id"],
  account_nm: ["계정과목", "계정명", "과목명", "계정과목명", "name"],
  amount: ["금액", "당기금액", "금액(원)", "잔액", "당기"],
  thstrm_amount: ["당기금액", "당기", "금액"],
  frmtrm_amount: ["전기금액", "전기", "전기말"],
  bfefrmtrm_amount: ["전전기금액", "전전기", "전전기말"],
  dr_cr: ["차대구분", "차대", "차/대구분", "차변/대변"],
  activity: ["활동구분", "활동", "구분"],
  equity_component: ["자본구성요소", "자본항목", "구성요소"],
  period: ["기간", "시점", "구간"],
  memo: ["메모", "비고", "remarks", "note"],
  note_no: ["주석번호", "주석no", "no"],
  note_title: ["주석제목", "제목"],
  note_body: ["주석본문", "본문", "내용"],
};

export function matchHeaders(input: HeaderMatchInput): HeaderMatchResult {
  const matches: Record<string, number | null> = {};
  const scores: Record<string, number> = {};

  // 외부 헤더 인덱스를 1-based로 매핑
  const ext = input.externalHeaders.map((h, i) => ({
    col: i + 1,
    raw: h,
    norm: normalize(h),
  }));

  for (const sh of input.standardHeaders) {
    const labelNorm = normalize(sh.label);
    const keyNorm = normalize(sh.key);
    const synonyms = (HEADER_SYNONYMS[sh.key] ?? []).map(normalize);

    let bestCol: number | null = null;
    let bestScore = 0;
    for (const e of ext) {
      if (!e.norm) continue;
      let s = 0;
      if (e.norm === labelNorm) s = 1;
      else if (e.norm.includes(labelNorm) || labelNorm.includes(e.norm))
        s = 0.85;
      else if (e.norm === keyNorm) s = 0.8;
      else if (synonyms.some((sn) => e.norm.includes(sn) || sn.includes(e.norm)))
        s = 0.7;
      if (s > bestScore) {
        bestScore = s;
        bestCol = e.col;
      }
    }
    matches[sh.key] = bestScore >= 0.5 ? bestCol : null;
    scores[sh.key] = bestScore;
  }
  return { matches, scores };
}

// 외부 시트의 raw preview에서 특정 행을 헤더로 인식해 컬럼명 배열 반환.
// preview는 0-based 배열, headerRow는 1-based.
export function extractHeaderRow(
  preview: string[][],
  headerRow: number,
): string[] {
  const idx = headerRow - 1;
  if (idx < 0 || idx >= preview.length) return [];
  return preview[idx].map((c) => (c ?? "").toString().trim());
}
