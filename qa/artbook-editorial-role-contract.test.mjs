import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const flow=fs.readFileSync('COMPANY_FLOW.md','utf8');
const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const cycle=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
const pipeline=fs.readFileSync('tools/artbook-production-pipeline.mjs','utf8');
const workflow=fs.readFileSync('.github/workflows/artbook-free-department-bots.yml','utf8');

test('one central human policy source owns tier, design, meeting and artbook rules',()=>{
  assert.equal(directive.policyDocument,'COMPANY_FLOW.md');
  assert.match(flow,/유일한 사람용 제작 정책 원본/);
  assert.match(flow,/다른 문서에는 같은 정책을 다시 복제하지 않는다/);
});

test('departments use multiple distinct real local models from tier 3 onward',()=>{
  const models=[...new Set(directive.ai.modelPool)];
  assert.ok(models.length>=3);
  assert.ok(directive.ai.minDistinctModelsPerDepartment>=3);
  assert.equal(directive.ai.modelIdentityFixed,false);
  assert.match(cycle,/distinct member model gate failed/);
  assert.match(workflow,/Pull all configured free department models/);
});

test('detailed design has one designer and the same model revises after the meeting',()=>{
  assert.equal(directive.ai.gameDesigner.singleAuthorPerRevisionCycle,true);
  assert.equal(directive.ai.gameDesigner.sameModelRevisesAfterMeeting,true);
  assert.match(cycle,/authorRole:'GAME_DESIGNER_AI'/);
  assert.match(cycle,/sameModelAsDraft:true/);
  assert.match(cycle,/CONSENSUS만 자동 반영/);
});

test('five departments review, internally consolidate and perform one rebuttal round',()=>{
  assert.deepEqual(directive.ai.departments,['planning','graphics','development','qa','balance']);
  assert.equal(directive.ai.meeting.internalDepartmentConsensus,true);
  assert.equal(directive.ai.meeting.crossDepartmentRebuttalRounds,1);
  assert.match(cycle,/memberReviews/);
  assert.match(cycle,/representativeModel/);
  assert.match(cycle,/rebuttalRounds:1/);
  assert.match(cycle,/CONSENSUS','CONFLICT','HOLD/);
});

test('artbook is a single-editor core strategy distillation and Vibe2 is not its tier2/3 author',()=>{
  assert.equal(directive.ai.artbookEditor.singleEditor,true);
  assert.equal(directive.ai.artbookEditor.departmentPageAuthorship,false);
  assert.equal(directive.ai.artbookEditor.mayInventNewClaims,false);
  assert.equal(directive.ai.vibe2.designOrArtbookPrimaryAuthorInTier3Or2,false);
  assert.match(pipeline,/ARTBOOK_AUTHOR=ONE_ARTBOOK_EDITOR_AI/);
  assert.match(pipeline,/DEPARTMENT_ARTBOOK_AUTHORSHIP=NO/);
});

test('tier 2 and tier 1 responsibilities match the central production contract',()=>{
  assert.equal(directive.tiers['2'].webPurpose,'GAMEPLAY_VALIDATION_TESTBED');
  assert.equal(directive.tiers['2'].unityPurpose,'TECHNICAL_VALIDATION_PROTOTYPE');
  assert.equal(directive.tiers['1'].vibe2PrimaryDeveloper,true);
  assert.equal(directive.tiers['1'].departmentDefaultRole,'ERROR_AND_RELEASE_RISK_REVIEW');
  assert.match(flow,/2A\. Web Gameplay Validation/);
  assert.match(flow,/2B\. Unity Technical Validation/);
  assert.match(flow,/Vibe2가 확정된 개발 기준선을 따라 실제 구현/);
});
