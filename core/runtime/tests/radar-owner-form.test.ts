import {test} from 'bun:test';
import assert from 'node:assert/strict';
import {collectOwnerRegistration,restoreOwnerRegistration} from '../radar/ui/registration-form.js';
function form(){const nodes:Record<string,any>={};for(const key of ['Province','Locality','Description','Phone','Socials'])nodes['business'+key]={value:''};for(const day of ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'])for(const part of ['Closed','Open','Close'])nodes['business'+part+'_'+day]={value:'',checked:false};const extra={name:'businessExtra_products',value:''};return {nodes,extra,elements:{namedItem:(name:string)=>nodes[name]},querySelectorAll:()=>[extra]};}
test('commercial form collects every public field and restores a pending draft without ownership flags',()=>{
 const first=form();first.nodes.businessProvince.value='Panamá';first.nodes.businessLocality.value='Ciudad';first.nodes.businessDescription.value='Descripción';first.nodes.businessPhone.value='+507 6000-0000';first.nodes.businessSocials.value='https://example.test/\nhttps://example.test/social';first.nodes.businessOpen_monday.value='08:00';first.nodes.businessClose_monday.value='17:00';first.nodes.businessClosed_sunday.checked=true;first.extra.value='Especialidad';
 const data=collectOwnerRegistration(first);assert.equal(data.hours.monday,'08:00-17:00');assert.equal(data.hours.sunday,'closed');assert.equal(data.socials.length,2);assert.equal(data.extras.products,'Especialidad');assert.equal((data as any).verified,undefined);
 const second=form();restoreOwnerRegistration(second,data);assert.deepEqual(collectOwnerRegistration(second),data);
});
test('incomplete hours cannot silently disappear from a commercial submission',()=>{
 const f=form();f.nodes.businessOpen_monday.value='08:00';assert.throws(()=>collectOwnerRegistration(f),/Completa apertura/);
});
