import { Header } from '@/components/header/Header';
import { AccountClient } from '@/components/account/AccountClient';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function AccountPage() {
  return (
    <AuthGuard>
      <div className="flex min-h-full flex-1 flex-col bg-page">
        <Header />
        <main className="mx-auto w-full max-w-360 flex-1 px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
          <AccountClient />
        </main>
      </div>
    </AuthGuard>
  );
}
