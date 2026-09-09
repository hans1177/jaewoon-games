// 역할: FACT PACK → 학습 컨텍스트 → 5부서 독립 작성 → 의미 품질 재작성 → 품질 게이트를 한 번에 실행한다.
import { spawn } from 'node:child_process';

const ROLES=['planning','graphics','development','qa','balance'];
const gameId=String(process.env.ARTBOOK_GAME_ID||'').trim();
const date=String(process.env.ARTBOOK_DATE||'').trim();
const maxParallel=Math.max(1,Math.min(5,Number(process.env.ARTBOOK_DEPARTMENT_PARALLEL||2)||2));
if(!gameId)throw new Error('ARTBOOK_GAME_ID is required');

function run(script,extraEnv={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[script],{stdio:'inherit',env:{...process.env,ARTBOOK_GAME_ID:gameId,...(date?{ARTBOOK_DATE:date}:{}),...extraEnv}});
    child.on('error',reject);
    child.on('close',code=>code===0?resolve():reject(new Error(`${script} exited ${code}`)));
  });
}
async function pool(items,limit,worker){
  let next=0;
  const workers=Array.from({length:Math.min(limit,items.length)},async()=>{
    while(true){
      const index=next++;
      if(index>=items.length)return;
      await worker(items[index]);
    }
  });
  await Promise.all(workers);
}

console.log(`ARTBOOK_PIPELINE_GAME=${gameId}`);
console.log(`ARTBOOK_PIPELINE_PARALLEL=${maxParallel}`);
await run('tools/artbook-fact-pack.mjs');
await run('tools/artbook-learning-context.mjs');
await pool(ROLES,maxParallel,role=>run('tools/artbook-department-runner.mjs',{ARTBOOK_ROLE:role}));
await pool(ROLES,maxParallel,role=>run('tools/artbook-department-rewrite.mjs',{ARTBOOK_ROLE:role}));
await run('tools/artbook-gate.mjs');
console.log('ARTBOOK_PIPELINE_COMPLETE=YES');
console.log('PAID_API=NO');
