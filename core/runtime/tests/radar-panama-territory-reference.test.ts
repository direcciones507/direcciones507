import {test,expect} from 'bun:test';
import {panamaAdm1Names,comparePanamaAdm1Names} from '../radar/scripts/panama-territory-reference.mjs';
test('official Panama first-level reference requires ten provinces and three provincial comarcas',()=>{
 expect(panamaAdm1Names.length).toBe(13);
 expect(comparePanamaAdm1Names([...panamaAdm1Names]).complete).toBe(true);
 expect(comparePanamaAdm1Names(panamaAdm1Names.filter(n=>n!=='Panamá Oeste')).missing).toEqual(['Panamá Oeste']);
});
test('does not accept duplicates, water records or subordinate units as substitutes',()=>{
 const input=panamaAdm1Names.filter(n=>n!=='Panamá Oeste').concat('Naso Tjër Di','Panamá');
 const r=comparePanamaAdm1Names(input);
 expect(r.complete).toBe(false);
 expect(r.missing).toEqual(['Panamá Oeste']);
 expect(r.unexpected).toEqual(['Naso Tjër Di']);
 expect(r.duplicates).toEqual(['Panamá']);
});
