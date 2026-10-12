import {test,expect} from 'bun:test';
import {inspectHistoricalCodes,inspectPublicationSources,publicationSources,PLANES_AUTHORITY} from '../scripts/integration-preflight';

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

test('source preflight only reads the owner-selected PLANES deployment, without probing legacy readers or falling back',async()=>{
  let calls=0;
  const http=(async(url:any,init:any)=>{calls++;expect(String(url)).toBe(`https://script.google.com/macros/s/${PLANES_AUTHORITY.deploymentId}/exec?action=list`);expect(init.method).toBe('GET');return Response.json({ok:true,codes:['AD507-0001']});})as typeof fetch;
  const report=await inspectPublicationSources(http);expect(calls).toBe(1);expect(report.results).toHaveLength(1);
  expect(report.references.filter(r=>r.usesOfficialAuthority).map(r=>r.path)).toEqual(['.github/workflows/generate.yml']);
  expect(report.authority).toMatchObject({name:'PLANES',reviewedVersion:44,reservationSupported:false,publicationWriteSupported:false});
  expect(report.configurationVerified).toBe(true);expect(report.allocationVerified).toBe(false);expect(report.publicationVerified).toBe(false);
  let failures=0;
  const failed=await inspectPublicationSources((async()=>{failures++;throw Error('private-error');})as typeof fetch);
  expect(failures).toBe(1);expect(failed.results[0]).toMatchObject({ok:false,error:'SOURCE_NOT_VERIFIED'});
});

test('PLANES summaries expose neither customer codes nor unknown metadata and never authorize assignment',async()=>{
  const result=await inspectPublicationSources((async()=>Response.json({ok:true,codes:
    [{codigo:' ad507-fixture ',plan:' Premium Pro ',publico:true,indexable:true},{codigo:'AD507-0002',plan:'Residencial'},{codigo:'AD507-0003',plan:'Negocio'},
     {codigo:'AD507-0004',plan:'constructor'},{codigo:'AD507-0005',plan:'private-customer-value',publico:false,indexable:true}]}))as typeof fetch);
  expect(result.results[0]).toMatchObject({plans:{premiumPro:1,residential:1,business:1,other:2},visibility:{publicAndIndexable:1,explicitlyRestricted:1,unspecified:3},noncanonical:1});
  const output=JSON.stringify(result);expect(output).not.toContain('AD507-FIXTURE');expect(output).not.toContain('private-customer-value');
  expect(result.allocationVerified).toBe(false);expect(result.publicationVerified).toBe(false);
  const invalid=await inspectPublicationSources((async()=>Response.json({ok:true,codes:['invalid']}))as typeof fetch);
  expect(invalid.results[0]).toMatchObject({invalid:1});expect(invalid.allocationVerified).toBe(false);
});

test('source audit rejects login HTML, malformed JSON, oversized responses and upstream details',async()=>{
  for(const response of [new Response('sign in'),new Response('{bad',{headers:{'content-type':'application/json'}}),Response.json({records:[]}),Response.json({ok:false,codes:[]}),new Response('x'.repeat(256001),{headers:{'content-type':'application/json'}})]){
    const result=await inspectPublicationSources((async()=>response.clone())as typeof fetch);
    expect(result.results.every(r=>!r.ok)).toBe(true);expect(result.allocationVerified).toBe(false);
  }
  const failure=await inspectPublicationSources((async()=>{throw Error('upstream-private-token');})as typeof fetch);
  expect(JSON.stringify(failure)).not.toContain('upstream-private-token');
});
