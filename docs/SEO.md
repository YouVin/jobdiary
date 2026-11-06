# 공개 페이지·인증 로딩 (#105·#106, 2026-10-19)

## 검색 노출 기준

현재 홈은 개인 대시보드이므로 공개 진입점은 `/login`이다. 브랜드·서비스 소개는 로그인 레이아웃에서 서버 렌더링하고, h1은 로딩 전후 한 개를 유지한다. 로그인/가입 모드는 한 URL이므로 현재 탭마다 canonical을 바꾸지 않는다.

| 경로 | 운영 검색 정책 | canonical / sitemap |
| --- | --- | --- |
| `/login` | index, follow | 쿼리 없는 `/login`, 포함 |
| `/terms`, `/privacy` | index, follow | 각 경로, 포함 |
| `/`, `/account` | noindex, nofollow | 미포함 |
| `/reset-password`, `/update-password` | noindex, nofollow | 미포함 |

기준 도메인·사이트 설명·공개 메타데이터 함수는 `src/lib/siteMetadata.ts`에 있다. 도메인 변경 시 여기부터 갱신한다. 페이지 title/description/canonical/Open Graph/Twitter summary를 서버에서 출력한다. 공유 이미지 생성·검색 서비스 소유권 확인·Search Console 제출은 포함하지 않았다. 현재는 텍스트 중심 공유 정보다.

운영 robots는 크롤링을 허용해 각 페이지의 noindex를 읽게 한다. robots에서 개인 경로를 차단해 noindex를 숨기지 않는다. 이는 검색 노출 제어이며 인증/RLS 접근 제어를 대체하지 않는다. Sitemap에는 공개 canonical URL 3개만 포함하며 실제 변경일을 모르는 lastModified를 만들어 넣지 않는다.

`VERCEL_ENV`가 존재하고 production이 아니면 공개 페이지도 noindex, robots는 전체 차단, sitemap은 비운다. 로컬처럼 변수가 없으면 운영 정책으로 출력해 검증한다. 미리보기 배포의 검색 제외는 단위 테스트로 검증했고 실제 미리보기 URL의 헤더 검증과는 구분한다.

## 스켈레톤과 접근성

- `login/loading.tsx`: 라우트가 준비되는 동안 기본 로그인 스켈레톤.
- `LoginForm`: 세션 확인·인증 후 이동 중 현재 로그인/가입 모드 스켈레톤.
- `AuthFormSkeleton`: 가짜 입력/버튼 없이 폼 형태를 보여주고 장식은 aria-hidden으로 숨긴다. role=status·준비 안내·aria-atomic을 제공하고 reduced-motion에서는 애니메이션을 끈다. 안내 영역 자체를 aria-busy=true로 두면 읽기가 지연될 수 있어 적용하지 않는다(#109). 실제 폼/버튼의 처리 상태 aria-busy는 유지한다.
- 서버 레이아웃은 브랜드 소개와 제목을 유지한다. 단순 이메일 제출 중에는 기존 입력/오류를 유지하며 버튼 busy 상태로 안내한다. 로딩을 보여주려고 임의 지연이나 추가 요청을 넣지 않는다.

## 검증과 한계

기존 테스트 73개에 스켈레톤 두 모드 2개·운영/미리보기 검색 정책 2개를 추가해 **77개 통과**했다. 린트·프로덕션 빌드, 기존 인증 브라우저 11개, 접근성 7개 상태도 통과했다.

`verify-auth-loading-seo.mjs`는 실제 프로덕션 빌드를 대상으로 JavaScript를 끈 서버 HTML에서 title/description/canonical/OG/Twitter와 개인 경로 noindex를 확인했다. robots/sitemap HTTP와 공개 URL 3개, JS 실행 전 스켈레톤의 비조작성·h1 1개·375/768/1440px 너비·reduced-motion도 통과했다. 인증 HTTP fixture를 지연시켜 세션 대기 스켈레톤 → 실제 폼 전환과 로딩 화면 axe 검사(위반 0건)를 검증했다. 실제 운영 계정은 쓰지 않았다.

```powershell
npm.cmd install --prefix node_modules/.release-tools --no-audit --no-fund --ignore-scripts playwright@1.58.2 axe-core@4.11.0
npm.cmd run build
npm.cmd run start -- --port 3100
# 별도 터미널
node scripts/verify-auth-loading-seo.mjs
node scripts/verify-auth-browser.mjs
node scripts/verify-auth-accessibility.mjs
```

route loading의 짧은 표시 여부는 Next 캐시·네트워크에 따라 달라지므로 항상 스켈레톤이 보인다고 보장하지 않는다. 실제 검색엔진 수집·검색 순위·공유 서비스의 캐시 갱신·실제 스크린리더 음성 검증은 별도다.

근거: 설치된 Next.js metadata/loading/robots/sitemap 가이드, [Google noindex 안내](https://developers.google.com/search/docs/crawling-indexing/block-indexing), [사이트맵 안내](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
