// Bound input while reading, rather than buffering an unlimited request before checking length.
 export async function readRadarJson(req:Request,maxBytes:number):Promise<{ok:true;body:unknown}|{ok:false;status:number;error:string}>{
  const tooLarge={ok:false as const,status:413,error:"BODY_TOO_LARGE"};
  const invalid={ok:false as const,status:400,error:"INVALID_BODY"};
  const declared=req.headers.get("content-length");
  if(declared!==null&&Number(declared)>maxBytes)return tooLarge;
  if(!req.body)return invalid;
  const reader=req.body.getReader();let total=0;const decoder=new TextDecoder("utf-8",{fatal:true});let raw="";
  try{
   while(true){const {done,value}=await reader.read();if(done)break;
    total+=value.byteLength;if(total>maxBytes){void reader.cancel().catch(()=>{});return tooLarge;}
    raw+=decoder.decode(value,{stream:true});
   }
   raw+=decoder.decode();
   return {ok:true,body:JSON.parse(raw)};
  }catch{void reader.cancel().catch(()=>{});return invalid;}
  finally{reader.releaseLock();}
 }
