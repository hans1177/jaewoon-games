import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { materializeDeterministicCheckpointCandidate } from '../tools/company-design-checkpoint-recovery.mjs';

const write=(root,file,value)=>{const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(value,null,2)+'\n');};

function fixture({score=80,hard=[],critical=[],repair=true}={}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-recovery-'));
  write(root,'company-learning/platform-release-roadmap.json',{
    developmentLifecycleMachine:{deterministicGateAuthority:{enabled:true,aiMayDecidePassFail:false}}
  });
  write(root,'game-seed-state.json',{seeds:[{
    gameId:'g',gameName:'Game',seedId:'S1',status:'ACTIVE',GAME_CATEGORY:'CASUAL',
    MULTIPLAYER_DESIGN_MODE:'SINGLE'
  }],seedMaterialLearning:{events:[]}});
  write(root,'game-catalog.json',{games:[{id:'g',name:'Game'}]});
  const draft={
    identity:'distinct identity',playerFantasy:'fantasy',coreFun:'choice changes state',
    coreLoop:['act','observe','choose'],signatureSystems:[{name:'A',purpose:'p',playerChoice:'c'},{name:'B',purpose:'p',playerChoice:'c'}],
    conceptBlueprint:{premise:'detailed premise',designPillars:['a','b','c'],sessionArc:['start','middle','end'],emotionalCurve:['curious','tense','relief'],worldRules:['rule one','rule two'],signatureMoments:['moment one','moment two']},
    designAlternatives:[
      {id:'PLAN_A',concept:'deepen current loop',genreDirection:'casual',coreLoopDifference:'more meaningful choices',playerValue:'clarity',risks:'complexity',reversibility:'high'},
      {id:'PLAN_B',concept:'add a reversible hybrid event',genreDirection:'casual hybrid',coreLoopDifference:'temporary alternate pressure',playerValue:'variety',risks:'learning cost',reversibility:'event can be disabled'}
    ],
    contentDiversityPlan:{regionsOrSpaces:[{name:'A'},{name:'B'}],enemiesActorsOrObstacles:[{name:'E1'},{name:'E2'}],variationGuard:'not stats only'},
    creativeChallenge:{baselineRelationship:'preserve identity',experiments:['hybrid event'],genreShiftConsidered:false,genreShiftChallenger:'none',selectedChallenge:'hybrid event',rollbackCondition:'disable event'},
    narrativeDirection:{applicable:false,worldRules:[],characterSpeechProfiles:[],scenePlans:[],foreshadowingAndPayoff:[],dialoguePrinciples:[],inspirationReferences:[]},
    progressionDirection:'grow',visualDirection:'clear',mobileUx:'touch',marketTargetDirection:'market',
    steamExpansionDecision:'later',multiplayerMode:'SINGLE',multiplayerExpansionDecision:'validated later',
    technicalAssumptions:[],validationQuestions:[],openQuestions:[]
  };
  const phases={
    designer_draft:draft,
    deterministic_pre_gate:{passMinimum:80,totalScore:78,hardFailures:['CRITICAL_AXIS_MINIMUM_FAIL'],criticalAxisFailures:['CONTENT_EXPANSION_PLAN']}
  };
  if(repair){
    phases.designer_pre_gate_repair_1={contentExpansionPlan:[
      {milestone:'m1',newGameplay:'g1',systemImpact:'i1'},
      {milestone:'m2',newGameplay:'g2',systemImpact:'i2'},
      {milestone:'m3',newGameplay:'g3',systemImpact:'i3'}
    ]};
    phases.deterministic_pre_gate_after_repair_1={passMinimum:80,totalScore:score,hardFailures:hard,criticalAxisFailures:critical};
  }
  write(root,'design/g/2026-09-19/design-checkpoint.json',{
    gameId:'g',date:'2026-09-19',seedId:'S1',fingerprint:'fp',effectiveDesignerModel:'model-x',
    completedPhases:Object.keys(phases),phases
  });
  return root;
}

test('deterministic PASS checkpoint materializes a candidate without synthesizing AI review',()=>{
  const root=fixture();
  try{
    const result=materializeDeterministicCheckpointCandidate({gameId:'g',date:'2026-09-19',root});
    assert.equal(result.totalScore,80);
    assert.equal(result.phase,'deterministic_pre_gate_after_repair_1');
    const revised=JSON.parse(fs.readFileSync(path.join(root,'design/g/2026-09-19/design-revised.json')));
    const status=JSON.parse(fs.readFileSync(path.join(root,'design/g/2026-09-19/cycle-status.json')));
    assert.equal(revised.recovery.aiVerdictUsed,false);
    assert.equal(revised.content.contentExpansionPlan.length,3);
    assert.equal(status.status,'COMPLETE');
    assert.equal(status.departments.reviewMode,'DETERMINISTIC_EVIDENCE');
    assert.equal(status.departments.count,0);
    assert.equal(status.disposition.fiveDepartmentLeadReviewCompleted,false);
    assert.equal(status.deterministicRecovery.aiReviewUsed,false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('preservation checkpoint without locked contract is not recovered',()=>{
  const root=fixture();
  try{
    const state=JSON.parse(fs.readFileSync(path.join(root,'game-seed-state.json'),'utf8'));
    Object.assign(state.seeds[0],{
      REUSE_EXISTING_GAMEPLAY_IMPLEMENTATION:true,
      OWNER_REBUILD_MODE:'PRESERVATION_PRESENTATION_UPGRADE',
      TARGET_SESSION_MINUTES:30,
      MULTIPLAYER_DESIGN_MODE:'HYBRID'
    });
    fs.writeFileSync(path.join(root,'game-seed-state.json'),JSON.stringify(state,null,2)+'\n');
    assert.throws(
      ()=>materializeDeterministicCheckpointCandidate({gameId:'g',date:'2026-09-19',root}),
      /PRESERVATION_CONTRACT_STALE/
    );
    assert.equal(fs.existsSync(path.join(root,'design/g/2026-09-19/design-revised.json')),false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('checkpoint with hard failures cannot be promoted by deterministic recovery',()=>{
  const root=fixture({score:90,hard:['HARD_FAIL'],critical:[]});
  try{
    assert.throws(()=>materializeDeterministicCheckpointCandidate({gameId:'g',date:'2026-09-19',root}),/NO_DETERMINISTIC_PASS/);
    assert.equal(fs.existsSync(path.join(root,'design/g/2026-09-19/design-revised.json')),false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('workflow checks deterministic recovery before Gemini quota and gate never requires Gemini key',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  const baseline=fs.readFileSync('tools/company-baseline-gate.mjs','utf8');
  const recoverAt=workflow.indexOf('Recover verified deterministic design checkpoint before external model wait');
  const quotaAt=workflow.indexOf('Resolve checkpoint-aware Gemini quota lanes');
  assert(recoverAt>=0&&quotaAt>recoverAt);
  assert.match(workflow,/DESIGN_GATE_AUTHORITY=DETERMINISTIC_EVIDENCE/);
  assert.match(workflow,/GEMINI_API_KEY_REQUIRED_FOR_GATE=NO/);
  assert.doesNotMatch(workflow,/test -n .*GEMINI_API_KEY.*GEMINI_API_KEY_REQUIRED/);
  assert.match(workflow,/steps\.deterministic_recovery\.outputs\.materialized != 'true'/);
  assert.match(baseline,/deterministic-design-pre-gate-pass-required/);
  assert.match(baseline,/aiReviewIsGateAuthority:false/);
});


test('stale checkpoint without continuous design blueprint is not recovered',()=>{
  const root=fixture();
  try{
    const checkpointPath=path.join(root,'design/g/2026-09-19/design-checkpoint.json');
    const checkpoint=JSON.parse(fs.readFileSync(checkpointPath,'utf8'));
    delete checkpoint.phases.designer_draft.conceptBlueprint;
    fs.writeFileSync(checkpointPath,JSON.stringify(checkpoint,null,2)+'\n');
    assert.throws(
      ()=>materializeDeterministicCheckpointCandidate({gameId:'g',date:'2026-09-19',root}),
      /CONTINUOUS_DESIGN_CONTRACT_STALE/
    );
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
