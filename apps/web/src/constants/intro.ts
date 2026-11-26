// 소개 페이지(/intro, #286) 문구. 자주 묻는 질문은 화면과 검색용 구조화 데이터(FAQPage)가 같은 문장을 쓴다.
// 답은 실제 동작·개인정보처리방침과 맞아야 한다. 기능이나 방침이 바뀌면 여기도 함께 고친다.

export const INTRO_TITLE = '여기저기 지원한 회사, 취준일기 한곳에 모아요';
export const INTRO_DESCRIPTION =
  '크롬 익스텐션 버튼 한 번이면 사람인·잡코리아·원티드 지원 내역이 날짜별로 정리돼요. 서류·면접 단계와 그날의 기록까지 이어서 남기는 무료 취업 준비 기록장이에요.';

export interface IntroStep {
  title: string;
  body: string;
}

// 이렇게 써요: 가져오기 → 단계 옮기기 → 기록 남기기
export const INTRO_STEPS: IntroStep[] = [
  {
    title: '지원 내역 가져오기',
    body: '사람인·잡코리아·원티드에 로그인한 브라우저에서 익스텐션의 가져오기를 누르면 지원한 회사가 한 번에 들어와요. 다른 곳은 직접 추가하면 돼요.',
  },
  {
    title: '단계 옮기기',
    body: '서류 통과, 면접, 결과를 보드에서 옮겨요. 마감이 지난 공고는 자동으로 정리되고, 단계가 바뀐 날짜는 저절로 남아요.',
  },
  {
    title: '기록 남기기',
    body: '지원 동기, 면접에서 받은 질문, 아쉬운 점을 지원마다 남겨요. 같은 회사에 다시 지원하면 예전 면접 후기가 함께 보여요.',
  },
];

export interface IntroFeature {
  key: string;
  label: string; // 작은 머리말 (화면 이름)
  title: string;
  points: string[];
  image: { src: string; width: number; height: number; alt: string };
}

// 실제 화면(예시 데이터, 회사 이름은 지어낸 이름). 이미지는 scripts/capture-intro-screens.mjs로 다시 찍는다.
export const INTRO_FEATURES: IntroFeature[] = [
  {
    key: 'home',
    label: '홈',
    title: '지금 어디까지 왔는지 한눈에',
    points: ['이번 주 지원 수와 서류 통과율', '지원 → 서류 통과 → 면접 → 합격까지 지나온 단계', '다가오는 면접·마감 일정과 지원 달력'],
    image: { src: '/intro/home.png', width: 2400, height: 1588, alt: '취준일기 홈: 한 문장 요약과 숫자 4칸, 전형 여정과 지나온 단계, 지원 경로 도넛 차트' },
  },
  {
    key: 'board',
    label: '지원 보드',
    title: '이번 주 할 일과 소식 없는 지원까지',
    points: ['요일별 면접·마감 일정과 단계별 보드', '2주 넘게 소식 없는 지원은 한 번에 정리', '여러 사이트에 같은 공고로 지원한 것도 찾아 줘요'],
    image: { src: '/intro/board.png', width: 2400, height: 1520, alt: '취준일기 지원 보드: 지원 완료부터 지원 취소까지 단계별 칸반 보드' },
  },
  {
    key: 'detail',
    label: '지원 상세',
    title: '회사마다 쌓이는 지나온 기록',
    points: ['단계가 바뀐 날과 내가 남긴 기록을 한 줄로', '받은 질문 · 내 답 · 아쉬운 점 면접 후기 틀', '공고를 넣으면 회사가 원하는 강점을 정리해 줘요(하루 5번)'],
    image: { src: '/intro/detail.png', width: 1040, height: 2412, alt: '지원 상세 패널: 단계 트랙, 기록 남기기, 지원·서류 통과·면접·탈락 날짜를 모은 지나온 기록' },
  },
  {
    key: 'recap',
    label: '이번 달 돌아보기',
    title: '한 달을 한 장으로 남겨요',
    points: ['이번 달 지원·서류 통과·면접 숫자를 이미지로 저장', '휴대폰에서는 바로 공유할 수 있어요', '회사 이름은 넣지 않아 안심하고 올려요'],
    image: { src: '/intro/recap.png', width: 1080, height: 1350, alt: '이번 달 돌아보기 이미지: 이번 달 지원 수와 서류 통과·면접·합격·기록 숫자' },
  },
];

export interface IntroQuestion {
  question: string;
  answer: string;
}

export const INTRO_FAQ: IntroQuestion[] = [
  {
    question: '정말 무료인가요?',
    answer: '네. 지금은 모든 기능을 무료로 쓸 수 있어요. 이메일이나 Google 계정으로 가입하면 바로 시작해요.',
  },
  {
    question: '어떤 사이트의 지원 내역을 가져올 수 있나요?',
    answer: '사람인·잡코리아·원티드의 지원 내역을 크롬 익스텐션으로 가져와요. 다른 사이트나 직접 지원한 곳은 지원 추가로 직접 넣을 수 있어요.',
  },
  {
    question: '휴대폰에서도 쓸 수 있나요?',
    answer: '네. 휴대폰 브라우저에서 지원 현황을 보고 단계를 옮기고 기록을 남길 수 있어요. 익스텐션 가져오기는 PC의 크롬에서 해요.',
  },
  {
    question: '채용 사이트 비밀번호를 알려 줘야 하나요?',
    answer: '아니요. 이미 로그인한 브라우저에서 내 지원 현황 페이지를 읽어 오는 방식이라 채용 사이트 비밀번호를 묻거나 저장하지 않아요.',
  },
  {
    question: '내 지원 내역은 누가 볼 수 있나요?',
    answer: '내 계정에서만 볼 수 있어요. 데이터베이스에서 계정별로 접근을 막아 두었고, 직접 지우거나 탈퇴하면 운영 데이터베이스에서 함께 삭제돼요.',
  },
  {
    question: '회사 정보 정리는 어떤 정보를 보내나요?',
    answer: '원할 때만 쓰는 기능이에요. 직접 넣은 공고 내용과 회사 이름만 AI로 보내고, 이메일이나 계정 정보는 보내지 않아요.',
  },
];
