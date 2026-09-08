import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const readJson=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const unique=(v=[])=>[...new Set((v||[]).filter(Boolean))];
const issueText=issue=>{
  if(typeof issue==='string')return issue.trim();
  if(!issue||typeof issue!=='object')return String(issue??'').trim();
  return [issue.type,issue.message,issue.code].filter(Boolean).map(String).join(': ').trim();
};

export function buildBridgeFreeBudget(portfolio={}){
  return{
    providerId:'GITHUB_PUBLIC_STANDARD',
    resourceType:'ACTIONS_RUNNER',
    quotaMode:'UNMETERED_FREE',
    metered:false,
    planningStatus:'POLICY_ELIGIBLE',
    executionRepository:'hans1177/jaewoon-games',
    requiredVisibility:'public',
    standardRunnerOnly:true,
    runner:'ubuntu-latest',
    paidApi:portfolio.paidApi===false?false:null,
    localModelProvider:'OLLAMA_LOCAL',
    maxModelCallsPerRun:Number(portfolio.maxModelCallsPerRun??0),
    maxRunnerMinutesPerRun:Number(portfolio.maxRunnerMinutesPerRun??0),
    runtimeVerificationRequired:true,
    source:'GITHUB_PUBLIC_STANDARD_POLICY',
  };
}

export function buildGamesBridgeSnapshot({portfolio={},health={},dna={},artbooks={},sourceRevision=null,timestamp=new Date().toISOString()}={}){
  const healthBySlug=new Map((health.games||[]).map(g=>[g.gameId,g]));
  const projects=(portfolio.projects||[]).map(p=>{
    const h=healthBySlug.get(p.slug)||null;
    return{
      id:p.id,slug:p.slug,name:p.name,sourcePath:p.sourcePath,mode:p.mode,profileStatus:p.profileStatus,
      health:h?{status:h.status,score:h.score,healthReason:h.healthReason,issues:unique((h.issues||[]).map(issueText).filter(Boolean)),checkedAt:h.checkedAt}:null,
    };
  });
  const dnaItems=(dna.items||[]).map(item=>({key:item.key,type:item.type,patternId:item.patternId,stage:item.stage,summary:item.summary||null,jayApproved:item.jayApproved===true}));
  const latestArtbooks=(artbooks.artbooks||[]).slice(-20).map(book=>({id:book.id,gameId:book.gameId,status:book.status,productionApproval:book.productionApproval===true,createdAt:book.createdAt}));
  return{
    version:1,
    sourceRepository:'hans1177/jaewoon-games',
    sourceRevision:sourceRevision||process.env.GITHUB_SHA||null,
    generatedAt:timestamp,
    fixedProjectCount:portfolio.fixedProjectCount===false?false:null,
    publicStableBranch:portfolio.publicStableBranch||'main',
    continuousDevelopmentBranch:portfolio.continuousDevelopmentBranch||'autonomous-dev',
    paidApi:portfolio.paidApi===false?false:null,
    freeBudget:buildBridgeFreeBudget(portfolio),
    projects,
    companyDna:dnaItems,
    latestArtbooks,
    safety:{containsSecrets:false,containsCredentials:false,publicGameCodeAutoPromotion:false},
  };
}

export function validateGamesBridgeSnapshot(snapshot={}){
  const errors=[];
  if(snapshot.version!==1)errors.push('version');
  if(snapshot.sourceRepository!=='hans1177/jaewoon-games')errors.push('sourceRepository');
  if(!Array.isArray(snapshot.projects))errors.push('projects');
  if(snapshot.freeBudget?.providerId!=='GITHUB_PUBLIC_STANDARD')errors.push('freeBudgetProvider');
  if(snapshot.freeBudget?.quotaMode!=='UNMETERED_FREE')errors.push('freeBudgetQuotaMode');
  if(snapshot.freeBudget?.runtimeVerificationRequired!==true)errors.push('freeBudgetRuntimeVerification');
  if(snapshot.freeBudget?.paidApi!==false)errors.push('freeBudgetPaidApi');
  if(snapshot.safety?.containsSecrets!==false)errors.push('containsSecrets');
  if(snapshot.safety?.containsCredentials!==false)errors.push('containsCredentials');
  if(snapshot.safety?.publicGameCodeAutoPromotion!==false)errors.push('publicGameCodeAutoPromotion');
  for(const p of snapshot.projects||[]){
    if(!/^P\d{4,}$/.test(p.id||''))errors.push(`project:${p.id}`);
    if(p.health&&!Array.isArray(p.health.issues))errors.push(`healthIssues:${p.id}`);
    if((p.health?.issues||[]).some(issue=>typeof issue!=='string'))errors.push(`healthIssueType:${p.id}`);
  }
  return{pass:errors.length===0,errors};
}

function main(){
  const snapshot=buildGamesBridgeSnapshot({
    portfolio:readJson('autonomous-portfolio.json',{}),
    health:readJson('public-game-health.json',{}),
    dna:readJson('company-learning/company-dna.json',{}),
    artbooks:readJson('game-artbooks.json',{}),
  });
  const valid=validateGamesBridgeSnapshot(snapshot);if(!valid.pass)throw new Error(`bridge snapshot invalid: ${valid.errors.join(',')}`);
  const out='company-bridge/games-status.json';fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(snapshot,null,2)+'\n');console.log(JSON.stringify({output:out,projects:snapshot.projects.length,dna:snapshot.companyDna.length,freeBudget:snapshot.freeBudget,safety:snapshot.safety},null,2));
}
if(import.meta.url===pathToFileURL(process.argv[1]).href)main();
