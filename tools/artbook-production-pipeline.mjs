// 파일명: tools/artbook-production-pipeline.mjs
// 역할: 중앙 정책에 따라 FACT PACK → 단일 디자이너 초안 → 5개 고유 Lead AI + 부서별 보조 다중모델 검토/회의 → 동일 디자이너 수정 → 단일 아트북 편집 → 분류별 근거 게이트를 실행한다.
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

console.log(`ARTBOOK_PIPELINE_GAME=${gameId}`);
console.log('POLICY_DOCUMENT=COMPANY_FLOW.md');
await run('tools/artbook-fact-pack.mjs');
await run('tools/company-design-cycle.mjs');
await run('tools/company-baseline-gate.mjs');
console.log('ARTBOOK_PIPELINE_COMPLETE=YES');
console.log('DESIGN_AUTHOR=ONE_GAME_DESIGNER_AI');
console.log('DEPARTMENT_MODE=FIVE_DISTINCT_LEADS_PLUS_MULTIMODEL_ASSISTANTS');
console.log('DEPARTMENT_REPRESENTATIVE_OWNER=DEPARTMENT_LEAD_MODEL');
console.log('DEPARTMENT_REBUTTAL_OWNER=DEPARTMENT_LEAD_MODEL');
console.log('DESIGN_ONLY_ARTBOOK_DIRECT=YES');
console.log('ARTBOOK_AUTHOR=ONE_ARTBOOK_EDITOR_AI');
console.log('DEPARTMENT_ARTBOOK_AUTHORSHIP=NO');
console.log('BASELINE_APPROVAL=EVIDENCE_GATE_SEPARATE_FROM_AI_MEETING');
console.log('PAID_API=NO');
