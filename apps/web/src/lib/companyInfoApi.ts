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

function strength(value: unknown): CompanyStrength | null {
  if (!value || typeof value !== 'object') return null;
  const { strength: name, quote, reason, prepQuestion } = value as Record<string, unknown>;
  if (typeof name !== 'string' || typeof quote !== 'string') return null;
  return { strength: name, quote, reason: typeof reason === 'string' ? reason : '', prepQuestion: typeof prepQuestion === 'string' ? prepQuestion : '' };
}

// 서버·DB의 결과(JSON)를 화면 형식으로. 모르는 모양이면 null(화면은 "없음"으로 다룬다).
export function parseCompanyInfo(result: unknown, createdAt: unknown): CompanyInfo | null {
  if (!result || typeof result !== 'object' || typeof createdAt !== 'string') return null;
  const raw = result as Record<string, unknown>;
  const skills = (raw.skills && typeof raw.skills === 'object' ? raw.skills : {}) as Record<string, unknown>;
  const strengths: CompanyStrength[] = [];
  if (Array.isArray(raw.strengths)) {
    for (const item of raw.strengths) {
      const parsed = strength(item);
      if (parsed) strengths.push(parsed);
    }
  }
  return {
    summary: typeof raw.companySummary === 'string' ? raw.companySummary : '',
    hasTalentStatement: raw.hasTalentStatement === true,
    strengths,
    requiredSkills: strings(skills.required),
    preferredSkills: strings(skills.preferred),
    createdAt,
  };
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

export async function requestCompanyInfo(
  applicationId: string,
  postingText: string,
  regenerate: boolean,
): Promise<{ data: CompanyInfo | null; cached: boolean; error: string | null }> {
  const { data, error } = await supabase.functions.invoke<{ companyInfo?: { result?: unknown; createdAt?: unknown }; cached?: boolean }>('company-info', {
    body: { applicationId, postingText, regenerate },
  });
  if (error) return { data: null, cached: false, error: await companyInfoErrorMessage(error) };
  const info = parseCompanyInfo(data?.companyInfo?.result, data?.companyInfo?.createdAt);
  if (!info) return { data: null, cached: false, error: GENERIC_ERROR };
  return { data: info, cached: data?.cached === true, error: null };
}
