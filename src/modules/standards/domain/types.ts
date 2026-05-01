// 표준 양식 사전 — 연결정산표 모듈에서 정의하는 단일 진실.
// 연결패키지 모듈의 매핑 + 검증의 기준점.

export type StandardDataType = "text" | "number" | "code" | "enum";

export type StandardHeader = {
  key: string; // 시스템 키 (예: "account_nm") — 변경 불가 권장
  label: string; // 한국어 라벨 (예: "계정과목명")
  description: string;
  dataType: StandardDataType;
  required: boolean;
  enumValues?: string[]; // dataType === "enum" 일 때
};

export type StandardSheetSpec = {
  type: string; // 시트 유형 키 (예: "BS", "IS", 사용자 추가 가능)
  label: string; // 한국어 라벨 (예: "재무상태표")
  description: string;
  headers: StandardHeader[]; // required 헤더 + optional 헤더 (required 필드로 구분)
};

export type StandardDictionary = {
  version: string; // 변경 이력 추적용
  updated_at: string; // ISO timestamp
  sheets: StandardSheetSpec[];
};
