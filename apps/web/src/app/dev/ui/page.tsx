import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { UiShowcase } from './UiShowcase';

export const metadata: Metadata = {
  title: '부품 견본',
  robots: { index: false, follow: false },
};

// 공통 부품 견본 (#201). 개발 환경에서만 열리고 운영에서는 404다.
// 디자인 시스템(https://claude.ai/artifact/RR4qTSJVUe774joAoq3mrf)과 나란히 비교하고, 접근성 검사(verify:ui)가 이 화면을 검사한다.
export default function DevUiPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  return <UiShowcase />;
}
