import type { ESession, EWindow } from '@/lib/types';
import { normalizeTimestampValue } from './timestamps';

function cloneWindows(windows: EWindow[] = []) {
  return structuredClone(windows);
}

export function sanitizeSessionGroup(
  session: ESession,
  overrides: Partial<ESession> = {}
): ESession {
  const now = Date.now();
  const windows = cloneWindows(overrides.windows ?? session.windows);
  const dateSaved =
    normalizeTimestampValue(overrides.dateSaved ?? session.dateSaved) ?? now;
  const createdAt =
    normalizeTimestampValue(overrides.createdAt ?? session.createdAt) ??
    dateSaved;
  const updatedAt =
    normalizeTimestampValue(overrides.updatedAt ?? session.updatedAt) ??
    normalizeTimestampValue(overrides.dateModified ?? session.dateModified) ??
    createdAt;
  const dateModified =
    normalizeTimestampValue(overrides.dateModified ?? session.dateModified) ??
    updatedAt;
  const lastOpenedAt = normalizeTimestampValue(
    overrides.lastOpenedAt ?? session.lastOpenedAt
  );
  const remoteUpdatedAt = normalizeTimestampValue(
    overrides.remoteUpdatedAt ?? session.remoteUpdatedAt
  );
  const deletedAt =
    normalizeTimestampValue(overrides.deletedAt ?? session.deletedAt) ??
    (overrides.deletedAt ?? session.deletedAt) ??
    null;
  const tabsNumber =
    session.tabsNumber ??
    windows.reduce((sum, window) => sum + (window.tabs?.length ?? 0), 0);

  return {
    id: overrides.id ?? session.id,
    title: (overrides.title ?? session.title)?.trim() || 'Untitled Group',
    tags: overrides.tags ?? session.tags,
    windows,
    tabsNumber: overrides.tabsNumber ?? tabsNumber,
    dateSaved,
    dateModified,
    kind: overrides.kind ?? session.kind ?? 'saved',
    source: overrides.source ?? session.source ?? 'manual',
    createdAt,
    updatedAt,
    lastOpenedAt,
    deviceId: overrides.deviceId ?? session.deviceId,
    schemaVersion: overrides.schemaVersion ?? session.schemaVersion ?? 1,
    deletedAt,
    syncState: overrides.syncState ?? session.syncState ?? 'pending',
    remoteUpdatedAt
  };
}

export function createEmptySessionGroup(title = 'Untitled Group'): ESession {
  const now = Date.now();

  return sanitizeSessionGroup(
    {
      id: crypto.randomUUID(),
      title,
      windows: [],
      tabsNumber: 0,
      dateSaved: now,
      dateModified: now
    } as ESession,
    {
      createdAt: now,
      updatedAt: now
    }
  );
}
