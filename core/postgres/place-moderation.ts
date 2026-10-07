export type PlaceModerationStatus = 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export type PlaceModerationAction = 'SUBMIT_FOR_REVIEW' | 'APPROVE' | 'REJECT_TO_DRAFT' | 'SUSPEND' | 'ARCHIVE';

const transitions: Record<PlaceModerationStatus, Partial<Record<PlaceModerationAction, PlaceModerationStatus>>> = {
  DRAFT: { SUBMIT_FOR_REVIEW: 'PENDING_REVIEW', ARCHIVE: 'ARCHIVED' },
  PENDING_REVIEW: { APPROVE: 'ACTIVE', REJECT_TO_DRAFT: 'DRAFT', ARCHIVE: 'ARCHIVED' },
  ACTIVE: { SUSPEND: 'SUSPENDED', ARCHIVE: 'ARCHIVED' },
  SUSPENDED: { APPROVE: 'ACTIVE', ARCHIVE: 'ARCHIVED' },
  ARCHIVED: {},
};

/**
 * Publication is intentionally explicit: a DRAFT cannot jump directly to ACTIVE.
 * This keeps public search, map and future indexing behind a moderation boundary.
 */
export function nextPlaceModerationStatus(
  current: PlaceModerationStatus,
  action: PlaceModerationAction,
): PlaceModerationStatus | null {
  return transitions[current][action] ?? null;
}
