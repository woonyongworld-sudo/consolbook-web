export { runValidation } from "./domain/engine";
export { RULES } from "./domain/rules";
export { readPackageXlsx } from "./domain/excel-reader";
export type {
  Severity,
  Rule,
  Issue,
  ValidationContext,
  ValidationReport,
  NormalizedRow,
  SourceRef,
} from "./domain/types";
