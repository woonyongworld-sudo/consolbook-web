import type {
  Issue,
  NormalizedRow,
  Rule,
  RuleResult,
  RuleTrace,
  TraceInput,
  ValidationContext,
} from "./types";

const TOLERANCE = 1; // 원 단위 — 반올림 차이 흡수

const ASSET_TOTAL_KEYWORDS = ["자산총계"];
const LIAB_TOTAL_KEYWORDS = ["부채총계"];
const EQUITY_TOTAL_KEYWORDS = ["자본총계"];

export const RULES: Rule[] = [
  {
    id: "BS_BALANCE_THSTRM",
    name: "BS 차대일치 (당기)",
    description:
      "재무상태표에서 자산총계 = 부채총계 + 자본총계 (당기금액)을 검증합니다.",
    severity: "error",
    scope: "fs",
    check: (ctx) => bsBalanceCheck(ctx, "thstrm_amount", "당기"),
  },
  {
    id: "BS_BALANCE_FRMTRM",
    name: "BS 차대일치 (전기)",
    description:
      "재무상태표에서 자산총계 = 부채총계 + 자본총계 (전기금액)을 검증합니다. 전기 데이터가 없을 수 있으므로 severity는 warning.",
    severity: "warning",
    scope: "fs",
    check: (ctx) => bsBalanceCheck(ctx, "frmtrm_amount", "전기"),
  },
  {
    id: "OFS_CFS_EQUITY_REASONABLE",
    name: "별도-연결 자본 정합성",
    description:
      "별도 자본총계와 연결 자본총계의 비율이 합리적인지 점검합니다. 일반적으로 연결자본은 별도자본 이상이어야 하며, 5배를 초과하면 입력 오류일 가능성이 있습니다.",
    severity: "warning",
    scope: "cross_sheet",
    check: ofsCfsEquityCheck,
  },
];

type AmountField = "thstrm_amount" | "frmtrm_amount" | "bfefrmtrm_amount";

function normalizeKor(s: string): string {
  return s.replace(/[\s　]+/g, "");
}

function findRowByKeywords(
  rows: NormalizedRow[],
  keywords: string[],
): NormalizedRow | null {
  const normKeys = keywords.map(normalizeKor);
  for (const r of rows) {
    const normCell = normalizeKor(r.account_nm);
    if (normKeys.some((k) => normCell.includes(k))) return r;
  }
  return null;
}

function bsBalanceCheck(
  ctx: ValidationContext,
  field: AmountField,
  label: string,
): RuleResult {
  const issues: Issue[] = [];
  const traces: RuleTrace[] = [];
  const bsSheets = ctx.fs.filter((s) => s.sj_div === "BS");

  if (bsSheets.length === 0) {
    traces.push({
      formula: "자산총계 = 부채총계 + 자본총계",
      scope_label: `재무상태표 (${label})`,
      inputs: [],
      computation: "재무상태표 시트가 없어 검증할 수 없습니다.",
      status: "missing",
    });
    return { issues, traces };
  }

  for (const bs of bsSheets) {
    const fsLabel = bs.fs_div === "OFS" ? "별도" : "연결";
    const asset = findRowByKeywords(bs.rows, ASSET_TOTAL_KEYWORDS);
    const liab = findRowByKeywords(bs.rows, LIAB_TOTAL_KEYWORDS);
    const equity = findRowByKeywords(bs.rows, EQUITY_TOTAL_KEYWORDS);

    const a = asset?.[field] ?? null;
    const l = liab?.[field] ?? null;
    const e = equity?.[field] ?? null;

    const inputs: TraceInput[] = [
      buildInput("자산총계", asset, field),
      buildInput("부채총계", liab, field),
      buildInput("자본총계", equity, field),
    ];

    if (a == null || l == null || e == null) {
      const missingNames: string[] = [];
      if (!asset || a == null) missingNames.push("자산총계");
      if (!liab || l == null) missingNames.push("부채총계");
      if (!equity || e == null) missingNames.push("자본총계");
      traces.push({
        formula: "자산총계 = 부채총계 + 자본총계",
        scope_label: `${fsLabel} BS · ${label}`,
        inputs,
        computation: `필요 데이터 누락: ${missingNames.join(", ")} (검증 스킵)`,
        status: "missing",
      });
      issues.push({
        rule_id: "BS_BALANCE_" + field,
        severity: "warning",
        message: `${fsLabel} BS에서 ${missingNames.join(", ")} 행을 찾지 못했거나 ${label} 금액이 비어있습니다.`,
        ref: { sheet: bs.sheetName },
      });
      continue;
    }

    const sum = l + e;
    const diff = a - sum;
    const isMatch = Math.abs(diff) <= TOLERANCE;

    traces.push({
      formula: "자산총계 = 부채총계 + 자본총계",
      scope_label: `${fsLabel} BS · ${label}`,
      inputs,
      computation: `${fmt(a)} ${isMatch ? "=" : "≠"} ${fmt(l)} + ${fmt(e)} (= ${fmt(sum)}) ${isMatch ? "✓" : "차이 " + fmt(diff)}`,
      status: isMatch ? "match" : "mismatch",
      diff: isMatch ? 0 : diff,
    });

    if (!isMatch) {
      issues.push({
        rule_id: "BS_BALANCE",
        severity: "error",
        message: `${fsLabel} BS ${label}: 자산총계 ${fmt(a)} ≠ 부채총계+자본총계 ${fmt(sum)} (차이 ${fmt(diff)})`,
        ref: {
          sheet: bs.sheetName,
          row: asset!.rowIndex,
          account_nm: asset!.account_nm,
        },
        expected: sum,
        actual: a,
        diff,
      });
    }
  }
  return { issues, traces };
}

function ofsCfsEquityCheck(ctx: ValidationContext): RuleResult {
  const issues: Issue[] = [];
  const traces: RuleTrace[] = [];
  const ofsBS = ctx.fs.find((s) => s.sj_div === "BS" && s.fs_div === "OFS");
  const cfsBS = ctx.fs.find((s) => s.sj_div === "BS" && s.fs_div === "CFS");

  if (!ofsBS || !cfsBS) {
    traces.push({
      formula: "0.5 ≤ (연결 자본총계 / 별도 자본총계) ≤ 5",
      scope_label: "별도 BS ↔ 연결 BS",
      inputs: [],
      computation: !ofsBS
        ? "별도 BS가 없습니다."
        : "연결 BS가 없습니다.",
      status: "missing",
    });
    return { issues, traces };
  }

  const ofsEq = findRowByKeywords(ofsBS.rows, EQUITY_TOTAL_KEYWORDS);
  const cfsEq = findRowByKeywords(cfsBS.rows, EQUITY_TOTAL_KEYWORDS);
  const ofs = ofsEq?.thstrm_amount ?? null;
  const cfs = cfsEq?.thstrm_amount ?? null;

  const inputs: TraceInput[] = [
    buildInput("별도 자본총계", ofsEq, "thstrm_amount"),
    buildInput("연결 자본총계", cfsEq, "thstrm_amount"),
  ];

  if (ofs == null || cfs == null) {
    traces.push({
      formula: "0.5 ≤ (연결 자본총계 / 별도 자본총계) ≤ 5",
      scope_label: "별도 BS ↔ 연결 BS",
      inputs,
      computation: "자본총계 행을 한쪽 또는 양쪽에서 찾지 못해 비교할 수 없습니다.",
      status: "missing",
    });
    return { issues, traces };
  }

  if (ofs <= 0) {
    traces.push({
      formula: "0.5 ≤ (연결 자본총계 / 별도 자본총계) ≤ 5",
      scope_label: "별도 BS ↔ 연결 BS",
      inputs,
      computation: `별도 자본총계가 0 이하 (${fmt(ofs)}) — 비율 계산 불가, 검증 스킵.`,
      status: "missing",
    });
    return { issues, traces };
  }

  const ratio = cfs / ofs;
  const isOk = ratio >= 0.5 && ratio <= 5;
  const computation = `연결 ${fmt(cfs)} / 별도 ${fmt(ofs)} = ${ratio.toFixed(2)}배 ${isOk ? "(범위 0.5~5 안 ✓)" : "(범위 벗어남)"}`;

  traces.push({
    formula: "0.5 ≤ (연결 자본총계 / 별도 자본총계) ≤ 5",
    scope_label: "별도 BS ↔ 연결 BS · 당기",
    inputs,
    computation,
    status: isOk ? "match" : "mismatch",
    diff: cfs - ofs,
  });

  if (ratio < 0.5) {
    issues.push({
      rule_id: "OFS_CFS_EQUITY",
      severity: "warning",
      message: `연결 자본총계(${fmt(cfs)})가 별도 자본총계(${fmt(ofs)})의 50% 미만 — 일반적으로 연결자본은 별도자본 이상.`,
      ref: { sheet: cfsBS.sheetName },
      expected: ofs,
      actual: cfs,
      diff: cfs - ofs,
    });
  } else if (ratio > 5) {
    issues.push({
      rule_id: "OFS_CFS_EQUITY",
      severity: "warning",
      message: `연결 자본총계가 별도 자본총계의 5배 초과 (비율 ${ratio.toFixed(2)}) — 데이터 입력 오류 가능.`,
      ref: { sheet: cfsBS.sheetName },
      expected: ofs,
      actual: cfs,
      diff: cfs - ofs,
    });
  }

  return { issues, traces };
}

function buildInput(
  label: string,
  row: NormalizedRow | null,
  field: AmountField,
): TraceInput {
  if (!row) {
    return { label, value: null };
  }
  return {
    label,
    value: row[field] ?? null,
    ref: {
      row: row.rowIndex,
      account_nm: row.account_nm,
      account_id: row.account_id,
    },
  };
}

function fmt(n: number): string {
  return n.toLocaleString("ko-KR");
}
