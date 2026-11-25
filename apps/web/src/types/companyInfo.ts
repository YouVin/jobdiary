// 지원 상세 "회사 정보" (#229, #232, #235). 서버(Edge Function company-info)의 결과 형식
// (supabase/functions/_shared/postingAnalysis/analysis.ts의 AnalysisResult)을 화면용 이름으로 옮긴 것이다.
// 서버 형식을 바꾸면 lib/companyInfoApi.ts의 parseCompanyInfo도 함께 바꾼다.
export interface CompanyStrength {
  strength: string; // 고정 강점 목록 12개 중 하나 (예: 협동성)
  quote: string; // 공고 원문 인용 (서버가 원문에 있는지 확인한 것만 온다)
  wants: string; // 회사가 원하는 것 한 줄
  experiences: string[]; // 자기소개서·면접에 넣으면 좋은 경험
}

export interface CompanyInfo {
  about: string; // 무엇을 만드는(개발하는) 회사인지
  products: string[]; // 대표 서비스·제품
  website: string; // 공고에 적힌 대표 사이트 (서버가 원문에 있는지 확인한 것만)
  hasTalentStatement: boolean;
  strengths: CompanyStrength[];
  location: string; // 근무지 주소
  workDays: string;
  workHours: string;
  fromImage: boolean; // 이미지 공고에서 읽은 결과인지 (읽은 글 자체는 보여 주지 않는다, #235)
  createdAt: string; // 분석한 시각 (화면의 "○○ 기준")
}
