import { publicPageMetadata } from '@/lib/siteMetadata';

export const metadata = publicPageMetadata('개인정보처리방침', '취준일기의 개인정보 처리 항목과 목적, 보관·삭제, 처리위탁 및 이용자 권리를 안내합니다.', '/privacy');

export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-heading-xl text-text-primary">개인정보처리방침</h1>
      <p>시행일: 2026년 10월 17일. 취준일기 운영자 및 개인정보 보호 담당자 황유빈은 서비스 제공에 필요한 개인정보를 다음과 같이 처리합니다. 문의·권리 행사: <a href="mailto:dbqls1210@gmail.com" className="text-brand underline">dbqls1210@gmail.com</a></p>
      <section className="space-y-2">
        <h2 className="text-heading-md text-text-primary">1. 처리 항목과 목적</h2>
        <p>계약 체결·이행을 위해 이메일, 계정 식별자, 인증 정보, 약관 확인 버전·시점을 처리합니다. 이메일 가입의 비밀번호는 인증 제공업체가 해시로 저장하며 운영자가 원문을 조회하지 않습니다. Google 로그인에서는 Google 계정 식별자, 이메일과 제공되는 이름·프로필 이미지 정보를 인증 제공업체가 전달받습니다. Google 비밀번호는 받지 않습니다.</p>
        <p>지원 관리 기능을 이용할 때 회사명, 직무, 플랫폼, 지원 상태·출처, 지원일, 마감일, 면접일, 공고 링크, 외부 지원 식별자 및 선택 입력한 메모·일기를 저장합니다. 확장 프로그램 가져오기는 이용자가 요청한 지원 내역을 처리하며, 외부 채용 사이트의 비밀번호를 취준일기 서버에 저장하지 않습니다.</p>
        <p>서비스 제공·보안과 장애 대응을 위해 접속 IP, 브라우저 정보, 요청 시각·경로, 인증 및 오류 기록이 인프라 제공업체에서 처리될 수 있습니다. 문의 시 이메일과 문의 내용을 처리합니다. 광고 목적의 개인정보 판매나 별도의 광고 추적 기능은 사용하지 않습니다.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-heading-md text-text-primary">2. 보유 및 파기</h2>
        <p>계정 정보와 동의 확인 정보는 탈퇴까지, 지원 기록은 개별 삭제 또는 탈퇴까지 보유합니다. 삭제 기능은 운영 데이터베이스에서 해당 정보를 삭제하며, 법령에 따른 보존 의무가 있는 경우 해당 정보만 분리하여 법정 기간 보관합니다. 문의 내용은 처리 완료 후 1년 이내 삭제합니다.</p>
        <p>인프라 제공업체의 보안 로그와 백업은 운영 데이터와 별도로 제공업체의 계약·보존 정책에 따라 순차 만료됩니다. 따라서 탈퇴가 모든 제공업체의 로그·백업에서 즉시 지워진다는 뜻은 아닙니다. 구체적인 삭제 범위 확인과 요청은 담당자에게 문의할 수 있습니다. 전자 기록은 복구할 수 없도록 삭제하며 종이 자료가 생긴 경우 파쇄합니다.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-heading-md text-text-primary">3. 처리위탁 및 국외 처리</h2>
        <p>서비스 계약 이행에 필요한 인증·데이터 저장을 Supabase Pte. Ltd.에, 웹 호스팅·전송·보안을 Vercel Inc.에 위탁합니다. 별도의 마케팅 목적으로 제3자에게 개인정보를 제공하지 않습니다. 법령에 따른 의무가 있는 경우에는 그 범위에서 처리합니다.</p>
        <p>주 데이터베이스와 인증 서비스는 Supabase의 대한민국 서울 리전(ap-northeast-2)에 있습니다. 운영·지원 과정에서 Supabase의 싱가포르 본사와 미국 관계사 및 수탁 인프라에서 계정·접속 정보가 처리될 수 있습니다. Vercel은 미국 사업자로 접속 IP, 요청 경로, 브라우저·오류 정보를 글로벌 전송·보안 인프라에서 처리합니다. 서비스 접속·인증·지원 요청 시 암호화된 네트워크로 처리되며 목적은 서비스 제공, 보안 및 장애 대응입니다.</p>
        <p>위탁 정보의 보유는 계약에 따른 서비스 제공 기간과 제공업체의 로그·백업 보존 기간에 따릅니다. Supabase 연락처는 privacy@supabase.io, Vercel 연락처는 privacy@vercel.com입니다. 최신 처리 장소와 세부 보존 정책은 <a className="text-brand underline" href="https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq">Supabase 데이터 처리 안내</a>와 <a className="text-brand underline" href="https://vercel.com/legal/dpa">Vercel 처리위탁 계약</a>에서 확인할 수 있습니다.</p>
        <p>해당 처리를 원하지 않으면 가입·로그인을 진행하지 않거나 계정 설정에서 탈퇴하고 담당자에게 처리 중단을 요청할 수 있습니다. 인증·호스팅은 서비스 제공에 필수적이므로 이를 거부하면 서비스 이용이 제한됩니다. Google 로그인 이용 시 Google 자체 개인정보 처리에는 Google의 정책이 적용되며 이메일 가입을 대신 선택할 수 있습니다.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-heading-md text-text-primary">4. 이용자 권리와 안전조치</h2>
        <p>지원 기록을 직접 조회·수정·삭제하고 계정 설정에서 탈퇴할 수 있습니다. 개인정보 열람·정정·삭제·처리정지·내보내기를 담당자에게 요청할 수 있으며 본인 확인 후 법령에서 정한 절차와 기간에 따라 처리합니다. 동의 화면을 통과하지 못해 계정 설정에 접근할 수 없는 경우에도 이메일로 탈퇴를 요청할 수 있습니다.</p>
        <p>로그인 인증과 사용자별 데이터 접근 제한, 암호화된 통신, 관리 권한 제한 및 의존성 보안 점검을 적용합니다. 만 14세 미만을 대상으로 하지 않으며 해당 정보 수집을 알게 되면 확인 후 삭제합니다. 침해 구제는 개인정보침해 신고센터(privacy.kisa.or.kr) 또는 개인정보분쟁조정위원회(kopico.go.kr)를 통해 요청할 수 있습니다.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-heading-md text-text-primary">5. 브라우저 저장 및 변경 안내</h2>
        <p>로그인 유지를 위해 브라우저 저장소에 인증 세션을 보관합니다. 로그아웃으로 세션을 정리할 수 있으며 공용 기기에서는 이용 후 로그아웃해주세요. 필수 저장 기능을 차단하면 로그인 유지가 제한될 수 있습니다. 처리 목적·항목·위탁 등 중요한 변경은 서비스에서 안내하고 법령상 필요한 경우 별도 동의를 받습니다.</p>
      </section>
    </>
  );
}
