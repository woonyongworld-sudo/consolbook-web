export { runValidation } from "./domain/engine";
export { RULES } from "./domain/rules";
export {
  readPackageXlsx,
  SJ_PATTERNS,
  COLUMN_MAPPING,
} from "./domain/excel-reader";
export type { SheetMappingInput } from "./domain/excel-reader";
export { detectSheetsFromXlsx } from "./domain/sheet-mapper";
export type { DetectedSheet } from "./domain/sheet-mapper";
export type {
  Severity,
  Rule,
  Issue,
  ValidationContext,
  ValidationReport,
  NormalizedRow,
  SourceRef,
  RuleTrace,
  TraceInput,
  RuleResult,
} from "./domain/types";
