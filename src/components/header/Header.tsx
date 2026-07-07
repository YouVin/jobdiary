import { HeaderActions } from '@/components/header/HeaderActions';

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-card-border bg-white px-6 py-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
          J
        </div>
        <span className="text-lg font-bold text-foreground">취준일기</span>
      </div>

      <HeaderActions />
    </header>
  );
}
