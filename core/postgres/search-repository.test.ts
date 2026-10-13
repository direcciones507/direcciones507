import assert from "node:assert/strict";
import test from "node:test";
import { searchPublicDirectory } from "./search-repository";

function fakeSql(rows: unknown[]) {
  let captured = "";
  const sql = async (strings: TemplateStringsArray, ...values: unknown[]) => {
    captured = strings.reduce((out, part, i) => out + part + (i < values.length ? String(values[i]) : ""), "");
    return rows;
  };
  return { sql: sql as any, query: () => captured };
}

test("rejects invalid search queries without touching PostgreSQL", async () => {
  let called = false;
  const sql = (async () => { called = true; return []; }) as any;
  assert.deepEqual(await searchPublicDirectory(sql, " "), []);
  assert.equal(called, false);
});

test("caps requested result limit", async () => {
  const db = fakeSql([]);
  await searchPublicDirectory(db.sql, "parque", 500);
  assert.match(db.query(), /LIMIT 50/);
});

test("query is structurally restricted to ACTIVE public BUSINESS and PLACE records", async () => {
  const db = fakeSql([]);
  await searchPublicDirectory(db.sql, "central");
  const query = db.query();
  assert.match(query, /a\.status = 'ACTIVE'/);
  assert.match(query, /a\.address_type IN \('BUSINESS', 'PLACE'\)/);
  assert.match(query, /pc\.capability = 'public_indexing'/);
  assert.doesNotMatch(query, /RESIDENTIAL/);
});

test("maps only public search fields", async () => {
  const db = fakeSql([{ code: "AD507-TEST", address_type: "PLACE", name: "Parque Central", reference: "Frente a la iglesia" }]);
  assert.deepEqual(await searchPublicDirectory(db.sql, "parque"), [{ code: "AD507-TEST", type: "PLACE", name: "Parque Central", reference: "Frente a la iglesia" }]);
});
