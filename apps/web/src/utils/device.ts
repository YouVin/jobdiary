// 크롬 익스텐션을 쓸 수 없는 휴대폰·태블릿인지 (#272). 첫 사용 안내에서 "PC에서 이어서" 문구를 고르는 데만 쓴다.
// 화면 폭이 아니라 기기로 판단한다(좁은 PC 창에서도 익스텐션은 쓸 수 있다).
export function isMobileUserAgent(userAgent: string): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
}
