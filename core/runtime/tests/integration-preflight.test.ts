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
  const same=await inspectPublicationSources((async()=>Response.json({codes:['AD507-0001']}))as typeof fetch);
  expect(same.sameRegistry).toBe(true);expect(same.allocationVerified).toBe(false);expect(same.publicationVerified).toBe(false);
});

test('source audit rejects login HTML, malformed JSON, oversized responses and upstream details',async()=>{
  for(const response of [new Response('sign in'),new Response('{bad',{headers:{'content-type':'application/json'}}),Response.json({records:[]}),new Response('x'.repeat(256001),{headers:{'content-type':'application/json'}})]){
    const result=await inspectPublicationSources((async()=>response.clone())as typeof fetch);
    expect(result.results.every(r=>!r.ok)).toBe(true);expect(result.sameRegistry).toBe(false);
  }
  const failure=await inspectPublicationSources((async()=>{throw Error('upstream-private-token');})as typeof fetch);
  expect(JSON.stringify(failure)).not.toContain('upstream-private-token');
});
