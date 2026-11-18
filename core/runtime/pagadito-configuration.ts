import {createPagaditoRestClient} from './pagadito-rest-client';

type Environment='sandbox'|'production';
type Env=Record<string,string|undefined>;
/**
 * Single provider integration with separate environments and credentials.
 * Production is fail-closed until a deliberate post-certification release.
 * This configuration never enables checkout or deploys database migrations.
 */
export function pagaditoConfiguration(env:Env) {
  if(env.AD507_PAGADITO_ENABLED!=='true')return null;
  const environment=env.AD507_PAGADITO_ENVIRONMENT;
  if(environment!=='sandbox'&&environment!=='production')
    throw Error('INVALID_PAGADITO_ENVIRONMENT');
  if(environment==='production'&&(
    env.AD507_PAGADITO_PRODUCTION_APPROVED!=='true'||
    env.AD507_PAGADITO_PRODUCTION_RELEASE_ENABLED!=='true'
  ))throw Error('PAGADITO_PRODUCTION_LOCKED');
  const prefix=environment==='sandbox'?'AD507_PAGADITO_SANDBOX_':'AD507_PAGADITO_PRODUCTION_';
  const uid=env[prefix+'UID']?.trim();
  const wsk=env[prefix+'WSK']?.trim();
  if(!uid||!wsk||uid.length>512||wsk.length>2048)
    throw Error('INVALID_PAGADITO_CREDENTIALS');
  return {environment:environment as Environment,uid,wsk};
}
export function createConfiguredPagaditoClient(env:Env){
  const config=pagaditoConfiguration(env);
  return config?createPagaditoRestClient(config):null;
}
