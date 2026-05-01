import JSZip from "jszip";
import type { NoteSection } from "./types";

// DART의 사업보고서 document.xml ZIP에서 주석을 추출합니다.
// 형식은 DART 자체 XML(dart4.xsd) — 표준 XBRL이 아니라 HTML-like 마크업입니다.
// v1: 번호 매겨진 주석 소제목(예: "1. 일반사항")을 찾아 각각을 시트 콘텐츠로 분리.
// v1.5(예정): 안의 <TABLE> 구조를 셀 단위로 추출.
export async function parseNotesFromDocumentZip(
  zipBuffer: ArrayBuffer,
): Promise<NoteSection[]> {
  const zip = await JSZip.loadAsync(zipBuffer);
  const mainXml = await findMainDocument(zip);
  if (!mainXml) return [];

  return extractNoteSubsections(mainXml);
}

async function findMainDocument(zip: JSZip): Promise<string | null> {
  const entries: { name: string; size: number }[] = [];
  zip.forEach((relativePath, file) => {
    if (relativePath.toLowerCase().endsWith(".xml") && !file.dir) {
      const size =
        (file as JSZip.JSZipObject & { _data?: { uncompressedSize?: number } })
          ._data?.uncompressedSize ?? 0;
      entries.push({ name: relativePath, size });
    }
  });
  if (entries.length === 0) return null;
  // 가장 큰 XML이 본문 (보통 사업보고서 메인). 부속서류는 작음.
  entries.sort((a, b) => b.size - a.size);
  const file = zip.file(entries[0].name);
  if (!file) return null;
  return file.async("text");
}

// 패턴: <P>1. 일반사항</P>, <P>2-1. 작성기준</P>, <P>15. 우발부채와 약정사항</P>
// 핵심 제약:
// - 1~99의 메인번호 + 옵셔널 하이픈-서브번호(1~3 단계)
// - 숫자 사이는 하이픈만 허용 (점은 거부 → "2021.01.01." 같은 날짜 차단)
// - 마지막에 점 + 공백 + 한글 시작 제목
// Group 1 = number (예: "37-7"), Group 2 = title text
const SUBSECTION_PATTERN =
  /<P[^>]*>\s*(\d{1,2}(?:-\d{1,2}){0,3})\.\s*([가-힣][^<]{1,79})<\/P>/g;

function extractNoteSubsections(xml: string): NoteSection[] {
  const noteAreas = findNoteAreas(xml);
  if (noteAreas.length === 0) return [];

  const sections: NoteSection[] = [];
  const seenTitles = new Map<string, number>();

  for (const area of noteAreas) {
    const matches = collectSubsectionsInArea(area.text);

    for (let i = 0; i < matches.length; i++) {
      const cur = matches[i];
      const nextStart =
        i + 1 < matches.length ? matches[i + 1].start : area.text.length;
      const sliceHtml = area.text.slice(cur.matchEnd, nextStart);
      const plain = htmlToPlainText(sliceHtml);
      if (plain.length < 30) continue; // 본문이 너무 짧으면 헤더만 있는 것으로 간주

      const fullTitle = `${cur.num}. ${cur.title}`;
      const baseTitle = `${area.label} - ${fullTitle}`.slice(0, 100);
      const occurrence = (seenTitles.get(baseTitle) ?? 0) + 1;
      seenTitles.set(baseTitle, occurrence);
      const title =
        occurrence === 1 ? baseTitle : `${baseTitle} (#${occurrence})`;

      sections.push({
        concept_id: `dart:${area.kind}:${cur.num}`,
        title,
        html: sliceHtml,
        plain_text: plain,
      });
    }
  }

  return sections;
}

type SubsectionMatch = {
  num: string; // "37-7"
  title: string;
  topNum: number; // 37
  start: number;
  matchEnd: number;
};

function collectSubsectionsInArea(text: string): SubsectionMatch[] {
  const all: SubsectionMatch[] = [];
  const re = new RegExp(SUBSECTION_PATTERN.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const num = m[1] ?? "";
    const title = (m[2] ?? "").trim();
    const topNum = parseInt(num.split("-")[0], 10);
    if (!num || !title) continue;
    all.push({
      num,
      title,
      topNum,
      start: m.index,
      matchEnd: m.index + m[0].length,
    });
  }

  // 노이즈 제거 — 단조 증가 (top-level number) 순서를 깨는 매치는 list item
  // 예: "37-7" → "1" → 1은 list item일 가능성 (정상이면 38, 39로 증가).
  let maxTopSeen = 0;
  const REGRESSION_TOLERANCE = 2;
  return all.filter((m) => {
    if (m.topNum < maxTopSeen - REGRESSION_TOLERANCE) return false;
    if (m.topNum > maxTopSeen) maxTopSeen = m.topNum;
    return true;
  });
}

type NoteArea = {
  text: string;
  kind: "separate" | "consolidated" | "unknown";
  label: string; // 시트 prefix
};

function findNoteAreas(xml: string): NoteArea[] {
  // 모든 TITLE 태그 위치를 모은 뒤, 주석 챕터 TITLE의 영역을 "다음 어떤 TITLE이든"
  // 까지로 자른다. 이렇게 해야 "3. 연결재무제표 주석" 챕터가 그 다음 챕터
  // ("4. 재무제표")의 내용을 침범하지 않는다.
  const allTitles: Array<{ idx: number; text: string; afterIdx: number }> = [];
  const re = /<TITLE[^>]*>\s*([^<]+?)\s*<\/TITLE>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    allTitles.push({ idx: m.index, text: m[1], afterIdx: m.index + m[0].length });
  }

  const areas: NoteArea[] = [];
  for (let i = 0; i < allTitles.length; i++) {
    const t = allTitles[i];
    if (!isNotesChapterTitle(t.text)) continue;
    const nextIdx = i + 1 < allTitles.length ? allTitles[i + 1].idx : xml.length;
    const slice = xml.slice(t.afterIdx, nextIdx);
    const isCfs = /연결/.test(t.text);
    areas.push({
      text: slice,
      kind: isCfs ? "consolidated" : "separate",
      label: isCfs ? "연결주석" : "별도주석",
    });
  }
  return areas;
}

function isNotesChapterTitle(text: string): boolean {
  // "3. 연결재무제표 주석", "5. 재무제표 주석", "재무제표 주석" 등을 인식
  // "주석" 단어를 포함하면서 "재무제표"도 함께 등장하는 챕터 제목만.
  return /주석/.test(text) && /재무제표/.test(text);
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<\/(P|DIV|TR|LI|H[1-6]|p|div|tr|li|h[1-6])>/g, "\n")
    .replace(/<BR\s*\/?>|<br\s*\/?>/g, "\n")
    .replace(/<TD[^>]*>/gi, "\t")
    .replace(/<\/TD>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
