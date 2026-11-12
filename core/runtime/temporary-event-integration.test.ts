import {test,expect} from 'bun:test';
import postgres from 'postgres';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import sharp from 'sharp';
import {createTemporaryEventRepository} from './temporary-event-repository';
import {createTemporaryEventPayment} from './temporary-event-payment';
import {createTemporaryEventMedia} from './temporary-event-media';
import {createYappyProvider} from './yappy-provider';
import {handleTemporaryEventRoutes} from './temporary-event-routes';
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const today=new Date().toISOString().slice(0,10);
export const eventFixture={title:'Fiesta de prueba',description:'Descripción pública',responsibleName:'PRIVATE_NAME',responsibleEmail:'private@example.test',responsiblePhone:'PRIVATE_PHONE',countryCode:'PA',province:'Veraguas',district:'Santiago',corregimiento:'Santiago',reference:'Parque central',startsOn:today,endsOn:today,timezone:'America/Panama',hours:'18:00 a 22:00',latitude:8.1,longitude:-80.9};
test('native PostgreSQL: owner workflow, R2 adapter, verified Yappy, QR, expiration and rollback',async()=>{
 const connection=process.env.AD507_TEST_DATABASE_URL;
 if(!connection||!['localhost','127.0.0.1'].includes(new URL(connection).hostname))throw Error('DISPOSABLE_LOCAL_DATABASE_REQUIRED');
 const admin=postgres(connection,{max:1}),database='temporary_'+crypto.randomUUID().replaceAll('-','');
 await admin.unsafe('CREATE DATABASE '+database);const u=new URL(connection);u.pathname='/'+database;
 const sql=postgres(u.href,{max:1,onnotice:()=>{}});
 try{
  for(const name of ['0000_migration_ledger.sql','0001_core_foundation.sql','0002_plan_catalog.sql','0003_plan_capabilities.sql','0005_general_google_auth.sql'])await sql.unsafe(readFileSync(new URL('../../db/migrations/'+name,import.meta.url),'utf8'));
  await sql.unsafe(readFileSync(new URL('./schema-proposals/temporary-events.sql',import.meta.url),'utf8'));
  await sql.unsafe("INSERT INTO ad507.users(id,email) VALUES($1,'one@example.test'),($2,'two@example.test')",[owner,other]);
  const objects=new Map<string,Uint8Array>();let puts=0,providerCalls=0;
  const media=createTemporaryEventMedia({configurationVerified:true,accountId:'a'.repeat(32),bucket:'direcciones507-media',accessKeyId:'fixture',secretAccessKey:'fixture'},(async(url:any,options:any)=>{
   expect(options.headers.authorization).toContain('AWS4-HMAC-SHA256');const path=new URL(url).pathname;
   if(options.method==='PUT'){puts++;objects.set(path,options.body);return new Response(null)}
   return new Response(objects.has(path)?Buffer.from(objects.get(path)!):null,{status:objects.has(path)?200:404,headers:{'content-type':'image/webp'}});
  }) as typeof fetch);
  const config={environment:'production' as const,merchantId:'fixture',domain:'https://direcciones.lat',ipnUrl:'https://direcciones.lat/v1/payments/temporary-events/yappy/ipn',secret:Buffer.from('test-secret.payload').toString('base64')};
  const provider=createYappyProvider(config,(async(_url:any,options:any)=>{providerCalls++;const body=JSON.parse(options.body);if(providerCalls===1)return Response.json({body:{token:'server-token',epochTime:123}});expect(body.total).toBe('7.99');return Response.json({body:{transactionId:'fixture-tx',token:'fixture-button',documentName:'fixture-doc'}})}) as typeof fetch);
  const payment=createTemporaryEventPayment(sql,config,provider),repository=createTemporaryEventRepository(sql);
  const ctx={enabled:true,sql,media,payment,auth:{currentUser:async()=>({id:owner,roles:['CLIENT']})}};
  const request=(path:string,method='GET',body?:unknown,extra:Record<string,string>={})=>new Request('https://direcciones.lat'+path,{method,headers:{...(method!=='GET'?{origin:'https://direcciones.lat','x-requested-with':'XMLHttpRequest','content-type':'application/json'}:{}),...extra},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const draft=await handleTemporaryEventRoutes(request('/v1/user/temporary-events','POST',{...eventFixture,status:'ACTIVE',paymentConfirmedAt:new Date().toISOString()}),ctx);expect(draft?.status).toBe(201);
  const created=await draft!.json();expect(created.status).toBe('DRAFT');const id=created.id,base='/v1/user/temporary-events/'+id;
  expect((await handleTemporaryEventRoutes(request('/evento/'+created.slug),ctx))?.status).toBe(404);
  expect((await handleTemporaryEventRoutes(request(base),{...ctx,auth:{currentUser:async()=>({id:other,roles:['ADMIN']})}}))?.status).toBe(404);
  expect((await handleTemporaryEventRoutes(request(base,'PUT',eventFixture,{origin:'https://evil.example'}),ctx))?.status).toBe(403);
  expect((await handleTemporaryEventRoutes(request(base+'/payment','POST',{alias:'60000000'}),{...ctx,payment:null}))?.status).toBe(503);
  await expect(payment.initialize(owner,id,'60000000')).rejects.toThrow('PRIMARY_PHOTO_REQUIRED');
  const image=await sharp({create:{width:80,height:60,channels:3,background:'#1760ce'}}).jpeg().toBuffer();
  for(let slot=1;slot<=3;slot++){
   const form=new FormData();form.set('slot',String(slot));form.set('photo',new File([new Uint8Array(image)],'photo.jpg',{type:'image/jpeg'}));
   expect((await handleTemporaryEventRoutes(new Request('https://direcciones.lat'+base+'/photos',{method:'POST',headers:{origin:'https://direcciones.lat','x-requested-with':'XMLHttpRequest'},body:form}),ctx))?.status).toBe(200);
  }
  expect(puts).toBe(3);expect(objects.size).toBe(1);expect((await sharp(Buffer.from([...objects.values()][0])).metadata()).format).toBe('webp');
  await expect(media.upload(id,new Uint8Array([1,2,3]),'image/jpeg')).rejects.toThrow('INVALID_IMAGE');
  const preview=await handleTemporaryEventRoutes(request(base+'/preview'),ctx);expect(preview?.status).toBe(200);const previewHtml=await preview!.text();expect(previewHtml).toContain('Vista previa privada');expect(previewHtml).not.toContain('PRIVATE_');
  expect((await handleTemporaryEventRoutes(request(base,'PUT',{...eventFixture,title:'Fiesta editada'}),ctx))?.status).toBe(200);
  expect((await handleTemporaryEventRoutes(request(base+'/payment','POST',{alias:'60000000'}),ctx))?.status).toBe(200);expect(providerCalls).toBe(2);
  await expect(payment.initialize(owner,id,'60000000')).rejects.toThrow('EVENT_NOT_PAYABLE');expect(providerCalls).toBe(2);
  const order=(await sql.unsafe('SELECT * FROM ad507.temporary_event_orders WHERE event_id=$1',[id]))[0];
  const ipn=new URLSearchParams({orderId:order.provider_order_id,status:'E',domain:config.domain,hash:'0'.repeat(64)});
  await expect(payment.confirm(ipn)).rejects.toThrow('INVALID_PAYMENT_SIGNATURE');expect((await repository.getOwned(owner,id))?.status).toBe('AWAITING_PAYMENT');
  ipn.set('hash',createHmac('sha256','test-secret').update(order.provider_order_id+'E'+config.domain).digest('hex'));
  await sql.unsafe('ALTER TABLE ad507.temporary_event_orders DROP CONSTRAINT temporary_event_orders_amount_cents_check');await sql.unsafe('UPDATE ad507.temporary_event_orders SET amount_cents=1 WHERE event_id=$1',[id]);
  await expect(payment.confirm(ipn)).rejects.toThrow('INVALID_PAYMENT_ORDER');await sql.unsafe('UPDATE ad507.temporary_event_orders SET amount_cents=799 WHERE event_id=$1',[id]);
  const confirmations=await Promise.all([payment.confirm(ipn),payment.confirm(ipn)]);expect(confirmations.filter(x=>x.unchanged)).toHaveLength(1);
  const page=await handleTemporaryEventRoutes(request('/evento/'+created.slug),ctx);expect(page?.status).toBe(200);const html=await page!.text();expect(html).toContain('Fiesta editada');expect(html).toContain('Descargar QR PNG');expect(html).toContain('og:image');expect(html).not.toContain('PRIVATE_');expect(html).not.toContain('private@example');
  const png=await handleTemporaryEventRoutes(request('/evento/'+created.slug+'/qr.png'),ctx);expect(png?.headers.get('content-type')).toBe('image/png');expect(Buffer.from(await png!.arrayBuffer()).subarray(1,4).toString()).toBe('PNG');
  expect((await handleTemporaryEventRoutes(request('/evento/'+created.slug+'/foto/1'),ctx))?.status).toBe(200);
  expect((await repository.getPublic(created.slug,new Date(Date.parse(today+'T05:00:00Z')+2*86400000-1)))?.status).toBe('ACTIVE');expect((await repository.getPublic(created.slug,new Date(Date.parse(today+'T05:00:00Z')+2*86400000)))?.status).toBe('EXPIRED');
  await sql.unsafe("UPDATE ad507.temporary_events SET starts_on='2020-01-01',ends_on='2020-01-01' WHERE id=$1",[id]);
  const ended=await handleTemporaryEventRoutes(request('/evento/'+created.slug),ctx);expect(await ended!.text()).toContain('evento ha finalizado');expect((await handleTemporaryEventRoutes(request('/evento/'+created.slug+'/foto/1'),ctx))?.status).toBe(410);
  await sql.unsafe(readFileSync(new URL('./schema-proposals/temporary-events.rollback.sql',import.meta.url),'utf8'));expect(Number((await sql.unsafe('SELECT count(*) FROM ad507.users'))[0].count)).toBe(2);
 }finally{await sql.end();await admin.unsafe('DROP DATABASE '+database);await admin.end()}
},30000);
