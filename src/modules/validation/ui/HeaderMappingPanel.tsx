"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useDictionary,
  type StandardHeader,
  type StandardSheetSpec,
} from "@/modules/standards";
import {
  extractHeaderRow,
  matchHeaders,
} from "../domain/sheet-mapper";
import type { ColumnMappingInput } from "../domain/excel-reader";

export type SheetHeaderConfig = {
  headerRow: number;
  columnMappings: ColumnMappingInput[];
};

// 시트 한 개에 대한 헤더 매핑 화면.
// 외부 시트의 raw preview + 표준 시트 유형(spec)을 받아 매핑을 편집.
export function HeaderMappingPanel({
  externalSheetName,
  preview,
  standardType,
  config,
  onConfigChange,
}: {
  externalSheetName: string;
  preview: string[][];
  standardType: string;
  config: SheetHeaderConfig | null;
  onConfigChange: (next: SheetHeaderConfig) => void;
}) {
  const { dict } = useDictionary();
  const spec: StandardSheetSpec | undefined = dict.sheets.find(
    (s) => s.type === standardType,
  );

  const headerRow = config?.headerRow ?? 1;
  const externalHeaders = useMemo(
    () => extractHeaderRow(preview, headerRow),
    [preview, headerRow],
  );

  // 시트 유형이나 헤더 행이 바뀌면 자동 추론을 새로
  useEffect(() => {
    if (!spec) return;
    if (config) return; // 이미 설정 있음 → 사용자 수정 보존
    const auto = matchHeaders({
      externalHeaders,
      standardHeaders: spec.headers.map((h) => ({ key: h.key, label: h.label })),
    });
    const cm: ColumnMappingInput[] = spec.headers.map((h) => ({
      standardKey: h.key,
      externalCol: auto.matches[h.key] ?? null,
    }));
    onConfigChange({ headerRow, columnMappings: cm });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, externalHeaders.join("|")]);

  if (!spec) {
    return (
      <p className="text-sm text-rose-600">
        표준 사전에서 "{standardType}" 유형을 찾지 못했습니다.
      </p>
    );
  }

  function setHeaderRow(row: number) {
    const newHeaders = extractHeaderRow(preview, row);
    const auto = matchHeaders({
      externalHeaders: newHeaders,
      standardHeaders: spec!.headers.map((h) => ({ key: h.key, label: h.label })),
    });
    const cm: ColumnMappingInput[] = spec!.headers.map((h) => ({
      standardKey: h.key,
      externalCol: auto.matches[h.key] ?? null,
    }));
    onConfigChange({ headerRow: row, columnMappings: cm });
  }

  function setColumn(standardKey: string, col: number | null) {
    if (!config) return;
    onConfigChange({
      ...config,
      columnMappings: config.columnMappings.map((m) =>
        m.standardKey === standardKey ? { ...m, externalCol: col } : m,
      ),
    });
  }

  // 외부 컬럼 옵션: 헤더 행에 있는 컬럼들
  const colOptions = externalHeaders.map((h, i) => ({
    col: i + 1,
    label: h ? `${i + 1}열 · ${h}` : `${i + 1}열 (빈 헤더)`,
  }));

  // 누락된 필수 헤더
  const missingRequired = spec.headers
    .filter((h) => h.required)
    .filter((h) => {
      const m = config?.columnMappings.find((cm) => cm.standardKey === h.key);
      return !m || m.externalCol == null;
    });

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm">
        <span className="font-mono text-xs text-slate-500">
          시트 "{externalSheetName}"
        </span>
        <span className="text-slate-400">→</span>
        <span className="font-medium text-slate-900">{spec.label}</span>
        <span className="font-mono text-xs text-slate-400">({spec.type})</span>
      </div>

      <div className="mb-3 flex items-center gap-2 text-xs">
        <label className="text-slate-700">헤더 행:</label>
        <input
          type="number"
          value={headerRow}
          min={1}
          max={preview.length}
          onChange={(e) => setHeaderRow(Math.max(1, Number(e.target.value) || 1))}
          className="w-16 rounded border border-slate-300 bg-white px-2 py-1"
        />
        <span className="text-slate-500">
          (헤더 행 변경 시 컬럼 매핑이 다시 자동 추론됩니다)
        </span>
      </div>

      {/* 외부 raw 미리보기 (헤더 행 강조) */}
      <details className="mb-3 rounded border border-slate-200 bg-white">
        <summary className="cursor-pointer px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
          시트 raw 미리보기 (첫 {preview.length}행)
        </summary>
        <div className="overflow-x-auto px-3 pb-3">
          <table className="text-xs">
            <tbody>
              {preview.map((row, ri) => (
                <tr
                  key={ri}
                  className={
                    ri + 1 === headerRow ? "bg-blue-50 font-semibold" : ""
                  }
                >
                  <td className="pr-2 font-mono text-slate-400">{ri + 1}</td>
                  {row.map((c, ci) => (
                    <td
                      key={ci}
                      className="border border-slate-100 px-2 py-1 text-slate-700"
                    >
                      {c || ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* 표준 헤더 ↔ 외부 컬럼 매핑 */}
      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-2 py-1.5 text-left">표준 헤더</th>
              <th className="px-2 py-1.5 text-center">필수</th>
              <th className="px-2 py-1.5 text-left">매핑할 외부 컬럼</th>
              <th className="px-2 py-1.5 text-left">설명</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {spec.headers.map((h) => {
              const m = config?.columnMappings.find(
                (cm) => cm.standardKey === h.key,
              );
              const isMissing =
                h.required && (!m || m.externalCol == null);
              return (
                <HeaderMappingRow
                  key={h.key}
                  header={h}
                  selected={m?.externalCol ?? null}
                  options={colOptions}
                  isMissing={isMissing}
                  onChange={(col) => setColumn(h.key, col)}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 누락 경고 */}
      {missingRequired.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-semibold">
            ⚠ 필수 표준 헤더 {missingRequired.length}개가 외부 시트에서
            매핑되지 않았습니다:
          </p>
          <ul className="mt-1 ml-4 list-disc">
            {missingRequired.map((h) => (
              <li key={h.key}>
                <strong>{h.label}</strong>{" "}
                <span className="font-mono text-amber-700">({h.key})</span> —{" "}
                {h.description}
              </li>
            ))}
          </ul>
          <p className="mt-2">
            검증은 진행할 수 있지만,{" "}
            <strong>연결정산표 진입은 불가</strong>합니다. 외부 양식에 위
            컬럼들을 추가해 다시 업로드해주세요.
          </p>
        </div>
      )}
    </div>
  );
}

function HeaderMappingRow({
  header,
  selected,
  options,
  isMissing,
  onChange,
}: {
  header: StandardHeader;
  selected: number | null;
  options: Array<{ col: number; label: string }>;
  isMissing: boolean;
  onChange: (col: number | null) => void;
}) {
  return (
    <tr className={isMissing ? "bg-amber-50/40" : ""}>
      <td className="px-2 py-1.5">
        <span className="font-medium text-slate-900">{header.label}</span>{" "}
        <span className="font-mono text-xs text-slate-400">({header.key})</span>
      </td>
      <td className="px-2 py-1.5 text-center">
        {header.required ? (
          <span className="text-rose-600">●</span>
        ) : (
          <span className="text-slate-300">○</span>
        )}
      </td>
      <td className="px-2 py-1.5">
        <select
          value={selected ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? null : Number(v));
          }}
          className={`rounded border bg-white px-2 py-1 text-xs ${
            isMissing
              ? "border-amber-300 text-amber-900"
              : "border-slate-300 text-slate-900"
          }`}
        >
          <option value="">— 매핑 안 함 —</option>
          {options.map((o) => (
            <option key={o.col} value={o.col}>
              {o.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1.5 text-slate-500">{header.description}</td>
    </tr>
  );
}
