// 파일명: qa/company-design-cycle-deepseek-fallback.test.mjs
// 임포트
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const design=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));

test('structured design calls retain bounded schema recovery',()=>{
  assert.match(design,/think:false/);
  assert.match(design,/for\(let attempt=1;attempt<=3;attempt\+\+\)/);
  assert.match(design,/PREVIOUS_VALIDATION_ERROR=/);
  assert.match(design,/normalizeSchemaValue\(parsed,schema,'root',repairs\)/);
  assert.match(design,/MODEL_SCHEMA_NORMALIZED=/);
  assert.match(design,/fill-empty-array:/);
  assert.match(design,/wrap-required-object:/);
  assert.match(design,/drop-extra:/);
  assert.match(design,/assertSchemaValue\(normalized,schema\)/);
  assert.match(design,/const nextMode='json'/);
  assert.doesNotMatch(design,/message\?\.thinking\).*return/);
});

test('DeepSeek is banned from the free company AI workforce',()=>{
  const banned=new Set(directive.ai?.bannedModels||[]);
  const pool=directive.ai?.modelPool||[];
  const leads=Object.values(directive.ai?.departmentLeadModels||{});
  assert.ok(banned.has('deepseek-r1:1.5b'));
  assert.ok(!pool.includes('deepseek-r1:1.5b'));
  assert.ok(!leads.includes('deepseek-r1:1.5b'));
  assert.equal(directive.ai?.departmentLeadModels?.qa,'qwen2.5:1.5b');
  assert.ok(pool.includes('qwen2.5:1.5b'));
  assert.equal(new Set(leads).size,5);
});

test('full design author role remains distinct and same model revises',()=>{
  assert.match(design,/const designerPool=pool\.filter\(model=>!model\.startsWith\('deepseek-r1'\)\)/);
  assert.match(design,/GAME_DESIGNER_MODEL_POOL_EMPTY/);
  assert.match(design,/const designerModel=designerPool\[hash\(`\$\{gameId\}:designer`\)%designerPool\.length\]/);
  assert.match(design,/const activeReviewModels=pool\.filter/);
  assert.match(design,/sameModelAsDraft:true/);
  assert.match(design,/sameModelRevised:true/);
});

test('strict hard-gate feedback returns to the same game designer without bypass',()=>{
  assert.match(design,/const strictDesignerFeedback=/);
  assert.match(design,/source:'PRIOR_STRICT_DESIGN_REVIEW'/);
  assert.match(design,/bypassAllowed:false/);
  assert.match(design,/const latestDesignFeedbackEvent=designLearningEvents\.at\(-1\)\|\|null/);
  assert.match(design,/hardFailures:Array\.isArray\(latestDesignFeedbackEvent\?\.hardFailures\)/);
  assert.match(design,/STRICT_GATE_FEEDBACK=\$\{clip\(strictDesignerFeedback,4500\)\}/);
  assert.match(design,/관문 이름을 숨기거나 완화하지 말고 실제 설계 내용으로 원인을 해결하라/);
  assert.match(design,/하드관문 실패는 삭제·재명명·무시하지 말고/);
  assert.match(design,/strictGateBypassAllowed:false/);
  assert.match(design,/rejectionReasons:Array\.isArray\(event\?\.rejectionReasons\)\?event\.rejectionReasons:\[\]/);
  assert.match(design,/rejectionReasons:Array\.isArray\(latestDesignFeedbackEvent\?\.rejectionReasons\)/);
  assert.doesNotMatch(design,/rejectionReasons:designLearningEvents\.flatMap/);
});

test('game designer schema supplies every stage gate v2 evidence axis',()=>{
  for(const field of [
    'systemInterconnections','progressionEconomyBalance','contentExpansionPlan','failureRetryRisk',
    'platformFitPlan','uxAccessibilityPlan','artAudioDirection','implementationTraceability'
  ]) assert.match(design,new RegExp(field));
  assert.match(design,/signatureSystems:\{type:'array',minItems:5/);
  assert.match(design,/systemInterconnections:\{type:'array',minItems:5/);
  assert.match(design,/contentExpansionPlan:\{type:'array',minItems:3/);
  assert.match(design,/failureStates:\{type:'array',minItems:2/);
  assert.match(design,/implementationTraceability:\{type:'array',minItems:3/);
  assert.match(design,/targetPlatform:\{type:'string',enum:\['ROBLOX','UNITY','FORTNITE_UEFN'\]\}/);
});

test('same game designer authors the full schema through bounded checkpointed slices without bypass',()=>{
  assert.match(design,/const DESIGN_AUTHORING_SLICES=Object\.freeze\(\[/);
  assert.match(design,/DESIGN_AUTHORING_SLICE_FIELDS=DESIGN_AUTHORING_SLICES\.flatMap/);
  assert.match(design,/DESIGN_AUTHORING_SLICE_CONTRACT_MISMATCH/);
  assert.match(design,/async function authorDesignInCheckpointedSlices/);
  assert.match(design,/runCheckpointTask\(\`\$\{phase\}_slices\`,slice\.id/);
  assert.match(design,/const schema=designSliceSchema\(slice\.fields\)/);
  assert.match(design,/timeoutMs:modelCallTimeoutMs/);
  assert.match(design,/assertSchemaValue\(complete,DESIGN\)/);
  assert.match(design,/DESIGN_CHECKPOINTED_SLICES_COMPLETE=/);
  assert.match(design,/phase:'designer_draft'/);
  assert.doesNotMatch(design,/DESIGNER_DRAFT_ONE_CALL_FALLBACK=SPLIT/);
});


test('initial design prompt keeps causal grammar depth while local authoring is bounded by canonical timeout',()=>{
  assert.match(design,/num_ctx:Math\.min\(24576,Math\.max\(4096,Number\(numCtx\|\|8192\)\)\)/);
  assert.match(design,/DESIGN_AUTHORING_SLICES=Object\.freeze/);
  assert.match(design,/predict:1600/);
  assert.match(design,/numCtx:8192,timeoutMs:modelCallTimeoutMs/);
  assert.match(design,/STRICT_GATE_FEEDBACK=\$\{clip\(strictDesignerFeedback,6500\)\}/);
  assert.match(design,/GAME_SEED_DESIGN_DEPTH=\$\{clip\(seedDesignDepthContext,7500\)\}/);
  assert.match(design,/EVIDENCE=\$\{clip\(evidence,6500\)\}/);
  assert.match(design,/초기 설계는 압축 요약보다 구체적 상태 전이와 플레이 사례를 우선한다/);
  assert.match(design,/MAIN은 입력→즉시 피드백→상태 변화→위험\/보상→다음 선택/);
  assert.match(design,/A와 B는 각각 독립된 대축/);
  assert.match(design,/c는 최소 3개 이상의 서브요소/);
  assert.match(design,/@는 해금 조건·발견 단서·숙련 보상·재방문 가치·고급 조합/);
  assert.match(design,/실제 플레이 5분·15분·30분 흐름/);
  assert.match(design,/메뉴와 UI도 게임 규칙의 일부로 설계한다/);
  assert.match(design,/contentExpansionPlan은 한 번의 완성 목록이 아니라 검증 회차가 반복될수록/);
  assert.match(design,/단순 수치 증가나 기능 개수 늘리기를 진화로 간주하지 않는다/);
  assert.match(design,/새 c 변주와 @ 파고들기/);
});
