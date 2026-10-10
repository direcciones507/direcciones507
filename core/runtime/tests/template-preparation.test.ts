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
