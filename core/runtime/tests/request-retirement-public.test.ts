import {test,expect} from 'bun:test';
import {handleNewPublicRoutes} from '../new-address-publication';
import {readFileSync} from 'node:fs';

function fakePublicSql(retired:boolean) {
 const calls:{query:string;args:unknown[]}[]=[];
 const sql:any=async(strings:TemplateStringsArray,...params:any[])=>{
   calls.push({query:strings.join('?'),args:params});
   return []; // Core public reader: no ACTIVE record
 };
 sql.unsafe=async(query:string,args:any[]=[])=>{
   calls.push({query,args});
   return query.includes("status='ARCHIVED'")&&retired?[{exists:1}]:[];
 };
 return {sql,calls};
}

test('owner-retired address returns HTTP 410 and noindex from the former QR URL and API',async()=>{
 const {sql,calls}=fakePublicSql(true);
 const context={enabled:true,sql,r2:null};
 const page=await handleNewPublicRoutes(new Request('https://direcciones507.com/AD507-TESTREMOVED/'),context);
 expect(page?.status).toBe(410);
 expect(page?.headers.get('x-robots-tag')).toContain('noindex');
 expect(page?.headers.get('cache-control')).toBe('no-store');
 const body=await page?.text();expect(body).toContain('ya no está disponible');
 expect(body).not.toContain('AD507-TESTREMOVED');
 const api=await handleNewPublicRoutes(new Request('https://direcciones507.com/v1/addresses/AD507-TESTREMOVED'),context);
 expect(api?.status).toBe(410);
 expect((await api?.json()).error).toBe('ADDRESS_RETIRED');
 expect(calls.filter(x=>x.query.includes("status='ARCHIVED'"))).toHaveLength(2);
});

test('unpublished unknown code does not claim to be retired, and feature gate stays closed',async()=>{
 const {sql}=fakePublicSql(false);
 expect(await handleNewPublicRoutes(new Request('https://direcciones507.com/AD507-NOTFOUND/'),{enabled:true,sql,r2:null})).toBeNull();
 expect(await handleNewPublicRoutes(new Request('https://direcciones507.com/AD507-NOTFOUND/'),{enabled:false,sql,r2:null})).toBeNull();
});

test('Core public and sitemap readers exclude archived records by status, preserving reserved codes',()=>{
 const publicReader=readFileSync(new URL('../../postgres/public-address-repository.ts',import.meta.url),'utf8');
 const sitemap=readFileSync(new URL('../../postgres/public-sitemap-repository.ts',import.meta.url),'utf8');
 expect(publicReader).toContain("a.status = 'ACTIVE'");
 expect(sitemap).toContain("status = 'ACTIVE'");
});
