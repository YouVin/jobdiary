import { clsx } from 'clsx';
import { BrandLogo } from '@/components/common/BrandMark';
import { IPhoneMockup, MacBookMockup } from '@/components/auth/DeviceMockups';

// 로그인 소개 영역 (#202, 캔버스 Login-R5·R5m).
// - 1024px 이상: 폼 오른쪽, 회색 바탕 위 소개 문구 + 맥북. 로고는 폼 쪽에 있다.
//   문구와 맥북은 한 묶음(폭 680 = 맥북 640 + 문구보다 들어간 40)이다. 왼쪽 폼이 가운데 놓인 한 묶음인 것처럼,
//   이 묶음도 넓은 화면에서는 소개 영역 가운데에 온다(#215). 좁으면 묶음이 왼쪽 안쪽 여백에 붙고 맥북 오른쪽 끝이 잘린다.
//   묶음 왼쪽 여백 = max(0, (영역 안쪽 폭 − 680px) / 2 − 32px). 한 식으로 이어져 있어 폭이 바뀌어도 끊기지 않고
//   자연스럽게 옮겨진다(32px = 영역 왼쪽 안쪽 여백 64px의 절반, 영역 전체 기준으로 가운데를 맞춘다).
// - 1024px 미만: 폼 위로 올라오고 아래 모서리가 둥근 첫 화면. 로고 + 소개 문구 + 아이폰.
export function AuthIntro({ className }: { className?: string }) {
  return (
    <aside
      aria-label="서비스 미리보기"
      className={clsx(
        'relative flex flex-col items-center overflow-hidden rounded-b-4xl bg-page px-5 pt-10 pb-12 text-center',
        'lg:min-h-screen lg:flex-1 lg:basis-0 lg:items-stretch lg:justify-center lg:rounded-none lg:py-16 lg:pr-0 lg:pl-16 lg:text-left',
        className,
      )}
    >
      {/* 모바일 첫 화면의 옅은 파란 빛 (장식) */}
      <div aria-hidden="true" className="pointer-events-none absolute top-3/5 left-1/2 size-115 -translate-1/2 rounded-full bg-radial from-action-primary/14 to-transparent to-70% lg:hidden" />

      <div className="relative flex flex-col items-center gap-6 lg:ml-[max(0rem,calc((100%-42.5rem)/2-2rem))] lg:items-start lg:gap-12">
        <div className="flex flex-col items-center gap-2 lg:items-start lg:pr-6">
          <BrandLogo className="mb-2 h-6 w-auto lg:hidden" />
          <p className="text-display-sm text-text-primary sm:text-display">
            책상에서도, 주머니에서도
            <br />
            <span className="text-text-brand">하루 한 장씩 쌓이는 취준일기</span>
          </p>
          <p className="hidden text-body text-text-secondary sm:block">사람인, 잡코리아, 원티드 지원이 날짜별 일기로 정리돼요.</p>
        </div>

        <div aria-hidden="true" className="relative">
          <IPhoneMockup className="lg:hidden" />
          <MacBookMockup className="ml-10 max-lg:hidden" />
        </div>
      </div>
    </aside>
  );
}
