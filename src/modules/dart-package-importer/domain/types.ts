export type CorpCode = {
  corp_code: string; // 8자리
  corp_name: string;
  stock_code: string; // 6자리 (상장사만 채워짐)
  modify_date: string; // YYYYMMDD
};

export type CorpSearchHit = CorpCode & {
  is_listed: boolean;
};

export type AvailabilityCheck = {
  corp_code: string;
  corp_name: string;
  bsns_year: string;
  reprt_code: ReprtCode;
  hasOFS: boolean; // 별도 재무제표 데이터 있는지
  hasCFS: boolean; // 연결 재무제표 데이터 있는지
  hasNotes: boolean; // 사업보고서 본문(document.xml)에서 주석 추출 가능한지
  rcept_no?: string; // 사업보고서 접수번호 (document/XBRL 가져올 때 필요)
  message: string; // 사용자에게 보여줄 안내
};

export type ReprtCode = "11011" | "11012" | "11013" | "11014";

export const REPRT_CODE_LABELS: Record<ReprtCode, string> = {
  "11011": "사업보고서",
  "11012": "반기보고서",
  "11013": "1분기보고서",
  "11014": "3분기보고서",
};

export type FsDiv = "OFS" | "CFS";

export const FS_DIV_LABELS: Record<FsDiv, string> = {
  OFS: "별도재무제표",
  CFS: "연결재무제표",
};

// DART /api/fnlttSinglAcntAll.json 응답 단일 행
export type DartFsRow = {
  rcept_no: string;
  reprt_code: string;
  bsns_year: string;
  corp_code: string;
  fs_div: FsDiv;
  fs_nm: string;
  sj_div: SjDiv; // BS / IS / CIS / CF / SCE
  sj_nm: string;
  account_id?: string;
  account_nm: string;
  account_detail?: string;
  thstrm_nm: string;
  thstrm_dt: string;
  thstrm_amount: string;
  frmtrm_nm?: string;
  frmtrm_dt?: string;
  frmtrm_amount?: string;
  bfefrmtrm_nm?: string;
  bfefrmtrm_dt?: string;
  bfefrmtrm_amount?: string;
  ord: string;
  currency: string;
};

export type SjDiv = "BS" | "IS" | "CIS" | "CF" | "SCE";

export const SJ_DIV_LABELS: Record<SjDiv, string> = {
  BS: "재무상태표",
  IS: "손익계산서",
  CIS: "포괄손익계산서",
  CF: "현금흐름표",
  SCE: "자본변동표",
};

// XBRL 주석에서 추출한 한 섹션
export type NoteSection = {
  concept_id: string; // 예: ifrs-full:DescriptionOfAccountingPoliciesAppliedTextBlock
  title: string; // 한국어 라벨
  html: string; // TextBlock 안의 HTML 원문
  plain_text: string; // dehtmlized 텍스트
};

export type BuildPackageRequest = {
  corp_code: string;
  bsns_year: string;
  reprt_code: ReprtCode;
  include_ofs: boolean;
  include_cfs: boolean;
  include_notes: boolean;
};
