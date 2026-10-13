// @bun
// scripts/natalie-diagnostic.ts
import postgres from "postgres";
async function diagnoseNatalie(sql, env) {
  const configuration = { providerCredentialPresent: Boolean(env.OPENAI_API_KEY), modelMatches: (env.AD507_OPENAI_MODEL ?? "gpt-5.6-luna") === "gpt-5.6-luna", reasoningMatches: (env.AD507_REASONING_EFFORT ?? "none") === "none", tokenLimitMatches: Number(env.AD507_OPENAI_MAX_OUTPUT_TOKENS ?? 160) === 160, budgetMatches: Number(env.AD507_OPENAI_MAX_ESTIMATED_COST_USD ?? 0.0017) === 0.0017, latamOriginEnabled: env.AD507_INTERNATIONAL_DOMAIN_VERIFIED === "true" };
  return sql.begin("isolation level repeatable read read only", async (tx) => {
    await tx.unsafe("SET LOCAL statement_timeout='5000'");
    const scopes = await tx.unsafe("SELECT a.status,(SELECT count(*) FROM ad507.ad507_agent_permissions ap WHERE ap.organization_id=o.organization_id AND ap.product_id=p.product_id AND ap.agent_id=a.agent_id AND ap.status='active') AS active_permissions,(SELECT count(*)::int FROM ad507.ad507_memory m WHERE m.organization_id=o.organization_id AND m.product_id=p.product_id AND m.agent_id=a.agent_id AND m.session_id IS NULL AND m.memory_scope='agent' AND m.memory_type='knowledge' AND m.source='official_ad507_knowledge_v1' AND m.priority=10 AND m.metadata @> $4::jsonb AND (m.expires_at IS NULL OR m.expires_at>now())) AS official_count FROM ad507.ad507_organizations o JOIN ad507.ad507_products p ON p.organization_id=o.organization_id AND p.product_key=$1 JOIN ad507.ad507_agents a ON a.organization_id=o.organization_id AND a.product_id=p.product_id AND a.agent_key=$2 WHERE o.organization_key=$3", ["direcciones507", "natalie", "ad507", JSON.stringify({ authority: "official", version: "1.0", shared: false, session_scoped: false })]);
    const row = scopes[0], reasons = [];
    if (scopes.length !== 1)
      reasons.push(scopes.length ? "SCOPE_AMBIGUOUS" : "SCOPE_NOT_FOUND");
    if (row) {
      if (row.status !== "draft")
        reasons.push("AGENT_STATUS_NOT_DRAFT");
      if (Number(row.active_permissions) !== 0)
        reasons.push("ACTIVE_PERMISSIONS_PRESENT");
      if (row.active_permissions !== 0 && Number(row.active_permissions) === 0)
        reasons.push("COUNT_INT8_STRING_STRICT_COMPARISON");
      if (row.official_count !== 10)
        reasons.push("OFFICIAL_KNOWLEDGE_COUNT_INVALID");
    }
    for (const [key, value] of Object.entries(configuration))
      if (!value && key !== "latamOriginEnabled")
        reasons.push("CONFIG_" + key.toUpperCase());
    return { configuration, scopeCount: scopes.length, agentStatus: row?.status ?? null, activePermissionCount: row ? Number(row.active_permissions) : null, driverCountType: row ? typeof row.active_permissions : null, officialKnowledgeCount: row?.official_count ?? null, reasons, correctedScopeReady: scopes.length === 1 && row?.status === "draft" && Number(row.active_permissions) === 0 };
  });
}
if (import.meta.main) {
  if (!process.env.DATABASE_URL) {
    console.log(JSON.stringify({ ok: false, error: "DATABASE_URL_REQUIRED" }));
    process.exitCode = 1;
  } else {
    const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 10, application_name: "ad507-natalie-read-only-diagnostic" });
    try {
      console.log(JSON.stringify({ ok: true, ...await diagnoseNatalie(sql, process.env) }));
    } catch {
      console.log(JSON.stringify({ ok: false, error: "NATALIE_DIAGNOSTIC_QUERY_UNAVAILABLE" }));
      process.exitCode = 1;
    } finally {
      await sql.end({ timeout: 2 });
    }
  }
}
export {
  diagnoseNatalie
};
