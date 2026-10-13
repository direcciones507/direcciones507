import assert from "node:assert/strict";
import test from "node:test";
import { getPublicationMetadataByCode } from "./publication-repository";

function fakeSql(rows: unknown[]) {
  let captured = "";
  const sql = async (strings: TemplateStringsArray, ...values: unknown[]) => {
    captured = strings.reduce((out, part, i) => out + part + (i < values.length ? String(values[i]) : ""), "");
    return rows;
  };
  return { sql: sql as any, query: () => captured };
}

test("invalid AD507 code resolves null without querying PostgreSQL", async () => {
  let called = false;
  const sql = (async () => { called = true; return []; }) as any;
  assert.equal(await getPublicationMetadataByCode(sql, "not-a-code"), null);
  assert.equal(called, false);
});

test("publication lookup is restricted to ACTIVE BUSINESS and PLACE", async () => {
  const db = fakeSql([]);
  await getPublicationMetadataByCode(db.sql, "AD507-0001");
  const query = db.query();
  assert.match(query, /a\.status = 'ACTIVE'/);
  assert.match(query, /a\.address_type IN \('BUSINESS', 'PLACE'\)/);
  assert.doesNotMatch(query, /RESIDENTIAL/);
});

test("returns canonical publication metadata without private address fields", async () => {
  const db = fakeSql([{ code: "AD507-0001", updated_at: "2026-10-05T12:00:00.000Z", public_indexing: true }]);
  assert.deepEqual(await getPublicationMetadataByCode(db.sql, " ad507-0001 "), {
    code: "AD507-0001",
    canonicalPath: "/AD507-0001/",
    indexable: true,
    updatedAt: "2026-10-05T12:00:00.000Z",
  });
});

test("missing or non-public lifecycle record resolves null", async () => {
  const db = fakeSql([]);
  assert.equal(await getPublicationMetadataByCode(db.sql, "AD507-9999"), null);
});
