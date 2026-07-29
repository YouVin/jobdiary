import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

// 실제로 클라이언트가 쓰이는 시점(런타임)에만 생성/검증한다.
// 빌드/prerender 시점엔 이 함수가 아예 호출되지 않으므로 환경변수가 없어도 빌드가 통과한다.
function getSupabaseClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 환경변수 누락은 개발 중 흔한 실수라 조용히 undefined로 넘기지 않고 바로 에러로 알림
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase 환경변수가 설정되지 않았습니다. .env.local에 NEXT_PUBLIC_SUPABASE_URL, ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY를 채워주세요 (.env.example 참고).',
    );
  }

  cachedClient = createClient(supabaseUrl, supabaseAnonKey);
  return cachedClient;
}

// supabase.auth.signIn(...) 처럼 속성에 처음 접근하는 순간 실제 클라이언트를 생성한다.
// import만 해서는(모듈 로드) 아무 일도 일어나지 않으므로 빌드/prerender에서 안전하다.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const client = getSupabaseClient();
    return Reflect.get(client, property, client);
  },
});
