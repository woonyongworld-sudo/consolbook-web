import Link from "next/link";
import ValidationWorkspace from "@/modules/validation/ui/ValidationWorkspace";

export default function ValidationPage() {
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
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <Link href="/dart-importer" className="hover:text-slate-900">
              DART 임포터
            </Link>
            <Link href="/" className="hover:text-slate-900">
              ← 홈으로
            </Link>
          </div>
        </div>
      </header>
      <ValidationWorkspace />
    </div>
  );
}
