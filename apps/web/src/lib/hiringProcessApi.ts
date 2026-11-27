import { getPostingReference } from '@jobdiary/shared';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { PostingPageError, preparePostingPage, readPostingFromExtension } from '@/lib/postingPage';
import { supabase } from '@/lib/supabase';
import type { Application, HiringProcess, ProcessStep } from '@/types/application';
import { createHiringProcess, extractProcessFromText } from '@/utils/hiringProcess';

// 공고 전형 절차 읽기 (#295): 익스텐션으로 공고 페이지 읽기 → 글에 절차가 있으면 규칙(비용 0) →
// 없으면 이미지·글을 서버(hiring-process)로 보내 AI로 읽기. 같은 공고는 서버가 결과를 재사용한다.

const MAX_PROCESS_IMAGES = 8; // 서버 MAX_PROCESS_IMAGES와 같게
const MIN_TEXT_FOR_AI = 50; // 이보다 짧은 글뿐이고 이미지도 없으면 읽을 것이 없다

// 한 지원의 결과: 저장할 절차, 오늘은 멈춤(익스텐션 없음·하루 한도), 다음에 다시(일시 오류)
export type ProcessReadResult = { process: HiringProcess } | { stop: 'no_extension' | 'limit' } | { retry: true };

async function requestFromServer(applicationId: string, text: string, images: Array<{ mediaType: string; data: string }>): Promise<ProcessStep[] | 'limit' | null> {
  const { data, error } = await supabase.functions.invoke<{ steps?: ProcessStep[] }>('hiring-process', { body: { applicationId, text, images } });
  if (error) {
    if (error instanceof FunctionsHttpError && (error.context as Response | undefined)?.status === 429) return 'limit';
    return null;
  }
  return Array.isArray(data?.steps) ? data.steps : null;
}

export async function readHiringProcess(application: Pick<Application, 'id' | 'url'>, now = new Date()): Promise<ProcessReadResult> {
  const reference = getPostingReference(application.url);
  if (!reference) return { process: createHiringProcess([], 'none', now) };

  // 1) 공고 페이지 읽기. 마감·삭제로 못 읽으면 "못 찾음"으로 저장해 다시 읽지 않는다
  let posting;
  try {
    posting = await readPostingFromExtension(reference.url);
  } catch (error) {
    if (error instanceof PostingPageError && error.code === 'no_extension') return { stop: 'no_extension' };
    if (error instanceof PostingPageError && error.code === 'read_failed') return { process: createHiringProcess([], 'none', now) };
    return { retry: true };
  }

  // 2) 글에 적힌 절차는 규칙으로
  const fromText = extractProcessFromText(posting.text);
  if (fromText.length >= 2) return { process: createHiringProcess(fromText, 'text', now) };

  // 3) 이미지·글을 AI로. 이미지를 못 받으면 다음에 다시
  let page;
  try {
    page = await preparePostingPage(posting, MAX_PROCESS_IMAGES);
  } catch {
    return { retry: true };
  }
  if (page.images.length === 0 && page.text.trim().length < MIN_TEXT_FOR_AI) return { process: createHiringProcess([], 'none', now) };
  const steps = await requestFromServer(application.id, page.text, page.images);
  if (steps === 'limit') return { stop: 'limit' };
  if (!steps) return { retry: true };
  return { process: createHiringProcess(steps, steps.length > 0 ? 'ai' : 'none', now) };
}
