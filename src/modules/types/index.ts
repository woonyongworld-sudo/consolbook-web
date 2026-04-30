export const FILE_TYPES = ["A1", "A2", "A3", "B1", "B2"] as const;
export type FileTypeKey = (typeof FILE_TYPES)[number];

export const FILE_TYPE_LABELS: Record<FileTypeKey, string> = {
  A1: "모회사별도",
  A2: "자회사1별도",
  A3: "자회사2별도",
  B1: "연결조정",
  B2: "내부거래제거",
};

export type AccountRow = {
  표준계정과목코드: string;
  표준계정과목명: string;
  금액: number;
  회사명?: string;
  계정과목?: string;
};

export type UploadedFile = {
  id: string;
  name: string;
  type: FileTypeKey;
  rows: AccountRow[];
};

export type ConsolidatedRow = {
  표준계정과목코드: string;
  표준계정과목명: string;
  A1: number;
  A2: number;
  A3: number;
  별도단순합산: number;
  B1: number;
  B2: number;
  연결후금액: number;
};
