import type { ConsolidatedRow } from "@/modules/types";
import { formatAmount } from "../domain/consolidate";

export function ResultTable({ rows }: { rows: ConsolidatedRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="mt-4 text-sm text-slate-500">
        업로드된 파일에 유효한 데이터가 없습니다.
      </p>
    );
  }
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <Th>코드</Th>
            <Th>계정과목</Th>
            <Th align="right" highlight>
              연결후금액
            </Th>
            <Th align="right">B2 내부거래제거</Th>
            <Th align="right">B1 연결조정</Th>
            <Th align="right">별도단순합산</Th>
            <Th align="right">A1 모회사</Th>
            <Th align="right">A2 자회사1</Th>
            <Th align="right">A3 자회사2</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.표준계정과목코드} className="hover:bg-slate-50">
              <Td mono>{r.표준계정과목코드}</Td>
              <Td>{r.표준계정과목명}</Td>
              <Td align="right" highlight>
                {formatAmount(r.연결후금액)}
              </Td>
              <Td align="right">{formatAmount(r.B2)}</Td>
              <Td align="right">{formatAmount(r.B1)}</Td>
              <Td align="right">{formatAmount(r.별도단순합산)}</Td>
              <Td align="right">{formatAmount(r.A1)}</Td>
              <Td align="right">{formatAmount(r.A2)}</Td>
              <Td align="right">{formatAmount(r.A3)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  align,
  highlight,
}: {
  children: React.ReactNode;
  align?: "right";
  highlight?: boolean;
}) {
  return (
    <th
      className={`px-3 py-2 font-semibold ${
        align === "right" ? "text-right" : "text-left"
      } ${highlight ? "bg-blue-50 text-blue-700" : ""}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  mono,
  highlight,
}: {
  children: React.ReactNode;
  align?: "right";
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <td
      className={`px-3 py-2 ${align === "right" ? "text-right" : ""} ${
        mono ? "font-mono text-xs text-slate-500" : ""
      } ${highlight ? "bg-blue-50 font-semibold text-blue-700" : ""}`}
    >
      {children}
    </td>
  );
}
