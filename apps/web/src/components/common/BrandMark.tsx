import { clsx } from 'clsx';
import Image from 'next/image';

interface BrandMarkProps {
  className?: string;
  // 20px 이하로 쓸 때는 선이 굵은 작은 크기용 마크를 쓴다 (브라우저 탭 아이콘과 같은 그림).
  small?: boolean;
}

// 취준일기 로고 (#197): 사용자가 직접 디자인한 일기장 마크. 네이비(#253A63) 일기장 + 주황·회색 책갈피 + 주황 밑줄.
// 원본은 public/brand/ (logo-mark·logo-mark-small·logo-full·logo-full-dark .svg)이고, 브라우저 탭 아이콘은
// src/app/icon.svg(= logo-mark-small)다. 장식이므로 대체 텍스트를 비우고, 옆 글자나 링크의 aria-label이 이름을 전한다.
export function BrandMark({ className = 'h-9 w-9', small = false }: BrandMarkProps) {
  return (
    <Image
      src={small ? '/brand/logo-mark-small.svg' : '/brand/logo-mark.svg'}
      width={130}
      height={130}
      alt=""
      className={clsx('shrink-0', className)}
    />
  );
}

interface BrandLogoProps {
  className?: string;
  alt?: string;
}

// 마크 + "취준일기" 글자 로고. 글자는 로고 파일 안에 도형으로 들어 있어 글꼴과 무관하게 같은 모양이다.
// 링크 안에서 링크가 이미 이름을 가지면 alt를 비운다.
export function BrandLogo({ className = 'h-9 w-auto', alt = '취준일기' }: BrandLogoProps) {
  return <Image src="/brand/logo-full.svg" width={441} height={130} alt={alt} className={clsx('shrink-0', className)} />;
}
