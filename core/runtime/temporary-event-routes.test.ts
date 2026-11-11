import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {handleTemporaryEventRoutes} from './temporary-event-routes';
const owner={id:'11111111-1111-4111-8111-111111111111',roles:['CLIENT']};
const auth={currentUser:async()=>owner};
const sql={} as any;
const ctx={enabled:true,sql,auth};
test('feature switch blocks draft and public event endpoints without DB access',async()=>{
 for(const path of ['/panel/evento/nuevo','/v1/user/temporary-events','/evento/fiesta-0123456789abcdef']){
  const response=await handleTemporaryEventRoutes(new Request('https://direcciones.lat'+path),{...ctx,enabled:false});
  assert.equal(response?.status,404);
 }
});
test('draft rejects cross-origin submissions before touching DB',async()=>{
 const req=new Request('https://direcciones.lat/v1/user/temporary-events',{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json','x-requested-with':'XMLHttpRequest'},body:'{}'});
 const response=await handleTemporaryEventRoutes(req,ctx);
 assert.equal(response?.status,403);
});
test('draft rejects missing AJAX header before touching DB',async()=>{
 const req=new Request('https://direcciones.lat/v1/user/temporary-events',{method:'POST',headers:{origin:'https://direcciones.lat','content-type':'application/json'},body:'{}'});
 const response=await handleTemporaryEventRoutes(req,ctx);
 assert.equal(response?.status,403);
});
test('draft rejects unauthenticated users',async()=>{
 const req=new Request('https://direcciones.lat/v1/user/temporary-events',{method:'POST',headers:{origin:'https://direcciones.lat','content-type':'application/json','x-requested-with':'XMLHttpRequest'},body:'{}'});
 const response=await handleTemporaryEventRoutes(req,{...ctx,auth:{currentUser:async()=>null} as any});
 assert.equal(response?.status,401);
});
test('authenticated form is available without a DB write',async()=>{
 const response=await handleTemporaryEventRoutes(new Request('https://direcciones.lat/panel/evento/nuevo'),ctx);
 assert.equal(response?.status,200);
 const html=await response!.text();
 assert.match(html,/Guardar borrador/);
 assert.match(html,/US\$7\.99/);
 assert.match(html,/temporary-event-draft/);
});
