/**
 * Drip Content Utilities
 *
 * Check whether a lesson is unlocked based on the student's enrollment date
 * and the lesson's `unlock_after_days` setting.
 */

export interface DripStatus {
  /** true when the lesson is still locked */
  isLocked: boolean;
  /** The exact date/time the lesson becomes available */
  unlockDate: Date;
  /** Whole days remaining until unlock (0 when already unlocked) */
  daysRemaining: number;
}

/**
 * Check if a lesson is unlocked for a user based on enrollment date.
 *
 * @param enrollmentDate - When user enrolled (ISO string or Date-parseable)
 * @param unlockAfterDays - Days after enrollment to unlock (0 or null = immediate)
 * @returns DripStatus with lock state, unlock date, and remaining days
 */
export function checkLessonDrip(
  enrollmentDate: string,
  unlockAfterDays: number | null | undefined,
): DripStatus {
  const days = unlockAfterDays ?? 0;

  // 0 days means immediately available
  if (days <= 0) {
    return {
      isLocked: false,
      unlockDate: new Date(enrollmentDate),
      daysRemaining: 0,
    };
  }

  const enrolled = new Date(enrollmentDate);
  const unlockDate = new Date(enrolled);
  unlockDate.setDate(unlockDate.getDate() + days);

  // Reset to start of day so unlocks happen at midnight
  unlockDate.setHours(0, 0, 0, 0);

  const now = new Date();
  const diffMs = unlockDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { isLocked: false, unlockDate, daysRemaining: 0 };
  }

  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return { isLocked: true, unlockDate, daysRemaining };
}

/**
 * Format a date for Vietnamese display (dd/MM/yyyy).
 * Avoids pulling in date-fns for this simple case.
 */
export function formatDripDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}
