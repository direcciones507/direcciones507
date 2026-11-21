import {test} from 'bun:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createRadarRepository} from '../radar/repository';

test('Radar map uses the canonical UUID type for commercial detail ownership', async () => {
 const pg = new PGlite();
 try {
  await pg.exec('CREATE SCHEMA ad507; CREATE TABLE ad507.users(id uuid PRIMARY KEY);');
  for (const name of ['0009_radar_schema', '0010_radar_core_constraints', '0011_radar_ownership', '0016_radar_business_details']) {
   const path = new URL('../../../db/migrations/' + name + '.sql', import.meta.url);
   await pg.exec(readFileSync(path, 'utf8'));
  }
  const submitter = '00000000-0000-4000-8000-000000000001';
  const otherAccount = '00000000-0000-4000-8000-000000000002';
  await pg.query('INSERT INTO ad507.users(id) VALUES($1),($2)', [submitter, otherAccount]);
  await pg.query(`INSERT INTO radar.establishments(account_ref,name,category,country,latitude,longitude,published)
   VALUES($1,'Fixture A','shop','PA',8,-80,true),($1,'Fixture B','shop','PA',8,-80,true)`, [submitter]);
  await pg.query(`INSERT INTO radar.business_details(establishment_id,updated_by,quantity)
   SELECT id,CASE WHEN name='Fixture A' THEN $1::uuid ELSE $2::uuid END,5 FROM radar.establishments`, [submitter, otherAccount]);

  const db = {unsafe: async (query: string, params: unknown[]) => (await pg.query(query, params)).rows as any[]};
  const repo = createRadarRepository(db, true, undefined, true);
  const rows = await repo.listPublished('PA', {west:-83,south:7,east:-77,north:10});
  assert.equal(rows.length, 2);
  assert.equal(rows.find(row => row.name === 'Fixture A')?.details?.quantity, 5);
  assert.equal(rows.find(row => row.name === 'Fixture B')?.details, undefined);
 } finally {
  await pg.close();
 }
}, 20000);
