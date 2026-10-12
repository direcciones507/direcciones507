/** Narrow, reviewed Natalie fixes against the immutable deployed snapshot. */
export function applyReviewedNatalieCorrections(source:string){
 const count='(SELECT count(*) FROM ad507.ad507_agent_permissions ap ';
 const claimMarker='audit(CONVERSATION_AUDIT.memory, {';
 const completion="WHERE session_id=$1 AND status='active' AND in_flight=false AND completed_responses<claimed_messages ";
 const dispatch='if (url.pathname === SESSION_ROUTE && req.method === "POST") { return handleControlledSession(req); }';
 if(source.split(count).length!==3||source.split(claimMarker).length!==2||source.split(completion).length!==2||source.split(dispatch).length!==2)throw Error('NATALIE_CORRECTION_BASELINE_MISMATCH');
 // postgres.js returns int8 COUNT as a string; the strict zero guard needs int4.
 const claim='const claim = await sql.unsafe("UPDATE ad507.ad507_controlled_conversations SET status=\'active\',in_flight=true,claimed_messages=claimed_messages+1 WHERE session_id=$1 AND user_id=$2 AND organization_id=$3 AND product_id=$4 AND agent_id=$5 AND permission=$6 AND authorized=true AND revoked=false AND status IN (\'authorized\',\'active\') AND in_flight=false AND max_user_messages=3 AND claimed_messages<3 AND completed_responses<3 AND claimed_messages=completed_responses RETURNING claimed_messages", [sessionId, RESERVED_USER, scope.organization_id, scope.product_id, scope.agent_id, SESSION_PERMISSION]); if (claim.length !== 1) return convReject("SESSION_NOT_AUTHORIZED_ACTIVE_OR_AVAILABLE", 403); ';
 return source.replaceAll(count,'(SELECT count(*)::int FROM ad507.ad507_agent_permissions ap ')
  .replace(claimMarker,claim+claimMarker)
  .replace(dispatch,dispatch+' if (url.pathname === CONVERSATION_ROUTE && req.method === "POST") { return handleControlledConversation(req, startedAt); }')
  .replace(completion,"WHERE session_id=$1 AND status='active' AND in_flight=true AND authorized=true AND revoked=false AND completed_responses<claimed_messages ");
}
