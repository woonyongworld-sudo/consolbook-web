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
