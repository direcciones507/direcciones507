import {test,expect} from 'bun:test';
import {commercialMigrationManifest,reviewFoundationLedger} from '../scripts/commercial-release-review';

test('release review fingerprints real unchanged SQL in dependency order without authorizing execution',()=>{
  const m=commercialMigrationManifest();
  expect(m.foundation.map(f=>f.version)).toEqual(['0000','0001','0002','0003','0004','0005']);
  expect(m.proposals.map(p=>p.file)).toEqual(['landline.sql','requests.sql','payments.sql']);
  expect(m.proposals.map(p=>p.requires)).toEqual(['verified foundation ledger','landline.sql','requests.sql']);
  expect(m.proposals.every(p=>p.version===null&&p.applied===false&&/^[a-f0-9]{64}$/.test(p.checksum_sha256))).toBe(true);
  expect(m.dependentProposals).toHaveLength(2);expect(m.productionAuthorized).toBe(false);
});

test('ledger review requires exact existing versions and checksums, without treating a match as release approval',()=>{
  const m=commercialMigrationManifest(),rows=m.foundation.map(({version,checksum_sha256})=>({version,checksum_sha256}));
  expect(reviewFoundationLedger(rows,m)).toEqual({ledgerMatches:true,missing:[],mismatched:[],unexpected:[],duplicates:[],productionAuthorized:false,publicationVerified:false});
  expect(reviewFoundationLedger([],m).missing).toHaveLength(6);
  expect(reviewFoundationLedger(rows.slice(1),m).ledgerMatches).toBe(false);
  expect(reviewFoundationLedger([{...rows[0],checksum_sha256:'0'.repeat(64)},...rows.slice(1)],m).mismatched).toEqual(['0000']);
  expect(reviewFoundationLedger([...rows,{version:'0006',checksum_sha256:'a'.repeat(64)}],m).unexpected).toEqual(['0006']);
  expect(reviewFoundationLedger([...rows,rows[0]],m).duplicates).toEqual(['0000']);
  expect(reviewFoundationLedger([...rows,rows[0]],m).ledgerMatches).toBe(false);
});
