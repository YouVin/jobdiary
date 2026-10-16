import Link from 'next/link';

export function PolicyLinks() {
  return (
    <>
      <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-brand underline">이용약관</Link>
      {' 및 '}
      <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-brand underline">개인정보처리방침</Link>
    </>
  );
}
