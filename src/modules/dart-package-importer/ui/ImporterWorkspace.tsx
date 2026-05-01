"use client";

import { useEffect, useRef, useState } from "react";
import {
  REPRT_CODE_LABELS,
  type AvailabilityCheck,
  type CorpSearchHit,
  type ReprtCode,
} from "../domain/types";

const YEARS = ["2024", "2023", "2022", "2021", "2020"];

export default function ImporterWorkspace() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CorpSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<CorpSearchHit | null>(null);
  const [year, setYear] = useState<string>("2023");
  const [reprt, setReprt] = useState<ReprtCode>("11011");
  const [check, setCheck] = useState<AvailabilityCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeNotes, setIncludeNotes] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/dart/search?q=${encodeURIComponent(query.trim())}`,
        );
        const data = (await res.json()) as { hits: CorpSearchHit[] };
        setHits(data.hits);
      } finally {
        setSearching(false);
      }
    }, 250);
  }, [query]);

  async function handleSelect(corp: CorpSearchHit) {
    setSelected(corp);
    setHits([]);
    setQuery(corp.corp_name);
    setCheck(null);
    setError(null);
    await runCheck(corp, year, reprt);
  }

  async function runCheck(
    corp: CorpSearchHit,
    bsns_year: string,
    reprt_code: ReprtCode,
  ) {
    setChecking(true);
    setError(null);
    try {
      const url = `/api/dart/check?corp_code=${corp.corp_code}&bsns_year=${bsns_year}&reprt_code=${reprt_code}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "확인 중 오류");
        setCheck(null);
      } else {
        setCheck(data.availability as AvailabilityCheck);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류");
    } finally {
      setChecking(false);
    }
  }

  async function handleYearOrReprtChange(
    nextYear: string,
    nextReprt: ReprtCode,
  ) {
    setYear(nextYear);
    setReprt(nextReprt);
    if (selected) {
      await runCheck(selected, nextYear, nextReprt);
    }
  }

  async function handleBuild() {
    if (!selected || !check) return;
    setBuilding(true);
    setError(null);
    try {
      const res = await fetch("/api/dart/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corp_code: selected.corp_code,
          bsns_year: year,
          reprt_code: reprt,
          include_ofs: true,
          include_cfs: true,
          include_notes: includeNotes,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `빌드 실패 (HTTP ${res.status})`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename\*=UTF-8''([^;]+)/);
      a.download = m ? decodeURIComponent(m[1]) : "consolbook-package.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "다운로드 실패");
    } finally {
      setBuilding(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-900">DART 연결패키지 임포터</h1>
      <p className="mt-2 text-sm text-slate-600">
        DART 공시 회사를 검색하고 연도·보고서를 선택하면, 별도/연결 재무제표와
        주석을 시트로 분리한 .xlsx 샘플 파일을 자동 생성합니다.
      </p>

      <Section step={1} title="회사 검색">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setCheck(null);
          }}
          placeholder="회사명 입력 (예: 키움증권)"
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base focus:border-slate-500 focus:outline-none"
        />
        {searching && (
          <p className="mt-2 text-xs text-slate-500">검색중…</p>
        )}
        {hits.length > 0 && (
          <ul className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white">
            {hits.map((c) => (
              <li
                key={c.corp_code}
                onClick={() => handleSelect(c)}
                className="cursor-pointer border-b border-slate-100 px-4 py-2 text-sm last:border-b-0 hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">
                    {c.corp_name}
                  </span>
                  {c.is_listed ? (
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                      상장 {c.stock_code}
                    </span>
                  ) : (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                      비상장
                    </span>
                  )}
                  <span className="ml-auto font-mono text-xs text-slate-400">
                    {c.corp_code} · 갱신 {formatDate(c.modify_date)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {selected && (
        <Section step={2} title="연도 · 보고서 선택">
          <div className="flex flex-wrap gap-3">
            <select
              value={year}
              onChange={(e) => handleYearOrReprtChange(e.target.value, reprt)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
            <select
              value={reprt}
              onChange={(e) =>
                handleYearOrReprtChange(year, e.target.value as ReprtCode)
              }
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {(Object.keys(REPRT_CODE_LABELS) as ReprtCode[]).map((c) => (
                <option key={c} value={c}>
                  {REPRT_CODE_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
        </Section>
      )}

      {selected && (check || checking) && (
        <Section step={3} title="가용성 확인">
          {checking && (
            <p className="text-sm text-slate-500">
              DART에서 데이터 가용성 확인중…
            </p>
          )}
          {check && <AvailabilityPanel a={check} />}
        </Section>
      )}

      {selected && check && (check.hasOFS || check.hasCFS) && (
        <Section step={4} title="패키지 생성">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={includeNotes}
              onChange={(e) => setIncludeNotes(e.target.checked)}
              disabled={!check.hasNotes}
            />
            <span>
              주석 시트 포함{" "}
              {!check.hasNotes && (
                <span className="text-slate-400">
                  (주석 데이터 없는 회사라 빈 시트로만 생성됨)
                </span>
              )}
            </span>
          </label>
          <button
            onClick={handleBuild}
            disabled={building}
            className="mt-4 rounded-lg bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {building ? "생성 중… (XBRL 다운로드 시 30~60초)" : "엑셀 패키지 다운로드"}
          </button>
        </Section>
      )}

      {error && (
        <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          ⚠ {error}
        </div>
      )}
    </div>
  );
}

function Section({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">
        <span className="mr-2 inline-block rounded-full bg-slate-900 px-2 py-0.5 text-xs font-mono text-white">
          {step}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function AvailabilityPanel({ a }: { a: AvailabilityCheck }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <Badge ok={a.hasOFS} label="별도 재무제표" />
        <Badge ok={a.hasCFS} label="연결 재무제표" />
        <Badge ok={a.hasNotes} label="주석 자동추출 시도" />
      </div>
      <p className="text-slate-600">{a.message}</p>
      {a.rcept_no && (
        <p className="font-mono text-xs text-slate-400">
          접수번호: {a.rcept_no}
        </p>
      )}
    </div>
  );
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded px-2 py-1 text-xs font-medium ${
        ok ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}

function formatDate(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}
