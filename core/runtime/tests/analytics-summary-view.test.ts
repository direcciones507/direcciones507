import {test,expect} from 'bun:test';
import {analyticsViewModel,renderAnalyticsSummary,canOfferAnalytics} from '../analytics-summary-view';
import {renderPanelAddressCard} from '../panel-address-card';
import {userPanelHtml,userPanelPresentation} from '../user-panel';
import {publicAnalyticsScript} from '../public-analytics';
test('four active modalities show card statistics and preserve actions',()=>{
 for(const planCode of ['BUSINESS_FREE','PLACE','BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO']){
 const a={addressType:planCode==='PLACE'?'PLACE':'BUSINESS',status:'ACTIVE',planCode,code:'AD507-TEST',name:'Demo',source:'USER_REQUEST',id:'11111111-1111-4111-8111-111111111111',publicUrl:'https://direcciones507.com/AD507-TEST/'};
 expect(canOfferAnalytics(a)).toBe(planCode!=='BUSINESS_FREE');const html=renderPanelAddressCard(a);
 for(const text of ['Copiar código','Abrir dirección digital','Editar','Ver detalles de solicitud'])expect(html).toContain(text);
 if(planCode==='BUSINESS_FREE'){expect(html).not.toContain('Estadísticas');expect(html).not.toContain('data-analytics-code');}
 else for(const text of ['Estadísticas','data-analytics-code="AD507-TEST"'])expect(html).toContain(text);
 for(const override of [{status:'DRAFT'},{addressType:'RESIDENTIAL'},{workflow:'PAYMENT_PENDING'}])expect(canOfferAnalytics({...a,...override})).toBe(false);
 }
});
test('free and place do not expose paid insights even with injected data',()=>{
 for(const plan of ['free','place']){const html=renderAnalyticsSummary({ok:true,plan,visits:{status:'available',total:7},interactions:{google:100},daily_series:[{day:'2026-10-17',event_type:'google',total:100}]});expect(html).toContain('>7<');expect(html).not.toContain('Interacciones registradas');expect(html).not.toContain('avanzadas');}
});
test('visits and interactions are separate; total field never doubles counts',()=>{
 const m=analyticsViewModel({ok:true,plan:'premium_pro',visits:{status:'available',total:10},interactions:{google:8,waze:3,total:11,visit:10}});
 expect(m.visits.total).toBe(10);expect(m.interactionsTotal).toBe(11);
});
test('paid cards show individual buttons; pro adds real charts and periods',()=>{
 const data={ok:true,plan:'premium_pro',visits:{status:'available',total:7},interactions:{google:3,qr:1},daily_series:[{day:'2026-10-16',event_type:'visit',total:2},{day:'2026-10-17',event_type:'visit',total:5},{day:'2026-10-17',event_type:'google',total:3}]};
 const html=renderAnalyticsSummary(data);for(const text of ['<details','Clics por botón','QR','Visitas por día','Interacciones por día','width:40%','aria-label="Visitas: 5"'])expect(html).toContain(text);
 expect(renderAnalyticsSummary({...data,plan:'premium'})).not.toContain('<details');expect(renderAnalyticsSummary({...data,plan:'premium'})).toContain('>4<');
});
test('no data and unavailable do not become confirmed zeros',()=>{
 expect(renderAnalyticsSummary({ok:true,plan:'free',visits:{status:'no_data'}})).toContain('Sin datos registrados');expect(renderAnalyticsSummary({ok:true,plan:'premium'})).toContain('Datos aún no disponibles');
 const html=renderAnalyticsSummary({ok:true,plan:'premium_pro',interactions:{},daily_series:[]});expect(html).not.toContain('analytics-daily-chart');expect(html).not.toContain('>0<');expect(()=>renderAnalyticsSummary({ok:true,plan:'premium_pro',daily_series:[null] as any})).not.toThrow();
});
test('emitted panel scripts compile and public tracking requires consent',()=>{
 for(const html of [userPanelHtml,userPanelPresentation(new URL('https://direcciones.lat/panel'))])for(const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))expect(()=>new Function(script[1])).not.toThrow();
 const tracking=publicAnalyticsScript('AD507-DEMO');expect(()=>new Function(tracking)).not.toThrow();expect(tracking).toContain('c.analytics===true');expect(tracking).toContain("track('visit')");expect(tracking).not.toContain('script.google.com');
});


test('historical interaction queries exclude visits and preserve the immutable snapshot',async()=>{
 const {preserveHistoricalAnalytics}=await import('../legacy-corrections');const snapshot=await Bun.file(new URL('../legacy.snapshot.txt',import.meta.url)).text();
 const corrected=preserveHistoricalAnalytics(snapshot);expect(corrected.split("WHERE ad507_code=$1 AND event_type<>'visit'")).toHaveLength(5);
 expect(corrected.replaceAll("WHERE ad507_code=$1 AND event_type<>'visit'",'WHERE ad507_code=$1')).toBe(snapshot);
});

test('existing published places without commercial plan keep basic statistics',()=>{const a={addressType:'PLACE',status:'ACTIVE',code:'AD507-N22023161',planCode:null};expect(canOfferAnalytics(a)).toBe(true);expect(renderPanelAddressCard(a)).toContain('data-analytics-code');});

test('Premium exposes each click with its own label; Pro filters only',()=>{
 for(const plan of ['premium','premium_pro']){const html=renderAnalyticsSummary({ok:true,plan,interactions:{whatsapp:2,google:3,waze:4,uber:5,call:6,qr:7},period_days:7});for(const label of ['WhatsApp','Google Maps','Waze','Uber','Llamar','QR'])expect(html).toContain(label);for(const n of [2,3,4,5,6,7])expect(html).toContain('>'+n+'<');expect(html).toContain('no confirman conversaciones');expect(html.includes('data-analytics-days')).toBe(plan==='premium_pro');}
});
test('missing button records never appear as confirmed zero',()=>{const html=renderAnalyticsSummary({ok:true,plan:'premium',interactions:{google:2}});expect(html).toContain('WhatsApp');expect(html).toContain('Sin datos registrados');expect(html).not.toContain('>0<');});
