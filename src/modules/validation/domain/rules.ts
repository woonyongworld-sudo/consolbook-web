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
  {
    id: "HEADER_LIST_MEMBERSHIP",
    name: "헤더 값 마스터 참조 검증",
    description:
      "표준 사전에서 데이터 유효성 검사가 'list' 또는 'enum'으로 설정된 헤더에 대해, 외부 데이터의 값이 참조 마스터(또는 inline enum)에 있는지 점검합니다.",
    severity: "error",
    scope: "fs",
    check: headerListCheck,
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

// v3: 헤더의 validation 설정에 따라 데이터 값이 마스터/enum에 있는지 검사.
function headerListCheck(ctx: ValidationContext): RuleResult {
  const issues: Issue[] = [];
  const traces: RuleTrace[] = [];
  if (!ctx.dict) {
    traces.push({
      formula: "외부 값 ∈ 표준 사전 마스터",
      scope_label: "전체",
      inputs: [],
      computation: "표준 사전이 전달되지 않아 검증 스킵.",
      status: "missing",
    });
    return { issues, traces };
  }

  // 빠른 마스터 조회 인덱스 (key → Set<코드값>)
  const masterIndex = new Map<string, { codes: Set<string>; labels: Set<string> }>();
  for (const list of ctx.dict.lists) {
    masterIndex.set(list.key, {
      codes: new Set(list.items.map((it) => normalizeKor(it.code))),
      labels: new Set(list.items.map((it) => normalizeKor(it.label))),
    });
  }

  for (const fs of ctx.fs) {
    const spec = ctx.dict.sheets.find((s) => s.type === fs.standardType);
    if (!spec) continue;

    // validation 설정된 헤더만 검사
    const checkedHeaders = spec.headers.filter(
      (h) =>
        h.validation &&
        (h.validation.type === "list" || h.validation.type === "enum"),
    );
    if (checkedHeaders.length === 0) continue;

    for (const header of checkedHeaders) {
      const v = header.validation!;
      let allowedSet: Set<string> | null = null;
      let scopeDesc = "";

      if (v.type === "list") {
        const idx = masterIndex.get(v.listKey);
        if (!idx) {
          traces.push({
            formula: `값 ∈ 마스터["${v.listKey}"]`,
            scope_label: `${fs.sheetName} · ${header.label}`,
            inputs: [],
            computation: `마스터 "${v.listKey}"를 찾을 수 없습니다.`,
            status: "missing",
          });
          continue;
        }
        allowedSet = v.matchField === "label" ? idx.labels : idx.codes;
        scopeDesc = `마스터[${v.listKey}.${v.matchField ?? "code"}]`;
      } else if (v.type === "enum") {
        const enumVals = (header.enumValues ?? []).map(normalizeKor);
        if (enumVals.length === 0) continue;
        allowedSet = new Set(enumVals);
        scopeDesc = `inline enum [${header.enumValues!.join(", ")}]`;
      }

      if (!allowedSet) continue;

      // 행 단위 점검
      const violatedRows: Array<{ row: number; value: string }> = [];
      for (const row of fs.rows) {
        const rawValue = pickValueForKey(row, header.key);
        if (rawValue == null || rawValue === "") continue; // 빈 값은 별개 (필수 누락 룰 영역)
        const normalized = normalizeKor(String(rawValue));
        if (!allowedSet.has(normalized)) {
          violatedRows.push({ row: row.rowIndex, value: String(rawValue) });
        }
      }

      const totalChecked = fs.rows.filter(
        (r) => pickValueForKey(r, header.key) != null,
      ).length;
      const okCount = totalChecked - violatedRows.length;

      traces.push({
        formula: `${header.label} ∈ ${scopeDesc}`,
        scope_label: `${fs.sheetName} · ${header.label}`,
        inputs: [
          { label: "검사 행 수", value: totalChecked },
          { label: "통과", value: okCount },
          { label: "위반", value: violatedRows.length },
        ],
        computation:
          violatedRows.length === 0
            ? `${totalChecked}행 모두 마스터 값과 일치 ✓`
            : `${violatedRows.length}건 불일치 — 예: ${violatedRows
                .slice(0, 3)
                .map((v) => `행 ${v.row} "${v.value}"`)
                .join(", ")}${violatedRows.length > 3 ? ` 외 ${violatedRows.length - 3}건` : ""}`,
        status: violatedRows.length === 0 ? "match" : "mismatch",
      });

      // 행 단위 issue 발급 (최대 5건)
      for (const v of violatedRows.slice(0, 5)) {
        issues.push({
          rule_id: "HEADER_LIST_MEMBERSHIP",
          severity: "error",
          message: `${fs.sheetName} 행 ${v.row}: "${header.label}" 값 "${v.value}"은(는) ${scopeDesc}에 없습니다.`,
          ref: { sheet: fs.sheetName, row: v.row, account_nm: header.label },
          actual: v.value,
        });
      }
      if (violatedRows.length > 5) {
        issues.push({
          rule_id: "HEADER_LIST_MEMBERSHIP",
          severity: "error",
          message: `... 외 ${violatedRows.length - 5}건의 "${header.label}" 위반이 더 있습니다.`,
          ref: { sheet: fs.sheetName, account_nm: header.label },
        });
      }
    }
  }

  return { issues, traces };
}

// 표준 키에 해당하는 값을 row에서 꺼내기 (NormalizedRow.values 우선, 그다음 shortcut)
function pickValueForKey(
  row: NormalizedRow,
  key: string,
): string | number | null {
  if (row.values && key in row.values) return row.values[key];
  if (key === "account_id") return row.account_id || null;
  if (key === "account_nm") return row.account_nm || null;
  if (key === "thstrm_amount") return row.thstrm_amount ?? null;
  if (key === "frmtrm_amount") return row.frmtrm_amount ?? null;
  if (key === "bfefrmtrm_amount") return row.bfefrmtrm_amount ?? null;
  return null;
}
