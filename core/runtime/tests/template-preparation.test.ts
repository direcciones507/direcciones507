import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
const template = readFileSync(new URL('../../../ad507.template.html',import.meta.url),'utf8');
test('prepared public template scripts parse and fixed telephone has no empty placeholder', () => {
  for(const script of template.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) expect(() => new Function(script[1])).not.toThrow();
  expect(template).toContain('id="btnLandline" class="btn-action-triple" hidden');
  expect(template).toContain("button.href = 'tel:+' + landline");
  expect(template).toContain('data.telefonoFijo || data.landlinePhone || data.landline_phone');
  expect(template).toContain('imgElement.onerror');
  expect(template).toContain('parsed.protocol !== \'https:\'');
});


test('Premium photo gallery hides the horizontal scrollbar without disabling swipe', () => {
  const tabletRule = template.match(/#galeriaFotos\.negocio-galeria\s*\{([^}]+)\}/);
  expect(tabletRule).not.toBeNull();
  expect(tabletRule![1]).toContain('overflow-x:auto !important');
  expect(tabletRule![1]).toContain('scrollbar-width:none');
  expect(tabletRule![1]).toContain('touch-action:pan-x pan-y');
  expect(template).toContain('#galeriaFotos.negocio-galeria::-webkit-scrollbar { display:none; width:0; height:0; }');
  expect(template).not.toContain('scrollbar-width:thin');
});
