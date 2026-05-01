"use client";

import { useRef, useState } from "react";
import type { ValidationReport, RuleTrace, TraceInput } from "../domain/types";
import type { DetectedSheet } from "../domain/sheet-mapper";
import { SheetMappingPanel, type UserMapping } from "./SheetMappingPanel";
import {
  useDictionary,
  type AccountMapping,
  type ListMaster,
} from "@/modules/standards";

type FsSummary = {
  fs_div: "OFS" | "CFS";
  sj_div: string;
  sheetName: string;
  rowCount: number;
  preview: Array<{
    rowIndex: number;
    account_id: string;
    account_nm: string;
    thstrm_amount: number | null;
    frmtrm_amount: number | null;
  }>;
};

type ExtractionMeta = {
  expectedSheets: Array<{ fs_div: string; sj_div: string; expectedName: string }>;
  columnMapping: ReadonlyArray<{
    col: number;
    field: string;
    label: string;
    required: boolean;
  }>;
};

type SubmitResult = {
  report: ValidationReport;
  fs_summary: FsSummary[];
  extraction_meta: ExtractionMeta;
};

const SJ_LABEL: Record<string, string> = {
  BS: "재무상태표",
  IS: "손익계산서",
  CIS: "포괄손익계산서",
  CF: "현금흐름표",
  SCE: "자본변동표",
};

export default function ValidationWorkspace() {
  const { dict } = useDictionary();
  const inputRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState<string>("");
  const [fileBase64, setFileBase64] = useState<string>("");
  const [detected, setDetected] = useState<DetectedSheet[] | null>(null);
  const [mapping, setMapping] = useState<UserMapping[]>([]);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<
    "idle" | "detecting" | "mapping" | "validating" | "done"
  >("idle");

  async function handleFile(file: File) {
    setPhase("detecting");
    setError(null);
    setResult(null);
    setDetected(null);
    setMapping([]);
    setFilename(file.name);
    try {
      const buf = await file.arrayBuffer();
      const b64 = arrayBufferToBase64(buf);
      setFileBase64(b64);

      // 시트 자동 감지
      const res = await fetch("/api/validation/detect-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: buf,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `시트 감지 실패 (HTTP ${res.status})`);
        setPhase("idle");
        return;
      }
      const sheets = data.sheets as DetectedSheet[];
      setDetected(sheets);
      // 자동 추론을 초기 매핑으로
      setMapping(
        sheets.map((s) => ({
          externalSheetName: s.name,
          standardType: s.suggestedStandardType,
          fs_div: inferFsDiv(s.name),
        })),
      );
      setPhase("mapping");
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 실패");
      setPhase("idle");
    }
  }

  async function handleValidate(overrideDict?: typeof dict) {
    if (!fileBase64 || !mapping) return;
    const useDict = overrideDict ?? dict;
    const validMappings = mapping
      .filter((m) => m.standardType && m.standardType !== "NOTE")
      .map((m) => ({
        externalSheetName: m.externalSheetName,
        standardType: m.standardType as "BS" | "IS" | "CIS" | "CF" | "SCE",
        fs_div: m.fs_div,
        headerRow: m.headerConfig?.headerRow,
        columnMappings: m.headerConfig?.columnMappings,
      }));

    if (validMappings.length === 0) {
      setError("검증할 시트를 매핑해주세요.");
      return;
    }

    setPhase("validating");
    setError(null);
    try {
      const res = await fetch("/api/validation/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64,
          mappings: validMappings,
          dict: useDict,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `검증 실패 (HTTP ${res.status})`);
        setPhase("mapping");
        return;
      }
      setResult(data as SubmitResult);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "검증 실패");
      setPhase("mapping");
    }
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function reset() {
    setPhase("idle");
    setDetected(null);
    setMapping([]);
    setResult(null);
    setError(null);
    setFileBase64("");
    setFilename("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            연결패키지 입력/검증
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            .xlsx를 업로드하면 시트를 자동 감지하고, 표준 양식 사전과 매핑한 뒤
            정합성을 검증합니다.
          </p>
        </div>
        {phase !== "idle" && (
          <button
            onClick={reset}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            새 파일 업로드
          </button>
        )}
      </div>

      {phase === "idle" && (
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="mt-6 block cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center hover:border-slate-400 hover:bg-slate-50"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <p className="text-base font-medium text-slate-900">
            .xlsx 파일을 끌어다 놓거나 클릭해 선택
          </p>
          <p className="mt-1 text-xs text-slate-500">
            DART 임포터 결과물 또는 임의 자회사 양식 모두 지원
          </p>
        </label>
      )}

      {phase === "detecting" && (
        <p className="mt-4 text-sm text-slate-500">시트 감지 중…</p>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          ⚠ {error}
        </div>
      )}

      {(phase === "mapping" ||
        phase === "validating" ||
        phase === "done") &&
        detected && (
          <div className="mt-6 space-y-6">
            <FileBanner filename={filename} />
            <SheetMappingPanel
              detected={detected}
              mapping={mapping}
              onMappingChange={setMapping}
              onConfirm={handleValidate}
              busy={phase === "validating"}
            />
          </div>
        )}

      {result && (
        <ResultPanel
          result={result}
          filename={filename}
          onMappingAdded={handleValidate}
        />
      )}
    </div>
  );
}

function FileBanner({ filename }: { filename: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm">
      <span className="text-slate-500">업로드된 파일: </span>
      <span className="font-mono font-medium text-slate-900">{filename}</span>
    </div>
  );
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)),
    );
  }
  return btoa(bin);
}

function inferFsDiv(sheetName: string): "OFS" | "CFS" {
  if (/연결/.test(sheetName)) return "CFS";
  return "OFS";
}

function ResultPanel({
  result,
  filename,
  onMappingAdded,
}: {
  result: SubmitResult;
  filename: string;
  onMappingAdded: (newDict?: import("@/modules/standards").StandardDictionary) => void;
}) {
  return (
    <div className="mt-8 space-y-8">
      <FileSummary result={result} filename={filename} />
      <Stage1Extraction result={result} />
      <Stage2Rules report={result.report} onMappingAdded={onMappingAdded} />
      <Stage3Result report={result.report} />
    </div>
  );
}

function FileSummary({
  result,
  filename,
}: {
  result: SubmitResult;
  filename: string;
}) {
  const { meta } = result.report;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-900">{filename}</h2>
      <div className="mt-1 text-sm text-slate-600">
        {meta.corp_name && <span>{meta.corp_name}</span>}
        {meta.bsns_year && <span> · {meta.bsns_year}년</span>}
        {meta.reprt_code && <span> · {meta.reprt_code}</span>}
      </div>
    </div>
  );
}

function Stage1Extraction({ result }: { result: SubmitResult }) {
  const { extraction_meta, fs_summary } = result;
  const recognizedNames = new Set(fs_summary.map((s) => s.sheetName));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <StageHeader
        no={1}
        title="데이터 추출 단계"
        subtitle="업로드한 .xlsx에서 어떤 시트를 어떤 규칙으로 읽었는지"
      />

      {/* 시트 인식 결과 */}
      <div className="mb-5">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">
          기대 시트와 실제 인식
        </h3>
        <p className="mb-2 text-xs text-slate-500">
          시트 이름이 정확히 일치할 때만 인식됩니다. 누락된 시트는 검증에서
          제외됩니다.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">구분</th>
                <th className="px-3 py-2 text-left">제표</th>
                <th className="px-3 py-2 text-left">기대 시트명</th>
                <th className="px-3 py-2 text-center">상태</th>
                <th className="px-3 py-2 text-right">행 수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {extraction_meta.expectedSheets.map((es) => {
                const found = fs_summary.find(
                  (f) => f.sheetName === es.expectedName,
                );
                const ok = recognizedNames.has(es.expectedName);
                return (
                  <tr key={es.expectedName}>
                    <td className="px-3 py-2 text-slate-600">
                      {es.fs_div === "OFS" ? "별도" : "연결"}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {SJ_LABEL[es.sj_div] || es.sj_div}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-900">
                      {es.expectedName}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {ok ? (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">
                          ✓ 인식
                        </span>
                      ) : (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">
                          – 없음
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700">
                      {found ? found.rowCount : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 컬럼 매핑 규칙 */}
      <div className="mb-5">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">
          컬럼 매핑 규칙
        </h3>
        <p className="mb-2 text-xs text-slate-500">
          각 FS 시트에서 셀 위치(컬럼) 기준으로 다음 필드를 읽습니다.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">셀 컬럼</th>
                <th className="px-3 py-2 text-left">필드</th>
                <th className="px-3 py-2 text-left">의미</th>
                <th className="px-3 py-2 text-center">필수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {extraction_meta.columnMapping.map((c) => (
                <tr key={c.field}>
                  <td className="px-3 py-2 font-mono text-slate-900">
                    {String.fromCharCode(64 + c.col)} ({c.col}열)
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-700">{c.field}</td>
                  <td className="px-3 py-2 text-slate-700">{c.label}</td>
                  <td className="px-3 py-2 text-center">
                    {c.required ? (
                      <span className="text-rose-600">필수</span>
                    ) : (
                      <span className="text-slate-400">선택</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 시트별 정규화된 데이터 미리보기 */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">
          정규화된 데이터 미리보기 (각 시트 첫 8행)
        </h3>
        <p className="mb-2 text-xs text-slate-500">
          위 매핑 규칙으로 셀에서 읽어 표준 형태로 정리한 결과입니다.
        </p>
        <div className="space-y-3">
          {fs_summary.map((s) => (
            <SheetPreview key={s.sheetName} sheet={s} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SheetPreview({ sheet }: { sheet: FsSummary }) {
  return (
    <details className="rounded-lg border border-slate-200 bg-slate-50">
      <summary className="cursor-pointer px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
        {sheet.fs_div === "OFS" ? "별도" : "연결"} ·{" "}
        {SJ_LABEL[sheet.sj_div] || sheet.sj_div} ·{" "}
        <span className="font-mono">{sheet.sheetName}</span>{" "}
        <span className="text-slate-500">({sheet.rowCount}행)</span>
      </summary>
      <div className="overflow-x-auto bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-2 py-1 text-right">행</th>
              <th className="px-2 py-1 text-left">코드</th>
              <th className="px-2 py-1 text-left">계정과목명</th>
              <th className="px-2 py-1 text-right">당기금액</th>
              <th className="px-2 py-1 text-right">전기금액</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sheet.preview.map((p) => (
              <tr key={p.rowIndex}>
                <td className="px-2 py-1 text-right font-mono text-slate-400">
                  {p.rowIndex}
                </td>
                <td className="px-2 py-1 font-mono text-slate-500">
                  {p.account_id || "-"}
                </td>
                <td className="px-2 py-1 text-slate-900">{p.account_nm}</td>
                <td className="px-2 py-1 text-right font-mono">
                  {p.thstrm_amount != null
                    ? p.thstrm_amount.toLocaleString("ko-KR")
                    : "-"}
                </td>
                <td className="px-2 py-1 text-right font-mono text-slate-500">
                  {p.frmtrm_amount != null
                    ? p.frmtrm_amount.toLocaleString("ko-KR")
                    : "-"}
                </td>
              </tr>
            ))}
            {sheet.rowCount > sheet.preview.length && (
              <tr>
                <td
                  colSpan={5}
                  className="px-2 py-1 text-center text-xs text-slate-400"
                >
                  ... 외 {sheet.rowCount - sheet.preview.length}행
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function Stage2Rules({ report, onMappingAdded }: { report: ValidationReport; onMappingAdded: (newDict?: import("@/modules/standards").StandardDictionary) => void }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <StageHeader
        no={2}
        title="검증 룰 적용 단계"
        subtitle="각 룰이 어떤 데이터를 보고 어떻게 계산해 어떤 결과를 냈는지"
      />
      <div className="space-y-4">
        {report.ruleResults.map((r) => (
          <RuleCard key={r.rule_id} ruleResult={r} onMappingAdded={onMappingAdded} />
        ))}
      </div>
    </section>
  );
}

function RuleCard({
  ruleResult,
  onMappingAdded,
}: {
  ruleResult: ValidationReport["ruleResults"][number];
  onMappingAdded: (newDict?: import("@/modules/standards").StandardDictionary) => void;
}) {
  const statusStyle = {
    pass: "border-emerald-200 bg-emerald-50",
    fail: "border-rose-200 bg-rose-50",
    warn: "border-amber-200 bg-amber-50",
    skip: "border-slate-200 bg-slate-50",
  }[ruleResult.status];

  return (
    <div className={`rounded-lg border p-4 ${statusStyle}`}>
      <div className="mb-2 flex items-center gap-2">
        <StatusBadge status={ruleResult.status} />
        <span className="font-medium text-slate-900">
          {ruleResult.rule_name}
        </span>
        <span className="ml-auto font-mono text-xs text-slate-400">
          {ruleResult.rule_id}
        </span>
      </div>
      <p className="text-xs text-slate-700">{ruleResult.rule_description}</p>

      {ruleResult.traces.length > 0 && (
        <div className="mt-3 space-y-2">
          {ruleResult.traces.map((t, i) => (
            <TraceCard key={i} trace={t} />
          ))}
        </div>
      )}

      {ruleResult.issues.length > 0 && (
        <div className="mt-3 rounded-md bg-white/70 p-3">
          <p className="mb-1 text-xs font-semibold text-slate-700">
            발견된 이슈 {ruleResult.issues.length}건
          </p>
          <ul className="space-y-2 text-xs">
            {ruleResult.issues.map((iss, i) => (
              <li
                key={i}
                className={
                  iss.severity === "error"
                    ? "text-rose-700"
                    : iss.severity === "warning"
                      ? "text-amber-700"
                      : "text-slate-600"
                }
              >
                <div>• {iss.message}</div>
                {iss.action?.type === "register_mapping" && (
                  <RegisterMappingInline
                    issue={iss}
                    onMappingAdded={onMappingAdded}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RegisterMappingInline({
  issue,
  onMappingAdded,
}: {
  issue: ValidationReport["ruleResults"][number]["issues"][number];
  onMappingAdded: (newDict?: import("@/modules/standards").StandardDictionary) => void;
}) {
  const { dict, setDict } = useDictionary();
  const [open, setOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [query, setQuery] = useState("");

  if (!issue.action || issue.action.type !== "register_mapping") return null;
  const action = issue.action;
  const list: ListMaster | undefined = dict.lists.find(
    (l) => l.key === action.list_key,
  );

  const filtered = (list?.items ?? []).filter(
    (it) =>
      !query ||
      it.code.toLowerCase().includes(query.toLowerCase()) ||
      it.label.toLowerCase().includes(query.toLowerCase()),
  );

  function submit() {
    if (!selectedCode || !list) return;
    const newMapping: AccountMapping = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      list_key: action.list_key,
      external_value: action.external_value,
      standard_code: selectedCode,
      status: "pending",
      source: issue.ref?.sheet ?? "검증화면",
      created_at: new Date().toISOString(),
    };
    const newDict = {
      ...dict,
      accountMappings: [...dict.accountMappings, newMapping],
    };
    setDict(newDict);
    setOpen(false);
    onMappingAdded(newDict);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="ml-3 mt-1 rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-700 hover:border-slate-400 hover:bg-slate-50"
      >
        + 매핑 등록
      </button>
    );
  }

  return (
    <div className="ml-3 mt-2 rounded border border-slate-300 bg-white p-2 text-slate-700">
      <p className="mb-2 text-xs">
        외부 값 <span className="font-mono font-semibold">"{action.external_value}"</span>{" "}
        → 표준 코드 선택:
      </p>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="코드 또는 라벨 검색..."
        className="mb-2 w-full rounded border border-slate-300 px-2 py-1 text-xs"
      />
      <select
        value={selectedCode}
        onChange={(e) => setSelectedCode(e.target.value)}
        size={Math.min(6, filtered.length || 1)}
        className="mb-2 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
      >
        <option value="">— 선택 —</option>
        {filtered.map((it) => (
          <option key={it.code} value={it.code}>
            {it.code} · {it.label}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={!selectedCode}
          className="rounded bg-slate-900 px-3 py-1 text-xs text-white hover:bg-slate-800 disabled:opacity-50"
        >
          등록 (미확정)
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded border border-slate-300 px-3 py-1 text-xs hover:bg-slate-50"
        >
          취소
        </button>
      </div>
    </div>
  );
}

function TraceCard({ trace }: { trace: RuleTrace }) {
  const statusColor =
    trace.status === "match"
      ? "bg-emerald-100 text-emerald-700"
      : trace.status === "mismatch"
        ? "bg-rose-100 text-rose-700"
        : "bg-slate-200 text-slate-600";
  const statusLabel =
    trace.status === "match"
      ? "매치"
      : trace.status === "mismatch"
        ? "불일치"
        : "데이터 부족";

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 text-xs">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className={`rounded px-1.5 py-0.5 font-medium ${statusColor}`}
        >
          {statusLabel}
        </span>
        <span className="text-slate-500">{trace.scope_label}</span>
      </div>
      <div className="mb-2">
        <span className="text-slate-500">공식: </span>
        <span className="font-mono text-slate-900">{trace.formula}</span>
      </div>
      {trace.inputs.length > 0 && (
        <div className="mb-2">
          <p className="mb-1 text-slate-500">입력 데이터:</p>
          <ul className="ml-3 space-y-0.5">
            {trace.inputs.map((inp, i) => (
              <InputRow key={i} input={inp} />
            ))}
          </ul>
        </div>
      )}
      <div>
        <span className="text-slate-500">계산 결과: </span>
        <span className="font-mono text-slate-900">{trace.computation}</span>
      </div>
    </div>
  );
}

function InputRow({ input }: { input: TraceInput }) {
  return (
    <li className="flex flex-wrap items-baseline gap-1">
      <span className="text-slate-700">{input.label}</span>
      <span className="text-slate-400">=</span>
      <span className="font-mono text-slate-900">
        {input.value == null
          ? "(없음)"
          : typeof input.value === "number"
            ? input.value.toLocaleString("ko-KR")
            : input.value}
      </span>
      {input.ref?.row && (
        <span className="ml-1 text-slate-400">
          [행 {input.ref.row}
          {input.ref.account_nm ? ` · ${input.ref.account_nm}` : ""}]
        </span>
      )}
    </li>
  );
}

function Stage3Result({ report }: { report: ValidationReport }) {
  const { summary } = report;
  const hasFails = summary.failed > 0;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <StageHeader
        no={3}
        title="최종 결과"
        subtitle="모든 룰의 종합"
      />
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        <Pill color="emerald">통과 {summary.passed}</Pill>
        <Pill color="rose">실패 {summary.failed}</Pill>
        <Pill color="amber">경고 {summary.warnings}</Pill>
        <Pill color="slate">스킵 {summary.skipped}</Pill>
        <Pill color="slate">총 {summary.total_rules}</Pill>
      </div>
      <p
        className={`text-sm font-semibold ${
          hasFails ? "text-rose-700" : "text-emerald-700"
        }`}
      >
        {hasFails
          ? "⚠ 정합성 오류가 발견되었습니다. Step 2의 룰 카드에서 자세한 내용 확인."
          : "✓ 모든 필수 룰 통과 — 시트 간 정합성 OK"}
      </p>
    </section>
  );
}

function StageHeader({
  no,
  title,
  subtitle,
}: {
  no: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4 border-b border-slate-100 pb-3">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-900 font-mono text-xs text-white">
          {no}
        </span>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>
      <p className="mt-1 ml-9 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

function Pill({
  color,
  children,
}: {
  color: "emerald" | "rose" | "amber" | "slate";
  children: React.ReactNode;
}) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <span
      className={`rounded px-2.5 py-1 text-xs font-medium ${map[color]}`}
    >
      {children}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: "pass" | "fail" | "warn" | "skip";
}) {
  const map = {
    pass: { color: "bg-emerald-100 text-emerald-700", label: "✓ 통과" },
    fail: { color: "bg-rose-100 text-rose-700", label: "✗ 실패" },
    warn: { color: "bg-amber-100 text-amber-700", label: "⚠ 경고" },
    skip: { color: "bg-slate-100 text-slate-700", label: "— 스킵" },
  };
  const v = map[status];
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${v.color}`}>
      {v.label}
    </span>
  );
}
