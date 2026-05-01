"use client";

import { useState } from "react";
import {
  useDictionary,
  type StandardDataType,
  type StandardDictionary,
  type StandardHeader,
  type StandardSheetSpec,
} from "../index";

const DATA_TYPES: StandardDataType[] = ["text", "number", "code", "enum"];

export default function StandardsEditor() {
  const { dict, setDict, reset } = useDictionary();
  const [selectedType, setSelectedType] = useState<string>(
    dict.sheets[0]?.type ?? "",
  );

  const selectedSpec = dict.sheets.find((s) => s.type === selectedType);

  function updateSpec(next: StandardSheetSpec) {
    const newDict: StandardDictionary = {
      ...dict,
      sheets: dict.sheets.map((s) => (s.type === selectedType ? next : s)),
    };
    setDict(newDict);
  }

  function addSheetType() {
    const newType = `CUSTOM_${Date.now().toString(36).toUpperCase()}`;
    const newSpec: StandardSheetSpec = {
      type: newType,
      label: "새 시트 유형",
      description: "설명을 입력하세요",
      headers: [
        {
          key: "field_1",
          label: "필드 1",
          description: "",
          dataType: "text",
          required: true,
        },
      ],
    };
    setDict({ ...dict, sheets: [...dict.sheets, newSpec] });
    setSelectedType(newType);
  }

  function removeSheetType(type: string) {
    if (!confirm(`"${type}" 유형을 삭제하시겠습니까?`)) return;
    const newSheets = dict.sheets.filter((s) => s.type !== type);
    setDict({ ...dict, sheets: newSheets });
    if (selectedType === type) {
      setSelectedType(newSheets[0]?.type ?? "");
    }
  }

  function handleReset() {
    if (
      !confirm(
        "사용자 수정사항을 모두 버리고 디폴트 표준 사전으로 되돌립니다. 진행하시겠습니까?",
      )
    )
      return;
    reset();
    setSelectedType("BS");
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            표준 양식 사전 편집
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            연결정산표 모듈의 단일 진실. 시트 유형과 필수 헤더를 정의하면
            연결패키지 입력 단계에서 매핑·검증의 기준으로 사용됩니다. 변경은
            이 브라우저에 저장됩니다 (localStorage).
          </p>
        </div>
        <button
          onClick={handleReset}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
        >
          디폴트로 리셋
        </button>
      </div>

      <div className="mt-6 rounded-lg bg-slate-50 px-4 py-2 text-xs text-slate-600">
        버전: <span className="font-mono">{dict.version}</span> · 마지막 수정:{" "}
        <span className="font-mono">{dict.updated_at.slice(0, 19)}</span>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">시트 유형</h2>
            <button
              onClick={addSheetType}
              className="rounded bg-slate-900 px-2 py-0.5 text-xs text-white hover:bg-slate-800"
            >
              + 추가
            </button>
          </div>
          <ul className="space-y-1">
            {dict.sheets.map((s) => {
              const isActive = s.type === selectedType;
              return (
                <li
                  key={s.type}
                  className={`flex items-center justify-between rounded px-2 py-1.5 text-sm ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <button
                    onClick={() => setSelectedType(s.type)}
                    className="flex-1 text-left"
                  >
                    <span className="font-mono text-xs opacity-75">
                      {s.type}
                    </span>{" "}
                    <span className="ml-1">{s.label}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSheetType(s.type);
                    }}
                    className={`ml-2 rounded p-0.5 text-xs ${
                      isActive
                        ? "text-white/60 hover:bg-white/10"
                        : "text-slate-400 hover:bg-slate-200"
                    }`}
                    title="유형 삭제"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <main>
          {selectedSpec ? (
            <SheetEditor spec={selectedSpec} onChange={updateSpec} />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
              좌측에서 시트 유형을 선택하거나 "+ 추가" 클릭
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function SheetEditor({
  spec,
  onChange,
}: {
  spec: StandardSheetSpec;
  onChange: (next: StandardSheetSpec) => void;
}) {
  function updateBasic(patch: Partial<StandardSheetSpec>) {
    onChange({ ...spec, ...patch });
  }
  function updateHeader(idx: number, patch: Partial<StandardHeader>) {
    onChange({
      ...spec,
      headers: spec.headers.map((h, i) => (i === idx ? { ...h, ...patch } : h)),
    });
  }
  function addHeader() {
    onChange({
      ...spec,
      headers: [
        ...spec.headers,
        {
          key: `field_${spec.headers.length + 1}`,
          label: "새 필드",
          description: "",
          dataType: "text",
          required: false,
        },
      ],
    });
  }
  function removeHeader(idx: number) {
    onChange({ ...spec, headers: spec.headers.filter((_, i) => i !== idx) });
  }
  function moveHeader(idx: number, dir: -1 | 1) {
    const next = [...spec.headers];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= next.length) return;
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    onChange({ ...spec, headers: next });
  }

  const required = spec.headers.filter((h) => h.required);
  const optional = spec.headers.filter((h) => !h.required);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">기본 정보</h3>
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <Label>시트 유형 키</Label>
          <input
            type="text"
            value={spec.type}
            onChange={(e) => updateBasic({ type: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1 font-mono text-sm"
          />
          <Label>한국어 라벨</Label>
          <input
            type="text"
            value={spec.label}
            onChange={(e) => updateBasic({ label: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          />
          <Label>설명</Label>
          <textarea
            value={spec.description}
            onChange={(e) => updateBasic({ description: e.target.value })}
            rows={2}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            헤더 정의 (필수 {required.length} · 선택 {optional.length})
          </h3>
          <button
            onClick={addHeader}
            className="rounded bg-slate-900 px-3 py-1 text-xs text-white hover:bg-slate-800"
          >
            + 헤더 추가
          </button>
        </div>
        <div className="space-y-3">
          {spec.headers.map((h, i) => (
            <HeaderEditor
              key={i}
              header={h}
              isFirst={i === 0}
              isLast={i === spec.headers.length - 1}
              onChange={(patch) => updateHeader(i, patch)}
              onRemove={() => removeHeader(i)}
              onMove={(dir) => moveHeader(i, dir)}
            />
          ))}
          {spec.headers.length === 0 && (
            <p className="text-sm text-slate-500">
              헤더가 없습니다. "+ 헤더 추가"로 시작하세요.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function HeaderEditor({
  header,
  isFirst,
  isLast,
  onChange,
  onRemove,
  onMove,
}: {
  header: StandardHeader;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<StandardHeader>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="grid gap-2 sm:grid-cols-[120px_1fr_120px_100px_60px]">
        <input
          type="text"
          value={header.key}
          onChange={(e) => onChange({ key: e.target.value })}
          placeholder="key"
          className="rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs"
        />
        <input
          type="text"
          value={header.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="한국어 라벨"
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
        />
        <select
          value={header.dataType}
          onChange={(e) =>
            onChange({ dataType: e.target.value as StandardDataType })
          }
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
        >
          {DATA_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <label className="flex items-center justify-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={header.required}
            onChange={(e) => onChange({ required: e.target.checked })}
          />
          <span className={header.required ? "text-rose-600" : "text-slate-500"}>
            {header.required ? "필수" : "선택"}
          </span>
        </label>
        <div className="flex items-center justify-end gap-0.5">
          <button
            onClick={() => onMove(-1)}
            disabled={isFirst}
            className="rounded p-0.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30"
            title="위로"
          >
            ↑
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={isLast}
            className="rounded p-0.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30"
            title="아래로"
          >
            ↓
          </button>
          <button
            onClick={onRemove}
            className="rounded p-0.5 text-rose-500 hover:bg-rose-50"
            title="삭제"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[120px_1fr]">
        <span className="self-center text-xs text-slate-500">설명</span>
        <input
          type="text"
          value={header.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
        />
      </div>
      {header.dataType === "enum" && (
        <div className="mt-2 grid gap-2 sm:grid-cols-[120px_1fr]">
          <span className="self-center text-xs text-slate-500">
            enum 값 (쉼표 구분)
          </span>
          <input
            type="text"
            value={(header.enumValues ?? []).join(", ")}
            onChange={(e) =>
              onChange({
                enumValues: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="예: 차변, 대변"
            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
          />
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="self-center text-sm text-slate-600">{children}</span>
  );
}
