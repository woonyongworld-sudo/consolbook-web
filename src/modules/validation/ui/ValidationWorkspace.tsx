"use client";

import { useRef, useState } from "react";
import type { ValidationReport } from "../domain/types";

type SubmitResult = {
  report: ValidationReport;
  fs_summary: Array<{
    fs_div: "OFS" | "CFS";
    sj_div: string;
    sheetName: string;
    rowCount: number;
  }>;
};

export default function ValidationWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [filename, setFilename] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleFile(file: File) {
    setSubmitting(true);
    setError(null);
    setResult(null);
    setFilename(file.name);
    try {
      const buf = await file.arrayBuffer();
      const res = await fetch("/api/validation/check", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: buf,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `검증 실패 (HTTP ${res.status})`);
      } else {
        setResult(data as SubmitResult);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setSubmitting(false);
    }
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-900">연결패키지 검증</h1>
      <p className="mt-2 text-sm text-slate-600">
        dart-package-importer가 만든 .xlsx 파일을 업로드하면 시트 간 정합성을
        점검합니다. 현재 활성 룰은 다음과 같습니다:
      </p>
      <ul className="mt-3 ml-5 list-disc space-y-1 text-sm text-slate-700">
        <li>
          <strong>BS 차대일치</strong> — 자산총계 = 부채총계 + 자본총계 (당기·전기)
        </li>
        <li>
          <strong>별도-연결 자본 정합성</strong> — 연결자본이 별도자본의 일정 비율 안에 있는지
        </li>
      </ul>

      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="mt-8 block cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center hover:border-slate-400 hover:bg-slate-50"
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
          dart-package-importer로 만든 파일을 권장
        </p>
      </label>

      {submitting && (
        <p className="mt-4 text-sm text-slate-500">검증 중…</p>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          ⚠ {error}
        </div>
      )}

      {result && (
        <ResultPanel result={result} filename={filename} />
      )}
    </div>
  );
}

function ResultPanel({
  result,
  filename,
}: {
  result: SubmitResult;
  filename: string;
}) {
  const { summary, ruleResults, meta } = result.report;
  const hasFails = summary.failed > 0;
  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">
          검증 결과 — {filename}
        </h2>
        <div className="mt-2 text-sm text-slate-600">
          {meta.corp_name && <span>{meta.corp_name} · </span>}
          {meta.bsns_year && <span>{meta.bsns_year}년 · </span>}
          {meta.reprt_code && <span>{meta.reprt_code}</span>}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Pill color="emerald">통과 {summary.passed}</Pill>
          <Pill color="rose">실패 {summary.failed}</Pill>
          <Pill color="amber">경고 {summary.warnings}</Pill>
          <Pill color="slate">스킵 {summary.skipped}</Pill>
          <Pill color="slate">총 {summary.total_rules}</Pill>
        </div>
        <p
          className={`mt-4 text-sm font-semibold ${
            hasFails ? "text-rose-700" : "text-emerald-700"
          }`}
        >
          {hasFails ? "⚠ 정합성 오류가 발견되었습니다." : "✓ 모든 필수 룰 통과"}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">룰별 결과</h3>
        <ul className="divide-y divide-slate-100">
          {ruleResults.map((r) => (
            <li key={r.rule_id} className="py-3">
              <div className="flex items-center gap-2">
                <StatusBadge status={r.status} />
                <span className="font-medium text-slate-900">{r.rule_name}</span>
                <span className="ml-auto font-mono text-xs text-slate-400">
                  {r.rule_id}
                </span>
              </div>
              {r.issues.length > 0 && (
                <ul className="mt-2 ml-2 space-y-1">
                  {r.issues.map((iss, i) => (
                    <li
                      key={i}
                      className={`text-xs ${
                        iss.severity === "error"
                          ? "text-rose-700"
                          : iss.severity === "warning"
                            ? "text-amber-700"
                            : "text-slate-600"
                      }`}
                    >
                      • {iss.message}
                      {iss.ref?.sheet && (
                        <span className="ml-2 font-mono text-slate-400">
                          [{iss.ref.sheet}
                          {iss.ref.row ? `:${iss.ref.row}` : ""}]
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          인식된 재무제표 시트
        </h3>
        <ul className="space-y-1 text-sm text-slate-700">
          {result.fs_summary.map((s, i) => (
            <li key={i}>
              {s.fs_div === "OFS" ? "별도" : "연결"} · {s.sj_div} ·{" "}
              <span className="font-mono text-xs text-slate-500">
                {s.sheetName}
              </span>{" "}
              ({s.rowCount}행)
            </li>
          ))}
        </ul>
      </div>
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

function StatusBadge({ status }: { status: "pass" | "fail" | "warn" | "skip" }) {
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
