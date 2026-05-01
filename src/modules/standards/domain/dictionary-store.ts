"use client";

import { useEffect, useState, useCallback } from "react";
import type { StandardDictionary, StandardSheetSpec } from "./types";
import { DEFAULT_DICTIONARY } from "../data/default-dictionary";

const STORAGE_KEY = "consolbook.standards.v1";

// 사용자 디바이스의 localStorage에 표준 사전을 저장·관리.
// 브라우저 단위 — 다른 디바이스/브라우저와 공유 X. 향후 DB 도입 시 서버 저장으로 이전.

export function loadDictionary(): StandardDictionary {
  if (typeof window === "undefined") return DEFAULT_DICTIONARY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DICTIONARY;
    const parsed = JSON.parse(raw) as StandardDictionary;
    if (!parsed || !Array.isArray(parsed.sheets)) return DEFAULT_DICTIONARY;
    // v3 호환성: lists 필드 없는 구버전 사전이면 디폴트 마스터 보충
    if (!Array.isArray(parsed.lists)) {
      return { ...parsed, lists: DEFAULT_DICTIONARY.lists };
    }
    return parsed;
  } catch {
    return DEFAULT_DICTIONARY;
  }
}

export function saveDictionary(dict: StandardDictionary): void {
  if (typeof window === "undefined") return;
  const next: StandardDictionary = {
    ...dict,
    updated_at: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  // 다른 컴포넌트에 알림 (custom event)
  window.dispatchEvent(new CustomEvent("consolbook-standards-updated"));
}

export function resetDictionary(): StandardDictionary {
  if (typeof window === "undefined") return DEFAULT_DICTIONARY;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("consolbook-standards-updated"));
  return DEFAULT_DICTIONARY;
}

// React hook — 컴포넌트에서 사용
export function useDictionary(): {
  dict: StandardDictionary;
  setDict: (next: StandardDictionary) => void;
  reset: () => void;
} {
  const [dict, setLocal] = useState<StandardDictionary>(() => loadDictionary());

  useEffect(() => {
    const handler = () => setLocal(loadDictionary());
    window.addEventListener("consolbook-standards-updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("consolbook-standards-updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const setDict = useCallback((next: StandardDictionary) => {
    saveDictionary(next);
    setLocal({ ...next, updated_at: new Date().toISOString() });
  }, []);

  const reset = useCallback(() => {
    const fresh = resetDictionary();
    setLocal(fresh);
  }, []);

  return { dict, setDict, reset };
}

// 시트 유형으로 spec 조회
export function findSheetSpec(
  dict: StandardDictionary,
  type: string,
): StandardSheetSpec | undefined {
  return dict.sheets.find((s) => s.type === type);
}
