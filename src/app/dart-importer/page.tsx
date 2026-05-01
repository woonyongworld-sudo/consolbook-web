import Link from "next/link";
import ImporterWorkspace from "@/modules/dart-package-importer/ui/ImporterWorkspace";

export default function DartImporterPage() {
  return (
    <div className="flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-white text-sm">
              CB
            </span>
            <span>ConsolBook</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            ← 홈으로
          </Link>
        </div>
      </header>
      <ImporterWorkspace />
    </div>
  );
}
