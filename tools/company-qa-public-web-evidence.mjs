// 파일명: tools/company-qa-public-web-evidence.mjs
// 역할: public-game-health의 Playwright 실플레이 결과를 재운컴퍼니 QA 공식 런타임 증거 형식으로 변환한다.
import fs from 'node:fs';
import path from 'node:path';

const readJson=(file,fallback={})=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};
const clean=v=>String(v??'').trim();

export function createPublicWebQaEvidence(health={}){
  const games=(Array.isArray(health.games)?health.games:[]).map(game=>{
    const signals=game?.signals||{};
    const issues=Array.isArray(game?.issues)?game.issues:[];
    const blockingIssues=issues.filter(issue=>['pageerror','navigation','console'].includes(clean(issue?.type).toLowerCase()));
    const requiredSignals={
      loadOk:signals.loadOk===true,
      contentSignal:signals.contentSignal===true,
      inputDelivered:signals.inputDelivered===true,
      reloadOk:signals.reloadOk===true,
      overflowOk:signals.overflowOk===true
    };
    const requiredSignalsPassed=Object.values(requiredSignals).every(Boolean);
    const healthy=clean(game?.status).toLowerCase()==='healthy';
    const qaPassEligible=healthy&&requiredSignalsPassed&&blockingIssues.length===0;
    const playTestEvidence=[
      `Playwright launch=${requiredSignals.loadOk?'PASS':'FAIL'} content=${requiredSignals.contentSignal?'PASS':'FAIL'}`,
      `input smoke=${requiredSignals.inputDelivered?'PASS':'FAIL'} reload=${requiredSignals.reloadOk?'PASS':'FAIL'}`,
      `mobile overflow=${requiredSignals.overflowOk?'PASS':'FAIL'} viewport smoke`,
      `health=${clean(game?.status)||'unknown'} score=${Number(game?.score)||0}`
    ];
    if(clean(game?.screenshot))playTestEvidence.push(`screenshot=${clean(game.screenshot)}`);
    return {
      gameId:clean(game?.gameId),
      target:'web',
      checkedAt:clean(game?.checkedAt)||clean(health?.updatedAt),
      source:'public-game-health.json',
      runtimeSmokePassed:qaPassEligible,
      qaPassEligible,
      requiredSignals,
      playTestEvidence,
      blockers:blockingIssues.map(issue=>`${clean(issue.type)}: ${clean(issue.message)}`).filter(Boolean),
      screenshot:clean(game?.screenshot)||null
    };
  }).filter(game=>game.gameId);
  return {
    version:1,
    generatedAt:clean(health?.updatedAt)||new Date().toISOString(),
    source:'public-game-health.json',
    testMethod:'Playwright mobile smoke-play',
    policy:{
      codeReviewAloneIsQa:false,
      healthyRequiredForQaPass:true,
      loadContentInputReloadOverflowRequired:true,
      blockingRuntimeErrorsAllowed:false
    },
    games
  };
}

if(import.meta.url===new URL(`file://${process.argv[1]}`).href){
  const health=readJson(process.env.PUBLIC_GAME_HEALTH_FILE||'public-game-health.json',{games:[]});
  const output=process.env.COMPANY_QA_WEB_EVIDENCE_FILE||'qa-artifacts/company-qa/public-web-runtime-evidence.json';
  const result=createPublicWebQaEvidence(health);
  writeJson(output,result);
  console.log(`COMPANY_QA_WEB_EVIDENCE=${result.games.length}`);
  console.log(`COMPANY_QA_WEB_PASS_ELIGIBLE=${result.games.filter(game=>game.qaPassEligible).length}`);
}
