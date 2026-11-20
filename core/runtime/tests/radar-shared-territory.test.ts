import {test,expect} from 'bun:test';
import {INITIAL_COUNTRIES,countryConfiguration} from '../country-configuration';
import {territoryDirectory,territoryFieldLabels} from '../territory-directory';
import {registrationTerritoryLabels} from '../radar/ui/registration-form.js';
import {radarPresentation} from '../radar/presentation';
test('shared territory labels exactly reuse CORE policy in all initial countries',()=>{
 const labels=territoryFieldLabels();
 expect(Object.keys(labels)).toEqual([...INITIAL_COUNTRIES]);
 for(const code of INITIAL_COUNTRIES){
  const item=territoryDirectory(code);
  expect(item.locationLabels).toEqual(countryConfiguration(code).locationLabels);
  expect(registrationTerritoryLabels(labels,code)).toEqual([item.locationLabels[0],item.locationLabels[1]+' / localidad']);
  expect(item.regionCatalogReady).toBe(false);
  expect(item.regions).toEqual([]);
 }
 expect(()=>territoryDirectory('PE')).toThrow('INVALID_COUNTRY');
 expect(registrationTerritoryLabels({},'PA')).toEqual(['Provincia o división territorial','Localidad']);
});
test('Radar receives CORE territory policy without exposing candidate records',async()=>{
 const response=await radarPresentation(new Request('https://radar.direcciones.lat/'),{RADAR_ENABLED:'true'});
 const html=await response!.text();
 const raw=html.match(/<meta name="radar-territory-labels" content="([^"]+)">/)?.[1];
 expect(raw).toBeTruthy();
 expect(JSON.parse(raw!.replaceAll('&quot;','"').replaceAll('&amp;','&'))).toEqual(territoryFieldLabels());
 expect(html).not.toContain('REVIEW_REQUIRED');
});
