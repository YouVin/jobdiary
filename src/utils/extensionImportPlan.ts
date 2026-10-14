import { getImportDecision, IncomingApplication, mergeImportedApplication } from '@/utils/duplicateDetection';
import type { Application } from '@/types/application';

// 기존 지원은 조회만 하고 절대 갱신하지 않는다. 이번 배치의 신규 지원만 한 번 삽입한다.
export function buildExtensionImportPlan(existing: Application[], incoming: IncomingApplication[]) {
  const candidates = new Map(existing.map((app) => [app.id, app]));
  const inserts = new Map<string, IncomingApplication>();
  let addedCount = 0;
  let duplicateCount = 0;
  let skippedCount = 0;

  for (const input of incoming) {
    const app = { ...input, statusSource: 'extension' as const };
    const decision = getImportDecision([...candidates.values()], app);
    if (decision.type === 'skip' || (decision.type === 'update' && !inserts.has(decision.target.id))) {
      skippedCount += 1;
      continue;
    }
    if (decision.type === 'update') {
      const merged = mergeImportedApplication(decision.target, app);
      candidates.set(merged.id, merged);
      // DB에 아직 없는 항목끼리만 최신 수집 결과를 합친다.
      inserts.set(merged.id, {
        ...inserts.get(merged.id)!,
        company: merged.company,
        position: merged.position,
        status: merged.status,
        appliedAt: merged.appliedAt,
        externalId: merged.externalId,
      });
      continue;
    }
    const id = crypto.randomUUID();
    candidates.set(id, { ...app, id, updatedAt: '' });
    inserts.set(id, app);
    if (decision.type === 'add-duplicate') duplicateCount += 1;
    else addedCount += 1;
  }

  return {
    toInsert: [...inserts.values()],
    addedCount, duplicateCount, skippedCount,
  };
}
