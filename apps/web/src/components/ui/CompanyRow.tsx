import { clsx } from 'clsx';
import Image from 'next/image';
import type { ReactNode } from 'react';
import type { Platform } from '@/types/application';

// 디자인 시스템 회사 한 줄 (#201). 메인·지원 보드·중복 어디서든 회사는 이 한 줄로만 보여준다.
// 왼쪽 회사 첫 글자 칸(32) + 모서리 사이트 아이콘 · 가운데 회사(15/600)와 설명(13) · 오른쪽 뱃지나 숫자 하나.
// 구분선은 아이콘만큼 들여 쓴다(토스·당근 방식).

const SITE_ICON: Record<Exclude<Platform, 'manual'>, { src: string; label: string }> = {
  saramin: { src: '/brands/saramin.png', label: '사람인' },
  jobkorea: { src: '/brands/jobkorea.png', label: '잡코리아' },
  wanted: { src: '/brands/wanted.png', label: '원티드' },
};

// (주)·주식회사·괄호를 빼고 첫 글자를 쓴다. 비면 '?'.
export function companyInitial(company: string): string {
  return company.replace(/\(주\)|주식회사|[()]/g, '').trim().charAt(0) || '?';
}

interface CompanyAvatarProps {
  company: string;
  platform: Platform;
  size?: 'md' | 'sm'; // 32 · 24
}

// 첫 글자 칸은 장식이다. 회사 이름과 사이트 이름은 옆 글자(또는 sr-only)가 전한다.
export function CompanyAvatar({ company, platform, size = 'md' }: CompanyAvatarProps) {
  const site = platform === 'manual' ? null : SITE_ICON[platform];
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'relative grid shrink-0 place-items-center rounded-sm bg-subtle font-bold text-text-secondary',
        size === 'md' ? 'h-8 w-8 text-label' : 'h-6 w-6 text-caption',
      )}
    >
      {companyInitial(company)}
      {site && (
        <Image
          src={site.src}
          alt=""
          width={32}
          height={32}
          unoptimized
          className="absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 border-surface bg-surface"
        />
      )}
    </span>
  );
}

interface CompanyRowProps {
  company: string;
  platform: Platform;
  description?: ReactNode; // 일정·직무 (예: 공고 마감 · 웹 개발)
  trailing?: ReactNode; // 뱃지나 숫자 하나. 누르는 요소는 넣지 않는다.
  onOpen?: () => void; // 주면 줄 전체가 버튼이 된다 (상세 패널 열기)
  openLabel?: string; // 버튼의 접근성 이름 (기본: "회사 상세 보기")
}

export function CompanyRow({ company, platform, description, trailing, onOpen, openLabel }: CompanyRowProps) {
  const siteName = platform === 'manual' ? '직접 입력' : SITE_ICON[platform].label;
  const body = (
    <>
      <span className="flex shrink-0 items-center py-3">
        <CompanyAvatar company={company} platform={platform} />
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-3 border-t border-line-divider py-3 group-first:border-t-0">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-semibold leading-snug text-text-primary">{company}</span>
          {description && <span className="block truncate text-label text-text-secondary">{description}</span>}
          <span className="sr-only">{`, ${siteName}`}</span>
        </span>
        {trailing}
      </span>
    </>
  );

  return (
    <li className="group">
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={openLabel}
          className="flex w-full cursor-pointer items-stretch gap-3 rounded-sm text-left transition-colors duration-fast hover:bg-subtle focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {body}
        </button>
      ) : (
        <div className="flex items-stretch gap-3">{body}</div>
      )}
    </li>
  );
}

interface RowListProps {
  label?: string; // 목록의 접근성 이름
  children: ReactNode;
  className?: string;
}

// 회사 한 줄 묶음. 첫 줄은 위 구분선이 없다.
export function RowList({ label, children, className }: RowListProps) {
  return (
    <ul aria-label={label} className={clsx('flex flex-col', className)}>
      {children}
    </ul>
  );
}
