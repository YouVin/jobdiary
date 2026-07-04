import { Header } from "@/components/header/Header";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-page">
      <Header />
      <main className="flex-1 px-6 py-8">{/* 칸반보드 영역 (다음 이슈에서 구현) */}</main>
    </div>
  );
}
