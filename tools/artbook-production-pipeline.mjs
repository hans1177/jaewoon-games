// 파일명: tools/artbook-production-pipeline.mjs
// 역할: 중앙 정책에 따라 FACT PACK → 단일 디자이너 초안 → 다중모델 부서회의 → 동일 디자이너 수정 → 단일 아트북 편집을 실행한다.
import fs from 'node:fs';
import { spawn } from 'node:child_process';

const gameId=String(process.env.ARTBOOK_GAME_ID||'').trim();
const date=String(process.env.ARTBOOK_DATE||'').trim();
if(!gameId)throw new Error('ARTBOOK_GAME_ID is required');

function run(script){
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[script],{stdio:'inherit',env:{...process.env,ARTBOOK_GAME_ID:gameId,...(date?{ARTBOOK_DATE:date}:{})}});
    child.on('error',reject);
    child.on('close',code=>code===0?resolve():reject(new Error(`${script} exited ${code}`)));
  });
}
function syncRegistryPolicy(){
  const file='game-artbooks.json';
  if(!fs.existsSync(file))return;
  const registry=JSON.parse(fs.readFileSync(file,'utf8'));
  registry.policy={
    sourceDocument:'COMPANY_FLOW.md',
    centralized:true,
    independentPolicy:false,
    keepHistory:true,
    replaceOldEdition:false,
    note:'Detailed production, design, meeting, tier and artbook rules live only in COMPANY_FLOW.md.'
  };
  registry.updatedAt=date||registry.updatedAt;
  fs.writeFileSync(file,JSON.stringify(registry,null,2)+'\n');
}

console.log(`ARTBOOK_PIPELINE_GAME=${gameId}`);
console.log('POLICY_DOCUMENT=COMPANY_FLOW.md');
syncRegistryPolicy();
await run('tools/artbook-fact-pack.mjs');
await run('tools/company-design-cycle.mjs');
console.log('ARTBOOK_PIPELINE_COMPLETE=YES');
console.log('DESIGN_AUTHOR=ONE_GAME_DESIGNER_AI');
console.log('DEPARTMENT_MODE=MULTIMODEL_REVIEW_MEETING');
console.log('ARTBOOK_AUTHOR=ONE_ARTBOOK_EDITOR_AI');
console.log('DEPARTMENT_ARTBOOK_AUTHORSHIP=NO');
console.log('PAID_API=NO');
