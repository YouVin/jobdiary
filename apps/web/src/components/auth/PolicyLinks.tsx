import Link from 'next/link';

export function PolicyLinks() {
  return (
    <>
      <Link href="/terms" target="_blank" rel="noopener noreferrer" className="cursor-pointer rounded-sm text-brand underline transition-colors hover:text-brand-hover active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">이용약관<span className="sr-only"> (새 탭에서 열림)</span></Link>
      {' 및 '}
      <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="cursor-pointer rounded-sm text-brand underline transition-colors hover:text-brand-hover active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">개인정보처리방침<span className="sr-only"> (새 탭에서 열림)</span></Link>
    </>
  );
}
