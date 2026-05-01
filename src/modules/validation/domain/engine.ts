import type {
  Issue,
  Rule,
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
    let errored = false;
    try {
      issues = rule.check(ctx);
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
    }
    const status = decideStatus(rule.severity, issues, errored);
    ruleResults.push({
      rule_id: rule.id,
      rule_name: rule.name,
      severity: rule.severity,
      status,
      issues,
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
  errored: boolean,
): "pass" | "fail" | "warn" | "skip" {
  if (errored) return "fail";
  if (issues.length === 0) return "pass";
  // 룰 자체 severity로 status 매핑
  if (ruleSeverity === "error") return "fail";
  if (ruleSeverity === "warning") return "warn";
  return "skip"; // info severity는 skip 처리
}
