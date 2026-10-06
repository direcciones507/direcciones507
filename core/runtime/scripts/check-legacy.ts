import { readFileSync } from 'node:fs';
const snapshot = readFileSync(new URL('../legacy.snapshot.txt', import.meta.url), 'utf8').trimEnd();
const expected = snapshot
  .replace('Bun.serve({ hostname:', 'export function startLegacyCore(extension: (req: Request) => Promise<Response | null>) { return Bun.serve({ hostname:')
  .replace('async fetch(req) { const startedAt', 'async fetch(req) { const added = await extension(req); if (added) return added; const startedAt')
  .replace('}); audit("controlled_private_listener_ready"', '}); } audit("controlled_private_listener_ready"');
const actual = readFileSync(new URL('../legacy.ts', import.meta.url), 'utf8').trimEnd();
if (actual !== expected || !actual.includes('export function startLegacyCore')) throw new Error('LEGACY_EXTRACTION_DRIFT');
console.log('PASS: exact deployed source preserved except explicit extension seam');
