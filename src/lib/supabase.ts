import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 환경변수 누락은 개발 중 흔한 실수라 조용히 undefined로 넘기지 않고 바로 에러로 알림
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase 환경변수가 설정되지 않았습니다. .env.local에 NEXT_PUBLIC_SUPABASE_URL, ' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY를 채워주세요 (.env.example 참고).',
  );
}

// 모듈은 한 번만 평가되므로 이 인스턴스가 앱 전체에서 재사용되는 싱글톤이 된다
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
