import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Application } from '@/types/application';

type ApiError = PostgrestError | Error;

export interface ApplicationsResult {
  applications: Application[];
  error: ApiError | null;
}

export interface ApplicationResult {
  application: Application | null;
  error: ApiError | null;
}

export interface DeleteResult {
  error: ApiError | null;
}

// update 시 필드별 의미: undefined = 변경 안 함(요청에서 제외), null = 명시적으로 비움(DB에 null 저장).
// company/position 등 필수 필드는 애초에 비울 수 없으므로 null을 허용하지 않는다.
export type ApplicationChanges = Partial<
  Omit<Application, 'id' | 'updatedAt' | 'memo' | 'diary' | 'interviewDate' | 'url' | 'externalId'>
> & {
  memo?: string | null;
  diary?: Application['diary'] | null;
  interviewDate?: string | null;
  url?: string | null;
  externalId?: string | null;
};

const TABLE_NAME = 'applications';

// DB의 applications 행 (snake_case). docs/SUPABASE.md §2 스키마와 대응.
interface ApplicationRow {
  id: string;
  user_id: string;
  company: string;
  position: string;
  platform: Application['platform'];
  status: Application['status'];
  applied_at: string;
  updated_at: string;
  created_at: string;
  memo: string | null;
  diary: Application['diary'] | null;
  interview_date: string | null;
  url: string | null;
  external_id: string | null;
}

// DB 행(snake_case) → 앱에서 쓰는 Application(camelCase)
function rowToApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    company: row.company,
    position: row.position,
    platform: row.platform,
    status: row.status,
    appliedAt: row.applied_at,
    updatedAt: row.updated_at,
    memo: row.memo ?? undefined,
    diary: row.diary ?? undefined,
    interviewDate: row.interview_date ?? undefined,
    url: row.url ?? undefined,
    externalId: row.external_id ?? undefined,
  };
}

// 새 지원건(camelCase) + userId → insert용 행(snake_case). id/created_at은 DB가 채운다.
function applicationToInsertRow(app: Omit<Application, 'id' | 'updatedAt'>, userId: string) {
  return {
    user_id: userId,
    company: app.company,
    position: app.position,
    platform: app.platform,
    status: app.status,
    applied_at: app.appliedAt,
    updated_at: new Date().toISOString(),
    memo: app.memo ?? null,
    diary: app.diary ?? null,
    interview_date: app.interviewDate ?? null,
    url: app.url ?? null,
    external_id: app.externalId ?? null,
  };
}

// 수정할 필드(camelCase, 일부만)를 update용 행(snake_case)으로 변환한다.
// updatedAt은 호출자가 뭘 넘기든 무시하고 항상 현재 시각으로 갱신한다 (기존 로컬 스토어와 동일한 규칙).
function changesToUpdateRow(changes: ApplicationChanges) {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (changes.company !== undefined) {
    row.company = changes.company;
  }
  if (changes.position !== undefined) {
    row.position = changes.position;
  }
  if (changes.platform !== undefined) {
    row.platform = changes.platform;
  }
  if (changes.status !== undefined) {
    row.status = changes.status;
  }
  if (changes.appliedAt !== undefined) {
    row.applied_at = changes.appliedAt;
  }
  if (changes.memo !== undefined) {
    row.memo = changes.memo ?? null;
  }
  if (changes.diary !== undefined) {
    row.diary = changes.diary ?? null;
  }
  if (changes.interviewDate !== undefined) {
    row.interview_date = changes.interviewDate ?? null;
  }
  if (changes.url !== undefined) {
    row.url = changes.url ?? null;
  }
  if (changes.externalId !== undefined) {
    row.external_id = changes.externalId ?? null;
  }

  return row;
}

// 현재 로그인 사용자의 id. 세션이 없으면 던진다.
// 실제로는 AuthGuard가 비로그인 접근을 막지만, 이 모듈만 놓고 봐도 안전하도록 방어적으로 확인한다.
async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error('로그인된 사용자가 없어 요청을 처리할 수 없습니다.');
  }

  return data.user.id;
}

// 현재 로그인 사용자의 지원 내역 전체 조회.
// RLS가 본인 것만 반환하지만, user_id 필터도 명시적으로 걸어 의도를 코드로도 드러낸다.
export async function fetchApplications(): Promise<ApplicationsResult> {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from(TABLE_NAME).select('*').eq('user_id', userId);

    if (error) {
      return { applications: [], error };
    }

    return { applications: (data as ApplicationRow[]).map(rowToApplication), error: null };
  } catch (error) {
    return { applications: [], error: error as Error };
  }
}

// 지원건 1건 추가. user_id는 호출자가 지정할 수 없고 현재 세션에서만 가져와 채운다.
export async function insertApplication(app: Omit<Application, 'id' | 'updatedAt'>): Promise<ApplicationResult> {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(applicationToInsertRow(app, userId))
      .select()
      .single();

    if (error) {
      return { application: null, error };
    }

    return { application: rowToApplication(data as ApplicationRow), error: null };
  } catch (error) {
    return { application: null, error: error as Error };
  }
}

// 여러 건 일괄 추가 (익스텐션 대량 수집용). user_id는 마찬가지로 현재 세션 기준.
export async function insertApplications(
  apps: Omit<Application, 'id' | 'updatedAt'>[],
): Promise<ApplicationsResult> {
  if (apps.length === 0) {
    return { applications: [], error: null };
  }

  try {
    const userId = await getCurrentUserId();
    const rows = apps.map((app) => applicationToInsertRow(app, userId));
    const { data, error } = await supabase.from(TABLE_NAME).insert(rows).select();

    if (error) {
      return { applications: [], error };
    }

    return { applications: (data as ApplicationRow[]).map(rowToApplication), error: null };
  } catch (error) {
    return { applications: [], error: error as Error };
  }
}

// 지원건 1건 수정. 어떤 행을 고칠 수 있는지는 RLS(본인 것만)가 최종적으로 보장한다.
export async function updateApplication(id: string, changes: ApplicationChanges): Promise<ApplicationResult> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(changesToUpdateRow(changes))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { application: null, error };
    }

    return { application: rowToApplication(data as ApplicationRow), error: null };
  } catch (error) {
    return { application: null, error: error as Error };
  }
}

// 지원건 1건 삭제. RLS나 잘못된 id로 실제 삭제된 행이 0개면 에러로 취급한다
// (.delete()만 쓰면 매칭된 행이 없어도 error: null이 와서 삭제 성공과 구분이 안 됨).
export async function deleteApplication(id: string): Promise<DeleteResult> {
  try {
    const { data, error } = await supabase.from(TABLE_NAME).delete().eq('id', id).select();

    if (error) {
      return { error };
    }

    if (!data || data.length === 0) {
      return { error: new Error('삭제할 지원 내역을 찾을 수 없거나 권한이 없습니다.') };
    }

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}
