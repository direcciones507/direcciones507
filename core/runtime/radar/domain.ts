// Radar phase 1: pure domain logic, not wired into production.
export const countries = ["PA","CO","CR","GT","SV","HN","NI","MX"] as const;
export type Country = typeof countries[number];
export type Activity = "available" | "queue" | "full" | "incident" | "unknown";
export type Report = { state: Exclude<Activity,"unknown">; source: "community" | "verified_owner"; createdAt: number };
export type Pin = "normal" | "live" | "featured";
export const defaults = Object.freeze({ commercialEnabled: false, reportTtlMs: 30 * 60 * 1000 });
export function validCoordinates(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}
export function currentActivity(reports: readonly Report[], now: number, ttl = defaults.reportTtlMs): Report | null {
  if (!Number.isFinite(now) || !Number.isFinite(ttl) || ttl <= 0) return null;
  return reports.filter(r => Number.isFinite(r.createdAt) && r.createdAt <= now && now-r.createdAt < ttl)
    .sort((a,b) => b.createdAt-a.createdAt || Number(b.source==="verified_owner")-Number(a.source==="verified_owner"))[0] ?? null;
}
export function visiblePin(campaign: {kind: Exclude<Pin,"normal">; startsAt: number; endsAt: number} | null, now: number, commercialEnabled = defaults.commercialEnabled): Pin {
  return commercialEnabled && campaign && campaign.startsAt <= now && now < campaign.endsAt ? campaign.kind : "normal";
}
