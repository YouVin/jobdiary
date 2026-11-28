import Image from 'next/image';
import Link from 'next/link';
import { IPhoneMockup, MacBookMockup } from '@/components/auth/DeviceMockups';
import { BrandLogo } from '@/components/common/BrandMark';
import { Icon } from '@/components/common/Icon';
import { IntroAccountLinks } from '@/components/intro/IntroAccountLinks';
import { IntroFaq, IntroFeatureRow, IntroSectionTitle, IntroSteps } from '@/components/intro/IntroSections';
import { buttonClassName } from '@/components/ui/Button';
import { MAIN_CONTENT_ID } from '@/components/ui/SkipLink';
import { textLinkClassName } from '@/components/ui/TextLink';
import { EXTENSION_STORE_URL } from '@/constants/extension';
import { INTRO_DESCRIPTION, INTRO_FAQ, INTRO_FEATURES, INTRO_HERO, INTRO_MOBILE_NOTE, INTRO_TITLE } from '@/constants/intro';
import { publicPageMetadata, SITE_NAME, SITE_URL } from '@/lib/siteMetadata';

export const metadata = publicPageMetadata('지원 내역을 한곳에 모으는 취업 준비 기록장', INTRO_DESCRIPTION, '/intro');

// 검색·AI 검색이 읽는 구조화 데이터 (Next.js JSON-LD 안내). 내용은 고정 문구뿐이고, 안내대로 <를 바꿔 스크립트가 끊기지 않게 한다.
const JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: `${SITE_URL}/intro`,
    description: INTRO_DESCRIPTION,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, Chrome',
    inLanguage: 'ko-KR',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: INTRO_FAQ.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })),
  },
];

// 소개(/intro, #286): 쓰레드 등 바깥에서 처음 온 사람용. 로그인 없이 보이고 검색에 나온다.
// 머리(로고 | 로그인·시작하기) → 첫 화면(한 줄 소개·시작하기·홈 화면) → 이렇게 써요 → 실제 화면 4줄 → 자주 묻는 질문 → 마무리 → 아래 링크
export default function IntroPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, '\\u003c') }} />

      {/* ── 머리: 로고 | 로그인·시작하기 ── */}
      <header className="border-b border-line-divider bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-300 items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <Link href="/intro" aria-label="취준일기 소개" className="rounded-sm focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-focus-ring">
            <BrandLogo className="h-7 w-auto" alt="" />
          </Link>
          <IntroAccountLinks />
        </div>
      </header>

      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="mx-auto flex w-full max-w-300 flex-col gap-16 px-4 pt-12 pb-16 focus:outline-none sm:px-6 sm:pt-16 lg:gap-24 lg:px-10 lg:pb-24">
        {/* ── 첫 화면: 한 줄 소개 → 시작하기·익스텐션 → 기기 속 실제 홈 화면(예시 데이터, 장식) ── */}
        <section aria-labelledby="intro-title" className="flex flex-col items-center gap-10 text-center">
          <div className="flex max-w-170 flex-col items-center gap-5">
            <p className="rounded-full bg-selected px-3 py-1 text-label font-semibold text-text-brand-strong">사람인 · 잡코리아 · 원티드</p>
            <h1 id="intro-title" className="text-display-sm text-balance break-keep text-text-primary sm:text-display">
              {INTRO_TITLE}
            </h1>
            <p className="text-body break-keep text-text-secondary sm:text-title-3 sm:font-normal">{INTRO_DESCRIPTION}</p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link href="/signup" className={buttonClassName({ size: 'lg' })}>
                무료로 시작하기
              </Link>
              {/* 휴대폰에서는 익스텐션을 설치할 수 없어 버튼 대신 아래 안내를 둔다(#310) */}
              <a href={EXTENSION_STORE_URL} target="_blank" rel="noopener noreferrer" className={buttonClassName({ variant: 'secondary', size: 'lg', className: 'max-md:hidden' })}>
                크롬 익스텐션 설치
                <Icon name="external" className="h-4 w-4" />
                <span className="sr-only"> (새 탭에서 열림)</span>
              </a>
            </div>
            <p className="max-w-90 text-label break-keep text-text-secondary md:hidden">{INTRO_MOBILE_NOTE}</p>
          </div>
          {/* 기기 속 사진은 장식이다(내용은 아래 실제 화면 4줄에서 글과 함께). 보이는 쪽 사진만 먼저 받게 fetchPriority만 높인다 */}
          <div aria-hidden="true" className="flex justify-center">
            <IPhoneMockup
              className="lg:hidden"
              screen={<Image src={INTRO_HERO.mobile.src} width={INTRO_HERO.mobile.width} height={INTRO_HERO.mobile.height} alt="" sizes="210px" fetchPriority="high" className="h-auto w-full" />}
            />
            <MacBookMockup
              className="max-lg:hidden"
              screen={<Image src={INTRO_HERO.desktop.src} width={INTRO_HERO.desktop.width} height={INTRO_HERO.desktop.height} alt="" sizes="620px" fetchPriority="high" className="h-auto w-full" />}
            />
          </div>
        </section>

        {/* ── 이렇게 써요 ── */}
        <section aria-labelledby="steps-title" className="flex flex-col gap-6">
          <IntroSectionTitle id="steps-title" eyebrow="이렇게 써요" title="가져오고, 옮기고, 남기면 끝이에요" />
          <IntroSteps />
        </section>

        {/* ── 실제 화면 4줄 (예시 데이터) ── */}
        <section aria-labelledby="features-title" className="flex flex-col gap-12 lg:gap-16">
          <IntroSectionTitle id="features-title" eyebrow="할 수 있는 것" title="지원부터 결과까지, 한 화면씩" />
          {INTRO_FEATURES.map((feature, index) => (
            <IntroFeatureRow key={feature.key} feature={feature} reverse={index % 2 === 1} />
          ))}
        </section>

        {/* ── 자주 묻는 질문 ── */}
        <section aria-labelledby="faq-title" className="flex flex-col gap-6">
          <IntroSectionTitle id="faq-title" eyebrow="자주 묻는 질문" title="시작하기 전에 궁금한 것" />
          <IntroFaq />
        </section>

        {/* ── 마무리: 다시 시작하기 ── */}
        <section aria-labelledby="start-title" className="flex flex-col items-center gap-5 rounded-xl bg-surface px-5 py-10 text-center sm:py-12">
          <h2 id="start-title" className="text-title-1-sm text-balance break-keep text-text-primary sm:text-title-1">
            오늘 지원한 회사부터 남겨 볼까요?
          </h2>
          <p className="text-body break-keep text-text-secondary">가입은 1분이면 끝나고, 지원 내역은 내 계정에서만 보여요.</p>
          <Link href="/signup" className={buttonClassName({ size: 'lg' })}>
            무료로 시작하기
          </Link>
        </section>
      </main>

      {/* ── 아래: 약관·방침·익스텐션 ── */}
      <footer className="border-t border-line-divider bg-surface">
        <div className="mx-auto flex w-full max-w-300 flex-wrap items-center justify-between gap-4 px-4 py-6 text-label text-text-secondary sm:px-6 lg:px-10">
          <p>© 2026 {SITE_NAME}</p>
          <nav aria-label="소개 페이지 아래 링크" className="flex flex-wrap gap-4">
            <Link href="/terms" className={textLinkClassName('quiet')}>
              이용약관
            </Link>
            <Link href="/privacy" className={textLinkClassName('quiet')}>
              개인정보처리방침
            </Link>
            <a href={EXTENSION_STORE_URL} target="_blank" rel="noopener noreferrer" className={textLinkClassName('quiet')}>
              크롬 웹스토어
              <span className="sr-only"> (새 탭에서 열림)</span>
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

