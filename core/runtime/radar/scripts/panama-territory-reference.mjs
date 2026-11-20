import {readFileSync} from 'node:fs';
const reference=JSON.parse(readFileSync(new URL('../data/panama-adm1-reference.json',import.meta.url),'utf8'));
export const panamaAdm1Names=Object.freeze(reference.names);
export function comparePanamaAdm1Names(names){
 if(!Array.isArray(names)||names.some(n=>typeof n!=='string'))throw Error('Panama names must be strings');
 const canonical=n=>n.normalize('NFC').trim().toLocaleLowerCase('es');
 const expected=new Map(panamaAdm1Names.map(n=>[canonical(n),n]));
 const seen=new Set(),duplicates=[],unexpected=[];
 for(const raw of names){
  const key=canonical(raw);
  if(seen.has(key))duplicates.push(raw);
  seen.add(key);
  if(!expected.has(key))unexpected.push(raw);
 }
 const missing=[...expected].filter(([key])=>!seen.has(key)).map(([,n])=>n);
 return {complete:missing.length===0&&unexpected.length===0&&duplicates.length===0,missing,unexpected,duplicates};
}
