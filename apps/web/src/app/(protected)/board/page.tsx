import { BoardClient } from '@/components/board/BoardClient';

// 지원 보드(/board) · 로그인 필요. 화면 구성: components/board/BoardClient.tsx
// 머리말·보기 탭 → 주간(기본)·보드(칸반)·중복 보기, 지원을 누르면 상세 패널
export default function BoardPage() {
  return <BoardClient />;
}
