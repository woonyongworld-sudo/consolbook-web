import type { FileTypeKey } from "@/modules/types";

export function guessType(filename: string): FileTypeKey {
  const n = filename.toLowerCase();
  if (n.includes("내부거래") || n.includes("b2")) return "B2";
  if (n.includes("연결조정") || n.includes("b1")) return "B1";
  if (n.includes("자회사2") || n.includes("a3")) return "A3";
  if (n.includes("자회사1") || n.includes("자회사") || n.includes("a2"))
    return "A2";
  return "A1";
}
