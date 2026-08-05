import { Application } from '@/types/application';
import { toDateInputValue } from '@/utils/format';

// 새 지원건을 저장소에 어떻게 반영할지에 대한 판정 (docs/INTEGRATION.md §5)
// add: 일반 추가 / add-duplicate: 추가하되 크로스플랫폼 재지원(진짜 중복)으로 감지
// update: 같은 공고(platform+company+position)의 상태 변화 → 기존 건 대체
// skip: 같은 지원 내역(platform+externalId)의 완전히 동일한 내용 재수집
export type ImportDecision =
  | { type: 'add' }
  | { type: 'add-duplicate' }
  | { type: 'skip' }
  | { type: 'update'; target: Application };

type IncomingApplication = Omit<Application, 'id' | 'updatedAt'>;

// 같은 공고로 볼 기존 건을 찾는다. 판정 기준은 platform+company+position — 사람인/잡코리아/원티드
// 모두 동일하게 적용한다. externalId는 공고 단위가 아니라 지원 행위(지원 내역) 단위로 발급되므로
// (예: 잡코리아 idx, 사람인 recruitapply_idx) 공고 식별에는 쓸 수 없다 — 같은 공고를 지원→취소해도
// 서로 다른 externalId를 받기 때문이다 (§5 "왜 다시 재정의했는가").
function findSameListing(
  existingApplications: Application[],
  newApplication: IncomingApplication,
): Application | undefined {
  return existingApplications.find(
    (existing) =>
      existing.platform === newApplication.platform &&
      existing.company === newApplication.company &&
      existing.position === newApplication.position,
  );
}

// 두 지원건의 내용(상태, 지원일)이 실질적으로 동일한지 비교
function isSameContent(existing: Application, incoming: IncomingApplication): boolean {
  return (
    existing.status === incoming.status && toDateInputValue(existing.appliedAt) === toDateInputValue(incoming.appliedAt)
  );
}

// 같은 지원 내역(platform+externalId)의 재수집인지 확인한다. externalId는 지원 행위 단위로
// 발급되는 번호라 "같은 지원 내역을 다시 긁었는가"를 가리는 용도로만 쓴다 — 공고 식별에는 쓰지 않는다.
function isSameSubmissionRecollected(existing: Application, incoming: IncomingApplication): boolean {
  if (!incoming.externalId || existing.platform !== incoming.platform || existing.externalId !== incoming.externalId) {
    return false;
  }

  return isSameContent(existing, incoming);
}

// 새로 수집된 지원건 하나를 기존 목록과 비교해 저장 여부를 판별한다 (docs/INTEGRATION.md §5)
export function getImportDecision(
  existingApplications: Application[],
  newApplication: IncomingApplication,
): ImportDecision {
  // 1) 같은 platform+externalId이고 내용까지 동일하면 같은 지원 내역의 기술적 재수집 → skip
  const isRecollected = existingApplications.some((existing) => isSameSubmissionRecollected(existing, newApplication));

  if (isRecollected) {
    return { type: 'skip' };
  }

  // 2) 같은 공고(platform+company+position)인 기존 건이 있으면 상태 변화로 보고 update
  const sameListing = findSameListing(existingApplications, newApplication);

  if (sameListing) {
    return { type: 'update', target: sameListing };
  }

  // 3) 여기까지 왔다면 같은 platform+company+position은 없다는 뜻이므로, company+position만 같은
  //    기존 건이 있다면 그건 반드시 다른 platform이다 → 크로스플랫폼 중복 지원.
  const hasSameCompanyPosition = existingApplications.some(
    (existing) => existing.company === newApplication.company && existing.position === newApplication.position,
  );

  return hasSameCompanyPosition ? { type: 'add-duplicate' } : { type: 'add' };
}

// 보드에 표시된 지원건들 중 "중복 지원"으로 표시할 id 집합을 실시간으로 계산한다 (docs/INTEGRATION.md §5).
// company+position별로 묶어, 서로 다른 platform이 2개 이상 섞여 있는 그룹만 중복으로 본다 — 같은
// platform끼리는 같은 공고의 상태 변화라 이미 update로 합쳐졌을 것이므로 대상에서 제외한다.
// 저장하지 않고 렌더 시점에만 계산하는 값이라 별도 DB 필드나 캐시가 필요 없다.
export function getDuplicateApplicationIds(applications: Application[]): Set<string> {
  const groups = new Map<string, Application[]>();

  applications.forEach((application) => {
    const key = `${application.company}::${application.position}`;
    const group = groups.get(key);

    if (group) {
      group.push(application);
    } else {
      groups.set(key, [application]);
    }
  });

  const duplicateIds = new Set<string>();

  groups.forEach((group) => {
    const distinctPlatforms = new Set(group.map((application) => application.platform));

    if (distinctPlatforms.size >= 2) {
      group.forEach((application) => duplicateIds.add(application.id));
    }
  });

  return duplicateIds;
}
