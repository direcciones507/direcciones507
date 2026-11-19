import {renderTemporaryEventDraftForm,temporaryEventDraftClientScript} from '../temporary-event-form';
import {renderNewPublicAddress} from '../new-address-publication';
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
const oldEvents=process.env.AD507_TEMPORARY_EVENTS_ENABLED;process.env.AD507_TEMPORARY_EVENTS_ENABLED='true';fixtures.admin={html:adminCreationHtml(),headers:{}};if(oldEvents===undefined)delete process.env.AD507_TEMPORARY_EVENTS_ENABLED;else process.env.AD507_TEMPORARY_EVENTS_ENABLED=oldEvents;
fixtures.adminEvent={html:renderTemporaryEventDraftForm('/v1/user/temporary-events',false,true)+'<script>'+temporaryEventDraftClientScript+'</script>',headers:{}};
fixtures.businessIcons={html:renderNewPublicAddress({code:'AD507-N12345678',name:'Icon fixture',reference:'Synthetic',description:null,commercialDescription:null,type:'BUSINESS',plan:{code:'BUSINESS_PREMIUM_PRO',name:'Premium Pro'},url:'https://direcciones.lat/AD507-N12345678/',coordinates:{latitude:8,longitude:-80},phone:'+50760000000',landlinePhone:null,hours:'8 a 4',socials:[],media:[],publication:null,extras:{countryCode:'PA',historical:false,postalCode:null}} as any),headers:{}};
fixtures.home507={html:readFileSync(new URL('../../../index.html',import.meta.url),'utf8'),headers:{}};
writeFileSync(process.env.ACCOUNT_FIXTURES||'/tmp/ad507-account-fixtures.json',JSON.stringify(fixtures));
