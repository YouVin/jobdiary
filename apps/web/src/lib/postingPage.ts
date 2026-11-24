import { parsePostingContent, POSTING_READ_TYPE, type PostingContent } from '@jobdiary/shared';
import { JOBDIARY_EXTENSION_ID } from '@/constants/extension';
import { slicePostingImage, type PostingImagePayload } from '@/lib/postingImage';
import { supabase } from '@/lib/supabase';

// 공고 페이지에서 가져오기 (#238, 결정 기록 003). 익스텐션이 사용자 브라우저에서 공고 페이지를 읽어 주면
// 본문 이미지를 받아(사람인은 직접, 잡코리아는 서버 대신 받기) 잘라서 회사 정보 서버로 보낼 형태로 만든다.

const EXTENSION_TIMEOUT_MS = 20_000;

export class PostingPageError extends Error {
  constructor(public readonly code: 'no_extension' | 'read_failed' | 'image_failed', message: string) {
    super(message);
  }
}

export function isExtensionReachable(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime?.sendMessage;
}

export async function readPostingFromExtension(url: string): Promise<PostingContent> {
  if (!isExtensionReachable()) {
    throw new PostingPageError('no_extension', '취준일기 익스텐션을 설치하면 공고 페이지에서 바로 가져올 수 있어요. 지금은 공고 화면을 캡처해 넣어 주세요.');
  }
  const response = await new Promise<unknown>((resolve, reject) => {
    const timer = setTimeout(() => reject(new PostingPageError('read_failed', '공고 페이지를 읽는 데 시간이 너무 걸려요. 잠시 후 다시 해 주세요.')), EXTENSION_TIMEOUT_MS);
    chrome.runtime.sendMessage(JOBDIARY_EXTENSION_ID, { type: POSTING_READ_TYPE, url }, (result) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError) {
        // 이전 버전 익스텐션은 이 요청을 모른다(응답 없음) → 업데이트 안내
        reject(new PostingPageError('no_extension', '익스텐션을 최신 버전으로 업데이트하면 공고 페이지에서 바로 가져올 수 있어요. 지금은 공고 화면을 캡처해 넣어 주세요.'));
        return;
      }
      resolve(result);
    });
  });
  const ok = response && typeof response === 'object' && (response as { ok?: unknown }).ok === true;
  const posting = ok ? parsePostingContent((response as { posting?: unknown }).posting) : null;
  if (!posting) throw new PostingPageError('read_failed', '공고 페이지를 읽지 못했어요. 공고가 마감됐거나 주소가 바뀌었을 수 있어요. 공고 화면을 캡처해 넣어 주세요.');
  return posting;
}

// 사람인 이미지 서버는 다른 사이트의 직접 읽기(CORS)를 허용해 바로 받고, 잡코리아는 서버(posting-image)가 대신 받는다.
// functions.invoke는 image/* 응답을 글자로 읽어 이미지가 깨지므로 함수 주소를 직접 부른다.
async function loadPostingImage(url: string): Promise<Blob> {
  if (new URL(url).hostname.endsWith('saraminimage.co.kr')) {
    const response = await fetch(url, { credentials: 'omit' });
    if (!response.ok) throw new Error(`image-${response.status}`);
    return response.blob();
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('no-session');
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/posting-image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '', 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) throw new Error(`proxy-${response.status}`);
  return response.blob();
}

export interface PostingPageInput {
  text: string;
  title: string;
  location: string;
  workSchedule: string;
  images: PostingImagePayload[];
}

// 읽은 공고 → 회사 정보 서버 입력. 이미지는 하나라도 못 받으면, 글이 충분할 때만 글로 진행한다.
export async function preparePostingPage(posting: PostingContent, maxSlices: number): Promise<PostingPageInput> {
  const images: PostingImagePayload[] = [];
  for (const url of posting.imageUrls) {
    try {
      images.push(...(await slicePostingImage(await loadPostingImage(url))));
    } catch {
      if (posting.text.length < 100) throw new PostingPageError('image_failed', '공고 이미지를 받지 못했어요. 공고 화면을 캡처해 넣어 주세요.');
    }
  }
  return {
    text: posting.text,
    title: posting.title,
    location: posting.location,
    workSchedule: posting.workSchedule,
    images: images.slice(0, maxSlices),
  };
}
