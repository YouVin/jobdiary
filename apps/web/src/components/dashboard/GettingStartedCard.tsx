'use client';

import { clsx } from 'clsx';
import dynamic from 'next/dynamic';
import { type ReactNode, useState, useSyncExternalStore } from 'react';
import { Icon } from '@/components/common/Icon';
import { useExtensionImportState } from '@/components/import/ExtensionImportProvider';
import { Button, buttonClassName } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EXTENSION_STORE_URL } from '@/constants/extension';
import { PLATFORM_INFO, PLATFORM_STATUS_PAGES } from '@/constants/platform';
import { isMobileUserAgent } from '@/utils/device';

const AddApplicationModal = dynamic(() => import('@/components/modal/AddApplicationModal').then((module) => module.AddApplicationModal));

const SITES = ['saramin', 'jobkorea', 'wanted'] as const;
const noopSubscribe = () => () => {};

function Step({ number, done, title, children }: { number: number; done?: boolean; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <span
        aria-hidden="true"
        className={clsx(
          'grid h-8 w-8 shrink-0 place-items-center rounded-full text-label font-bold tabular-nums',
          done ? 'bg-action-primary text-text-on-color' : 'bg-selected text-text-brand-strong',
        )}
      >
        {done ? <Icon name="check" className="h-4 w-4" /> : number}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
        <h2 className="text-body font-semibold text-text-primary">
          {title}
          {done && <span className="ml-2 text-label font-semibold text-success-text">완료</span>}
        </h2>
        {children}
      </div>
    </li>
  );
}

// 첫 사용 안내 (#272): 지원이 0건이면 홈의 빈 통계 대신 보여 준다. 하나라도 저장되면 원래 홈으로 바뀐다.
// 익스텐션 설치 → 채용 사이트 지원현황에서 수집 → 취준일기로 가져오기. 익스텐션 없이 직접 추가도 할 수 있다.
// 휴대폰에서는 익스텐션을 쓸 수 없어 "PC에서 이어서"를 먼저 알린다.
export function GettingStartedCard() {
  const { isExtensionAvailable } = useExtensionImportState();
  const isMobile = useSyncExternalStore(noopSubscribe, () => isMobileUserAgent(navigator.userAgent), () => false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <Card aria-labelledby="getting-started-title" gap="lg" className="motion-safe:animate-rise">
      {/* ── 머리: 제목·한 줄 설명 ── */}
      <div className="flex flex-col gap-2">
        <h1 id="getting-started-title" className="text-title-1-sm text-balance break-keep text-text-primary sm:text-title-1">
          흩어진 지원 내역을 한곳에 모아 볼까요?
        </h1>
        <p className="break-keep text-body text-text-secondary">
          사람인, 잡코리아, 원티드에서 지원한 곳을 익스텐션이 한 번에 가져와요. 3단계면 끝나요.
        </p>
      </div>

      {/* ── 휴대폰: PC에서 이어서 ── */}
      {isMobile && (
        <p role="note" className="break-keep rounded-md bg-subtle px-4 py-3 text-label text-text-primary">
          익스텐션은 PC의 크롬에서만 쓸 수 있어요. PC에서 이 주소로 다시 들어와 이어서 해 주세요. 휴대폰에서는 아래 <b className="font-semibold">직접 추가</b>로 먼저 기록할 수 있어요.
        </p>
      )}

      {/* ── 3단계 ── */}
      <ol className="flex flex-col gap-5">
        <Step number={1} done={isExtensionAvailable} title="크롬 익스텐션 설치하기">
          {isExtensionAvailable ? (
            <p className="text-label text-text-secondary">이 브라우저에 취준일기 익스텐션이 연결돼 있어요.</p>
          ) : (
            <div className="flex flex-col items-start gap-2">
              <a href={EXTENSION_STORE_URL} target="_blank" rel="noopener noreferrer" className={buttonClassName({ size: 'sm' })}>
                크롬 웹스토어에서 설치
                <span className="sr-only"> (새 탭에서 열림)</span>
              </a>
              <p className="break-keep text-caption font-normal text-text-secondary">설치한 뒤 이 페이지를 새로고침하면 완료로 바뀌어요.</p>
            </div>
          )}
        </Step>

        <Step number={2} title="채용 사이트 지원현황에서 수집하기">
          <p className="break-keep text-label text-text-secondary">
            사이트에 로그인한 뒤 지원현황 페이지에서 익스텐션 아이콘을 누르고 <b className="font-semibold text-text-primary">지원내역 수집하기</b>를 눌러요.
          </p>
          <div className="flex flex-wrap gap-2">
            {SITES.map((site) => (
              <a key={site} href={PLATFORM_STATUS_PAGES[site].url} target="_blank" rel="noopener noreferrer" className={buttonClassName({ variant: 'secondary', size: 'sm' })}>
                {PLATFORM_INFO[site].label} 지원현황
                <Icon name="external" className="h-4 w-4" />
                <span className="sr-only"> (새 탭에서 열림)</span>
              </a>
            ))}
          </div>
        </Step>

        <Step number={3} title="취준일기로 가져오기">
          <p className="break-keep text-label text-text-secondary">
            익스텐션에서 <b className="font-semibold text-text-primary">취준일기로 가져오기</b>를 누르면 이 화면이 열리면서 저장돼요. 다른 사이트도 같은 순서로 더할 수 있어요.
          </p>
        </Step>
      </ol>

      {/* ── 아래: 익스텐션 없이 직접 추가 ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-divider pt-5">
        <p className="break-keep text-label text-text-secondary">익스텐션 없이 한 곳씩 기록해도 괜찮아요.</p>
        <Button variant="secondary" size="sm" icon="plus" onClick={() => setIsAddOpen(true)}>
          직접 추가
        </Button>
      </div>
      {isAddOpen && <AddApplicationModal isOpen onClose={() => setIsAddOpen(false)} />}
    </Card>
  );
}
