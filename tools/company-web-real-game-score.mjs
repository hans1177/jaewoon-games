// Web 실게임 자격/점수: 공통 60 + 카테고리 40. 테스트 하네스/시간구간 버튼은 점수로 보상하지 않는다.
const clean=v=>String(v??'').trim();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const full=(ok,max,partial=0)=>ok?max:partial;

const CATEGORY_PROFILES={
  SURVIVAL:{patterns:[/move|world|explor|이동|탐험/i,/resource|gather|collect|채집|자원/i,/craft|build|제작|건설/i,/enemy|threat|combat|적|위협|전투/i,/hunger|health|surviv|생존|체력|허기/i,/zone|map|discover|지역|맵|발견/i],weights:[8,7,7,7,6,5]},
  DEFENSE:{patterns:[/tower|place|lane|path|배치|타워|경로/i,/wave|enemy|웨이브|적/i,/tower|weapon|variant|타워|무기|종류/i,/upgrade|강화|업그레이드/i,/coin|gold|resource|econom|골드|자원|경제/i,/strategy|target|adapt|전략|대응/i],weights:[8,7,7,6,6,6]},
  RPG:{patterns:[/combat|attack|skill|전투|공격|스킬/i,/quest|npc|dialog|퀘스트|대화/i,/explor|move|region|탐험|이동|지역/i,/equip|level|growth|장비|레벨|성장/i,/enemy|boss|적|보스/i,/story|chapter|world|state|스토리|챕터|세계/i],weights:[8,7,6,7,6,6]},
  TYCOON:{patterns:[/produce|mine|smelt|factory|생산|채굴|제련|공장/i,/upgrade|강화|업그레이드/i,/auto|drone|자동/i,/sell|coin|econom|판매|경제|골드/i,/unlock|zone|해금|구역/i,/manual|choice|선택|수동/i],weights:[9,7,7,7,5,5]},
  PUZZLE:{patterns:[/board|grid|match|rule|보드|퍼즐|규칙/i,/solve|clear|combo|풀이|클리어|콤보/i,/level|difficulty|난이도|단계/i,/state|swap|rotate|상태|교환|회전/i,/special|gimmick|특수|기믹/i,/feedback|effect|score|피드백|효과|점수/i],weights:[9,7,7,6,6,5]},
  OBBY:{patterns:[/move|jump|이동|점프/i,/level|stage|course|레벨|코스/i,/obstacle|trap|장애물|함정/i,/retry|death|fail|재시도|실패/i,/difficulty|speed|난이도|속도/i,/checkpoint|체크포인트/i],weights:[9,8,7,6,6,4]},
  BATTLE:{patterns:[/move|distance|이동|거리/i,/attack|damage|hit|공격|피격/i,/enemy|ai|opponent|적|상대/i,/skill|cooldown|스킬|쿨다운/i,/round|goal|win|라운드|목표|승리/i,/effect|audio|feedback|효과|음향|피드백/i],weights:[7,8,7,6,6,6]},
  STORY:{patterns:[/explor|region|탐험|지역/i,/quest|objective|퀘스트|목표/i,/npc|dialog|대화/i,/event|state|choice|사건|상태|선택/i,/combat|puzzle|전투|퍼즐/i,/branch|chapter|ending|분기|챕터|엔딩/i],weights:[7,7,6,6,6,8]},
  ROLEPLAY:{patterns:[/world|home|space|월드|집|공간/i,/interact|use|상호작용/i,/npc|social|사회/i,/job|activity|life|직업|활동|생활/i,/character|status|avatar|캐릭터|상태|아바타/i,/choice|freedom|선택|자유/i],weights:[7,7,6,7,6,7]},
  CASUAL:{patterns:[/core|action|play|핵심|행동|플레이/i,/state|score|상태|점수/i,/goal|win|목표|승리/i,/progress|level|진행|레벨/i,/feedback|effect|피드백|효과/i,/retry|replay|재시도|반복플레이/i],weights:[8,7,7,7,6,5]}
};

export function webCategoryFamily(category=''){
  const c=clean(category).toUpperCase();
  if(/SURVIVAL|ROGUELITE|HORROR/.test(c))return'SURVIVAL';
  if(/DEFENSE|STRATEGY/.test(c))return'DEFENSE';
  if(/PUZZLE/.test(c))return'PUZZLE';
  if(/SIMULATOR|TYCOON|INCREMENTAL/.test(c))return'TYCOON';
  if(/OBBY|PARTY|MINIGAME|PLATFORM/.test(c))return'OBBY';
  if(/BATTLEGROUND|FIGHT|SHOOT/.test(c))return'BATTLE';
  if(/ROLEPLAY|LIFE|AVATAR/.test(c))return'ROLEPLAY';
  if(/STORY|ADVENTURE/.test(c))return'STORY';
  if(/RPG|IDLE_GROWTH/.test(c))return'RPG';
  return'CASUAL';
}

export function evaluateRealGameQualification(m={}){
  const gates={
    REAL_GAME:m.realArtifact===true,
    COMPLETE_CYCLE:m.terminalReached===true&&Number(m.meaningfulStateTransitions)>=5&&Number(m.uniqueInteractedMechanics)>=3,
    REAL_INPUT:Number(m.interactionCount)>=8&&m.stateChanged===true,
    GAMEPLAY_SURFACE:Number(m.gameplaySurfaceRatio)>=0.18||m.gameplaySurfacePresent===true,
    REAL_STATE:Number(m.uniqueStateCount)>=5,
    WIN_LOSS:m.winLossImplemented===true&&m.terminalReached===true,
    NO_TEST_PROXY:Number(m.testUiRatio||0)===0&&Number(m.directSessionControls||0)===0&&Number(m.proxyMarkers||0)===0,
    NO_FAKE_PROGRESS:Number(m.duplicateActionRatio||0)<0.82,
    MOBILE_PLAYABLE:m.mobilePlayable===true,
    RUNTIME_STABLE:m.runtimeStable===true
  };
  const failures=Object.entries(gates).filter(([,v])=>!v).map(([k])=>k);
  return{pass:failures.length===0,gates,failures};
}

export function scoreRealWebGame({category='',sourceText='',metrics={}}={}){
  const qualification=evaluateRealGameQualification(metrics);
  const family=webCategoryFamily(category);
  if(!qualification.pass)return{pass:false,totalScore:0,commonScore:0,categoryScore:0,categoryFamily:family,qualification,common:{},category:{},improvementTargets:qualification.failures.slice(0,3)};
  const common={
    CORE_LOOP:full(metrics.terminalReached&&metrics.uniqueInteractedMechanics>=3,15,8),
    SYSTEM_CONNECTIVITY:Math.round(10*clamp((metrics.meaningfulStateTransitions||0)/10,0,1)),
    CONTROL_AND_FEEL:full(metrics.mobilePlayable&&metrics.interactionSuccessRatio>=0.85,8,4),
    FUNCTIONAL_UI_UX:Math.round(7*clamp((metrics.uniqueFunctionalUiCount||0)/7,0,1)),
    PROGRESSION_REWARD:Math.round(7*clamp((metrics.uniqueStateCount||0)/10,0,1)),
    RISK_FAIL_RETRY:full(metrics.winLossImplemented&&metrics.terminalReached,5,2),
    FEEDBACK:full(metrics.visualFeedback&&metrics.audioFeedback,4,2),
    STABILITY_PERFORMANCE:full(metrics.runtimeStable&&metrics.mobilePlayable,4,0)
  };
  const commonMax={CORE_LOOP:15,SYSTEM_CONNECTIVITY:10,CONTROL_AND_FEEL:8,FUNCTIONAL_UI_UX:7,PROGRESSION_REWARD:7,RISK_FAIL_RETRY:5,FEEDBACK:4,STABILITY_PERFORMANCE:4};
  const commonScore=Object.values(common).reduce((a,b)=>a+b,0);
  const profile=CATEGORY_PROFILES[family]||CATEGORY_PROFILES.CASUAL;
  const evidence=`${clean(sourceText)} ${(metrics.mechanicIds||[]).join(' ')} ${(metrics.interactedMechanicIds||[]).join(' ')}`;
  const categoryScores={},labels=['A','B','C','D','E','F'];
  profile.patterns.forEach((re,i)=>{categoryScores[`${family}_${labels[i]}`]=re.test(evidence)?profile.weights[i]:0;});
  const categoryScore=Object.values(categoryScores).reduce((a,b)=>a+b,0);
  const totalScore=commonScore+categoryScore;
  const gaps=[...Object.entries(common).map(([dimension,current])=>({dimension,current,max:commonMax[dimension]})),...Object.entries(categoryScores).map(([dimension,current],i)=>({dimension,current,max:profile.weights[i]}))].map(x=>({...x,gap:x.max-x.current})).filter(x=>x.gap>0).sort((a,b)=>b.gap-a.gap||b.max-a.max).slice(0,3);
  return{pass:true,totalScore,commonScore,categoryScore,categoryFamily:family,qualification,common,category:categoryScores,improvementTargets:gaps};
}
