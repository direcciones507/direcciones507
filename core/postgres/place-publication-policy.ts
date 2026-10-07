export type PublicPlaceSurface = 'PUBLIC_PAGE' | 'SEARCH' | 'PUBLIC_MAP' | 'SITEMAP' | 'SEARCH_INDEXING';

export type PlacePublicationRecord = {
  status: string;
  latitude: number | null;
  longitude: number | null;
};

/**
 * Central fail-closed publication rule for PLACE records.
 * No public surface may expose a place until moderation has made it ACTIVE.
 */
export function canExposePlacePublicly(
  place: PlacePublicationRecord,
  surface: PublicPlaceSurface,
): boolean {
  if (place.status !== 'ACTIVE') return false;

  if (surface === 'PUBLIC_MAP') {
    return Number.isFinite(place.latitude) && Number.isFinite(place.longitude);
  }

  return true;
}
