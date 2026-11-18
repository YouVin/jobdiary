# 디자인·문서 AI 스킬

2026-11-18, #165. Claude Code 사용자 환경에 설치한 스킬을 이 저장소에서 쓰는 기준이다. 스킬은 저장소에 포함하지 않으며, 아래 명령으로 기기마다 설치한다.

## 우선순위

스킬 지시와 이 저장소 규칙이 다르면 **사용자 요청 → [DESIGN_SYSTEM](DESIGN_SYSTEM.md)·[WORKING_AGREEMENT](WORKING_AGREEMENT.md) → 스킬** 순서로 따른다.

- 색·글자·모서리·그림자는 `apps/web/tailwind.config.ts` 토큰만 쓴다. 스킬이 제안한 팔레트·글꼴 짝은 토큰 추가가 필요하다는 근거로만 쓰고, 추가할 때는 이유를 문서에 남긴다.
- 글꼴은 Pretendard다. 외부 폰트·CDN·외부 이미지 요청을 추가하지 않는다.
- SVG는 `public/icons/`와 공통 `Icon`, 데이터 차트만 `src/components/charts/`에서 작성한다. 정수 Tailwind 간격 규칙과 `npm run check:ui`를 그대로 통과해야 한다.
- 스킬이 만든 화면도 기존과 같이 모바일·태블릿·데스크톱과 키보드 동작을 확인하고, 이슈 → 브랜치 → PR 흐름을 따른다.

## 설치한 스킬과 사용처

| 스킬 | 출처 | 이 저장소에서 쓰는 곳 |
|---|---|---|
| `frontend-design` | Anthropic 공식 `claude-plugins-official` | 새 화면이나 큰 개편의 디자인 방향을 정할 때. 시안을 먼저 만들고 승인 뒤 구현한다 |
| `ui-ux-pro-max` (+ design, design-system, ui-styling 등 6개) | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (MIT) | 접근성·상호작용·반응형 UX 점검. 검색 스크립트는 Python 3이 필요하다 |
| `design-taste-frontend` | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) (MIT) | 이미 만든 화면을 "AI가 만든 티"가 나는지 점검하고 고칠 곳을 찾을 때. 회사 소개 웹사이트용 규칙(사진·히어로·셰이더)은 대시보드에 적용하지 않는다 |
| `hallmark` | [Nutlope/hallmark](https://github.com/Nutlope/hallmark) (MIT) | 기존 화면 점검은 `/hallmark audit <경로>`처럼 이름을 불러야 동작한다. 새 페이지에는 쓰지 않는다 |
| `archify` | [tt-a1i/archify](https://github.com/tt-a1i/archify) (Apache-2.0) | 익스텐션 → 웹앱 → Supabase 데이터 흐름, 상태 흐름 같은 구조도를 `docs/`용으로 만들 때 |
| `guizang-ppt-skill` | [op7418/guizang-ppt-skill](https://github.com/op7418/guizang-ppt-skill) (AGPL-3.0) | 포트폴리오·발표용 웹 슬라이드. 저장소 코드에는 포함하지 않는다 |

### 쓰지 않는 기능

- `hallmark`의 편집 훅(`install-hook.mjs`, `settings.json`에 PostToolUse 추가)과 Together AI 이미지 생성(`TOGETHER_API_KEY`)은 설치·사용하지 않는다. 필요하면 별도 이슈로 결정한다.
- `archify`의 업데이트 알림은 공개 manifest만 읽는다. 스킬 업데이트는 사용자가 요청할 때만 한다.
- Next AI Draw.io([DayuanJiang/next-ai-draw-io](https://github.com/DayuanJiang/next-ai-draw-io))는 스킬이 아니라 LLM API 키가 필요한 별도 웹앱이라 설치하지 않았다. 구조도는 `archify`를 쓴다.

## 설치 명령

```sh
# 플러그인 형식 (사용자 범위)
claude plugin install frontend-design@claude-plugins-official --scope user
claude plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
claude plugin install ui-ux-pro-max@ui-ux-pro-max-skill --scope user
claude plugin marketplace add Leonxlnx/taste-skill
claude plugin install taste-skill@taste-skill --scope user
claude plugin marketplace add Nutlope/hallmark
claude plugin install hallmark@hallmark --scope user
```

`archify`(저장소의 `archify/` 폴더)와 `guizang-ppt-skill`(저장소 전체, `.git` 제외)은 마켓플레이스가 없어 `~/.claude/skills/<이름>`에 복사했다. 각 폴더의 `.source-commit`에 설치한 커밋을 남겼다.

설치 전 확인한 내용: 네 플러그인 모두 훅·MCP 서버 없이 스킬만 포함한다(`claude plugin details`). 세션마다 항상 붙는 설명 비용은 합계 약 1.6k 토큰이고 본문은 스킬을 부를 때만 읽는다. 외부 스킬은 그대로 따르는 지시문이므로 업데이트할 때도 변경 내용을 먼저 확인한다.

## 현재 제한

- 이 PC에는 Python 3이 설치돼 있지 않다(`python`은 Windows 스토어 안내만 실행). `ui-ux-pro-max`의 검색·디자인 시스템 생성 스크립트는 Python 3을 설치해야 동작하며, 그 전에는 지시문 부분만 쓸 수 있다.
