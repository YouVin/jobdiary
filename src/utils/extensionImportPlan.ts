import type { ApplicationChanges } from '@/lib/applicationsApi';
import type { Application } from '@/types/application';
import { getImportDecision, hasManualStatus, IncomingApplication, mergeImportedApplication } from '@/utils/duplicateDetection';

// 배치 안에서 같은 지원이 여러 번 등장해도 insert/update는 지원당 한 번만 수행한다.
export function buildExtensionImportPlan(existing: Application[], incoming: IncomingApplication[]) {
  const candidates = new Map(existing.map((app) => [app.id, app]));
  const inserts = new Map<string, IncomingApplication>();
  const updates = new Map<string, ApplicationChanges>();
  let addedCount = 0;
  let duplicateCount = 0;
  let skippedCount = 0;

  for (const input of incoming) {
    const app = { ...input, statusSource: 'extension' as const };
    const decision = getImportDecision([...candidates.values()], app);
    if (decision.type === 'skip') {
      skippedCount += 1;
      continue;
    }
    if (decision.type === 'update') {
      const merged = mergeImportedApplication(decision.target, app);
      candidates.set(merged.id, merged);
      if (inserts.has(merged.id)) {
        // 아직 DB에 없는 항목: 임시 ID로 update하지 않고 삽입할 내용을 교체한다.
        inserts.set(merged.id, {
          ...inserts.get(merged.id)!,
          company: merged.company,
          position: merged.position,
          status: merged.status,
          appliedAt: merged.appliedAt,
          externalId: merged.externalId,
        });
      } else {
        updates.set(merged.id, {
          company: merged.company,
          position: merged.position,
          appliedAt: merged.appliedAt,
          externalId: merged.externalId,
          // 직접 정한 상태는 SQL UPDATE 필드에서도 제외한다.
          ...(!hasManualStatus(decision.target) && { status: merged.status, statusSource: 'extension' as const }),
        });
      }
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
    toUpdate: [...updates].map(([id, changes]) => ({ id, changes })),
    addedCount, duplicateCount, skippedCount,
  };
}
