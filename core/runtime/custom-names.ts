import historical from './historical-public-names.json';
import {COUNTRIES,assertCountryPublication,countryConfiguration} from './country-configuration';

/** Selectively recovered from be4e02b; never truncates or silently renames a purchase. */
export function normalizeCodeName(raw:string):string {
 if(typeof raw!=='string'||raw.length>160)throw Error('INVALID_CODE_NAME');
 const decomposed=raw.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
 if(/[^A-Z0-9\s._'-]/.test(decomposed))throw Error('INVALID_CODE_NAME');
 const name=decomposed.replace(/[^A-Z0-9]/g,'');
 if(!/^[A-Z0-9]{1,60}$/.test(name)||!/[A-Z]/.test(name))throw Error('INVALID_CODE_NAME');
 return name;
}
const systemNames=['admin','panel','auth','legal','assets','v1','internal','health','ready','sitemap','sitemapxml','robots','robotstxt','favicon','faviconico','commercial','login','logout','register','recuperarcontrasena','verificarcorreo','index','indexhtml','generador','verificar','api','www','mi-cuenta','crear-cuenta','verificar-correo','recuperar-contrasena','users','places','plans','stats','public','media','payments','search','mapa','map'];
const historicalNames=historical.routes.flatMap(name=>[name,name.replace(/^AD\d{2,3}-/,'')]).flatMap(name=>{try{return [name,normalizeCodeName(name)];}catch{return [name];}});
const protectedNames=new Set([...systemNames.map(normalizeCodeName),...historicalNames]);
export type PublicIdentity={version:1;name:string;kind:'PREMIUM'|'PRO';countryCode:string};
export function requestedIdentity(data:{type:string;plan:string;countryCode:string;name:string;namedCode?:string}):PublicIdentity|null {
 if(data.type!=='BUSINESS'||!['BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO'].includes(data.plan))return null;
 if(data.plan==='BUSINESS_PREMIUM'&&!data.namedCode?.trim())return null;
 assertCountryPublication(data.countryCode,data.type,data.plan);
 const stem=normalizeCodeName(data.namedCode?.trim()||data.name);
 if(protectedNames.has(stem)||/^AD\d{2,3}/.test(stem)||/^N\d{8}$/.test(stem))throw Error('NAME_RESERVED');
 const pro=data.plan==='BUSINESS_PREMIUM_PRO',name=pro?stem:'AD'+countryConfiguration(data.countryCode).prefix+'-'+stem;
 if(protectedNames.has(name))throw Error('NAME_RESERVED');
 return {version:1,name,kind:pro?'PRO':'PREMIUM',countryCode:data.countryCode};
}
export function publicIdentityUrl(identity:any,plan:string,fallback:string):string {
 return identity?.version===1&&identity.kind==='PRO'&&plan==='BUSINESS_PREMIUM_PRO'&&/^[A-Z0-9]{1,60}$/.test(identity.name)&&/[A-Z]/.test(identity.name)
  ?'https://direcciones.lat/'+identity.name:fallback;
}
function collisionKeys(identity:PublicIdentity){
 const stem=identity.kind==='PRO'?identity.name:identity.name.replace(/^AD\d{2,3}-/,'');
 return identity.kind==='PRO'?[stem,...Object.values(COUNTRIES).map(c=>'AD'+c.prefix+'-'+stem)]:[identity.name,stem];
}
/** Read-only pre-contract check. No owner IDs or pending request data leave this function. */
export async function nameAvailable(sql:any,identity:PublicIdentity,addressId?:string):Promise<boolean>{
 const keys=collisionKeys(identity);
 const existing=await sql.unsafe('SELECT 1 FROM ad507.public_name_reservations WHERE public_name=ANY($1::text[]) AND ($2::uuid IS NULL OR address_id<>$2::uuid) LIMIT 1',[keys,addressId??null]);
 if(existing.length)return false;
 const folded=keys.map(key=>key.replace(/[^A-Z0-9]/g,''));
 const codes=await sql.unsafe("SELECT 1 FROM ad507.addresses WHERE regexp_replace(normalize(upper(trim(code)),NFD),'[^A-Z0-9]','','g')=ANY($1::text[]) AND ($2::uuid IS NULL OR id<>$2::uuid) LIMIT 1",[folded,addressId??null]);
 return !codes.length;
}
/** Must run inside the address creation transaction. Global stem locks serialize countries. */
export async function reservePublicName(tx:any,addressId:string,identity:PublicIdentity){
 const stem=identity.kind==='PRO'?identity.name:identity.name.replace(/^AD\d{2,3}-/,'');
 await tx.unsafe('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['public-name:'+stem]);
 const prior=await tx.unsafe('SELECT public_name,kind,country_code FROM ad507.public_name_reservations WHERE address_id=$1::uuid',[addressId]);
 if(prior.length){if(prior[0].public_name!==identity.name||prior[0].kind!==identity.kind||prior[0].country_code!==identity.countryCode)throw Error('NAME_IMMUTABLE');return;}
 const [quota]=await tx.unsafe("SELECT count(*)::int AS n FROM ad507.public_name_reservations n JOIN ad507.address_ownership own ON own.address_id=n.address_id JOIN ad507.addresses a ON a.id=n.address_id WHERE own.user_id IN (SELECT user_id FROM ad507.address_ownership WHERE address_id=$1::uuid AND ownership_role='OWNER') AND a.publication_receipt IS NULL",[addressId]);
 if(Number(quota?.n)>=3)throw Error('PENDING_NAME_LIMIT');
 if(!await nameAvailable(tx,identity,addressId))throw Error('NAME_UNAVAILABLE');
 try{await tx.unsafe('INSERT INTO ad507.public_name_reservations(public_name,address_id,kind,country_code) VALUES($1,$2::uuid,$3,$4)',[identity.name,addressId,identity.kind,identity.countryCode]);}
 catch(error){if((error as any).code==='23505')throw Error('NAME_UNAVAILABLE');throw error;}
}
export async function reservedIdentity(sql:any,addressId:string):Promise<PublicIdentity|null>{
 const [r]=await sql.unsafe('SELECT public_name,kind,country_code FROM ad507.public_name_reservations WHERE address_id=$1::uuid',[addressId]);
 return r?{version:1,name:r.public_name,kind:r.kind,countryCode:r.country_code}:null;
}
