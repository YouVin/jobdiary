# 취준일기 (JobDiary)

> 사람인 · 원티드 · 잡코리아 지원 내역을 자동으로 모아 관리하고, 취업 여정을 일기로 기록하는 웹앱

---

## 소개

여러 채용 사이트에 흩어진 지원 내역을 크롬 익스텐션으로 수집해서, 한 곳에서 칸반 보드로 관리한다. 지원 건별 일기 작성은 향후 개발 예정이다.

## 핵심 기능

- 크롬 익스텐션으로 지원 내역 자동 수집
- 칸반 보드로 지원 현황 단계별 관리
- 지원 내역 추가·수정·삭제 및 면접일 관리
- 로그인과 Supabase 기반 저장
- 개발 예정: 일기 작성, 지원 통계, 텍스트 복사·이미지 공유

## 기술 스택

Next.js 16.2.9 · React 19 · TypeScript · Tailwind CSS 4 · Zustand · dnd-kit · Supabase · Vercel

## 시작하기

```bash
npm install
npm run dev   # http://localhost:3000
```

## 문서

- [개발 문서 인덱스](./docs/README.md) — 작업별 문서·코드·검증 명령
- [기획서](./docs/PLANNING.md)
- [기술 설계](./docs/TECH_DESIGN.md)
- [익스텐션 설계](./docs/EXTENSION.md)
- [컨벤션](./docs/CONVENTION.md)
- [로드맵](./docs/ROADMAP.md)

## 브랜치

`main` (배포) ← `dev` (개발)
