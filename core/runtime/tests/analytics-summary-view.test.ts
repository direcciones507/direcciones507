import {test,expect} from 'bun:test';
import {analyticsViewModel} from '../analytics-summary-view';
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
