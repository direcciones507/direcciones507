import {test,expect} from 'bun:test';
import {archiveUnprocessedRequest} from '../request-archive';
import {handleRequestRoutes} from '../request-routes';
import {adminAddressPage} from '../admin-address-pagination';
import {renderPanelAddressCard} from '../panel-address-card';
import {requestClientScript} from '../request-client-ui';

const owner='11111111-1111-4111-8111-111111111111';
const requestId='22222222-2222-4222-8222-222222222222';
const draft={id:requestId,source:'USER_REQUEST',status:'DRAFT',code:null,publication_receipt:null,review_decision:null,request_data:{workflow:'PAYMENT_PENDING'}};
function fakeSql(row:any=draft,orders:any[]=[]){
 const calls:{query:string;args:any[]}[]=[];
 const tx={json:(value:any)=>JSON.stringify(value),unsafe:async(query:string,args:any[]=[])=>{
   calls.push({query,args});
   if(query.includes('FROM ad507.addresses a JOIN ad507.address_ownership o'))return row?[row]:[];
   if(query.includes('FROM ad507.orders'))return orders;
   return [];
 }};
 return {sql:{begin:async(fn:any)=>fn(tx)} as any,calls};
}

test('owner can withdraw pending-payment requests without orders and retain a tombstone plus audit',async()=>{
 const {sql,calls}=fakeSql();
 expect(await archiveUnprocessedRequest(sql,owner,requestId)).toEqual({id:requestId,status:'ARCHIVED',wasPublished:false});
 const rejected=fakeSql({...draft,status:'PENDING_REVIEW',review_decision:'REJECTED'});
 expect(await archiveUnprocessedRequest(rejected.sql,owner,requestId)).toEqual({id:requestId,status:'ARCHIVED',wasPublished:false});
 expect(calls[0].query).toContain("o.ownership_role='OWNER'");
 expect(calls[0].query).toContain("u.status='ACTIVE'");
 expect(calls[0].query).toContain('FOR UPDATE OF a');
 expect(calls[0].args).toEqual([requestId,owner]);
 expect(calls.some(x=>x.query.includes("status='ARCHIVED'"))).toBe(true);
 expect(calls.some(x=>x.query.includes('request_payload_hash=NULL'))).toBe(true);
 expect(calls.some(x=>x.query.includes('request_key_hash=CASE WHEN code IS NULL THEN request_key_hash ELSE NULL END'))).toBe(true);
 expect(calls.every(x=>!x.query.includes("request_key_hash=NULL"))).toBe(true);
 expect(calls.some(x=>x.query.includes('OWNER_ADDRESS_RETIRED'))).toBe(true);
});

test('owner can retire paid and published Core records without deleting orders or code',async()=>{
  for(const [row,orders,published] of [
    [draft,[{status:'PENDING'}],false],
    [draft,[{status:'PAID'}],false],
    [{...draft,status:'ACTIVE',code:'AD507-PUBLISHED',publication_receipt:'proof',review_decision:'APPROVED'},[{status:'PAID'}],true],
    [{...draft,status:'PENDING_REVIEW',review_decision:'APPROVED'},[],false]
  ] as const){
    const {sql,calls}=fakeSql(row,orders as any[]);
    expect(await archiveUnprocessedRequest(sql,owner,requestId)).toEqual({id:requestId,status:'ARCHIVED',wasPublished:published});
    expect(calls.some(x=>x.query.includes("status='ARCHIVED'"))).toBe(true);
    expect(calls.every(x=>!x.query.startsWith('DELETE '))).toBe(true);
    expect(calls.some(x=>x.query.includes('OWNER_ADDRESS_RETIRED'))).toBe(true);
  }
});

test('owner-only authorization, archived status, and historical migrations block retirement',async()=>{
  for(const [row,error] of [
    [null,'REQUEST_NOT_FOUND'],
    [{...draft,status:'ARCHIVED'},'INVALID_STATE_TRANSITION'],
    [{...draft,request_data:{migration:{id:'legacy'}}},'INVALID_STATE_TRANSITION']
  ] as const){
    const {sql,calls}=fakeSql(row);
    await expect(archiveUnprocessedRequest(sql,owner,requestId)).rejects.toThrow(error);
    expect(calls.some(x=>x.query.includes('UPDATE ad507.addresses'))).toBe(false);
  }
  await expect(archiveUnprocessedRequest(fakeSql().sql,'invalid-user',requestId)).rejects.toThrow('REQUEST_NOT_FOUND');
});

test('customer archive route enforces origin, role, login, workflow feature and method',async()=>{
 const url='https://direcciones.lat/v1/user/requests/'+requestId+'/archive';
 function context(roles=['CLIENT'],enabled=true,authenticated=true){
  const db=fakeSql();
  return {db,ctx:{enabled,sql:db.sql,auth:{currentUser:async()=>authenticated?{id:owner,roles}:null},repository:null,r2:null} as any};
 }
 const {db,ctx}=context();
 const ok=await handleRequestRoutes(new Request(url,{method:'POST',headers:{origin:'https://direcciones.lat'}}),ctx);
 expect(ok?.status).toBe(200);expect((await ok?.json()).request.status).toBe('ARCHIVED');
 expect(db.calls.some(x=>x.query.includes("status='ARCHIVED'"))).toBe(true);
 for(const [req,setup,status] of [
  [new Request(url,{method:'GET'}),context(),405],
  [new Request(url,{method:'POST',headers:{origin:'https://evil.example'}}),context(),403],
  [new Request(url,{method:'POST',headers:{origin:'https://direcciones.lat'}}),context(['OPERATOR']),403],
  [new Request(url,{method:'POST',headers:{origin:'https://direcciones.lat'}}),context(['CLIENT'],true,false),401],
  [new Request(url,{method:'POST',headers:{origin:'https://direcciones.lat'}}),context(['CLIENT'],false),503]
 ] as const){
  const response=await handleRequestRoutes(req,setup.ctx);
  expect(response?.status).toBe(status);
  expect(setup.db.calls).toHaveLength(0);
 }
});

test('account exposes Eliminar only with server-granted eligibility',async()=>{
 const own={id:requestId,source:'USER_REQUEST',status:'DRAFT',code:null,name:'Mi prueba',addressType:'BUSINESS',canArchive:true};
 expect(renderPanelAddressCard(own)).toContain('data-archive-request="'+requestId+'"');
 expect(renderPanelAddressCard({...own,canArchive:false})).not.toContain('data-archive-request');
 expect(renderPanelAddressCard({...own,status:'ACTIVE',canArchive:true})).toContain('data-archive-request');
 expect(renderPanelAddressCard({...own,status:'ACTIVE',canArchive:true})).toContain('Eliminar dirección');
 expect(renderPanelAddressCard({...own,source:'SYSTEM',canArchive:false})).not.toContain('data-archive-request');
 expect(()=>new Function(requestClientScript)).not.toThrow();
 const requests:string[]=[];
 await adminAddressPage({unsafe:async(q:string)=>{requests.push(q);return []}} as any,new URLSearchParams(),'addresses',owner);
 expect(requests[0]).toContain('AS "canArchive"');
 expect(requests[0]).toContain("a.status<>'ARCHIVED'");
 expect(requests[0]).toContain("ownership_role='OWNER'");
 expect(requests[0]).toContain("to_jsonb(a)->'request_data'->'migration' IS NULL");
});
