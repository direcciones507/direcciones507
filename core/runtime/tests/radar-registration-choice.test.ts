import {test} from 'bun:test';
import assert from 'node:assert/strict';
import {registrationIntent,registrationKind,saveRegistrationChoice,readRegistrationChoice,setRegistrationKind,ownerRegistrationMarkup,categoryRegistrationFields,renderCategoryRegistrationFields} from '../radar/ui/registration-form.js';
function storage(){const values=new Map<string,string>();return {getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)};}
test('both registration choices survive reload through the existing pending-action storage',()=>{
 for(const kind of ['user','owner']){
  const s=storage();saveRegistrationChoice(s,kind,1000);assert.equal(readRegistrationChoice(s,2000),kind);
  assert.deepEqual(Object.keys(JSON.parse(s.getItem('radarAction')!)).sort(),['registrationKind','savedAt','type']);
 }
});
test('registration choice cannot create authority and rejects invalid or stale context',()=>{
 assert.deepEqual(registrationIntent('owner'),{type:'add',registrationKind:'owner'});assert.throws(()=>registrationIntent('ADMIN'));
 assert.equal(registrationKind({type:'report',registrationKind:'owner'}),null);assert.equal(registrationKind({type:'add',registrationKind:'ADMIN'}),null);
 const s=storage();saveRegistrationChoice(s,'owner',1000);assert.equal(readRegistrationChoice(s,1801000),null);assert.equal(readRegistrationChoice(s,999),null);s.setItem('radarAction','invalid');assert.equal(readRegistrationChoice(s),null);
});
test('user form excludes hidden owner requirements while owner form enables its own controls',()=>{
 const fields:any={},form:any={dataset:{},querySelector:()=>fields};setRegistrationKind(form,'user');assert.equal(fields.disabled,true);assert.equal(fields.hidden,true);setRegistrationKind(form,'owner');assert.equal(fields.disabled,false);assert.equal(form.dataset.registrationKind,'owner');
 assert.ok(ownerRegistrationMarkup.includes('hidden disabled'));assert.ok(!ownerRegistrationMarkup.includes('type="file"'));for(const category of ['restaurant','hotel','shop','services','tourism'])assert.ok(categoryRegistrationFields[category].length);
});

test('category fields fall back safely for unknown or inherited property names',()=>{
 const nodes:any[]=[],doc:any={createElement:()=>({dataset:{},append:(child:any)=>nodes.push(child)})},container:any={replaceChildren:()=>{nodes.length=0;},append:()=>{}};
 for(const [category,unit] of [['restaurant','tables'],['hotel','rooms'],['tourism','places'],['constructor','units'],['__proto__','units']]){
  renderCategoryRegistrationFields(container,category,doc);
  const extras=nodes.filter(n=>n.name?.startsWith('businessExtra_')),capacity=nodes.filter(n=>n.name==='businessCapacity');
  assert.ok(extras.length>0);assert.ok(extras.every(n=>n.maxLength===250));
  assert.equal(capacity.length,1);assert.equal(nodes.length,extras.length+1);
  assert.equal(capacity[0].dataset.unit,unit);assert.equal(capacity[0].type,'number');
  assert.equal(capacity[0].min,'0');assert.equal(capacity[0].max,'100000');assert.equal(capacity[0].step,'1');
 }
});
