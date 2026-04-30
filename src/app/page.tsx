import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <SiteHeader />
      <Hero />
      <ExplanationSection />
      <HowItWorks />
      <CtaSection />
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-white text-sm">
            CB
          </span>
          <span>ConsolBook</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-slate-600">
          <a href="#what" className="hidden hover:text-slate-900 sm:inline">
            연결회계란
          </a>
          <a href="#how" className="hidden hover:text-slate-900 sm:inline">
            동작 방식
          </a>
          <Link
            href="/demo"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800"
          >
            데모 시작
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-20 text-center">
        <p className="mb-4 text-sm font-medium tracking-wider text-slate-500 uppercase">
          연결정산표 자동화 데모
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          모회사·자회사 별도재무제표를
          <br />
          <span className="text-blue-600">연결정산표</span>로 5초 만에
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
          별도재무제표 CSV를 업로드하면 연결조정과 내부거래 제거를 거쳐
          연결정산표를 자동으로 산출합니다. 샘플 데이터로 즉시 체험해보세요.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/demo?sample=1"
            className="rounded-lg bg-slate-900 px-6 py-3 text-white font-medium shadow-sm hover:bg-slate-800"
          >
            샘플 데이터로 체험하기
          </Link>
          <Link
            href="/demo"
            className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
          >
            내 CSV 업로드
          </Link>
        </div>
      </div>
    </section>
  );
}

function ExplanationSection() {
  return (
    <section id="what" className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">
              연결회계가 무엇인가요?
            </h2>
            <p className="mt-4 leading-relaxed text-slate-600">
              모회사가 자회사를 지배하는 기업집단은 회계기준상{" "}
              <strong className="text-slate-900">연결재무제표</strong>를
              작성해야 합니다. 단순히 모·자회사 별도재무제표를 합치는 게 아니라,
              지분법 조정·내부거래 제거 같은 절차를 거쳐 마치 하나의 회사인
              것처럼 표시해야 합니다.
            </p>
            <p className="mt-4 leading-relaxed text-slate-600">
              실무에서는 이 과정을{" "}
              <strong className="text-slate-900">연결정산표</strong>라는 워크
              시트로 정리합니다. 별도금액 → 단순합산 → 연결조정 → 내부거래 제거
              → 연결후금액의 흐름을 한 표에서 추적할 수 있게요.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="mb-4 text-xs font-semibold tracking-wider text-slate-500 uppercase">
              이 데모가 보여주는 것
            </p>
            <ul className="space-y-3 text-sm text-slate-700">
              <Bullet>
                별도재무제표 5종 분류 (모회사·자회사1·자회사2·연결조정·내부거래)
              </Bullet>
              <Bullet>표준계정과목코드 기준 자동 합산</Bullet>
              <Bullet>별도단순합산 → 연결후금액까지 한 표로 추적</Bullet>
              <Bullet>결과 CSV 다운로드</Bullet>
              <Bullet>샘플 데이터 내장 — 파일 준비 없이 즉시 체험</Bullet>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-700">
        <svg
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </span>
      <span>{children}</span>
    </li>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "CSV 업로드",
      body: "별도재무제표 CSV를 파일별로 업로드하고 구분(모회사·자회사·조정·내부거래)을 지정합니다.",
    },
    {
      n: "02",
      title: "표준계정코드 기준 합산",
      body: "동일한 표준계정과목코드를 가진 행을 자동으로 묶어 별도단순합산을 계산합니다.",
    },
    {
      n: "03",
      title: "연결조정 + 내부거래 제거",
      body: "B1(연결조정)과 B2(내부거래제거) 금액을 더해 최종 연결후금액을 산출합니다.",
    },
  ];
  return (
    <section id="how" className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold text-slate-900">
          어떻게 동작하나요
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
          모든 계산은 브라우저 안에서 이뤄집니다. 데이터가 서버로 전송되지
          않습니다.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <p className="text-sm font-mono text-blue-600">{s.n}</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-slate-900">
          지금 바로 체험해보세요
        </h2>
        <p className="mt-3 text-slate-600">
          파일 준비 없이 샘플 데이터로 결과를 즉시 확인할 수 있습니다.
        </p>
        <Link
          href="/demo?sample=1"
          className="mt-8 inline-block rounded-lg bg-slate-900 px-6 py-3 font-medium text-white shadow-sm hover:bg-slate-800"
        >
          샘플 데이터로 체험하기 →
        </Link>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-slate-500">
        <p>
          © {new Date().getFullYear()} ConsolBook · 연결회계 학습용 데모.
          실무 사용 전에는 반드시 회계 전문가의 검토를 받으세요.
        </p>
      </div>
    </footer>
  );
}
