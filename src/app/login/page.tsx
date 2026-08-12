import { LoginForm } from '@/components/auth/LoginForm';
import { AuthVisualPanel } from '@/components/auth/AuthVisualPanel';

// 모바일(기본): 세로로 쌓임 — 비주얼(축약 헤더)이 위, 폼이 아래(DOM 순서 그대로).
// 데스크탑(md~): 가로 2단 — order-last로 비주얼을 오른쪽으로 보낸다. 폼(LoginForm)은 하나뿐이고
// 위치만 CSS로 바뀐다 — 로직/마크업을 두 벌 만들지 않는다.
export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <AuthVisualPanel className="md:order-last" />
      <div className="flex flex-1 items-center justify-center bg-page px-4 py-10 md:w-1/2 md:py-16">
        <LoginForm />
      </div>
    </div>
  );
}
