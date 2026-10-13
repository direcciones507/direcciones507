// Disposable HTTPS fixture: same legacy handlers, real local PG, fake OpenAI only.
const database=new URL(process.env.DATABASE_URL!);
if(!['localhost','127.0.0.1'].includes(database.hostname)||process.env.AD507_TEST_NATALIE_FIXTURE!=='true')throw Error('LOCAL_FIXTURE_REQUIRED');
const serve=Bun.serve.bind(Bun);
(Bun as any).serve=(options:any)=>serve({...options,hostname:'127.0.0.1',port:0,tls:{cert:Bun.file(process.argv[2]),key:Bun.file(process.argv[3])}});
globalThis.fetch=(async(input:any,init:any)=>{
 if(String(input)!=='https://api.openai.com/v1/responses')throw Error('EXTERNAL_NETWORK_DENIED');
 const request=JSON.parse(init.body);if(request.model!=='gpt-5.6-luna'||request.max_output_tokens!==160||request.tools||request.reasoning.effort!=='none')throw Error('PROVIDER_GUARD_CHANGED');
 await new Promise(r=>setTimeout(r,100));
 if(request.input.includes('fallo proveedor'))return Response.json({error:'fixture'},{status:503});
 return Response.json({output_text:'AD507 es una dirección digital para encontrar y compartir una ubicación.',model:'gpt-5.6-luna',usage:{input_tokens:100,output_tokens:20,total_tokens:120}});
}) as typeof fetch;
const {startLegacyCore}=await import('../../legacy');
const {handleUserPanel}=await import('../../user-panel');
const server=startLegacyCore(async req=>handleUserPanel(req,{} as any,{} as any));
console.log('FIXTURE_PORT='+server.port);
