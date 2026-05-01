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
// Korean digits, dot, optional sub-numbering.
const SUBSECTION_PATTERN =
  /<P[^>]*>\s*((?:\d+(?:[-.]\d+)*)\.?\s+[^<]{2,80})\s*<\/P>/g;

function extractNoteSubsections(xml: string): NoteSection[] {
  // 1. "주석" 섹션 영역을 식별 — 사업보고서 안에서 챕터 제목으로 등장하는 위치 기준.
  // DART 양식상 보통 "재무제표 주석" 또는 "연결재무제표 주석"이라는 챕터 제목이 나옴.
  const noteAreas = findNoteAreas(xml);
  if (noteAreas.length === 0) return [];

  const sections: NoteSection[] = [];
  const seenTitles = new Map<string, number>();

  for (const area of noteAreas) {
    SUBSECTION_PATTERN.lastIndex = 0;
    const matches: Array<{ title: string; start: number; matchEnd: number }> =
      [];
    let m: RegExpExecArray | null;
    while ((m = SUBSECTION_PATTERN.exec(area.text)) !== null) {
      matches.push({
        title: cleanTitle(m[1]),
        start: m.index,
        matchEnd: m.index + m[0].length,
      });
    }

    for (let i = 0; i < matches.length; i++) {
      const cur = matches[i];
      const nextStart =
        i + 1 < matches.length ? matches[i + 1].start : area.text.length;
      const sliceHtml = area.text.slice(cur.matchEnd, nextStart);
      const plain = htmlToPlainText(sliceHtml);
      if (plain.length < 5) continue; // 너무 짧으면 노이즈

      const baseTitle = `${area.label} - ${cur.title}`.slice(0, 100);
      const occurrence = (seenTitles.get(baseTitle) ?? 0) + 1;
      seenTitles.set(baseTitle, occurrence);
      const title =
        occurrence === 1 ? baseTitle : `${baseTitle} (#${occurrence})`;

      sections.push({
        concept_id: `dart:${area.kind}:${cur.title}`,
        title,
        html: sliceHtml,
        plain_text: plain,
      });
    }
  }

  return sections;
}

type NoteArea = {
  text: string;
  kind: "separate" | "consolidated" | "unknown";
  label: string; // 시트 prefix
};

function findNoteAreas(xml: string): NoteArea[] {
  const areas: NoteArea[] = [];

  // 챕터 마커: <SECTION-1 ATOC="Y" AASSOCNOTE="...">...
  // 또는 본문 안의 챕터 제목에 "재무제표 주석" / "연결재무제표 주석"
  const titleMatches: Array<{ idx: number; isCfs: boolean }> = [];
  const re = /<TITLE[^>]*>\s*([^<]*주석[^<]*)\s*<\/TITLE>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const titleText = m[1];
    const isCfs = /연결/.test(titleText);
    titleMatches.push({ idx: m.index, isCfs });
  }

  // Fallback: <P> 헤딩 패턴 — 챕터 분리가 일정하지 않은 회사 대비
  if (titleMatches.length === 0) {
    const fallback =
      /<P[^>]*>\s*((?:연결\s*)?재무제표\s*주석[^<]*)\s*<\/P>/g;
    while ((m = fallback.exec(xml)) !== null) {
      const isCfs = /연결/.test(m[1]);
      titleMatches.push({ idx: m.index, isCfs });
    }
  }

  if (titleMatches.length === 0) return [];

  for (let i = 0; i < titleMatches.length; i++) {
    const cur = titleMatches[i];
    const nextIdx =
      i + 1 < titleMatches.length ? titleMatches[i + 1].idx : xml.length;
    const slice = xml.slice(cur.idx, nextIdx);
    areas.push({
      text: slice,
      kind: cur.isCfs ? "consolidated" : "separate",
      label: cur.isCfs ? "연결주석" : "별도주석",
    });
  }
  return areas;
}

function cleanTitle(t: string): string {
  return t
    .replace(/\s+/g, " ")
    .replace(/^(\d+(?:[-.]\d+)*)\.?\s+/, "$1. ")
    .trim();
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
