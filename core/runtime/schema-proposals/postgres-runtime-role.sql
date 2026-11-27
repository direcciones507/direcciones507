-- OPERATOR REVIEW ONLY. Never execute at application startup or during deployment.
-- Creates a NOLOGIN capability role; does not create a password or switch any service.
-- One atomic statement: fail closed if existing grants or schema differ from the proposal.
DO $role$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='ad507_runtime') THEN
  RAISE EXCEPTION 'RUNTIME_ROLE_ALREADY_EXISTS';
 END IF;
 IF to_regnamespace('ad507') IS NULL OR to_regnamespace('radar') IS NULL
    OR to_regclass('ad507.schema_migrations') IS NULL THEN
  RAISE EXCEPTION 'RUNTIME_SCHEMA_NOT_READY';
 END IF;
 CREATE ROLE ad507_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
 EXECUTE format('GRANT CONNECT ON DATABASE %I TO ad507_runtime',current_database());
 GRANT USAGE ON SCHEMA ad507,radar TO ad507_runtime;
 -- Compatibility baseline: restrict operations to current application schemas.
 -- No ownership, DDL, TRUNCATE, grant option, or automatic future-table grants.
 GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA ad507,radar TO ad507_runtime;
 GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA ad507,radar TO ad507_runtime;
 REVOKE INSERT,UPDATE,DELETE ON ad507.schema_migrations FROM ad507_runtime;
 IF to_regclass('ad507.pagadito_certification_relay') IS NOT NULL THEN
  REVOKE ALL ON ad507.pagadito_certification_relay FROM ad507_runtime;
 END IF;
 IF to_regclass('ad507.pagadito_certification_history') IS NOT NULL THEN
  REVOKE ALL ON ad507.pagadito_certification_history FROM ad507_runtime;
 END IF;
 IF has_schema_privilege('ad507_runtime','public','CREATE')
    OR has_schema_privilege('ad507_runtime','ad507','CREATE')
    OR has_schema_privilege('ad507_runtime','radar','CREATE')
    OR has_database_privilege('ad507_runtime',current_database(),'CREATE')
    OR has_table_privilege('ad507_runtime','ad507.schema_migrations','INSERT,UPDATE,DELETE')
    OR EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('ad507','radar') AND c.relkind IN ('r','p')
      AND (pg_has_role('ad507_runtime',c.relowner,'USAGE')
       OR has_table_privilege('ad507_runtime',c.oid,'TRUNCATE')
       OR has_table_privilege('ad507_runtime',c.oid,'SELECT WITH GRANT OPTION')
       OR has_table_privilege('ad507_runtime',c.oid,'INSERT WITH GRANT OPTION')
       OR has_table_privilege('ad507_runtime',c.oid,'UPDATE WITH GRANT OPTION')
       OR has_table_privilege('ad507_runtime',c.oid,'DELETE WITH GRANT OPTION'))) THEN
  RAISE EXCEPTION 'RUNTIME_INHERITED_PRIVILEGES_REQUIRE_REVIEW';
 END IF;
END
$role$;
