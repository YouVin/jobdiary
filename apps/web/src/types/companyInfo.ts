// 지원 상세 "회사 정보" (#229). 서버(Edge Function company-info)의 결과 형식
// (supabase/functions/_shared/postingAnalysis/analysis.ts의 AnalysisResult)을 화면용 이름으로 옮긴 것이다.
// 서버 형식을 바꾸면 lib/companyInfoApi.ts의 parseCompanyInfo도 함께 바꾼다.
export interface CompanyStrength {
  strength: string; // 고정 강점 목록 12개 중 하나 (예: 협업)
  quote: string; // 공고 원문 인용 (서버가 원문에 있는지 확인한 것만 온다)
  reason: string;
  prepQuestion: string;
}

export interface CompanyInfo {
  summary: string; // 회사가 하는 일 한 문장
  hasTalentStatement: boolean;
  strengths: CompanyStrength[];
  requiredSkills: string[];
  preferredSkills: string[];
  createdAt: string; // 분석한 시각 (화면의 "○○ 기준")
}
