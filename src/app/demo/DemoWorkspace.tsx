"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Papa from "papaparse";
import { type FileTypeKey, type UploadedFile } from "@/modules/types";
import {
  FilesPanel,
  ResultTable,
  consolidate,
  guessType,
  toCsv,
} from "@/modules/consolidation";
import { SAMPLE_FILES } from "@/samples/sample-data";

const REQUIRED_COLS = ["표준계정과목코드", "표준계정과목명", "금액"] as const;

export default function DemoWorkspace() {
  const searchParams = useSearchParams();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sampleLoadedRef = useRef(false);

  useEffect(() => {
    if (sampleLoadedRef.current) return;
    if (searchParams.get("sample") === "1") {
      setFiles(SAMPLE_FILES);
      sampleLoadedRef.current = true;
    }
  }, [searchParams]);

  const consolidatedRows = useMemo(() => consolidate(files), [files]);
  const hasResult = files.length > 0;

  function loadSample() {
    setFiles(SAMPLE_FILES);
    setErrors([]);
  }

  function clearAll() {
    setFiles([]);
    setErrors([]);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files;
    if (!picked || picked.length === 0) return;
    const newErrors: string[] = [];
    const newFiles: UploadedFile[] = [];

    Array.from(picked).forEach((rawFile, idx) => {
      Papa.parse<Record<string, string>>(rawFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const missing = REQUIRED_COLS.filter(
            (c) => !(results.meta.fields ?? []).includes(c),
          );
          if (missing.length > 0) {
            newErrors.push(
              `${rawFile.name}: 필수 컬럼 누락 — ${missing.join(", ")}`,
            );
          } else {
            newFiles.push({
              id: `${Date.now()}-${idx}-${rawFile.name}`,
              name: rawFile.name,
              type: guessType(rawFile.name),
              rows: results.data.map((r) => ({
                회사명: r["회사명"] ?? "",
                계정과목: r["계정과목"] ?? "",
                금액: Number(r["금액"]) || 0,
                표준계정과목코드: String(r["표준계정과목코드"] ?? "").trim(),
                표준계정과목명: String(r["표준계정과목명"] ?? "").trim(),
              })),
            });
          }
          if (
            newErrors.length + newFiles.length ===
            (picked?.length ?? 0)
          ) {
            setFiles((prev) => [...prev, ...newFiles]);
            setErrors(newErrors);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }
        },
        error: (err) => {
          newErrors.push(`${rawFile.name}: 파싱 실패 — ${err.message}`);
        },
      });
    });
  }

  function changeType(id: string, type: FileTypeKey) {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, type } : f)));
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function downloadCsv() {
    const csv = toCsv(consolidatedRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "연결정산표.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-900">연결정산표 데모</h1>
      <p className="mt-2 text-sm text-slate-600">
        CSV 파일을 업로드하고 각 파일의 구분(모회사·자회사·연결조정·내부거래)을
        지정하면 아래에 연결정산표가 자동으로 표시됩니다.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={loadSample}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          샘플 데이터 불러오기
        </button>
        <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50">
          CSV 파일 추가
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
        </label>
        {hasResult && (
          <button
            onClick={clearAll}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
          >
            전체 비우기
          </button>
        )}
        {hasResult && (
          <button
            onClick={downloadCsv}
            className="ml-auto rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            ⬇ 연결정산표 CSV 다운로드
          </button>
        )}
      </div>

      {errors.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {errors.map((e, i) => (
            <div key={i}>⚠ {e}</div>
          ))}
        </div>
      )}

      <FilesPanel
        files={files}
        onChangeType={changeType}
        onRemove={removeFile}
      />

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">
          📊 연결정산표
        </h2>
        {hasResult ? (
          <ResultTable rows={consolidatedRows} />
        ) : (
          <EmptyState />
        )}
      </div>

      <FormatHint />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <p className="text-slate-500">
        파일을 업로드하거나 위의 <strong>샘플 데이터 불러오기</strong>를
        눌러보세요.
      </p>
    </div>
  );
}

function FormatHint() {
  return (
    <details className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
      <summary className="cursor-pointer font-semibold text-slate-900">
        CSV 형식 안내
      </summary>
      <div className="mt-3 space-y-2">
        <p>각 CSV 파일은 다음 컬럼을 포함해야 합니다:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <code className="rounded bg-slate-100 px-1">표준계정과목코드</code>{" "}
            (필수)
          </li>
          <li>
            <code className="rounded bg-slate-100 px-1">표준계정과목명</code>{" "}
            (필수)
          </li>
          <li>
            <code className="rounded bg-slate-100 px-1">금액</code> (필수, 숫자)
          </li>
          <li>
            <code className="rounded bg-slate-100 px-1">회사명</code>,{" "}
            <code className="rounded bg-slate-100 px-1">계정과목</code> (선택)
          </li>
        </ul>
        <p className="pt-2">
          파일별로 구분(A1~B2)을 지정하면, 동일한 표준계정과목코드를 가진 행이
          자동으로 합산됩니다.
        </p>
      </div>
    </details>
  );
}
