import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const flow=fs.readFileSync('COMPANY_FLOW.md','utf8');
const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const cycle=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
const pipeline=fs.readFileSync('tools/artbook-production-pipeline.mjs','utf8');
const workflow=fs.readFileSync('.github/workflows/artbook-free-department-bots.yml','utf8');

const roles=['planning','graphics','development','qa','balance'];

test('one central human policy source owns class, design, meeting and artbook rules',()=>{
  assert.equal(directive.policyDocument,'COMPANY_FLOW.md');
  assert.match(flow,/유일한 사람용 제작 정책 원본/);
  assert.match(flow,/다른 문서에는 같은 정책을 다시 복제하지 않는다/);
});

test('five departments have five distinct lead model ids and remappable assignments',()=>{
  assert.equal(directive.ai.departmentLeadModelsMustBeDistinct,true);
  assert.equal(directive.ai.departmentLeadAssignmentRemappable,true);
  assert.ok(directive.ai.minDistinctLeadModelsAcrossDepartments>=5);
  const leadModels=roles.map(role=>directive.ai.departmentLeadModels?.[role]);
  assert.ok(leadModels.every(Boolean));
  assert.equal(new Set(leadModels).size,5);
  assert.ok(leadModels.every(model=>directive.ai.modelPool.includes(model)));
  assert.match(flow,/Lead 모델 ID는 서로 중복되면 안 된다/);
  assert.match(cycle,/DEPARTMENT_LEAD_GATE/);
  assert.match(cycle,/distinctLeadModels/);
});

test('each department uses lead plus assistants with at least three distinct real models',()=>{
  const models=[...new Set(directive.ai.modelPool)];
  assert.ok(models.length>=5);
  assert.ok(directive.ai.minDistinctModelsPerDepartment>=3);
  assert.ok(directive.ai.departmentReviewModelCount>=3);
  assert.equal(directive.ai.assistantModelsMayOverlapAcrossDepartments,true);
  assert.equal(directive.ai.modelIdentityFixed,false);
  assert.match(cycle,/reviewModelsFor/);
  assert.match(cycle,/distinct member model gate failed/);
  assert.match(workflow,/Pull all configured free department models/);
});

test('department lead owns representative opinion and its rebuttal',()=>{
  assert.equal(directive.ai.departmentRepresentativeAuthoredByLead,true);
  assert.equal(directive.ai.departmentRebuttalAuthoredByLead,true);
  assert.equal(directive.ai.meeting.internalRepresentativeOwner,'DEPARTMENT_LEAD_MODEL');
  assert.equal(directive.ai.meeting.rebuttalOwner,'DEPARTMENT_LEAD_MODEL');
  assert.match(cycle,/representativeAuthoredByLead:true/);
  assert.match(cycle,/rebuttalAuthoredByDepartmentLeads:true/);
  assert.match(cycle,/DEPARTMENT_REPRESENTATIVE_OWNER=LEAD_MODEL/);
  assert.match(cycle,/DEPARTMENT_REBUTTAL_OWNER=LEAD_MODEL/);
});

test('detailed design has one designer and the same model revises after the meeting',()=>{
  assert.equal(directive.ai.gameDesigner.singleAuthorPerRevisionCycle,true);
  assert.equal(directive.ai.gameDesigner.sameModelRevisesAfterMeeting,true);
  assert.match(cycle,/authorRole:'GAME_DESIGNER_AI'/);
  assert.match(cycle,/sameModelAsDraft:true/);
  assert.match(cycle,/CONSENSUS만 자동 반영/);
});

test('five departments perform one cross-department rebuttal round',()=>{
  assert.deepEqual(directive.ai.departments,roles);
  assert.equal(directive.ai.meeting.internalDepartmentConsensus,true);
  assert.equal(directive.ai.meeting.crossDepartmentRebuttalRounds,1);
  assert.match(cycle,/memberReviews/);
  assert.match(cycle,/representativeModel:leadModel/);
  assert.match(cycle,/rebuttalRounds:1/);
  assert.match(cycle,/CONSENSUS','CONFLICT','HOLD/);
});

test('design only runs directly through artbook editor after the design cycle',()=>{
  assert.ok(directive.classes.DESIGN_ONLY.requiredFlow.includes('ARTBOOK_EDITOR_CORE_STRATEGY'));
  assert.match(flow,/Artbook Editor AI 1명이 핵심 전략 아트북 작성/);
  assert.match(cycle,/DESIGN_ONLY_ARTBOOK_DIRECT=YES/);
  assert.match(pipeline,/ARTBOOK_AUTHOR=ONE_ARTBOOK_EDITOR_AI/);
});

test('artbook is a single-editor core strategy distillation and Vibe2 is not its design/development author',()=>{
  assert.equal(directive.ai.artbookEditor.singleEditor,true);
  assert.equal(directive.ai.artbookEditor.departmentPageAuthorship,false);
  assert.equal(directive.ai.artbookEditor.mayInventNewClaims,false);
  assert.equal(directive.ai.vibe2.designOrArtbookPrimaryAuthorInTier3Or2,false);
  assert.match(pipeline,/DEPARTMENT_ARTBOOK_AUTHORSHIP=NO/);
});

test('development and release responsibilities match the central semantic class contract',()=>{
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.webPurpose,'GAMEPLAY_VALIDATION_TESTBED');
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.unityPurpose,'TECHNICAL_VALIDATION_PROTOTYPE');
  assert.equal(directive.classes.RELEASE_CONFIRMED.vibe2PrimaryDeveloper,true);
  assert.equal(directive.classes.RELEASE_CONFIRMED.departmentDefaultRole,'ERROR_AND_RELEASE_RISK_REVIEW');
  assert.match(flow,/6A\. Web Gameplay Validation/);
  assert.match(flow,/6B\. Unity Technical Validation/);
  assert.match(flow,/Vibe2가 확정된 개발 기준선을 따라 실제 구현/);
});
