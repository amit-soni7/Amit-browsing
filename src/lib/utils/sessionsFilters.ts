import type { SortMethod, ESession } from '@/lib/types';
import { normalizeTimestampValue } from './timestamps';

export function sortSessions(sortMethod: SortMethod, sessions: ESession[]) {
  switch (sortMethod) {
    case 'newest': {
      return sessions.sort(
        (a, b) =>
          (normalizeTimestampValue(a.dateSaved) ?? 0) -
          (normalizeTimestampValue(b.dateSaved) ?? 0)
      );
    }

    case 'oldest': {
      return sessions.sort(
        (a, b) =>
          (normalizeTimestampValue(b.dateSaved) ?? 0) -
          (normalizeTimestampValue(a.dateSaved) ?? 0)
      );
    }

    case 'az': {
      return sessions.sort((a, b) => -a.title.localeCompare(b.title));
    }

    case 'za': {
      return sessions.sort((a, b) => a.title.localeCompare(b.title));
    }
  }
}

export function filterTags(sessions: ESession[], tag: '__all__' | string) {
  if (tag === '__all__') return sessions;

  return sessions.filter((session) => session.tags === tag);
}

export function filterTagsAndSort(
  sessions: ESession[],
  sortMethod: SortMethod,
  tagsFilter: string
) {
  return sortSessions(sortMethod, filterTags(sessions, tagsFilter));
}
