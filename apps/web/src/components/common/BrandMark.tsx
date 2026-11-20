import { clsx } from 'clsx';
import Image from 'next/image';

interface BrandMarkProps {
  className?: string;
}

// 취준일기 로고 마크 (#193): 일기장 페이지 + 체크 + 책갈피.
// 원본은 public/brand/logo-mark.svg이고, 브라우저 탭 아이콘(src/app/icon.svg)도 같은 그림이다.
// 장식이므로 대체 텍스트를 비우고, 옆의 "취준일기" 글자나 링크의 aria-label이 이름을 전한다.
export function BrandMark({ className = 'h-9 w-9' }: BrandMarkProps) {
  return <Image src="/brand/logo-mark.svg" width={32} height={32} alt="" className={clsx('shrink-0', className)} />;
}
