import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { CompanyInfo, CompanyStrength } from '@/types/companyInfo';

// 지원 상세 "회사 정보" 불러오기·만들기 (#229). 만들기는 Edge Function(company-info)만 한다.
// 서버 규칙(로그인·본인 지원·하루 5번·같은 공고 재사용)은 docs/POSTING_ANALYSIS.md "서버" 참고.

// 서버(_shared/companyInfo/handler.ts)와 같은 값. 서버도 같은 기준으로 다시 막으므로 여기서는 빠른 안내용이다.
export const COMPANY_INFO_MIN_LENGTH = 200;
export const COMPANY_INFO_MAX_LENGTH = 15_000;
export const COMPANY_INFO_DAILY_LIMIT = 5;

const GENERIC_ERROR = '회사 정보를 만들지 못했어요. 잠시 후 다시 해 주세요.';

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '') : [];
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const record = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' ? (value as Record<string, unknown>) : {});

// 예전(#229·#232) 결과는 reason이 "원하는 것" 자리였다. 저장된 예전 결과도 깨지지 않게 옮겨 읽는다.
function strength(value: unknown): CompanyStrength | null {
  const raw = record(value);
  if (typeof raw.strength !== 'string' || typeof raw.quote !== 'string') return null;
  return { strength: raw.strength, quote: raw.quote, wants: text(raw.wants) || text(raw.reason), experiences: strings(raw.experiences) };
}

// 서버·DB의 결과(JSON)를 화면 형식으로. 모르는 모양이면 null(화면은 "없음"으로 다룬다).
export function parseCompanyInfo(result: unknown, createdAt: unknown): CompanyInfo | null {
  if (!result || typeof result !== 'object' || typeof createdAt !== 'string') return null;
  const raw = result as Record<string, unknown>;
  const company = record(raw.company);
  const workplace = record(raw.workplace);
  const strengths: CompanyStrength[] = [];
  if (Array.isArray(raw.strengths)) {
    for (const item of raw.strengths) {
      const parsed = strength(item);
      if (parsed) strengths.push(parsed);
    }
  }
  return {
    about: text(company.about) || text(raw.companySummary), // 예전 결과는 companySummary
    products: strings(company.products).slice(0, 3),
    website: text(company.website),
    hasTalentStatement: raw.hasTalentStatement === true,
    strengths,
    location: text(workplace.location),
    workDays: text(workplace.workDays),
    workHours: text(workplace.workHours),
    fromImage: text(raw.transcript) !== '',
    createdAt,
  };
}

// 대표 사이트를 새 탭 링크로. http(s)가 없으면 https를 붙이고, 그 밖의 주소(javascript: 등)는 버린다.
export function websiteHref(website: string): string | null {
  const value = website.trim();
  if (!value) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

// 근무지를 네이버 지도 검색으로 연다.
export function naverMapHref(location: string): string | null {
  const value = location.trim();
  return value ? `https://map.naver.com/p/search/${encodeURIComponent(value)}` : null;
}

export async function fetchCompanyInfo(applicationId: string): Promise<{ data: CompanyInfo | null; error: string | null }> {
  // 본인 것만 읽힌다(RLS). maybeSingle 대신 limit(1)로 받아 0건도 오류 없이 다룬다.
  const { data, error } = await supabase
    .from('application_analyses')
    .select('result, created_at')
    .eq('application_id', applicationId)
    .limit(1);
  if (error) return { data: null, error: '회사 정보를 불러오지 못했어요.' };
  const row = data?.[0];
  return { data: row ? parseCompanyInfo(row.result, row.created_at) : null, error: null };
}

// 서버가 준 안내 문구를 그대로 보여 준다(한도·짧은 공고 등). 게이트웨이 401은 로그인 안내로 바꾼다.
export async function companyInfoErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response | undefined;
    if (response?.status === 401) return '로그인이 만료됐어요. 새로고침한 뒤 다시 해 주세요.';
    try {
      const body = (await response?.json()) as { error?: unknown } | undefined;
      if (typeof body?.error === 'string' && body.error) return body.error;
    } catch {
      // 본문이 JSON이 아니면 기본 문구
    }
    return GENERIC_ERROR;
  }
  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) return '연결이 불안정해요. 잠시 후 다시 해 주세요.';
  return GENERIC_ERROR;
}

// 공고는 글 또는 이미지 조각(#232) 중 하나만 보낸다. 이미지는 lib/postingImage.ts가 잘라 만든 JPEG base64다.
export type CompanyInfoPosting = { postingText: string } | { postingImages: Array<{ mediaType: 'image/jpeg'; data: string }> };

export async function requestCompanyInfo(
  applicationId: string,
  posting: CompanyInfoPosting,
  regenerate: boolean,
): Promise<{ data: CompanyInfo | null; cached: boolean; error: string | null }> {
  const { data, error } = await supabase.functions.invoke<{ companyInfo?: { result?: unknown; createdAt?: unknown }; cached?: boolean }>('company-info', {
    body: { applicationId, ...posting, regenerate },
  });
  if (error) return { data: null, cached: false, error: await companyInfoErrorMessage(error) };
  const info = parseCompanyInfo(data?.companyInfo?.result, data?.companyInfo?.createdAt);
  if (!info) return { data: null, cached: false, error: GENERIC_ERROR };
  return { data: info, cached: data?.cached === true, error: null };
}
