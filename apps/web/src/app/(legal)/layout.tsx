import Link from 'next/link';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 text-body text-text-secondary">
      <nav aria-label="정책 탐색" className="mb-8 flex flex-wrap gap-4 text-brand">
        <Link href="/">취준일기 홈</Link>
        <Link href="/terms">이용약관</Link>
        <Link href="/privacy">개인정보처리방침</Link>
      </nav>
      <article className="space-y-6">{children}</article>
    </main>
  );
}
