import type {
  AccountRow,
  ConsolidatedRow,
  FileTypeKey,
  UploadedFile,
} from "@/modules/types";
import { FILE_TYPES } from "@/modules/types";

type AmountByType = Record<FileTypeKey, number>;

const zeroAmounts = (): AmountByType => ({
  A1: 0,
  A2: 0,
  A3: 0,
  B1: 0,
  B2: 0,
});

export function consolidate(files: UploadedFile[]): ConsolidatedRow[] {
  const byType: Record<FileTypeKey, AccountRow[]> = {
    A1: [],
    A2: [],
    A3: [],
    B1: [],
    B2: [],
  };

  for (const file of files) {
    byType[file.type].push(...file.rows);
  }

  const codeMap = new Map<
    string,
    { name: string; amounts: AmountByType }
  >();

  for (const type of FILE_TYPES) {
    for (const row of byType[type]) {
      const code = String(row.표준계정과목코드).trim();
      if (!code) continue;
      const name = String(row.표준계정과목명 ?? "").trim();
      const amount = Number(row.금액) || 0;
      const existing = codeMap.get(code);
      if (existing) {
        existing.amounts[type] += amount;
        if (!existing.name && name) existing.name = name;
      } else {
        const amounts = zeroAmounts();
        amounts[type] = amount;
        codeMap.set(code, { name, amounts });
      }
    }
  }

  const result: ConsolidatedRow[] = [];
  for (const [code, { name, amounts }] of codeMap) {
    const 별도단순합산 = amounts.A1 + amounts.A2 + amounts.A3;
    const 연결후금액 = 별도단순합산 + amounts.B1 + amounts.B2;
    result.push({
      표준계정과목코드: code,
      표준계정과목명: name,
      A1: amounts.A1,
      A2: amounts.A2,
      A3: amounts.A3,
      별도단순합산,
      B1: amounts.B1,
      B2: amounts.B2,
      연결후금액,
    });
  }

  result.sort((a, b) =>
    a.표준계정과목코드.localeCompare(b.표준계정과목코드, "ko"),
  );
  return result;
}

export function toCsv(rows: ConsolidatedRow[]): string {
  const headers = [
    "표준계정과목코드",
    "표준계정과목명",
    "연결후금액",
    "B2",
    "B1",
    "별도단순합산",
    "A1",
    "A2",
    "A3",
  ];
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      [
        escapeCsv(row.표준계정과목코드),
        escapeCsv(row.표준계정과목명),
        row.연결후금액,
        row.B2,
        row.B1,
        row.별도단순합산,
        row.A1,
        row.A2,
        row.A3,
      ].join(","),
    );
  }
  return "﻿" + lines.join("\n");
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function formatAmount(value: number): string {
  if (value === 0) return "-";
  return value.toLocaleString("ko-KR");
}
