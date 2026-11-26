import {test,expect} from 'bun:test';
import {freshProperties,mapFeatures,priorityFeatures,featuredGroups,searchContext} from '../radar/ui/ui-model.js';
import {createRadarCampaignLookup} from '../radar/campaign-repository';
const now=2e6;
const feature=(properties:any,id='a')=>({id,properties:freshProperties(properties,now)});
test('normal pins remain visible with clustering; priorities stay visible with no six-pin cap',()=>{
 const rows=Array.from({length:12},(_,i)=>feature({featuredUntil:now+1000},String(i)));
 rows.push(feature({activity:'available',reportedAt:now-1},'normal'));
 expect(mapFeatures(rows,12.2,12.8).length).toBe(13);
 expect(mapFeatures(rows,12.8,12.8).length).toBe(13);
 expect(mapFeatures(rows,12.1,12.8).length).toBe(13);
 expect(priorityFeatures(rows).some(f=>f.id==='normal')).toBe(false);
});
test('live expires back to featured, then normal regardless of owner availability',()=>{
 const p={liveUntil:now+1000,featuredUntil:now+2000,activity:'available',source:'verified_owner',reportedAt:now-1,details:{quantity:10,unit:'tables'}};
 expect(freshProperties(p,now).pin).toBe('live');
 expect(freshProperties(p,now+1000).pin).toBe('featured');
 expect(freshProperties(p,now+2000).pin).toBe('normal');
 expect(freshProperties({...p,liveUntil:null,featuredUntil:null},now).pin).toBe('normal');
 expect(freshProperties({pin:'live',activity:'available',reportedAt:now-1},now).pin).toBe('normal');
});
test('featured category rows never include normal or live-only entries',()=>{
 const groups=featuredGroups([feature({category:'cafe',featuredUntil:now+1}),feature({category:'hotel'}),feature({category:'restaurant',liveUntil:now+1})]);
 expect([...groups.keys()]).toEqual(['cafe']);expect(featuredGroups([]).size).toBe(0);
});
test('search preserves known territorial movement and translates category without inventing locations',()=>{
 expect(searchContext('Café en Santiago','PA')).toEqual({query:'cafe',view:expect.objectContaining({name:'Santiago'})});
 expect(searchContext('Restaurante Manolo','PA')).toEqual({query:'Restaurante Manolo',view:null});
});
test('overlapping approved campaigns preserve independent live and featured deadlines',async()=>{
 const lookup=createRadarCampaignLookup({unsafe:async()=>[
 {id:'a',kind:'live',starts_at:new Date(now-1),ends_at:new Date(now+1000)},
 {id:'a',kind:'featured',starts_at:new Date(now-1),ends_at:new Date(now+2000)}
 ]},true);
 const p=(await lookup(['a'],now)).get('a')!;
 expect(p.kind).toBe('live');expect(p.featuredUntil).toBe(now+2000);
});

test('commercial map preserves corporate pins and applies zoom, order and expiry in isolation',()=>{
 const now=Date.now();
 const feature=(id:string,fields:Record<string,unknown>={})=>({id,properties:freshProperties({commercialModel:true,...fields},now)});
 const rows=[feature('basic'),feature('annual',{annualUntil:now+60000}),feature('featured',{featuredUntil:now+60000}),feature('live',{liveUntil:now+60000}),feature('corporate',{corporate:true})];
 expect(mapFeatures(rows,9,13).map(f=>f.id)).toEqual(['live','corporate']);
 expect(mapFeatures(rows,10,13).map(f=>f.id)).toEqual(['featured','live','corporate']);
 expect(mapFeatures(rows,13,13)).toHaveLength(5);
 expect(priorityFeatures(rows).map(f=>f.id)).toEqual(['live','featured','annual']);
 expect(freshProperties({commercialModel:true,liveUntil:now,annualUntil:now,registrationProfile:{description:'private'},details:{quantity:1}},now)).not.toHaveProperty('registrationProfile');
});
