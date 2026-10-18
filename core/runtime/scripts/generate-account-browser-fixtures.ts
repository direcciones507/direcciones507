import {writeFileSync,readFileSync} from 'node:fs';
import {handleUserPanel,commercialEntryHtml,adminCreationHtml} from '../user-panel';
import {paymentPage} from '../payment-ui';
const fixtures:any={};
for(const [name,url] of Object.entries({pa:'https://direcciones507.com/panel',latam:'https://direcciones.lat/panel?country=PA&origin=507',cr:'https://direcciones.lat/panel?country=CR',plan:'https://direcciones.lat/panel?country=PA&origin=507&selectedPlan=BUSINESS_PREMIUM_PRO'})){
 const response=await handleUserPanel(new Request(url),null as any,null as any);
 fixtures[name]={html:await response!.text(),headers:Object.fromEntries(response!.headers)};
}
fixtures.commercial={html:commercialEntryHtml(true,new URL('https://direcciones.lat/')),headers:{}};
fixtures.payment={html:paymentPage('11111111-1111-4111-8111-111111111111','production'),headers:{}};
fixtures.admin={html:adminCreationHtml(),headers:{}};
fixtures.home507={html:readFileSync(new URL('../../../index.html',import.meta.url),'utf8'),headers:{}};
writeFileSync(process.env.ACCOUNT_FIXTURES||'/tmp/ad507-account-fixtures.json',JSON.stringify(fixtures));
