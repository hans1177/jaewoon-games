import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { integrateDepartmentCandidates } from '../tools/autonomous-department-integrator.mjs';
import { canUseDeterministicFinalization, buildDeterministicFinalization } from '../tools/autonomous-department-cycle.mjs';

const legacyRoles=['development','graphics','qa','balance'];
const canonicalRoles=['development','graphics','qa','audio'];
const reviewRoles=['planning','graphics','development','qa','audio'];
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
function setup({legacy=true}={}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-dept-integrate-'));
  const previous=process.cwd();process.chdir(root);
  fs.mkdirSync('web-games/demo',{recursive:true});
  fs.writeFileSync('web-games/demo/app.js','const a = 1;\nconst b = 2;\n');
  fs.writeFileSync('web-games/demo/style.css','body { margin: 0; }\n');
  const implementationRoles=legacy?legacyRoles:canonicalRoles;
  for(const role of implementationRoles){fs.mkdirSync(`department-implementations/${role}`,{recursive:true});writeJson(`department-implementations/${role}/status.json`,{role,status:'NO_SCOPE',scope:[]});}
  const order={run:true,gameId:'PTEST',gameSlug:'demo',sourcePath:'web-games/demo',goal:'small goal',repairMode:'MODEL'};
  const cycle={finalGoal:'integrated goal',parallelDepartments:implementationRoles,
    results:[],allDepartmentsWorked:true,finalDecision:'PROCEED'};
  return {root,previous,order,cycle,cleanup(){process.chdir(previous);fs.rmSync(root,{recursive:true,force:true});}};
}
function addImplementation(role,sourceCommit,files){
  const root=`department-implementations/${role}`;fs.rmSync(root,{recursive:true,force:true});fs.mkdirSync(`${root}/game`,{recursive:true});fs.cpSync('web-games/demo',`${root}/game`,{recursive:true});
  for(const [rel,content] of Object.entries(files)){const file=`${root}/game/${rel}`;fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);}
  const changedFiles=Object.keys(files);
  writeJson(`${root}/evidence.json`,{sourcePath:'web-games/demo',sourceCommit,candidateId:`${role}-candidate`,changedFiles,summary:role,expectedEffect:'test'});
  writeJson(`${root}/status.json`,{role,status:'PASS',scope:changedFiles,candidateId:`${role}-candidate`,changedFiles});
}
function safeReviewResults(){
  return reviewRoles.map(role=>({role,workState:'DONE',decision:'PROCEED',summary:`${role} ok`,nextAction:`${role} 제약`,checks:[`${role} 확인`],risks:[]}));
}

test('parallel department changes three-way merge when edits do not overlap',()=>{
  const t=setup();try{
    const sourceCommit='source-sha';
    addImplementation('development',sourceCommit,{'app.js':'const a = 10;\nconst b = 2;\n'});
    addImplementation('graphics',sourceCommit,{'style.css':'body { margin: 0; padding: 4px; }\n'});
    addImplementation('balance',sourceCommit,{'app.js':'const a = 1;\nconst b = 20;\n'});
    const report=integrateDepartmentCandidates({order:t.order,cycle:t.cycle,implementationsDir:'department-implementations',candidateId:'final',candidatePath:'web-games/.autonomous-candidates/PTEST/final',sourceCommit,evidencePath:'.autonomous/evidence/final.json',reportPath:'department-integration.json'});
    assert.equal(report.status,'PASS');
    assert.equal(fs.readFileSync('web-games/.autonomous-candidates/PTEST/final/app.js','utf8'),'const a = 10;\nconst b = 20;\n');
    const evidence=JSON.parse(fs.readFileSync('.autonomous/evidence/final.json','utf8'));
    assert.equal(evidence.integration.mode,'COMMON_BASE_THREE_WAY');
    assert.equal(evidence.saveKeyValidation,'PASS');
  }finally{t.cleanup();}
});

test('true same-line conflict is blocked until a resolved candidate is supplied',()=>{
  const t=setup();try{
    const sourceCommit='source-sha';
    addImplementation('development',sourceCommit,{'app.js':'const a = 10;\nconst b = 2;\n'});
    addImplementation('balance',sourceCommit,{'app.js':'const a = 99;\nconst b = 2;\n'});
    const first=integrateDepartmentCandidates({order:t.order,cycle:t.cycle,implementationsDir:'department-implementations',candidateId:'final',candidatePath:'web-games/.autonomous-candidates/PTEST/final',sourceCommit,evidencePath:'.autonomous/evidence/final.json',reportPath:'department-integration.json'});
    assert.equal(first.status,'CONFLICT');
    assert.equal(first.conflictCount,1);
    fs.mkdirSync('web-games/.autonomous-candidates/PTEST/resolved',{recursive:true});
    fs.cpSync('web-games/demo','web-games/.autonomous-candidates/PTEST/resolved',{recursive:true});
    fs.writeFileSync('web-games/.autonomous-candidates/PTEST/resolved/app.js','const a = 10;\nconst b = 2;\n');
    const second=integrateDepartmentCandidates({order:t.order,cycle:t.cycle,implementationsDir:'department-implementations',candidateId:'final',candidatePath:'web-games/.autonomous-candidates/PTEST/final',sourceCommit,resolutionCandidate:'web-games/.autonomous-candidates/PTEST/resolved',evidencePath:'.autonomous/evidence/final.json',reportPath:'department-integration.json'});
    assert.equal(second.status,'PASS');
    assert.ok(fs.existsSync('.autonomous/evidence/final.json'));
  }finally{t.cleanup();}
});

test('unanimous proceed with no risk can use deterministic planning finalization',()=>{
  const results=safeReviewResults();
  const vibeCore={routing:{mayDispatch:true,mayExecute:true,requiresOwnerAction:false}};
  assert.equal(canUseDeterministicFinalization({vibeCore,results}),true);
  const final=buildDeterministicFinalization(results);
  assert.equal(final.decision,'PROCEED');
  assert.equal(final.integrationMode,'DETERMINISTIC_SAFE_CONSENSUS');
  for(const role of reviewRoles)assert.match(final.nextAction,new RegExp(`${role} 제약`));
  assert.equal(final.risks.length,0);
});

test('adjustment, reported risk, or owner action keeps planning-final AI required',()=>{
  const vibeCore={routing:{mayDispatch:true,mayExecute:true,requiresOwnerAction:false}};
  const adjusted=safeReviewResults();adjusted[1].decision='ADJUST';
  assert.equal(canUseDeterministicFinalization({vibeCore,results:adjusted}),false);
  const risky=safeReviewResults();risky[3].risks=['재현 필요'];
  assert.equal(canUseDeterministicFinalization({vibeCore,results:risky}),false);
  const owner={routing:{mayDispatch:true,mayExecute:true,requiresOwnerAction:true}};
  assert.equal(canUseDeterministicFinalization({vibeCore:owner,results:safeReviewResults()}),false);
});


test('canonical audio department merges sound code without admitting independent balance implementation',()=>{
  const t=setup({legacy:false});
  try{
    const sourceCommit='sound-source-revision';
    fs.writeFileSync('web-games/demo/audio.js','const cue = new Audio("./sfx.ogg");\n');
    addImplementation('development',sourceCommit,{'app.js':'const a = 10;\nconst b = 2;\n'});
    addImplementation('audio',sourceCommit,{'audio.js':'const cue = new Audio("./sfx.ogg");\ncue.volume = 0.4;\n'});
    const report=integrateDepartmentCandidates({order:t.order,cycle:t.cycle,
      implementationsDir:'department-implementations',candidateId:'audio-final',
      candidatePath:'web-games/.autonomous-candidates/PTEST/audio-final',sourceCommit,
      evidencePath:'.autonomous/evidence/audio-final.json',reportPath:'department-audio-integration.json'});
    assert.equal(report.status,'PASS');
    assert.deepEqual(report.components.filter(row=>row.status==='PASS').map(row=>row.role),['development','audio']);
    assert.equal(fs.readFileSync('web-games/.autonomous-candidates/PTEST/audio-final/audio.js','utf8'),
      'const cue = new Audio("./sfx.ogg");\ncue.volume = 0.4;\n');
    const evidence=JSON.parse(fs.readFileSync('.autonomous/evidence/audio-final.json','utf8'));
    assert.equal(evidence.saveKeyValidation,'PASS');
    assert.equal(evidence.departmentCycle.parallelDepartments.includes('audio'),true);
    assert.equal(evidence.departmentCycle.parallelDepartments.includes('balance'),false);
  }finally{t.cleanup();}
});

test('canonical five reviews require audio and do not accept a legacy balance vote as its substitute',()=>{
  const vibeCore={routing:{mayDispatch:true,mayExecute:true,requiresOwnerAction:false}};
  const current=safeReviewResults();
  assert.deepEqual(current.map(row=>row.role),reviewRoles);
  assert.equal(canUseDeterministicFinalization({vibeCore,results:current}),true);
  const missing=current.map(row=>row.role==='audio'?{...row,role:'balance'}:row);
  assert.equal(canUseDeterministicFinalization({vibeCore,results:missing}),false);
});

test('company stage review and verified experience use five active departments while keeping legacy balance history', async()=>{
  const { COMPANY_REVIEW_ROLES, summarizeInternalReview, createDepartmentReview } = await import('../assets/vibe-company-development-flow.js');
  const { createCompanyStageAssignment } = await import('../assets/vibe-company-orchestration-bridge.js');
  const { createDepartmentExperienceState, createDepartmentQualityProfile, awardDepartmentExperience } = await import('../assets/department-experience.js');
  const { createCompanyQualityBar } = await import('../assets/company-quality-bar.js');
  assert.deepEqual(COMPANY_REVIEW_ROLES,['planning','graphics','development','qa','audio']);
  for(const stage of ['playable-draft','internal-review','integrated-qa'])
    assert.deepEqual(createCompanyStageAssignment({stageId:stage}).roles,COMPANY_REVIEW_ROLES);
  assert.deepEqual(createCompanyStageAssignment({stageId:'core-fun'}).roles,['planning','qa']);
  assert.ok(createCompanyStageAssignment({stageId:'graphics-upgrade'}).roles.includes('audio'));
  assert.ok(createCompanyStageAssignment({stageId:'optimization'}).roles.includes('audio'));
  const reviews=COMPANY_REVIEW_ROLES.map(role=>createDepartmentReview({role,decision:'PASS'}));
  assert.equal(summarizeInternalReview({reviews}).decision,'PASS');
  const legacy=[...reviews.filter(row=>row.role!=='audio'),createDepartmentReview({role:'balance',decision:'PASS'})];
  const blocked=summarizeInternalReview({reviews:legacy});
  assert.equal(blocked.ready,false);
  assert.ok(blocked.missingRoles.includes('audio'));
  assert.equal(summarizeInternalReview({reviews:[...reviews,createDepartmentReview({role:'balance',decision:'DROP'})]}).decision,'PASS');
  const state=createDepartmentExperienceState({departments:{balance:{xp:200},audio:{xp:0},planning:{xp:400},graphics:{xp:400},development:{xp:9280},qa:{xp:3760}}});
  assert.equal(state.departments.balance.xp,200);
  assert.equal(createDepartmentQualityProfile('audio',state).department,'audio');
  assert.equal(awardDepartmentExperience(state,{department:'audio',verified:false,evidence:'no-proof'}).awarded,false);
  assert.throws(()=>awardDepartmentExperience(state,{department:'balance',verified:true,evidence:'verified',reward:'qaPass'}));
  assert.equal(createCompanyQualityBar(state).averageLevel,5);
  const awardSource=fs.readFileSync(new URL('../tools/award-department-experience.mjs',import.meta.url),'utf8');
  const postmortemSource=fs.readFileSync(new URL('../tools/award-postmortem-learning.mjs',import.meta.url),'utf8');
  assert.match(awardSource,/audio: \[/);
  assert.doesNotMatch(awardSource,/\n  balance: \[/);
  assert.match(postmortemSource,/graphics','audio','balance'/);
});

test('verified department XP fetches exact QA source revision and parent without whole-repo history',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/department-experience.yml',import.meta.url),'utf8');
  assert.match(workflow,/git fetch --no-tags --depth=2 origin "\$SOURCE_SHA"/);
  assert.match(workflow,/node tools\/award-department-experience\.mjs "\$SOURCE_SHA"/);
});
