import {test,expect} from 'bun:test';
import {scryptSync} from 'node:crypto';
import {createGeneralAuth} from '../general-auth';
const main='https://direcciones507.com',latam='https://direcciones.lat',radar='https://radar.direcciones.lat';
const env={AD507_GOOGLE_CLIENT_ID:'existing-client',AD507_GOOGLE_CLIENT_SECRET:'test-secret',AD507_SESSION_SECRET:'s'.repeat(64),AD507_GOOGLE_REDIRECT_URI:main+'/auth/google/callback',AD507_AUTH_SUCCESS_URL:'/panel',AD507_PUBLIC_BASE_URL:main,AD507_INTERNATIONAL_DOMAIN_VERIFIED:'true',AD507_GOOGLE_REDIRECT_URI_LATAM:latam+'/auth/google/callback',AD507_AUTH_SUCCESS_URL_LATAM:'/panel',RADAR_ENABLED:'true',AD507_RADAR_DOMAIN_VERIFIED:'true'};
const user={id:'00000000-0000-4000-8000-000000000001',email:'radar.test@gmail.com',display_name:'Test',roles:['CLIENT'],status:'ACTIVE'};
const password='test-only-password-123',salt=Buffer.alloc(16,1),password_hash='scrypt:'+salt.toString('hex')+':'+scryptSync(password,salt,64).toString('hex');
function setup(overrides={}){
 const sessions=new Map<string,{revoked:boolean}>(),states=new Map<string,{binding:string;verifier:string;used:boolean}>();
 const db:any={unsafe:async(q:string,p:any[]=[])=>{
  if(q.startsWith('INSERT INTO ad507.oauth_transactions')){states.set(p[0],{binding:p[1],verifier:p[2],used:false});return [];}
  if(q.startsWith('UPDATE ad507.oauth_transactions')){const row=states.get(p[0]);if(!row||row.used||row.binding!==p[1])return [];row.used=true;return [{verifier:row.verifier}];}
  if(q.startsWith('INSERT INTO ad507.auth_sessions')){sessions.set(p[0],{revoked:false});return [];}
  if(q.startsWith('UPDATE ad507.auth_sessions')){const row=sessions.get(p[0]);if(row)row.revoked=true;return [];}
  if(q.includes('FROM ad507.auth_sessions s'))return sessions.has(p[0])&&!sessions.get(p[0])!.revoked&&p[1]===user.id?[user]:[];
  if(q.includes('FROM ad507.users u JOIN ad507.email_credentials'))return p[0]===user.email?[{...user,password_hash,email_verified_at:new Date(),failed_attempts:0,locked_until:null}]:[];
  if(q.includes('FROM ad507.google_identities'))return [user];
  if(q.includes('UPDATE ad507.email_credentials')||q.includes('pg_advisory_xact_lock'))return [];
  throw Error('Unexpected authentication SQL: '+q);
 }};db.begin=(fn:any)=>fn(db);
 const provider=async(input:any,init:any)=>{if(String(input).includes('/token')){expect(new URLSearchParams(init.body).get('redirect_uri')).toBe(latam+'/auth/google/callback');return Response.json({access_token:'provider-test-token'});}return Response.json({sub:'existing-google-user',email:user.email,email_verified:true});};
 return {auth:createGeneralAuth(db,{...env,...overrides},provider as typeof fetch),sessions,states};
}
const request=(path:string,cookies='',body?:any,origin=latam)=>new Request(origin+path,{method:body?'POST':'GET',headers:{origin,cookie:cookies,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
function cookies(response:Response){return response.headers.getSetCookie().filter(v=>!v.includes('Max-Age=0')).map(v=>v.split(';')[0]).join('; ');}
function named(response:Response,name:string){return response.headers.getSetCookie().find(v=>v.startsWith(name+'='))!;}
async function intent(auth:ReturnType<typeof createGeneralAuth>){const result=(await auth.handle(request('/auth/radar')))!;expect(result.headers.get('location')).toBe(latam+'/commercial/international?access=1&radar=1');return cookies(result);}
test('Radar redirects to the existing LATAM access and never starts another OAuth',async()=>{
 const {auth}=setup();const result=(await auth.handle(request('/auth/google/login','',undefined,radar)))!;
 expect(result.status).toBe(302);expect(result.headers.get('location')).toBe(latam+'/auth/radar');expect(result.headers.has('set-cookie')).toBe(false);
 expect((await auth.handle(request('/auth/google/callback?code=x&state=y','',undefined,radar)))!.status).toBe(404);
});
test('email login shares the canonical session, returns only to Radar, and revokes it on logout',async()=>{
 const {auth}=setup();const marker=await intent(auth);
 const login=(await auth.handle(request('/v1/auth/email/login',marker,{email:user.email,password})))!;
 expect(login.status).toBe(200);expect((await login.json()).redirect).toBe(radar+'/');
 const shared=named(login,'__Secure-ad507_radar_session');expect(shared).toContain('HttpOnly');expect(shared).toContain('Secure');expect(shared).toContain('Domain=direcciones.lat');
 const session=shared.split(';')[0];expect((await auth.currentUser(request('/v1/auth/me',session,undefined,radar)))?.id).toBe(user.id);
 expect(await auth.currentUser(request('/v1/auth/me',session,undefined,main))).toBeNull();
 expect((await auth.handle(request('/auth/logout',session,{},radar)))!.status).toBe(204);
 expect(await auth.currentUser(request('/v1/auth/me',session,undefined,radar))).toBeNull();
});
test('an already authenticated LATAM account returns without another login or account',async()=>{
 const {auth,sessions}=setup();const login=(await auth.handle(request('/v1/auth/email/login','',{email:user.email,password})))!;
 expect((await login.clone().json()).redirect).toBeUndefined();expect(named(login,'__Secure-ad507_radar_session')).toBeUndefined();
 const result=(await auth.handle(request('/auth/radar',cookies(login))))!;
 expect(result.headers.get('location')).toBe(radar+'/');expect(sessions.size).toBe(1);
 expect(await auth.currentUser(request('/v1/auth/me',cookies(result),undefined,radar))).not.toBeNull();
});
test('valid Radar session bridges to LATAM panel without another Google login or account',async()=>{
 const {auth,sessions}=setup();
 const existing=(await auth.handle(request('/v1/auth/email/login','',{email:user.email,password})))!;
 const handoff=(await auth.handle(request('/auth/radar',cookies(existing))))!;
 const radarCookie=named(handoff,'__Secure-ad507_radar_session').split(';')[0];
 const requested=(await auth.handle(request('/auth/radar?panel=1',radarCookie)))!;
 expect(requested.status).toBe(302);
 expect(requested.headers.get('location')).toBe(latam+'/panel#radarAccountSection');
 const canonical=named(requested,'ad507_session');
 expect(canonical).toContain('HttpOnly');expect(canonical).toContain('Secure');
 expect(canonical).not.toContain('Domain=');
 expect((await auth.currentUser(request('/v1/auth/me',canonical.split(';')[0])))?.id).toBe(user.id);
 expect(sessions.size).toBe(1);
 const resume=(await auth.handle(request('/auth/radar',radarCookie)))!;
 expect(resume.headers.get('location')).toBe(radar+'/');
});
test('Radar panel handoff refuses arbitrary redirect and invalid Radar identity',async()=>{
 const {auth}=setup();
 for(const path of ['/auth/radar?panel=0','/auth/radar?panel=1&returnTo=https://evil.example','/auth/radar?returnTo=https://evil.example']){
  const denied=(await auth.handle(request(path)))!;expect(denied.status).toBe(400);expect(denied.headers.has('location')).toBe(false);
 }
 const guest=(await auth.handle(request('/auth/radar?panel=1','__Secure-ad507_radar_session=invalid')))!
 expect(guest.status).toBe(302);
 expect(guest.headers.get('location')).toBe(latam+'/commercial/international?access=1&radar=1');
 expect(guest.headers.getSetCookie().some(v=>v.startsWith('ad507_session='))).toBe(false);
});
test('Google uses the existing LATAM callback and restores Radar with no tokens in the return URL',async()=>{
 const {auth}=setup();const marker=await intent(auth);
 const start=(await auth.handle(request('/auth/google/login?country=PA',marker)))!;const target=new URL(start.headers.get('location')!);
 expect(target.searchParams.get('redirect_uri')).toBe(env.AD507_GOOGLE_REDIRECT_URI_LATAM);expect(target.searchParams.get('client_id')).toBe(env.AD507_GOOGLE_CLIENT_ID);
 const callback='/auth/google/callback?code=test-code&state='+target.searchParams.get('state');
 const jar=marker+'; '+cookies(start);const finish=(await auth.handle(request(callback,jar)))!;
 expect(finish.status).toBe(302);expect(finish.headers.get('location')).toBe(radar+'/');
 expect(await auth.currentUser(request('/v1/auth/me',cookies(finish),undefined,radar))).not.toBeNull();
 expect((await auth.handle(request(callback,jar)))!.status).toBe(400);
});
test('Google Radar return survives expiry of entry cookie while retaining one-use OAuth state',async()=>{
 const {auth}=setup();
 const start=(await auth.handle(request('/auth/google/login?radar=1')))!;
 expect(start.status).toBe(302);
 const state=new URL(start.headers.get('location')!).searchParams.get('state');
 const callback='/auth/google/callback?code=test-code&state='+state;
 // Only Google's state/binding cookies remain; the Radar entry cookie is no longer present.
 const finish=(await auth.handle(request(callback,cookies(start))))!;
 expect(finish.status).toBe(302);expect(finish.headers.get('location')).toBe(radar+'/');
 expect(named(finish,'__Secure-ad507_radar_session')).toContain('Domain=direcciones.lat');
 expect((await auth.handle(request(callback,cookies(start))))!.status).toBe(400);
 expect((await auth.handle(request('/auth/google/login?radar=1&country=PA')))!.status).toBe(400);
 expect((await auth.handle(request('/auth/google/login?returnTo=https://evil.example')))!.status).toBe(400);
});
test('return cannot be changed, tampered with, or detached from the OAuth transaction',async()=>{
 const {auth}=setup();expect((await auth.handle(request('/auth/radar?returnTo=https://evil.example')))!.status).toBe(400);
 const marker=await intent(auth);const start=(await auth.handle(request('/auth/google/login',marker)))!;
 const state=new URL(start.headers.get('location')!).searchParams.get('state');
 const tamperedState=state!.slice(0,-1)+(state!.endsWith('A')?'B':'A');
 expect((await auth.handle(request('/auth/google/callback?code=x&state='+tamperedState,cookies(start))))!.status).toBe(400);
 const tampered=marker.slice(0,-1)+(marker.endsWith('a')?'b':'a');const login=(await auth.handle(request('/v1/auth/email/login',tampered,{email:user.email,password})))!;
 expect((await login.json()).redirect).toBeUndefined();expect(named(login,'__Secure-ad507_radar_session')).toBeUndefined();
});
test('ordinary 507 and LATAM login routes keep their callbacks and redirect protections',async()=>{
 const {auth}=setup();for(const origin of [main,latam]){const start=(await auth.handle(request('/auth/google/login','',undefined,origin)))!;expect(new URL(start.headers.get('location')!).searchParams.get('redirect_uri')).toBe(origin+'/auth/google/callback');expect((await auth.handle(request('/auth/google/login?returnTo=https://evil.example','',undefined,origin)))!.status).toBe(400);}
});
test('release flags and LATAM verification are required, and Radar rejects cross-origin logout',async()=>{
 for(const override of [{RADAR_ENABLED:'false'},{AD507_RADAR_DOMAIN_VERIFIED:'false'},{AD507_INTERNATIONAL_DOMAIN_VERIFIED:'false'}]){const {auth}=setup(override);expect((await auth.handle(request('/auth/google/login','',undefined,radar)))!.status).toBe(503);}
 const {auth}=setup();expect((await auth.handle(new Request(radar+'/auth/logout',{method:'POST',headers:{origin:'https://evil.example'}})))!.status).toBe(403);
});

test('verified LATAM TLS proxy preserves Radar intent for email and Google',async()=>{
 const {auth}=setup();
 const proxy=(path:string,cookie='',body?:any)=>new Request('http://direcciones.lat:8080'+path,{method:body?'POST':'GET',headers:{origin:latam,cookie,'x-forwarded-proto':'https',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const entry=(await auth.handle(proxy('/auth/radar')))!;
 expect(entry.status).toBe(302);expect(entry.headers.get('location')).toBe(latam+'/commercial/international?access=1&radar=1');
 const marker=cookies(entry);
 const login=(await auth.handle(proxy('/v1/auth/email/login',marker,{email:user.email,password})))!;
 expect(login.status).toBe(200);expect((await login.json()).redirect).toBe(radar+'/');
 const start=(await auth.handle(proxy('/auth/google/login',marker)))!;
 const target=new URL(start.headers.get('location')!);
 expect(target.searchParams.get('redirect_uri')).toBe(latam+'/auth/google/callback');
 const finish=(await auth.handle(proxy('/auth/google/callback?code=test-code&state='+target.searchParams.get('state'),marker+'; '+cookies(start))))!;
 expect(finish.status).toBe(302);expect(finish.headers.get('location')).toBe(radar+'/');
});
test('LATAM proxy normalization does not authorize foreign hosts, ports, insecure requests or redirect overrides',async()=>{
 const {auth}=setup();
 for(const [url,proto] of [['http://evil.example/auth/radar','https'],['http://direcciones.lat:8081/auth/radar','https'],['http://direcciones.lat/auth/radar','http'],['http://direcciones.lat/auth/radar','https,http'],['http://direcciones.lat:8080/auth/radar?returnTo=https://evil.example','https']]){
  const result=(await auth.handle(new Request(url,{headers:{'x-forwarded-proto':proto,'x-forwarded-host':'direcciones.lat'}})))!;
  expect(result.status).toBe(400);expect(result.headers.has('location')).toBe(false);
 }
 const disabled=setup({RADAR_ENABLED:'false'}).auth;
 expect((await disabled.handle(new Request('http://direcciones.lat:8080/auth/radar',{headers:{'x-forwarded-proto':'https'}})))!.status).toBe(400);
});
