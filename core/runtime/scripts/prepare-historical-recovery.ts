import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const repo=new URL('../../../',import.meta.url).pathname;
const original='e3b3095aed3163b0bdb56ec22a417a81455ad8c0';
const published='1ed0dd8';
const git=(...args:string[])=>execFileSync('git',args,{cwd:repo,maxBuffer:10*1024*1024});
const output=process.argv[2];if(!output)throw Error('EXPLICIT_ISOLATED_OUTPUT_REQUIRED');
const target=resolve(output);if(target.startsWith(resolve(repo)))throw Error('OUTPUT_MUST_BE_OUTSIDE_REPOSITORY');
mkdirSync(target,{recursive:true});
const restored=[];
for(const path of ['jacinto/index.html','liliana/index.html']){
 const bytes=git('show',original+':'+path);const current=git('show','HEAD:'+path);
 if(!bytes.equals(current))throw Error('HISTORICAL_SOURCE_DRIFT');
 mkdirSync(join(target,path,'..'),{recursive:true});writeFileSync(join(target,path),bytes);
 restored.push({route:'/'+path.replace('index.html',''),sourceCommit:original,path,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});
}
const removed=git('diff','--name-only','--diff-filter=D',original,published).toString().split('\n').filter(p=>/^[^/]+\/index.html$/.test(p));
writeFileSync(join(target,'manifest.json'),JSON.stringify({sourceCommit:original,publishedBase:published,restored,otherExcludedRoutes:removed.filter(p=>!restored.some(r=>r.path===p)),status:'PREPARED_ONLY_REQUIRES_OWNER_REVIEW_NOT_PUBLISHED'},null,2)+'\n');
console.log(JSON.stringify({output:target,restored,otherExcludedRoutes:removed.length-restored.length,published:false},null,2));
