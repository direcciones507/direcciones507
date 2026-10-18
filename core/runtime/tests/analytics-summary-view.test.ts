import {test,expect} from 'bun:test';
import {analyticsViewModel,renderAnalyticsSummary,canOfferAnalytics} from '../analytics-summary-view';
test('never presents interaction counts as visitor totals',()=>{
 const m=analyticsViewModel({ok:true,plan:'premium_pro',visits:{status:'not_available'},interactions:{google:8,waze:3,total:11}});
 expect(m.visits).toEqual({available:false,total:null});
 expect(m.interactionsTotal).toBe(11);
 expect(m.actions.find(a=>a.key==='google')?.count).toBe(8);
});
test('basic plans cannot receive advanced daily series from presentation',()=>{
 const m=analyticsViewModel({ok:true,plan:'premium',interactions:{google:2},daily_series:[{day:'2026-10-17',event_type:'google',total:2}]});
 expect(m.pro).toBe(false);expect(m.daily).toEqual([]);expect(m.actions).toEqual([]);
});
test('advanced series ignores unsupported events and invalid totals',()=>{
 const m=analyticsViewModel({ok:true,plan:'premium_pro',daily_series:[{day:'2026-10-17',event_type:'google',total:4},{day:'2026-10-17',event_type:'view',total:100}]});
 expect(m.daily).toHaveLength(1);
});

test('statistics HTML explicitly distinguishes visits and interactions',()=>{
 const html=renderAnalyticsSummary({ok:true,plan:'premium_pro',visits:{status:'not_available'},interactions:{google:3},daily_series:[{day:'2026-10-17',event_type:'google',total:3}]});
 expect(html).toContain('Visitas:</strong> Aún no disponible');
 expect(html).toContain('Interacciones registradas:</strong> 3');
 expect(html).toContain('Las interacciones no representan visitantes únicos');
 expect(html).toContain('datetime="2026-10-17"');
});
test('premium does not render premium pro action breakdown',()=>{
 const html=renderAnalyticsSummary({ok:true,plan:'premium',interactions:{google:3}});
 expect(html).not.toContain('Acciones por tipo');
});

test('analytics eligibility respects free business entitlement and payment gate',()=>{
 const active={addressType:'BUSINESS',status:'ACTIVE',planCode:'BUSINESS_FREE',code:'AD507-0001'};
 expect(canOfferAnalytics(active)).toBe(true);
 expect(canOfferAnalytics({...active,planCode:'BUSINESS_PREMIUM_PRO'})).toBe(true);
 expect(canOfferAnalytics({...active,workflow:'PAYMENT_PENDING'})).toBe(false);
 expect(canOfferAnalytics({...active,addressType:'RESIDENTIAL'})).toBe(false);
 expect(canOfferAnalytics({...active,status:'DRAFT'})).toBe(false);
 expect(canOfferAnalytics({...active,planCode:'PLACE'})).toBe(false);
});

test('missing or malformed daily data cannot break the statistics presentation',()=>{
 const malformed={ok:true,plan:'premium_pro',interactions:null,daily_series:[null,{day:'bad',event_type:'google',total:1}]};
 expect(()=>renderAnalyticsSummary(malformed as any)).not.toThrow();
 expect(renderAnalyticsSummary(malformed as any)).toContain('Sin registros para este período');
 expect(()=>renderAnalyticsSummary({ok:true,plan:'premium_pro',daily_series:{} as any})).not.toThrow();
});

test('premium pro includes supported contact and QR interactions',()=>{
 const m=analyticsViewModel({ok:true,plan:'premium_pro',interactions:{whatsapp:4,call:2,qr:1}});
 expect(m.actions.find(a=>a.key==='whatsapp')?.count).toBe(4);
 expect(m.actions.find(a=>a.key==='call')?.count).toBe(2);
 expect(m.actions.find(a=>a.key==='qr')?.count).toBe(1);
 expect(m.interactionsTotal).toBe(7);
});
test('unavailable interaction data is not misrepresented as zero',()=>{
 const html=renderAnalyticsSummary({ok:true,plan:'premium',visits:{status:'not_available'}});
 expect(html).toContain('Interacciones registradas:</strong> Aún no disponible');
});
