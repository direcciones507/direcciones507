import {test,expect} from 'bun:test';
import {countries,withTerritoryCatalog,searchContext} from '../radar/ui/ui-model.js';
const fixture=()=>({version:1,level:'ADM1',countries:Object.fromEntries(Object.keys(countries).map(code=>[code,{source:{attribution:'Fixture de prueba',license:'Test'},regions:[{id:code+'-test',name:'Región sintética',bounds:[[-80,8],[-79,9]]}]}]))});
test('missing catalog retains original city views',()=>{
 expect(withTerritoryCatalog(countries,null)).toBe(countries);
 expect(countries.PA.views[0].name).toBe('Ciudad de Panamá');
 expect(searchContext('cafés en David','PA').view?.name).toBe('David');
});
test('complete local catalog appends regional options without replacing cities',()=>{
 const merged=withTerritoryCatalog(countries,fixture());
 for(const code of Object.keys(countries)){
  expect(merged[code].views.slice(0,countries[code].views.length)).toEqual(countries[code].views);
  expect(merged[code].views.at(-1)?.kind).toBe('region');
  expect(merged[code].territorySource.attribution).toBe('Fixture de prueba');
 }
});
test('partial or malformed data does not become visible',()=>{
 const partial=fixture();delete partial.countries.PA;
 expect(withTerritoryCatalog(countries,partial)).toBe(countries);
 const malformed=fixture();malformed.countries.PA.regions[0].bounds=[[-80,9],[-79,8]];
 expect(withTerritoryCatalog(countries,malformed)).toBe(countries);
});
