import type { ESession } from '@/lib/types';
import { sanitizeSessionGroup } from './sessionGroups';

export function generateSession(
  session: ESession,
  overrides: Partial<ESession> = {}
): ESession {
  const date = Date.now();

  return sanitizeSessionGroup(
    {
      ...session,
      id: crypto.randomUUID(),
      dateSaved: date,
      dateModified: date,
      createdAt: date,
      updatedAt: date
    },
    overrides
  );
}
