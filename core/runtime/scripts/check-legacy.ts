import { readFileSync } from 'node:fs';
import {applyReviewedNatalieCorrections} from '../legacy-corrections';
const snapshot = readFileSync(new URL('../legacy.snapshot.txt', import.meta.url), 'utf8').trimEnd();
const expected = applyReviewedNatalieCorrections(snapshot)
  .replace('Bun.serve({ hostname:', 'export function startLegacyCore(extension: (req: Request) => Promise<Response | null>) { if (process.env.AD507_INTERNATIONAL_DOMAIN_VERIFIED === "true") NATALIE_ALLOWED_ORIGINS.add("https://direcciones.lat"); return Bun.serve({ hostname:')
  .replace('async fetch(req) { const startedAt', 'async fetch(req) { const added = await extension(req); if (added) return added; const startedAt')
  .replace('}); audit("controlled_private_listener_ready"', '}); } audit("controlled_private_listener_ready"');
const actual = readFileSync(new URL('../legacy.ts', import.meta.url), 'utf8').trimEnd();
if (actual !== expected || !actual.includes('export function startLegacyCore')) throw new Error('LEGACY_EXTRACTION_DRIFT');
console.log('PASS: deployed source preserved except extension seam and reviewed Natalie fixes removal of automatic startup DDL/data normalization, and exclusion of visits from historical interaction summaries');
