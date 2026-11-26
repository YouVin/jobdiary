import { DashboardClient } from '@/components/dashboard/DashboardClient';

// 홈(/) · 로그인 필요. 화면 구성: components/dashboard/DashboardClient.tsx
// 요약 → 전형 여정 | 지원 경로 → 다가오는 일정 | 주간 지원 | 지원 달력, 회사를 누르면 상세 패널
export default function Home() {
  return <DashboardClient />;
}
