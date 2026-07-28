# 로그인 + Supabase 전환 설계 (SUPABASE)

> 웹앱을 `localStorage`/비로그인 구조에서 로그인 + Supabase(PostgreSQL) 기반 계정별 저장으로 전환하는 설계 문서. 코드는 만들지 않는다 — 이 문서가 확정되면 [개발 순서](#6-개발-순서)대로 이슈를 쪼갠다.

---

## 1. 개요

- **1단계(현재)**: 로그인 없음, `localStorage`에 지원내역 전체 배열을 통째로 저장. 기기·브라우저에 종속되고 삭제되면 복구 불가.
- **2단계(이 문서)**: 이메일+비밀번호 로그인을 붙이고, 저장소를 Supabase(PostgreSQL)로 전환한다. 사용자별로 데이터가 분리되어 여러 기기에서 같은 계정으로 접근할 수 있고, 브라우저 데이터 삭제로 인한 유실이 없어진다.
- **왜 Supabase인가**: Postgres + Auth + RLS(행 단위 접근 제어)를 한 서비스에서 제공해서 별도 백엔드 서버 없이 시작할 수 있다. `@supabase/supabase-js`로 Next.js와 통합이 간단하고 무료 티어로 시작 가능하다.
- **마이그레이션은 하지 않는다.** `localStorage` 데이터를 Supabase로 옮기는 스크립트를 만들지 않고, 로그인하는 순간부터 새로 시작하는 "깨끗한 전환"으로 간다. 1단계는 검증용 데모 단계라 실 데이터가 적고, 마이그레이션 개발/테스트 비용 대비 이득이 낮다. 사용자에게는 "로그인하면 새 계정으로 시작합니다" 정도로 안내하면 충분하다.
- **[INTEGRATION.md](./INTEGRATION.md)와의 관계**: 익스텐션이 보내는 `Application` 형식, status 매핑, 날짜 정규화, 중복 판별 **규칙 자체**는 이 전환과 무관하게 그대로 유지된다. 이 문서가 바꾸는 것은 그 규칙을 적용한 뒤 **어디에 저장하느냐**뿐이다. INTEGRATION.md §7에 남아있던 "로그인 + Supabase(2단계) 도입 시 저장 경로 변경 필요"가 이 문서로 해소된다.

---

## 2. DB 스키마 (applications 테이블)

### 컬럼 설계

현재 [`src/types/application.ts`](../src/types/application.ts)의 `Application` 인터페이스를 기준으로, Postgres 관례(snake_case)에 맞춰 컬럼명을 정한다.

| TS 필드 (camelCase) | DB 컬럼 (snake_case) | 타입 | 제약 | 비고 |
| --- | --- | --- | --- | --- |
| `id` | `id` | `uuid` | PK, `default gen_random_uuid()` | |
| — | `user_id` | `uuid` | FK → `auth.users(id)`, not null | ★신규. 사용자별 분리의 핵심 |
| `company` | `company` | `text` | not null | |
| `position` | `position` | `text` | not null | Postgres 예약어는 아니지만 문자열 함수 `POSITION()`과 이름이 겹친다. 실제 적용 시 `job_position`처럼 바꿀지 팀 판단 필요 |
| `platform` | `platform` | `text` | not null | 아래 "platform/status 타입" 참고 |
| `status` | `status` | `text` | not null | 아래 "platform/status 타입" 참고 |
| `appliedAt` | `applied_at` | `timestamptz` | not null | INTEGRATION.md §4대로 자정 기준 날짜만 저장 |
| `updatedAt` | `updated_at` | `timestamptz` | not null, `default now()` | |
| — | `created_at` | `timestamptz` | not null, `default now()` | ★신규. TS 타입엔 없던 필드 — DB가 자동으로 채우는 메타데이터로 두고, 앱 로직은 당장 안 씀. 필요해지면 `Application`에 `createdAt?`을 추가 |
| `memo` | `memo` | `text` | null 허용 | |
| `diary` | `diary` | `jsonb` | null 허용, `default '[]'::jsonb` | 아래 "diary 저장 방식" 참고 |
| `interviewDate` | `interview_date` | `timestamptz` | null 허용 | |
| `url` | `url` | `text` | null 허용 | |
| `externalId` | `external_id` | `text` | null 허용 | 원티드는 항상 null |

camelCase(TS) ↔ snake_case(DB) 변환은 `supabase-js`가 자동으로 해주지 않으므로, DB 접근 계층에 얇은 매핑 함수를 두고 `applicationStore`를 포함한 나머지 코드는 지금처럼 camelCase `Application`만 다루게 한다 (아래 4번 참고).

### platform / status 타입

`platform`과 `status` 모두 Postgres `enum` 대신 **`text` 컬럼 + 필요시 `CHECK` 제약**으로 저장할 것을 제안한다.

- Postgres enum은 값 추가(`ALTER TYPE ... ADD VALUE`)가 일부 상황에서 트랜잭션 제약을 받아 배포 절차가 번거롭다.
- `status`는 이미 6종에서 7종(`canceled` 추가)으로 한 번 늘어난 이력이 있고, 앞으로도 늘어날 가능성이 있다.
- `text` + 애플리케이션 레벨 검증(TS `Status`/`Platform` 유니온 타입이 이미 이 역할을 함)으로도 충분하고, 값이 늘어도 스키마 마이그레이션이 필요 없다.
- 최소한의 무결성이 필요하면 `CHECK (status IN ('applied', 'screening', ...))` 정도만 걸고, `Status` 유니온이 바뀔 때 이 제약도 같이 갱신한다.

### diary(DiaryEntry[]) 저장 방식

두 가지를 검토했다.

**방안 A — `diary jsonb` 컬럼 (제안)**

- 장점: 스키마가 단순하다. 지금 이미 `diary`가 JS 배열이라 그대로 저장하면 돼서 별도 매핑 코드가 거의 필요 없다. `Application` 하나를 select 한 번으로 통째로 읽는 현재 구조와 잘 맞는다.
- 단점: 일기 한 건만 수정/삭제해도 배열 전체를 다시 write 해야 한다. 일기 단위 검색·통계(예: "이번 달 작성한 일기")가 어렵고, `diary_entries` 자체에 RLS를 걸 수 없다(항상 `applications` 단위로만 제어됨).

**방안 B — 별도 `diary_entries` 테이블 (FK: `application_id`)**

- 장점: 정규화된 구조라 일기 단위 CRUD·인덱싱·필터링(작성일, mood별)이 쉽다. 일기 데이터가 커져도 `applications` 행 자체는 가벼운 채로 유지된다.
- 단점: JOIN이 필요해 쿼리가 늘어나고, FK·별도 CRUD 로직·스토어 변경 범위가 커져 초기 구현 비용이 방안 A보다 높다.

**방향 제안**: 초기(S-4)에는 **방안 A(jsonb)**로 단순하게 간다. 지금 유저 수 대비 일기 데이터량이 크지 않아 성능 문제가 당장 없고, 마이그레이션 리스크도 낮다. 일기 검색/통계 기능이 실제로 필요해지는 시점에 `diary_entries` 테이블로 분리하는 것을 [추후 과제](#이후)로 남긴다 (지금 필요 없는 확장성에 미리 투자하지 않는다).

### 인덱스

- `user_id` — 사용자별 조회 기본 인덱스. RLS 정책도 이 컬럼을 항상 필터링하므로 필수.
- `(user_id, platform, external_id)` — `addApplicationsFromExtension`의 기술적 중복 판별(§5-1, 같은 `platform`+`externalId`)을 DB 쿼리로 빠르게 하기 위한 복합 인덱스. `external_id`가 null인 행이 많을 것이므로 `WHERE external_id IS NOT NULL` partial index로 두는 것을 제안한다. 유니크 제약은 걸지 않는다 — 유저가 다르면 같은 `external_id`가 존재할 수 있기 때문이다(플랫폼 간 우연 일치와 같은 이유로, 유저 간에도 굳이 유니크로 막을 이유가 없다).
- `(user_id, company, position)` — 실제 중복 지원(§5-2, `add-duplicate`) 판별 쿼리 가속용. 선택 사항.

---

## 3. 인증 흐름

- **1차: 이메일+비밀번호.** Supabase Auth의 기본 이메일 로그인을 사용한다. 회원가입 → (Supabase 기본 설정대로) 이메일 인증 메일 발송 → 로그인 → 세션 발급. 세션 토큰은 `supabase-js`가 자동으로 로컬에 보관하고 만료 전 갱신해준다.
- **화면 분기**: 비로그인 상태면 로그인/회원가입 화면을, 로그인 상태면 지금의 칸반보드를 보여준다. Next.js App Router 기준으로는 미들웨어에서 세션 유무로 리다이렉트하거나, 클라이언트 쪽 가드 컴포넌트로 처리하는 두 방향이 있다 — 구체적인 구현 방식은 S-3 이슈에서 정한다.
- **로그아웃**: 세션 종료 후 로컬 상태(`applications` 등)를 초기화해서 다음 사용자에게 이전 사용자의 데이터가 잠깐이라도 보이지 않게 한다.

### 이후 — 소셜 로그인

- 구글/카카오 추가 예정. Supabase Auth는 구글을 포함한 주요 OAuth 프로바이더를 기본 지원한다.
- **카카오는 Supabase 기본 OAuth 프로바이더 목록에 없을 가능성이 높다** — 카카오가 OIDC를 지원하므로 Supabase의 "커스텀 OIDC 프로바이더" 설정으로 우회 가능한지 실제 착수 시점에 확인이 필요하다. 이 문서에서 방법을 확정하지 않고 리스크로만 남긴다.
- 소셜 로그인 추가는 이메일 로그인 흐름이 안정화된 뒤 별도 이슈로 진행한다.

---

## 4. 저장 로직 전환 (현재 → Supabase)

### 현재 구조

- [`src/lib/storage.ts`](../src/lib/storage.ts): `getApplications()` / `saveApplications(apps)` — `localStorage`에서 전체 배열을 통째로 읽고 쓴다. 동기 함수.
- [`src/store/applicationStore.ts`](../src/store/applicationStore.ts): `addApplication`, `updateApplication`, `updateStatus`, `removeApplication`, `addApplicationsFromExtension` 전부 로컬 state를 수정한 뒤 `saveApplications`로 **전체 배열을 매번 다시 저장**한다.

### 전환 후 방향

Supabase는 원격 DB라 모든 호출이 네트워크 I/O — 동기 함수가 비동기(`async`/`await`)로 바뀌고, "전체 재저장" 대신 **건별 SQL 조작**(insert/update/delete one row)으로 바뀐다.

| 현재 액션 | 전환 후 |
| --- | --- |
| `loadApplications` | 로그인한 `user_id` 기준으로 `applications` 전체 select (RLS가 자동으로 본인 행만 반환) |
| `addApplication` | 1 row insert, 반환된 row(서버가 채운 `id`/`created_at` 포함)로 로컬 state 갱신 |
| `updateApplication` / `updateStatus` | `update ... where id = ?` (RLS가 `user_id` 일치 여부를 추가로 검증) |
| `removeApplication` | `delete ... where id = ?` |
| `addApplicationsFromExtension` | 아래 별도 서술 |

- `getImportDecision`([`src/utils/duplicateDetection.ts`](../src/utils/duplicateDetection.ts))은 **순수 함수**(기존 목록 배열 + 새 지원건 → 판정값)라 저장소가 로컬이든 원격이든 그대로 재사용한다. 이 함수를 처음부터 순수 함수로 설계해둔 이유가 여기서 그대로 살아난다.
- `addApplicationsFromExtension`은 판별을 위해 "이 유저의 기존 데이터"가 필요하다. 초기엔 단순하게 해당 `user_id`의 `applications` 전체를 한 번 select해서 기존 로직(`getImportDecision`)을 그대로 돌리고, `skip`이 아닌 건만 모아 bulk insert한다(`supabase-js`는 배열 insert를 지원). 데이터가 많아지면 전체를 불러오지 않고 위 인덱스를 활용해 관련 후보(같은 `platform`의 `external_id` 보유 행, 또는 같은 `company`+`position`)만 조회하는 최적화는 [추후 과제](#이후)로 남긴다.
- **로딩/에러 상태**: 네트워크 호출이 실패할 수 있으므로 스토어에 `isLoading`/`error` 같은 상태가 추가로 필요해진다. 세부 UI(스피너, 에러 토스트 등)는 S-4 구현 시점에 별도로 정한다 — 이 문서에서는 "필요해진다"는 방향만 남긴다.
- **camelCase ↔ snake_case 매핑**은 store 안이 아니라 Supabase 접근 계층(예: `lib/supabase.ts` 같은 새 헬퍼)에 두고, `applicationStore`와 컴포넌트는 지금처럼 camelCase `Application`만 다루게 한다 — `lib/storage.ts`가 하던 "저장소 접근 캡슐화" 역할을 Supabase 버전이 그대로 이어받는 구조다.

---

## 5. RLS (Row Level Security)

- `applications` 테이블에 사용자별 접근 제어가 필요한 이유: Supabase는 클라이언트(브라우저)가 REST(PostgREST)로 DB에 직접 접근하는 구조라, 별도 서버 미들웨어가 "이 요청은 이 유저 것만 보여줘"를 강제해주지 않는다. **RLS가 없으면 anon/authenticated 키만으로 다른 사용자의 `applications` 행까지 조회·수정·삭제할 수 있다.**
- 정책 방향: `select` / `insert` / `update` / `delete` 각각(또는 `for all`로 통합)에 `auth.uid() = user_id` 조건을 건다.
  - `select` / `update` / `delete`: `using (auth.uid() = user_id)` — 본인 행만 대상이 되도록.
  - `insert`: `with check (auth.uid() = user_id)` — 본인이 아닌 `user_id`로 끼워 넣는 것도 막는다 (이게 없으면 로그인한 유저가 임의의 `user_id`를 넣어 다른 사람 행세를 할 수 있다).
- **체크리스트**: 테이블을 만들면 RLS는 기본적으로 **비활성 상태**다. `ALTER TABLE applications ENABLE ROW LEVEL SECURITY`를 명시적으로 켜지 않으면 정책을 아무리 작성해도 적용되지 않고 테이블이 그대로 열려있는 상태가 되므로, S-5에서 "정책 작성"과 "RLS 활성화"를 별개 체크 항목으로 둔다.

---

## 6. 개발 순서

- [ ] **S-1**. Supabase 프로젝트 세팅 + `applications` 테이블 생성 (2번 스키마대로)
- [ ] **S-2**. 웹앱-Supabase 연결 (`@supabase/supabase-js` 설치, 환경변수 설정)
- [ ] **S-3**. 이메일+비밀번호 인증 (회원가입/로그인 UI + 세션 처리)
- [ ] **S-4**. 저장 로직 전환 (`lib/storage.ts` / `applicationStore`를 Supabase 접근으로 교체)
- [ ] **S-5**. RLS 정책 작성 + 활성화

### 이후

- 소셜 로그인(구글/카카오) 추가
- 익스텐션 → 웹앱 데이터 전달 방식 확정 (INTEGRATION.md §6과 함께 — 익스텐션이 어떤 `user_id`로 저장할지는 로그인 도입 후에만 결정 가능한 열린 문제)
- 중복 감지 결과("중복 지원") 표시 UI (INTEGRATION.md §5 "플래그 저장 방식" 참고)
- 일기 검색/통계 기능이 필요해지면 `diary_entries` 테이블 분리 검토
- `addApplicationsFromExtension` 후보 조회 최적화 (매번 전체 select 대신 인덱스로 관련 후보만 조회)
