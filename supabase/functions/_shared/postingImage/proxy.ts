// 공고 본문 이미지 대신 받기 (#238, 결정 기록 003의 3번).
// 잡코리아 본문 이미지 서버(file*.jobkorea.co.kr)는 다른 사이트의 직접 읽기(CORS)를 허용하지 않고,
// 익스텐션 권한을 늘리면 크롬이 업데이트 때 익스텐션을 끄고 재승인을 받는다. 그래서 이 함수가 이미지 파일 1장만 대신 받는다.
// 서버가 아무 주소나 받지 않게(SSRF 방지) 허용 목록·https·리다이렉트 거절·이미지 형식·크기를 막는다.
// 허용 목록은 packages/shared의 isPostingImageUrl과 같아야 한다(웹 테스트 postingImageProxy.test.mjs가 비교).

export const MAX_PROXY_IMAGE_BYTES = 10 * 1024 * 1024;
export const PROXY_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export function isPostingImageUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
    return /^file\d*\.jobkorea\.co\.kr$/.test(url.hostname) || /(^|\.)saraminimage\.co\.kr$/.test(url.hostname);
  } catch {
    return false;
  }
}

export interface FetchedImage {
  status: number;
  contentType: string;
  bytes: Uint8Array | null; // 상한을 넘으면 null
}

export interface PostingImageDeps {
  getUserId(): Promise<string | null>;
  fetchImage(url: string): Promise<FetchedImage>; // 리다이렉트를 따라가지 않고, MAX_PROXY_IMAGE_BYTES까지만 읽는다
  logError(message: string, detail?: unknown): void;
}

export type PostingImageResponse =
  | { status: 200; contentType: string; bytes: Uint8Array }
  | { status: number; json: { error: string; code: string } };

function fail(status: number, error: string, code: string): PostingImageResponse {
  return { status, json: { error, code } };
}

export async function handlePostingImage(deps: PostingImageDeps, rawBody: unknown): Promise<PostingImageResponse> {
  const userId = await deps.getUserId();
  if (!userId) return fail(401, '로그인이 필요해요.', 'unauthorized');
  const url = rawBody && typeof rawBody === 'object' ? (rawBody as Record<string, unknown>).url : undefined;
  if (!isPostingImageUrl(url)) return fail(400, '공고 이미지 주소가 아니에요.', 'bad_url');

  let fetched: FetchedImage;
  try {
    fetched = await deps.fetchImage(url);
  } catch (error) {
    deps.logError('[posting-image] 받기 실패', error);
    return fail(502, '공고 이미지를 받지 못했어요.', 'fetch_failed');
  }
  if (fetched.status !== 200) return fail(502, '공고 이미지를 받지 못했어요.', 'fetch_failed');
  const contentType = fetched.contentType.split(';')[0].trim().toLowerCase();
  if (!PROXY_IMAGE_TYPES.includes(contentType)) return fail(415, '이미지가 아니에요.', 'not_image');
  if (!fetched.bytes) return fail(413, '공고 이미지가 너무 커요.', 'too_large');
  return { status: 200, contentType, bytes: fetched.bytes };
}
