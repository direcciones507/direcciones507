/** Offline connection seam only. Commercial approval and provider contract are still pending.
 * Not imported by server, routes, payment factories or UI. No HTTP client or webhook exists.
 */
export const PAGADITO_ENABLED_BY_DEFAULT=false;
export const PAGADITO_ENVIRONMENT_KEYS=Object.freeze([
 'AD507_PAGADITO_ENABLED','AD507_PAGADITO_ENVIRONMENT',
 'AD507_PAGADITO_UID','AD507_PAGADITO_WSK'
]);
export function createInactivePagaditoAdapter(){
 return Object.freeze({provider:'PAGADITO',enabled:false,status:'PENDING_COMMERCIAL_APPROVAL'});
}
