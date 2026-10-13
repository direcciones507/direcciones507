export function internalMapEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.AD507_INTERNAL_MAP_ENABLED === "true";
}

export type InternalMapActor = {
  authenticated: boolean;
  roles: string[];
};

export function canAccessInternalMap(actor: InternalMapActor): boolean {
  if (!actor.authenticated) return false;
  return actor.roles.includes("ADMIN") || actor.roles.includes("OPERATOR");
}

/**
 * Public-map exposure is a separate future decision. Keeping a distinct flag prevents
 * accidentally making the internal dataset public when the internal map is enabled.
 */
export function publicMapEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.AD507_PUBLIC_MAP_ENABLED === "true";
}
