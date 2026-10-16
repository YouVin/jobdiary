// 요청을 시작한 계정과 저장소 세대를 함께 확인한다. DB의 최종 권한 검사는 RLS가 맡는다.
export interface ApplicationRequestContext {
  userId: string;
  isCurrent: () => boolean;
}
