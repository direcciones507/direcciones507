/** Shared country policy for the existing commercial workflow. Foreign commerce stays closed. */
export type CountryCode='PA'|'CO'|'CR'|'GT'|'SV'|'HN'|'NI'|'MX'|'PE'|'EC';
type Rollout='PANAMA_FIRST'|'NEXT'|'PREPARED'|'FUTURE';
const country=(name:string,prefix:string,rollout:Rollout,labels:string[],currency:string,pricing:'EXISTING_PANAMA_AUTHORITY'|'UNCONFIGURED'='UNCONFIGURED')=>Object.freeze({name,prefix,title:prefix==='507'?'Direcciones507':'Direcciones LATAM',rollout,locationLabels:Object.freeze(labels),localCurrency:currency,officialCurrency:'USD' as const,pricing,internationalCardPaymentsEnabled:false as const});
export const COUNTRIES=Object.freeze({
 PA:country('Panamá','507','PANAMA_FIRST',['Provincia','Distrito','Corregimiento'],'USD','EXISTING_PANAMA_AUTHORITY'),
 CO:country('Colombia','57','NEXT',['Departamento','Municipio','Localidad / sector'],'COP'),
 CR:country('Costa Rica','506','NEXT',['Provincia','Cantón','Distrito'],'CRC'),
 GT:country('Guatemala','502','PREPARED',['Departamento','Municipio','Zona / sector'],'GTQ'),
 SV:country('El Salvador','503','PREPARED',['Departamento','Municipio','Distrito'],'USD'),
 HN:country('Honduras','504','PREPARED',['Departamento','Municipio','Sector'],'HNL'),
 NI:country('Nicaragua','505','PREPARED',['Departamento / región','Municipio','Sector'],'NIO'),
 MX:country('México','52','PREPARED',['Estado','Municipio / alcaldía','Colonia / localidad'],'MXN'),
 PE:country('Perú','51','FUTURE',['Departamento / región','Provincia','Distrito'],'PEN'),
 EC:country('Ecuador','593','FUTURE',['Provincia','Cantón','Parroquia'],'USD'),
});
export function countryConfiguration(code:unknown='PA') {
 if(typeof code!=='string'||!Object.hasOwn(COUNTRIES,code))throw Error('INVALID_COUNTRY');
 return COUNTRIES[code as CountryCode];
}
/** Proposed namespace only: reservation and database uniqueness remain mandatory. */
export function proposedInternationalCode(code:unknown,id:string){
 const config=countryConfiguration(code);
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id))throw Error('INVALID_REQUEST');
 return 'AD'+config.prefix+'-N'+id.replaceAll('-','').toUpperCase();
}
/** No duplicate prices or fallback to zero: delegate Panama to its existing authority. */
export function preparedCountryAmount(code:unknown,plan:string,panamaAmount:(plan:string)=>number){
 if(countryConfiguration(code).pricing!=='EXISTING_PANAMA_AUTHORITY')throw Error('COUNTRY_PRICING_NOT_CONFIGURED');
 return panamaAmount(plan);
}
export const FUTURE_PUBLIC_ORIGIN='https://direcciones.lat'; // no DNS/runtime activation
export function prepareCountryTemplate(template:string,code:unknown){
 const config=countryConfiguration(code);
 if(config.prefix==='507')return template; // Preserve the Panama brand and historical template.
 const marker='<div class="brand-title-text">DIRECCIONES<span>507</span></div>';
 if(template.split(marker).length!==2)throw Error('COUNTRY_TEMPLATE_MARKER_MISMATCH');
 const footer='<div class="footer-title-main">DIRECCIONES<span>507</span></div>';
 if(template.split(footer).length!==2)throw Error('COUNTRY_TEMPLATE_MARKER_MISMATCH');
 return template.replace(marker,'<div class="brand-title-text" style="color:#0b57d0">Direcciones LATAM</div>')
   .replace(footer,'<div class="footer-title-main" style="color:#0b57d0">Direcciones LATAM</div>');
}

export const INITIAL_COUNTRIES = Object.freeze(Object.keys(COUNTRIES).filter(code=>!['PE','EC'].includes(code)) as CountryCode[]);
export function requestCountry(code:unknown='PA'):CountryCode {
 countryConfiguration(code);
 if(!INITIAL_COUNTRIES.includes(code as CountryCode))throw Error('INVALID_COUNTRY');
 return code as CountryCode;
}
export function assertCountryCommerce(code:unknown='PA') {
 if(requestCountry(code)!=='PA')throw Error('COUNTRY_NOT_ENABLED');
}
export function codeMatchesCountry(code:string,country:unknown='PA') {
 const prefix=countryConfiguration(country).prefix;
 return new RegExp('^AD'+prefix+'-[A-Z0-9_-]+$').test(code);
}
/** Proposed URLs cannot be returned as active links until publication is authorized. */
export function proposedCountryUrl(country:unknown,code:string,originalUrl?:string|null) {
 if(!codeMatchesCountry(code,country))throw Error('CANONICAL_CODE_INVALID');
 if(originalUrl){const u=new URL(originalUrl);if(country!=='PA'||u.protocol!=='https:'||u.hostname!=='direcciones507.com'||u.username||u.password||u.port||u.search||u.hash||u.pathname!=='/'+code.toLowerCase()+'/')throw Error('INVALID_HISTORICAL_URL');return u.href;}
 return (countryConfiguration(country).prefix==='507'?'https://direcciones507.com':FUTURE_PUBLIC_ORIGIN)+'/'+code+'/';
}
export function paymentMethods(country:unknown='PA') {
 requestCountry(country);return country==='PA'?['PAYPAL','YAPPY']:['PAYPAL'];
}
/** Display-only conversion. Caller must supply a dated verified rate; never used for orders. */
export function informativeLocalAmount(usdCents:number,rate:number) {
 if(!Number.isSafeInteger(usdCents)||usdCents<0||!Number.isFinite(rate)||rate<=0)throw Error('INVALID_EXCHANGE_RATE');
 return Math.round(usdCents*rate)/100;
}
