import Link from "next/link";

export type ModuleKey =
  | "home"
  | "dart"
  | "validation"
  | "demo"
  | "standards";

export function SiteHeader({ current = "home" }: { current?: ModuleKey }) {
  return (
    <header className="border-b border-slate-200 bg-white/85 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-white text-sm">
            CB
          </span>
          <span>ConsolBook</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          <NavLink href="/dart-importer" active={current === "dart"}>
            <span className="hidden sm:inline">DART </span>임포터
          </NavLink>
          <NavLink href="/validation" active={current === "validation"}>
            <span className="hidden sm:inline">패키지 </span>입력/검증
          </NavLink>
          <NavLink href="/demo" active={current === "demo"}>
            정산표<span className="hidden sm:inline"> 작성</span>
          </NavLink>
          <span className="hidden text-slate-300 sm:inline">|</span>
          <NavLink href="/standards" active={current === "standards"}>
            표준<span className="hidden sm:inline"> 사전</span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-md px-2 py-1.5 transition sm:px-3 ${
        active
          ? "bg-slate-900 text-white"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {children}
    </Link>
  );
}
