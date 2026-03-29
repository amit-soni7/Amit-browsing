export function normalizeTimestampValue(value: unknown): number | undefined {
  if (value === null || typeof value === 'undefined') return undefined;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return undefined;
    return Math.abs(value) < 10_000_000_000
      ? Math.trunc(value * 1000)
      : Math.trunc(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) return normalizeTimestampValue(numeric);

    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isNaN(timestamp) ? undefined : timestamp;
  }

  if (typeof value === 'object') {
    const timestamp = value as {
      toMillis?: () => number;
      seconds?: number;
      nanoseconds?: number;
    };

    if (typeof timestamp.toMillis === 'function') {
      const millis = timestamp.toMillis();
      return Number.isFinite(millis) ? millis : undefined;
    }

    if (typeof timestamp.seconds === 'number') {
      const nanoseconds =
        typeof timestamp.nanoseconds === 'number' ? timestamp.nanoseconds : 0;
      return timestamp.seconds * 1000 + Math.floor(nanoseconds / 1_000_000);
    }
  }

  return undefined;
}
