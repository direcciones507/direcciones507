import {INITIAL_COUNTRIES,countryConfiguration,requestCountry} from './country-configuration';
import {territoryCatalog} from './radar/ui/territory-catalog.js';

/** The shared CORE country policy is authoritative for all territory labels.
 * The existing public static module is the only approved geographic catalog;
 * candidate datasets must never be returned by this directory.
 */
export function territoryDirectory(code:unknown){
 const country=requestCountry(code);
 const config=countryConfiguration(country);
 const catalog:unknown=territoryCatalog;
 const data=catalog as {version?:number;level?:string;countries?:Record<string,{regions?:unknown[];source?:unknown}>}|null;
 const ready=data?.version===1&&data.level==='ADM1'&&INITIAL_COUNTRIES.every(c=>Array.isArray(data.countries?.[c]?.regions)&&Boolean(data.countries?.[c]?.regions?.length)&&Boolean(data.countries?.[c]?.source));
 return {country,name:config.name,locationLabels:config.locationLabels,regionCatalogReady:ready,
 regions:ready?data!.countries![country].regions!:[],source:ready?data!.countries![country].source:null};
}
export function territoryFieldLabels(){
 return Object.fromEntries(INITIAL_COUNTRIES.map(code=>[code,countryConfiguration(code).locationLabels]));
}
