import {test,expect} from 'bun:test';
import {createAccountMailer} from '../account-email';
test('Resend uses prepared sender, rejects delivery errors and fails closed without configuration',async()=>{
 const calls:any[]=[];const request=(async(url:any,options:any)=>{calls.push({url,...options});return Response.json({id:'test'});}) as typeof fetch;
 const mail={to:'test@example.test',subject:'Verificación',text:'https://direcciones.lat/verificar-correo'};
 expect(await createAccountMailer({},request).send(mail)).toEqual({sent:false,reason:'EMAIL_NOT_CONFIGURED'});
 const configured=createAccountMailer({RESEND_API_KEY:'test-key',EMAIL_FROM:'no-reply@example.test'},request);
 expect(await configured.send(mail)).toEqual({sent:true});expect(calls[0].url).toBe('https://api.resend.com/emails');expect(JSON.parse(calls[0].body).to).toEqual([mail.to]);
 await expect(createAccountMailer({RESEND_API_KEY:'test-key',EMAIL_FROM:'no-reply@example.test'},(async()=>new Response('',{status:403})) as typeof fetch).send(mail)).rejects.toThrow('EMAIL_DELIVERY_FAILED');
});
