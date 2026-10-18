/** Private card presentation. Counts come only from the authorized server summary. */
export type AnalyticsSummary = {
 ok:boolean; plan:string; period_days?:number; visits?:{status?:string;total?:number};
 interactions?:Record<string,number>; daily_series?:Array<{day:string;event_type:string;total:number}>;
};
export const ANALYTICS_ACTIONS:Record<string,string>={google:'Google Maps',waze:'Waze',uber:'Uber',whatsapp:'WhatsApp',call:'Llamar',share:'Compartir',copy:'Copiar',qr:'QR',aviso:'Aviso'};
export function analyticsViewModel(summary:AnalyticsSummary){
 if(!summary?.ok)throw Error('INVALID_ANALYTICS_SUMMARY');
 if(!['free','place','premium','premium_pro'].includes(summary.plan))throw Error('UNSUPPORTED_ANALYTICS_PLAN');
 const pro=summary.plan==='premium_pro',paid=['premium','premium_pro'].includes(summary.plan);
 const counts=summary.interactions&&typeof summary.interactions==='object'&&!Array.isArray(summary.interactions)?summary.interactions:{};
 const actions=Object.entries(ANALYTICS_ACTIONS).map(([key,label])=>({key,label,count:Number.isSafeInteger(counts[key])&&counts[key]>=0?counts[key]:0}));
 const visits=summary.visits?.status==='available'&&Number.isSafeInteger(summary.visits.total)&&summary.visits.total!>=0?{available:true,total:summary.visits.total!}:{available:false,total:null};
 const daily=pro?(Array.isArray(summary.daily_series)?summary.daily_series:[]).filter(r=>r&&/^\d{4}-\d{2}-\d{2}$/.test(r.day)&&(r.event_type==='visit'||Object.hasOwn(ANALYTICS_ACTIONS,r.event_type))&&Number.isSafeInteger(r.total)&&r.total>=0):[];
 return {plan:summary.plan,pro,paid,visits,actions:paid?actions:[],daily,interactionsTotal:actions.reduce((n,a)=>n+a.count,0),interactionsAvailable:paid&&summary.interactions!=null&&Object.keys(counts).some(k=>Object.hasOwn(ANALYTICS_ACTIONS,k)&&counts[k]>0)};
}
export function renderAnalyticsSummary(summary:AnalyticsSummary):string{
 const m=analyticsViewModel(summary),number=(n:number)=>n.toLocaleString('es-PA');
 let html='<section class="analytics-summary" aria-label="Estadísticas de esta dirección"><h4>Estadísticas</h4><p class="analytics-period">Últimos '+(m.pro&&[7,30,90].includes(summary.period_days!)?summary.period_days:30)+' días · hora de Panamá</p><div class="analytics-metrics"><p>Visitas registradas<strong>'+ (m.visits.available?number(m.visits.total!):summary.visits?.status==='no_data'?'Sin datos registrados':'Datos aún no disponibles')+'</strong></p>';
 if(m.paid)html+='<p>Interacciones registradas<strong>'+(m.interactionsAvailable?number(m.interactionsTotal):'Sin datos registrados')+'</strong></p>';
 html+='</div>';
 if(m.paid){
 const icons:Record<string,string>={whatsapp:'↗',google:'⌖',waze:'➜',uber:'↗',call:'☎',share:'↗',copy:'▣',qr:'▦',aviso:'✉'};
 html+='<h5>Clics por botón</h5><ul class="analytics-actions">'+m.actions.filter(a=>['whatsapp','google','waze','uber','call'].includes(a.key)||a.count>0).map(a=>'<li><span><span aria-hidden="true">'+icons[a.key]+'</span> '+a.label+'</span><strong>'+(a.count>0?number(a.count):'Sin datos registrados')+'</strong></li>').join('')+'</ul><small>Los clics no confirman conversaciones, llamadas ni viajes realizados.</small>';
 }
 if(m.pro){
 html+='<details class="analytics-advanced"><summary>Ver estadísticas avanzadas</summary><label>Período <select data-analytics-days aria-label="Período de estadísticas">'+[7,30,90].map(days=>'<option value="'+days+'"'+((summary.period_days||30)===days?' selected':'')+'>Últimos '+days+' días</option>').join('')+'</select></label>';
 for(const visits of [true,false]){
 const days=new Map<string,number>();for(const row of m.daily)if((row.event_type==='visit')===visits)days.set(row.day,(days.get(row.day)||0)+row.total);
 const series=[...days].sort(([a],[b])=>a.localeCompare(b)),peak=Math.max(1,...series.map(([,n])=>n));
 html+='<h5>'+ (visits?'Visitas':'Interacciones')+' por día</h5>'+(series.length?'<ul class="analytics-daily-chart">'+series.map(([day,n])=>'<li><time datetime="'+day+'">'+day+'</time> <strong>'+number(n)+'</strong><div role="img" aria-label="'+(visits?'Visitas':'Interacciones')+': '+number(n)+'"><span style="width:'+Math.round(n/peak*100)+'%"></span></div></li>').join('')+'</ul>':'<p>Sin datos registrados</p>');
 }
 html+='</details>';
 }
 return html+'<small>Actividad registrada con consentimiento; no representa personas únicas.</small></section>';
}
export function canOfferAnalytics(a:Record<string,unknown>):boolean{
 return a.status==='ACTIVE'&&a.workflow!=='PAYMENT_PENDING'&&((a.addressType==='BUSINESS'&&['BUSINESS_FREE','BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO'].includes(String(a.planCode)))||(a.addressType==='PLACE'&&(a.planCode==null||a.planCode==='PLACE')))&&typeof a.code==='string'&&/^AD\d{2,3}-[A-Z0-9_-]+$/i.test(a.code);
}
