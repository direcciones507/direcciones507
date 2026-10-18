import {test,expect} from 'bun:test';
import {analyticsViewModel,renderAnalyticsSummary,canOfferAnalytics} from '../analytics-summary-view';
import {renderPanelAddressCard} from '../panel-address-card';
import {userPanelHtml,userPanelPresentation} from '../user-panel';
import {publicAnalyticsScript} from '../public-analytics';
test('four active modalities show card statistics and preserve actions',()=>{
 for(const planCode of ['BUSINESS_FREE','PLACE','BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO']){
 const a={addressType:planCode==='PLACE'?'PLACE':'BUSINESS',status:'ACTIVE',planCode,code:'AD507-TEST',name:'Demo',source:'USER_REQUEST',id:'11111111-1111-4111-8111-111111111111',publicUrl:'https://direcciones507.com/AD507-TEST/'};
 expect(canOfferAnalytics(a)).toBe(true);const html=renderPanelAddressCard(a);
 for(const text of ['Estadísticas','data-analytics-code="AD507-TEST"','Copiar código','Abrir dirección digital','Editar','Ver detalles de solicitud'])expect(html).toContain(text);
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
test('premium gets totals, pro gets types and separate real charts',()=>{
 const data={ok:true,plan:'premium_pro',visits:{status:'available',total:7},interactions:{google:3,qr:1},daily_series:[{day:'2026-10-16',event_type:'visit',total:2},{day:'2026-10-17',event_type:'visit',total:5},{day:'2026-10-17',event_type:'google',total:3}]};
 const html=renderAnalyticsSummary(data);for(const text of ['<details','Acciones por tipo','QR','Visitas por día','Interacciones por día','width:40%','aria-label="Visitas: 5"'])expect(html).toContain(text);
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
