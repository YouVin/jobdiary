// 콜백에는 필요한 복귀 신호만 전달하고 오류·일회성 안내·토큰을 재사용하지 않는다.
export function getBoardRedirectPath(href: string): string {
  const url = new URL(href);
  return url.searchParams.get('import') === '1' ? '/?import=1' : '/';
}

export function getGoogleRedirectUrl(href: string): string {
  const url = new URL(href);
  const search = getBoardRedirectPath(href).slice(1);
  return `${url.origin}/login${search}`;
}
