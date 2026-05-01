import { fetchFs, fetchDocumentZip } from "./dart-client";
import { parseNotesFromDocumentZip } from "./xbrl-parser";
import { buildPackageWorkbook, type PackageContents } from "./excel-builder";
import type {
  AvailabilityCheck,
  BuildPackageRequest,
  CorpSearchHit,
} from "./types";

export async function buildPackage(
  req: BuildPackageRequest,
  corp: CorpSearchHit,
  availability: AvailabilityCheck,
): Promise<ArrayBuffer> {
  const ofsRows = req.include_ofs && availability.hasOFS
    ? await fetchFs({
        corp_code: req.corp_code,
        bsns_year: req.bsns_year,
        reprt_code: req.reprt_code,
        fs_div: "OFS",
      })
    : [];

  const cfsRows = req.include_cfs && availability.hasCFS
    ? await fetchFs({
        corp_code: req.corp_code,
        bsns_year: req.bsns_year,
        reprt_code: req.reprt_code,
        fs_div: "CFS",
      })
    : [];

  let notes = [] as Awaited<ReturnType<typeof parseNotesFromDocumentZip>>;
  if (req.include_notes && availability.hasNotes && availability.rcept_no) {
    const zip = await fetchDocumentZip({ rcept_no: availability.rcept_no });
    if (zip) {
      try {
        notes = await parseNotesFromDocumentZip(zip);
      } catch {
        notes = [];
      }
    }
  }

  const pkg: PackageContents = {
    meta: {
      corp_name: corp.corp_name,
      corp_code: corp.corp_code,
      stock_code: corp.stock_code || undefined,
      bsns_year: req.bsns_year,
      reprt_code: req.reprt_code,
      hasOFS: ofsRows.length > 0,
      hasCFS: cfsRows.length > 0,
      hasNotes: availability.hasNotes,
      generated_at: new Date().toISOString(),
    },
    ofsRows,
    cfsRows,
    notes,
  };

  return buildPackageWorkbook(pkg);
}
