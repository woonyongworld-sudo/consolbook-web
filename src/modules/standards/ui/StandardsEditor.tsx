"use client";

import { useState } from "react";
import {
  useDictionary,
  type AccountMapping,
  type HeaderValidation,
  type ListItem,
  type ListMaster,
  type StandardDataType,
  type StandardDictionary,
  type StandardHeader,
  type StandardSheetSpec,
} from "../index";

const DATA_TYPES: StandardDataType[] = ["text", "number", "code", "enum"];

type Mode = "sheets" | "lists" | "mappings";

export default function StandardsEditor() {
  const { dict, setDict, reset } = useDictionary();
  const [mode, setMode] = useState<Mode>("sheets");
  const [selectedSheetType, setSelectedSheetType] = useState<string>(
    dict.sheets[0]?.type ?? "",
  );
  const [selectedListKey, setSelectedListKey] = useState<string>(
    dict.lists[0]?.key ?? "",
  );

  const selectedSpec = dict.sheets.find((s) => s.type === selectedSheetType);
  const selectedList = dict.lists.find((l) => l.key === selectedListKey);

  function updateSpec(next: StandardSheetSpec) {
    setDict({
      ...dict,
      sheets: dict.sheets.map((s) =>
        s.type === selectedSheetType ? next : s,
      ),
    });
  }

  function updateList(next: ListMaster) {
    setDict({
      ...dict,
      lists: dict.lists.map((l) => (l.key === selectedListKey ? next : l)),
    });
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
    setSelectedSheetType(newType);
  }

  function removeSheetType(type: string) {
    if (!confirm(`"${type}" 유형을 삭제하시겠습니까?`)) return;
    const newSheets = dict.sheets.filter((s) => s.type !== type);
    setDict({ ...dict, sheets: newSheets });
    if (selectedSheetType === type) {
      setSelectedSheetType(newSheets[0]?.type ?? "");
    }
  }

  function addList() {
    const newKey = `list_${Date.now().toString(36)}`;
    const newList: ListMaster = {
      key: newKey,
      label: "새 목록",
      description: "설명을 입력하세요",
      items: [{ code: "1", label: "항목 1" }],
    };
    setDict({ ...dict, lists: [...dict.lists, newList] });
    setSelectedListKey(newKey);
  }

  function removeList(key: string) {
    if (!confirm(`"${key}" 목록을 삭제하시겠습니까?`)) return;
    const newLists = dict.lists.filter((l) => l.key !== key);
    setDict({ ...dict, lists: newLists });
    if (selectedListKey === key) {
      setSelectedListKey(newLists[0]?.key ?? "");
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
    setSelectedSheetType("BS");
    setSelectedListKey("consolidation_coa");
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            표준 양식 사전 편집
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            연결정산표 모듈의 단일 진실. 시트 유형 + 헤더 + 목록 마스터를
            정의하면 연결패키지 입력 단계에서 매핑·검증의 기준으로 사용됩니다.
            변경은 이 브라우저에 저장됩니다 (localStorage).
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
          <div className="mb-3 flex gap-1 rounded bg-slate-100 p-0.5 text-xs">
            <button
              onClick={() => setMode("sheets")}
              className={`flex-1 rounded px-2 py-1 ${
                mode === "sheets"
                  ? "bg-white font-semibold text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              시트 ({dict.sheets.length})
            </button>
            <button
              onClick={() => setMode("lists")}
              className={`flex-1 rounded px-2 py-1 ${
                mode === "lists"
                  ? "bg-white font-semibold text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              마스터 ({dict.lists.length})
            </button>
            <button
              onClick={() => setMode("mappings")}
              className={`flex-1 rounded px-2 py-1 ${
                mode === "mappings"
                  ? "bg-white font-semibold text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              매핑 ({dict.accountMappings.length})
              {pendingCount(dict) > 0 && (
                <span className="ml-1 rounded bg-amber-200 px-1 text-amber-900">
                  미확정 {pendingCount(dict)}
                </span>
              )}
            </button>
          </div>

          {mode === "sheets" && (
            <SheetTypeList
              sheets={dict.sheets}
              selected={selectedSheetType}
              onSelect={setSelectedSheetType}
              onAdd={addSheetType}
              onRemove={removeSheetType}
            />
          )}
          {mode === "lists" && (
            <ListMasterList
              lists={dict.lists}
              selected={selectedListKey}
              onSelect={setSelectedListKey}
              onAdd={addList}
              onRemove={removeList}
            />
          )}
          {mode === "mappings" && (
            <p className="text-xs text-slate-500">
              계정과목 매핑: 사용자가 검증 화면에서 등록하거나, 여기서 수동
              추가/확정/제거할 수 있습니다.
            </p>
          )}
        </aside>

        <main>
          {mode === "sheets" &&
            (selectedSpec ? (
              <SheetEditor spec={selectedSpec} dict={dict} onChange={updateSpec} />
            ) : (
              <EmptyHint label="좌측에서 시트 유형 선택 또는 + 추가" />
            ))}
          {mode === "lists" &&
            (selectedList ? (
              <ListEditor list={selectedList} onChange={updateList} />
            ) : (
              <EmptyHint label="좌측에서 목록 마스터 선택 또는 + 추가" />
            ))}
          {mode === "mappings" && (
            <MappingsManager
              dict={dict}
              onChange={(next) => setDict({ ...dict, ...next })}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function SheetTypeList({
  sheets,
  selected,
  onSelect,
  onAdd,
  onRemove,
}: {
  sheets: StandardSheetSpec[];
  selected: string;
  onSelect: (t: string) => void;
  onAdd: () => void;
  onRemove: (t: string) => void;
}) {
  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">시트 유형</span>
        <button
          onClick={onAdd}
          className="rounded bg-slate-900 px-2 py-0.5 text-xs text-white hover:bg-slate-800"
        >
          + 추가
        </button>
      </div>
      <ul className="space-y-1">
        {sheets.map((s) => (
          <SidebarItem
            key={s.type}
            title={`${s.type} · ${s.label}`}
            active={s.type === selected}
            onSelect={() => onSelect(s.type)}
            onRemove={() => onRemove(s.type)}
          />
        ))}
      </ul>
    </>
  );
}

function ListMasterList({
  lists,
  selected,
  onSelect,
  onAdd,
  onRemove,
}: {
  lists: ListMaster[];
  selected: string;
  onSelect: (k: string) => void;
  onAdd: () => void;
  onRemove: (k: string) => void;
}) {
  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">목록 마스터</span>
        <button
          onClick={onAdd}
          className="rounded bg-slate-900 px-2 py-0.5 text-xs text-white hover:bg-slate-800"
        >
          + 추가
        </button>
      </div>
      <ul className="space-y-1">
        {lists.map((l) => (
          <SidebarItem
            key={l.key}
            title={l.label}
            subtitle={`${l.items.length}개 항목`}
            active={l.key === selected}
            onSelect={() => onSelect(l.key)}
            onRemove={() => onRemove(l.key)}
          />
        ))}
      </ul>
    </>
  );
}

function SidebarItem({
  title,
  subtitle,
  active,
  onSelect,
  onRemove,
}: {
  title: string;
  subtitle?: string;
  active: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  return (
    <li
      className={`flex items-center justify-between rounded px-2 py-1.5 text-sm ${
        active
          ? "bg-slate-900 text-white"
          : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      <button onClick={onSelect} className="flex-1 text-left">
        <span className="block">{title}</span>
        {subtitle && (
          <span
            className={`block text-xs ${active ? "text-white/60" : "text-slate-400"}`}
          >
            {subtitle}
          </span>
        )}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className={`ml-2 rounded p-0.5 text-xs ${
          active
            ? "text-white/60 hover:bg-white/10"
            : "text-slate-400 hover:bg-slate-200"
        }`}
        title="삭제"
      >
        ✕
      </button>
    </li>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
      {label}
    </div>
  );
}

// === 시트 유형 편집 ===
function SheetEditor({
  spec,
  dict,
  onChange,
}: {
  spec: StandardSheetSpec;
  dict: StandardDictionary;
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
              dict={dict}
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
  dict,
  isFirst,
  isLast,
  onChange,
  onRemove,
  onMove,
}: {
  header: StandardHeader;
  dict: StandardDictionary;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<StandardHeader>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const validationType: "none" | "enum" | "list" =
    header.validation?.type ?? (header.dataType === "enum" ? "enum" : "none");

  function changeValidation(next: HeaderValidation) {
    onChange({ validation: next });
  }

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
          >
            ↑
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={isLast}
            className="rounded p-0.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30"
          >
            ↓
          </button>
          <button
            onClick={onRemove}
            className="rounded p-0.5 text-rose-500 hover:bg-rose-50"
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

      {/* v3: 데이터 유효성 검사 */}
      <div className="mt-3 rounded border border-slate-200 bg-white p-2.5">
        <p className="mb-2 text-xs font-semibold text-slate-700">
          데이터 유효성 검사
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              checked={validationType === "none"}
              onChange={() => changeValidation({ type: "none" })}
            />
            없음
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              checked={validationType === "enum"}
              onChange={() => changeValidation({ type: "enum" })}
            />
            inline 값 (아래 enum 값)
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              checked={validationType === "list"}
              onChange={() => {
                const firstList = dict.lists[0]?.key ?? "";
                changeValidation({
                  type: "list",
                  listKey: firstList,
                  matchField: "code",
                });
              }}
            />
            목록 마스터 참조
          </label>
        </div>

        {validationType === "enum" && (
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

        {validationType === "list" && header.validation?.type === "list" && (
          <div className="mt-2 grid gap-2 sm:grid-cols-[120px_1fr]">
            <span className="self-center text-xs text-slate-500">
              참조 마스터
            </span>
            <select
              value={header.validation.listKey}
              onChange={(e) =>
                changeValidation({
                  type: "list",
                  listKey: e.target.value,
                  matchField: header.validation?.type === "list"
                    ? header.validation.matchField
                    : "code",
                })
              }
              className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
            >
              <option value="">— 선택 —</option>
              {dict.lists.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.label} ({l.items.length}개)
                </option>
              ))}
            </select>
            <span className="self-center text-xs text-slate-500">매칭 필드</span>
            <select
              value={header.validation.matchField ?? "code"}
              onChange={(e) =>
                changeValidation({
                  type: "list",
                  listKey: header.validation?.type === "list"
                    ? header.validation.listKey
                    : "",
                  matchField: e.target.value as "code" | "label",
                })
              }
              className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
            >
              <option value="code">code (예: "1000001")</option>
              <option value="label">label (예: "현금및예치금")</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

// === 목록 마스터 편집 ===
function ListEditor({
  list,
  onChange,
}: {
  list: ListMaster;
  onChange: (next: ListMaster) => void;
}) {
  function updateBasic(patch: Partial<ListMaster>) {
    onChange({ ...list, ...patch });
  }
  function updateItem(idx: number, patch: Partial<ListItem>) {
    onChange({
      ...list,
      items: list.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    });
  }
  function addItem() {
    onChange({
      ...list,
      items: [
        ...list.items,
        { code: `${Date.now().toString(36).toUpperCase()}`, label: "새 항목" },
      ],
    });
  }
  function removeItem(idx: number) {
    onChange({ ...list, items: list.items.filter((_, i) => i !== idx) });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">기본 정보</h3>
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <Label>키</Label>
          <input
            type="text"
            value={list.key}
            onChange={(e) => updateBasic({ key: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1 font-mono text-sm"
          />
          <Label>라벨</Label>
          <input
            type="text"
            value={list.label}
            onChange={(e) => updateBasic({ label: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          />
          <Label>설명</Label>
          <textarea
            value={list.description}
            onChange={(e) => updateBasic({ description: e.target.value })}
            rows={2}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            항목 ({list.items.length})
          </h3>
          <button
            onClick={addItem}
            className="rounded bg-slate-900 px-3 py-1 text-xs text-white hover:bg-slate-800"
          >
            + 항목 추가
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-2 py-1.5 text-left">code</th>
                <th className="px-2 py-1.5 text-left">label</th>
                <th className="px-2 py-1.5 text-left">meta (key=value, ...)</th>
                <th className="px-2 py-1.5 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.items.map((it, i) => (
                <tr key={i}>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      value={it.code}
                      onChange={(e) => updateItem(i, { code: e.target.value })}
                      className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-xs"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      value={it.label}
                      onChange={(e) =>
                        updateItem(i, { label: e.target.value })
                      }
                      className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      value={metaToString(it.meta)}
                      onChange={(e) =>
                        updateItem(i, { meta: stringToMeta(e.target.value) })
                      }
                      placeholder="class=자산, total=Y"
                      className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-600"
                    />
                  </td>
                  <td className="px-2 py-1 text-right">
                    <button
                      onClick={() => removeItem(i)}
                      className="rounded p-0.5 text-rose-500 hover:bg-rose-50"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function metaToString(m?: Record<string, string>): string {
  if (!m) return "";
  return Object.entries(m)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
}

function stringToMeta(s: string): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const part of s.split(",")) {
    const [k, ...vs] = part.split("=");
    if (!k.trim()) continue;
    out[k.trim()] = vs.join("=").trim();
  }
  return Object.keys(out).length === 0 ? undefined : out;
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="self-center text-sm text-slate-600">{children}</span>;
}

function pendingCount(dict: StandardDictionary): number {
  return dict.accountMappings.filter((m) => m.status === "pending").length;
}

// === 매핑 관리 ===
function MappingsManager({
  dict,
  onChange,
}: {
  dict: StandardDictionary;
  onChange: (patch: Partial<StandardDictionary>) => void;
}) {
  const pending = dict.accountMappings.filter((m) => m.status === "pending");
  const confirmed = dict.accountMappings.filter(
    (m) => m.status === "confirmed",
  );

  function updateMapping(id: string, patch: Partial<AccountMapping>) {
    onChange({
      accountMappings: dict.accountMappings.map((m) =>
        m.id === id ? { ...m, ...patch } : m,
      ),
    });
  }
  function confirmMapping(id: string) {
    updateMapping(id, {
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      confirmed_by: "admin",
    });
  }
  function unconfirmMapping(id: string) {
    updateMapping(id, {
      status: "pending",
      confirmed_at: undefined,
      confirmed_by: undefined,
    });
  }
  function removeMapping(id: string) {
    if (!confirm("이 매핑을 삭제하시겠습니까?")) return;
    onChange({
      accountMappings: dict.accountMappings.filter((m) => m.id !== id),
    });
  }
  function confirmAllPending() {
    if (pending.length === 0) return;
    if (!confirm(`미확정 ${pending.length}건을 모두 확정하시겠습니까?`)) return;
    onChange({
      accountMappings: dict.accountMappings.map((m) =>
        m.status === "pending"
          ? {
              ...m,
              status: "confirmed",
              confirmed_at: new Date().toISOString(),
              confirmed_by: "admin",
            }
          : m,
      ),
    });
  }

  return (
    <div className="space-y-6">
      {/* 미확정 */}
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-amber-900">
            미확정 매핑 ({pending.length})
          </h3>
          {pending.length > 0 && (
            <button
              onClick={confirmAllPending}
              className="rounded bg-amber-700 px-3 py-1 text-xs text-white hover:bg-amber-800"
            >
              모두 확정
            </button>
          )}
        </div>
        {pending.length === 0 ? (
          <p className="text-xs text-amber-800">
            검토 대기 중인 매핑이 없습니다.
          </p>
        ) : (
          <MappingTable
            mappings={pending}
            dict={dict}
            onConfirm={confirmMapping}
            onRemove={removeMapping}
            showConfirmAction
          />
        )}
      </section>

      {/* 확정 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          확정 매핑 ({confirmed.length})
        </h3>
        {confirmed.length === 0 ? (
          <p className="text-xs text-slate-500">확정된 매핑이 없습니다.</p>
        ) : (
          <MappingTable
            mappings={confirmed}
            dict={dict}
            onUnconfirm={unconfirmMapping}
            onRemove={removeMapping}
          />
        )}
      </section>
    </div>
  );
}

function MappingTable({
  mappings,
  dict,
  onConfirm,
  onUnconfirm,
  onRemove,
  showConfirmAction = false,
}: {
  mappings: AccountMapping[];
  dict: StandardDictionary;
  onConfirm?: (id: string) => void;
  onUnconfirm?: (id: string) => void;
  onRemove: (id: string) => void;
  showConfirmAction?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full text-xs">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-3 py-2 text-left">외부 값</th>
            <th className="px-3 py-2 text-left">→ 표준 코드</th>
            <th className="px-3 py-2 text-left">마스터</th>
            <th className="px-3 py-2 text-left">출처</th>
            <th className="px-3 py-2 text-left">생성일시</th>
            <th className="px-3 py-2 text-right">액션</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {mappings.map((m) => {
            const list = dict.lists.find((l) => l.key === m.list_key);
            const item = list?.items.find((it) => it.code === m.standard_code);
            return (
              <tr key={m.id}>
                <td className="px-3 py-2 font-mono text-slate-900">
                  {m.external_value}
                </td>
                <td className="px-3 py-2">
                  <span className="font-mono text-slate-900">
                    {m.standard_code}
                  </span>
                  {item && (
                    <span className="ml-2 text-slate-500">{item.label}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-500">
                  {list?.label ?? m.list_key}
                </td>
                <td className="px-3 py-2 text-slate-500">{m.source ?? "-"}</td>
                <td className="px-3 py-2 font-mono text-slate-400">
                  {m.created_at.slice(0, 10)}
                </td>
                <td className="px-3 py-2 text-right">
                  {showConfirmAction && onConfirm && (
                    <button
                      onClick={() => onConfirm(m.id)}
                      className="mr-1 rounded bg-emerald-600 px-2 py-0.5 text-xs text-white hover:bg-emerald-700"
                    >
                      확정
                    </button>
                  )}
                  {!showConfirmAction && onUnconfirm && (
                    <button
                      onClick={() => onUnconfirm(m.id)}
                      className="mr-1 rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      미확정으로
                    </button>
                  )}
                  <button
                    onClick={() => onRemove(m.id)}
                    className="rounded p-0.5 text-rose-500 hover:bg-rose-50"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
