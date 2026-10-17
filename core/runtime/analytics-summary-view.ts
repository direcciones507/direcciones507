/** Read-only presentation of the existing private analytics summary.
 * No extra counters, client-side tracking, or authorization bypass.
 */
export type AnalyticsSummary = {
  ok: boolean;
  plan: string;
  visits?: {status?: string; total?: number};
  interactions?: Record<string,number>;
  daily_series?: Array<{day:string;event_type:string;total:number}>;
};
const ACTIONS: Record<string,string> = {
  google:'Google Maps',waze:'Waze',uber:'Uber',share:'Compartir',copy:'Copiar',aviso:'Aviso'
};
export function analyticsViewModel(summary: AnalyticsSummary) {
  if (!summary?.ok) throw new Error('INVALID_ANALYTICS_SUMMARY');
  const pro=summary.plan==='premium_pro';
  const counts=summary.interactions??{};
  const actions=Object.entries(ACTIONS).map(([key,label])=>({
    key,label,count:Number.isSafeInteger(counts[key])&&counts[key]>=0?counts[key]:0
  }));
  const visits=summary.visits?.status==='available'&&Number.isSafeInteger(summary.visits.total)&&summary.visits.total!>=0
    ? {available:true,total:summary.visits.total!}
    : {available:false,total:null};
  const days=pro?(summary.daily_series??[]).filter(row=>/^\d{4}-\d{2}-\d{2}$/.test(row.day)
    &&Object.hasOwn(ACTIONS,row.event_type)&&Number.isSafeInteger(row.total)&&row.total>=0):[];
  return {plan:summary.plan,pro,visits,actions:pro?actions:[],daily:days,
    interactionsTotal:actions.reduce((sum,row)=>sum+row.count,0)};
}
