import {test,expect} from 'bun:test';
import {userPanelHtml,userPanelPresentation} from '../user-panel';
import {requestClientScript} from '../request-client-ui';
import {renderPanelAddressCard} from '../panel-address-card';
import {readFileSync} from 'node:fs';

test('request details remain in the shared account with syntactically valid scripts on both domains',()=>{
  for(const html of [userPanelHtml,userPanelPresentation(new URL('https://direcciones.lat/panel'))]){
    expect(html).toContain('id="requestDetail"');
    expect(html).toContain('data-request=');
    for(const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))expect(()=>new Function(script[1])).not.toThrow();
  }
  expect(()=>new Function(requestClientScript)).not.toThrow();
  const server=readFileSync(new URL('../server.ts',import.meta.url),'utf8');
  expect(server).toContain('/auth/google/login?returnTo=%2Fadmin');
  expect(server).toContain('data-place-request=');
  expect(server).toContain('openRequestReview(b.dataset.placeRequest)');
});

test('client detail renders supplied text safely, exposes only read controls and supports close',async()=>{
  class Node{
    textContent='';children:any[]=[];dataset:any={};classList={remove(){},add(){}};style:any={};onclick:any;
    append(...nodes:any[]){this.children.push(...nodes)} replaceChildren(...nodes:any[]){this.children=nodes;this.textContent=''}
    scrollIntoView(){}focus(){}addEventListener(){}
  }
  const view=new Node(),addresses=new Node(),name='<img src=x onerror=alert(1)>';
  const doc={getElementById:(id:string)=>id==='addresses'?addresses:view,createElement:()=>new Node(),createTextNode:(s:string)=>({textContent:s}),querySelector:()=>null};
  const id='11111111-1111-4111-8111-111111111111';let calls=0;
  const http=async(url:string)=>{calls++;expect(url).toBe('/v1/user/requests/'+id);return Response.json({request:{name,publicUrl:'https://direcciones.lat/example/',type:'PLACE',status:'PENDING_REVIEW',description:'Ñ y tildes á',reference:'Referencia',latitude:8,longitude:-80,countryCode:'PA',extras:{},media:[{id,type:'IMAGE',status:'READY'}]}})};
  const open=new Function('document','fetch','countrySettings',requestClientScript+';return openUserRequest')(doc,http,{PA:{name:'Panamá'}});
  await open(id);expect(calls).toBe(1);const content=view.children[1];expect(content.children[0].textContent).toBe(name);
  expect(content.children.some((n:any)=>n.src==='/v1/user/requests/'+id+'/media/'+id)).toBe(true);
  expect(content.children.filter((n:any)=>n.href==='https://direcciones.lat/example/')).toHaveLength(0);
  expect(content.children.some((n:any)=>n.href?.startsWith('https://www.google.com/maps/search/'))).toBe(true);
  expect(JSON.stringify(content)).not.toContain('innerHTML');
  view.children[0].onclick();await open('not-a-uuid');expect(calls).toBe(1);
});

test('account cards keep details and removal side by side; payment action is generic and starts below Maps',()=>{
  const card=renderPanelAddressCard({id:'11111111-1111-4111-8111-111111111111',source:'USER_REQUEST',status:'DRAFT',addressType:'BUSINESS',name:'Prueba',canArchive:true});
  expect(card).toContain('class="address-request-pair"');
  expect(card).toContain('>Ver detalles</button>');
  expect(card).toContain('>Eliminar solicitud</button>');
  expect(card.indexOf('data-request-detail')).toBeLessThan(card.indexOf('data-archive-request'));
  expect(userPanelHtml).toContain('.address-request-pair{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr)');
  expect(userPanelPresentation(new URL('https://direcciones.lat/panel?country=PA'))).toContain('.address-request-pair{grid-column:1/-1;display:grid');
  expect(requestClientScript).toContain("pay.textContent='Ir al pago'");
  expect(requestClientScript).toContain("pay.href='/panel/payments/'+id");
  expect(requestClientScript).toContain("pay.style.cssText='display:flex;");
  expect(requestClientScript).toContain('link.textContent=');
  expect(requestClientScript).toContain('Google Maps');
  expect(requestClientScript).not.toContain("pay.textContent='Pagar ahora con Yappy'");
});


test('request submission is routed to the authenticated repository before the account panel',()=>{
  const server=readFileSync(new URL('../server.ts',import.meta.url),'utf8');
  const panel=readFileSync(new URL('../user-panel.ts',import.meta.url),'utf8');
  const routes=readFileSync(new URL('../request-routes.ts',import.meta.url),'utf8');
  expect(server.indexOf('await handleRequestRoutes(req')).toBeGreaterThan(-1);
  expect(server.indexOf('await handleUserPanel(req')).toBeGreaterThan(server.indexOf('await handleRequestRoutes(req'));
  expect(panel).not.toContain("if (url.pathname === '/v1/user/requests')");
  expect(panel).toContain("fetch('/v1/user/requests'");
  expect(routes).toContain("submit=url.pathname==='/v1/user/requests'||adminCreate");
  expect(routes).toContain("context.repository[adminCreate?'createAdmin':'submit']");
  expect(routes).toContain("if(!context.enabled)return respond(503");
});
