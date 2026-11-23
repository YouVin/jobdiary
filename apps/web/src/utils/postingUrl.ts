// 공고 주소는 http(s)만 링크로 연다. javascript: 같은 주소나 빈 값은 링크를 만들지 않는다.
export function getPostingUrl(url: string | undefined): string | null {
  const trimmed = url?.trim();
  return trimmed && /^https?:\/\//i.test(trimmed) ? trimmed : null;
}
