// Keeps last verified healthy public build per already-approved game.
// Does not publish a new game. It only records a fallback for an already-public approved build.
import fs from 'node:fs';

const read=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const status=read('company-status.json',{testBuilds:[]});
const catalog=read('game-catalog.json',{games:[]});
const health=read('public-game-health.json',{games:[]});
const current=read('public-release-baselines.json',{version:1,games:[]});
const byId=new Map((current.games||[]).map(x=>[x.gameId,x]));
const healthById=new Map((health.games||[]).map(x=>[x.gameId,x]));
const approved=new Set((catalog.games||[]).filter(x=>x.homepagePublicationApproved===true).map(x=>x.id));

for(const build of status.testBuilds||[]){
  const gameId=String(build.gameId||build.id||'');
  if(!gameId||!approved.has(gameId)||build.homepagePublished!==true)continue;
  if(!build.download||!build.sha256||!(Number(build.bytes)>0))continue;
  const h=healthById.get(gameId)||{};
  const releaseHealth=h.releaseHealth||{};
  const verifiedHealthy=releaseHealth.status==='healthy'||releaseHealth.verified===true;
  if(verifiedHealthy){
    byId.set(gameId,{
      gameId,
      healthyDownload:build.download,
      sha256:build.sha256,
      bytes:Number(build.bytes),
      releaseTag:build.releaseTag||null,
      sourceRunId:build.runId||null,
      recordedAt:new Date().toISOString(),
      rollbackEligible:true,
      rollbackActive:false,
      reason:'last-verified-healthy-public-build'
    });
  }
}

for(const [gameId,entry] of byId){
  const h=healthById.get(gameId)||{};
  const releaseHealth=h.releaseHealth||{};
  entry.rollbackActive=Boolean(entry.rollbackEligible&&releaseHealth.status==='critical');
  entry.fallbackDownload=entry.rollbackActive?entry.healthyDownload:null;
  if(entry.rollbackActive)entry.reason=`release-health-critical:${releaseHealth.reason||'unknown'}`;
}

const output={version:1,updatedAt:new Date().toISOString(),policy:{onlyVerifiedBuilds:true,requireSha256:true,healthyReleaseEvidenceRequired:true,autoRollbackDisplayOnCritical:true,neverPublishesUnapprovedGame:true},games:[...byId.values()]};
fs.writeFileSync('public-release-baselines.json',JSON.stringify(output,null,2)+'\n');
console.log(`ROLLBACK_BASELINES=${output.games.length}`);
console.log(`ROLLBACK_ACTIVE=${output.games.filter(x=>x.rollbackActive).length}`);
