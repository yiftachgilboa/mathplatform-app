/** ?next=/course → '/course'. רק נתיב פנימי (מונע הפניה לאתר חיצוני). */
export function safeNext(next: string | null | undefined, fallback = '/select-child'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback
  return next
}
