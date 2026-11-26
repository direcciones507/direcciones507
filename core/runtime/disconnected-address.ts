export function disconnectedAddressResponse(request:Request,html:boolean):Response {
 const headers={'cache-control':'no-store','x-robots-tag':'noindex, nofollow'};
 if(!html)return new Response(request.method==='HEAD'?null:JSON.stringify({ok:false,error:'ADDRESS_DISCONNECTED'}),{status:410,headers:{...headers,'content-type':'application/json'}});
 return new Response(request.method==='HEAD'?null:'<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Dirección desconectada</title></head><body><main><h1>Dirección desconectada</h1></main></body></html>',{status:410,headers:{...headers,'content-type':'text/html; charset=utf-8'}});
}
