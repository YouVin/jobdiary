import { UpdatePasswordForm } from '@/components/auth/UpdatePasswordForm';

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-page px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
          J
        </div>
        <span className="text-lg font-bold text-foreground">취준일기</span>
      </div>

      <UpdatePasswordForm />
    </div>
  );
}
