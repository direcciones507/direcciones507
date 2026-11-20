import {test,expect} from 'bun:test';
import {buildPreviewTerritories} from '../radar/scripts/preview-territories.mjs';
import {countries,withTerritoryCatalog} from '../radar/ui/ui-model.js';
test('isolated geographic preview offers all 156 first-level units and preserves original city views',()=>{
 const catalog=buildPreviewTerritories(),views=withTerritoryCatalog(countries,catalog);
 expect(catalog.reviewStatus).toBe('PREVIEW_ONLY');
 expect(Object.values(catalog.countries).reduce((n,c)=>n+c.regions.length,0)).toBe(156);
 expect(views.PA.views.some(v=>v.name==='Panamá Oeste')).toBe(true);
 expect(views.CO.views.some(v=>v.name==='Bogotá, D.C.')).toBe(true);
 expect(views.MX.views.some(v=>v.name==='Ciudad de México'&&v.kind==='region')).toBe(true);
 expect(views.NI.views.some(v=>v.name==='Región Autónoma de la Costa Caribe Norte')).toBe(true);
 expect(views.PA.views[0].name).toBe(countries.PA.views[0].name);
 expect(views.PA.territorySource.license).toBe('ODbL-1.0');
 expect(views.CR.territorySource.license).toBe('CC0-1.0');
 expect(countries.PA.views.some(v=>v.name==='Panamá Oeste')).toBe(false);
});
