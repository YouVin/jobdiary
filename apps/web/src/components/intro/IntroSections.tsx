import Image from 'next/image';
import { clsx } from 'clsx';
import { Icon } from '@/components/common/Icon';
import { INTRO_FAQ, INTRO_STEPS, type IntroFeature } from '@/constants/intro';

// 소개 페이지(#286)의 구역들. 모두 서버에서 그리는 표시용이라 'use client'가 없다.

// 구역 제목: 작은 머리말 + 제목(h2)
export function IntroSectionTitle({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-label font-semibold text-text-brand">{eyebrow}</p>
      <h2 id={id} className="text-title-1-sm text-balance break-keep text-text-primary sm:text-title-1">
        {title}
      </h2>
    </div>
  );
}

// ── 이렇게 써요: 번호 붙은 3단계 ──
export function IntroSteps() {
  return (
    <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {INTRO_STEPS.map((step, index) => (
        <li key={step.title} className="flex flex-col gap-3 rounded-xl bg-surface p-5 sm:p-6">
          <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-selected text-label font-semibold text-text-brand-strong tabular-nums">
            {index + 1}
          </span>
          <h3 className="text-title-3 text-text-primary">
            <span className="sr-only">{index + 1}단계. </span>
            {step.title}
          </h3>
          <p className="text-body break-keep text-text-secondary">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}

// ── 실제 화면 한 줄: 넓은 화면에서는 글과 화면이 번갈아 좌우에 놓인다 ──
export function IntroFeatureRow({ feature, reverse }: { feature: IntroFeature; reverse: boolean }) {
  const isTall = feature.image.height > feature.image.width;
  return (
    // 가로로 긴 화면(홈·보드)은 글자가 읽히게 이미지 칸을 3/5로 넓히고, 세로로 긴 화면은 반반으로 둔다
    <article aria-labelledby={`feature-${feature.key}`} className={clsx('grid grid-cols-1 items-center gap-6 lg:gap-12', isTall ? 'lg:grid-cols-2' : 'lg:grid-cols-5')}>
      <div className={clsx('flex flex-col gap-4', !isTall && 'lg:col-span-2', reverse && 'lg:order-last')}>
        <p className="text-label font-semibold text-text-brand">{feature.label}</p>
        <h3 id={`feature-${feature.key}`} className="text-title-2 text-balance break-keep text-text-primary">
          {feature.title}
        </h3>
        <ul className="flex flex-col gap-2">
          {feature.points.map((point) => (
            <li key={point} className="flex items-start gap-2 text-body break-keep text-text-secondary">
              <Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-text-brand" />
              {point}
            </li>
          ))}
        </ul>
      </div>
      <div className={clsx('flex justify-center rounded-xl bg-subtle p-3 sm:p-6', !isTall && 'lg:col-span-3')}>
        <Image
          src={feature.image.src}
          width={feature.image.width}
          height={feature.image.height}
          alt={feature.image.alt}
          sizes={isTall ? '320px' : '(min-width: 1024px) 680px, 100vw'}
          className={clsx('h-auto rounded-md border border-line-divider', isTall ? 'w-full max-w-80' : 'w-full', feature.mobileImage && 'max-lg:hidden')}
        />
        {/* 휴대폰에서는 휴대폰 화면 사진(#310). 숨긴 쪽은 늦게 불러오기라 받지 않는다 */}
        {feature.mobileImage && (
          <Image
            src={feature.mobileImage.src}
            width={feature.mobileImage.width}
            height={feature.mobileImage.height}
            alt={feature.mobileImage.alt}
            sizes="(min-width: 640px) 360px, 100vw"
            className="h-auto w-full max-w-90 rounded-md border border-line-divider lg:hidden"
          />
        )}
      </div>
    </article>
  );
}

// ── 자주 묻는 질문: 펼침(details)이라 스크립트 없이도 열리고 닫힌다 ──
export function IntroFaq() {
  return (
    <div className="flex flex-col rounded-xl bg-surface px-5 sm:px-6">
      {INTRO_FAQ.map((item) => (
        <details key={item.question} className="group border-b border-line-divider last:border-b-0">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-sm py-4 text-body font-semibold text-text-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring [&::-webkit-details-marker]:hidden">
            {item.question}
            <Icon name="chevron-down" className="h-5 w-5 shrink-0 text-text-secondary motion-safe:transition-transform motion-safe:duration-fast group-open:rotate-180" />
          </summary>
          <p className="pb-4 text-body break-keep text-text-secondary">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
