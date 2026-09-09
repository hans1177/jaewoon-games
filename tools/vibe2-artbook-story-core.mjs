const CLEAN_RE=/\s+/g;
export const REQUIRED_STAGES=['OPENING','EARLY','MID','LATE','FINAL_BOSS','ENDING'];
const TECHNICAL_NARRATIVE_RE=/device\s*pixel\s*ratio|devicePixelRatio|image\s*smoothing|imageSmoothing|canvas(?:\.|\s+(?:size|width|height|resize))|requestAnimationFrame|addEventListener|window\.resize|viewport|renderer|rendering|pixel\s*ratio|ctx\.|getContext\(|css\b|dom\b/i;
const GAMEPLAY_KEYWORD_RE=/quest|mission|boss|enemy|monster|npc|dialog|story|world|region|area|chapter|portal|surviv|craft|food|hunger|stamina|health|attack|weapon|resource|day\b|night|wave|level|skill|reward|퀘스트|미션|보스|적|몬스터|대사|스토리|세계|지역|챕터|포탈|생존|제작|먹이|배고픔|체력|공격|무기|자원|낮|밤|웨이브|레벨|스킬|보상/ig;

export const clean=v=>String(v??'').replace(CLEAN_RE,' ').trim();
export const clip=(v,n=220)=>{const s=clean(v);return s.length>n?s.slice(0,n-1)+'…':s;};
export const stageKey=stage=>clean(stage).toUpperCase().replaceAll('-','_').replaceAll(' ','_');

function stripMarkup(value){
  return clean(String(value??'')
    .replace(/<style\b[\s\S]*?<\/style>/gi,' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/\b(?:const|let|var|function|return|if|else|for|while)\b/g,' '));
}
function technicalOnly(value){
  const s=clean(value);
  if(!s)return true;
  const tech=(s.match(new RegExp(TECHNICAL_NARRATIVE_RE.source,'ig'))||[]).length;
  const game=(s.match(new RegExp(GAMEPLAY_KEYWORD_RE.source,'ig'))||[]).length;
  return tech>0&&game===0;
}
export function gameplayEvidenceSnippets(text,{max=36,radius=170}={}){
  const source=String(text??'');
  const hits=[];
  GAMEPLAY_KEYWORD_RE.lastIndex=0;
  let match;
  while((match=GAMEPLAY_KEYWORD_RE.exec(source))&&hits.length<max*5){
    const start=Math.max(0,match.index-radius),end=Math.min(source.length,match.index+match[0].length+radius);
    const snippet=clip(stripMarkup(source.slice(start,end)),260);
    if(snippet.length<18||technicalOnly(snippet))continue;
    hits.push(snippet);
  }
  const unique=[];
  for(const row of hits){
    const key=row.toLowerCase().replace(/[^a-z0-9가-힣]+/g,'').slice(0,90);
    if(!key||unique.some(x=>x.key===key))continue;
    unique.push({key,row});
    if(unique.length>=max)break;
  }
  return unique.map(x=>x.row);
}
export function narrativeValue(value,fallback){
  const s=clip(value,120);
  return !s||TECHNICAL_NARRATIVE_RE.test(s)?clip(fallback,120):s;
}
function fallbackPhase(stage,gameName,genreText){
  const survival=/생존|surviv/i.test(`${gameName} ${genreText}`),defense=/디펜스|defen|wave/i.test(`${gameName} ${genreText}`);
  const verbs=survival?{
    OPENING:['시작 생존권','첫날 생존 기반을 확보한다','낯선 환경과 자원 부족','먹이와 안전지대를 확보한다','첫 위기를 넘기고 주변 생태의 단서를 얻는다'],
    EARLY:['초기 활동권','안정적인 자원 루프를 만든다','반복되는 포식자와 자원 경쟁','기본 장비와 이동 루트를 확보한다','더 위험한 지역으로 갈 이유가 생긴다'],
    MID:['중간 생태권','새 생존 규칙에 적응한다','기존 방식으로 버티기 어려운 환경 변화','새 자원과 능력을 활용해 위협의 원인을 추적한다','후반 위협과 최종 세력의 존재가 드러난다'],
    LATE:['위험 핵심권','최종 위협에 맞설 준비를 끝낸다','생태 균형이 무너지며 안전지대가 사라진다','동료·장비·자원을 결집해 핵심 지역을 연다','최종보스와 맞설 조건이 완성된다'],
    FINAL_BOSS:['최종 둥지','생태 위기의 원인을 제거한다','최종 세력이 생존권 전체를 위협한다','축적한 생존 수단을 총동원해 보스를 공략한다','생존권의 주도권을 되찾는다'],
    ENDING:['회복된 생존권','새로운 생태 질서를 선택한다','승리 뒤에도 자원과 세력의 균형 문제가 남는다','남은 지역을 정비하고 다음 목표를 정한다','본편을 마치고 확장 탐험이 열린다']
  }:defense?{
    OPENING:['초기 방어선','첫 방어선을 유지한다','적의 첫 침공','기본 배치와 자원 운용으로 막아낸다','침공의 규모가 커질 조짐을 확인한다'],
    EARLY:['외곽 방어선','방어 체계를 확장한다','적 종류와 공격 경로가 늘어난다','유닛과 시설 조합을 익힌다','중간 거점으로 전선을 넓힌다'],
    MID:['중앙 전선','적의 핵심 패턴을 파악한다','기존 배치가 통하지 않는 특수 웨이브','새 조합으로 돌파구를 만든다','적 지휘부의 위치가 드러난다'],
    LATE:['최종 방어권','결전을 준비한다','연속 공세로 자원 압박이 극대화된다','핵심 업그레이드와 배치를 완성한다','최종 웨이브가 열린다'],
    FINAL_BOSS:['최종 전선','적 지휘 개체를 격파한다','최종 침공이 시작된다','모든 시스템을 조합해 보스를 막는다','침공이 멈추고 전선이 안정된다'],
    ENDING:['재건 구역','방어 이후의 운영 목표를 정한다','승리 후 재건과 잔존 위협이 남는다','거점을 복구하고 다음 도전을 연다','본편 종료와 고난도 모드가 연결된다']
  }:{
    OPENING:['시작 지역','핵심 목표를 이해한다','현재 세계의 첫 문제와 마주친다','기본 행동으로 첫 문제를 해결한다','더 큰 갈등의 단서를 얻는다'],
    EARLY:['초기 지역','핵심 플레이 루프를 확립한다','첫 성공 뒤 새로운 장애물이 등장한다','기본 능력과 자원을 활용한다','다음 지역의 목표가 열린다'],
    MID:['중간 지역','갈등의 원인을 추적한다','기존 방식으로 해결되지 않는 문제가 커진다','새 시스템과 선택을 활용한다','최종 갈등의 주체가 드러난다'],
    LATE:['후반 지역','최종 결전을 준비한다','주요 세력의 충돌이 최고조에 이른다','축적한 성장 요소를 결집한다','최종 지역 진입 조건을 얻는다'],
    FINAL_BOSS:['최종 지역','핵심 갈등을 끝낸다','최종 적이 목표 달성을 직접 막는다','게임 전체에서 익힌 수단을 활용해 결전을 치른다','세계 상태가 결정적으로 변화한다'],
    ENDING:['결말 지역','승리 이후의 선택을 마무리한다','핵심 갈등은 끝났지만 후속 문제가 남는다','남은 관계와 목표를 정리한다','본편 종료와 다음 목표가 연결된다']
  };
  const [region,quest,cause,action,result]=verbs[stage];
  return {stage,region,quest,cause,playerAction:action,result};
}
export function buildFallbackSeed({gameName,genreText='',minimumPages=16}={}){
  return {
    recommendedPages:minimumPages,
    playerMotivation:`${gameName}의 핵심 목표를 달성하며 현재 구현보다 넓은 중·후반 진행을 완성한다.`,
    centralConflict:`초반 핵심 루프에서 시작한 문제가 단계마다 확대되어 최종 결전으로 이어진다.`,
    twist:'중반에 초반의 문제와 최종 위협이 같은 원인에서 이어졌다는 단서가 드러난다.',
    phases:REQUIRED_STAGES.map(stage=>fallbackPhase(stage,gameName,genreText)),
    finalBoss:{boss:'최종 위협의 핵심 개체',trigger:'후반 목표를 완료해 최종 지역이 열린다',whyNow:'누적된 갈등이 더 이상 미룰 수 없는 상태가 된다',winConsequence:'핵심 갈등이 해소되고 엔딩 선택이 열린다'},
    ending:'플레이어의 행동으로 핵심 갈등이 정리되고 세계의 다음 상태가 제시된다.',
    postgame:'본편 이후 남은 지역·고난도 목표·선택형 과제를 이어서 플레이할 수 있다.',
    npcSeeds:[]
  };
}
function normalizedPhases(seed,fallback){
  const byStage=new Map((Array.isArray(seed?.phases)?seed.phases:[]).map(x=>[stageKey(x?.stage),x]));
  return REQUIRED_STAGES.map(stage=>{
    const row=byStage.get(stage)||{},fb=fallback.phases.find(x=>x.stage===stage);
    return {
      stage,
      region:narrativeValue(row.region,fb.region),
      quest:narrativeValue(row.quest,fb.quest),
      cause:narrativeValue(row.cause,fb.cause),
      playerAction:narrativeValue(row.playerAction,fb.playerAction),
      result:narrativeValue(row.result,fb.result),
    };
  });
}
export function expandCompactSeed(seed,{gameName='게임',genreText='',minimumPages=16,evidenceSnippets=[]}={}){
  const fallback=buildFallbackSeed({gameName,genreText,minimumPages}),phases=normalizedPhases(seed,fallback);
  const contaminated=[];
  for(const row of Array.isArray(seed?.phases)?seed.phases:[]){
    for(const k of ['region','quest','cause','playerAction','result'])if(TECHNICAL_NARRATIVE_RE.test(clean(row?.[k])))contaminated.push(`${stageKey(row?.stage)}.${k}`);
  }
  const storySpine={};
  const spineKeys=['opening','early','mid','late','finalBoss','ending'];
  phases.forEach((p,i)=>{storySpine[spineKeys[i]]=clip(`${p.quest} — ${p.result}`,180);});
  const phasePlans=phases.map((p,i)=>({...p,nextHook:i<phases.length-1?clip(`${phases[i+1].region}에서 ${phases[i+1].quest}`,120):narrativeValue(seed?.postgame,fallback.postgame)}));
  const mainQuestChain=phasePlans.map((p,i)=>({id:`MAIN-${String(i+1).padStart(2,'0')}`,...p}));
  const regionTransitions=phasePlans.slice(0,-1).map((p,i)=>({from:p.region,to:phasePlans[i+1].region,cause:p.result,unlock:phasePlans[i+1].quest}));
  const bossSeed=seed?.finalBoss||{},finalPhase=phasePlans[4];
  const boss={
    boss:narrativeValue(bossSeed.boss,'최종 위협의 핵심 개체'),
    trigger:narrativeValue(bossSeed.trigger,finalPhase.cause),
    whyNow:narrativeValue(bossSeed.whyNow,finalPhase.quest),
    winConsequence:narrativeValue(bossSeed.winConsequence,finalPhase.result),
  };
  const npcMotivations=(Array.isArray(seed?.npcSeeds)?seed.npcSeeds:[]).slice(0,4).map((n,i)=>({
    name:narrativeValue(n?.name,`주요 인물 ${i+1}`),goal:narrativeValue(n?.goal,'플레이어와 얽힌 목표를 가진다'),conflict:narrativeValue(n?.conflict,'핵심 갈등에서 이해관계가 충돌한다'),relationshipToPlayer:narrativeValue(n?.relationshipToPlayer,'협력과 갈등을 오가며 진행에 영향을 준다')
  }));
  const gaps=[];
  if(evidenceSnippets.length<4)gaps.push('현재 코드에서 스토리 근거가 적어 기획부가 세계관·NPC·지역 설정을 추가 검증해야 함');
  if(!npcMotivations.length)gaps.push('주요 NPC/세력은 기존 근거가 부족해 기획부 확정 필요');
  const recommendedPages=Math.max(minimumPages,Math.min(30,Math.round(Number(seed?.recommendedPages)||minimumPages)));
  return {
    recommendedPages,
    playerMotivation:narrativeValue(seed?.playerMotivation,fallback.playerMotivation),
    centralConflict:narrativeValue(seed?.centralConflict,fallback.centralConflict),
    causalitySummary:clip(phasePlans.map(p=>`${p.stage}:${p.cause}→${p.result}`).join(' / '),600),
    storySpine,phasePlans,
    regions:[...new Set(phasePlans.map(p=>p.region))],regionTransitions,mainQuestChain,
    sideQuestHooks:npcMotivations.map(n=>`${n.name}의 목표(${n.goal})와 플레이어 진행을 연결하는 선택형 과제`),
    npcMotivations,majorBosses:[boss.boss],bossCausality:[boss],gaps,
    proposalAdditions:phasePlans.map(p=>`${p.stage}: ${p.region} / ${p.quest}`),
    conflictEscalation:clip(phasePlans.map(p=>p.cause).join(' → '),420),
    twist:narrativeValue(seed?.twist,fallback.twist),finalRegion:finalPhase.region,
    endgame:narrativeValue(seed?.ending,fallback.ending),postgame:narrativeValue(seed?.postgame,fallback.postgame),
    progressionBridge:clip(regionTransitions.map(t=>`${t.from}→${t.to}:${t.unlock}`).join(' / '),500),
    technicalContaminationRemoved:[...new Set(contaminated)],
  };
}
export function validExpandedDraft(d){
  const s=d?.storySpine||{},phases=Array.isArray(d?.phasePlans)?d.phasePlans:[],quests=Array.isArray(d?.mainQuestChain)?d.mainQuestChain:[],phaseSet=new Set(phases.map(x=>stageKey(x.stage)));
  return Boolean(d&&['opening','early','mid','late','finalBoss','ending'].every(k=>clean(s[k]))&&REQUIRED_STAGES.every(x=>phaseSet.has(x))&&phases.length===6&&phases.every(p=>['region','quest','cause','playerAction','result','nextHook'].every(k=>clean(p[k])))&&quests.length>=6&&Array.isArray(d.bossCausality)&&d.bossCausality.length>=1&&clean(d.causalitySummary)&&clean(d.endgame)&&Number(d.recommendedPages)>=12&&Number(d.recommendedPages)<=30);
}
