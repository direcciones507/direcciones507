type Database={unsafe(query:string,params:any[]):PromiseLike<any[]>};
// Initial conservative limits; configurable policy can follow staging feedback.
export const radarAbuseLimits={registrationsPerDay:10,reportsPerMinute:6,reportsPerEstablishmentPerMinute:1} as const;
export function createRadarAbuseChecks(db:Database){
 return {
  async registrationAllowed(accountRef:string){
   const rows=await db.unsafe("SELECT count(*)::int AS total FROM radar.establishments WHERE account_ref=$1 AND created_at>now()-interval '24 hours'",[accountRef]);
   return Number(rows[0]?.total)<radarAbuseLimits.registrationsPerDay;
  },
  async reportAllowed(accountRef:string,id:string){
   const rows=await db.unsafe("SELECT count(*)::int AS total,count(*) FILTER (WHERE establishment_id=$2::uuid)::int AS same FROM radar.activity_reports WHERE account_ref=$1 AND created_at>now()-interval '1 minute'",[accountRef,id]);
   return Number(rows[0]?.total)<radarAbuseLimits.reportsPerMinute && Number(rows[0]?.same)<radarAbuseLimits.reportsPerEstablishmentPerMinute;
  }
 };
}
