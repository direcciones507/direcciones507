import { expect, test } from 'bun:test';
import { inspectImage, prepareContacts, mediaCountAllowed } from '../panel-preparation';

test('main contact and fixed telephone remain independent and absent contacts stay null', () => {
  expect(prepareContacts('6999-1234', '998-1234')).toEqual({phone:'+50769991234',landlinePhone:'+5079981234'});
  expect(prepareContacts('', '')).toEqual({phone:null,landlinePhone:null});
  expect(prepareContacts('', '9981234').phone).toBeNull();
  expect(() => prepareContacts('javascript:alert(1)', '')).toThrow('INVALID_PHONE');
  expect(() => prepareContacts('', '123')).toThrow('INVALID_PHONE');
});
test('image content, MIME and exact size limits agree; forged MIME, empty files and SVG fail', () => {
  const png = new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
  const jpg = new Uint8Array([255,216,255,224,0,0,0,0,0,0,0,0]);
  const webp = new TextEncoder().encode('RIFFxxxxWEBP');
  for (const [bytes,mime] of [[png,'image/png'],[jpg,'image/jpeg'],[webp,'image/webp']] as const) {
    expect(inspectImage(bytes,mime,12)).toBe(true);
    expect(inspectImage(bytes,mime,8*1024*1024)).toBe(true);
    expect(inspectImage(bytes,mime,8*1024*1024+1)).toBe(false);
  }
  expect(inspectImage(png,'image/jpeg',12)).toBe(false);
  expect(inspectImage(new TextEncoder().encode('<svg onload="evil">'),'image/png',18)).toBe(false);
  expect(inspectImage(png,'image/svg+xml',12)).toBe(false);
  expect(inspectImage(new Uint8Array(),'image/png',0)).toBe(false);
});
test('Gallery quota excludes separate logo and cover inputs', () => {
  expect(mediaCountAllowed('PLACE','',0)).toBe(true);
  expect(mediaCountAllowed('PLACE','',1)).toBe(false);
  expect(mediaCountAllowed('BUSINESS','BUSINESS_PREMIUM_PRO',5)).toBe(true);
  expect(mediaCountAllowed('BUSINESS','BUSINESS_PREMIUM_PRO',6)).toBe(false);
  for(const plan of ['BUSINESS_FREE','BUSINESS_PREMIUM']) expect(mediaCountAllowed('BUSINESS',plan,1)).toBe(false);
  expect(mediaCountAllowed('RESIDENTIAL','RESIDENTIAL',1)).toBe(false);
});

test('rendered coordinate parser preserves regex escapes and geographical bounds', async () => {
  const { userPanelHtml } = await import('../user-panel');
  const source = userPanelHtml.slice(userPanelHtml.indexOf('function coordinates()'),userPanelHtml.indexOf('function applyPlanFields'));
  const parse = (value: string) => new Function('$',source+'; return coordinates()')(() => ({value}));
  expect(parse('8.123778, -80.967222')).toEqual({latitude:8.123778,longitude:-80.967222});
  expect(parse(' 8.12 ; -80.9 ')).toEqual({latitude:8.12,longitude:-80.9});
  expect(parse('91, -80')).toBeNull();
  expect(parse('8, -181')).toBeNull();
  expect(parse('nonsense')).toBeNull();
});
