import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: '이용약관 | 취준일기' };

export default function TermsPage() {
  return (
    <>
      <h1 className="text-heading-xl text-text-primary">취준일기 이용약관</h1>
      <p>시행일: 2026년 10월 17일 · 운영자: 황유빈 · 문의: <a className="text-brand underline" href="mailto:dbqls1210@gmail.com">dbqls1210@gmail.com</a></p>
      <section className="space-y-2">
        <h2 className="text-heading-md text-text-primary">1. 서비스와 이용계약</h2>
        <p>취준일기는 채용 지원 내역, 일정, 메모와 일기를 개인이 관리하는 무료 서비스입니다. 이용자는 안내된 약관을 확인하고 동의하여 이용합니다. 만 14세 미만의 가입은 지원하지 않습니다. 본인 계정을 사용하고 인증 정보를 안전하게 관리해주세요.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-heading-md text-text-primary">2. 기록과 자동 분류</h2>
        <p>직접 입력하거나 이용자가 요청한 확장 프로그램 가져오기로 지원 내역을 저장합니다. 이용자가 직접 상태를 변경하지 않은 지원완료 내역은 한국 시간 기준 마감일이 지나면 탈락으로 자동 분류할 수 있습니다. 상시 모집이나 마감일이 없는 내역은 자동 분류하지 않습니다.</p>
        <p>자동 분류는 기록 정리를 돕는 기능이며 채용사의 공식 결과 통보가 아닙니다. 실제 결과와 일정은 채용사에서 확인하고, 필요한 경우 상태와 마감일을 직접 수정해주세요. 서비스가 지원·합격 또는 채용 결과를 보장하지 않습니다.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-heading-md text-text-primary">3. 이용자의 권리와 준수사항</h2>
        <p>입력한 기록의 권리는 이용자에게 있습니다. 운영자는 서비스 제공과 유지에 필요한 범위에서만 처리합니다. 타인의 계정이나 개인정보 도용, 무단 접근, 서비스 장애 유발, 법령이나 타인의 권리를 침해하는 기록·가져오기는 금지합니다. 외부 채용 사이트의 이용조건도 준수해주세요.</p>
        <p>주민등록번호, 건강 정보 등 민감한 정보나 타인의 연락처를 메모에 입력하지 마세요. 개인정보 처리 내용과 권리 행사 방법은 <Link href="/privacy" className="text-brand underline">개인정보처리방침</Link>에서 확인할 수 있습니다.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-heading-md text-text-primary">4. 중단·변경 및 책임</h2>
        <p>점검, 장애, 외부 서비스 변경으로 서비스가 일시 중단될 수 있습니다. 중요한 변경이나 종료는 가능한 경우 서비스 내 안내 또는 등록된 이메일로 사전에 알립니다. 중대한 약관 위반이 있으면 사유를 안내하고 이용을 제한할 수 있으며 문의 창구로 이의를 제기할 수 있습니다.</p>
        <p>운영자는 오류를 확인하면 합리적인 범위에서 복구하고 안내합니다. 운영자의 고의·과실로 발생한 손해에 대한 법령상 책임을 배제하지 않습니다. 중요한 기록은 별도로 보관해주세요.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-heading-md text-text-primary">5. 탈퇴·약관 변경 및 분쟁</h2>
        <p>계정 설정에서 탈퇴하면 계정과 연결된 지원 내역을 삭제합니다. 기능을 이용할 수 없으면 문의 이메일로 요청할 수 있습니다. 약관의 중요한 변경은 사전에 알리고 필요한 동의를 다시 받습니다. 동의하지 않는 이용자는 이용을 중단하고 탈퇴할 수 있습니다. 분쟁에는 대한민국 법령과 법령에서 정한 관할을 적용합니다.</p>
      </section>
    </>
  );
}
