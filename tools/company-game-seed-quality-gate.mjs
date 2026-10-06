import fs from 'node:fs';
import {validateGameSeed,GAMEPLAY_COMPOSITION_MECHANIC_FAMILIES,GAMEPLAY_NARRATIVE_DNA_FAMILIES,GAMEPLAY_NARRATIVE_RIGHTS_MODES,GAMEPLAY_STYLE_DNA_FAMILIES,GAMEPLAY_WORLDBUILDING_DNA_FAMILIES,GAMEPLAY_CANONICAL_LIBRARY_FAMILIES} from './company-game-seed-contract.mjs';
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

  if(Number(sketch?.version||1)>=3){
    const composition=sketch?.compositionDepth||{};
    const mainContent=clean(composition.mainContent);
    const major=uniq(composition.majorSubSystems);
    const extensions=uniq(composition.extensionSystems);
    const combinations=uniq(composition.crossSystemCombinations);
    const hidden=uniq(composition.hiddenCombinations);
    const mutations=uniq(composition.growthMutations);
    const revisit=uniq(composition.legacyContentRevisitHooks);
    const families=uniq(composition.mechanicDiversitySources);
    const endgame=clean(composition.endgameFusion);
    if(mainContent.length<20)out.push('v3-composition-main-content-too-shallow');
    if(major.length<3)out.push(`v3-major-subsystems=${major.length}/3`);
    if(extensions.length<6)out.push(`v3-extension-systems=${extensions.length}/6`);
    if(combinations.length<4)out.push(`v3-cross-system-combinations=${combinations.length}/4`);
    if(hidden.length<2)out.push(`v3-hidden-combinations=${hidden.length}/2`);
    if(mutations.length<2)out.push(`v3-growth-mutations=${mutations.length}/2`);
    if(revisit.length<2)out.push(`v3-legacy-revisit-hooks=${revisit.length}/2`);
    if(endgame.length<30)out.push('v3-endgame-fusion-too-shallow');
    if(families.length<3)out.push(`v3-mechanic-family-diversity=${families.length}/3`);
    const allowed=new Set(GAMEPLAY_COMPOSITION_MECHANIC_FAMILIES);
    for(const family of families)if(!allowed.has(family))out.push(`v3-invalid-mechanic-family=${family}`);

    const fusionText=combinations.join(' ');
    const pairwise=/×|\bx\b|\+|연결|결합|조합|상호|연계/i;
    const mainConnection=/메인|main|핵심|core/i;
    if(!pairwise.test(fusionText))out.push('v3-cross-system-combination-language-missing');
    if(!mainConnection.test(fusionText))out.push('v3-main-to-subsystem-connection-missing');

    const isolated=/독립 메뉴|별도 메뉴|상관없이|무관하게|isolated menu|standalone menu/i;
    if(extensions.some(row=>isolated.test(row))||combinations.some(row=>isolated.test(row)))out.push('v3-disconnected-subsystem-dump-forbidden');

    const mechanicText=[...extensions,...combinations,...hidden,...mutations,...revisit,endgame].join(' ');
    const mechanicGroups=[
      [/카드|card|deck|draft|트릭|포커|블랙잭/i],
      [/보드|board|주사위|dice|타일|tile|경매|auction|일꾼|worker placement|engine/i],
      [/아케이드|arcade|리듬|rhythm|레이싱|racing|타이밍|timing/i],
      [/탐험|explor|지도|map|유적|ruin|비밀|secret/i],
      [/판매|상점|무역|trade|market|경제|economy|생산|물류/i],
      [/동료|companion|party|파티|호감|resident|주민|guild|길드/i],
      [/수집|collection|도감|catalog|펫|pet|summon|소환|세트|set/i],
      [/강화|합성|evol|진화|craft|제작|research|연구|housing|하우징/i]
    ];
    const mechanicCoverage=semanticGroupCoverage(mechanicText,mechanicGroups);
    if(mechanicCoverage<3)out.push(`v3-mechanic-semantic-coverage=${mechanicCoverage}/3`);

    const deepText=[...combinations,...mutations,...revisit,endgame].join(' ');
    const depthGroups=[
      [/초반|early|단독|separate/i],
      [/중반|mid|pair|두.*시스템|2개|A.?[×x].?B/i],
      [/후반|late|세.*시스템|3개|A.?[×x].?B.?[×x].?C/i],
      [/엔드|endgame|@|복수|융합|fusion/i],
      [/이전|초기|옛|revisit|return|돌아|재방문/i]
    ];
    const depthCoverage=semanticGroupCoverage(deepText,depthGroups);
    if(depthCoverage<4)out.push(`v3-fusion-depth-coverage=${depthCoverage}/4`);

    const narrative=sketch?.narrativeDepth||{};
    const narrativeFamilies=uniq(narrative.narrativeDnaSources);
    const rightsModes=uniq(narrative.rightsModes);
    const npc=uniq(narrative.npcRelationshipWeb);
    const companions=uniq(narrative.companionArcs);
    const sublinks=uniq(narrative.mainSubquestLinks);
    const foreshadow=uniq(narrative.foreshadowPayoffs);
    const factions=uniq(narrative.factionCultureHooks);
    const reinterpretations=uniq(narrative.historicalMythReinterpretations);
    const worldFusion=uniq(narrative.worldbuildingFusion);
    const storyLinks=uniq(narrative.storySystemLinks);
    const contentCausality=uniq(narrative.contentCausalityLinks);
    const worldEvolution=uniq(narrative.worldEvolutionHooks);
    const placeNames=uniq(narrative.placeNameLedger);
    const journalChains=uniq(narrative.journalRecordChains);
    const dialogueJournal=uniq(narrative.dialogueJournalLinks);
    const monsterLore=uniq(narrative.monsterOpponentLoreEcologyLinks);
    const namingRules=uniq(narrative.namingRules);
    const respect=uniq(narrative.culturalRespectRules);
    if(narrative.applicable!==true)out.push('v3-narrative-applicable-required');
    if(!['LIGHT','MEDIUM','HEAVY'].includes(clean(narrative.storyWeight).toUpperCase()))out.push('v3-narrative-story-weight-invalid');
    if(clean(narrative.worldConflict).length<20)out.push('v3-world-conflict-too-shallow');
    if(clean(narrative.mainStoryArc).length<30)out.push('v3-main-story-arc-too-shallow');
    if(narrativeFamilies.length<2)out.push(`v3-narrative-dna-families=${narrativeFamilies.length}/2`);
    if(npc.length<2)out.push(`v3-npc-relationship-web=${npc.length}/2`);
    if(companions.length<1)out.push('v3-companion-arcs=0/1');
    if(sublinks.length<2)out.push(`v3-main-subquest-links=${sublinks.length}/2`);
    if(foreshadow.length<2)out.push(`v3-foreshadow-payoffs=${foreshadow.length}/2`);
    if(factions.length<2)out.push(`v3-faction-culture-hooks=${factions.length}/2`);
    if(reinterpretations.length<2)out.push(`v3-historical-myth-reinterpretations=${reinterpretations.length}/2`);
    if(worldFusion.length<3)out.push(`v3-worldbuilding-fusion=${worldFusion.length}/3`);
    if(storyLinks.length<3)out.push(`v3-story-system-links=${storyLinks.length}/3`);
    if(contentCausality.length<4)out.push(`v3-content-causality-links=${contentCausality.length}/4`);
    if(worldEvolution.length<2)out.push(`v3-world-evolution-hooks=${worldEvolution.length}/2`);
    if(placeNames.length<3)out.push(`v3-place-name-ledger=${placeNames.length}/3`);
    if(journalChains.length<2)out.push(`v3-journal-record-chains=${journalChains.length}/2`);
    if(dialogueJournal.length<2)out.push(`v3-dialogue-journal-links=${dialogueJournal.length}/2`);
    if(monsterLore.length<2)out.push(`v3-monster-opponent-lore-links=${monsterLore.length}/2`);
    if(namingRules.length<2)out.push(`v3-naming-rules=${namingRules.length}/2`);
    if(respect.length<3)out.push(`v3-cultural-respect-rules=${respect.length}/3`);

    const allowedNarrativeFamilies=new Set(GAMEPLAY_NARRATIVE_DNA_FAMILIES);
    for(const family of narrativeFamilies)if(!allowedNarrativeFamilies.has(family))out.push(`v3-invalid-narrative-family=${family}`);
    const allowedRightsModes=new Set(GAMEPLAY_NARRATIVE_RIGHTS_MODES);
    for(const mode of rightsModes)if(!allowedRightsModes.has(mode))out.push(`v3-invalid-narrative-rights-mode=${mode}`);

    const relationText=[...npc,...companions,...sublinks,...storyLinks].join(' ');
    const relationGroups=[
      [/npc|인물|동료|companion|party|파티|주민|상인/i],
      [/관계|호감|충성|갈등|동맹|경쟁|relation|affinity|loyal|rival/i],
      [/메인|main|서브|side.?quest|퀘스트|quest/i],
      [/상점|무역|trade|market|제작|craft|탐험|explor|전투|combat|보스|boss/i]
    ];
    const relationCoverage=semanticGroupCoverage(relationText,relationGroups);
    if(relationCoverage<3)out.push(`v3-narrative-system-relation-coverage=${relationCoverage}/3`);

    const worldText=[...worldFusion,...factions,...reinterpretations,clean(narrative.worldConflict),clean(narrative.mainStoryArc)].join(' ');
    const worldGroups=[
      [/세력|faction|권력|정치|politic|가문|원로원|senate|군단|legion/i],
      [/역사|history|신화|myth|민담|folklore|전설|legend/i],
      [/경제|무역|trade|산업|industry|도시|urban|노동|labor|시장|market/i],
      [/전쟁|war|혁명|revolution|첩보|espionage|냉전|cold war|제국|empire|식민|colon/i],
      [/지역|region|도시|city|마을|village|문화|culture|신앙|belief|금기|taboo/i]
    ];
    const worldCoverage=semanticGroupCoverage(worldText,worldGroups);
    if(worldCoverage<3)out.push(`v3-worldbuilding-fusion-semantic-coverage=${worldCoverage}/3`);

    const causalityText=contentCausality.join(' ');
    const causalityGroups=[
      [/지역|던전|보스|아이템|유물|펫|미니게임|무역|하우징|수집|region|dungeon|boss|item|relic|pet|minigame|trade|housing|collection/i],
      [/원인|이유|기원|과거|세력|npc|world reason|origin|history|faction/i],
      [/플레이|행동|전투|탐험|거래|제작|play|action|combat|explor|trade|craft/i],
      [/보상|상태 변화|관계|평판|지도|상점|reward|state change|relation|reputation|map|shop/i],
      [/후속|메인|서브|퀘스트|사건|대사|follow|main|side|quest|event|dialogue/i]
    ];
    const causalityCoverage=semanticGroupCoverage(causalityText,causalityGroups);
    if(causalityCoverage<4)out.push(`v3-content-causality-semantic-coverage=${causalityCoverage}/4`);

    const rightsText=[...respect,...reinterpretations].join(' ');
    const protectedWorkCopy=/고유 (?:인물|캐릭터|명칭|대사|장면)|직접 복제|copy (?:character|world|dialogue|scene)/i;
    const abstractTransform=/추상|구조|기법|재해석|변형|original|abstract|reinterpret|transform|공공영역|historical/i;
    if(protectedWorkCopy.test(rightsText)&&!abstractTransform.test(rightsText))out.push('v3-protected-expression-copy-risk');
    const style=sketch?.styleWorldDepth||{};
    const styleFamilies=uniq(style.styleDnaSources);
    const regional=uniq(style.regionalStyleVariation);
    const readability=uniq(style.gameplayReadabilityLinks);
    const expansionHooks=uniq(style.styleExpansionHooks);
    const artRights=uniq(style.artRightsRules);
    if(clean(style.styleFusion).length<30)out.push('v3-style-fusion-too-shallow');
    if(styleFamilies.length<2)out.push(`v3-style-dna-families=${styleFamilies.length}/2`);
    if(clean(style.architectureSettlement).length<30)out.push('v3-architecture-settlement-too-shallow');
    if(clean(style.environmentBiomes).length<30)out.push('v3-environment-biomes-too-shallow');
    if(clean(style.materialPropLanguage).length<30)out.push('v3-material-prop-language-too-shallow');
    if(clean(style.characterCostumeSilhouette).length<30)out.push('v3-character-costume-silhouette-too-shallow');
    if(clean(style.paletteLightingWeather).length<30)out.push('v3-palette-lighting-weather-too-shallow');
    if(clean(style.backgroundStorytelling).length<30)out.push('v3-background-storytelling-too-shallow');
    if(regional.length<3)out.push(`v3-regional-style-variation=${regional.length}/3`);
    if(readability.length<3)out.push(`v3-style-gameplay-readability=${readability.length}/3`);
    if(expansionHooks.length<2)out.push(`v3-style-expansion-hooks=${expansionHooks.length}/2`);
    if(artRights.length<3)out.push(`v3-art-rights-rules=${artRights.length}/3`);
    if(style.assetLibraryExpansionRequired===true)out.push('v3-asset-library-expansion-must-remain-optional');

    const allowedStyleFamilies=new Set(GAMEPLAY_STYLE_DNA_FAMILIES);
    for(const family of styleFamilies)if(!allowedStyleFamilies.has(family))out.push(`v3-invalid-style-family=${family}`);

    const styleText=[clean(style.styleFusion),clean(style.architectureSettlement),clean(style.environmentBiomes),clean(style.materialPropLanguage),clean(style.characterCostumeSilhouette),clean(style.paletteLightingWeather),clean(style.backgroundStorytelling),...regional,...readability].join(' ');
    const styleGroups=[
      [/건축|도시|마을|정착|요새|광장|시장|도로|architecture|city|village|settlement|fortress|market|road/i],
      [/지형|기후|식생|수계|폐허|산업|terrain|climate|vegetation|water|ruin|industry/i],
      [/의상|실루엣|장비|직업|세력|계급|costume|silhouette|equipment|role|faction|class/i],
      [/재질|소품|표면|생활|상업|군사|material|prop|surface|commercial|military/i],
      [/팔레트|조명|날씨|시간|위험|전조|palette|light|weather|time|danger|telegraph/i],
      [/배경|환경 이야기|과거|역사|사건|background|environmental story|history|event/i]
    ];
    const styleCoverage=semanticGroupCoverage(styleText,styleGroups);
    if(styleCoverage<4)out.push(`v3-style-world-semantic-coverage=${styleCoverage}/4`);

    const readabilityText=readability.join(' ');
    const readabilityGroups=[
      [/길찾|랜드마크|wayfind|landmark|route|경로/i],
      [/위험|전조|danger|telegraph|threat/i],
      [/상호작용|역할|interaction|role|npc|적|enemy/i],
      [/세력|지역 상태|faction|region state|world state/i]
    ];
    const readabilityCoverage=semanticGroupCoverage(readabilityText,readabilityGroups);
    if(readabilityCoverage<3)out.push(`v3-style-readability-semantic-coverage=${readabilityCoverage}/3`);

    const world=sketch?.worldbuildingDepth||{};
    const worldDna=uniq(world.worldDnaSources);
    const causalChains=uniq(world.causalChains);
    const worldEvolutionRows=uniq(world.worldStateEvolution);
    const clueLinks=uniq(world.crossMediaClueLinks);
    if(world.allGenreApplicable!==true)out.push('v3-worldbuilding-all-genres-required');
    if(clean(world.worldPremise).length<30)out.push('v3-world-premise-too-shallow');
    if(worldDna.length<3)out.push(`v3-world-dna-families=${worldDna.length}/3`);
    for(const field of ['civilizationPowerOrder','geographyEcology','economyDailyLife','beliefMythTaboo','technologyInstitutions','placeNameLogic','journalArchiveLogic','monsterOpponentEcology','dialogueMemoryLogic','genreExpression']){
      if(clean(world[field]).length<20)out.push(`v3-worldbuilding-${field}-too-shallow`);
    }
    if(causalChains.length<4)out.push(`v3-world-causal-chains=${causalChains.length}/4`);
    if(worldEvolutionRows.length<2)out.push(`v3-world-state-evolution=${worldEvolutionRows.length}/2`);
    if(clueLinks.length<3)out.push(`v3-cross-media-clue-links=${clueLinks.length}/3`);
    const allowedWorldFamilies=new Set(GAMEPLAY_WORLDBUILDING_DNA_FAMILIES);
    for(const family of worldDna)if(!allowedWorldFamilies.has(family))out.push(`v3-invalid-worldbuilding-family=${family}`);

    const worldCausalityText=[
      clean(world.worldPremise),clean(world.civilizationPowerOrder),clean(world.geographyEcology),
      clean(world.economyDailyLife),clean(world.beliefMythTaboo),clean(world.technologyInstitutions),
      clean(world.placeNameLogic),clean(world.journalArchiveLogic),clean(world.monsterOpponentEcology),
      clean(world.dialogueMemoryLogic),...causalChains,...worldEvolutionRows,...clueLinks,
      ...placeNames,...journalChains,...dialogueJournal,...monsterLore,...namingRules
    ].join(' ');
    const worldCausalityGroups=[
      [/지명|place.?name|지도|map|표지판|sign/i],
      [/대화|dialogue|npc|동료|companion|관계|relation/i],
      [/저널|journal|기록|record|편지|letter|비문|inscription|소문|rumor/i],
      [/몬스터|monster|enemy|opponent|상대|위협|ecology|생태/i],
      [/역사|history|세력|faction|권력|power|전쟁|war|문명|civilization/i],
      [/경제|trade|market|생활|daily|생업|industry|technology|제도|institution/i],
      [/신화|myth|신앙|belief|금기|taboo|의식|ritual/i],
      [/퀘스트|quest|사건|event|상태|state|후속|follow/i]
    ];
    const worldCausalityCoverage=semanticGroupCoverage(worldCausalityText,worldCausalityGroups);
    if(worldCausalityCoverage<6)out.push(`v3-world-causality-semantic-coverage=${worldCausalityCoverage}/6`);

    const libraries=sketch?.libraryLinkage||{};
    const libraryFamilies=uniq(libraries.libraryFamilies);
    if(libraries.allCanonicalLibrariesSearchable!==true)out.push('v3-all-canonical-libraries-searchable-required');
    if(libraries.compatibilityRightsAndGameIdentityFirst!==true)out.push('v3-library-compatibility-rights-identity-first-required');
    if(libraries.actualConsumerEvidenceRequired!==true)out.push('v3-library-actual-consumer-evidence-required');
    if(libraries.noForcedUse!==true)out.push('v3-library-no-forced-use-required');
    if(libraries.noShadowPipeline!==true)out.push('v3-library-no-shadow-pipeline-required');
    if(clean(libraries.selectionRule).length<30)out.push('v3-library-selection-rule-too-shallow');
    if(clean(libraries.fallbackRule).length<30)out.push('v3-library-fallback-rule-too-shallow');
    if(libraryFamilies.length!==GAMEPLAY_CANONICAL_LIBRARY_FAMILIES.length)out.push(`v3-library-family-coverage=${libraryFamilies.length}/${GAMEPLAY_CANONICAL_LIBRARY_FAMILIES.length}`);
    const allowedLibraries=new Set(GAMEPLAY_CANONICAL_LIBRARY_FAMILIES);
    for(const family of libraryFamilies)if(!allowedLibraries.has(family))out.push(`v3-invalid-library-family=${family}`);

  }
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
if(failures.length){console.error('GAME_SEED_SEMANTIC_QUALITY=FAIL');for(const failure of failures)console.error(`- ${failure}`);process.exit(1);}
console.log('GAME_SEED_SEMANTIC_QUALITY=PASS');console.log('GAMEPLAY_SKETCH_V3_SYSTEM_NARRATIVE_WORLD_CAUSALITY=ENFORCED');console.log(`GAME_SEED_ACTIVE_SEED_COUNT=${active.length}`);console.log(`GAME_SEED_MATERIAL_COMPOSED_COUNT=${active.filter(isMaterialComposed).length}`);console.log('LEGACY_SEED_MATERIAL_RETROACTIVE_GATE=NO');console.log('CONCEPT_DUPLICATE_GATE=CREATION_TIME_ONLY');console.log(`SEED_MATERIAL_POOL_TARGET=${SEED_MATERIAL_POOL_TARGET}`);console.log('SEED_MATERIAL_IS_GAME=NO');console.log('GAME_REFERENCE_REQUIRED=NO');console.log('TARGET_SESSION_MINUTES=30');console.log('MULTIPLAYER_DECISION_STAGE=DESIGN');console.log('GAME_SEED_FIXED_CATEGORY_SLOT_QUOTA=NO');console.log('GAME_SEED_MARKET_EVIDENCE_HARD_GATE=NO');console.log('GAME_SEED_POLICY_DOCUMENT=COMPANY_FLOW.md');
