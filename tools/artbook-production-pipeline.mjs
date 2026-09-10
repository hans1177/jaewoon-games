// 파일명: tools/artbook-production-pipeline.mjs
// 역할: 중앙 정책 COMPANY_FLOW.md에 따라 productionClass별 제작 파이프라인을 라우팅한다.
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import {PRODUCTION_CLASSES,productionClassOf} from './production-classification.mjs';

const gameId=String(process.env.ARTBOOK_GAME_ID||'').trim();
const date=String(process.env.ARTBOOK_DATE||'').trim();
if(!gameId)throw new Error('ARTBOOK_GAME_ID is required');

const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
const game=(catalog.games||[]).find(x=>x.id===gameId);
if(!game)throw new Error(`Unknown game: ${gameId}`);
const productionClass=productionClassOf({},game,{numericLabels:directive.production?.numericLabels||{}});

function run(script){
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[script],{stdio:'inherit',env:{...process.env,ARTBOOK_GAME_ID:gameId,...(date?{ARTBOOK_DATE:date}:{})}});
    child.on('error',reject);
    child.on('close',code=>code===0?resolve():reject(new Error(`${script} exited ${code}`)));
  });
}

console.log(`ARTBOOK_PIPELINE_GAME=${gameId}`);
console.log(`PRODUCTION_CLASS=${productionClass}`);
console.log('POLICY_DOCUMENT=COMPANY_FLOW.md');
await run('tools/artbook-fact-pack.mjs');

if(productionClass===PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED){
  await run('tools/company-development-validation-cycle.mjs');
  await run('tools/company-baseline-gate.mjs');
  console.log('DEVELOPMENT_EXECUTION_MODE=GATED_DIRECT');
  console.log('DEVELOPMENT_RESUME_FROM_LATEST_EVIDENCE=YES');
  console.log('DEVELOPMENT_ARTBOOK_ONLY_AFTER_BASELINE_READY=YES');
}else if(productionClass===PRODUCTION_CLASSES.RELEASE_CONFIRMED){
  await run('tools/company-release-production-cycle.mjs');
  // RELEASE_READY가 아닌 상태에서는 같은 날짜에 남은 과거 최종 Release 산출물을
  // 활성 위치에 두지 않는다. 삭제하지 않고 release-history로 보존 이동한다.
  await run('tools/company-release-stale-artifact-guard.mjs');
  console.log('RELEASE_EXECUTION_MODE=GATED_DIRECT_RELEASE_PRODUCTION');
  console.log('RELEASE_VIBE2_PRIMARY_DEVELOPER=YES');
  console.log('RELEASE_CURRENT_BUILD_EVIDENCE_BINDING=REQUIRED');
  console.log('RELEASE_STALE_FINAL_ARTIFACT_GUARD=ENABLED');
  console.log('RELEASE_FINAL_ARTBOOK_ONLY_AFTER_READY=YES');
}else{
  await run('tools/company-design-cycle.mjs');
  await run('tools/company-baseline-gate.mjs');
  console.log('DESIGN_ONLY_ARTBOOK_DIRECT=YES');
}

console.log('ARTBOOK_PIPELINE_COMPLETE=YES');
console.log('DEPARTMENT_MODE=FIVE_DISTINCT_LEADS_PLUS_MULTIMODEL_ASSISTANTS');
console.log('DEPARTMENT_REPRESENTATIVE_OWNER=DEPARTMENT_LEAD_MODEL');
console.log('DEPARTMENT_REBUTTAL_OWNER=DEPARTMENT_LEAD_MODEL');
console.log('ARTBOOK_AUTHOR=ONE_ARTBOOK_EDITOR_AI');
console.log('DEPARTMENT_ARTBOOK_AUTHORSHIP=NO');
console.log('BASELINE_APPROVAL=REAL_EVIDENCE_GATE_SEPARATE_FROM_AI_REVIEW');
console.log('PAID_API=NO');
