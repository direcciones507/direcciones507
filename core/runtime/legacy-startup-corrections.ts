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
 return source.replace(ddl,'').replaceAll(normalization,'');
}
