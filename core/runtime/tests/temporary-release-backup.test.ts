import {test,expect} from 'bun:test';
import {sealBackup,openBackup} from '../scripts/temporary-event-release';
test('backup encryption restores exact bytes and rejects damage or wrong keys',()=>{
 const bytes=Buffer.from('private backup fixture'),key='a'.repeat(64),sealed=sealBackup(bytes,key);
 expect(sealed.includes(bytes)).toBe(false);expect(openBackup(sealed,key)).toEqual(bytes);
 expect(()=>openBackup(sealed,'b'.repeat(64))).toThrow();const altered=Buffer.from(sealed);altered[altered.length-1]^=1;expect(()=>openBackup(altered,key)).toThrow();
 expect(()=>sealBackup(bytes,'short')).toThrow('INVALID_BACKUP_KEY');
});
