// 검증 도메인 — 룰 엔진 코어 타입.
// 본 모듈은 dart-package-importer가 만든 .xlsx의 정합성 검증을 시작점으로
// 합니다. 향후 다른 입력원(연결정산표, 분개 데이터 등)도 같은 룰 인터페이스로 처리.

export type Severity = "error" | "warning" | "info";

export type SourceRef = {
  sheet?: string;
  row?: number;
  col?: number | string;
  cell?: string; // "A5"
  account_id?: string;
  account_nm?: string;
};

export type Issue = {
  rule_id: string;
  severity: Severity;
  message: string;
  ref?: SourceRef;
  expected?: number | string;
  actual?: number | string;
  diff?: number;
};

export type ValidationContext = {
  // 정규화된 재무제표 데이터
  fs: {
    fs_div: "OFS" | "CFS";
    sj_div: "BS" | "IS" | "CIS" | "CF" | "SCE";
    sheetName: string;
    standardType: string; // 사전 참조용 (BS, IS, ...)
    rows: NormalizedRow[];
  }[];
  // v3: 표준 사전 (룰이 헤더 validation·목록 마스터 참조)
  dict?: import("@/modules/standards").StandardDictionary;
  // 메타 정보
  meta: {
    corp_name?: string;
    bsns_year?: string;
    reprt_code?: string;
  };
};

export type NormalizedRow = {
  account_id: string;
  account_nm: string;
  thstrm_amount?: number;
  frmtrm_amount?: number;
  bfefrmtrm_amount?: number;
  rowIndex: number; // 1-based row in sheet
  // 사용자 매핑으로 추출된 모든 표준 키별 값.
  // 표준 사전이 추가하는 새 헤더(예: dr_cr, activity)도 여기 들어감.
  values?: Record<string, string | number | null>;
};

// 룰이 무엇을 어떻게 검증했는지의 자취. 통과/실패와 무관하게 항상 생성되어
// 사용자가 "어떤 데이터를 어떻게 검사했는지" 직접 볼 수 있게 함.
export type RuleTrace = {
  formula: string; // 사람이 읽을 수 있는 룰 공식 (예: "자산총계 = 부채총계 + 자본총계")
  scope_label: string; // 적용 범위 (예: "별도 BS · 당기금액")
  inputs: TraceInput[]; // 룰이 본 입력 데이터
  computation: string; // 실제 연산 표현 (예: "12,345 = 5,678 + 6,667 (차이 0)")
  status: "match" | "mismatch" | "missing"; // 매치/불일치/데이터 부족
  diff?: number;
};

export type TraceInput = {
  label: string; // 데이터 항목명 (예: "자산총계")
  value: number | string | null;
  ref?: SourceRef; // 출처 (시트/행)
};

export type RuleResult = {
  issues: Issue[]; // 발견된 문제 (없으면 빈 배열)
  traces: RuleTrace[]; // 검증 자취 (룰이 실제로 본 데이터·연산)
};

export type Rule = {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  scope: "fs" | "cross_sheet";
  check: (ctx: ValidationContext) => RuleResult;
};

export type ValidationReport = {
  ruleResults: Array<{
    rule_id: string;
    rule_name: string;
    rule_description: string;
    severity: Severity;
    status: "pass" | "fail" | "warn" | "skip";
    issues: Issue[];
    traces: RuleTrace[];
  }>;
  summary: {
    total_rules: number;
    passed: number;
    failed: number;
    warnings: number;
    skipped: number;
  };
  meta: ValidationContext["meta"];
  generated_at: string;
};
