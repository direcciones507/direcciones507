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

/** Safe HTML for a private statistics section, only from validated view-model values. */
export function renderAnalyticsSummary(summary: AnalyticsSummary): string {
  const m=analyticsViewModel(summary);
  const number=(n:number)=>n.toLocaleString('es-PA');
  const visits=m.visits.available?number(m.visits.total!):'Aún no disponible';
  const head='<section class="analytics-summary" aria-label="Estadísticas de mi dirección"><h3>Estadísticas</h3>'+
    '<p><strong>Visitas:</strong> '+visits+'</p>'+
    '<p><strong>Interacciones registradas:</strong> '+number(m.interactionsTotal)+'</p>';
  if(!m.pro)return head+'</section>';
  const rows=m.actions.map(a=>'<li><span>'+a.label+'</span>: <strong>'+number(a.count)+'</strong></li>').join('');
  const daily=new Map<string,number>();
  for(const row of m.daily)daily.set(row.day,(daily.get(row.day)??0)+row.total);
  const trend=[...daily.entries()].sort(([a],[b])=>a.localeCompare(b))
    .map(([day,total])=>'<li><time datetime="'+day+'">'+day+'</time>: '+number(total)+'</li>').join('');
  return head+'<h4>Acciones por tipo</h4><ul>'+rows+'</ul>'+
    '<h4>Interacciones por día</h4>'+(trend?'<ul>'+trend+'</ul>':'<p>Sin registros para este período.</p>')+
    '<p class="muted">Las interacciones no representan visitantes únicos.</p></section>';
}

/** Analytics is opt-in for active commercial plans only.
 * Never expose a statistics action for pending payments or residential/place cards.
 * Server-side ownership checks remain mandatory before any data is returned.
 */
export function canOfferAnalytics(a: Record<string,unknown>): boolean {
  return a.addressType==='BUSINESS' && a.status==='ACTIVE' &&
    (a.planCode==='BUSINESS_PREMIUM'||a.planCode==='BUSINESS_PREMIUM_PRO') &&
    a.workflow!=='PAYMENT_PENDING' &&
    typeof a.code==='string' && /^AD507-[A-Za-z0-9]+(?:-[0-9]+)?$/.test(a.code);
}
