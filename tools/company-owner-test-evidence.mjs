import fs from 'node:fs';
import path from 'node:path';

const clean=v=>String(v??'').trim();
const allowedVerdicts=new Set(['PASS','REVISE','REBUILD']);
const requiredScores=['ideaDistinctness','categoryFit','platformFit','designFidelity','thirtyMinutePlay','implementation','storyCoherence','progressionBalance','artAlignment'];

export function validateOwnerTestEvidence(input={}){
  const errors=[];
  const gameId=clean(input.gameId);
  const verdict=clean(input.verdict).toUpperCase();
  if(!gameId)errors.push('GAME_ID_REQUIRED');
  if(!allowedVerdicts.has(verdict))errors.push('VERDICT_MUST_BE_PASS_REVISE_OR_REBUILD');
  const minutes=Number(input.playMinutes);
  if(!Number.isFinite(minutes)||minutes<30)errors.push('THIRTY_MINUTE_PLAY_REQUIRED');
  const scores={};
  for(const key of requiredScores){
    const value=Number(input.scores?.[key]);
    if(!Number.isFinite(value)||value<0||value>100)errors.push(`INVALID_SCORE_${key}`);
    else scores[key]=value;
  }
  const blockers=Array.isArray(input.blockers)?[...new Set(input.blockers.map(clean).filter(Boolean))]:[];
  const hardGateFailures=Array.isArray(input.hardGateFailures)?[...new Set(input.hardGateFailures.map(clean).filter(Boolean))]:[];
  if(verdict==='PASS'&&hardGateFailures.length)errors.push('PASS_FORBIDDEN_WITH_HARD_GATE_FAILURE');
  if(verdict==='PASS'&&Object.values(scores).some(value=>value<80))errors.push('PASS_FORBIDDEN_WITH_DOMAIN_SCORE_BELOW_80');
  const aggregate=requiredScores.every(key=>Number.isFinite(scores[key]))
    ? requiredScores.reduce((sum,key)=>sum+scores[key],0)/requiredScores.length
    : null;
  if(verdict==='PASS'&&aggregate<90)errors.push('PASS_REQUIRES_AGGREGATE_90');
  const multiplayerApplicable=input.multiplayerApplicable===true;
  if(multiplayerApplicable){
    if(Number(input.multiplayerPlayersTested||0)<2)errors.push('MULTIPLAYER_REQUIRES_TWO_OR_MORE_REAL_PLAYERS');
    if(input.multiplayerInteractionPassed!==true)errors.push('MULTIPLAYER_INTERACTION_PASS_REQUIRED');
  }
  return {pass:errors.length===0,errors,normalized:{
    version:1,gameId,verdict,playMinutes:minutes,scores,aggregateScore:aggregate,
    blockers,hardGateFailures,multiplayerApplicable,
    multiplayerPlayersTested:Number(input.multiplayerPlayersTested||0),
    multiplayerInteractionPassed:input.multiplayerInteractionPassed===true,
    designRevision:clean(input.designRevision)||null,
    platformRevision:clean(input.platformRevision)||null,
    tester:'OWNER',policyDocument:'COMPANY_FLOW.md',checkedAt:clean(input.checkedAt)||new Date().toISOString()
  }};
}

export function persistOwnerTestEvidence(input,{root='company-learning/owner-tests'}={}){
  const result=validateOwnerTestEvidence(input);
  if(!result.pass)throw new Error(`OWNER_TEST_EVIDENCE_FAILED\n- ${result.errors.join('\n- ')}`);
  const dir=path.join(root,result.normalized.gameId);
  fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,'latest.json');
  fs.writeFileSync(file,JSON.stringify(result.normalized,null,2)+'\n');
  return {file:file.replaceAll('\\','/'),evidence:result.normalized};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const file=process.argv[2];
  if(!file)throw new Error('usage: node tools/company-owner-test-evidence.mjs <evidence.json>');
  const input=JSON.parse(fs.readFileSync(file,'utf8'));
  const result=persistOwnerTestEvidence(input);
  console.log(`OWNER_TEST_EVIDENCE=PASS`);
  console.log(`OWNER_TEST_VERDICT=${result.evidence.verdict}`);
  console.log(`OWNER_TEST_AGGREGATE=${result.evidence.aggregateScore}`);
  console.log(`OWNER_TEST_OUTPUT=${result.file}`);
}
