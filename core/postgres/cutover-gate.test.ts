import { describe, expect, test } from 'bun:test';
import { evaluateCutoverGate } from './cutover-gate';

const readyEnv = {
  DATABASE_URL: 'postgresql://private',
  AD507_PUBLIC_BASE_URL: 'https://direcciones507.com',
  AD507_RESIDENTIAL_PROVISIONING_SECRET: 'configured',
};

describe('Core cutover gate', () => {
  test('readiness alone never permits cutover', () => {
    const result = evaluateCutoverGate(readyEnv);
    expect(result.allowed).toBe(false);
    expect(result.blockers).toContain('AD507_CORE_CUTOVER_APPROVED');
    expect(result.blockers).toContain('AD507_CORE_SHADOW_VERIFIED');
  });

  test('approval without shadow verification stays blocked', () => {
    const result = evaluateCutoverGate({
      ...readyEnv,
      AD507_CORE_CUTOVER_APPROVED: 'true',
    });
    expect(result.allowed).toBe(false);
    expect(result.blockers).toEqual(['AD507_CORE_SHADOW_VERIFIED']);
  });

  test('shadow verification without explicit approval stays blocked', () => {
    const result = evaluateCutoverGate({
      ...readyEnv,
      AD507_CORE_SHADOW_VERIFIED: 'true',
    });
    expect(result.allowed).toBe(false);
    expect(result.blockers).toEqual(['AD507_CORE_CUTOVER_APPROVED']);
  });

  test('permits cutover only when readiness, shadow and approval are all true', () => {
    const result = evaluateCutoverGate({
      ...readyEnv,
      AD507_CORE_SHADOW_VERIFIED: 'true',
      AD507_CORE_CUTOVER_APPROVED: 'true',
    });
    expect(result).toEqual({ allowed: true, blockers: [] });
  });
});
