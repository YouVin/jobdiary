// 페이지 조회 통계(#256)로 보내는 주소에서 ?쿼리와 #해시를 뺀다.
// 비밀번호 재설정·로그인 확인 주소에는 일회용 코드가, 익스텐션 가져오기에는 ?import=1이 붙는다.
// 통계에는 "어느 화면"만 필요하므로 경로만 남긴다. 주소를 읽지 못하면 보내지 않는다.
export function analyticsUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname;
  } catch {
    return null;
  }
}
