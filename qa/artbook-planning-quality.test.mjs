import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';

const repoRoot=process.cwd();
const runner=path.join(repoRoot,'tools','artbook-department-runner.mjs');
const gate=path.join(repoRoot,'tools','artbook-gate.mjs');
const date='2026-09-09';
const gameId='qa-planning-game';

function writeJson(root,relative,value){
  const file=path.join(root,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
}
function baseFixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'artbook-planning-quality-'));
  writeJson(root,'artbook-submission-queue.json',{requiredRoles:['planning','graphics','development','qa','balance'],currentDailyTarget:gameId,games:[{gameId,name:'기획 QA 게임'}]});
  writeJson(root,'artbook-style-profiles.json',{games:{[gameId]:{identity:'생존 어드벤처'}}});
  writeJson(root,'public-game-health.json',{games:[]});
  writeJson(root,'asset-health.json',{assets:[]});
  const draftPath=`artbook-submissions/${gameId}/${date}/vibe2-first-draft.json`;
  writeJson(root,`artbook-work-orders/${date}-${gameId}.json`,{gameName:'기획 QA 게임',vibe2FirstDraftPath:draftPath,departmentTasks:{planning:{scope:'6단계 스토리와 퀘스트 인과를 검토한다.'}}});
  const stages=['OPENING','EARLY','MID','LATE','FINAL_BOSS','ENDING'];
  const phases=stages.map((stage,i)=>({stage,region:`${i+1}구역`,quest:`${stage} 핵심 목표를 해결한다`,cause:`이전 단계 결과로 ${i+1}구역 문제가 발생한다`,playerAction:`플레이어가 ${i+1}구역의 위협을 조사하고 대응한다`,result:`${i+1}구역 문제가 해결되어 다음 단계가 열린다`,nextHook:i<5?`${i+2}구역으로 이동한다`:'엔딩 이후 탐험이 열린다'}));
  writeJson(root,draftPath,{proposalOnly:true,generationMode:'DETERMINISTIC_FALLBACK',storySpine:{opening:'첫 생존 목표',early:'초반 자원 확보',mid:'중반 위협 추적',late:'후반 결전 준비',finalBoss:'최종 위협 격파',ending:'생존권 회복'},phasePlans:phases,regions:phases.map(x=>x.region),mainQuestChain:phases,npcMotivations:[],bossCausality:[{boss:'최종 포식자',trigger:'후반 목표 완료',whyNow:'생태 위기가 최고조에 이름',winConsequence:'생존권이 회복됨'}],gaps:['NPC와 세력의 고유 설정은 추가 검증 필요'],recommendedPages:18});
  fs.mkdirSync(path.join(root,'web-games',gameId),{recursive:true});
  fs.writeFileSync(path.join(root,'web-games',gameId,'index.html'),'<html><body><script>const story="생존 지역에서 자원을 모으고 boss를 추적한다"; const quest="최종 보스를 찾아간다";</script></body></html>');
  return root;
}
function lowCandidate(){
  return {headline:'survival',readiness:'NEEDS_VALIDATION',section:{worldEvidence:'survival',protagonistMotivationEvidence:'survival',regionCausality:'survival',storyGameplayConnection:'survival',gaps:'survival',handoffs:'survival'},conceptPlan:{creativeIdeas:['survival','survival','survival'],implementationPlan:['survival','survival','survival'],demoValidation:['survival','survival','survival']},unverified:[],visualNotes:['survival']};
}
function runNode(script,args,{cwd,env={}}={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[script,...args],{cwd,env:{...process.env,...env}});let stdout='',stderr='';
    child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);child.on('error',reject);child.on('close',code=>resolve({code,stdout,stderr}));
  });
}

test('planning runner rejects repeated one-word model output and uses meaningful Vibe2 causal review fallback',async()=>{
  const root=baseFixture();
  const server=http.createServer((req,res)=>{let body='';req.on('data',d=>body+=d);req.on('end',()=>{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({message:{content:JSON.stringify(lowCandidate())}}));});});
  await new Promise((resolve,reject)=>server.listen(11434,'127.0.0.1',resolve).once('error',reject));
  try{
    const result=await runNode(runner,[],{cwd:root,env:{ARTBOOK_ROLE:'planning',ARTBOOK_DATE:date,ARTBOOK_GAME_ID:gameId,ARTBOOK_LOCAL_MODEL:'fake-model'}});
    assert.equal(result.code,0,result.stderr||result.stdout);
    const output=JSON.parse(fs.readFileSync(path.join(root,'artbook-submissions',gameId,date,'planning.json'),'utf8'));
    assert.equal(output.runner.planningFallbackUsed,true);
    assert.equal(output.departmentReadiness,'NEEDS_VALIDATION');
    assert.equal(output.verification.planningSemanticQuality,true);
    assert.notEqual(output.section.worldEvidence,'survival');
    assert.match(output.section.regionCausality,/EARLY|MID|LATE/);
    assert.equal(output.conceptPlan.implementationPlan.length,3);
    assert.match(result.stdout,/ARTBOOK_PLANNING_FALLBACK_USED=YES/);
  }finally{server.close();fs.rmSync(root,{recursive:true,force:true});}
});

test('artbook gate rejects a structurally valid but semantically empty planning submission',async()=>{
  const root=baseFixture();
  try{
    for(const role of ['planning','graphics','development','qa','balance']){
      const data={version:6,gameId,date,department:role,status:'SUBMITTED',evidence:[{source:'fixture'}],section:role==='planning'?lowCandidate().section:{summary:`${role} 부서의 충분히 구체적인 검토 내용과 구현 근거를 기록한다.`},conceptPlan:role==='planning'?lowCandidate().conceptPlan:{creativeIdeas:[`${role}의 구체적인 개선 아이디어를 제안한다.`],implementationPlan:[`${role} 개선안을 실제 구현 단계에 연결한다.`],demoValidation:[`${role} 개선안을 시연 장면에서 검증한다.`]}};
      writeJson(root,`artbook-submissions/${gameId}/${date}/${role}.json`,data);
    }
    const result=await runNode(gate,[],{cwd:root,env:{ARTBOOK_DATE:date,ARTBOOK_GAME_ID:gameId}});
    assert.equal(result.code,0,result.stderr||result.stdout);
    const status=JSON.parse(fs.readFileSync(path.join(root,'artbook-gate-status.json'),'utf8'));
    const planning=status.invalid.find(x=>x.role==='planning');
    assert.ok(planning);
    assert.ok(planning.problems.includes('planning-content-too-repetitive'));
    assert.equal(status.readyForDirectorAssembly,false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
