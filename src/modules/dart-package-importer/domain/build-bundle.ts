import JSZip from "jszip";
import { buildPackage } from "./build-package";
import { checkAvailability } from "./dart-client";
import { getCorpByCode } from "./corp-search";
import type { BuildPackageRequest } from "./types";

export type BundleItemRequest = BuildPackageRequest & {
  role?: string; // "모회사" / "자회사1" 등 표시용 (옵션)
};

export type BundleItemResult = {
  corp_code: string;
  corp_name: string;
  bsns_year: string;
  reprt_code: string;
  ok: boolean;
  message: string;
  filename?: string;
};

export type BundleResult = {
  zip: ArrayBuffer;
  items: BundleItemResult[];
};

export async function buildBundle(
  requests: BundleItemRequest[],
): Promise<BundleResult> {
  const zip = new JSZip();
  const items: BundleItemResult[] = [];
  const usedNames = new Set<string>();

  for (const req of requests) {
    const corp = await getCorpByCode(req.corp_code);
    if (!corp) {
      items.push({
        corp_code: req.corp_code,
        corp_name: req.corp_code,
        bsns_year: req.bsns_year,
        reprt_code: req.reprt_code,
        ok: false,
        message: "회사 정보를 찾을 수 없습니다.",
      });
      continue;
    }

    try {
      const availability = await checkAvailability({
        corp_code: req.corp_code,
        corp_name: corp.corp_name,
        bsns_year: req.bsns_year,
        reprt_code: req.reprt_code,
      });

      if (!availability.hasOFS && !availability.hasCFS) {
        items.push({
          corp_code: req.corp_code,
          corp_name: corp.corp_name,
          bsns_year: req.bsns_year,
          reprt_code: req.reprt_code,
          ok: false,
          message: "해당 연도 사업보고서 데이터 없음.",
        });
        continue;
      }

      const xlsx = await buildPackage(req, corp, availability);

      const baseName = makeFilename({
        role: req.role,
        corp_name: corp.corp_name,
        bsns_year: req.bsns_year,
        reprt_code: req.reprt_code,
      });
      const filename = ensureUnique(baseName, usedNames);
      usedNames.add(filename);
      zip.file(filename, xlsx);

      items.push({
        corp_code: req.corp_code,
        corp_name: corp.corp_name,
        bsns_year: req.bsns_year,
        reprt_code: req.reprt_code,
        ok: true,
        message: "성공",
        filename,
      });
    } catch (e) {
      items.push({
        corp_code: req.corp_code,
        corp_name: corp.corp_name,
        bsns_year: req.bsns_year,
        reprt_code: req.reprt_code,
        ok: false,
        message: e instanceof Error ? e.message : "패키지 생성 실패",
      });
    }
  }

  // 안내용 manifest
  const manifest = buildManifest(items);
  zip.file("MANIFEST.txt", manifest);

  const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });
  return { zip: zipBuffer, items };
}

function makeFilename(p: {
  role?: string;
  corp_name: string;
  bsns_year: string;
  reprt_code: string;
}): string {
  const safeName = p.corp_name.replace(/[\\/:*?"<>|]/g, "_");
  const prefix = p.role ? `${sanitizeRolePrefix(p.role)}_` : "";
  return `${prefix}${safeName}_${p.bsns_year}_${p.reprt_code}.xlsx`;
}

function sanitizeRolePrefix(role: string): string {
  return role.replace(/[\\/:*?"<>|]/g, "_").slice(0, 20);
}

function ensureUnique(base: string, used: Set<string>): string {
  if (!used.has(base)) return base;
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : "";
  let i = 2;
  while (true) {
    const candidate = `${stem}_${i}${ext}`;
    if (!used.has(candidate)) return candidate;
    i++;
  }
}

function buildManifest(items: BundleItemResult[]): string {
  const lines: string[] = [];
  lines.push("ConsolBook · DART 연결패키지 번들");
  lines.push(`생성일시: ${new Date().toISOString()}`);
  lines.push(`회사 수: ${items.length} (성공 ${items.filter((i) => i.ok).length})`);
  lines.push("");
  lines.push("=== 항목 ===");
  for (const it of items) {
    const status = it.ok ? "OK " : "FAIL";
    const file = it.filename || "(미생성)";
    lines.push(
      `[${status}] ${it.corp_name} (${it.corp_code}) · ${it.bsns_year} · ${it.reprt_code} → ${file}`,
    );
    if (!it.ok) lines.push(`        사유: ${it.message}`);
  }
  return lines.join("\n");
}
