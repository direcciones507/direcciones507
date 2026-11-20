import {validateBusiness} from "./business";
import {categoryRegistrationFields,capacityUnit} from "./ui/registration-form.js";
import {countries,validCoordinates,type Country} from "./domain";
export type RegistrationProfile={province:string;locality:string;description:string;phone:string;hours:Record<string,string>;socials:string[];extras:Record<string,string>;capacity?:{total:number;unit:string}};
export type EstablishmentDraft={name:string;category:string;country:Country;latitude:number;longitude:number;registrationKind?:"owner";profile?:RegistrationProfile};
export function validateRegistration(input:unknown):EstablishmentDraft|null{
 if(!input||typeof input!=="object"||Array.isArray(input))return null;
 const d=input as Record<string,unknown>;
 if(typeof d.name!=="string"||typeof d.category!=="string"||typeof d.country!=="string")return null;
 const name=d.name.trim(),category=d.category.trim(),country=d.country as Country;
 if(!name||name.length>160||!category||category.length>80||!countries.includes(country))return null;
 if(typeof d.latitude!=="number"||typeof d.longitude!=="number"||!validCoordinates(d.latitude,d.longitude))return null;
 const base={name,category,country,latitude:d.latitude,longitude:d.longitude};
 if(d.registrationKind!==undefined&&!['user','owner'].includes(String(d.registrationKind)))return null;
 if(d.registrationKind!=='owner')return d.profile===undefined?base:null;
 const profile=validateRegistrationProfile(d.profile,category);return profile?{...base,registrationKind:'owner',profile}:null;
}

export function validateRegistrationProfile(input:unknown,category:string):RegistrationProfile|null{
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 const p=input as Record<string,any>,text=(key:string,max:number)=>typeof p[key]==='string'&&p[key].trim().length<=max?p[key].trim():null;
 const province=text('province',100),locality=text('locality',160),description=text('description',1200),phone=text('phone',32);
 if(!province||!locality||!description||phone===null||(phone&&!/^[+0-9 ()-]{5,32}$/.test(phone)))return null;
 const business=validateBusiness({hours:p.hours,quantity:null,unit:'units'});if(!business)return null;
 if(!Array.isArray(p.socials)||p.socials.length>8||p.socials.some((v:any)=>typeof v!=='string')||p.socials.join('\n').length>1000)return null;
 const socials:string[]=[];for(const value of p.socials){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443'||value.length>250)return null;socials.push(u.href);}catch{return null;}}
 if(!p.extras||typeof p.extras!=='object'||Array.isArray(p.extras))return null;
 const definitions=Object.hasOwn(categoryRegistrationFields,category)?categoryRegistrationFields[category]:categoryRegistrationFields.other,keys=definitions.map(([key]:string[])=>key);
 if(Object.keys(p.extras).some(key=>!keys.includes(key)))return null;
 const extras:Record<string,string>={};for(const key of keys){const value=p.extras[key]??'';if(typeof value!=='string'||value.trim().length>250)return null;if(value.trim())extras[key]=value.trim();}
 let capacity:RegistrationProfile['capacity'];
 if(p.capacity!==undefined){const c=p.capacity;if(!c||typeof c!=='object'||Array.isArray(c)||!Number.isInteger(c.total)||c.total<0||c.total>100000||c.unit!==capacityUnit(category))return null;capacity={total:c.total,unit:c.unit};}
 const profile={province,locality,description,phone,hours:business.hours,socials,extras,...(capacity?{capacity}:{})};
 return new TextEncoder().encode(JSON.stringify(profile)).byteLength<=8000?profile:null;
}
