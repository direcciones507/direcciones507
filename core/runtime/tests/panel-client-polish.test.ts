import {test,expect} from 'bun:test';
import {renderPanelAddressCard,panelLogoutDestination} from '../panel-address-card';
import {userPanelHtml} from '../user-panel';
import {requestClientScript} from '../request-client-ui';

test('client cards preserve long codes, deduplicate Lugar and expose separate accessible actions',()=>{
 const code='AD507-N56F413FACAAA475589AB112BC1EFC9A3';
 const card=renderPanelAddressCard({id:'11111111-1111-4111-8111-111111111111',source:'USER_REQUEST',name:'Nombre <seguro>',code,addressType:'PLACE',planName:'Lugar',status:'ACTIVE',publicUrl:'https://direcciones.lat/'+code+'/'});
 expect(card.match(/>Lugar</g)).toHaveLength(1);
 expect(card).toContain('address-status is-active');expect(card).toContain('>Activa</span>');
 expect(card).toContain('Nombre &lt;seguro&gt;');expect(card).toContain('<code class="address-code">'+code+'</code>');
 expect(card).toContain('data-copy-code="'+code+'"');expect(card).toContain('class="button address-open"');
 expect(card).toContain('data-request-detail=');expect(card).not.toContain('role="button"');
 const pending=renderPanelAddressCard({name:'Pendiente',addressType:'PLACE',status:'PENDING_REVIEW'});
 expect(pending).toContain('En revisión');expect(pending).not.toContain('data-copy-code');expect(pending).not.toContain('address-open');
 const unsafe=renderPanelAddressCard({name:'X',publicUrl:'javascript:alert(1)',imageUrl:'https://user:password@example.test/x'});
 expect(unsafe).not.toContain('javascript:');expect(unsafe).not.toContain('password');
});

test('logout retains LATAM and selected country without allowing an external return URL',()=>{
 expect(panelLogoutDestination('https://direcciones.lat/panel?country=CO')).toBe('https://direcciones.lat/?country=CO');
 expect(panelLogoutDestination('https://direcciones.lat/panel','CR')).toBe('https://direcciones.lat/?country=CR');
 expect(panelLogoutDestination('https://cuenta.direcciones507.com/panel','PA')).toBe('https://direcciones507.com/?country=PA');
 expect(panelLogoutDestination('https://direcciones.lat/panel?country=https://evil.test')).toBe('https://direcciones.lat/');
});

test('copy writes the exact stored code, reports failure truthfully and never opens the request',async()=>{
 let listener:any,opened=0,written='';const message={textContent:''};
 const doc={getElementById:(id:string)=>id==='addresses'?{addEventListener:(_:string,fn:any)=>{listener=fn}}:message};
 const code='AD507-N56F413FACAAA475589AB112BC1EFC9A3',button={dataset:{copyCode:code},disabled:false};
 new Function('document','navigator','fetch',requestClientScript)(doc,{clipboard:{writeText:async(s:string)=>{written=s}}},()=>{opened++});
 await listener({target:{closest:(q:string)=>q==='[data-copy-code]'?button:null}});
 expect(written).toBe(code);expect(opened).toBe(0);expect(message.textContent).toBe('Código copiado.');expect(button.disabled).toBe(false);
 new Function('document','navigator','fetch',requestClientScript)(doc,{clipboard:{writeText:async()=>{throw Error('denied')}}},()=>{opened++});
 await listener({target:{closest:(q:string)=>q==='[data-copy-code]'?button:null}});
 expect(message.textContent).toContain('No se pudo copiar');expect(button.disabled).toBe(false);
});

test('place form requires a cover and bounds three additional files before preparing or sending',async()=>{
 const source=userPanelHtml.slice(userPanelHtml.indexOf('async function validateImages()'),userPanelHtml.indexOf('function coordinates()'));
 const nodes:any={plan:{value:'PLACE'},galleryField:{classList:{contains:()=>false}},gallery:{files:[]},cover:{files:[]},logo:{files:[]}};
 const validate=new Function('$','requestType','IMAGE_TYPES','IMAGE_MAX_BYTES','inspectImage','mediaCountAllowed',source+';return validateImages')((id:string)=>nodes[id],'PLACE',[],0,()=>true,()=>true);
 // No inputs are visible to MIME screening here: isolate count rules from content tests.
 for(const key of ['cover','gallery','logo'])nodes[key].closest=()=>true;
 expect(await validate()).toContain('foto de portada');nodes.cover.files=[{}];expect(await validate()).toBe('');
 nodes.gallery.files=[{},{},{}];expect(await validate()).toBe('');nodes.gallery.files.push({});expect(await validate()).toContain('tres fotos');
 expect(userPanelHtml).toContain("$('cover').required=requestType==='PLACE'");
 expect(userPanelHtml.indexOf("for(const file of $('cover').files)body.append('photos',file)")).toBeLessThan(userPanelHtml.indexOf("for(const file of $('gallery').files)body.append('photos',file)"));
});
