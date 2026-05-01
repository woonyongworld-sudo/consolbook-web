import type { Issue, NormalizedRow, Rule, ValidationContext } from "./types";

const TOLERANCE = 1; // 원 단위 — 반올림 차이 흡수

const ASSET_TOTAL_KEYWORDS = ["자산총계"];
const LIAB_TOTAL_KEYWORDS = ["부채총계"];
const EQUITY_TOTAL_KEYWORDS = ["자본총계"];

export const RULES: Rule[] = [
  {
    id: "BS_BALANCE_THSTRM",
    name: "BS 차대일치 (당기)",
    description:
      "재무상태표에서 자산총계 = 부채총계 + 자본총계 (당기금액)을 검증.",
    severity: "error",
    scope: "fs",
    check: (ctx) => bsBalanceCheck(ctx, "thstrm_amount", "당기"),
  },
  {
    id: "BS_BALANCE_FRMTRM",
    name: "BS 차대일치 (전기)",
    description:
      "재무상태표에서 자산총계 = 부채총계 + 자본총계 (전기금액)을 검증.",
    severity: "warning",
    scope: "fs",
    check: (ctx) => bsBalanceCheck(ctx, "frmtrm_amount", "전기"),
  },
  {
    id: "OFS_CFS_EQUITY_REASONABLE",
    name: "별도-연결 자본 정합성 (informative)",
    description:
      "별도재무제표와 연결재무제표의 자본총계가 비합리적 차이를 보이는지 점검. 연결자본은 보통 별도자본보다 크거나 비슷.",
    severity: "warning",
    scope: "cross_sheet",
    check: (ctx) => ofsCfsEquityCheck(ctx),
  },
];

type AmountField = "thstrm_amount" | "frmtrm_amount" | "bfefrmtrm_amount";

function normalizeKor(s: string): string {
  // 한국 재무제표는 "자    산    총    계"처럼 공백으로 강조하기도 함.
  // 모든 공백·전각공백 제거 후 비교.
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
): Issue[] {
  const issues: Issue[] = [];
  const bsSheets = ctx.fs.filter((s) => s.sj_div === "BS");
  if (bsSheets.length === 0) return [];

  for (const bs of bsSheets) {
    const fsLabel = bs.fs_div === "OFS" ? "별도" : "연결";
    const asset = findRowByKeywords(bs.rows, ASSET_TOTAL_KEYWORDS);
    const liab = findRowByKeywords(bs.rows, LIAB_TOTAL_KEYWORDS);
    const equity = findRowByKeywords(bs.rows, EQUITY_TOTAL_KEYWORDS);

    if (!asset || !liab || !equity) {
      issues.push({
        rule_id: "BS_BALANCE_" + field,
        severity: "warning",
        message: `${fsLabel} BS에서 자산총계/부채총계/자본총계 행을 모두 찾지 못함 (검증 스킵).`,
        ref: { sheet: bs.sheetName },
      });
      continue;
    }

    const a = asset[field] ?? null;
    const l = liab[field] ?? null;
    const e = equity[field] ?? null;
    if (a == null || l == null || e == null) continue;

    const diff = a - (l + e);
    if (Math.abs(diff) > TOLERANCE) {
      issues.push({
        rule_id: "BS_BALANCE",
        severity: "error",
        message: `${fsLabel} BS ${label}: 자산총계 ${fmt(a)} ≠ 부채총계+자본총계 ${fmt(l + e)} (차이 ${fmt(diff)})`,
        ref: {
          sheet: bs.sheetName,
          row: asset.rowIndex,
          account_nm: asset.account_nm,
        },
        expected: l + e,
        actual: a,
        diff,
      });
    }
  }
  return issues;
}

function ofsCfsEquityCheck(ctx: ValidationContext): Issue[] {
  const issues: Issue[] = [];
  const ofsBS = ctx.fs.find((s) => s.sj_div === "BS" && s.fs_div === "OFS");
  const cfsBS = ctx.fs.find((s) => s.sj_div === "BS" && s.fs_div === "CFS");
  if (!ofsBS || !cfsBS) return [];

  const ofsEq = findRowByKeywords(ofsBS.rows, EQUITY_TOTAL_KEYWORDS);
  const cfsEq = findRowByKeywords(cfsBS.rows, EQUITY_TOTAL_KEYWORDS);
  if (!ofsEq?.thstrm_amount || !cfsEq?.thstrm_amount) return [];

  const ofs = ofsEq.thstrm_amount;
  const cfs = cfsEq.thstrm_amount;
  if (ofs <= 0) return [];

  // 연결자본이 별도자본의 50% 미만이면 비정상으로 간주 (대부분 자회사 비지배지분 가산)
  const ratio = cfs / ofs;
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
  }

  // 연결자본이 별도자본의 5배 이상이면 의심
  if (ratio > 5) {
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

  return issues;
}

function fmt(n: number): string {
  return n.toLocaleString("ko-KR");
}
