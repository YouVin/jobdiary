'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, buttonClassName } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Overlay';
import { drawRecapImage, type RecapColors } from '@/lib/recapImage';
import type { Application } from '@/types/application';
import { describeMonthlyRecap, getMonthlyRecap } from '@/utils/monthlyRecap';

interface MonthlyRecapDialogProps {
  applications: Application[];
  today: string;
  onClose: () => void;
}

// 디자인 토큰 클래스를 잠깐 붙여 실제 색을 읽는다. 캔버스는 CSS 클래스를 못 쓰므로 값을 화면에서 가져온다.
function readColors(): RecapColors {
  const probe = (className: string, property: 'color' | 'backgroundColor') => {
    const element = document.createElement('span');
    element.className = className;
    document.body.appendChild(element);
    const value = getComputedStyle(element)[property];
    element.remove();
    return value;
  };
  return {
    page: probe('bg-page', 'backgroundColor'),
    surface: probe('bg-surface', 'backgroundColor'),
    subtle: probe('bg-subtle', 'backgroundColor'),
    primary: probe('text-text-primary', 'color'),
    secondary: probe('text-text-secondary', 'color'),
    brand: probe('text-text-brand', 'color'),
  };
}

// 이번 달 돌아보기 (#275): 숫자 카드 이미지를 만들어 보여 주고, 저장하거나(PC) 바로 공유한다(휴대폰).
// 회사 이름은 넣지 않는다. 밖에 올리는 이미지라 숫자만 담는다.
export function MonthlyRecapDialog({ applications, today, onClose }: MonthlyRecapDialogProps) {
  // ── 숫자·이미지 ──
  const recap = useMemo(() => getMonthlyRecap(applications, today), [applications, today]);
  const description = describeMonthlyRecap(recap);
  const [image, setImage] = useState<{ url: string; file: File } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileName = `취준일기-${recap.month}.png`;

  useEffect(() => {
    let url: string | null = null;
    let isCurrent = true;
    drawRecapImage(recap, readColors(), getComputedStyle(document.body).fontFamily)
      .then((blob) => {
        if (!isCurrent) return;
        url = URL.createObjectURL(blob);
        setImage({ url, file: new File([blob], fileName, { type: 'image/png' }) });
      })
      .catch(() => {
        if (isCurrent) setError('이미지를 만들지 못했어요. 잠시 후 다시 열어 주세요.');
      });
    return () => {
      isCurrent = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [recap, fileName]);

  // ── 공유: 파일 공유를 지원하는 브라우저(주로 휴대폰)만 버튼을 보여 준다 ──
  const canShare = Boolean(image && typeof navigator.canShare === 'function' && navigator.canShare({ files: [image.file] }));
  const share = async () => {
    if (!image) return;
    try {
      await navigator.share({ files: [image.file], title: `${recap.monthNumber}월 돌아보기`, text: description });
    } catch {
      // 공유 창을 닫은 경우도 여기로 온다. 알릴 것이 없다.
    }
  };

  return (
    <Dialog
      isOpen
      onClose={onClose}
      title={`${recap.monthNumber}월 돌아보기`}
      description="이번 달 숫자를 이미지로 저장해 쓰레드·인스타에 올려 보세요. 회사 이름은 들어가지 않아요."
      footer={
        <>
          {/* ── 아래 버튼: 공유(휴대폰)·이미지 저장 ── */}
          {canShare && (
            <Button variant="secondary" onClick={() => void share()}>
              공유하기
            </Button>
          )}
          {image ? (
            <a href={image.url} download={fileName} className={buttonClassName({ variant: 'primary' })}>
              이미지 저장
            </a>
          ) : (
            <Button isLoading loadingLabel="이미지 만드는 중">
              이미지 저장
            </Button>
          )}
        </>
      }
    >
      {/* ── 카드 미리보기(대체 글에 숫자 전체) ── */}
      <div className="flex justify-center rounded-lg bg-page p-2">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- 브라우저에서 방금 만든 blob 이미지라 next/image 최적화 대상이 아니다
          <img src={image.url} alt={`${recap.monthNumber}월 돌아보기 카드: ${description}`} className="h-auto w-full max-w-80 rounded-md" />
        ) : (
          <div role="status" className="grid aspect-4/5 w-full max-w-80 place-items-center rounded-md bg-surface text-label text-text-secondary">
            {error ?? '카드를 만들고 있어요'}
          </div>
        )}
      </div>
    </Dialog>
  );
}
