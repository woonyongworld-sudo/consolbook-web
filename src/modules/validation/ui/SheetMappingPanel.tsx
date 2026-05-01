"use client";

import { Fragment, useState } from "react";
import type { DetectedSheet } from "../domain/sheet-mapper";
import { useDictionary } from "@/modules/standards";
import {
  HeaderMappingPanel,
  type SheetHeaderConfig,
} from "./HeaderMappingPanel";

export type UserMapping = {
  externalSheetName: string;
  // null = "이 시트는 무시"
  standardType: string | null;
  fs_div: "OFS" | "CFS";
  // v2: 시트 매핑이 정해지면 사용자가 헤더 매핑까지 설정
  headerConfig?: SheetHeaderConfig;
};

export function SheetMappingPanel({
  detected,
  mapping,
  onMappingChange,
  onConfirm,
  busy,
}: {
  detected: DetectedSheet[];
  mapping: UserMapping[];
  onMappingChange: (next: UserMapping[]) => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const { dict } = useDictionary();
  const [expanded, setExpanded] = useState<string | null>(null);

  function update(idx: number, patch: Partial<UserMapping>) {
    onMappingChange(
      mapping.map((m, i) => (i === idx ? { ...m, ...patch } : m)),
    );
  }

  const validatableCount = mapping.filter(
    (m) => m.standardType && m.standardType !== "NOTE",
  ).length;

  // 정산표 진입 가능 여부 = 매핑된 모든 FS 시트의 필수 헤더가 모두 매핑됨
  const blockers = computeBlockers(detected, mapping, dict);
  const canProceedToConsolidation =
    validatableCount > 0 && blockers.length === 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-900 font-mono text-xs text-white">
            1
          </span>
          <h2 className="text-lg font-semibold text-slate-900">
            시트 매핑 + 헤더 매핑
          </h2>
        </div>
        <p className="mt-1 ml-9 text-xs text-slate-500">
          각 시트의 표준 유형을 정하고, 시트 행을 클릭하면 그 시트의 헤더 행과
          컬럼 매핑을 설정할 수 있습니다.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">외부 시트명</th>
              <th className="px-3 py-2 text-right">행/열</th>
              <th className="px-3 py-2 text-left">표준 유형</th>
              <th className="px-3 py-2 text-left">별도/연결</th>
              <th className="px-3 py-2 text-left">헤더 매핑</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {detected.map((d, i) => {
              const m = mapping[i];
              const isFsType =
                m?.standardType && m.standardType !== "NOTE";
              const isExpanded = expanded === d.name;
              const headerStatus = describeHeaderStatus(m, dict);
              return (
                <Fragment key={d.name}>
                  <tr
                    onClick={() => {
                      if (isFsType) {
                        setExpanded(isExpanded ? null : d.name);
                      }
                    }}
                    className={`${isFsType ? "cursor-pointer hover:bg-slate-50" : ""} ${
                      isExpanded ? "bg-blue-50/40" : ""
                    }`}
                  >
                    <td className="px-3 py-2 font-mono text-slate-900">
                      {isFsType && (
                        <span className="mr-1 inline-block w-3 text-slate-400">
                          {isExpanded ? "▾" : "▸"}
                        </span>
                      )}
                      {d.name}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {d.rowCount}/{d.colCount}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={m?.standardType ?? ""}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          update(i, {
                            standardType: e.target.value || null,
                            headerConfig: undefined, // 유형 바뀌면 매핑 리셋
                          })
                        }
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                      >
                        <option value="">— 무시 —</option>
                        {dict.sheets.map((s) => (
                          <option key={s.type} value={s.type}>
                            {s.type} · {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={m?.fs_div ?? "OFS"}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          update(i, {
                            fs_div: e.target.value as "OFS" | "CFS",
                          })
                        }
                        disabled={!isFsType}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <option value="OFS">별도</option>
                        <option value="CFS">연결</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {!isFsType ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className={headerStatus.color}>
                          {headerStatus.label}
                        </span>
                      )}
                    </td>
                  </tr>
                  {isExpanded && isFsType && m?.standardType && (
                    <tr>
                      <td colSpan={5} className="bg-slate-50/50 px-3 py-3">
                        <HeaderMappingPanel
                          externalSheetName={d.name}
                          preview={d.preview}
                          standardType={m.standardType}
                          config={m.headerConfig ?? null}
                          onConfigChange={(cfg) =>
                            update(i, { headerConfig: cfg })
                          }
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 정산표 진입 차단 안내 */}
      {validatableCount > 0 && blockers.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-semibold">
            ⚠ 연결정산표 진입 차단 — 필수 헤더 누락 {blockers.length}건
          </p>
          <ul className="mt-1 ml-4 list-disc">
            {blockers.map((b, i) => (
              <li key={i}>
                <strong>{b.sheet}</strong> ({b.standardType}) — 누락:{" "}
                {b.missing.join(", ")}
              </li>
            ))}
          </ul>
          <p className="mt-2">
            검증은 진행할 수 있고 데이터는 화면에 표시됩니다. 다만 연결정산표
            적재는 위 누락이 모두 해결된 후 가능합니다.
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          매핑된 시트{" "}
          <strong className="text-slate-900">{validatableCount}</strong>개 ·{" "}
          {canProceedToConsolidation ? (
            <span className="text-emerald-700">정산표 진입 가능 ✓</span>
          ) : (
            <span className="text-amber-700">정산표 진입 차단</span>
          )}
        </p>
        <button
          onClick={() => onConfirm()}
          disabled={busy || validatableCount === 0}
          className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
        >
          {busy ? "검증 중…" : "검증 진행 →"}
        </button>
      </div>
    </section>
  );
}

type Blocker = {
  sheet: string;
  standardType: string;
  missing: string[];
};

function computeBlockers(
  detected: DetectedSheet[],
  mapping: UserMapping[],
  dict: ReturnType<typeof useDictionary>["dict"],
): Blocker[] {
  const out: Blocker[] = [];
  for (let i = 0; i < detected.length; i++) {
    const m = mapping[i];
    if (!m?.standardType || m.standardType === "NOTE") continue;
    const spec = dict.sheets.find((s) => s.type === m.standardType);
    if (!spec) continue;
    const required = spec.headers.filter((h) => h.required);
    const missing: string[] = [];
    for (const r of required) {
      const cm = m.headerConfig?.columnMappings?.find(
        (c) => c.standardKey === r.key,
      );
      if (!cm || cm.externalCol == null) {
        missing.push(`${r.label}`);
      }
    }
    if (missing.length > 0) {
      out.push({
        sheet: detected[i].name,
        standardType: m.standardType,
        missing,
      });
    }
  }
  return out;
}

function describeHeaderStatus(
  m: UserMapping | undefined,
  dict: ReturnType<typeof useDictionary>["dict"],
): { label: string; color: string } {
  if (!m?.standardType || m.standardType === "NOTE") {
    return { label: "—", color: "text-slate-400" };
  }
  const spec = dict.sheets.find((s) => s.type === m.standardType);
  if (!spec) return { label: "—", color: "text-slate-400" };
  if (!m.headerConfig) {
    return { label: "자동 추론 대기 (행 클릭)", color: "text-slate-500" };
  }
  const requiredKeys = spec.headers.filter((h) => h.required).map((h) => h.key);
  const mappedRequired = requiredKeys.filter((k) =>
    m.headerConfig?.columnMappings?.some(
      (c) => c.standardKey === k && c.externalCol != null,
    ),
  );
  const missing = requiredKeys.length - mappedRequired.length;
  if (missing === 0) {
    return {
      label: `✓ 완료 (필수 ${requiredKeys.length}/${requiredKeys.length})`,
      color: "text-emerald-700",
    };
  }
  return {
    label: `누락 ${missing}건 (필수 ${mappedRequired.length}/${requiredKeys.length})`,
    color: "text-amber-700",
  };
}
