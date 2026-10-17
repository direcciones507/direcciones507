import postgres from 'postgres';
import {createPlanLifecycle} from '../plan-lifecycle';
import {configuredPlanPeriods} from '../plan-policy';
import {createPlanMailWorker} from '../plan-mail';
import {YAPPY_PAYMENTS_ENABLED,yappyConfiguration} from '../payment-policy';

// One bounded pass; schedule every 5 minutes using the existing Core image.
// No DDL, no migrations, no backfill, no provider charges, no secrets in logs.
if(process.env.AD507_PLAN_AUTOMATION_ENABLED!=='true'||process.env.AD507_COMMERCIAL_WORKFLOW_ENABLED!=='true')throw Error('PLAN_AUTOMATION_NOT_ENABLED');
const sql=postgres(process.env.DATABASE_URL!,{max:2,connect_timeout:5,idle_timeout:10,connection:{statement_timeout:'15000',lock_timeout:'5000'},application_name:'ad507-plan-worker'});
try{
 const providers=new Set<string>();
 if(YAPPY_PAYMENTS_ENABLED&&yappyConfiguration(process.env)?.environment==='production')providers.add('YAPPY');
 const lifecycle=createPlanLifecycle(sql,{periods:configuredPlanPeriods(process.env.AD507_PLAN_PERIODS_JSON),environment:'production',providers});
 await lifecycle.reconcile();
 const result=await createPlanMailWorker(sql,process.env).run();
 console.log(JSON.stringify({event:'plan_automation_pass',...result}));
}catch{console.error(JSON.stringify({event:'plan_automation_failed'}));process.exitCode=1;}finally{await sql.end();}
