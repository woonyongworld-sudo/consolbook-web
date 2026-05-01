import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <SiteHeader current="home" />
      <Hero />
      <ModulesSection />
      <ExplanationSection />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-20 text-center">
        <p className="mb-4 text-sm font-medium tracking-wider text-slate-500 uppercase">
          연결회계 자동화 데모 시스템
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          한국 기업의 연결재무제표 작업을
          <br />
          <span className="text-blue-600">자동화</span>해보세요
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
          별도재무제표 합산부터 DART 데이터 추출, 연결패키지 정합성 검증까지.
          세 가지 모듈을 무료로 체험해보세요.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#modules"
            className="rounded-lg bg-slate-900 px-6 py-3 text-white font-medium shadow-sm hover:bg-slate-800"
          >
            모듈 살펴보기 ↓
          </a>
          <Link
            href="/demo?sample=1"
            className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
          >
            샘플로 즉시 체험
          </Link>
        </div>
      </div>
    </section>
  );
}

function ModulesSection() {
  return (
    <section
      id="modules"
      className="border-b border-slate-200 bg-slate-50 scroll-mt-20"
    >
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <p className="mb-3 text-sm font-medium tracking-wider text-slate-500 uppercase">
            주요 모듈
          </p>
          <h2 className="text-3xl font-bold text-slate-900">
            세 가지 모듈을 골라 사용하세요
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            데이터 추출 → 연결정산표 합산 → 정합성 검증 — 연결회계 워크플로우의
            각 단계를 독립 모듈로 분리해 필요한 기능만 사용할 수 있습니다.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <ModuleCard
            badge="01"
            badgeColor="bg-blue-50 text-blue-700"
            title="DART 패키지 임포터"
            tagline="실제 한국 기업 데이터 추출"
            description="DART 공시에서 한국 기업의 별도/연결 재무제표와 주석을 추출해 표준 연결패키지 .xlsx 양식으로 변환합니다. 모회사·자회사를 한꺼번에 .zip으로도 받을 수 있습니다."
            href="/dart-importer"
            cta="회사 검색 →"
            samples={["키움증권", "다우기술", "삼성전자"]}
          />
          <ModuleCard
            badge="02"
            badgeColor="bg-amber-50 text-amber-700"
            title="연결패키지 입력/검증"
            tagline="시트별 데이터 추출 + 정합성 점검"
            description=".xlsx 파일을 업로드하면 어떤 시트에서 어떤 데이터가 추출되는지, 어떤 룰로 검증하는지 단계별로 표시합니다. BS 차대일치, 자본 정합성 등 시트 간 검증 결과를 한국어로 풀이."
            href="/validation"
            cta="파일 업로드 →"
            samples={["추출 미리보기", "룰 풀이", "계산 과정 노출"]}
          />
          <ModuleCard
            badge="03"
            badgeColor="bg-emerald-50 text-emerald-700"
            title="연결정산표 작성"
            tagline="별도 → 연결 자동 합산"
            description="별도재무제표 CSV를 업로드하면 표준계정과목 기준으로 자동 합산하고, 연결조정·내부거래 제거를 거쳐 연결정산표를 생성합니다. 합산 규칙도 화면에서 직접 확인 가능."
            href="/demo"
            cta="합산 시작 →"
            samples={["샘플 4개 내장", "CSV 직접 업로드"]}
            secondaryHref="/demo?sample=1"
            secondaryCta="샘플 즉시 체험"
          />
        </div>
      </div>
    </section>
  );
}

function ModuleCard({
  badge,
  badgeColor,
  title,
  tagline,
  description,
  href,
  cta,
  samples,
  secondaryHref,
  secondaryCta,
}: {
  badge: string;
  badgeColor: string;
  title: string;
  tagline: string;
  description: string;
  href: string;
  cta: string;
  samples?: string[];
  secondaryHref?: string;
  secondaryCta?: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex items-center gap-2">
        <span
          className={`rounded px-2 py-0.5 font-mono text-xs font-semibold ${badgeColor}`}
        >
          {badge}
        </span>
        <span className="text-xs text-slate-500">{tagline}</span>
      </div>
      <h3 className="mt-3 text-xl font-bold text-slate-900">{title}</h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">
        {description}
      </p>
      {samples && samples.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {samples.map((s) => (
            <span
              key={s}
              className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
            >
              {s}
            </span>
          ))}
        </div>
      )}
      <div className="mt-5 flex flex-col gap-2">
        <Link
          href={href}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-slate-800"
        >
          {cta}
        </Link>
        {secondaryHref && secondaryCta && (
          <Link
            href={secondaryHref}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {secondaryCta}
          </Link>
        )}
      </div>
    </div>
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
            <p className="mt-4 leading-relaxed text-slate-600">
              ConsolBook은 이 과정을 단계별로 모듈화해, 한 단계씩 자동화해보고
              실제 회사 데이터로 학습할 수 있게 만든 데모 시스템입니다.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="mb-4 text-xs font-semibold tracking-wider text-slate-500 uppercase">
              주요 특징
            </p>
            <ul className="space-y-3 text-sm text-slate-700">
              <Bullet>
                실제 한국 기업 데이터 (DART 공시) 기반 시연·학습 가능
              </Bullet>
              <Bullet>
                표준계정과목코드 기준 자동 합산 + 연결조정·내부거래 제거
              </Bullet>
              <Bullet>
                별도/연결 재무제표 + 주석을 한 .xlsx 양식 안에 시트로 정리
              </Bullet>
              <Bullet>
                BS 차대일치·자본 정합성 등 검증 룰 자동 적용
              </Bullet>
              <Bullet>
                100% 브라우저·서버 자동 처리 — 별도 설치·계정 불필요
              </Bullet>
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
