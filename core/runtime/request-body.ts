export async function readRequestBody(req:Request,limit:number) {
  const reader=req.body?.getReader();if(!reader)throw Error('INVALID_REQUEST');
  const chunks:Uint8Array[]=[];let length=0;
  let expired=false;
  const timer=setTimeout(()=>{expired=true;reader.cancel().catch(()=>{});},20_000);
  try {while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();throw Error('PAYLOAD_TOO_LARGE');}chunks.push(value);}}finally{clearTimeout(timer);reader.releaseLock();}
  if(expired)throw Error('INVALID_REQUEST');
  return Buffer.concat(chunks);
}
