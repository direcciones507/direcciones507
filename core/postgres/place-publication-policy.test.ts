import { describe, expect, test } from 'bun:test';
import { canExposePlacePublicly, type PublicPlaceSurface } from './place-publication-policy';

const publicSurfaces: PublicPlaceSurface[] = [
  'PUBLIC_PAGE', 'SEARCH', 'PUBLIC_MAP', 'SITEMAP', 'SEARCH_INDEXING',
];

describe('place publication policy', () => {
  for (const status of ['DRAFT', 'PENDING_REVIEW', 'SUSPENDED', 'ARCHIVED']) {
    test(`${status} is hidden from every public surface`, () => {
      for (const surface of publicSurfaces) {
        expect(canExposePlacePublicly({ status, latitude: 8.1, longitude: -80.9 }, surface)).toBe(false);
      }
    });
  }

  test('active place is eligible for non-map public surfaces', () => {
    for (const surface of ['PUBLIC_PAGE', 'SEARCH', 'SITEMAP', 'SEARCH_INDEXING'] as PublicPlaceSurface[]) {
      expect(canExposePlacePublicly({ status: 'ACTIVE', latitude: null, longitude: null }, surface)).toBe(true);
    }
  });

  test('active place without coordinates stays off public map', () => {
    expect(canExposePlacePublicly({ status: 'ACTIVE', latitude: null, longitude: null }, 'PUBLIC_MAP')).toBe(false);
  });

  test('active place with coordinates may enter public map', () => {
    expect(canExposePlacePublicly({ status: 'ACTIVE', latitude: 8.1, longitude: -80.9 }, 'PUBLIC_MAP')).toBe(true);
  });
});
