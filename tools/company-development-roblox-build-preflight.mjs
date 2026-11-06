// 파일명: tools/company-development-roblox-build-preflight.mjs
import fs from 'node:fs';
import {GEMINI_FREE_MODELS,verifiedFreeGeminiModels,requestGeminiFreePair} from './vibe2-gemini-free-rotation.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {hasVerifiedVibe2SourceHandoff} from './company-development-roblox-source-reconcile.mjs';

const ROLES=Object.freeze(['planning','graphics','development','qa','balance']);
const SHA256=/^sha256:[0-9a-f]{64}$/i;
const COMMIT=/^[0-9a-f]{40}$/i;
const clean=value=>String(value??'').trim();
const upper=value=>clean(value).toUpperCase();
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));

function configuredLeads(directive={}){
  const ai=directive.ai||{};
  // Legacy local model names in directive are not executable authority.
  // The same preflight review uses the approved external free Gemini pair.
  const sharedModel=verifiedFreeGeminiModels()[0];
  const leads=Object.fromEntries(ROLES.map(role=>[role,sharedModel]));
  const distinct=[sharedModel];
  const minDistinct=1;
  return {leads,distinct,pool:new Set(GEMINI_FREE_MODELS),sharedModel,minDistinct};
}

export function inspectRobloxBuildPreflight({item={},directive={},secondaryOwnerFocus=false}={}){
  const blockers=[];
  const {leads,distinct,pool,sharedModel,minDistinct}=configuredLeads(directive);
  const secondary=secondaryOwnerFocus===true;
  const directRoblox=upper(item.selectedPlatform||item.targetPlatform)==='ROBLOX';
  const ownerActivePlatforms=upper(item.platformExecutionMode)==='OWNER_ACTIVE_PLATFORMS_SAME_GAME';
  const concurrentRoblox=(
    ownerActivePlatforms
    ||upper(item.platformExecutionMode)==='ROBLOX_UNITY_CONCURRENT_SAME_GAME'
    ||upper(item.platformExecutionMode)==='UNITY_WEB_FLOOR_THEN_ROBLOX_UNITY_CONCURRENT'
  )&&Array.isArray(item.concurrentTargetPlatforms)
    &&item.concurrentTargetPlatforms.some(platform=>upper(platform)==='ROBLOX')
    &&(ownerActivePlatforms||item.concurrentTargetPlatforms.some(platform=>upper(platform)==='UNITY'));
  const robloxLaneEligible=directRoblox||concurrentRoblox;
  const verifiedVibe2Handoff=!secondary&&hasVerifiedVibe2SourceHandoff(item);
  const nativeWebValidationPassed=Boolean(item.webValidationPassedAt);
  const nativeMusicValidationPassed=item.musicValidationPassed===true;
  const webValidationPassed=nativeWebValidationPassed||verifiedVibe2Handoff;
  const musicValidationPassed=nativeMusicValidationPassed||verifiedVibe2Handoff;
  const sourceValidationPassed=secondary?Boolean(item.ownerFocusRobloxSourceBootstrapPassedAt):Boolean(item.robloxSourceBootstrapPassedAt);
  const buildOrPackagePassed=secondary?item.ownerFocusRobloxBuildOrPackagePassed===true:item.robloxBuildOrPackagePassed===true;
  const sourceRevision=clean(secondary?item.ownerFocusRobloxSourceCommit:item.robloxSourceCommit);
  const buildSourceRevision=clean(secondary?item.ownerFocusRobloxBuildSourceRevision:item.robloxBuildSourceRevision);
  const artifactIdentity=clean(secondary?item.ownerFocusRobloxBuildArtifactIdentity:item.robloxBuildArtifactIdentity);
  if(!['DEVELOPMENT_CONFIRMED','RELEASE_CONFIRMED'].includes(upper(item.productionClass)))blockers.push('confirmed-production-class-required');
  if(!secondary&&!robloxLaneEligible)blockers.push('roblox-platform-required');
  if(!buildOrPackagePassed)blockers.push('build-package-not-passed');
  if(!COMMIT.test(sourceRevision))blockers.push('source-revision-invalid');
  if(buildSourceRevision!==sourceRevision)blockers.push('source-revision-mismatch');
  if(!SHA256.test(artifactIdentity))blockers.push('artifact-identity-invalid');
  // Model review is optional. A removed central AI configuration must not block
  // exact game build/artifact verification; a configured model remains validated.
  if(sharedModel&&distinct.length<minDistinct)blockers.push('shared-review-model-count-invalid');
  if(sharedModel&&pool.size>0&&!pool.has(sharedModel))blockers.push('shared-review-model-not-in-model-pool');
  return Object.freeze({
    pass:blockers.length===0,
    blockers:Object.freeze([...new Set(blockers)]),
    leads:Object.freeze({...leads}),
    sharedModel,
    distinctLeadCount:distinct.length,
    secondaryOwnerFocus:secondary,
    robloxLaneEligible,
    directRoblox,
    concurrentRoblox,
    build:Object.freeze({
      sourceRevision:sourceRevision||null,
      artifactIdentity:artifactIdentity||null,
      webValidationPassed,
      musicValidationPassed,
      nativeWebValidationPassed,
      nativeMusicValidationPassed,
      sourceEligibilityAuthority:buildOrPackagePassed?'exact-immutable-roblox-package':secondary?'owner-focused-secondary-roblox':verifiedVibe2Handoff?'verified-vibe2-source-handoff':'source-bootstrap',
      sourceValidationPassed:sourceValidationPassed||buildOrPackagePassed,
      buildOrPackagePassed,
    }),
  });
}

// Free-provider fallback may return one complete Markdown JSON fence even with
// responseMimeType=application/json. Never extract partial or explanatory text.
export function parseRobloxBuildPreflightReview(raw){
  const value=clean(raw);
  if(value.length<2||value.length>4096)throw new Error('ROBLOX_PREFLIGHT_EXTERNAL_AI_INVALID_REVIEW');
  const fence=value.match(/^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/i);
  if(value.startsWith('```')&&!fence)throw new Error('ROBLOX_PREFLIGHT_EXTERNAL_AI_INVALID_REVIEW');
  let parsed;
  try{parsed=JSON.parse(fence?fence[1].trim():value);}
  catch{throw new Error('ROBLOX_PREFLIGHT_EXTERNAL_AI_INVALID_REVIEW');}
  if(!parsed||Array.isArray(parsed)||typeof parsed!=='object'
    ||Object.keys(parsed).sort().join(',')!=='blockers,decision,note'
    ||!['PASS','BLOCK'].includes(parsed.decision)
    ||!Array.isArray(parsed.blockers)||parsed.blockers.length>6
    ||parsed.blockers.some(x=>typeof x!=='string'||x.length>120||!clean(x))
    ||typeof parsed.note!=='string'||parsed.note.length>240
    ||(parsed.decision==='PASS'&&parsed.blockers.length>0)
    ||(parsed.decision==='BLOCK'&&parsed.blockers.length===0))
    throw new Error('ROBLOX_PREFLIGHT_EXTERNAL_AI_INVALID_REVIEW');
  return {decision:parsed.decision,blockers:parsed.blockers.map(clean),note:clean(parsed.note)};
}

async function callLead(model,role,facts,{fetchImpl=globalThis.fetch}={}){
  const schema={
    type:'object',
    required:['decision','blockers','note'],
    properties:{
      decision:{type:'string',enum:['PASS','BLOCK']},
      blockers:{type:'array',maxItems:6,items:{type:'string',maxLength:120}},
      note:{type:'string',maxLength:240},
    },
    additionalProperties:false,
  };
  // Roblox 독립 패키지의 정밀 검증 증거만 심사한다. 웹·음악 검사는 다른 경로의 비적용 값이다.
  // 전체 원본 사실은 facts.build에 보존하며, 실제 진입 판정은 확정적 패키지 검사만 담당한다.
  const evidence=JSON.stringify({
    sourceRevision:facts.build.sourceRevision,
    artifactIdentity:facts.build.artifactIdentity,
    sourceEligibilityAuthority:facts.build.sourceEligibilityAuthority,
    sourceValidationPassed:facts.build.sourceValidationPassed,
    buildOrPackagePassed:facts.build.buildOrPackagePassed,
  });
  const response=await requestGeminiFreePair({
    apiKey:clean(process.env.GEMINI_API_KEY),
    contents:[{role:'user',parts:[{text:[
      'You are a Roblox package preflight reviewer. Only decide if an immutable package may START runtime testing. Do not invent runtime, QA, release or publication evidence.',
      'Review only this Roblox package build evidence. Web and music validations are separate optional paths, not prerequisites to begin Roblox runtime testing.',
      'A BLOCK must cite an actual contradiction in BUILD_EVIDENCE. Return JSON with decision PASS or BLOCK, blockers and note.',
      'BUILD_EVIDENCE='+evidence,
      'The exact deterministic package identity checks have already passed.'
    ].join('\n')}]}],
    maxOutputTokens:512,temperature:0,timeoutMs:90000,responseMimeType:'application/json',fetchImpl
  });
  const parsed=parseRobloxBuildPreflightReview(response.text);
  return {role,model:response.model,decision:parsed.decision,blockers:parsed.blockers.map(clean).filter(Boolean),note:clean(parsed.note)};

}

export async function evaluateRobloxBuildPreflight({item={},directive={},fetchImpl=globalThis.fetch,secondaryOwnerFocus=false}={}){
  const facts=inspectRobloxBuildPreflight({item,directive,secondaryOwnerFocus});
  if(!facts.pass)return Object.freeze({version:2,gameId:item.gameId||null,pass:false,state:'BLOCKED',checkedAt:new Date().toISOString(),facts,leadReviews:[],blockers:[...facts.blockers],authority:'roblox-vibe-shared-model-build-preflight'});
  // 중앙정책: 외부 인공지능의 판단은 조언이며 실제 통과 권한을 가지지 않는다.
  // 모델이 비적용 검사 결과를 오인하거나 호출이 실패해도 확정적 패키지 검증을 조작하지 않는다.
  const leadReviews=[];
  if(facts.sharedModel){
    try{leadReviews.push(await callLead(facts.sharedModel,'shared-review',facts,{fetchImpl}));}
    catch{
      leadReviews.push({role:'shared-review',model:facts.sharedModel,decision:'UNAVAILABLE',
        blockers:[],note:'External review unavailable; immutable package gates remain authoritative.'});
    }
  }
  return Object.freeze({
    version:2,gameId:item.gameId||null,pass:true,state:'PASS',checkedAt:new Date().toISOString(),
    sourceRevision:facts.build.sourceRevision,artifactIdentity:facts.build.artifactIdentity,secondaryOwnerFocus:facts.secondaryOwnerFocus===true,facts,
    leadReviews:Object.freeze(leadReviews),blockers:Object.freeze([]),
    reviewMode:facts.sharedModel?'EXTERNAL_GEMINI_FREE_PAIR_REVIEW':'DETERMINISTIC_GAME_BUILD_EVIDENCE_ONLY',
    authority:'roblox-exact-package-build-preflight',
  });
}

function parseArgs(argv){const out={};for(let i=0;i<argv.length;i++){const arg=argv[i];if(!arg.startsWith('--'))continue;const [key,inline]=arg.slice(2).split('=',2);out[key]=inline??argv[++i];}return out;}

async function main(){
  const args=parseArgs(process.argv.slice(2));
  const queue=readJson(clean(args.queue));
  const directive=readJson(clean(args.directive)||'company-directive.json');
  const gameId=clean(args['game-id']);
  const output=clean(args.output);
  if(!gameId||!output)throw new Error('game-id and output are required');
  const item=(queue.items||[]).find(row=>row.gameId===gameId);
  if(!item)throw new Error(`queue item missing: ${gameId}`);
  const secondaryOwnerFocus=clean(args['secondary-owner-focus']).toLowerCase()==='true';
  const result=await evaluateRobloxBuildPreflight({item,directive,secondaryOwnerFocus});
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(result,null,2)}\n`);
  console.log(`ROBLOX_BUILD_PREFLIGHT_GAME=${gameId}`);
  console.log(`ROBLOX_BUILD_PREFLIGHT_LEAD_COUNT=${result.leadReviews?.length||0}`);
  console.log(`ROBLOX_BUILD_PREFLIGHT_PASS=${result.pass?'YES':'NO'}`);
  if(!result.pass)process.exitCode=2;
}

const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain)main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
