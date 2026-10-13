import { evaluateCoreReadiness } from './core-readiness';

export type CutoverGate = {
  allowed: boolean;
  blockers: string[];
};

export function evaluateCutoverGate(
  env: Record<string, string | undefined> = process.env,
): CutoverGate {
  const readiness = evaluateCoreReadiness(env);
  const blockers = [...readiness.missing];

  if (env.AD507_CORE_CUTOVER_APPROVED !== 'true') blockers.push('AD507_CORE_CUTOVER_APPROVED');
  if (env.AD507_CORE_SHADOW_VERIFIED !== 'true') blockers.push('AD507_CORE_SHADOW_VERIFIED');

  return { allowed: blockers.length === 0, blockers };
}
