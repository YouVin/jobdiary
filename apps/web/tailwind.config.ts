import type { Config } from "tailwindcss";

// 디자인 규칙: docs/DESIGN_SYSTEM.md. 간격·크기는 정수 Tailwind 단위(1 = 4px)를 사용한다.
// 카드 p-3, 폼 gap-3, 버튼 아이콘 gap-2, 보조문구 mt-1, 섹션 p-5 ~ p-6.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      // 타이포 스케일 — docs/WORKING_AGREEMENT.md §2에 문서화된 크기·굵기 위계를 실제 Tailwind
      // 토큰으로 정리한 것. text-heading-xl처럼 쓰면 font-size/line-height/font-weight가 함께 적용된다.
      // line-height는 한글 가독성을 고려해 정함(작은 글자일수록 상대적으로 더 넉넉하게).
      fontSize: {
        // 디자인 시스템 글자 7단계 (#200). 굵기는 400·600·700만 쓰고, body·label을 굵게 쓸 때는 font-semibold를 붙인다.
        // 모바일(640 미만)에서는 display-sm·title-1-sm으로 한 단계 줄인다. 숫자는 tabular-nums.
        display: ["30px", { lineHeight: "1.35", fontWeight: "700", letterSpacing: "-0.02em" }], // 로그인 소개 문구, 큰 통계 숫자
        "display-sm": ["26px", { lineHeight: "1.35", fontWeight: "700", letterSpacing: "-0.02em" }],
        "title-1": ["24px", { lineHeight: "1.35", fontWeight: "700", letterSpacing: "-0.02em" }], // 페이지 제목, 통계 칸 숫자
        "title-1-sm": ["22px", { lineHeight: "1.35", fontWeight: "700", letterSpacing: "-0.02em" }],
        "title-2": ["20px", { lineHeight: "1.35", fontWeight: "700", letterSpacing: "-0.02em" }], // 카드 맨 위 한 줄 요약
        "title-3": ["17px", { lineHeight: "1.35", fontWeight: "700" }], // 카드 제목
        body: ["15px", { lineHeight: "1.5", fontWeight: "400" }], // 본문, 회사 이름(semibold), 버튼(semibold)
        label: ["13px", { lineHeight: "1.5", fontWeight: "400" }], // 직무, 날짜, 보조 설명, 입력칸 이름표(semibold)
        caption: ["12px", { lineHeight: "1.5", fontWeight: "600" }], // 뱃지, 그래프 축, 달력 숫자
        // 홈 일기장(#158, #161): 날짜 크기 토큰. 글꼴은 본문과 같은 Pretendard다.
        "diary-day": ["56px", { lineHeight: "56px", fontWeight: "700" }], // 오늘 날짜 숫자
        "diary-month": ["14px", { lineHeight: "20px", fontWeight: "600" }], // 월 약어 (NOV.)
        "diary-date": ["20px", { lineHeight: "24px", fontWeight: "700" }], // 일정 타임라인의 날짜
        lead: ["20px", { lineHeight: "32px", fontWeight: "500" }], // 일기장 요약 문장
        "heading-xl": ["28px", { lineHeight: "40px", fontWeight: "600" }], // 페이지 제목
        "heading-lg": ["22px", { lineHeight: "32px", fontWeight: "500" }], // 섹션 제목
        "heading-md": ["18px", { lineHeight: "28px", fontWeight: "500" }], // 카드/모달 제목
        // 예전 이름 (#200에서 legacy-로 옮김, #206에서 걷어냄). 새 화면은 디자인 시스템 단계(display~caption)를 쓴다.
        "legacy-body": ["14px", { lineHeight: "20px", fontWeight: "400" }], // 기본 본문
        small: ["13px", { lineHeight: "20px", fontWeight: "400" }], // 보조 본문
        "card-company": ["13px", { lineHeight: "20px", fontWeight: "500" }], // 지원 카드의 회사명
        "legacy-label": ["12px", { lineHeight: "16px", fontWeight: "500" }], // 폼 라벨, 보조 문구
        "legacy-caption": ["11px", { lineHeight: "16px", fontWeight: "400" }], // 카드 내 캡션(날짜 등)
        badge: ["10px", { lineHeight: "12px", fontWeight: "500" }], // 플랫폼/상태 뱃지
        "illustration-xs": ["6px", { lineHeight: "8px" }], // aria-hidden 목업 전용
        "illustration-sm": ["8px", { lineHeight: "12px" }], // aria-hidden 목업 전용
      },
      borderRadius: {
        // 디자인 시스템 모서리 단계 (#200). Tailwind 기본 이름(xs~xl)을 디자인 시스템 값으로 덮어쓴다.
        // 겹친 모서리는 안쪽 = 바깥 − 안쪽 여백 (예: 탭 판 md 12, 안쪽 4 → 선택 판 sm 8).
        xs: "4px", // 막대그래프 윗부분, 범례 네모
        sm: "8px", // 뱃지, 달력 칸, 회사 아이콘, 탭 안의 선택 판
        md: "12px", // 버튼, 입력칸, 카드 안 작은 칸, 칸반 카드, 토스트
        lg: "16px", // 모바일 카드, 칸반 열, 떠 있는 작은 카드
        xl: "20px", // 데스크톱 카드, 모달
        // 예전 이름 (#206에서 걷어냄): card → xl, section → md
        card: "20px",
        section: "14px",
        // 로그인 소개의 기기 목업 전용 (#202). 겹친 모서리는 바깥 − 안쪽 여백으로 맞춘다.
        "device-phone": "46px", // 아이폰 바깥 금속 테두리
        "device-phone-bezel": "45px", // 테두리 1px 안쪽 검은 베젤
        "device-phone-screen": "41px", // 베젤 4px 안쪽 화면
        "device-lid": "24px", // 맥북 화면 덮개 위쪽
        "device-lid-inner": "23px",
      },
      // 그림자 — 그레이지 바탕에 맞춘 무채색 그림자 2단계. 카드 경계는 주로 card-border 테두리로 그린다.
      // 기존 shadow-sm/md/lg/xl(Tailwind 기본값)은 그대로 둔다 — 이름이 겹치지 않는 새 키만 추가.
      // 디자인 시스템 그림자 3단계 (#200). 카드에는 그림자를 쓰지 않고(회색 바탕 위 흰 카드로 구분), 떠 있는 것에만 쓴다.
      // shadow-sm/md/lg는 Tailwind 기본값을 덮어쓴다(기존 화면에서 쓰지 않던 이름).
      boxShadow: {
        sm: "0 1px 2px rgba(27, 34, 48, 0.04)", // 흰 바탕 위에 놓인 카드
        md: "0 8px 24px rgba(27, 34, 48, 0.08)", // 드롭다운, 끌고 있는 칸반 카드, 토스트
        lg: "0 16px 40px rgba(27, 34, 48, 0.14)", // 모달, 상세 패널
        // 예전 이름 (#206에서 걷어냄): card → sm, float → md
        card: "0 1px 2px rgba(27, 34, 48, 0.04)",
        float: "0 8px 24px rgba(27, 34, 48, 0.08)",
      },
      // 층 순서 (#200): 숫자가 클수록 위
      zIndex: {
        header: "10",
        dropdown: "20",
        panel: "30",
        modal: "40",
        toast: "50",
      },
      // 움직임 길이 (#200). 곡선은 ease-soft.
      transitionDuration: {
        fast: "150ms", // 마우스 올림 색 변화, 버튼 누름
        base: "250ms", // 드롭다운·탭 전환, 패널 열고 닫기
        slow: "400ms", // 모달 등장, 카드가 올라오며 나타남
      },
      // 움직임 (#193) — 나타날 때 살짝 올라오는 rise와 부드러운 감속 곡선. 화면에서는 motion-safe:animate-rise처럼
      // motion-safe 변형으로만 써서, 모션 줄이기 설정에서는 움직이지 않게 한다.
      keyframes: {
        "jd-rise": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "none" },
        },
        // 형광펜으로 칠하듯 강조 배경이 왼쪽부터 채워진다 (홈 일기장 문장)
        "jd-mark": {
          from: { backgroundSize: "0% 100%" },
          to: { backgroundSize: "100% 100%" },
        },
      },
      animation: {
        rise: "jd-rise 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        mark: "jd-mark 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) 0.3s both",
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
      colors: {
        // ── 디자인 시스템 역할 색 (#200) ── https://claude.ai/artifact/RR4qTSJVUe774joAoq3mrf
        // 화면은 이 역할 이름만 쓴다. 다크 모드는 아직 정하지 않았고, 정할 때 역할마다 값만 붙인다.
        surface: "#FFFFFF", // 카드, 흰 판, 입력칸 바탕
        subtle: "#F5F7FA", // 카드 안의 옅은 칸, 칩, 보조 버튼, 아이콘 버튼 마우스 올림
        muted: "#E6E9EF", // 탭 바탕(회색 판), 칸반 열
        selected: "#EAF0FB", // 선택된 항목, 지원한 날 달력 칸
        inverse: "#1B2230", // 선택된 필터 칩, 툴팁, 토스트
        scrim: "rgba(27, 34, 48, 0.4)", // 패널·모달 뒤를 덮는 막
        line: {
          divider: "#E6E9EF", // 목록 구분선, 카드 안 나눔선
          input: "#848DA4", // 입력칸·테두리 버튼 테두리 (흰 바탕 3.32:1, 조작 경계 기준 3:1 — #201에서 #C9CFDA 1.56:1에서 올림)
          focus: "#3461D1", // 입력칸을 눌렀을 때 테두리
        },
        // 키보드 포커스 바깥 테두리. 디자인 시스템 값 #7898E2는 흰 바탕 대비 2.84:1이라 포커스 기준(3:1)에 못 미쳐
        // 버튼 파랑(5.56:1)으로 올렸다(#200). 디자인 시스템 ring-focus도 같은 값으로 맞춘다.
        "focus-ring": "#3461D1",
        action: {
          primary: "#3461D1", // 주요 버튼 (흰 글자 5.56:1)
          hover: "#2F55B8", // 6.75:1
          pressed: "#27489B", // 8.45:1
          disabled: "#C7D5F5",
        },
        logo: {
          navy: "#253A63", // 로고와 아주 드문 브랜드 제목에만
          marigold: "#F2A33A", // 화면에서는 오늘·D-day에만
          grey: "#8F98AD",
        },
        today: { DEFAULT: "#F2A33A", tint: "#FDF1DF", text: "#9A5A0B" }, // 오늘·D-day에만 (글자 4.9:1)
        success: { DEFAULT: "#14A38B", tint: "#E7F8F5", text: "#0D7766" }, // 합격 (글자 5.06:1)
        danger: { DEFAULT: "#B93A26", tint: "#FDECE8", text: "#B93A26" }, // 중복·오래 소식 없음·오류 (글자 4.96:1)
        info: { tint: "#EAF0FB", text: "#2F55B8" }, // 서류 통과 같은 진행 소식 (글자 5.9:1)
        // 그래프는 강조 하나만 chart-1, 나머지는 2 → 3 → rest로 옅게. 색만으로 구분하지 않고 항상 글자를 함께 둔다.
        chart: { 1: "#3461D1", 2: "#7898E2", 3: "#C7D5F5", rest: "#C9CFDA", empty: "#E6E9EF" },
        stage: {
          applied: "#3461D1",
          screening: "#7898E2",
          interview: "#C7D5F5", // 면접 예정·면접 완료 같은 색
          offer: "#14A38B",
          rejected: "#8F98AD",
          canceled: "#C9CFDA",
        },

        // ── 예전 이름 (#206에서 걷어냄) ── 뜻이 같은 새 값으로 연결해 기존 화면이 새 색으로 바뀐다.
        brand: {
          DEFAULT: "#3461D1", // → action-primary
          hover: "#2F55B8", // → action-hover
          tint: "#EAF0FB", // → selected
          text: "#2F55B8", // → info-text
          // 로그인 화면 비주얼 패널(AuthVisualPanel) 장식 3단계 → 회색 단계
          "tint-100": "#F5F7FA",
          "tint-200": "#E6E9EF",
          "tint-300": "#C9CFDA",
        },
        status: {
          applied: "#3461D1", // → stage-applied
          screening: "#7898E2", // → stage-screening
          interview: "#C7D5F5", // → stage-interview
          offer: "#14A38B", // → stage-offer
          rejected: "#B93A26", // 지금 화면은 오류·경고 빨강으로 주로 써서 → danger (탈락 점은 #204에서 stage-rejected로)
          canceled: "#C9CFDA", // → stage-canceled
          "rejected-text": "#B93A26", // → danger-text
          "offer-text": "#0D7766", // → success-text
          "screening-text": "#2F55B8", // → info-text
        },
        // 데이터 색 (#193): 조작 부분(버튼·메뉴·포커스)은 검정으로 강조하고, 사이트·달력 같은 데이터는 색으로 구분한다.
        // 사이트 색은 각 사이트 공식 탭 아이콘(public/brands/)에서 뽑은 실제 색이다. 사람인 밝은 파랑, 잡코리아 진한 파랑,
        // 원티드는 파랑→분홍→주황 그라데이션(chart → mid → end). 배지는 연한 배경 + 진한 글자(6.23:1 이상).
        // 익스텐션(apps/extension/tailwind.config.ts)은 이번에 바꾸지 않아 배지 값이 다르다.
        platform: {
          saramin: { bg: "#EAF0FD", text: "#1E4FC2", chart: "#4876EF" },
          wanted: { bg: "#F3EEFB", text: "#3E3A8F", chart: "#0068FF", mid: "#FF8FC0", end: "#FF5A00" },
          jobkorea: { bg: "#E6ECFB", text: "#0A3AB8", chart: "#0B40D0" },
          manual: { bg: "#EFEFEA", text: "#5E5E59", chart: "#8E8C84" },
        },
        text: {
          primary: "#1B2230", // 제목, 본문, 숫자 (16.6:1)
          secondary: "#5A6478", // 설명, 이름표, 날짜, 입력칸 안내 글자 (5.95:1)
          disabled: "#8F98AD", // 비활성 글자에만 (2.89:1, 비활성은 대비 기준 예외)
          brand: "#3461D1", // 링크, 강조 숫자 (5.56:1)
          "brand-strong": "#2F55B8", // selected 바탕 위 파란 글자 (5.9:1)
          logo: "#253A63",
          "on-color": "#FFFFFF",
          muted: "#5A6478", // 예전 이름 → text-secondary (#206에서 걷어냄)
        },
        page: "#F5F7FA", // 페이지 바탕 (디자인 시스템 bg-page)
        // 로그인 소개의 기기 목업 전용 (#202). 기기 고유의 금속·유리 색이라 화면 역할 색과 따로 둔다.
        device: {
          edge: "#E6E9EF", // 금속 테두리 밝은 쪽
          steel: "#8F98AD", // 금속 테두리 어두운 쪽, 옆 버튼
          shade: "#C9CFDA", // 맥북 바닥판 그늘
          glass: "#1B2230", // 화면 베젤, 노치
          hinge: "#2A3242", // 맥북 경첩, 카메라 점
          "hinge-light": "#5A6478",
          base: "#F5F7FA", // 맥북 바닥판 윗면
        },
        // 예전 이름 (#206에서 걷어냄)
        column: "#F5F7FA", // → subtle
        card: "#FFFFFF", // → surface
        raised: "#FFFFFF", // → surface
        // 일정 종류 색: 면접 파랑, 공고 마감 회색 (디자인 시스템 event-*)
        event: {
          interview: "#3461D1",
          "interview-tint": "#EAF0FB",
          "interview-text": "#2F55B8",
          deadline: "#8F98AD",
          "deadline-tint": "#F5F7FA",
          "deadline-text": "#5A6478",
        },
        // 형광펜 강조 배경 (#193): 진한 글자(primary)를 그대로 올린다.
        highlight: {
          blue: "#DCE5FD",
          violet: "#E7E3FD",
          amber: "#FCE6CF",
        },
        // 지원 달력 칸의 지원 건수 단계 (1건 → 4건 이상). 연한 파랑에서 진한 남색으로 가는 단계다(#193).
        // 예전 이름 (#203에서 달력 칸 cal-* 로 바뀜). 3·4단계는 흰 글자가 올라가 5.56:1·8.45:1 이상인 진한 파랑으로 둔다
        // (#7898E2로 연결하면 흰 글자 2.84:1이라 읽기 어려워 #200에서 바꿈).
        heat: {
          1: "#EAF0FB",
          2: "#C7D5F5",
          3: "#3461D1",
          4: "#27489B",
        },
        "on-brand": "#FFFFFF", // → text-on-color
        overlay: "#000000", // → scrim
        "card-border": "#E6E9EF", // → line-divider
        "border-strong": "#848DA4", // → line-input
      },
      fontFamily: {
        sans: ["var(--font-pretendard)"],

      },
    },
  },
};

export default config;
