import {test} from 'bun:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createGeneralAuth} from '../general-auth';
const origin='https://direcciones.lat',email='isolated@example.invalid',uid='00000000-0000-4000-8000-000000000001';
const env={AD507_GOOGLE_CLIENT_ID:'existing',AD507_GOOGLE_CLIENT_SECRET:'isolated',AD507_SESSION_SECRET:'s'.repeat(64),AD507_GOOGLE_REDIRECT_URI:origin+'/auth/google/callback',AD507_AUTH_SUCCESS_URL:'/panel',AD507_PUBLIC_BASE_URL:origin,RADAR_ENABLED:'true',AD507_RADAR_DOMAIN_VERIFIED:'true',RESEND_API_KEY:'isolated',EMAIL_FROM:'test@example.invalid'};
function setup(){
 const tokens=new Map<string,string>(),messages:any[]=[],revoked:any[]=[];
 const db:any={unsafe:async(q:string,p:any[]=[])=>{
  if(q.startsWith('INSERT INTO ad507.email_auth_tokens')){tokens.set(p[0],p[2]);return [];}
  if(q.startsWith('UPDATE ad507.email_auth_tokens')&&q.includes('RETURNING')){if(p[0]!==email||tokens.get(p[1])!==p[2])return [];tokens.delete(p[1]);return [{id:uid}];}
  if(q.startsWith('SELECT u.id::text'))return [{id:uid}];
  if(q.startsWith('SELECT user_id FROM ad507.email_credentials'))return [{user_id:uid}];
  if(q.startsWith('SELECT pg_advisory_xact_lock'))return [];
  if(q.startsWith('UPDATE ad507.auth_sessions')){revoked.push(p[0]);return [];}
  if(q.startsWith('UPDATE ad507.email_auth_tokens')||q.startsWith('UPDATE ad507.email_credentials'))return [];
  throw Error('Unexpected query '+q);
 }};db.begin=(fn:any)=>fn(db);
 const sender=(async(_url:any,options:any)=>{messages.push(JSON.parse(options.body));return Response.json({id:'isolated'});}) as typeof fetch;
 const auth=createGeneralAuth(db,env,fetch,sender);
 const post=(path:string,body:any,cookie='')=>auth.handle(new Request(origin+path,{method:'POST',headers:{origin,'content-type':'application/json',cookie},body:JSON.stringify(body)}));
 return {auth,post,messages,tokens,revoked};
}
async function resetLink(s:ReturnType<typeof setup>,radar=true){
 const intent=await s.auth.handle(new Request(origin+'/auth/radar'));
 const cookie=radar?intent!.headers.getSetCookie()[0].split(';')[0]:'';
 await s.post('/v1/auth/email/forgot',{email},cookie);return new URL(s.messages[0].text);
}
test('existing reset email preserves signed Radar intent after original cookie is gone',async()=>{
 const s=setup(),link=await resetLink(s);assert.equal(link.origin,origin);assert.equal(link.pathname,'/recuperar-contrasena');assert.match(link.searchParams.get('radar')!,/^[A-Za-z0-9_-]{43}$/);
 const r=await s.post('/v1/auth/email/reset',{email,password:'synthetic-password-123',token:link.searchParams.get('token'),radarReturn:link.searchParams.get('radar')});
 assert.equal(r!.status,200);assert.ok(r!.headers.getSetCookie().some(v=>v.startsWith('__Host-ad507_radar_return=')&&v.includes('HttpOnly')&&v.includes('Secure')));assert.equal(s.revoked.length,1);
 assert.ok(!r!.headers.getSetCookie().some(v=>v.includes('radar_session=')));
});
test('tampered context, wrong purpose and replay cannot grant Radar return',async()=>{
 for(const mode of ['tampered','purpose','replay']){
  const s=setup(),link=await resetLink(s),token=link.searchParams.get('token')!,proof=link.searchParams.get('radar')!;
  if(mode==='purpose')s.tokens.set(createHash('sha256').update(token).digest('hex'),'VERIFY_EMAIL');
  const path=mode==='purpose'?'/v1/auth/email/verify':'/v1/auth/email/reset';
  const body={email,password:'synthetic-password-123',token,radarReturn:mode==='tampered'?(proof[0]==='a'?'b':'a')+proof.slice(1):proof};
  if(mode==='replay')await s.post(path,body);
  const r=await s.post(path,body);assert.equal(r!.headers.getSetCookie().length,0);if(mode==='replay')assert.equal(r!.status,400);
 }
});
test('ordinary LATAM recovery emails keep their original link without Radar context',async()=>{
 const s=setup(),link=await resetLink(s,false);assert.equal(link.searchParams.has('radar'),false);
});

test('verification email renews only the fixed Radar intent after validating its original token',async()=>{
 const s=setup(),intent=await s.auth.handle(new Request(origin+'/auth/radar'));
 await s.post('/v1/auth/email/register',{email,password:'synthetic-password-123'},intent!.headers.getSetCookie()[0].split(';')[0]);
 const link=new URL(s.messages[0].text);assert.equal(link.pathname,'/verificar-correo');
 const body={email,token:link.searchParams.get('token'),radarReturn:link.searchParams.get('radar')};
 const r=await s.post('/v1/auth/email/verify',body);assert.equal(r!.status,200);assert.ok(r!.headers.getSetCookie().some(v=>v.startsWith('__Host-ad507_radar_return=')));assert.equal(s.revoked.length,0);
 const replay=await s.post('/v1/auth/email/verify',body);assert.equal(replay!.status,400);assert.equal(replay!.headers.getSetCookie().length,0);
});
test('signed email context cannot replace an invalid or expired email token',async()=>{
 const s=setup(),link=await resetLink(s);s.tokens.clear();
 const r=await s.post('/v1/auth/email/reset',{email,password:'synthetic-password-123',token:link.searchParams.get('token'),radarReturn:link.searchParams.get('radar')});
 assert.equal(r!.status,400);assert.equal(r!.headers.getSetCookie().length,0);
});
