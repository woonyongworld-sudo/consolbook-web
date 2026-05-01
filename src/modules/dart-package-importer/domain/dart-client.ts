import type {
  AvailabilityCheck,
  DartFsRow,
  FsDiv,
  ReprtCode,
} from "./types";

const DART_BASE = "https://opendart.fss.or.kr/api";

function getApiKey(): string {
  const key = process.env.DART_API_KEY;
  if (!key) {
    throw new Error(
      "DART_API_KEY 환경변수가 설정되어 있지 않습니다. .env.local 또는 Vercel 환경변수를 확인하세요.",
    );
  }
  return key;
}

type DartListResponse<T> = {
  status: string;
  message: string;
  list?: T[];
};

export async function fetchFs(params: {
  corp_code: string;
  bsns_year: string;
  reprt_code: ReprtCode;
  fs_div: FsDiv;
}): Promise<DartFsRow[]> {
  const url = new URL(`${DART_BASE}/fnlttSinglAcntAll.json`);
  url.searchParams.set("crtfc_key", getApiKey());
  url.searchParams.set("corp_code", params.corp_code);
  url.searchParams.set("bsns_year", params.bsns_year);
  url.searchParams.set("reprt_code", params.reprt_code);
  url.searchParams.set("fs_div", params.fs_div);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`DART FS fetch failed: ${res.status}`);
  }
  const json = (await res.json()) as DartListResponse<DartFsRow>;
  if (json.status === "013") return []; // 데이터 없음
  if (json.status !== "000") {
    throw new Error(`DART error ${json.status}: ${json.message}`);
  }
  return json.list ?? [];
}

export async function checkAvailability(params: {
  corp_code: string;
  corp_name: string;
  bsns_year: string;
  reprt_code: ReprtCode;
}): Promise<AvailabilityCheck> {
  const [ofsRows, cfsRows] = await Promise.all([
    fetchFs({ ...params, fs_div: "OFS" }),
    fetchFs({ ...params, fs_div: "CFS" }),
  ]);

  const hasOFS = ofsRows.length > 0;
  const hasCFS = cfsRows.length > 0;
  const rcept_no = ofsRows[0]?.rcept_no ?? cfsRows[0]?.rcept_no;
  const hasNotes = await checkDocumentAvailable({ rcept_no });

  return {
    corp_code: params.corp_code,
    corp_name: params.corp_name,
    bsns_year: params.bsns_year,
    reprt_code: params.reprt_code,
    hasOFS,
    hasCFS,
    hasNotes,
    rcept_no,
    message: buildAvailabilityMessage({ hasOFS, hasCFS, hasNotes }),
  };
}

async function checkDocumentAvailable(params: {
  rcept_no?: string;
}): Promise<boolean> {
  if (!params.rcept_no) return false;
  // document.xml은 ZIP을 반환. 데이터 없으면 status 코드 또는 짧은 응답.
  // 가용성 단계에서 ZIP 전체 다운로드는 무거우므로 실 추출은 build 단계에서.
  // 여기서는 사업보고서 데이터(FS) 존재 = 같은 rcept_no의 document.xml 존재한다고 가정.
  return true;
}

function buildAvailabilityMessage(flags: {
  hasOFS: boolean;
  hasCFS: boolean;
  hasNotes: boolean;
}): string {
  if (!flags.hasOFS && !flags.hasCFS) {
    return "이 회사는 해당 연도의 사업보고서 재무제표 데이터가 DART에 없습니다.";
  }
  const fs: string[] = [];
  if (flags.hasOFS) fs.push("별도");
  if (flags.hasCFS) fs.push("연결");
  const notes = flags.hasNotes
    ? "주석은 사업보고서 본문에서 자동 추출 시도됨"
    : "주석 데이터 없음 — 빈 시트로 생성됩니다";
  return `재무제표: ${fs.join(", ")} / ${notes}`;
}

export async function fetchDocumentZip(params: {
  rcept_no: string;
}): Promise<ArrayBuffer | null> {
  const url = new URL(`${DART_BASE}/document.xml`);
  url.searchParams.set("crtfc_key", getApiKey());
  url.searchParams.set("rcept_no", params.rcept_no);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  const view = new Uint8Array(buf.slice(0, 4));
  if (view[0] !== 0x50 || view[1] !== 0x4b) return null;
  return buf;
}
