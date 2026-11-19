import {countries,validCoordinates,type Country} from "./domain";
export type EstablishmentDraft={name:string;category:string;country:Country;latitude:number;longitude:number};
export function validateRegistration(input:unknown):EstablishmentDraft|null{
 if(!input||typeof input!=="object"||Array.isArray(input))return null;
 const d=input as Record<string,unknown>;
 if(typeof d.name!=="string"||typeof d.category!=="string"||typeof d.country!=="string")return null;
 const name=d.name.trim(),category=d.category.trim(),country=d.country as Country;
 if(!name||name.length>160||!category||category.length>80||!countries.includes(country))return null;
 if(typeof d.latitude!=="number"||typeof d.longitude!=="number"||!validCoordinates(d.latitude,d.longitude))return null;
 return {name,category,country,latitude:d.latitude,longitude:d.longitude};
}
