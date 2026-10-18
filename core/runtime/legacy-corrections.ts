/** Keep visits out of the four pre-existing interaction-only historical queries. */
export function preserveHistoricalAnalytics(source:string){
 const marker='WHERE ad507_code=$1';
 if(source.split(marker).length!==5)throw Error('HISTORICAL_ANALYTICS_QUERY_BASELINE_MISMATCH');
 return source.replaceAll(marker,marker+" AND event_type<>'visit'");
}
/** Narrow, reviewed Natalie fixes against the immutable deployed snapshot. */
/** Remove only the 34 DDL and two literal normalization statements recorded in the immutable legacy snapshot.
 * Runtime must use an already provisioned schema; no bootstrap flag or automatic migration path.
 */
export function removeAutomaticLegacyBootstrap(source:string){
 const ddl=/await sql\.unsafe\(\s*"(?:CREATE (?:UNIQUE )?(?:TABLE|INDEX)|ALTER TABLE)\b[\s\S]*?\);/g;
 const matches=source.match(ddl)??[];
 if(matches.length!==34)throw Error('LEGACY_STARTUP_DDL_BASELINE_MISMATCH');
 const normalization=`await sql.unsafe( "UPDATE ad507.ad507_residential_pin_credentials SET residential_code=upper(trim(authorized_payload->>'codigo')) " + "WHERE authorized_payload->>'codigo' IS NOT NULL AND residential_code IS DISTINCT FROM upper(trim(authorized_payload->>'codigo'))" );`;
 if(source.split(normalization).length!==3)throw Error('LEGACY_STARTUP_NORMALIZATION_BASELINE_MISMATCH');
 return preserveHistoricalAnalytics(source.replace(ddl,'').replaceAll(normalization,''));
}
export function applyReviewedNatalieCorrections(source:string){
 const count='(SELECT count(*) FROM ad507.ad507_agent_permissions ap ';
 const claimMarker='audit(CONVERSATION_AUDIT.memory, {';
 const completion="WHERE session_id=$1 AND status='active' AND in_flight=false AND completed_responses<claimed_messages ";
 const dispatch='if (url.pathname === SESSION_ROUTE && req.method === "POST") { return handleControlledSession(req); }';
 if(source.split(count).length!==3||source.split(claimMarker).length!==2||source.split(completion).length!==2||source.split(dispatch).length!==2)throw Error('NATALIE_CORRECTION_BASELINE_MISMATCH');
 // postgres.js returns int8 COUNT as a string; the strict zero guard needs int4.
 const claim='const claim = await sql.unsafe("UPDATE ad507.ad507_controlled_conversations SET status=\'active\',in_flight=true,claimed_messages=claimed_messages+1 WHERE session_id=$1 AND user_id=$2 AND organization_id=$3 AND product_id=$4 AND agent_id=$5 AND permission=$6 AND authorized=true AND revoked=false AND status IN (\'authorized\',\'active\') AND in_flight=false AND max_user_messages=3 AND claimed_messages<3 AND completed_responses<3 AND claimed_messages=completed_responses RETURNING claimed_messages", [sessionId, RESERVED_USER, scope.organization_id, scope.product_id, scope.agent_id, SESSION_PERMISSION]); if (claim.length !== 1) return convReject("SESSION_NOT_AUTHORIZED_ACTIVE_OR_AVAILABLE", 403); ';
 return removeAutomaticLegacyBootstrap(source.replaceAll(count,'(SELECT count(*)::int FROM ad507.ad507_agent_permissions ap ')
  .replace(claimMarker,claim+claimMarker)
  .replace(dispatch,dispatch+' if (url.pathname === CONVERSATION_ROUTE && req.method === "POST") { return handleControlledConversation(req, startedAt); }')
  .replace(completion,"WHERE session_id=$1 AND status='active' AND in_flight=true AND authorized=true AND revoked=false AND completed_responses<claimed_messages "));
}
