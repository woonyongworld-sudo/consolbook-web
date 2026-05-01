"use client";

import { useState, Fragment } from "react";
import type { ConsolidatedRow } from "@/modules/types";
import { formatAmount } from "../domain/consolidate";

export function ResultTable({ rows }: { rows: ConsolidatedRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <p className="mt-4 text-sm text-slate-500">
        업로드된 파일에 유효한 데이터가 없습니다.
      </p>
    );
  }
  return (
    <div className="mt-4">
      <RulesPanel />
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
            {rows.map((r) => {
              const isExpanded = expanded === r.표준계정과목코드;
              return (
                <Fragment key={r.표준계정과목코드}>
                  <tr
                    onClick={() =>
                      setExpanded((prev) =>
                        prev === r.표준계정과목코드 ? null : r.표준계정과목코드,
                      )
                    }
                    className={`cursor-pointer hover:bg-slate-50 ${isExpanded ? "bg-blue-50/40" : ""}`}
                  >
                    <Td mono>
                      <span className="mr-1 inline-block w-3 text-slate-400">
                        {isExpanded ? "▾" : "▸"}
                      </span>
                      {r.표준계정과목코드}
                    </Td>
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
                  {isExpanded && (
                    <tr className="bg-blue-50/40">
                      <td colSpan={9} className="px-3 py-3">
                        <ExpandedDetail row={r} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RulesPanel() {
  return (
    <details
      open
      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
    >
      <summary className="cursor-pointer text-sm font-semibold text-slate-900">
        📐 합산 규칙 (이 표가 어떻게 계산되는지)
      </summary>
      <div className="mt-4 space-y-3 text-sm">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">
            컬럼 의미
          </p>
          <ul className="ml-4 list-disc space-y-0.5 text-slate-700">
            <li>
              <Code>A1</Code> · 모회사 별도재무제표
            </li>
            <li>
              <Code>A2</Code> · 자회사1 별도재무제표
            </li>
            <li>
              <Code>A3</Code> · 자회사2 별도재무제표
            </li>
            <li>
              <Code>B1</Code> · 연결조정 (지분법, 자본 상계 등)
            </li>
            <li>
              <Code>B2</Code> · 내부거래 제거 (그룹 내 매출/매입 상계)
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">
            합산 공식
          </p>
          <ol className="ml-4 list-decimal space-y-1 text-slate-800">
            <li>
              <Code>별도단순합산 = A1 + A2 + A3</Code>
              <span className="ml-2 text-xs text-slate-500">
                (자회사 별도재무제표를 모회사와 그대로 더함)
              </span>
            </li>
            <li>
              <Code>연결후금액 = 별도단순합산 + B1 + B2</Code>
              <span className="ml-2 text-xs text-slate-500">
                (위 합산에 연결조정·내부거래제거를 가감해 최종 연결재무제표 산출)
              </span>
            </li>
          </ol>
        </div>
        <p className="rounded bg-blue-50 px-3 py-2 text-xs text-blue-900">
          💡 표의 각 행을 <strong>클릭</strong>하면 해당 계정과목의 실제 계산
          과정을 단계별로 볼 수 있습니다.
        </p>
      </div>
    </details>
  );
}

function ExpandedDetail({ row }: { row: ConsolidatedRow }) {
  return (
    <div className="rounded-lg border border-blue-200 bg-white p-4 text-sm">
      <p className="mb-3 text-slate-700">
        <span className="font-mono text-xs text-slate-500">
          {row.표준계정과목코드}
        </span>{" "}
        <strong className="text-slate-900">{row.표준계정과목명}</strong>의 계산
        과정
      </p>
      <ol className="space-y-2">
        <li>
          <p className="font-semibold text-slate-700">
            ① 별도단순합산 = A1 + A2 + A3
          </p>
          <p className="ml-3 mt-1 font-mono text-xs text-slate-700">
            = {formatAmount(row.A1)} + {formatAmount(row.A2)} +{" "}
            {formatAmount(row.A3)}
            <span className="ml-2 font-semibold text-blue-700">
              = {formatAmount(row.별도단순합산)}
            </span>
          </p>
        </li>
        <li>
          <p className="font-semibold text-slate-700">
            ② 연결후금액 = 별도단순합산 + B1 + B2
          </p>
          <p className="ml-3 mt-1 font-mono text-xs text-slate-700">
            = {formatAmount(row.별도단순합산)} + {formatAmount(row.B1)} +{" "}
            {formatAmount(row.B2)}
            <span className="ml-2 font-semibold text-blue-700">
              = {formatAmount(row.연결후금액)}
            </span>
          </p>
        </li>
      </ol>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">
      {children}
    </code>
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
