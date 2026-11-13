import {test,expect} from 'bun:test';
import {latamWelcome} from '../latam-presentation';
import {COUNTRIES,INITIAL_COUNTRIES} from '../country-configuration';
import {readFileSync} from 'node:fs';
test('temporary creation entry uses its existing route only when the service is enabled',()=>{
 const previous=process.env.AD507_TEMPORARY_EVENTS_ENABLED;
 try{
  for(const enabled of [false,true]){
   process.env.AD507_TEMPORARY_EVENTS_ENABLED=String(enabled);
   const html=latamWelcome('PA',COUNTRIES,INITIAL_COUNTRIES);
   const card=html.match(/<article class="latam-plan-card"[^>]*data-latam-plan="TEMPORARY_ADDRESS"[\s\S]*?<\/article>/)![0];
   expect(card.includes('href="/panel/evento/nuevo"')).toBe(enabled);
   expect(card.includes('aria-disabled="true"')).toBe(!enabled);
   expect(card).not.toContain('/auth/google/login');
  }
 }finally{if(previous===undefined)delete process.env.AD507_TEMPORARY_EVENTS_ENABLED;else process.env.AD507_TEMPORARY_EVENTS_ENABLED=previous;}
});
test('Panama homepage links directly to the existing authenticated temporary creation route',()=>{
 const html=readFileSync(new URL('../../../index.html',import.meta.url),'utf8');
 expect(html).toContain('href="https://direcciones.lat/panel/evento/nuevo"');
 expect(html).toContain('La publicación requiere pago confirmado.');
 expect(html).not.toContain('>Contratación próximamente</button>');
});
