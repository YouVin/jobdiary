import { Application } from '@/types/application';
import { toDateInputValue } from '@/utils/format';

// 동일 지원은 갱신하고, 사용자가 직접 정한 상태와 일기 등은 유지한다.
export type ImportDecision =
  | { type: 'add' }
  | { type: 'add-duplicate' }
  | { type: 'skip' }
  | { type: 'update'; target: Application };

export type IncomingApplication = Omit<Application, 'id' | 'updatedAt'>;

function normalizeText(value: string): string {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

export function hasManualStatus(application: Application): boolean {
  // 기존 데이터에 변경 주체가 없다면 진행/종료 상태를 보수적으로 보호한다.
  return application.statusSource === 'manual' || application.statusSource === 'deadline' || application.statusSource === 'created' ||
    (application.statusSource === undefined && application.status !== 'applied');
}

export function mergeImportedApplication(existing: Application, incoming: IncomingApplication): Application {
  return {
    ...existing,
    company: normalizeText(incoming.company),
    position: normalizeText(incoming.position),
    status: hasManualStatus(existing) ? existing.status : incoming.status,
    appliedAt: incoming.appliedAt,
    deadlineAt: incoming.deadlineAt ?? existing.deadlineAt,
    externalId: incoming.externalId?.trim() || existing.externalId,
  };
}

// 지원/취소에서 ID가 달라지거나 ID가 없는 경우 같은 플랫폼의 회사명+공고명으로 보완한다.
function findSameListing(
  existingApplications: Application[],
  newApplication: IncomingApplication,
): Application | undefined {
  return existingApplications.find(
    (existing) =>
      existing.platform === newApplication.platform &&
      normalizeText(existing.company) === normalizeText(newApplication.company) &&
      normalizeText(existing.position) === normalizeText(newApplication.position),
  );
}

// 두 지원건의 내용(상태, 지원일)이 실질적으로 동일한지 비교
function isSameContent(existing: Application, incoming: IncomingApplication): boolean {
  const merged = mergeImportedApplication(existing, incoming);
  return (
    existing.company === merged.company &&
    existing.position === merged.position &&
    existing.externalId === merged.externalId &&
    existing.status === merged.status &&
    toDateInputValue(existing.appliedAt) === toDateInputValue(merged.appliedAt) &&
    existing.deadlineAt === merged.deadlineAt
  );
}

// 새로 수집된 지원건 하나를 기존 목록과 비교해 저장 여부를 판별한다 (docs/INTEGRATION.md §5)
export function getImportDecision(
  existingApplications: Application[],
  newApplication: IncomingApplication,
): ImportDecision {
  // 지원 ID가 같으면 회사명/공고명이 바뀌어도 같은 지원이다.
  const externalId = newApplication.externalId?.trim();
  const sameSubmission = externalId ? existingApplications.find((existing) =>
    existing.platform === newApplication.platform && existing.externalId?.trim() === externalId,
  ) : undefined;
  const target = sameSubmission ?? findSameListing(existingApplications, newApplication);

  if (target) {
    // 지원/취소가 서로 다른 ID로 오는 경우, 오래된 지원 행이 최신 취소를 되돌리지 않게 한다.
    if (!sameSubmission && toDateInputValue(newApplication.appliedAt) < toDateInputValue(target.appliedAt)) {
      return { type: 'skip' };
    }
    return isSameContent(target, newApplication) ? { type: 'skip' } : { type: 'update', target };
  }

  // 3) 여기까지 왔다면 같은 platform+company+position은 없다는 뜻이므로, company+position만 같은
  //    기존 건이 있다면 그건 반드시 다른 platform이다 → 크로스플랫폼 중복 지원.
  const hasSameCompanyPosition = existingApplications.some(
    (existing) => normalizeText(existing.company) === normalizeText(newApplication.company) &&
      normalizeText(existing.position) === normalizeText(newApplication.position),
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
    const key = JSON.stringify([normalizeText(application.company), normalizeText(application.position)]);
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
