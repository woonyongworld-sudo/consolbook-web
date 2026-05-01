"use client";

import type { DetectedSheet } from "../domain/sheet-mapper";
import type { SheetMappingInput } from "../domain/excel-reader";
import { useDictionary } from "@/modules/standards";

export type UserMapping = {
  externalSheetName: string;
  // null = "이 시트는 무시"
  standardType: string | null;
  fs_div: "OFS" | "CFS";
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

  function update(idx: number, patch: Partial<UserMapping>) {
    onMappingChange(
      mapping.map((m, i) => (i === idx ? { ...m, ...patch } : m)),
    );
  }

  const validatableCount = mapping.filter(
    (m) => m.standardType && m.standardType !== "NOTE",
  ).length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-900 font-mono text-xs text-white">
            1
          </span>
          <h2 className="text-lg font-semibold text-slate-900">시트 매핑</h2>
        </div>
        <p className="mt-1 ml-9 text-xs text-slate-500">
          업로드한 .xlsx의 각 시트를 표준 유형에 매핑하세요. 자동 추론된
          제안은 회색으로 표시됩니다. 매핑을 비워둔 시트는 검증에서 제외됩니다.
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
              <th className="px-3 py-2 text-left">자동 추론</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {detected.map((d, i) => {
              const m = mapping[i];
              const suggestion = dict.sheets.find(
                (s) => s.type === d.suggestedStandardType,
              );
              return (
                <tr key={d.name} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-slate-900">
                    {d.name}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-500">
                    {d.rowCount}/{d.colCount}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={m?.standardType ?? ""}
                      onChange={(e) =>
                        update(i, {
                          standardType: e.target.value || null,
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
                      onChange={(e) =>
                        update(i, { fs_div: e.target.value as "OFS" | "CFS" })
                      }
                      disabled={!m?.standardType || m.standardType === "NOTE"}
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="OFS">별도</option>
                      <option value="CFS">연결</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {suggestion ? (
                      <span>
                        {suggestion.type} · {suggestion.label}{" "}
                        <span className="text-slate-400">
                          ({Math.round(d.suggestionScore * 100)}%)
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400">— 추론 실패</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          매핑된 시트{" "}
          <strong className="text-slate-900">{validatableCount}</strong>개로
          검증 진행 (NOTE 시트는 v1에서 검증 대상 아님).
        </p>
        <button
          onClick={onConfirm}
          disabled={busy || validatableCount === 0}
          className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
        >
          {busy ? "검증 중…" : "검증 진행 →"}
        </button>
      </div>
    </section>
  );
}
