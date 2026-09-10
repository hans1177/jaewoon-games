import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {PRODUCTION_CLASSES,productionClassOf} from './production-classification.mjs';

const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clean=v=>String(v??'').trim();
const gameId=clean(process.env.ARTBOOK_GAME_ID||process.env.GAME_ID||process.argv.find(x=>x.startsWith('--game='))?.split('=')[1]);
const date=clean(process.env.ARTBOOK_DATE||process.env.DESIGN_DATE);
if(!gameId)throw new Error('ARTBOOK_GAME_ID or GAME_ID is required');
if(!date)throw new Error('ARTBOOK_DATE or DESIGN_DATE is required');

const directive=readJson('company-directive.json',{});
const catalog=readJson('game-catalog.json',{games:[]});
const game=(catalog.games||[]).find(x=>x.id===gameId);
if(!game)throw new Error(`Unknown game: ${gameId}`);
const productionClass=productionClassOf({},game,{numericLabels:directive.production?.numericLabels||{}});
if(productionClass!==PRODUCTION_CLASSES.RELEASE_CONFIRMED){
  console.log('RELEASE_STALE_ARTIFACT_GUARD=NOT_APPLICABLE');
  process.exit(0);
}

const base=path.join('design',gameId,date);
const statusPath=path.join(base,'release-production-status.json');
const status=readJson(statusPath,null);
if(!status)throw new Error(`release-production-status.json missing: ${statusPath}`);

const baselinePath=path.join(base,'release-baseline.json');
const artbookPath=path.join(base,'core-artbook.json');
const baseline=readJson(baselinePath,null);
const artbook=readJson(artbookPath,null);
const ready=status.state==='RELEASE_READY'&&status.status==='COMPLETE';

function isReleaseBaselineArtifact(data){
  return Boolean(data&&(data.baseline==='RELEASE_BASELINE'||data.status==='RELEASE_READY'));
}
function isReleaseArtbookArtifact(data){
  return Boolean(data?.releaseBaseline===true);
}
function shortIdentity(){
  const source=clean(baseline?.currentSourceTreeSha||artbook?.sourceTreeSha||status.currentSourceTreeSha||'unknown-source');
  const build=clean(baseline?.currentBuild?.identity||status.evidence?.build?.identity||'unknown-build');
  return crypto.createHash('sha256').update(`${source}:${build}`).digest('hex').slice(0,16);
}
function archiveFile(sourcePath,data,name,archiveRoot){
  if(!data||!fs.existsSync(sourcePath))return null;
  const target=path.join(archiveRoot,name);
  writeJson(target,data);
  fs.unlinkSync(sourcePath);
  return target.replaceAll('\\','/');
}

if(ready){
  if(!isReleaseBaselineArtifact(baseline))throw new Error('RELEASE_READY requires active release-baseline.json');
  if(!isReleaseArtbookArtifact(artbook))throw new Error('RELEASE_READY requires active final release core-artbook.json');
  if(clean(baseline.currentSourceTreeSha)!==clean(status.currentSourceTreeSha))throw new Error('active release baseline source tree does not match current release status');
  if(clean(artbook.sourceTreeSha)!==clean(status.currentSourceTreeSha))throw new Error('active release artbook source tree does not match current release status');
  console.log('RELEASE_STALE_ARTIFACT_GUARD=READY_ACTIVE_ARTIFACTS_VALID');
  process.exit(0);
}

const releaseBaselineStale=isReleaseBaselineArtifact(baseline);
const releaseArtbookStale=isReleaseArtbookArtifact(artbook);
if(!releaseBaselineStale&&!releaseArtbookStale){
  console.log('RELEASE_STALE_ARTIFACT_GUARD=NO_ACTIVE_FINAL_ARTIFACTS');
  process.exit(0);
}

const identity=shortIdentity();
const archiveRoot=path.join(base,'release-history',`invalidated-${identity}`);
const archived=[];
if(releaseBaselineStale){
  const p=archiveFile(baselinePath,baseline,'release-baseline.json',archiveRoot);
  if(p)archived.push(p);
}
if(releaseArtbookStale){
  const p=archiveFile(artbookPath,artbook,'core-artbook.json',archiveRoot);
  if(p)archived.push(p);
}
writeJson(path.join(archiveRoot,'invalidation.json'),{
  version:1,
  gameId,
  date,
  policyDocument:'COMPANY_FLOW.md',
  reason:'release-state-no-longer-ready',
  currentState:status.state,
  currentSourceTreeSha:status.currentSourceTreeSha||null,
  invalidatedArtifacts:archived,
  preservedAsHistory:true,
  activeReleaseBaselineRemoved:releaseBaselineStale,
  activeFinalReleaseArtbookRemoved:releaseArtbookStale,
  invalidatedAt:new Date().toISOString()
});

console.log(`RELEASE_STALE_ARTIFACT_GUARD=ARCHIVED_${archived.length}`);
console.log(`RELEASE_STALE_ARTIFACT_ARCHIVE=${archiveRoot.replaceAll('\\','/')}`);
console.log('FINAL_RELEASE_ARTIFACTS_ACTIVE=NO');
