import { UpdatePasswordForm } from '@/components/auth/UpdatePasswordForm';

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-page px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-body font-bold text-on-brand">
          J
        </div>
        <span className="text-heading-md font-bold text-text-primary">취준일기</span>
      </div>

      <UpdatePasswordForm />
    </div>
  );
}
