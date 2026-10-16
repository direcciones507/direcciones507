import {test,expect} from 'bun:test';
import {sharedVisualStyle} from '../shared-visual-style';
import {userPanelHtml,userPanelPresentation} from '../user-panel';
import {requestClientScript} from '../request-client-ui';
import {requestAdminScript} from '../request-admin-ui';
import {readFileSync} from 'node:fs';
test('shared visual rules reach client, public entry and admin without hiding or disabling controls',()=>{
 for(const html of [userPanelHtml,userPanelPresentation(new URL('https://direcciones.lat/')),userPanelPresentation(new URL('https://direcciones.lat/panel'))]){
  expect(html).toContain(sharedVisualStyle);
  for(const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))expect(()=>new Function(script[1])).not.toThrow();
 }
 const account=userPanelPresentation(new URL('https://direcciones.lat/panel'));
 expect(account.lastIndexOf(sharedVisualStyle)).toBeGreaterThan(account.indexOf('/* LATAM account presentation'));
 const server=readFileSync(new URL('../server.ts',import.meta.url),'utf8');expect(server).toContain('${sharedVisualStyle}');
 expect(sharedVisualStyle).toContain('min-height:44px');expect(sharedVisualStyle).toContain('focus-visible');expect(sharedVisualStyle).toContain('max-width:767px');expect(sharedVisualStyle).toContain('max-width:1099px');
 expect(sharedVisualStyle).toContain('body .hidden,body [hidden]{display:none!important}');
 expect(sharedVisualStyle).not.toMatch(/pointer-events\s*:\s*none/);
});
test('detail avoids duplicate public action while retaining safe map and private media, and admin labels stay presentation only',()=>{
 expect(requestClientScript).not.toContain("link.textContent='Abrir dirección digital'");
 expect(requestClientScript).toContain('www.google.com/maps/search/?api=1&query=');expect(requestClientScript).toContain("'/media/'+m.id");
 expect(()=>new Function(requestAdminScript)).not.toThrow();expect(requestAdminScript).toContain('reviewLabel(r.status)');
 expect(requestAdminScript).toContain("r.status!=='PENDING_REVIEW'");
});
