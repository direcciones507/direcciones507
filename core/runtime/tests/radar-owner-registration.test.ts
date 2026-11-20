import {test} from 'bun:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {validateRegistration} from '../radar/registration';
import {createRadarRepository} from '../radar/repository';
import {createRadarRoutes} from '../radar/routes';
import {createBusinessStore} from '../radar/business';
const account='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',origin='https://radar.direcciones.lat';
const profile={province:'Panamá',locality:'Ciudad de Panamá',description:'Información pública del comercio.',phone:'+507 6000-0000',hours:{monday:'08:00-17:00'},socials:['https://example.test/'],extras:{products:'Productos de ejemplo'}};
const input={name:'Synthetic business',category:'shop',country:'PA',latitude:8,longitude:-80,registrationKind:'owner',profile};
test('commercial registration validates public fields and strips ownership privileges',()=>{
 const draft=validateRegistration({...input,verified:true,accountRef:other,published:false});assert.equal(draft?.registrationKind,'owner');assert.deepEqual(draft?.profile,profile);assert.equal((draft as any).verified,undefined);
 for(const bad of [{...profile,description:''},{...profile,socials:['javascript:alert(1)']},{...profile,socials:['https://user:password@example.test']},{...profile,hours:{fake:'closed'}},{...profile,extras:{verified:'true'}}])assert.equal(validateRegistration({...input,profile:bad}),null);
 assert.equal(validateRegistration({...input,registrationKind:'ADMIN'}),null);assert.equal(validateRegistration({...input,registrationKind:'user'}),null);
});
test('owner registration fails closed before SQL unless its dedicated gate is enabled',async()=>{
 let writes=0;const repo:any={register:async()=>{writes++;return account;}};
 const handler=createRadarRoutes(repo,{currentUser:async()=>({id:account,roles:['CLIENT']})},new Set([origin]),true);
 const response=await handler(new Request(origin+'/v1/radar/establishments',{method:'POST',headers:{origin},body:JSON.stringify(input)}));assert.equal(response!.status,503);assert.equal(writes,0);
});
test('commercial profile and free publication save atomically without granting ownership',async()=>{
 const pg=new PGlite();try{
  await pg.exec('CREATE SCHEMA ad507; CREATE TABLE ad507.users(id uuid PRIMARY KEY)');
  for(const path of ['schema.sql','ownership.sql','business-details.sql','registration-profiles.sql'])await pg.exec(readFileSync(new URL('../radar/'+path,import.meta.url),'utf8'));
  await pg.query('INSERT INTO ad507.users(id) VALUES($1),($2)',[account,other]);
  const db={unsafe:async(q:string,p:any[])=>(await pg.query(q,p)).rows as any[]},repo=createRadarRepository(db,true,undefined,true,true),draft=validateRegistration(input)!;
  const id=await repo.register!(draft,account);assert.ok(id);
  const saved=(await pg.query('SELECT e.published,p.submitted_by,p.profile FROM radar.establishments e JOIN radar.registration_profiles p ON p.establishment_id=e.id WHERE e.id=$1',[id])).rows[0] as any;
  assert.equal(saved.published,true);assert.equal(saved.submitted_by,account);assert.deepEqual(saved.profile,profile);
  assert.equal((await pg.query('SELECT * FROM radar.verified_owners')).rows.length,0);
  const mine=await createBusinessStore(db,true).mine(account);assert.equal(mine[0].declared,true);assert.equal(mine[0].authorized,false);assert.deepEqual(await createBusinessStore(db,true).mine(other),[]);
  // A profile write failure rolls the publication back in the same SQL statement.
  const before=(await pg.query('SELECT * FROM radar.establishments')).rows.length;
  const invalid={...draft,name:'Must roll back',profile:{...profile,description:'x'.repeat(9000)}};
  await assert.rejects(()=>repo.register!(invalid,account));assert.equal((await pg.query('SELECT * FROM radar.establishments')).rows.length,before);
 }finally{await pg.close();}
},20000);
