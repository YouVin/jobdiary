// 소개 페이지(/intro, #286) 문구. 자주 묻는 질문은 화면과 검색용 구조화 데이터(FAQPage)가 같은 문장을 쓴다.
// 답은 실제 동작·개인정보처리방침과 맞아야 한다. 기능이나 방침이 바뀌면 여기도 함께 고친다.

export const INTRO_TITLE = '여기저기 지원한 회사, 취준일기 한곳에 모아요';
export const INTRO_DESCRIPTION =
  '크롬 익스텐션 버튼 한 번이면 사람인, 잡코리아, 원티드 지원 내역이 날짜별로 정리돼요. 회사마다 다른 전형 단계와 그날 남긴 기록도 함께 볼 수 있어요.';

// 휴대폰 방문자 안내(#310). 가져오기는 PC 크롬 익스텐션에서만 되므로 첫 화면에서 미리 알린다.
export const INTRO_MOBILE_NOTE = '지원 내역 가져오기는 PC 크롬에서 해요. 휴대폰에서는 현황을 보고, 단계를 옮기고, 기록을 남길 수 있어요.';

// 첫 화면 기기 속 실제 홈 화면(예시 데이터). scripts/capture-intro-screens.mjs로 다시 찍는다.
export const INTRO_HERO = {
  desktop: { src: '/intro/hero-desktop-v3.png', width: 1920, height: 1224 },
  mobile: { src: '/intro/hero-mobile-v3.png', width: 780, height: 1660 },
};

export interface IntroStep {
  title: string;
  body: string;
}

// 이렇게 써요: 가져오기 → 단계 옮기기 → 기록 남기기
export const INTRO_STEPS: IntroStep[] = [
  {
    title: '지원 내역 가져오기',
    body: '사람인, 잡코리아, 원티드에 로그인한 브라우저에서 익스텐션의 가져오기를 누르면 지원한 회사가 한 번에 들어와요. 다른 곳은 직접 추가하면 돼요.',
  },
  {
    title: '단계 옮기기',
    body: '공고에 적힌 전형 절차(코딩테스트, 과제, 1차와 2차 면접)대로 회사마다 단계가 만들어져요. 점을 눌러 옮기면 바뀐 날짜가 남고, 마감이 지난 공고는 자동으로 정리돼요.',
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
  // 휴대폰에서 대신 보여줄 사진(PC 사진을 줄이면 글자가 안 읽히는 가로로 긴 화면만, #310)
  mobileImage?: { src: string; width: number; height: number; alt: string };
}

// 실제 화면(예시 데이터, 회사 이름은 지어낸 이름). 이미지는 scripts/capture-intro-screens.mjs로 다시 찍는다.
export const INTRO_FEATURES: IntroFeature[] = [
  {
    key: 'home',
    label: '홈',
    title: '지금 어디까지 왔는지 한눈에',
    points: ['이번 주 지원 수와 서류 통과율', '지원 → 서류 통과 → 면접 → 합격까지 지나온 단계', '다가오는 면접과 마감 일정, 지원 달력'],
    image: { src: '/intro/home-v3.png', width: 2400, height: 1588, alt: '취준일기 홈: 한 문장 요약과 숫자 4칸, 전형 여정과 지나온 단계, 지원 경로 도넛 차트' },
    mobileImage: { src: '/intro/home-mobile-v3.png', width: 780, height: 2200, alt: '휴대폰의 취준일기 홈: 한 문장 요약과 숫자 4칸, 전형 여정' },
  },
  {
    key: 'board',
    label: '지원 보드',
    title: '회사마다 지금 어느 단계인지',
    points: ['카드마다 그 회사의 지금 전형 단계(코딩테스트 2/5)', '요일별 면접과 마감 일정, 단계별 보드', '소식 없는 지원 정리와 같은 공고 중복 지원 찾기'],
    image: { src: '/intro/board-v3.png', width: 2400, height: 1520, alt: '취준일기 지원 보드: 단계별 칸반 보드, 카드마다 회사별 전형 단계(예: 2차 면접 4/5)' },
    mobileImage: { src: '/intro/board-mobile-v3.png', width: 780, height: 1196, alt: '휴대폰의 결과 기다리는 중: 회사마다 다른 전형 단계(서류전형 → 코딩테스트 → 1차 면접…)와 지금 단계' },
  },
  {
    key: 'detail',
    label: '지원 상세',
    title: '회사마다 다른 전형 절차와 지나온 기록',
    points: ['공고에 적힌 전형 절차로 회사마다 단계를 만들어요', '공고에서 회사가 원하는 강점을 정리해요(하루 5번)', '받은 질문, 내 답, 아쉬운 점을 적는 면접 후기 틀', '단계가 바뀐 날과 내가 남긴 기록을 한 줄로'],
    image: { src: '/intro/detail-v3.png', width: 1040, height: 3968, alt: '지원 상세 패널: 서류전형부터 최종 합격까지 공고의 전형 절차 트랙, 회사 정보와 원하는 강점, 면접 후기가 담긴 지나온 기록' },
  },
  {
    key: 'recap',
    label: '이번 달 돌아보기',
    // #326: 앱 안에서 보는 월간 화면(#317). 예전에는 공유 이미지를 보여 줬다
    title: '한 달을 달력 한 장으로 돌아봐요',
    points: ['지원한 날과 서류 통과, 면접, 합격 소식을 달력에서', '지원, 서류 통과, 면접, 남긴 기록 수를 지난달과 비교', '이 달을 한 줄로 남기고, 필요하면 이미지로 저장'],
    image: { src: '/intro/recap-v3.png', width: 1800, height: 1444, alt: '이번 달 돌아보기 창: 지원한 날과 소식이 표시된 달력, 지난달과 비교한 숫자 네 칸, 최근 소식 목록, 이번 달 한 줄' },
    mobileImage: { src: '/intro/recap-mobile-v3.png', width: 780, height: 1394, alt: '휴대폰의 이번 달 돌아보기: 지원한 날과 소식이 표시된 달력, 지난달과 비교한 숫자 네 칸' },
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
    answer: '사람인, 잡코리아, 원티드의 지원 내역을 크롬 익스텐션으로 가져와요. 다른 사이트나 직접 지원한 곳은 지원 추가로 직접 넣을 수 있어요.',
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
    question: '회사마다 전형 단계는 어떻게 만들어지나요?',
    answer: '가져온 지원 중 진행 중인 지원의 공고 페이지를 익스텐션이 읽어, 공고에 적힌 전형 절차(서류, 코딩테스트, 면접 같은 단계)로 지원마다 단계를 만들어요. 다르게 읽혔으면 지원 상세에서 직접 고칠 수 있어요.',
  },
  {
    question: 'AI에는 어떤 정보를 보내나요?',
    answer: '공고 내용(글 또는 이미지)과 회사 이름만 보내고, 이메일이나 계정 정보는 보내지 않아요. 회사 정보 정리는 원할 때만 쓰고, 전형 절차는 이미지로만 된 공고처럼 글로 찾지 못했을 때만 AI로 읽어요. 보낸 내용은 AI 학습에 쓰이지 않아요.',
  },
];
