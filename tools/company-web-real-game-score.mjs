const clean=value=>String(value??'').trim();
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const ratioScore=(value,target,max)=>Math.round(max*clamp((Number(value)||0)/Math.max(1,target),0,1));

export const WEB_IMPLEMENTATION_COMMON_WEIGHTS=Object.freeze({
  coreGameLoop:15,
  systemConnectivity:10,
  controlGameFeel:8,
  functionalUiUx:7,
  progressionReward:7,
  riskFailureRetry:5,
  gameplayFeedback:4,
  runtimeStability:4,
});

const profiles={
  SURVIVAL:{worldMovement:[8,/move|walk|run|explor|travel|position| 이동|탐험/i],gathering:[7,/gather|collect|harvest|mine|wood|food|resource|채집|수집/i],crafting:[7,/craft|build|recipe|tool|제작|건설/i],threatResponse:[7,/enemy|threat|attack|defend|dodge|combat|적|위협|공격|방어/i],survivalPressure:[6,/health|hunger|stamina|day|night|temperature|surviv|체력|허기|생존/i],explorationVariety:[5,/zone|biome|area|discover|map|지역|구역|발견/i]},
  DEFENSE:{placementPath:[8,/place|tower|lane|path|route|배치|타워|경로/i],waveVariety:[7,/wave|spawn|enemy|웨이브|적/i],towerVariety:[7,/tower|turret|defense|타워|포탑|방어/i],upgradeDepth:[6,/upgrade|level|강화|업그레이드/i],economy:[6,/coin|gold|resource|cost|earn|골드|자원|비용/i],strategicChoice:[6,/target|range|choice|strategy|priority|선택|전략|우선/i]},
  RPG:{combat:[8,/attack|skill|combat|damage|battle|공격|스킬|전투/i],questNpc:[7,/quest|npc|dialog|talk|퀘스트|대화/i],exploration:[6,/explor|move|zone|map|travel|탐험|이동|지역/i],equipmentGrowth:[7,/equip|weapon|armor|level|xp|upgrade|장비|무기|방어구|레벨|성장/i],enemyBoss:[6,/enemy|boss|monster|적|보스|몬스터/i],storyWorld:[6,/story|chapter|choice|world|event|스토리|챕터|세계|사건/i]},
  TYCOON:{productionChain:[9,/mine|produce|smelt|process|factory|production|생산|채굴|제련|공장/i],upgrades:[7,/upgrade|level|capacity|강화|업그레이드/i],automation:[7,/auto|drone|worker|machine|자동|드론|작업자/i],economy:[7,/coin|cash|sell|buy|price|income|돈|판매|구매|수익/i],zoneUnlock:[5,/zone|unlock|area|구역|해금|지역/i],manualAutoChoice:[5,/manual|auto|choice|toggle|수동|자동|선택/i]},
  PUZZLE:{puzzleRules:[9,/match|merge|rotate|swap|solve|rule|매치|합치|회전|교환|퍼즐/i],solvability:[7,/solve|goal|target|clear|해결|목표|클리어/i],difficultyCurve:[7,/level|stage|difficulty|레벨|스테이지|난이도/i],boardState:[6,/board|grid|cell|tile|보드|그리드|칸|타일/i],gimmickVariety:[6,/special|combo|chain|obstacle|특수|콤보|연쇄|장애물/i],feedback:[5,/score|combo|effect|clear|점수|콤보|효과/i]},
  OBBY:{movementFeel:[9,/move|jump|dash|run| 이동|점프|대시/i],levelDesign:[8,/level|stage|platform|course|레벨|스테이지|코스/i],obstacleVariety:[7,/obstacle|hazard|trap|장애물|함정/i],failRetry:[6,/fail|death|retry|respawn|실패|죽음|재시도|부활/i],difficultyCurve:[6,/difficulty|checkpoint|stage|난이도|체크포인트/i],checkpoints:[4,/checkpoint|savepoint|체크포인트/i]},
  BATTLEGROUND:{movement:[7,/move|dash|dodge|position| 이동|대시|회피/i],combatHit:[8,/attack|hit|damage|combo|공격|타격|데미지|콤보/i],enemyAi:[7,/enemy|ai|intent|opponent|적|상대|의도/i],skillsCooldown:[6,/skill|cooldown|energy|스킬|쿨다운|에너지/i],combatObjective:[6,/round|win|objective|score|라운드|승리|목표|점수/i],combatFeedback:[6,/hit|effect|flash|sound|impact|타격|효과|사운드/i]},
  STORY:{exploration:[7,/explor|move|area|world|탐험|이동|지역|세계/i],quest:[7,/quest|mission|objective|퀘스트|임무|목표/i],npcDialogue:[6,/npc|dialog|talk|대화/i],eventState:[6,/event|choice|state|consequence|사건|선택|상태|결과/i],combatPuzzle:[6,/combat|battle|puzzle|전투|퍼즐/i],branchingGoal:[8,/branch|choice|ending|goal|분기|선택|엔딩|목표/i]},
  ROLEPLAY:{worldSpace:[7,/world|home|town|room|place|세계|집|마을|공간/i],interaction:[7,/interact|use|open|sit|touch|상호작용|사용/i],npc:[6,/npc|character|resident|주민|캐릭터/i],lifeActivities:[7,/work|shop|cook|drive|job|생활|일|상점|요리|운전/i],characterState:[6,/avatar|mood|need|inventory|아바타|상태|인벤토리/i],freedomChoice:[7,/choice|自由|free|custom|선택|자유|커스텀/i]},
  DEFAULT:{categoryCore:[12,/gameplay|action|core|게임|행동|핵심/i],categoryVariety:[8,/variety|different|multiple|다양|여러/i],categoryProgression:[8,/progress|upgrade|reward|성장|강화|보상/i],categoryChallenge:[6,/challenge|enemy|risk|difficulty|도전|적|위험|난이도/i],categoryWorld:[6,/world|area|board|arena|map|세계|지역|보드|전장|맵/i]},
};

export function normalizeWebGameCategory(category=''){
  const value=clean(category).toUpperCase();
  if(/SURVIVAL|ROGUELITE|HORROR/.test(value))return'SURVIVAL';
  if(/DEFENSE|STRATEGY/.test(value))return'DEFENSE';
  if(/STORY_COMPLETE_RPG|STORY_RPG|ADVENTURE_RPG|IDLE_GROWTH_RPG/.test(value))return'RPG';
  if(/SIMULATOR|TYCOON|INCREMENTAL/.test(value))return'TYCOON';
  if(/PUZZLE/.test(value))return'PUZZLE';
  if(/OBBY|PLATFORM|MINIGAME/.test(value))return'OBBY';
  if(/BATTLEGROUND|FIGHT|SHOOTER/.test(value))return'BATTLEGROUND';
  if(/STORY|ADVENTURE/.test(value))return'STORY';
  if(/ROLEPLAY|LIFE|AVATAR|CASUAL/.test(value))return'ROLEPLAY';
  return'DEFAULT';
}

function categoryScore(profile,interactedText,sourceText){
  const scores={},weights={};
  for(const [dimension,[max,pattern]] of Object.entries(profile)){
    weights[dimension]=max;
    const runtimeHit=pattern.test(interactedText);
    pattern.lastIndex=0;
    const sourceHit=pattern.test(sourceText);
    pattern.lastIndex=0;
    scores[dimension]=runtimeHit?max:sourceHit?Math.max(1,Math.floor(max*0.45)):0;
  }
  return {scores,weights};
}

export function scoreWebImplementation({category='',runtime={},sourceText=''}={}){
  const metrics=runtime?.realGameMetrics||{};
  const cycle=runtime?.playableCycle||{};
  const interacted=(Array.isArray(metrics.interactedMechanicIds)?metrics.interactedMechanicIds:[]).join(' ').toLowerCase();
  const source=String(sourceText||'').toLowerCase();
  const commonScores={
    coreGameLoop:cycle.pass===true?15:ratioScore(metrics.meaningfulStateTransitionCount,6,15),
    systemConnectivity:Math.min(10,ratioScore(metrics.uniqueStateSignatureCount,10,6)+ratioScore(metrics.multiFieldTransitionCount,4,4)),
    controlGameFeel:Math.min(8,ratioScore(metrics.interactionSuccessRate,1,5)+(runtime?.mobileViewport?.touch===true?3:0)),
    functionalUiUx:ratioScore(metrics.uniqueFunctionalUiCount,6,7),
    progressionReward:Math.min(7,ratioScore(metrics.progressionSignalCount,3,4)+ratioScore(metrics.meaningfulStateTransitionCount,10,3)),
    riskFailureRetry:Math.min(5,(runtime?.terminalOutcome?.reached===true?3:0)+(metrics.retryControlPresent===true?2:0)),
    gameplayFeedback:Math.min(4,(Number(metrics.canvasChangedTransitionCount||0)>0?2:0)+(runtime?.musicRuntime?.pass===true?1:0)+(metrics.feedbackSignalPresent===true?1:0)),
    runtimeStability:Math.min(4,(runtime?.runtimeSmokePassed===true?3:0)+(metrics.mobileOverflow===false?1:0)),
  };
  const normalizedCategory=normalizeWebGameCategory(category);
  const categoryResult=categoryScore(profiles[normalizedCategory]||profiles.DEFAULT,interacted,source);
  const scores={...commonScores,...categoryResult.scores};
  const weights={...WEB_IMPLEMENTATION_COMMON_WEIGHTS,...categoryResult.weights};
  const commonTotal=Object.values(commonScores).reduce((a,b)=>a+b,0);
  const categoryTotal=Object.values(categoryResult.scores).reduce((a,b)=>a+b,0);
  return {scores,weights,commonTotal,categoryTotal,total:commonTotal+categoryTotal,category:normalizedCategory};
}
