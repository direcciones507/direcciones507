import {test,expect} from 'bun:test';
import {inspectHistoricalCodes,inspectPublicationSources,publicationSources} from '../scripts/integration-preflight';

test('historical audit detects normalized collisions and never treats a highest code as a reservation',()=>{
  const report=inspectHistoricalCodes(['AD507-0001',' ad507-0001 ',{codigo:'AD507-0038'},{codigo:'AD507-FIXTURE'},null,'invalid']);
  expect(report.count).toBe(6);expect(report.duplicates).toBe(1);expect(report.invalid).toBe(2);expect(report.noncanonical).toBe(1);
  expect(report.highestNumeric).toBe(38);expect(report.allocationVerified).toBe(false);
  expect(report.registryFingerprint).toBe(inspectHistoricalCodes(['AD507-FIXTURE','AD507-0038','AD507-0001']).registryFingerprint);
});

test('preflight discovers maintained Apps Script sources without inventing a provider endpoint',()=>{
  const sources=publicationSources();expect(sources.map(s=>s.path)).toEqual(['index.html','.github/workflows/auto-sync-ad507.yml','.github/workflows/generate.yml']);
  expect(sources[0].url).toBe(sources[1].url);expect(sources[2].url).not.toBe(sources[0].url);
});

test('source preflight only reads list and distinguishes matching or divergent registries from publication',async()=>{
  let calls=0;
  const http=(async(url:any,init:any)=>{calls++;expect(String(url)).toEndWith('?action=list');expect(init.method).toBe('GET');return Response.json({codes:calls===1?['AD507-0001']:['AD507-0001','AD507-0002']});})as typeof fetch;
  const divergent=await inspectPublicationSources(http);expect(calls).toBe(2);expect(divergent.sameRegistry).toBe(false);expect(divergent.publicationVerified).toBe(false);
  expect(divergent.coverage[0]).toMatchObject({verified:true,shared:1,leftOnly:0,rightOnly:1});
  const same=await inspectPublicationSources((async()=>Response.json({codes:['AD507-0001']}))as typeof fetch);
  expect(same.sameRegistry).toBe(true);expect(same.allocationVerified).toBe(false);expect(same.publicationVerified).toBe(false);
});

test('source coverage distinguishes a public subset without claiming a filter, allocator or deployed script identity',async()=>{
  let calls=0;
  const result=await inspectPublicationSources((async()=>Response.json({codes:++calls===1?
    [{codigo:'AD507-FIXTURE',plan:' Premium Pro ',publico:true,indexable:true}]:
    [{codigo:' ad507-fixture ',plan:'Premium Pro'},{codigo:'AD507-0002',plan:'Residencial'},{codigo:'AD507-0003',plan:'Negocio'},
     {codigo:'AD507-0004',plan:'constructor'},{codigo:'AD507-0005',plan:'private-customer-value',publico:false,indexable:true}]}))as typeof fetch);
  expect(result.coverage[0]).toMatchObject({verified:true,shared:1,leftOnly:0,rightOnly:4});
  expect(result.results[0]).toMatchObject({plans:{premiumPro:1},visibility:{publicAndIndexable:1}});
  expect(result.results[1]).toMatchObject({plans:{residential:1,business:1,other:2},visibility:{explicitlyRestricted:1,unspecified:4}});
  const output=JSON.stringify(result);expect(output).not.toContain('AD507-FIXTURE');expect(output).not.toContain('private-customer-value');
  expect(result.sameRegistry).toBe(false);expect(result.allocationVerified).toBe(false);expect(result.publicationVerified).toBe(false);
  const invalid=await inspectPublicationSources((async()=>Response.json({codes:['invalid']}))as typeof fetch);
  expect(invalid.coverage[0]).toMatchObject({verified:false});
});

test('source audit rejects login HTML, malformed JSON, oversized responses and upstream details',async()=>{
  for(const response of [new Response('sign in'),new Response('{bad',{headers:{'content-type':'application/json'}}),Response.json({records:[]}),new Response('x'.repeat(256001),{headers:{'content-type':'application/json'}})]){
    const result=await inspectPublicationSources((async()=>response.clone())as typeof fetch);
    expect(result.results.every(r=>!r.ok)).toBe(true);expect(result.sameRegistry).toBe(false);
  }
  const failure=await inspectPublicationSources((async()=>{throw Error('upstream-private-token');})as typeof fetch);
  expect(JSON.stringify(failure)).not.toContain('upstream-private-token');
});
