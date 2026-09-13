import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROLES=Object.freeze(['planning','graphics','development','qa','balance']);
const SHA256=/^sha256:[0-9a-f]{64}$/i;
const COMMIT=/^[0-9a-f]{40}$/i;
const clean=value=>String(value??'').trim();
const upper=value=>clean(value).toUpperCase();
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));

function configuredLeads(directive={}){
  const ai=directive.ai||{};
  const leads=Object.fromEntries(ROLES.map(role=>[role,clean(ai.departmentLeadModels?.[role])]));
  const distinct=[...new Set(Object.values(leads).filter(Boolean))];
  return {leads,distinct,pool:new Set((ai.modelPool||[]).map(clean).filter(Boolean))};
}

export function inspectRobloxBuildPreflight({item={},directive={}}={}){
  const blockers=[];
  const {leads,distinct,pool}=configuredLeads(directive);
  if(upper(item.productionClass)!=='DEVELOPMENT_CONFIRMED')blockers.push('development-confirmed-required');
  if(upper(item.selectedPlatform||item.targetPlatform)!=='ROBLOX')blockers.push('roblox-platform-required');
  if(!item.webValidationPassedAt)blockers.push('web-validation-missing');
  if(item.musicValidationPassed!==true)blockers.push('music-validation-missing');
  if(!item.robloxSourceBootstrapPassedAt)blockers.push('source-validation-missing');
  if(item.robloxBuildOrPackagePassed!==true)blockers.push('build-package-not-passed');
  if(!COMMIT.test(clean(item.robloxSourceCommit)))blockers.push('source-revision-invalid');
  if(clean(item.robloxBuildSourceRevision)!==clean(item.robloxSourceCommit))blockers.push('source-revision-mismatch');
  if(!SHA256.test(clean(item.robloxBuildArtifactIdentity)))blockers.push('artifact-identity-invalid');
  if(distinct.length!==ROLES.length)blockers.push('five-distinct-leads-missing');
  for(const role of ROLES){
    if(!leads[role])blockers.push(`lead-missing:${role}`);
    else if(!pool.has(leads[role]))blockers.push(`lead-not-in-model-pool:${role}`);
  }
  return Object.freeze({
    pass:blockers.length===0,
    blockers:Object.freeze([...new Set(blockers)]),
    leads:Object.freeze({...leads}),
    distinctLeadCount:distinct.length,
    build:Object.freeze({
      sourceRevision:clean(item.robloxSourceCommit)||null,
      artifactIdentity:clean(item.robloxBuildArtifactIdentity)||null,
      webValidationPassed:Boolean(item.webValidationPassedAt),
      musicValidationPassed:item.musicValidationPassed===true,
      sourceValidationPassed:Boolean(item.robloxSourceBootstrapPassedAt),
      buildOrPackagePassed:item.robloxBuildOrPackagePassed===true,
    }),
  });
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
  const evidence=JSON.stringify(facts.build);
  let last=null;
  for(let attempt=1;attempt<=2;attempt++){
    try{
      const response=await fetchImpl('http://127.0.0.1:11434/api/chat',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({
          model,stream:false,think:false,format:schema,
          messages:[
            {role:'system',content:`You are the ${role} department lead for a Roblox build preflight. This gate only decides whether the already-built immutable package may START real runtime testing. Do not demand runtime, independent QA, regression, final review, or release evidence at this stage. A BLOCK decision must name a concrete contradiction visible in BUILD_EVIDENCE. Never invent facts.`},
            {role:'user',content:`BUILD_EVIDENCE=${evidence}\nAll deterministic policy checks passed before this review. Return PASS when no concrete build-stage blocker is present.`},
          ],
          options:{temperature:0,num_ctx:4096,num_predict:300},
        }),
      });
      if(!response.ok)throw new Error(`ollama ${response.status}: ${await response.text()}`);
      const body=await response.json();
      const parsed=JSON.parse(clean(body?.message?.content));
      if(!['PASS','BLOCK'].includes(parsed.decision)||!Array.isArray(parsed.blockers))throw new Error('invalid lead response');
      return {role,model,decision:parsed.decision,blockers:parsed.blockers.map(clean).filter(Boolean),note:clean(parsed.note)};
    }catch(error){last=error;if(attempt===1)console.log(`ROBLOX_PREFLIGHT_LEAD_RETRY=${role}:${model}`);}
  }
  throw new Error(`ROBLOX_PREFLIGHT_LEAD_FAILED ${role}:${model}: ${clean(last?.message)}`);
}

export async function evaluateRobloxBuildPreflight({item={},directive={},fetchImpl=globalThis.fetch}={}){
  const facts=inspectRobloxBuildPreflight({item,directive});
  if(!facts.pass)return Object.freeze({version:1,gameId:item.gameId||null,pass:false,state:'BLOCKED',checkedAt:new Date().toISOString(),facts,leadReviews:[],blockers:[...facts.blockers],authority:'roblox-five-distinct-lead-build-preflight'});
  const leadReviews=[];
  for(const role of ROLES)leadReviews.push(await callLead(facts.leads[role],role,facts,{fetchImpl}));
  const blockers=[];
  for(const review of leadReviews){if(review.decision!=='PASS')blockers.push(`lead-block:${review.role}:${review.blockers.join('|')||'unspecified'}`);}
  return Object.freeze({
    version:1,gameId:item.gameId||null,pass:blockers.length===0,state:blockers.length?'BLOCKED':'PASS',checkedAt:new Date().toISOString(),
    sourceRevision:facts.build.sourceRevision,artifactIdentity:facts.build.artifactIdentity,facts,
    leadReviews:Object.freeze(leadReviews),blockers:Object.freeze(blockers),
    authority:'roblox-five-distinct-lead-build-preflight',
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
  const result=await evaluateRobloxBuildPreflight({item,directive});
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(result,null,2)}\n`);
  console.log(`ROBLOX_BUILD_PREFLIGHT_GAME=${gameId}`);
  console.log(`ROBLOX_BUILD_PREFLIGHT_LEAD_COUNT=${result.leadReviews?.length||0}`);
  console.log(`ROBLOX_BUILD_PREFLIGHT_PASS=${result.pass?'YES':'NO'}`);
  if(!result.pass)process.exitCode=2;
}

const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain)main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
