import fs from 'node:fs';
import {validateGameSeed} from './company-game-seed-contract.mjs';
import {normalizeSeedState,SEED_MATERIAL_POOL_TARGET,SEED_MATERIAL_SOURCE_FAMILIES} from './game-seed-state.mjs';
import {categorySeedProfile,loadPlatformProfiles,normalizeSeedPlatform} from './game-seed-platform-profile.mjs';
import {evaluateGameFlowArchitecture} from './company-vibe2-game-flow-architect.mjs';

const stateFile=process.env.GAME_SEED_STATE_FILE||'game-seed-state.json';
const evidenceFile=process.env.GAME_SEED_MARKET_EVIDENCE_FILE||'game-seed-market-evidence.json';
const platformProfileFile=process.env.GAME_SEED_PLATFORM_PROFILE_FILE||'game-seed-platform-profiles.json';
const clean=v=>String(v??'').trim();const norm=v=>clean(v).toLowerCase();const uniq=v=>[...new Set((Array.isArray(v)?v:[]).map(clean).filter(Boolean))];const readJson=(file,fallback={})=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
if(!fs.existsSync(stateFile))throw new Error('GAME_SEED_QUALITY_STATE_MISSING');
const state=normalizeSeedState(readJson(stateFile,{seeds:[]}));const evidence=readJson(evidenceFile,{targetMarketScope:'GLOBAL'});const platformProfiles=loadPlatformProfiles(platformProfileFile);const evidenceScope=clean(evidence.targetMarketScope||'GLOBAL').toUpperCase();const failures=[];
if(evidenceScope!=='GLOBAL')failures.push(`market-evidence-scope=${evidenceScope}`);
const activeMaterials=(state.seedMaterials||[]).filter(x=>['AVAILABLE','RESERVED'].includes(clean(x.status).toUpperCase()));
if(Number(state.seedMaterialPolicy?.targetCount)!==SEED_MATERIAL_POOL_TARGET)failures.push(`seed-material-target=${state.seedMaterialPolicy?.targetCount}/${SEED_MATERIAL_POOL_TARGET}`);
if(state.seedMaterialPolicy?.materialIsGame!==false)failures.push('seed-material-must-not-be-defined-as-game');
if(activeMaterials.length<SEED_MATERIAL_POOL_TARGET)failures.push(`seed-material-active-pool=${activeMaterials.length}/${SEED_MATERIAL_POOL_TARGET}`);
for(const row of state.seedMaterials||[])if(!SEED_MATERIAL_SOURCE_FAMILIES.includes(clean(row.sourceFamily)))failures.push(`seed-material-invalid-family=${clean(row.materialId)}:${clean(row.sourceFamily)}`);

const businessMeta=/increase user base|boost sales|drive engagement|content growth|optimi[sz]e overall performance/i;const weakLoopSuffix=/결과 피드백을 확인하고 다음 선택이나 보상으로 이어진다/;const numericLike=value=>typeof value==='number'||(/\d/.test(clean(value))&&clean(value).toUpperCase()!=='UNKNOWN');const active=(state.seeds||[]).filter(seed=>clean(seed.status).toUpperCase()==='ACTIVE');
const MATERIAL_COMPOSED_GENERATIONS=new Set(['MATERIAL_COMPOSITION','IDLE_MATERIAL_COMPOSITION']);
const isMaterialComposed=seed=>MATERIAL_COMPOSED_GENERATIONS.has(clean(seed.generation).toUpperCase())||uniq(seed.SEED_MATERIAL_IDS).length>0;
function platformBenchmarkTitles(platform){const categories=platformProfiles?.platforms?.[normalizeSeedPlatform(platform)]?.categories||{};const names=[];for(const profile of Object.values(categories)){names.push(...uniq(profile?.benchmarkCandidates));for(const ref of Array.isArray(profile?.references)?profile.references:[])names.push(typeof ref==='string'?ref:clean(ref?.title||ref?.name||ref?.game));}return uniq(names);}
function conceptGroupCoverage(text,groups){const haystack=norm(text);return (Array.isArray(groups)?groups:[]).filter(group=>uniq(group).some(term=>haystack.includes(norm(term)))).length;}

function semanticGroupCoverage(text,groups){
  const source=clean(text);
  return (groups||[]).filter(group=>(group||[]).some(pattern=>pattern.test(source))).length;
}
function v2GameplaySketchFailures(sketch){
  if(Number(sketch?.version||1)<2)return[];
  const out=[];
  const funText=uniq(sketch?.funDrivers).join(' ');
  const funGroups=[
    [/즉시|바로|immediate|feedback|response|반응|상태 ?변화/i],
    [/위험.?보상|risk.?reward|trade.?off|기회비용|비용|대가/i],
    [/숙련|mastery|새 (?:행동|전략|선택)|new (?:action|strategy|choice)|조합|combo/i],
    [/월드|적|상대|world|enemy|opponent|react|adapt|대응|반응/i],
  ];
  const funCoverage=semanticGroupCoverage(funText,funGroups);
  if(funCoverage<4)out.push(`v2-fun-driver-coverage=${funCoverage}/4`);

  const balanceText=uniq(sketch?.balanceRules).join(' ');
  const balanceGroups=[
    [/지배 전략|dominant strateg|counter|카운터|기회비용|trade.?off/i],
    [/성장|power|위협|threat|challenge|난이도|복잡/i],
    [/실패|failure|복구|recover|retry|재시도/i],
    [/경제|econom|source|sink|획득원|소비처|자원/i],
    [/후반|late|판단 구조|decision structure|우선순위|pressure combination|압박 조합/i],
  ];
  const balanceCoverage=semanticGroupCoverage(balanceText,balanceGroups);
  if(balanceCoverage<5)out.push(`v2-balance-rule-coverage=${balanceCoverage}/5`);

  const pacing=sketch?.pacingPlan||{};
  const pacingRules={
    first5Minutes:{min:2,groups:[[/조작|input|핵심 행동|core action|control/i],[/목표|goal|objective/i],[/성공|success|위험|risk|선택|choice/i]]},
    minutes5To15:{min:2,groups:[[/핵심 ?루프|core ?loop|반복|repeat/i],[/성장|growth|upgrade|장비|equipment/i],[/전략|strategy|경로|route|선택|choice/i]]},
    minutes15To25:{min:2,groups:[[/새|new|변화|change|확장|open/i],[/압박|pressure|위협|threat|적|enemy/i],[/지역|region|route|경로|system|시스템/i]]},
    minutes25To30:{min:2,groups:[[/중간 ?목표|mid.?goal|milestone|목표|objective/i],[/조합|combine|결합|synthesis|누적 선택|accumulated choice/i],[/보상|reward|다음 플레이|next play/i]]},
    midLateGame:{min:2,groups:[[/시스템 조합|system combination|조합|interlock/i],[/빌드|build|경로|route|플레이스타일|playstyle/i],[/판단|decision|압박|pressure|규칙|rule/i]]},
    replayMotivation:{min:2,groups:[[/재플레이|replay|다른|different|alternate/i],[/전략|strategy|빌드|build|경로|route|선택|choice/i],[/결과|outcome|world state|월드 상태|변화/i]]},
  };
  for(const [field,rule] of Object.entries(pacingRules)){
    const coverage=semanticGroupCoverage(clean(pacing[field]),rule.groups);
    if(coverage<rule.min)out.push(`v2-pacing-${field}=${coverage}/${rule.min}`);
  }
  const pacingValues=Object.keys(pacingRules).map(key=>norm(pacing[key])).filter(Boolean);
  if(new Set(pacingValues).size<5)out.push(`v2-pacing-distinct-segments=${new Set(pacingValues).size}/5`);

  const progressionText=uniq(sketch?.progressionLayers).join(' ');
  const progressionGroups=[
    [/세션|session|초반|early|현재 플레이|run/i],
    [/중기|mid|중반|빌드|build|전략|strategy|선택/i],
    [/장기|long|후반|late|월드|world|영구|persistent|목표/i],
    [/새 행동|new action|unlock|해금|조합|combo|플레이스타일|playstyle/i],
  ];
  const progressionCoverage=semanticGroupCoverage(progressionText,progressionGroups);
  if(progressionCoverage<3)out.push(`v2-progression-layer-coverage=${progressionCoverage}/3`);

  const expansionRows=uniq(sketch?.expansionPlan);
  const expansionText=expansionRows.join(' ');
  const expansionGroups=[
    [/적 행동|enemy behavior|actor behavior|ai|패턴|행동 공간/i],
    [/공간|space|지역|region|경로|route|movement|이동/i],
    [/목표|objective|quest|미션|승리|victory/i],
    [/상호작용|interaction|정보|information|knowledge|관계|relationship/i],
    [/빌드|build|전략|strategy|플레이스타일|playstyle|선택 결과|choice outcome/i],
  ];
  const expansionCoverage=semanticGroupCoverage(expansionText,expansionGroups);
  if(expansionCoverage<3)out.push(`v2-expansion-depth-coverage=${expansionCoverage}/3`);
  const statOnly=/\b(?:hp|health|damage|attack|defen[cs]e|level)\b|체력|데미지|공격력|방어력|레벨|수치|배수/i;
  const structuralDepth=/행동|behavior|공간|space|경로|route|목표|objective|상호작용|interaction|정보|information|빌드|build|전략|strategy|플레이스타일|playstyle|규칙|rule|월드|world/i;
  if(expansionRows.length&&expansionRows.every(row=>statOnly.test(row)&&!structuralDepth.test(row)))out.push('v2-expansion-stat-only-forbidden');

  const completionText=uniq(sketch?.completionCriteria).join(' ');
  const completionGroups=[
    [/5분|5 min|first 5/i],
    [/15.?25|15 to 25|15~25|중반/i],
    [/30분|30 min|30\+/i],
    [/실패|failure|복구|recover|retry|재시도|softlock|소프트락/i],
    [/모바일|mobile|touch|터치|performance|성능/i],
    [/초반|early|중반|mid|후반|late|role differentiation|역할 차이/i],
  ];
  const completionCoverage=semanticGroupCoverage(completionText,completionGroups);
  if(completionCoverage<4)out.push(`v2-completion-coverage=${completionCoverage}/4`);

  const codingText=uniq(sketch?.codingGrowthHooks).join(' ');
  const codingGroups=[
    [/기존 책임 함수|existing responsibility|responsible function|기존 함수|existing function/i],
    [/데이터 테이블|data table|설정|config|stable id|안정.*id|선언형|declarative/i],
    [/중복.*authority|duplicate.*authority|wrapper|shadow|래퍼|우회/i],
    [/save|세이브|migration|마이그레이션|schema version|스키마 버전/i],
    [/프레젠테이션|presentation|그래픽|asset|자산.*분리|게임 로직.*분리|separate.*gameplay/i],
  ];
  const codingCoverage=semanticGroupCoverage(codingText,codingGroups);
  if(codingCoverage<4)out.push(`v2-coding-growth-coverage=${codingCoverage}/4`);

  const flowResult=evaluateGameFlowArchitecture(sketch?.flowArchitecture||{});
  for(const blocker of flowResult.blockers||[])out.push(`v2-flow:${blocker}`);
  return out;
}

for(const seed of active){
  const id=clean(seed.seedId||seed.gameId||'unknown'),prefix=`${clean(seed.GAME_CATEGORY)||'UNCATEGORIZED'}:${id}`;const contract=validateGameSeed(seed);for(const error of contract.errors)failures.push(`${prefix}:contract:${error}`);
  for(const failure of v2GameplaySketchFailures(seed.GAMEPLAY_SKETCH))failures.push(`${prefix}:${failure}`);
  const materialIds=uniq(seed.SEED_MATERIAL_IDS);if(isMaterialComposed(seed)&&(materialIds.length<2||materialIds.length>4))failures.push(`${prefix}:seed-material-count=${materialIds.length}/2-4`);
  if(Number(seed.TARGET_SESSION_MINUTES)!==30)failures.push(`${prefix}:target-session-must-be-30`);
  if(!['SINGLE','COOP','COMPETITIVE','HYBRID'].includes(clean(seed.MULTIPLAYER_DESIGN_MODE).toUpperCase()))failures.push(`${prefix}:multiplayer-design-mode-required`);
  if(!Array.isArray(seed.REFERENCE_INPUTS)||!seed.REFERENCE_INPUTS.length)failures.push(`${prefix}:reference-inputs-required`);
  const platform=normalizeSeedPlatform(seed.INITIAL_TARGET_PLATFORM),profile=categorySeedProfile({platform,category:clean(seed.GAME_CATEGORY),marketEvidence:evidence,platformProfiles})||{},platformTitles=platformBenchmarkTitles(platform),forbiddenTitles=new Set(platformTitles.map(norm));if(forbiddenTitles.has(norm(seed.gameName)))failures.push(`${prefix}:game-name-copies-platform-benchmark-title`);
  const loops=Array.isArray(seed.CORE_LOOP)?seed.CORE_LOOP.map(clean).filter(Boolean):[];if(loops.length<3)failures.push(`${prefix}:core-loop-needs-at-least-3-steps`);if(loops.some(step=>businessMeta.test(step)))failures.push(`${prefix}:core-loop-business-meta-language`);if(loops.some(step=>step.length<20||weakLoopSuffix.test(step)))failures.push(`${prefix}:core-loop-needs-concrete-play-actions`);const groups=Array.isArray(profile.requiredConceptGroups)?profile.requiredConceptGroups:[];const minimumGroups=Math.max(0,Number(profile.minimumRequiredConceptGroups||0));if(groups.length){const coverage=conceptGroupCoverage(loops.join(' '),groups);if(coverage<minimumGroups)failures.push(`${prefix}:core-loop-concept-coverage=${coverage}/${minimumGroups}`);}
  const identity=clean(seed.DISTINCT_IDENTITY),identityNorm=norm(identity);if(!identity||businessMeta.test(identity))failures.push(`${prefix}:distinct-identity-missing-or-generic`);if(/\bbenchmark\b/i.test(identity)||platformTitles.some(title=>identityNorm.includes(norm(title))))failures.push(`${prefix}:distinct-identity-copies-benchmark-expression`);if(seed.DIRECT_COPY===true||seed.COPY_SOURCE_CODE===true||seed.COPY_ASSETS===true)failures.push(`${prefix}:direct-copy-forbidden`);
  const market=seed.MARKET_EVIDENCE_SUMMARY&&typeof seed.MARKET_EVIDENCE_SUMMARY==='object'&&!Array.isArray(seed.MARKET_EVIDENCE_SUMMARY)?seed.MARKET_EVIDENCE_SUMMARY:{};if(clean(market.targetMarketScope||'GLOBAL').toUpperCase()!=='GLOBAL')failures.push(`${prefix}:market-scope-not-global`);if(market.hardPassFailGate===true)failures.push(`${prefix}:market-evidence-must-not-be-hard-gate`);if(market.marketDataAloneCannotDiscard===false)failures.push(`${prefix}:market-data-alone-cannot-discard`);for(const ref of Array.isArray(market.references)?market.references:[])for(const metric of Array.isArray(ref?.metrics)?ref.metrics:[]){if(numericLike(metric?.value)&&(!clean(metric?.source)||!clean(metric?.observedAt)))failures.push(`${prefix}:unsourced-numeric-market-claim`);}
  const audience=clean(seed.TARGET_AUDIENCE);if(/\b(korea|korean|south korea)\b/i.test(audience)&&!/owner override|owner-directed/i.test(audience))failures.push(`${prefix}:country-specific-default-audience`);
}
// Concept duplication is blocked when a new material-composed GAME_SEED is created.
// Do not retroactively reject historical or owner-enrolled projects as duplicate pairs here.
if(process.argv.includes('--designer-intake')){
  const creative=/(?:^seed-material-(?:active-pool|target)=|contract:(?:[A-Z_]+ is required|GAMEPLAY_SKETCH\.(?!.*(?:may not pin|may not own))|CORE_LOOP|MULTIPLAYER_DESIGN_MODE|INITIAL_PLAY_MODE|SEED_MATERIAL_IDS|TARGET_SESSION_MINUTES|DISTINCT_IDENTITY)|:v2-|:seed-material-count=|:target-session-must-be-30|:multiplayer-design-mode-required|:reference-inputs-required|:core-loop-|:distinct-identity-missing-or-generic)/;
  const diagnostics=failures.filter(failure=>creative.test(failure));
  if(diagnostics.length){
    console.log('GAME_SEED_AUTHORING_DIAGNOSTICS=REPAIR_BY_DESIGNER');
    for(const diagnostic of diagnostics)console.log(`- ${diagnostic}`);
    console.log('GAME_SEED_CREATIVE_ADMISSION_GATE=NO');
    for(let index=failures.length-1;index>=0;index--)if(creative.test(failures[index]))failures.splice(index,1);
    if(!failures.length){console.log('GAME_SEED_SEMANTIC_QUALITY=DESIGNER_AUTHORING_PENDING');process.exit(0);}
  }
}
if(failures.length){console.error('GAME_SEED_SEMANTIC_QUALITY=FAIL');for(const failure of failures)console.error(`- ${failure}`);process.exit(1);}
console.log('GAME_SEED_SEMANTIC_QUALITY=PASS');console.log('GAMEPLAY_SKETCH_V2_SEMANTIC_QUALITY=ENFORCED');console.log(`GAME_SEED_ACTIVE_SEED_COUNT=${active.length}`);console.log(`GAME_SEED_MATERIAL_COMPOSED_COUNT=${active.filter(isMaterialComposed).length}`);console.log('LEGACY_SEED_MATERIAL_RETROACTIVE_GATE=NO');console.log('CONCEPT_DUPLICATE_GATE=CREATION_TIME_ONLY');console.log(`SEED_MATERIAL_POOL_TARGET=${SEED_MATERIAL_POOL_TARGET}`);console.log('SEED_MATERIAL_IS_GAME=NO');console.log('GAME_REFERENCE_REQUIRED=NO');console.log('TARGET_SESSION_MINUTES=30');console.log('MULTIPLAYER_DECISION_STAGE=DESIGN');console.log('GAME_SEED_FIXED_CATEGORY_SLOT_QUOTA=NO');console.log('GAME_SEED_MARKET_EVIDENCE_HARD_GATE=NO');console.log('GAME_SEED_POLICY_DOCUMENT=COMPANY_FLOW.md');
