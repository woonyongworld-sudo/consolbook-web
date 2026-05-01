// 표준 양식 사전 — 연결정산표 모듈에서 정의하는 단일 진실.
// 연결패키지 모듈의 매핑 + 검증의 기준점.

export type StandardDataType = "text" | "number" | "code" | "enum";

// 데이터 유효성 검사 (엑셀의 "데이터 유효성 검사" 기능과 유사).
// - "none": 값 자유 입력
// - "enum": 헤더에 직접 정의된 inline 값만 허용 (StandardHeader.enumValues 사용)
// - "list": 목록 마스터(StandardDictionary.lists)에 등록된 값만 허용
export type HeaderValidation =
  | { type: "none" }
  | { type: "enum" } // 기존 enumValues 사용
  | { type: "list"; listKey: string; matchField?: "code" | "label" };

export type StandardHeader = {
  key: string; // 시스템 키 (예: "account_nm")
  label: string; // 한국어 라벨 (예: "계정과목명")
  description: string;
  dataType: StandardDataType;
  required: boolean;
  enumValues?: string[]; // type==="enum"일 때 inline 값 (예: 차변/대변)
  validation?: HeaderValidation; // v3: 마스터 참조 또는 inline enum
};

export type StandardSheetSpec = {
  type: string; // 시트 유형 키 (예: "BS", "IS", 사용자 추가 가능)
  label: string; // 한국어 라벨 (예: "재무상태표")
  description: string;
  headers: StandardHeader[];
};

// v3: 목록 마스터 — 헤더의 데이터 유효성 검사에서 참조 가능.
// 예: "consolidation_coa" 마스터에 표준계정과목코드와 라벨 등록.
//     account_id 헤더가 이 마스터를 참조 → 외부 데이터의 account_id 값이
//     마스터에 있는지 검증.
export type ListMaster = {
  key: string; // 시스템 키 (예: "consolidation_coa")
  label: string; // 한국어 라벨 (예: "연결 표준계정과목 (COA)")
  description: string;
  items: ListItem[];
};

export type ListItem = {
  code: string; // 식별 코드 (예: "1000001")
  label: string; // 한국어 라벨 (예: "현금및예치금")
  // 메타: 분류, 부모 코드, 차대 등 — 사용자 자유롭게 추가
  meta?: Record<string, string>;
};

export type StandardDictionary = {
  version: string;
  updated_at: string;
  sheets: StandardSheetSpec[];
  lists: ListMaster[]; // v3
};
