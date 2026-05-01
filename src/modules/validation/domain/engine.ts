import type {
  Issue,
  Rule,
  RuleTrace,
  Severity,
  ValidationContext,
  ValidationReport,
} from "./types";

export function runValidation(
  ctx: ValidationContext,
  rules: Rule[],
): ValidationReport {
  const ruleResults: ValidationReport["ruleResults"] = [];

  for (const rule of rules) {
    let issues: Issue[] = [];
    let traces: RuleTrace[] = [];
    let errored = false;
    try {
      const result = rule.check(ctx);
      issues = result.issues;
      traces = result.traces;
    } catch (e) {
      errored = true;
      issues = [
        {
          rule_id: rule.id,
          severity: rule.severity,
          message: `룰 실행 실패: ${
            e instanceof Error ? e.message : String(e)
          }`,
        },
      ];
      traces = [];
    }
    const status = decideStatus(rule.severity, issues, traces, errored);
    ruleResults.push({
      rule_id: rule.id,
      rule_name: rule.name,
      rule_description: rule.description,
      severity: rule.severity,
      status,
      issues,
      traces,
    });
  }

  const summary = {
    total_rules: ruleResults.length,
    passed: ruleResults.filter((r) => r.status === "pass").length,
    failed: ruleResults.filter((r) => r.status === "fail").length,
    warnings: ruleResults.filter((r) => r.status === "warn").length,
    skipped: ruleResults.filter((r) => r.status === "skip").length,
  };

  return {
    ruleResults,
    summary,
    meta: ctx.meta,
    generated_at: new Date().toISOString(),
  };
}

function decideStatus(
  ruleSeverity: Severity,
  issues: Issue[],
  traces: RuleTrace[],
  errored: boolean,
): "pass" | "fail" | "warn" | "skip" {
  if (errored) return "fail";
  // 데이터 누락(missing) trace만 있고 issue가 없으면 skip
  if (
    issues.length === 0 &&
    traces.length > 0 &&
    traces.every((t) => t.status === "missing")
  ) {
    return "skip";
  }
  if (issues.length === 0) return "pass";
  if (ruleSeverity === "error") return "fail";
  if (ruleSeverity === "warning") return "warn";
  return "skip";
}
