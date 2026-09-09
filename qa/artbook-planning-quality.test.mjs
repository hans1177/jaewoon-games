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
function richPlan(role){
  return {
    creativeIdeas:[`${role} 정체성이 플레이 중 즉시 보이도록 핵심 장면의 정보 계층과 피드백을 구체화한다.`],
    implementationPlan:[`${role} 책임 범위의 상태와 화면 전환을 기존 시스템 경계에 연결하고 저장 의미는 유지한다.`],
    demoValidation:[`${role} 변경 전후 핵심 루프를 모바일 입력과 재시작 조건까지 포함해 실제 시나리오로 검증한다.`]
  };
}
function richSections(){
  return {
    planning:{worldEvidence:'현재 구현의 생존 지역과 자원 수집 흐름을 세계관 근거로 사용하고 새 설정은 제안으로 분리한다.',protagonistMotivationEvidence:'플레이어는 첫 자원 확보와 안전지대 구축을 통해 다음 지역을 탐험할 명확한 이유를 얻는다.',regionCausality:'초기 자원 고갈이 두 번째 지역 탐색을 만들고 그 결과가 중반 위협과 최종 결전으로 연결된다.',storyGameplayConnection:'퀘스트 완료 결과가 실제 지역 해금과 보스 출현 조건을 바꾸도록 진행 플래그에 연결한다.',gaps:'NPC 고유명과 후반 세력 관계는 현재 코드 근거가 부족하므로 확정 전에 추가 대조가 필요하다.',handoffs:'개발에는 단계별 진행 플래그를, QA에는 단계 전환과 저장 복구의 연속 검증을 넘긴다.'},
    graphics:{currentVisualEvidence:'현재 화면은 자원과 위험 상태를 구분하는 기본 HUD와 지역별 배경 요소를 사용한다.',identityDirection:'작은 생존자의 시점이 유지되도록 거대한 환경 대비와 위험 생물의 실루엣 차이를 핵심 정체성으로 둔다.',characterMonsterEnvironmentLogic:'플레이어와 중립 생물, 적대 생물은 크기와 자세, 접근 경고 효과를 달리해 전투 전에도 관계를 읽게 한다.',mobileReadability:'모바일에서는 핵심 자원과 체력, 상호작용 버튼을 엄지 영역에 유지하고 장식 정보는 후순위로 낮춘다.',assetConstraints:'기존 저장소 에셋을 우선 재사용하고 새 외부 에셋은 상업 이용이 명확한 무료 라이선스만 허용한다.',gaps:'후반 지역의 보스 실루엣과 상태 이상 아이콘은 현재 시각 근거가 부족해 추가 콘셉트 검증이 필요하다.',handoffs:'개발에는 HUD 우선순위와 상태별 시각 규칙을, QA에는 작은 화면에서 식별 가능한 최소 크기를 넘긴다.'},
    development:{implementedNow:'현재 핵심 루프는 이동과 자원 수집, 위험 회피, 전투 상태 전환으로 이어지며 기존 저장 의미를 유지한다.',architecture:'게임 상태와 렌더링 입력을 분리하고 기존 책임 함수에서 진행 플래그와 UI 갱신을 연결하는 구조를 유지한다.',prototypeLimits:'이번 설계는 핵심 루프와 한 지역 전환만 검증하며 대규모 콘텐츠와 최종 그래픽 폴리시는 범위에서 제외한다.',technicalRisks:'모바일 입력 중복과 저장 복구 시 진행 플래그 불일치가 주요 위험이므로 상태 전환 지점을 단일 책임으로 유지해야 한다.',demoPlan:'새 게임 시작부터 자원 확보와 첫 전투, 지역 전환, 저장 후 재실행까지 한 세션에서 확인하는 데모를 사용한다.',handoffs:'QA에는 입력과 저장 복구 시나리오를, 그래픽에는 상태별 HUD 계약을, 밸런스에는 측정 지점을 넘긴다.'},
    qa:{currentPlayableFlow:'새 게임 시작 후 이동과 자원 수집, 첫 전투, 지역 전환, 저장 후 재실행까지 막힘 없이 이어지는 흐름을 기준으로 한다.',verifiedEvidence:'검증 가능한 근거는 실제 공개 게임 경로와 작업지시, 저장 키 보존 규칙이며 새 제안은 별도 미검증으로 남긴다.',problemScenes:'작은 화면에서 전투 버튼과 이동 입력이 겹치는 장면, 지역 전환 직후 저장되는 장면을 우선 위험 구간으로 본다.',mobileSaveErrorRisks:'터치 이벤트 중복과 저장값 손상, 이전 진행 플래그 복원 실패가 모바일 회귀 위험이므로 재시작 테스트가 필요하다.',testScenarios:'세로형 작은 화면과 가로 화면에서 이동과 전투를 반복하고 저장 후 새로고침해 같은 진행 상태가 복구되는지 확인한다.',unverified:'후반 지역과 최종 보스 진행은 이번 테스트 범위 밖이라 실제 구현 근거가 생길 때까지 미검증 상태로 유지한다.',handoffs:'실패 장면은 개발 책임 함수와 재현 순서, 기대 상태를 함께 기록해 다음 수정이 한 책임 범위에서 이뤄지게 한다.'},
    balance:{currentNumbers:'현재 수치 자체를 임의 변경하지 않고 체력 감소량과 자원 획득량, 첫 전투 소요시간을 기준 측정값으로 수집한다.',progressionCurve:'초반은 자원 확보 성공률을 높이고 중반부터 선택 비용을 늘리되 기존 게임의 실제 수치와 규칙을 우선 보존한다.',combatFeel:'첫 적은 조작 학습을 방해하지 않는 길이로 유지하고 이후 적은 회피와 공격 타이밍 차이가 체감되도록 측정한다.',economyRewards:'보상은 기존 드랍과 제작 비용의 의미를 유지하며 한 세션에서 다음 행동을 선택할 수 있는지 획득과 소비 흐름으로 본다.',difficultyTransitions:'지역 전환 직후 난이도 급등 여부를 피해량과 회복 소비, 전투 시간 변화로 비교하고 규칙 자체는 임의 수정하지 않는다.',testMeasurements:'첫 제작까지 시간과 첫 전투 시간, 피해량, 회복 소비, 지역 전환 실패 횟수를 동일 조건에서 반복 측정한다.',handoffs:'QA에는 측정 시나리오를, 개발에는 기록할 상태 지점을 넘기고 수치 변경은 측정 결과가 쌓인 뒤 별도 판단한다.'}
  };
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

test('artbook gate rejects shallow non-planning sections even when the submission says READY',async()=>{
  const root=baseFixture();
  try{
    const sections=richSections();
    for(const role of ['planning','graphics','development','qa','balance']){
      const shallow=role==='development';
      writeJson(root,`artbook-submissions/${gameId}/${date}/${role}.json`,{
        version:6,gameId,date,department:role,status:'SUBMITTED',departmentReadiness:'READY',
        evidence:[{source:`web-games/${gameId}/index.html`,usage:'role-scoped-read-only-evidence'}],
        section:shallow?{implementedNow:'true',architecture:'serverless',prototypeLimits:'100',technicalRisks:'none',demoPlan:'live',handoffs:'none'}:sections[role],
        conceptPlan:shallow?{creativeIdeas:['gameplay'],implementationPlan:['serverless'],demoValidation:['live']}:richPlan(role)
      });
    }
    const result=await runNode(gate,[],{cwd:root,env:{ARTBOOK_DATE:date,ARTBOOK_GAME_ID:gameId}});
    assert.equal(result.code,0,result.stderr||result.stdout);
    const status=JSON.parse(fs.readFileSync(path.join(root,'artbook-gate-status.json'),'utf8'));
    const development=status.invalid.find(x=>x.role==='development');
    assert.ok(development);
    assert.ok(development.problems.includes('development-implementedNow-meaningful-text-required'));
    assert.ok(development.problems.includes('development-conceptPlan-items-too-shallow'));
    assert.equal(status.readyForDirectorAssembly,false);
    assert.equal(status.submissionContract,'V6_FIVE_DEPARTMENT_SEMANTIC_QUALITY_AND_REVIEW_SPECIFICITY');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
