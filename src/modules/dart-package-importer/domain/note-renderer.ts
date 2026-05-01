import type ExcelJS from "exceljs";

// DART 사업보고서 본문(HTML-like XML)을 Excel 시트로 렌더링.
// <P>는 한 행의 텍스트, <TABLE>은 셀 그리드(ROWSPAN/COLSPAN 포함)로 매핑.

type Block =
  | { kind: "p"; text: string }
  | { kind: "table"; rows: ParsedRow[] };

type ParsedCell = {
  text: string;
  colSpan: number;
  rowSpan: number;
  isHeader: boolean;
};
type ParsedRow = ParsedCell[];

export function renderNoteHtmlToSheet(
  ws: ExcelJS.Worksheet,
  noteTitle: string,
  html: string,
  startRow: number,
): { lastRow: number; maxCol: number } {
  const blocks = parseHtmlBlocks(html);
  let row = startRow;
  let maxCol = 1;

  for (const block of blocks) {
    if (block.kind === "p") {
      const cell = ws.getCell(row, 1);
      cell.value = block.text;
      cell.alignment = { wrapText: true, vertical: "top" };
      row++;
    } else {
      const result = renderTable(ws, block.rows, row);
      row = result.afterRow;
      if (result.maxCol > maxCol) maxCol = result.maxCol;
      row++; // 표 뒤에 빈 행 한 줄
    }
  }
  return { lastRow: row, maxCol };
}

function renderTable(
  ws: ExcelJS.Worksheet,
  rows: ParsedRow[],
  startRow: number,
): { afterRow: number; maxCol: number } {
  const occupied: boolean[][] = [];
  const ensure = (r: number) => {
    if (!occupied[r]) occupied[r] = [];
    return occupied[r];
  };

  let maxCol = 1;
  for (let r = 0; r < rows.length; r++) {
    const sourceRow = rows[r];
    let c = 0;
    for (const cell of sourceRow) {
      // 이전 행의 ROWSPAN으로 점유된 칸 건너뛰기
      while (ensure(r)[c]) c++;

      const wsRow = startRow + r;
      const wsCol = c + 1;
      const xCell = ws.getCell(wsRow, wsCol);
      xCell.value = cell.text || "";
      xCell.alignment = { wrapText: true, vertical: "top" };
      xCell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };
      if (cell.isHeader) {
        xCell.font = { bold: true };
        xCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE2E8F0" },
        };
      }

      const span = Math.max(1, cell.colSpan);
      const rspan = Math.max(1, cell.rowSpan);
      if (span > 1 || rspan > 1) {
        ws.mergeCells(wsRow, wsCol, wsRow + rspan - 1, wsCol + span - 1);
      }

      // 점유 마킹
      for (let dr = 0; dr < rspan; dr++) {
        const target = ensure(r + dr);
        for (let dc = 0; dc < span; dc++) {
          target[c + dc] = true;
        }
      }

      c += span;
      if (c > maxCol) maxCol = c;
    }
  }
  return { afterRow: startRow + rows.length - 1, maxCol };
}

function parseHtmlBlocks(html: string): Block[] {
  const blocks: Block[] = [];
  // <P>...</P> 또는 <TABLE>...</TABLE>를 등장 순서대로 추출
  const re = /<(P|TABLE)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const tag = m[1].toUpperCase();
    if (tag === "P") {
      const text = stripInlineTagsAndUnescape(m[2]).trim();
      if (text) blocks.push({ kind: "p", text });
    } else {
      const tableHtml = m[0];
      const rows = parseTable(tableHtml);
      if (rows.length > 0) blocks.push({ kind: "table", rows });
    }
  }
  return blocks;
}

function parseTable(tableHtml: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const trRe = /<TR\b[^>]*>([\s\S]*?)<\/TR>/gi;
  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRe.exec(tableHtml)) !== null) {
    const trInner = trMatch[1];
    const cells: ParsedCell[] = [];
    const cellRe = /<(TH|TD)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
    let cm: RegExpExecArray | null;
    while ((cm = cellRe.exec(trInner)) !== null) {
      const isHeader = cm[1].toUpperCase() === "TH";
      const attrs = cm[2];
      const inner = cm[3];
      const colSpan = parseSpan(attrs, "COLSPAN");
      const rowSpan = parseSpan(attrs, "ROWSPAN");
      const text = stripInlineTagsAndUnescape(inner).trim();
      cells.push({ text, colSpan, rowSpan, isHeader });
    }
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

function parseSpan(attrs: string, name: string): number {
  const re = new RegExp(`\\b${name}\\s*=\\s*"?(\\d+)`, "i");
  const m = attrs.match(re);
  if (!m) return 1;
  const n = parseInt(m[1], 10);
  if (Number.isNaN(n) || n < 1) return 1;
  return Math.min(n, 100); // 안전상 상한
}

function stripInlineTagsAndUnescape(s: string): string {
  return s
    .replace(/<BR\s*\/?>|<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/[ 　]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}
