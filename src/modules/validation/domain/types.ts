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
    rows: NormalizedRow[];
  }[];
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
};

export type Rule = {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  scope: "fs" | "cross_sheet";
  check: (ctx: ValidationContext) => Issue[];
};

export type ValidationReport = {
  ruleResults: Array<{
    rule_id: string;
    rule_name: string;
    severity: Severity;
    status: "pass" | "fail" | "warn" | "skip";
    issues: Issue[];
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
