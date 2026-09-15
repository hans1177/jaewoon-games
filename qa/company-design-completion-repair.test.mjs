import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  DESIGN_COMPLETION_MAX_ATTEMPTS,
  collectDesignCompletionGaps,
  strictFeedbackForDesignRepair,
  buildDesignCompletionPrompt,
} from '../tools/company-design-completion-repair.mjs';

const design=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
const pipeline=fs.readFileSync('tools/artbook-production-pipeline.mjs','utf8');
const required=['identity','playerFantasy','coreFun','coreLoop','signatureSystems','progressionDirection','visualDirection','mobileUx','marketTargetDirection','steamExpansionDecision','multiplayerMode','multiplayerExpansionDecision','technicalAssumptions','validationQuestions','openQuestions'];
const schema={required};
const valid={
  identity:'정체성',playerFantasy:'판타지',coreFun:'핵심 재미',coreLoop:['탐색','선택','보상'],signatureSystems:[{name:'시스템',purpose:'목적',playerChoice:'선택'}],
  progressionDirection:'성장 방향',visualDirection:'비주얼 방향',mobileUx:'모바일 UX',marketTargetDirection:'타겟 방향',steamExpansionDecision:'확장 판단',
  multiplayerMode:'SINGLE',multiplayerExpansionDecision:'멀티 판단',technicalAssumptions:[],validationQuestions:[],openQuestions:[],
};

test('completion repair detects missing progression and blank required design fields without fabricating scores',()=>{
  const gaps=collectDesignCompletionGaps({...valid,progressionDirection:'',visualDirection:undefined},schema);
  assert.ok(gaps.includes('root.progressionDirection:blank'));
  assert.ok(gaps.includes('root.visualDirection:blank'));
  assert.equal(collectDesignCompletionGaps(valid,schema).length,0);
  assert.equal(DESIGN_COMPLETION_MAX_ATTEMPTS,2);
});

test('completion repair preserves strict review as feedback only',()=>{
  const feedback=strictFeedbackForDesignRepair({verdict:'REVISE',totalScore:91,hardFailures:['STORY_INCOHERENT'],improvementTargets:[{dimension:'progressionBalance',current:2,maxScore:5,gap:3}]});
  assert.equal(feedback.verdict,'REVISE');
  assert.equal(feedback.totalScore,91);
  const prompt=buildDesignCompletionPrompt({originalPrompt:'GAME_SEED=x',schema,error:'schema required missing: root.progressionDirection',gaps:['root.progressionDirection:missing'],priorStrictFeedback:feedback});
  assert.match(prompt,/DESIGN_COMPLETION_REPAIR=YES/);
  assert.match(prompt,/root\.progressionDirection/);
  assert.match(prompt,/점수·PASS·hard failure 결과를 직접 만들거나 조작하지 않는다/);
});

test('design cycle uses a separate bounded completion stage while generic schema retry remains two attempts',()=>{
  assert.match(design,/DESIGN_COMPLETION_MAX_ATTEMPTS/);
  assert.match(design,/callDesignModel\(/);
  assert.match(design,/DESIGN_COMPLETION_ATTEMPT=/);
  assert.match(design,/DESIGN_COMPLETION_PASS=YES/);
  assert.match(design,/PRIOR_STRICT_REVIEW_FEEDBACK/);
  assert.match(design,/for\(let attempt=1;attempt<=2;attempt\+\+\)/);
  assert.doesNotMatch(design,/attempt<=3/);
});

test('completion stage does not weaken promotion gates or reintroduce pre-Web artbook',()=>{
  assert.doesNotMatch(design,/totalScore\s*=\s*80|verdict\s*=\s*['\"]PASS['\"]/);
  const designBranch=pipeline.slice(pipeline.indexOf('}else{'),pipeline.indexOf("console.log('ARTBOOK_PIPELINE_COMPLETE=YES')"));
  assert.doesNotMatch(designBranch,/company-design-artbook\.mjs/);
  assert.match(designBranch,/DESIGN_ONLY_ARTBOOK_BEFORE_PROMOTION=NO/);
});
