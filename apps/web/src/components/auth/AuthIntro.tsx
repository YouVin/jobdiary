import { clsx } from 'clsx';
import { BrandLogo } from '@/components/common/BrandMark';
import { IPhoneMockup, MacBookMockup } from '@/components/auth/DeviceMockups';

// 로그인 소개 영역 (#202, 캔버스 Login-R5·R5m).
// - 1024px 이상: 폼 오른쪽, 회색 바탕 위 맥북. 로고는 폼 쪽에 있다.
//   소개 영역이 좁으면 왼쪽 40px에 붙고 오른쪽 끝이 잘린다. 넓어져 맥북이 다 들어가면 가운데로 간다(#215).
//   왼쪽 여백 = max(40px, (영역 폭 − 맥북 640px) / 2 − 32px). 한 식으로 이어져 있어 폭이 바뀌어도 위치가 끊기지 않고
//   자연스럽게 옮겨진다(32px = 영역 왼쪽 안쪽 여백 64px의 절반, 영역 전체 기준으로 가운데를 맞춘다).
// - 1024px 미만: 폼 위로 올라오고 아래 모서리가 둥근 첫 화면. 로고 + 소개 문구 + 아이폰.
export function AuthIntro({ className }: { className?: string }) {
  return (
    <aside
      aria-label="서비스 미리보기"
      className={clsx(
        'relative flex flex-col items-center gap-6 overflow-hidden rounded-b-4xl bg-page px-5 pt-10 pb-12 text-center',
        'lg:min-h-screen lg:flex-1 lg:basis-0 lg:items-stretch lg:justify-center lg:gap-12 lg:rounded-none lg:py-16 lg:pr-0 lg:pl-16 lg:text-left',
        className,
      )}
    >
      {/* 모바일 첫 화면의 옅은 파란 빛 (장식) */}
      <div aria-hidden="true" className="pointer-events-none absolute top-3/5 left-1/2 size-115 -translate-1/2 rounded-full bg-radial from-action-primary/14 to-transparent to-70% lg:hidden" />

      <div className="relative flex flex-col items-center gap-2 lg:items-start lg:pr-6">
        <BrandLogo className="mb-2 h-6 w-auto lg:hidden" />
        <p className="text-display-sm text-text-primary sm:text-display">
          책상에서도, 주머니에서도
          <br />
          <span className="text-text-brand">하루 한 장씩 쌓이는 취준일기</span>
        </p>
        <p className="hidden text-body text-text-secondary sm:block">사람인·잡코리아·원티드 지원이 날짜별 일기로 정리돼요.</p>
      </div>

      <div aria-hidden="true" className="relative">
        <IPhoneMockup className="lg:hidden" />
        <MacBookMockup className="ml-[max(2.5rem,calc((100%_-_40rem)/2_-_2rem))] max-lg:hidden" />
      </div>
    </aside>
  );
}
