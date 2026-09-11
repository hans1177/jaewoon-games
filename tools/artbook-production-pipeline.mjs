// 파일명: tools/artbook-production-pipeline.mjs
// 역할: 중앙 정책 COMPANY_FLOW.md에 따라 productionClass별 제작 파이프라인을 라우팅한다.
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {PRODUCTION_CLASSES,productionClassOf} from './production-classification.mjs';
import {loadSeedState,activeSeedForGame} from './game-seed-state.mjs';

const gameId=String(process.env.ARTBOOK_GAME_ID||process.env.GAME_ID||'').trim();
const date=String(process.env.ARTBOOK_DATE||process.env.DESIGN_DATE||'').trim();
if(!gameId)throw new Error('ARTBOOK_GAME_ID or GAME_ID is required');
const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
const game=(catalog.games||[]).find(x=>x.id===gameId)||null;
const seed=activeSeedForGame(loadSeedState(),gameId);
if(!game&&!seed)throw new Error(`Unknown game or active GAME_SEED: ${gameId}`);
const productionClass=game?productionClassOf({},game,{numericLabels:directive.production?.numericLabels||{}}):PRODUCTION_CLASSES.DESIGN_ONLY;

function run(script){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,[script],{stdio:'inherit',env:{...process.env,ARTBOOK_GAME_ID:gameId,GAME_ID:gameId,...(date?{ARTBOOK_DATE:date,DESIGN_DATE:date}:{})}});child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error(`${script} exited ${code}`)));});}
function kstDate(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;}
function readCycleStatus(){const d=date||kstDate();try{return JSON.parse(fs.readFileSync(path.join('design',gameId,d,'cycle-status.json'),'utf8'));}catch{return null;}}

console.log(`ARTBOOK_PIPELINE_GAME=${gameId}`);console.log(`PRODUCTION_CLASS=${productionClass}`);console.log('POLICY_DOCUMENT=COMPANY_FLOW.md');
await run('tools/artbook-fact-pack.mjs');
if(productionClass===PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED){
  await run('tools/company-development-validation-cycle.mjs');
  await run('tools/company-baseline-gate.mjs');
  await run('tools/company-development-disposition-gate.mjs');
  console.log('DEVELOPMENT_EXECUTION_MODE=GATED_DIRECT');console.log('DEVELOPMENT_RESUME_FROM_LATEST_EVIDENCE=YES');console.log('DEVELOPMENT_DISPOSITION_GATE=ENABLED');console.log('DEVELOPMENT_ARTBOOK_ONLY_AFTER_BASELINE_READY=YES');
}else if(productionClass===PRODUCTION_CLASSES.RELEASE_CONFIRMED){
  await run('tools/company-release-production-cycle.mjs');await run('tools/company-release-stale-artifact-guard.mjs');
  console.log('RELEASE_EXECUTION_MODE=GATED_DIRECT_RELEASE_PRODUCTION');console.log('RELEASE_VIBE2_PRIMARY_DEVELOPER=YES');console.log('RELEASE_CURRENT_BUILD_EVIDENCE_BINDING=REQUIRED');console.log('RELEASE_STALE_FINAL_ARTIFACT_GUARD=ENABLED');console.log('RELEASE_FINAL_ARTBOOK_ONLY_AFTER_READY=YES');
}else{
  await run('tools/company-design-cycle.mjs');
  await run('tools/company-baseline-gate.mjs');
  const status=readCycleStatus();
  if(status?.baselineGate?.state==='DESIGN_BASELINE_READY'&&status?.baselineGate?.ready===true){await run('tools/company-design-artbook.mjs');console.log('DESIGN_ONLY_ARTBOOK_AFTER_BASELINE=YES');}
  else console.log(`DESIGN_ONLY_ARTBOOK_SKIPPED=${status?.baselineGate?.state||'BASELINE_NOT_READY'}`);
  console.log('DESIGN_ONLY_VIBE2_USED=NO');
}
console.log('ARTBOOK_PIPELINE_COMPLETE=YES');console.log('DEPARTMENT_MODE=FIVE_DISTINCT_LEADS_PLUS_MULTIMODEL_ASSISTANTS');console.log('DEPARTMENT_REPRESENTATIVE_OWNER=DEPARTMENT_LEAD_MODEL');console.log('DEPARTMENT_REBUTTAL_OWNER=DEPARTMENT_LEAD_MODEL');console.log('ARTBOOK_AUTHOR=ONE_ARTBOOK_EDITOR_AI');console.log('DEPARTMENT_ARTBOOK_AUTHORSHIP=NO');console.log('BASELINE_APPROVAL=REAL_EVIDENCE_GATE_SEPARATE_FROM_AI_REVIEW');console.log('PAID_API=NO');
