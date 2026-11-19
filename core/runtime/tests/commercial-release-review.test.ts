import {test,expect} from 'bun:test';
import {commercialMigrationManifest,reviewFoundationLedger} from '../scripts/commercial-release-review';

test('release review fingerprints real unchanged SQL in dependency order without authorizing execution',()=>{
  const m=commercialMigrationManifest();
  expect(m.foundation.map(f=>f.version)).toEqual(['0000','0001','0002','0003','0004','0005','0009','0010','0011','0012','0013','0014','0015','0016','0017','0018','0019']);
  expect(m.foundation.slice(6).map(f=>f.file)).toEqual(['0009_radar_schema.sql','0010_radar_core_constraints.sql','0011_radar_ownership.sql','0012_radar_abuse_constraints.sql','0013_radar_account_retention.sql','0014_radar_address_link.sql','0015_radar_campaigns.sql','0016_radar_business_details.sql','0017_radar_anonymous_reports.sql','0018_radar_activity_confirmations.sql','0019_radar_favorites.sql']);
  expect(m.proposals.map(p=>p.file)).toEqual(['landline.sql','requests.sql','payments.sql']);
  expect(m.proposals.map(p=>p.requires)).toEqual(['verified foundation ledger','landline.sql','requests.sql']);
  expect(m.proposals.every(p=>p.version===null&&p.applied===false&&/^[a-f0-9]{64}$/.test(p.checksum_sha256))).toBe(true);
  expect(m.dependentProposals).toHaveLength(2);expect(m.productionAuthorized).toBe(false);
});

test('ledger review requires exact existing versions and checksums, without treating a match as release approval',()=>{
  const m=commercialMigrationManifest(),rows=m.foundation.map(({version,checksum_sha256})=>({version,checksum_sha256}));
  expect(reviewFoundationLedger(rows,m)).toEqual({ledgerMatches:true,missing:[],mismatched:[],unexpected:[],duplicates:[],productionAuthorized:false,publicationVerified:false});
  expect(reviewFoundationLedger([],m).missing).toHaveLength(17);
  expect(reviewFoundationLedger(rows.filter(row=>row.version!=='0017'),m).missing).toEqual(['0017']);
  expect(reviewFoundationLedger(rows.slice(1),m).ledgerMatches).toBe(false);
  expect(reviewFoundationLedger([{...rows[0],checksum_sha256:'0'.repeat(64)},...rows.slice(1)],m).mismatched).toEqual(['0000']);
  expect(reviewFoundationLedger([...rows,{version:'0020',checksum_sha256:'a'.repeat(64)}],m).unexpected).toEqual(['0020']);
  expect(reviewFoundationLedger([...rows,rows[0]],m).duplicates).toEqual(['0000']);
  expect(reviewFoundationLedger([...rows,rows[0]],m).ledgerMatches).toBe(false);
});
