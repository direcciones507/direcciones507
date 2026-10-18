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
  google:'Google Maps',waze:'Waze',uber:'Uber',whatsapp:'WhatsApp',call:'Llamar',share:'Compartir',copy:'Copiar',qr:'QR',aviso:'Aviso'
};
export function analyticsViewModel(summary: AnalyticsSummary) {
  if (!summary?.ok) throw new Error('INVALID_ANALYTICS_SUMMARY');
  const pro=summary.plan==='premium_pro';
  if(!['premium','premium_pro','free'].includes(summary.plan)) throw new Error('UNSUPPORTED_ANALYTICS_PLAN');
  const counts=summary.interactions && typeof summary.interactions==='object' && !Array.isArray(summary.interactions) ? summary.interactions : {};
  const actions=Object.entries(ACTIONS).map(([key,label])=>({
    key,label,count:Number.isSafeInteger(counts[key])&&counts[key]>=0?counts[key]:0
  }));
  const visits=summary.visits?.status==='available'&&Number.isSafeInteger(summary.visits.total)&&summary.visits.total!>=0
    ? {available:true,total:summary.visits.total!}
    : {available:false,total:null};
  const days=pro?(Array.isArray(summary.daily_series)?summary.daily_series:[]).filter(row=>row && typeof row.day==='string' && /^\d{4}-\d{2}-\d{2}$/.test(row.day)
    &&Object.hasOwn(ACTIONS,row.event_type)&&Number.isSafeInteger(row.total)&&row.total>=0):[];
  return {plan:summary.plan,pro,visits,actions:pro?actions:[],daily:days,
    interactionsTotal:actions.reduce((sum,row)=>sum+row.count,0),
    interactionsAvailable:summary.interactions!=null && typeof summary.interactions==='object' && !Array.isArray(summary.interactions)};
}

/** Safe HTML for a private statistics section, only from validated view-model values. */
export function renderAnalyticsSummary(summary: AnalyticsSummary): string {
  const m=analyticsViewModel(summary);
  const number=(n:number)=>n.toLocaleString('es-PA');
  const visits=m.visits.available?number(m.visits.total!):'Aún no disponible';
  const head='<section class="analytics-summary" aria-label="Estadísticas de mi dirección"><h3>Estadísticas</h3>'+
    '<p><strong>Visitas:</strong> '+visits+'</p>'+
    '<p><strong>Interacciones registradas:</strong> '+(m.interactionsAvailable?number(m.interactionsTotal):'Aún no disponible')+'</p>';
  if(!m.pro)return head+'</section>';
  const rows=m.actions.map(a=>'<li><span>'+a.label+'</span>: <strong>'+number(a.count)+'</strong></li>').join('');
  const daily=new Map<string,number>();
  for(const row of m.daily)daily.set(row.day,(daily.get(row.day)??0)+row.total);
  const series=[...daily.entries()].sort(([a],[b])=>a.localeCompare(b));
  const peak=Math.max(1,...series.map(([,total])=>total));
  const trend=series.map(([day,total])=>{
    const width=Math.round(total/peak*100);
    return '<li><time datetime="'+day+'">'+day+'</time>: <strong>'+number(total)+'</strong>'+
      '<div role="img" aria-label="Interacciones: '+number(total)+'" style="background:#e8eef6;border-radius:6px;overflow:hidden;height:12px">'+
      '<span aria-hidden="true" style="display:block;background:#1769aa;height:100%;width:'+width+'%"></span></div></li>';
  }).join('');
  return head+'<h4>Acciones por tipo</h4><ul>'+rows+'</ul>'+
    '<h4>Interacciones por día</h4>'+(trend?'<ul class="analytics-daily-chart">'+trend+'</ul>':'<p>Sin registros para este período.</p>')+
    '<p class="muted">Las interacciones no representan visitantes únicos.</p></section>';
}

/** Analytics is available to active commercial plans according to their entitlements.
 * Never expose a statistics action for pending payments or residential/place cards.
 * Server-side ownership checks remain mandatory before any data is returned.
 */
export function canOfferAnalytics(a: Record<string,unknown>): boolean {
  return a.addressType==='BUSINESS' && a.status==='ACTIVE' &&
    ['BUSINESS_FREE','BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO'].includes(String(a.planCode)) &&
    a.workflow!=='PAYMENT_PENDING' &&
    typeof a.code==='string' && /^AD507-[A-Za-z0-9]+(?:-[0-9]+)?$/.test(a.code);
}
