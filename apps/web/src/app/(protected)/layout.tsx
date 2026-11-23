import type { Metadata } from 'next';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Header } from '@/components/header/Header';
import { PRIVATE_ROBOTS } from '@/lib/siteMetadata';
import { MAIN_CONTENT_ID } from '@/components/ui/SkipLink';

export const metadata: Metadata = { robots: PRIVATE_ROBOTS };

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-full flex-1 flex-col bg-page">
        <Header />
        <main id={MAIN_CONTENT_ID} tabIndex={-1} className="focus:outline-none mx-auto w-full max-w-360 flex-1 px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
