/** Billing exemption is an active database permission, never a browser flag. */
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function adminBillingExempt(sql:any,userId:string):Promise<boolean>{
 if(!uuid.test(userId))return false;
 const rows=await sql.unsafe("SELECT 1 FROM ad507.users u JOIN ad507.user_roles r ON r.user_id=u.id WHERE u.id=$1::uuid AND u.status='ACTIVE' AND r.role='ADMIN' LIMIT 1",[userId]);
 return rows.length>0;
}
export async function addressBillingExempt(sql:any,row:{id:string;request_data?:any},actorId?:string):Promise<boolean>{
 if(!uuid.test(row.id)||row.request_data?.migration)return false;
 const rows=await sql.unsafe("SELECT o.user_id::text FROM ad507.address_ownership o JOIN ad507.users u ON u.id=o.user_id JOIN ad507.user_roles r ON r.user_id=u.id WHERE o.address_id=$1::uuid AND o.ownership_role='OWNER' AND u.status='ACTIVE' AND r.role='ADMIN' LIMIT 1",[row.id]);
 return rows.length===1&&(!actorId||rows[0].user_id===actorId);
}
/** Gate provider entry points, leaving provider adapters and customer billing intact. */
export async function handleAdminBillingGuard(req:Request,sql:any,auth:{currentUser:(r:Request)=>Promise<any>}):Promise<Response|null>{
 const path=new URL(req.url).pathname;
 if(!/^\/(?:panel\/(?:payments|pagadito)\/|v1\/(?:user\/requests\/[a-f0-9-]{36}\/(?:payment|renewal|installment|advertising)|user\/pagadito\/))/.test(path))return null;
 const user=await auth.currentUser(req);
 if(!user?.roles.includes('ADMIN')||!await adminBillingExempt(sql,user.id))return null;
 return path.startsWith('/panel/')?new Response(null,{status:302,headers:{location:'/panel','cache-control':'no-store'}}):Response.json({ok:false,error:'ADMIN_PAYMENT_EXEMPT'},{status:409,headers:{'cache-control':'no-store'}});
}
