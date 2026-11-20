import {test,expect} from 'bun:test';
import {buildTerritoryCatalog,iso3} from '../radar/scripts/build-territory-catalog.mjs';
function fixtures(){
 return Object.fromEntries(Object.entries(iso3).map(([country,iso])=>[country,{reviewed:true,expectedCount:1,attribution:'Synthetic test data only',metadata:{boundaryISO:iso,boundaryType:'ADM1',boundaryID:iso+'-TEST',admUnitCount:'1',boundaryYearRepresented:'2026',boundaryLicense:'Test',boundarySource:'Test',licenseSource:'https://example.test'},geometry:{type:'FeatureCollection',features:[{type:'Feature',properties:{shapeID:iso+'-1',shapeName:'Región de prueba'},geometry:{type:'Polygon',coordinates:[[[-80.123456,8.123456],[-79,8],[-79,9],[-80.123456,8.123456]]]}}]}}]));
}
test('builds deterministic camera bounds only for complete reviewed sources',()=>{
 const input=fixtures(),value=buildTerritoryCatalog(input);
 expect(Object.keys(value.countries)).toEqual(Object.keys(iso3));
 expect(value.countries.PA.regions[0].bounds).toEqual([[-80.12346,8],[-79,9]]);
 expect(value.countries.PA.source.attribution).toBe('Synthetic test data only');
});
test('refuses missing countries, missing attribution, wrong counts and unreviewed releases',()=>{
 for(const edit of [(i:any)=>delete i.PA,(i:any)=>i.PA.reviewed=false,(i:any)=>i.PA.attribution='',(i:any)=>i.PA.expectedCount=2]){
  const input=fixtures();edit(input);expect(()=>buildTerritoryCatalog(input)).toThrow();
 }
});
test('rejects invalid coordinates and duplicate region identifiers',()=>{
 const input=fixtures();input.PA.geometry.features[0].geometry.coordinates[0][0][0]=999;
 expect(()=>buildTerritoryCatalog(input)).toThrow();
 const duplicate=fixtures();duplicate.PA.geometry.features.push(duplicate.PA.geometry.features[0]);duplicate.PA.expectedCount=2;(duplicate.PA.metadata as any).admUnitCount='2';
 expect(()=>buildTerritoryCatalog(duplicate)).toThrow();
});
