import { randomBytes } from 'node:crypto';

function slugPart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
}

/**
 * Generates a safe candidate code. Uniqueness is still enforced by PostgreSQL's
 * UNIQUE constraint and the creation repository retries on collision.
 */
export function generatePlaceCodeCandidate(name: string, entropy?: string): string {
  const slug = slugPart(name) || 'LUGAR';
  const suffix = (entropy ?? randomBytes(3).toString('hex')).toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 6);
  return `AD507-${slug}-${suffix || '000000'}`;
}
