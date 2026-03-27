import type { ESession } from '@/lib/types';

export function generateSession(
  session: ESession,
  overrides: Partial<ESession> = {}
): ESession {
  const date = Date.now();

  return {
    title: session.title,
    windows: structuredClone(session.windows),
    tabsNumber: session.tabsNumber,
    dateSaved: date,
    dateModified: date,
    id: crypto.randomUUID(),
    tags: session.tags,
    kind: 'saved',
    source: 'manual',
    createdAt: date,
    updatedAt: date,
    lastOpenedAt: undefined,
    schemaVersion: 1,
    syncState: 'pending',
    ...overrides
  };
}
