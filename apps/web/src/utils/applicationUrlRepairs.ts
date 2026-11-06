import { getPostingReference } from '@jobdiary/shared';
import type { Application } from '@/types/application';

export interface ApplicationUrlRepair { id: string; url: string; expectedUpdatedAt: string }

// 기존 카드의 상태 등은 보존한다. 같은 지원 ID의 빈 주소만 확정된 공고 URL로 보충한다.
export function buildApplicationUrlRepairs(
  existing: Application[], incoming: Omit<Application, 'id' | 'updatedAt'>[],
): ApplicationUrlRepair[] {
  const urls = new Map<string, Set<string>>();
  for (const app of incoming) {
    const reference = getPostingReference(app.url);
    const externalId = app.externalId?.trim();
    if (!reference || reference.platform !== app.platform || !externalId) continue;
    const key = JSON.stringify([app.platform, externalId]);
    const choices = urls.get(key) ?? new Set<string>();
    choices.add(reference.url);
    urls.set(key, choices);
  }
  const repairs: ApplicationUrlRepair[] = [];
  for (const app of existing) {
    const externalId = app.externalId?.trim();
    if (app.url?.trim() || !externalId || !app.updatedAt) continue;
    const choices = urls.get(JSON.stringify([app.platform, externalId]));
    if (choices?.size === 1) repairs.push({ id: app.id, url: [...choices][0], expectedUpdatedAt: app.updatedAt });
  }
  return repairs;
}
