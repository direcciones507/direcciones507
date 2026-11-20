import {test} from 'bun:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// Exercise the actual shared-card handler with no browser, account or database writes.
const source=readFileSync(new URL('../latam-presentation.ts',import.meta.url),'utf8');
const handler=source.slice(source.indexOf('latamEmailSubmit.onclick=async()=>{'),source.indexOf('const authParams=new URLSearchParams(location.search);'));
function card(result:any,ok=true){
 const redirects:string[]=[],requests:any[]=[];
 const submit:any={disabled:false,textContent:'Ingresar con correo'},notice:any={textContent:''},password:any={value:'synthetic-password-123'};
 const sandbox:any={URLSearchParams,Error,latamEmailMode:'login',latamEmailSubmit:submit,latamEmailNotice:notice,latamEmailPassword:password,
  latamEmailField:{value:'test@example.invalid',checkValidity:()=>true},
  document:{getElementById:()=>({value:'PA'})},
  location:{search:'?access=1',assign:(target:string)=>redirects.push(target)},
  fetch:async(url:string,options:any)=>{requests.push({url,options});return {ok,json:async()=>result};}};
 runInNewContext('let latamRadarContinue=false;\n'+handler,sandbox);
 return {submit,notice,password,redirects,requests};
}
test('successful Radar email login waits for Continue and never resends the password',async()=>{
 const c=card({ok:true,redirect:'https://radar.direcciones.lat/'});
 await c.submit.onclick();assert.deepEqual(c.redirects,[]);assert.equal(c.submit.textContent,'Continuar');assert.equal(c.submit.disabled,false);assert.equal(c.password.value,'');
 assert.match(c.notice.textContent,/Ingreso exitoso/);assert.equal(c.requests[0].options.credentials,'same-origin');
 await c.submit.onclick();assert.deepEqual(c.redirects,['https://radar.direcciones.lat/']);assert.equal(c.requests.length,1);
});
test('failed email login cannot enable the Radar continuation',async()=>{
 const c=card({error:'INVALID_CREDENTIALS'},false);await c.submit.onclick();
 assert.deepEqual(c.redirects,[]);assert.equal(c.submit.textContent,'Ingresar con correo');assert.equal(c.submit.disabled,false);assert.match(c.notice.textContent,/INVALID_CREDENTIALS/);
});
test('ordinary LATAM login preserves its existing panel destination and ignores arbitrary return URLs',async()=>{
 for(const redirect of [undefined,'https://evil.example/','https://radar.direcciones.lat.evil.example/']){
  const c=card({ok:true,redirect});await c.submit.onclick();assert.deepEqual(c.redirects,['/panel?country=PA']);assert.equal(c.submit.textContent,'Ingresar con correo');
 }
});
