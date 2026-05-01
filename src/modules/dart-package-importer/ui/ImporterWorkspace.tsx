"use client";

import { useEffect, useRef, useState } from "react";
import {
  REPRT_CODE_LABELS,
  type AvailabilityCheck,
  type CorpSearchHit,
  type ReprtCode,
} from "../domain/types";

const YEARS = ["2024", "2023", "2022", "2021", "2020"];

type CartItem = {
  id: string; // local uid
  corp: CorpSearchHit;
  year: string;
  reprt: ReprtCode;
  role: string;
  include_ofs: boolean;
  include_cfs: boolean;
  include_notes: boolean;
};

export default function ImporterWorkspace() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CorpSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingCorp, setPendingCorp] = useState<CorpSearchHit | null>(null);
  const [pendingYear, setPendingYear] = useState<string>("2023");
  const [pendingReprt, setPendingReprt] = useState<ReprtCode>("11011");
  const [pendingRole, setPendingRole] = useState<string>("모회사");
  const [pendingCheck, setPendingCheck] = useState<AvailabilityCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bundleResult, setBundleResult] = useState<
    { items: BundleItemReport[]; filename: string } | null
  >(null);
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
    setPendingCorp(corp);
    setHits([]);
    setQuery(corp.corp_name);
    setPendingCheck(null);
    setPendingRole(cart.length === 0 ? "모회사" : `자회사${cart.length}`);
    setError(null);
    await runCheck(corp, pendingYear, pendingReprt);
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
        setPendingCheck(null);
      } else {
        setPendingCheck(data.availability as AvailabilityCheck);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류");
    } finally {
      setChecking(false);
    }
  }

  async function changeYearOrReprt(
    nextYear: string,
    nextReprt: ReprtCode,
  ) {
    setPendingYear(nextYear);
    setPendingReprt(nextReprt);
    if (pendingCorp) {
      await runCheck(pendingCorp, nextYear, nextReprt);
    }
  }

  function addToCart() {
    if (!pendingCorp || !pendingCheck) return;
    if (!pendingCheck.hasOFS && !pendingCheck.hasCFS) {
      setError("이 회사·연도 조합은 데이터가 없어 cart에 담을 수 없습니다.");
      return;
    }
    const newItem: CartItem = {
      id: `${Date.now()}-${pendingCorp.corp_code}`,
      corp: pendingCorp,
      year: pendingYear,
      reprt: pendingReprt,
      role: pendingRole.trim() || "회사",
      include_ofs: pendingCheck.hasOFS,
      include_cfs: pendingCheck.hasCFS,
      include_notes: true,
    };
    setCart((prev) => [...prev, newItem]);
    // cart에 추가 후 다음 검색 위해 입력 비움 (역할은 기본값으로 진척)
    setPendingCorp(null);
    setPendingCheck(null);
    setQuery("");
    setPendingRole(`자회사${cart.length + 1}`);
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((c) => c.id !== id));
  }

  function updateCartItem(id: string, patch: Partial<CartItem>) {
    setCart((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  }

  async function handleBundleDownload() {
    if (cart.length === 0) return;
    setBuilding(true);
    setError(null);
    setBundleResult(null);
    try {
      const res = await fetch("/api/dart/build-bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((c) => ({
            corp_code: c.corp.corp_code,
            bsns_year: c.year,
            reprt_code: c.reprt,
            include_ofs: c.include_ofs,
            include_cfs: c.include_cfs,
            include_notes: c.include_notes,
            role: c.role,
          })),
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
      const filename = m ? decodeURIComponent(m[1]) : "consolbook-bundle.zip";
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      const manifestHeader = res.headers.get("X-Bundle-Manifest");
      if (manifestHeader) {
        try {
          const manifest = JSON.parse(decodeURIComponent(manifestHeader)) as {
            items: BundleItemReport[];
          };
          setBundleResult({ items: manifest.items, filename });
        } catch {
          // ignore
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "다운로드 실패");
    } finally {
      setBuilding(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-900">
        DART 연결패키지 임포터
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        DART에 공시된 한국 기업의 별도/연결 재무제표와 주석을 추출해 표준
        연결패키지 양식 .xlsx로 만듭니다. 모회사 + 자회사를 한꺼번에 cart에
        담아 .zip으로 받을 수도 있습니다.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* 좌측: 검색 + 미리보기 */}
        <div className="space-y-6">
          <Section step={1} title="회사 검색">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPendingCorp(null);
                setPendingCheck(null);
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

          {pendingCorp && (
            <Section step={2} title="연도 · 보고서 · 역할">
              <div className="flex flex-wrap gap-3">
                <select
                  value={pendingYear}
                  onChange={(e) => changeYearOrReprt(e.target.value, pendingReprt)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}년
                    </option>
                  ))}
                </select>
                <select
                  value={pendingReprt}
                  onChange={(e) =>
                    changeYearOrReprt(pendingYear, e.target.value as ReprtCode)
                  }
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {(Object.keys(REPRT_CODE_LABELS) as ReprtCode[]).map((c) => (
                    <option key={c} value={c}>
                      {REPRT_CODE_LABELS[c]}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={pendingRole}
                  onChange={(e) => setPendingRole(e.target.value)}
                  placeholder="역할 (예: 모회사, 자회사1)"
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </Section>
          )}

          {pendingCorp && (pendingCheck || checking) && (
            <Section step={3} title="가용성 확인">
              {checking && (
                <p className="text-sm text-slate-500">
                  DART에서 데이터 가용성 확인중…
                </p>
              )}
              {pendingCheck && <AvailabilityPanel a={pendingCheck} />}
              {pendingCheck && (pendingCheck.hasOFS || pendingCheck.hasCFS) && (
                <button
                  onClick={addToCart}
                  className="mt-4 rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
                >
                  + cart에 담기
                </button>
              )}
            </Section>
          )}

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              ⚠ {error}
            </div>
          )}

          {bundleResult && <BundleReportPanel report={bundleResult} />}
        </div>

        {/* 우측: cart */}
        <aside className="lg:sticky lg:top-6 self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">
              cart ({cart.length})
            </h2>
            {cart.length === 0 ? (
              <p className="text-xs text-slate-500">
                회사를 검색해서 cart에 담으세요. 1개면 단일 .xlsx, 여러 개면
                .zip으로 받습니다.
              </p>
            ) : (
              <ul className="space-y-3">
                {cart.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">
                          {item.corp.corp_name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.role} · {item.year}년 ·{" "}
                          {REPRT_CODE_LABELS[item.reprt]}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="제거"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="mt-2 flex gap-3 text-xs text-slate-700">
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={item.include_ofs}
                          onChange={(e) =>
                            updateCartItem(item.id, {
                              include_ofs: e.target.checked,
                            })
                          }
                        />
                        별도
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={item.include_cfs}
                          onChange={(e) =>
                            updateCartItem(item.id, {
                              include_cfs: e.target.checked,
                            })
                          }
                        />
                        연결
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={item.include_notes}
                          onChange={(e) =>
                            updateCartItem(item.id, {
                              include_notes: e.target.checked,
                            })
                          }
                        />
                        주석
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {cart.length > 0 && (
              <button
                onClick={handleBundleDownload}
                disabled={building}
                className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {building
                  ? `생성 중… (회사당 30~60초)`
                  : cart.length === 1
                    ? "단일 .xlsx 다운로드 (.zip 포장)"
                    : `📦 ${cart.length}개 회사 .zip 다운로드`}
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

type BundleItemReport = {
  corp_code: string;
  corp_name: string;
  bsns_year: string;
  reprt_code: string;
  ok: boolean;
  message: string;
  filename?: string;
};

function BundleReportPanel({
  report,
}: {
  report: { items: BundleItemReport[]; filename: string };
}) {
  const ok = report.items.filter((i) => i.ok).length;
  const fail = report.items.length - ok;
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <h3 className="mb-3 text-sm font-semibold text-emerald-900">
        ✓ 다운로드 완료: {report.filename}
      </h3>
      <p className="mb-3 text-xs text-emerald-800">
        성공 {ok} · 실패 {fail}
      </p>
      <ul className="space-y-1 text-xs">
        {report.items.map((it, i) => (
          <li
            key={i}
            className={
              it.ok ? "text-emerald-900" : "text-rose-700 font-medium"
            }
          >
            {it.ok ? "✓" : "✗"} {it.corp_name} · {it.bsns_year} ·{" "}
            {it.reprt_code}
            {it.ok ? "" : ` — ${it.message}`}
          </li>
        ))}
      </ul>
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
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
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
