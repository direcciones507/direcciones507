import {test} from 'bun:test';
import assert from 'node:assert/strict';
import {accountEmailEntry} from '../account-email';
const token='t'.repeat(43),proof='p'.repeat(43),email='synthetic@example.invalid';
const query=new URLSearchParams({token,email,radar:proof,returnTo:'https://evil.example/'});
test('verification and recovery stay on canonical HTTPS behind Railway and preserve only email context',()=>{
 for(const [path,action]of [['/verificar-correo','verify'],['/recuperar-contrasena','reset']]){
  const r=accountEmailEntry(new Request('http://direcciones.lat:8080'+path+'?'+query,{headers:{'x-forwarded-proto':'https','x-forwarded-host':'evil.example'}}))!;
  assert.equal(r.status,302);const target=new URL(r.headers.get('location')!);
  assert.equal(target.origin,'https://direcciones.lat');assert.equal(target.pathname,'/commercial/international');assert.equal(target.searchParams.get('token'),token);assert.equal(target.searchParams.get('email'),email);assert.equal(target.searchParams.get('action'),action);assert.equal(target.searchParams.get('radar'),proof);assert.equal(target.searchParams.has('returnTo'),false);
  assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('referrer-policy'),'no-referrer');
 }
});
test('ordinary LATAM verification link does not invent Radar context',()=>{
 const r=accountEmailEntry(new Request('https://direcciones.lat/verificar-correo?'+new URLSearchParams({email,token})))!;
 assert.equal(new URL(r.headers.get('location')!).searchParams.has('radar'),false);
});
test('invalid codes are rejected and foreign hosts or methods remain outside email entry',()=>{
 assert.equal(accountEmailEntry(new Request('https://direcciones.lat/verificar-correo?email='+email+'&token=invalid'))!.status,400);
 assert.equal(accountEmailEntry(new Request('https://evil.example/verificar-correo?'+query)),null);
 assert.equal(accountEmailEntry(new Request('https://direcciones.lat/verificar-correo?'+query,{method:'POST'})),null);
 const invalidContext=new URLSearchParams({email,token,radar:'https://evil.example/'});
 const r=accountEmailEntry(new Request('https://direcciones.lat/verificar-correo?'+invalidContext))!;assert.equal(new URL(r.headers.get('location')!).searchParams.has('radar'),false);
});
