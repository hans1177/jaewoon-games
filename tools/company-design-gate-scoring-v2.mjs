// 파일명: tools/company-design-gate-scoring-v2.mjs
// 역할: 설계 점수와 실제 작성 내용의 모순·누락을 같은 검증 경로에서 판정한다.
const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const list=value=>Array.isArray(value)?value:[];
const distinct=values=>[...new Set(values.map(clean).filter(Boolean))];

export const DESIGN_GATE_WEIGHTS=Object.freeze({
  IDEA_AND_DISTINCTNESS:12,
  CATEGORY_IDENTITY:10,
  CORE_LOOP_DESIGN:14,
  SYSTEM_INTERCONNECTION_DESIGN:12,
  PROGRESSION_ECONOMY_BALANCE_DESIGN:10,
  CONTENT_EXPANSION_PLAN:10,
  FAILURE_RETRY_RISK_DESIGN:8,
  PLATFORM_FIT_DESIGN:8,
  UX_AND_ACCESSIBILITY_PLAN:6,
  ART_AUDIO_DIRECTION:5,
  IMPLEMENTATION_FEASIBILITY_AND_TRACEABILITY:5,
});
export const DESIGN_DIRECT_SCORE_LEVELS=Object.freeze([0,20,40,60,80,100]);
export const DESIGN_GATE_PASS_MINIMUM=80;
export const DESIGN_CRITICAL_AXIS_MINIMUM_PERCENT=75;

const weighted=(level,weight)=>Math.round((Number(level)*Number(weight)/100)*100)/100;
const textReady=(value,min=24)=>clean(value).length>=min;
const textListReady=(value,minItems=3,minLength=24)=>distinct(list(value).filter(item=>textReady(item,minLength))).length>=minItems;
const objectReady=(value,keys,minLength=20)=>Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&keys.every(key=>textReady(value[key],minLength)));
const objectListReady=(value,keys,minItems=3,minLength=12)=>{
  const rows=list(value).filter(row=>row&&typeof row==='object'&&!Array.isArray(row)&&keys.every(key=>textReady(row[key],minLength)));
  const signatures=distinct(rows.map(row=>keys.map(key=>clean(row[key])).join('|')));
  return rows.length>=minItems&&signatures.length>=minItems;
};
const revisionProven=(designRecord,cycleStatus)=>Boolean(
  designRecord?.sameModelAsDraft===true&&
  String(cycleStatus?.status||'').toUpperCase()==='COMPLETE'&&
  Number(designRecord?.unresolvedConflictCount||0)===0&&
  Number(designRecord?.heldCount||0)===0
);
const AXIS_REPAIR_ACTION=Object.freeze({
  IDEA_AND_DISTINCTNESS:'정체성·플레이어 판타지·coreFun을 구체화하고 coreLoop와 최소 2개 signature system에 직접 연결한다.',
  CATEGORY_IDENTITY:'선언 장르와 실제 core loop/play mode가 같은 플레이 정체성을 가리키도록 설계를 정렬한다.',
  CORE_LOOP_DESIGN:'3단계 이상 core loop를 실제 선택·상태변화로 구체화하고 signature system과 상호작용을 연결한다.',
  SYSTEM_INTERCONNECTION_DESIGN:'최소 3개 시스템 연결에 fromSystem/toSystem/trigger/stateChange를 명시한다.',
  PROGRESSION_ECONOMY_BALANCE_DESIGN:'진행·자원 흐름·밸런스 규칙을 하나의 반복 가능한 경제/성장 구조로 연결한다.',
  CONTENT_EXPANSION_PLAN:'최소 3개 확장 마일스톤에 새 gameplay와 기존 시스템 영향까지 명시한다.',
  FAILURE_RETRY_RISK_DESIGN:'실패상태·재시도 흐름·위험 압력·회복 규칙을 구체적으로 설계한다.',
  PLATFORM_FIT_DESIGN:'선택 플랫폼 입력·성능예산·세션 제약·모바일 UX를 실제 구현 조건으로 명시한다.',
  UX_AND_ACCESSIBILITY_PLAN:'HUD 우선순위·터치/입력·가독성·접근성 계획을 구체적으로 설계한다.',
  ART_AUDIO_DIRECTION:'시각 정체성·오디오 정체성·게임플레이 피드백 동기화를 연결한다.',
  IMPLEMENTATION_FEASIBILITY_AND_TRACEABILITY:'설계요소→책임시스템→검증증거 추적성을 최소 3개 이상 명시한다.'
});
const rejectionReason=({code,axis=null,evidenceLevel=null,minimumRequired=null,evidence={},requiredAction})=>({
  code,
  kind:'HARD_GATE',
  axis,
  evidenceLevel,
  minimumRequired,
  evidence,
  requiredAction,
  bypassAllowed:false,
  source:'STAGE_GATE_SCORING_V2'
});
const level=(basic,connected,proven=false)=>{
  if(!basic)return 0;
  if(!connected)return 60;
  return proven?100:80;
};

// 설계 규칙: 새 원본 작성과 기존 표현 보존 작업의 범위를 구분한다.
export function designPlayabilityRequirements(seed={},sourceText=''){
  const original=seed.originalDesignContext?.content||{};
  const infection=/INFECTION/i.test(clean(seed.INITIAL_PLAY_MODE))||original.systemImplementation?.currentCoreRule==='EXPLICIT_SERVER_AUTHORITATIVE_INFECT_ATTACK_ONLY';
  const lockedNumbers=Object.fromEntries(list(original.technicalAssumptions).flatMap(value=>{
    const match=/^([A-Za-z][A-Za-z0-9]*)\s*=\s*(-?\d+(?:\.\d+)?)$/.exec(clean(value));
    return match?[[match[1],Number(match[2])]]:[];
  }));
  // 실행하지 않고 현재 Luau 설정의 명시적 행만 읽는다. 해석할 수 없는 값은 추측하지 않는다.
  const sourceRows={},sourceForms={};
  let section='';
  for(const line of String(sourceText).split('\n')){
    const start=/^\s*(HumanForms|Monsters|MonsterForms|HumanAbilities|InfectedAbilities|MonsterAbilities)\s*=\s*\{/.exec(line);
    if(start){section=start[1];continue;}
    if(/^\s*},?\s*$/.test(line)){section='';continue;}
    const id=/\bId="([^"]+)"/.exec(line)?.[1];
    if(id&&section.endsWith('Forms'))sourceForms[id]={human:/\bActiveAbility="([^"]+)"/.exec(line)?.[1],infected:/\bInfectedAbility="([^"]+)"/.exec(line)?.[1],monster:/\bAbility="([^"]+)"/.exec(line)?.[1]};
    const row=/^\s*([A-Z][A-Z_]+)\s*=\s*\{(.+)\},?\s*$/.exec(line);
    if(row&&section.endsWith('Abilities')){
      const values=Object.fromEntries([...row[2].matchAll(/\b([A-Za-z]+)=(-?\d+(?:\.\d+)?)/g)].map(match=>[match[1],Number(match[2])]));
      sourceRows[row[1]]={name:/\bName="([^"]+)"/.exec(row[2])?.[1],...values};
    }
  }
  const sourceNumber=key=>{const match=new RegExp(`\\b${key}\\s*=\\s*(-?\\d+(?:\\.\\d+)?)`).exec(sourceText);return match?Number(match[1]):undefined;};
  const abilityFacts=[];
  const add=(id,kind,ownerId)=>{
    const row=sourceRows[id];if(!row)return;
    abilityFacts.push({id,kind,ownerId,name:row.name,range:row.Range??row.Radius??row.DrainRadius??row.ShockRadius??row.Distance??0,cost:row.Cost??sourceNumber('AbilityCost'),cooldownSeconds:row.Cooldown??sourceNumber('MonsterAbilityCooldown')});
  };
  if(infection&&sourceText){
    abilityFacts.push({id:'INFECT_ATTACK',kind:'INFECTION',ownerId:'BASE',range:sourceNumber('InfectRange'),cost:sourceNumber('InfectAttackCost'),cooldownSeconds:sourceNumber('InfectAttackCooldown')},{id:'PURIFY',kind:'PURIFICATION',ownerId:'BASE',range:sourceNumber('PurifyDistance'),cost:sourceNumber('PurifyCost'),cooldownSeconds:sourceNumber('PurifyCooldown')});
    for(const human of list(original.humanRoster)){add(sourceForms[human.id]?.human,'HUMAN',human.id);add(sourceForms[human.id]?.infected,'INFECTED',human.id);}
    for(const monster of list(original.monsterRoster))add(sourceForms[monster.id]?.monster,'MONSTER',monster.id);
  }
  return {
    required:!(seed.REUSE_EXISTING_GAMEPLAY_IMPLEMENTATION===true&&seed.OWNER_REBUILD_MODE==='PRESERVATION_PRESENTATION_UPGRADE'),
    infection,
    phases:infection?['START','FIRST_CONTACT','FIRST_INFECTION','IMBALANCE','COMEBACK','RESOLUTION']:['OPENING','DEVELOPMENT','RESOLUTION'],
    lockedNumbers,
    abilityFacts,
    humanRoster:list(original.humanRoster),
    monsterRoster:list(original.monsterRoster)
  };
}

// 설계 내용 검증: 분할 작성 직후와 최종 점수 판정에서 동일하게 사용한다.
export function validateDesignAuthoringContent({design={},seed={},fields=Object.keys(design),multiplayerRequired=false,requirePlayableContract=false,assetLibrary=null,sourceText='',assetFamilies=[]}={}){
  const selected=new Set(fields);
  const reasons=[];
  const reject=(code,axis,affected,evidence,requiredAction)=>{
    if(!affected.some(field=>selected.has(field)))return;
    reasons.push({...rejectionReason({code,axis,evidence,requiredAction}),fields:affected});
  };
  const proseFields=['identity','creativeGrammar','playerFantasy','coreFun','coreLoop','signatureSystems','systemInterconnections','progressionDirection','progressionEconomyBalance','contentExpansionPlan','failureRetryRisk','platformFitPlan','platformProfiles','webCanonicalDesign','platformExpansionPolicy','visualDirection','mobileUx','uxAccessibilityPlan','artAudioDirection','marketTargetDirection','multiplayerExpansionDecision','designAlternatives','selectedDesignPlan','contentVarietyPlan','technicalAssumptions','implementationTraceability'];
  const enumKeys=new Set(['name','label','role','phase','platform','targetPlatform','designAuthority','mode','sharedLargeFrame','expansionLimit','internalReleaseTarget','fromSystem','toSystem','responsibleSystem']);
  const identifierKeys=new Set(['id','fromId','toId','from','to','ruleId','ruleIds','stateInputs','stateOutputs','stateKeys','key','ownerId','abilityId','humanId','humanAbilityId','infectedAbilityId','regionId','stateKey','actorId','targetId','classId','assetId','rangeKey','costKey','cooldownKey','reachableBy','nextPhase']);
  const scan=(value,path,root,identifier=false)=>{
    if(Array.isArray(value)){value.forEach((item,index)=>scan(item,`${path}[${index}]`,root,identifier));return;}
    if(value&&typeof value==='object'){
      for(const [key,item] of Object.entries(value))if(!enumKeys.has(key))scan(item,`${path}.${key}`,root,identifierKeys.has(key));
      return;
    }
    if(typeof value!=='string')return;
    const text=clean(value);
    // 기존 표현 개선 계약이 생성하는 추적 ID는 설명용 임시 표식이 아니다.
    if(/^implementationTraceability\[\d+\]\.designElement$/.test(path)&&['ASSET_ADAPTATION','LIVING_MOTION_AND_ANIMATION_FEEL','VFX_AUDIO_CAMERA_POLISH_MOBILE'].includes(text))return;
    if((!identifier&&/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+){2,}$/.test(text))||/\b(?:TODO|TBD|PLACEHOLDER)\b|작성 예정|추후 작성|^미정$/i.test(text)){
      reject('DESIGN_PLACEHOLDER_CONTENT','IMPLEMENTATION_FEASIBILITY_AND_TRACEABILITY',[root],{path,value:text.slice(0,160)},`${path}의 임시 표식을 실제 조건·선택·상태 변화·검증 방법으로 작성한다.`);
    }
    // 실제 생성에서 한 문장을 수십 번 반복한 응답은 분량이나 설계 완성도로 인정하지 않는다.
    if(!identifier){
      const sentences=text.split(/[.!?。！？\n]+/u).map(clean).filter(sentence=>sentence.length>=12);
      const counts=new Map();
      for(const sentence of sentences)counts.set(sentence,(counts.get(sentence)||0)+1);
      const repeated=[...counts].find(([,count])=>count>=3);
      if(repeated)reject('DESIGN_REPEATED_CONTENT','IMPLEMENTATION_FEASIBILITY_AND_TRACEABILITY',[root],{path,sentence:repeated[0].slice(0,160),count:repeated[1]},`${path}에서 같은 문장을 반복하지 않는다. 필요한 조건·선택·상태 변화만 간결하게 직접 다시 작성하고 다른 정상 필드는 유지한다.`);
    }
  };
  for(const field of proseFields)if(selected.has(field))scan(design[field],field,field);
  // 소재 융합 문법은 단어 라벨만 아니라 실제 양방향 시스템 상태와 플레이 증거가 있어야 한다.
  if(Number(seed?.GAMEPLAY_SKETCH?.version||0)>=5||selected.has('creativeGrammar')){
    const grammar=design.creativeGrammar,axes=[grammar?.a,grammar?.b];
    if(!grammar||!textReady(grammar.mainIdentity,15)||axes.some(axis=>!axis||!textReady(axis.system,2)||!textReady(axis.material,2)||!textReady(axis.materialDomain,2)||!textReady(axis.stateChange,20))||!textReady(grammar.abCausality,35)||!textReady(grammar.finalGameIdentity,18)){
      reject('DESIGN_MAIN_A_B_SOURCE_GRAMMAR_MISSING','IDEA_AND_DISTINCTNESS',['creativeGrammar'],{},'MAIN 게임 정체성 및 A/B 각각의 시스템+소재와 양방향 원인·상태 교환을 다시 설계한다.');
    }
    const c=list(grammar?.cThemes);
    if(c.length!==2||!c.some(row=>row?.kind==='GENRE')||c.some(row=>!textReady(row?.name,2)||!textReady(row?.gameplayEffect,16)||!['GENRE','MATERIAL'].includes(row?.kind))||!textReady(grammar?.cWorldAndGameplayEffect,30)){
      reject('DESIGN_C_TWO_TOPICS_ONE_GENRE_REQUIRED','CATEGORY_IDENTITY',['creativeGrammar'],{},'C는 정확히 두 창작 소재를 융합하고 그중 최소 하나는 장르여야 한다. 이름·장식만이 아닌 A/B의 실제 선택과 세계 규칙에 연결한다.');
    }
    if(list(grammar?.delveDiscoveries).length<4||list(grammar?.delveDiscoveries).some(row=>!textReady(row?.clue,10)||!textReady(row?.discovery,10)||!textReady(row?.newChoice,15))||!textReady(grammar?.delveGrowthRule,25)){
      reject('DESIGN_UNBOUNDED_DELVE_DEPTH_MISSING','CONTENT_EXPANSION_PLAN',['creativeGrammar'],{},'초기 파고들기 네 사례 각각 단서·발견·새 선택을 갖추고 이후 숫자 상한 없는 발전 규칙을 설계한다.');
    }
  }
  // 정식 설계의 MAIN/A/B/c/@는 태그만 붙여서는 안 되고 각각 고유 규칙과 상태 입출력이 있어야 한다.
  if(selected.has('signatureSystems')){
    const systems=list(design.signatureSystems);
    const counts=Object.fromEntries(['MAIN','A','B','c','DELVE'].map(role=>[role,systems.filter(row=>row?.grammarRole===role).length]));
    const ids=systems.map(row=>clean(row?.id));
    const rolesReady=counts.MAIN===1&&counts.A===1&&counts.B===1&&counts.c>=1&&counts.DELVE>=1;
    const statesReady=systems.length>=5&&ids.every(Boolean)&&new Set(ids).size===ids.length&&systems.every(row=>
      list(row?.stateInputs).length>0&&list(row?.stateOutputs).length>0
    );
    if(!rolesReady||!statesReady)reject('DESIGN_MAIN_A_B_c_DELVE_REQUIRED','CORE_LOOP_DESIGN',['signatureSystems'],
      {counts,systemCount:systems.length,statesReady},
      '메인 중심 행동, A/B 서로 다른 두 축, c 보조 변주, @ 발견·숙련을 기존 규칙에 맞춰 최소 5개 고유 시스템과 실제 상태 입력·출력으로 작성한다. 기존 밸런스·저장·진행은 유지한다.');
    // 메인: ID만 달리 붙인 복제 규칙도 실제 MAIN/A/B/c/@ 완성으로 인정하지 않는다.
    for(let i=0;i<systems.length;i++)for(let j=i+1;j<systems.length;j++){
      const left=systems[i],right=systems[j];
      const sameName=clean(left?.name).length>=4&&clean(left?.name)===clean(right?.name);
      const samePurpose=clean(left?.purpose).length>=12&&clean(left?.purpose)===clean(right?.purpose);
      const sameChoice=clean(left?.playerChoice).length>=12&&clean(left?.playerChoice)===clean(right?.playerChoice);
      if(sameName&&(samePurpose||sameChoice))reject('DESIGN_GRAMMAR_ROLE_CONTENT_CLONED','CORE_LOOP_DESIGN',['signatureSystems'],
        {roles:[left?.grammarRole,right?.grammarRole],ids:[left?.id,right?.id]},
        '서로 다른 규칙 ID라는 표식만으로 통과하지 않는다. 원본 실제 플레이의 역할별 선택·상태 변화를 구분해 디자이너가 다시 작성한다.');
    }
    // 보존형 설계에서도 행동 설명은 실제 상태 키가 아니다.
    for(const row of systems)for(const field of ['stateInputs','stateOutputs']){
      if(list(row[field]).some(key=>/→|->|\b(?:INPUT|SELECT|OUTPUT|STATE)\s*:/i.test(clean(key)))){
        const keyPath=`signatureSystems.${row.id}.${field}`;
        const detail='플레이 설명이나 입력→결과 문장 대신 실제로 읽고 변경하는 상태 키를 직접 정의해야 한다';
        reject('DESIGN_STATE_KEY_IS_INSTRUCTION','CORE_LOOP_DESIGN',['signatureSystems'],{path:keyPath,detail},`${keyPath}: ${detail}. 앞에서 확정한 원본 규칙과 현재 소스를 확인해 해당 항목을 다시 작성한다.`);
      }
    }
  }
  const declared=clean(seed.MULTIPLAYER_DESIGN_MODE||seed.INITIAL_PLAY_MODE).toUpperCase();
  if(design.multiplayerMode&&['SINGLE','COOP','COMPETITIVE','HYBRID'].includes(declared)&&!(multiplayerRequired&&declared==='SINGLE')&&design.multiplayerMode!==declared){
    reject('DESIGN_MULTIPLAYER_CONTRADICTION','CATEGORY_IDENTITY',['multiplayerMode','multiplayerExpansionDecision'],{expected:declared,actual:design.multiplayerMode},'오너 입력의 플레이 모드를 보존한다. 인공지능 충원으로 혼자 플레이할 수 있어도 멀티 의도를 SINGLE로 바꾸지 않는다.');
  }
  if(multiplayerRequired&&selected.has('multiplayerMode')&&!['COOP','COMPETITIVE','HYBRID'].includes(design.multiplayerMode)){
    reject('DESIGN_MULTIPLAYER_CONTRADICTION','CATEGORY_IDENTITY',['multiplayerMode','multiplayerExpansionDecision'],{actual:design.multiplayerMode},'모든 게임은 멀티 필수다. 원본의 대표 행동과 저장 의미를 보존하며 디자이너가 COOP/COMPETITIVE/HYBRID 중 실제 함께 플레이할 규칙을 작성한다.');
  }
  const profiles=design.platformProfiles||{};
  if(selected.has('platformProfiles')){
    // 기존 중앙 공간 연출 계약을 설계 게이트에서도 적용한다. 이 기록은 실제 WebGL 실행 PASS가 아니다.
    const spatial=profiles.UNITY?.unityWebSpatialPresentation;
    const dimensions=['2.5D','3D'];
    const fields=['worldDepth','cameraAndOcclusion','lightingAndMaterials','mobileWebglEvidence'];
    const missing=fields.filter(field=>!textReady(spatial?.[field],32));
    if(!dimensions.includes(spatial?.dimension)||missing.length){
      reject('DESIGN_UNITY_WEB_SPATIAL_DEPTH_REQUIRED','PLATFORM_FIT_DESIGN',['platformProfiles'],
        {dimension:spatial?.dimension||'MISSING',missing},
        'Unity WebGL 게임은 최소 2.5D(또는 3D) 실제 공간 그래픽을 설계한다. 세계 깊이·카메라/가림·조명/재질·모바일 브라우저 플레이와 전후 비교 검증을 각각 구체화한다. 평면 2D 카드·스프라이트·태그만으로 통과할 수 없다. 2D HUD는 가능하다.');
    }
  }
  for(const [platform,foreign] of [['UNITY',/(?:OPEN_CLOUD(?:_|\b)|\b(?:Rojo|ScreenGui|RemoteEvent|Roblox DataStore)\b)/i],['ROBLOX',/\b(?:APK|AAB|Unity Input System|UnityEditor)\b/i]]){
    for(const key of ['inputModel','multiplayerRuntime','uiUx','saveAndNetwork','platformContentAdaptation','internalReleaseTarget','validationEvidence']){
      const value=clean(profiles[platform]?.[key]);
      if(foreign.test(value))reject('DESIGN_PLATFORM_NATIVE_CONTRADICTION','PLATFORM_FIT_DESIGN',['platformProfiles'],{platform,key,value},`${platform}의 배포·검증 항목을 해당 플랫폼의 실제 산출물과 실행 증거로 작성한다. 다른 플랫폼 항목을 복사하지 않는다.`);
    }
  }
  const shared=design.platformExpansionPolicy?.sharedLargeFrame;
  const expectedFrame=['CORE_IDENTITY','CORE_FUN_AND_REPRESENTATIVE_LOOP','WORLD_AND_PROGRESSION_DIRECTION','SAVE_PERSISTENCE_MEANING','MULTIPLAYER_INTENT'];
  if(shared&&expectedFrame.some(item=>!shared.includes(item)))reject('DESIGN_SHARED_FRAME_INCOMPLETE','PLATFORM_FIT_DESIGN',['platformExpansionPolicy'],{shared},'공통 정체성·핵심 루프·세계/성장·저장 의미·멀티 의도를 각각 보존한다. 같은 항목을 반복하지 않는다.');
  const alternatives=list(design.designAlternatives);
  const strategicKeys=['coreLoopShift','mapTopologyRegionRoles','enemyEcosystemCounterplay','progressionEconomy'];
  const normalize=value=>clean(value).toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
  for(let i=0;i<alternatives.length;i++)for(let j=i+1;j<alternatives.length;j++){
    const different=strategicKeys.filter(key=>normalize(alternatives[i][key])!==normalize(alternatives[j][key]));
    if(different.length<2)reject('DESIGN_ALTERNATIVES_DUPLICATED','IDEA_AND_DISTINCTNESS',['designAlternatives','selectedDesignPlan'],{plans:[alternatives[i].label,alternatives[j].label],differentAxes:different},'원본 규칙을 보존하면서 루프·동선·대응법·성장 중 최소 두 항목의 실제 플레이 접근이 다른 대안을 작성하고 선택 근거를 갱신한다.');
  }
  const requirements=designPlayabilityRequirements(seed,sourceText);
  // 보존형 표현 설계도 A/B 상태 교환과 MAIN/c/@ 연결을 실제 원본 경로로 설명해야 한다.
  if(selected.has('systemInterconnections')&&!requirements.required){
    const systems=list(design.signatureSystems);
    const byRule=new Map(systems.map(row=>[row.id,row]));
    const graph=new Map(systems.map(row=>[row.id,[]]));
    const edges=list(design.systemInterconnections);
    let connected=edges.length>=5&&systems.length>=5;
    for(const edge of edges){
      const from=byRule.get(edge.fromId),to=byRule.get(edge.toId),keys=list(edge.stateKeys);
      if(!from||!to||!keys.length||keys.some(key=>!list(from.stateOutputs).includes(key)||!list(to.stateInputs).includes(key)))connected=false;
      else graph.get(edge.fromId).push(edge.toId);
    }
    const reaches=(from,to)=>{const queue=[from],seen=new Set();while(queue.length){const id=queue.shift();if(id===to)return true;if(seen.has(id))continue;seen.add(id);queue.push(...(graph.get(id)||[]));}return false;};
    const main=systems.find(row=>row.grammarRole==='MAIN')?.id;
    const a=systems.find(row=>row.grammarRole==='A')?.id;
    const b=systems.find(row=>row.grammarRole==='B')?.id;
    if(!connected||!main||!a||!b||!reaches(a,b)||!reaches(b,a)||systems.some(row=>!reaches(main,row.id)&&!reaches(row.id,main))){
      reject('DESIGN_PRESERVATION_GRAMMAR_GRAPH_DISCONNECTED','SYSTEM_INTERCONNECTION_DESIGN',['systemInterconnections'],
        {edgeCount:edges.length,connected},
        '기존 규칙의 실제 상태 출력과 입력으로 MAIN/A/B/c/@를 연결하고 A/B 양방향 상태 교환을 증명한다. 임시 가짜 기능이나 새 보상을 만들지 않는다.');
    }
  }
  const detailed=requirements.required&&(requirePlayableContract||seed.designInputMode==='OWNER_BRIEF_AND_ORIGINAL_ONLY'||design.designIntegrityPlan?.authoringVersion===2||list(design.signatureSystems).some(row=>row.grammarRole));
  const chosen=design.selectedDesignPlan;
  if(chosen){
    if(alternatives.length&&!alternatives.some(plan=>plan.label===chosen.label))reject('DESIGN_SELECTION_UNGROUNDED','IDEA_AND_DISTINCTNESS',['selectedDesignPlan'],{label:chosen.label},'실제로 작성한 대안 중 하나를 선택하고 선택 이유를 적는다.');
    const steps=list(chosen.playthrough);
    const phases=detailed?requirements.phases:['OPENING','DEVELOPMENT','RESOLUTION'];
    const valid=phases.every((phase,index)=>steps[index]?.phase===phase)&&steps.length===phases.length&&steps.every(step=>objectReady(step,['entryState','playerChoice','actionAndResponse','exitState','nextDecision'],12));
    if(!valid||!textReady(chosen.durationRationale,30))reject('DESIGN_PLAYTHROUGH_MISSING','CORE_LOOP_DESIGN',['selectedDesignPlan'],{phases:steps.map(step=>step.phase)},'시작·전개·결말 각각의 진입 상태, 선택, 입력/판정/대응, 결과 상태, 다음 선택을 작성하고 한 판과 전체 세션 길이의 근거를 구분한다. 기존 시간·밸런스 수치는 임의 변경하지 않는다.');
    if(valid){
      const broken=steps.slice(1).map((step,index)=>({phase:step.phase,previous:steps[index].exitState,current:step.entryState})).filter(row=>normalize(row.previous)!==normalize(row.current));
      if(broken.length)reject('DESIGN_PLAYTHROUGH_DISCONNECTED','CORE_LOOP_DESIGN',['selectedDesignPlan'],{broken},'앞 단계 exitState를 다음 단계 entryState로 그대로 이어 같은 한 판의 상태 전이를 증명한다.');
    }
  }
  for(const [root,rows] of [['contentVarietyPlan',[...list(design.contentVarietyPlan?.regions),...list(design.contentVarietyPlan?.enemiesOrChallenges)]],['failureRetryRisk',[design.failureRetryRisk]]]){
    for(const row of rows){
      const values=Object.values(row||{}).filter(value=>typeof value==='string'&&clean(value).length>=20).map(normalize);
      if(values.some(value=>values.filter(other=>other===value).length>=3))reject('DESIGN_REPEATED_CONTENT','CONTENT_EXPANSION_PLAN',[root],{name:row?.name||root},'서로 다른 항목을 같은 설명으로 채우지 않는다. 동선·전조·대응·위험·보상·복구가 각각 어떤 규칙인지 작성한다.');
    }
  }
  if(detailed){
    const invalid=(code,fields,path,detail)=>reject(code,'CORE_LOOP_DESIGN',fields,{path,detail},`${path}: ${detail}. 앞에서 확정한 원본 규칙과 현재 소스를 확인해 해당 항목을 다시 작성한다. 문장 바꾸기나 검사 결과 선언으로 대신하지 않는다.`);
    const systems=list(design.signatureSystems),byRule=new Map(systems.map(row=>[row.id,row]));
    const states=new Set(systems.flatMap(row=>[...list(row.stateInputs),...list(row.stateOutputs)]));
    const refsValid=refs=>Array.isArray(refs)&&refs.length>0&&refs.every(id=>byRule.has(id));
    const finite=value=>typeof value==='number'&&Number.isFinite(value);
    const nonnegative=value=>finite(value)&&value>=0;
    const distinctIds=rows=>rows.every(row=>textReady(row.id,1))&&new Set(rows.map(row=>row.id)).size===rows.length;
    if(selected.has('signatureSystems')){
      if(!distinctIds(systems)||systems.some(row=>!list(row.stateInputs).length||!list(row.stateOutputs).length))invalid('DESIGN_RULE_STATE_MISSING',['signatureSystems'],'signatureSystems','중복 없는 규칙 ID와 읽는 상태·바꾸는 상태가 필요하다');
    }
    if(selected.has('systemInterconnections')){
      const edges=list(design.systemInterconnections),graph=new Map(systems.map(row=>[row.id,[]]));
      for(const edge of edges){
        const from=byRule.get(edge.fromId),to=byRule.get(edge.toId);
        if(!from||!to||!list(edge.stateKeys).length||edge.stateKeys.some(key=>!list(from.stateOutputs).includes(key)||!list(to.stateInputs).includes(key)))invalid('DESIGN_STATE_EXCHANGE_BROKEN',['systemInterconnections'],'systemInterconnections',`${edge.fromId}→${edge.toId}의 출력과 입력 상태가 연결되지 않는다`);
        else graph.get(edge.fromId).push(edge.toId);
      }
      const reaches=(from,to)=>{const queue=[from],seen=new Set();while(queue.length){const id=queue.shift();if(id===to)return true;if(seen.has(id))continue;seen.add(id);queue.push(...(graph.get(id)||[]));}return false;};
      const main=systems.find(row=>row.grammarRole==='MAIN')?.id,a=systems.find(row=>row.grammarRole==='A')?.id,b=systems.find(row=>row.grammarRole==='B')?.id;
      if(!main||!a||!b||!reaches(a,b)||!reaches(b,a)||systems.some(row=>!reaches(main,row.id)&&!reaches(row.id,main)))invalid('DESIGN_RULE_GRAPH_DISCONNECTED',['systemInterconnections'],'systemInterconnections','중심 행동·두 축·보조·파고들기가 실제 상태 교환으로 이어져야 한다');
    }
    const variety=design.contentVarietyPlan||{},abilities=list(variety.abilities),byAbility=new Map(abilities.map(row=>[row.id,row]));
    const regions=list(variety.regions),regionIds=new Set(regions.map(row=>row.id));
    if(selected.has('contentVarietyPlan')){
      if(abilities.length<2||!distinctIds(abilities))invalid('DESIGN_ABILITY_CONTRACT_MISSING',['contentVarietyPlan'],'contentVarietyPlan.abilities','능력별 중복 없는 식별자와 상세 계약이 필요하다');
      for(const ability of abilities){
        const numeric=['range','cost','cooldownSeconds'].every(key=>nonnegative(ability[key]));
        if(!numeric||!objectReady(ability,['trigger','telegraph','avoidance','effect','source'],12)||!textReady(ability.rangeUnit,1)||!textReady(ability.resource,1)||!byRule.has(ability.ruleId)||!list(ability.stateInputs).length||!list(ability.stateOutputs).length||[...list(ability.stateInputs),...list(ability.stateOutputs)].some(key=>!states.has(key)))invalid('DESIGN_ABILITY_CONTRACT_MISSING',['contentVarietyPlan'],`abilities.${ability.id}`,'조건·범위/단위·소모·재사용·전조·회피·효과·원본 근거와 상태 연결이 필요하다');
        for(const [valueKey,referenceKey] of [['range','rangeKey'],['cost','costKey'],['cooldownSeconds','cooldownKey']]){
          const key=ability[referenceKey];
          if(key&&Object.hasOwn(requirements.lockedNumbers,key)&&ability[valueKey]!==requirements.lockedNumbers[key])invalid('DESIGN_ORIGINAL_NUMBER_CHANGED',['contentVarietyPlan'],`abilities.${ability.id}.${valueKey}`,`원본 ${key}=${requirements.lockedNumbers[key]}을 유지해야 한다`);
        }
        if(requirements.infection&&['INFECTION','PURIFICATION'].includes(ability.kind)){
          const keys=ability.kind==='INFECTION'?{rangeKey:'InfectRange',costKey:'InfectAttackCost',cooldownKey:'InfectAttackCooldown'}:{rangeKey:'PurifyDistance',cooldownKey:'PurifyCooldown'};
          if(Object.entries(keys).some(([field,key])=>Object.hasOwn(requirements.lockedNumbers,key)&&ability[field]!==key))invalid('DESIGN_ORIGINAL_RULE_UNBOUND',['contentVarietyPlan'],`abilities.${ability.id}`,'기본 감염·정화 수치를 원본 키에 직접 연결해야 한다');
        }
      }
      if(requirements.infection&&['INFECTION','PURIFICATION'].some(kind=>abilities.filter(row=>row.kind===kind).length!==1))invalid('DESIGN_INFECTION_RULE_MISSING',['contentVarietyPlan'],'abilities','기본 감염과 기본 정화를 각각 하나의 원본 규칙으로 정의해야 한다');
      for(const fact of requirements.abilityFacts){
        const ability=byAbility.get(fact.id);
        if(!ability||['kind','ownerId','range','cost','cooldownSeconds',...(fact.name?['name']:[])].some(key=>fact[key]!==undefined&&ability[key]!==fact[key]))invalid('DESIGN_SOURCE_ABILITY_CHANGED',['contentVarietyPlan'],`abilities.${fact.id}`,`현재 원본 설정 ${JSON.stringify(fact)}을 정확히 보존해야 한다`);
      }
      const transitions=list(variety.roleTransitions);
      for(const human of requirements.humanRoster){
        const rows=transitions.filter(row=>row.humanId===human.id),row=rows[0],before=byAbility.get(row?.humanAbilityId),after=byAbility.get(row?.infectedAbilityId);
        if(rows.length!==1||before?.ownerId!==human.id||before?.kind!=='HUMAN'||after?.ownerId!==human.id||after?.kind!=='INFECTED'||clean(after?.name)!==clean(human.infectedAbility)||clean(row?.humanTool)!==clean(human.tool)||!objectReady(row,['retainedState','removedState','changedChoice'],12))invalid('DESIGN_ROLE_TRANSITION_MISSING',['contentVarietyPlan'],`roleTransitions.${human.id}`,'원본 직업·도구→인간 능력→감염 능력과 유지/제거 상태·전략 변화가 모두 필요하다');
      }
      for(const monster of requirements.monsterRoster)if(!abilities.some(row=>row.kind==='MONSTER'&&row.ownerId===monster.id))invalid('DESIGN_MONSTER_ABILITY_MISSING',['contentVarietyPlan'],`abilities.${monster.id}`,'원본 몬스터의 능력과 대응법이 누락됐다');
      if(regions.length<2||!distinctIds(regions)||regions.some(row=>!refsValid(row.ruleIds)))invalid('DESIGN_MAP_RULE_UNBOUND',['contentVarietyPlan'],'regions','각 구역의 중복 없는 ID와 핵심 규칙 연결이 필요하다');
    }
    if(selected.has('designAlternatives')){
      const fingerprints=[];
      for(const plan of alternatives){
        const strategy=plan.strategy||{},routes=list(strategy.routeEdges),resources=list(strategy.resourceSites),cooperation=list(strategy.cooperation);
        if(!routes.length||!resources.length||!cooperation.length||!objectReady(strategy,['advantage','cost','bestSituation'],12)||routes.some(row=>!regionIds.has(row.from)||!regionIds.has(row.to)||row.from===row.to)||resources.some(row=>!regionIds.has(row.regionId)||!states.has(row.stateKey))||cooperation.some(row=>!regionIds.has(row.regionId)||!byRule.has(row.ruleId)||!byAbility.has(row.abilityId)))invalid('DESIGN_STRATEGY_UNGROUNDED',['designAlternatives'],`designAlternatives.${plan.label}`,'같은 구역·자원·규칙·능력 ID로 동선/자원 배치/협력을 비교하고 유리한 상황과 대가를 명시해야 한다');
        // 설명 문장은 비교하지 않는다. 같은 ID들의 실제 관계가 달라야 한다.
        fingerprints.push([routes.map(row=>[row.from,row.to].join('>')),resources.map(row=>[row.stateKey,row.regionId].join('@')),cooperation.map(row=>[row.ruleId,row.regionId,row.abilityId].join('@'))].map(rows=>JSON.stringify([...new Set(rows)].sort())));
      }
      for(let i=0;i<fingerprints.length;i++)for(let j=i+1;j<fingerprints.length;j++)if(fingerprints[i].filter((value,index)=>value!==fingerprints[j][index]).length<2)invalid('DESIGN_STRATEGY_EQUIVALENT',['designAlternatives','selectedDesignPlan'],'designAlternatives','설명만 다른 안은 인정하지 않는다. 동선·자원 배치·협력 중 둘 이상의 관계가 달라야 한다');
    }
    if(selected.has('selectedDesignPlan')){
      const steps=list(chosen?.playthrough),lastCast=new Map();
      const participants=list(chosen?.participants),actors=new Map(participants.map(row=>[row.id,{...row,infected:false}]));
      if(requirements.infection&&(participants.length!==requirements.lockedNumbers.TargetPopulation||!distinctIds(participants)||participants.some(row=>!['HUMAN','MONSTER'].includes(row.role))||participants.filter(row=>row.role==='HUMAN').length!==requirements.lockedNumbers.SurvivorSlots||participants.filter(row=>row.role==='MONSTER').length!==requirements.lockedNumbers.MonsterSlots))invalid('DESIGN_PARTICIPANTS_INVALID',['selectedDesignPlan'],'selectedDesignPlan.participants','원본 인원 수와 진영을 가진 서로 다른 참가자에서 한 판을 시작해야 한다');
      const snapshot=values=>Object.fromEntries(list(values).map(row=>[row.key,row.value]));
      const same=(a,b)=>Object.keys(a).length===Object.keys(b).length&&Object.entries(a).every(([key,value])=>b[key]===value);
      let previous=null,previousEnd=0,lastActionTime=-1;
      if(requirements.infection&&requirements.humanRoster.length&&!steps.some(step=>list(step.actions).some(action=>byAbility.get(action.abilityId)?.kind==='INFECTED')))invalid('DESIGN_INFECTED_PLAY_MISSING',['selectedDesignPlan'],'playthrough','감염된 인간이 자기 직업의 감염 후 능력으로 옛 동료를 추격하는 실제 사건이 필요하다');
      const lockedRound=requirements.lockedNumbers.RoundSeconds;
      if(!chosen||!nonnegative(chosen.roundSeconds)||chosen.roundSeconds<=0||!nonnegative(chosen.sessionSeconds)||chosen.sessionSeconds<chosen.roundSeconds||(finite(lockedRound)&&chosen.roundSeconds!==lockedRound))invalid('DESIGN_DURATION_UNGROUNDED',['selectedDesignPlan'],'selectedDesignPlan','원본 라운드 시간과 전체 세션 시간을 구분하고 플레이 시간 근거를 보존해야 한다');
      for(const [index,step] of steps.entries()){
        const before=snapshot(step.before),after=snapshot(step.after),actions=list(step.actions);
        if(!refsValid(step.ruleIds)||!list(step.before).length||!list(step.after).length||Object.keys(before).length!==list(step.before).length||Object.keys(after).length!==list(step.after).length||Object.keys(before).length!==Object.keys(after).length||Object.entries({...before,...after}).some(([key,value])=>!states.has(key)||!finite(value))||Object.keys(before).some(key=>!Object.hasOwn(after,key))||(previous&&!same(previous,before)))invalid('DESIGN_STATE_TRACE_BROKEN',['selectedDesignPlan'],`playthrough.${step.phase}`,'같은 상태 키의 실제 수치가 전후 장면에서 이어져야 한다');
        if(!nonnegative(step.startSeconds)||!nonnegative(step.endSeconds)||step.startSeconds!==previousEnd||step.endSeconds<=step.startSeconds||step.endSeconds>chosen?.roundSeconds||!textReady(step.timeReason,12))invalid('DESIGN_SCENE_TIME_INVALID',['selectedDesignPlan'],`playthrough.${step.phase}`,'각 장면의 행동 시간 근거와 연속된 시작/종료 시간이 필요하다');
        let infected=0,purified=0;
        for(const action of actions){
          const ability=byAbility.get(action.abilityId),castKey=`${action.actorId}:${action.abilityId}`,prior=lastCast.get(castKey);
          if(!ability||!textReady(action.actorId,1)||!textReady(action.response,12)||typeof action.hit!=='boolean'||!nonnegative(action.atSeconds)||action.atSeconds<lastActionTime||action.atSeconds<step.startSeconds||action.atSeconds>step.endSeconds||!nonnegative(action.distance)||!nonnegative(action.energyBefore)||!nonnegative(action.energyAfter)||action.energyBefore<ability.cost||Math.abs(action.energyBefore-ability.cost-action.energyAfter)>0.000001||(action.hit&&ability.range>0&&action.distance>ability.range)||(prior!==undefined&&action.atSeconds-prior<ability.cooldownSeconds))invalid('DESIGN_ACTION_INFEASIBLE',['selectedDesignPlan'],`playthrough.${step.phase}.${action.abilityId}`,'존재하는 능력을 조건·범위·자원·재사용 시간 안에서 사용하고 실제 대응을 설명해야 한다');
          lastActionTime=action.atSeconds;
          if(requirements.infection){
            const actor=actors.get(action.actorId),target=actors.get(action.targetId),kind=ability?.kind;
            const expectedRole=['INFECTION','INFECTED','MONSTER'].includes(kind)?'MONSTER':['PURIFICATION','HUMAN'].includes(kind)?'HUMAN':null;
            const validActor=actor&&actor.role!=='ELIMINATED'&&(!expectedRole||actor.role===expectedRole)&&(!['HUMAN','INFECTED','MONSTER'].includes(kind)||actor.classId===ability.ownerId)&&(kind!=='INFECTED'||actor.infected);
            const validTarget=kind==='INFECTION'?target?.role==='HUMAN':kind==='PURIFICATION'?target?.role==='MONSTER':true;
            if(!validActor||(action.hit&&!validTarget))invalid('DESIGN_ROLE_ACTION_INVALID',['selectedDesignPlan'],`playthrough.${step.phase}.${action.actorId}`,'전환·탈락 이후 현재 진영/직업의 능력만 사용하고 살아 있는 상대를 대상으로 해야 한다');
            if(action.hit&&validActor&&validTarget&&kind==='INFECTION'){target.role='MONSTER';target.infected=true;}
            if(action.hit&&validActor&&validTarget&&kind==='PURIFICATION')target.role='ELIMINATED';
          }
          lastCast.set(castKey,action.atSeconds);
          if(action.hit&&ability?.kind==='INFECTION')infected++;
          if(action.hit&&ability?.kind==='PURIFICATION')purified++;
        }
        if(requirements.infection){
          const keys=['HumanCount','MonsterCount','EliminatedCount'];
          if(keys.some(key=>!Number.isInteger(before[key])||before[key]<0||!Number.isInteger(after[key])||after[key]<0)||after.HumanCount!==before.HumanCount-infected||after.MonsterCount!==before.MonsterCount+infected-purified||after.EliminatedCount!==before.EliminatedCount+purified)invalid('DESIGN_INFECTION_STATE_INVALID',['selectedDesignPlan'],`playthrough.${step.phase}`,'감염은 인간 -1/몬스터 +1, 정화는 몬스터 -1/탈락 +1이며 인원이 음수가 될 수 없다');
          for(const [key,role] of [['HumanCount','HUMAN'],['MonsterCount','MONSTER'],['EliminatedCount','ELIMINATED']])if(after[key]!==[...actors.values()].filter(row=>row.role===role).length)invalid('DESIGN_PARTICIPANT_COUNT_MISMATCH',['selectedDesignPlan'],`playthrough.${step.phase}.${key}`,'사건을 재생한 개별 참가자의 실제 진영과 인원 수가 일치해야 한다');
          if(index===0&&(before.HumanCount!==requirements.lockedNumbers.SurvivorSlots||before.MonsterCount!==requirements.lockedNumbers.MonsterSlots||before.EliminatedCount!==0))invalid('DESIGN_INFECTION_START_INVALID',['selectedDesignPlan'],'playthrough.START','원본 인원 배정에서 시작해야 한다');
          if((index<2&&infected>0)||(step.phase==='FIRST_INFECTION'&&infected!==1)||(step.phase==='IMBALANCE'&&after.HumanCount>=after.MonsterCount)||(step.phase==='COMEBACK'&&purified<1))invalid('DESIGN_INFECTION_BEAT_MISSING',['selectedDesignPlan'],`playthrough.${step.phase}`,'첫 접촉→첫 감염→인원 불균형→정화를 통한 역전 기회를 실제 사건으로 증명해야 한다');
          const expected=after.HumanCount===0?'MONSTER_WIN':after.MonsterCount===0?'HUMAN_WIN':step.endSeconds===chosen?.roundSeconds?'DRAW':'ONGOING';
          if(step.outcome!==expected||(index<steps.length-1&&expected!=='ONGOING')||(index===steps.length-1&&expected==='ONGOING'))invalid('DESIGN_ROUND_END_INVALID',['selectedDesignPlan'],`playthrough.${step.phase}`,'한 진영 0명 즉시 종료 또는 원본 제한시간의 무승부까지 같은 한 판을 완주해야 한다');
        }
        previous=after;previousEnd=step.endSeconds;
      }
    }
    if(selected.has('artAudioDirection')){
      const bindings=list(design.artAudioDirection?.assetBindings),assets=list(assetLibrary?.assets),byAsset=new Map(assets.map(row=>[row.id,row]));
      for(const family of assetFamilies)if(!bindings.some(row=>clean(row.family).toUpperCase()===family))invalid('DESIGN_ASSET_FAMILY_MISSING',['artAudioDirection'],`assetBindings.${family}`,'현재 설계가 요구하는 자산 분류의 역할과 적합성 검토가 누락됐다');
      if(!bindings.length)invalid('DESIGN_ASSET_FIT_MISSING',['artAudioDirection'],'artAudioDirection.assetBindings','자산별 역할과 적합성 근거가 필요하다');
      for(const binding of bindings){
        if(!refsValid(binding.ruleIds)||!objectReady(binding,['role','bodyPlan','behavior','presentation','useLocation','selectionReason','improvement','platformAdaptation','validation'],8)||binding.decision==='UNRESOLVED')invalid('DESIGN_ASSET_FIT_MISSING',['artAudioDirection'],`assetBindings.${binding.assetId||binding.role}`,'필요 체형·행동·연출·사용 위치·선정 이유·개선점과 규칙 연결을 확정해야 한다');
        if(['USE','ADAPT'].includes(binding.decision)&&assetLibrary){
          const asset=byAsset.get(binding.assetId),normalizeRole=value=>clean(value).toLowerCase().replace(/[\s-]+/g,'_');
          const roles=[asset?.role,asset?.subfamily,...list(asset?.tags)].map(normalizeRole);
          if(!asset||clean(asset.family||asset.category).toUpperCase()!==clean(binding.family).toUpperCase()||!roles.includes(normalizeRole(binding.role))||asset.securityBlocked===true||asset.rightsPass===false||asset.catalogActive===false)invalid('DESIGN_ASSET_ROLE_MISMATCH',['artAudioDirection'],`assetBindings.${binding.assetId}`,'현재 내부 목록의 실제 역할·분류·사용 자격과 일치하는 후보를 선택해야 한다');
        }
        if(binding.decision==='AUTHOR'&&binding.assetId)invalid('DESIGN_ASSET_DECISION_INVALID',['artAudioDirection'],`assetBindings.${binding.assetId}`,'새 제작 요구를 기존 자산 사용으로 표시할 수 없다');
        if(binding.decision==='AUTHOR'&&assetLibrary){
          const role=clean(binding.role).toLowerCase().replace(/[\s-]+/g,'_');
          const reusable=assets.filter(asset=>clean(asset.family||asset.category).toUpperCase()===clean(binding.family).toUpperCase()&&[asset.role,asset.subfamily,...list(asset.tags)].map(value=>clean(value).toLowerCase().replace(/[\s-]+/g,'_')).includes(role)&&asset.securityBlocked!==true&&asset.rightsPass!==false&&asset.catalogActive!==false);
          if(reusable.length)invalid('DESIGN_ASSET_REUSE_NOT_EVALUATED',['artAudioDirection'],`assetBindings.${binding.role}`,`같은 역할의 기존 후보 ${reusable.map(asset=>asset.id).join(',')}를 재사용/개선 검토해야 한다`);
        }
      }
    }
    if(selected.has('designIntegrityPlan')){
      const audit=list(design.designIntegrityPlan?.flowAudit);
      if(design.designIntegrityPlan?.authoringVersion!==2||audit.length!==requirements.phases.length||audit.some((row,index)=>row.phase!==requirements.phases[index]||row.nextPhase!==(requirements.phases[index+1]||'END')||!list(row.reachableBy).length||row.reachableBy.some(id=>!byAbility.has(id))||!objectReady(row,['blockedCase','recovery'],12)))invalid('DESIGN_FULL_FLOW_AUDIT_MISSING',['designIntegrityPlan'],'designIntegrityPlan.flowAudit','각 장면의 실행 가능한 능력·막힘 사례·복구·다음 장면을 순서대로 재검사해야 한다');
      for(const [key,value] of Object.entries(design.designIntegrityPlan||{}))if(typeof value==='boolean'&&value===false)invalid('DESIGN_REACHABILITY_BLOCKED',['designIntegrityPlan'],`designIntegrityPlan.${key}`,'진행 불가능한 항목을 후속 설계의 통과 근거로 넘길 수 없다');
    }
  }
  return reasons;
}

export function scoreDesignGateV2({seed={},designRecord={},cycleStatus={},robloxGenreProfile={},multiplayerRequired=false,requirePlayableContract=false,assetLibrary=null,sourceText='',assetFamilies=[]}={}){
  const design=designRecord?.content&&typeof designRecord.content==='object'?designRecord.content:{};
  const loops=distinct(list(design.coreLoop).map(clean));
  const signatureSystems=list(design.signatureSystems).filter(row=>row&&typeof row==='object');
  const materials=distinct(list(seed.SEED_MATERIAL_IDS));
  const generation=clean(seed.generation).toUpperCase();
  const materialComposed=generation.includes('MATERIAL')||generation.includes('COMPOSED');
  const materialContractOk=!materialComposed||(materials.length>=2&&materials.length<=4);
  const revalidated=revisionProven(designRecord,cycleStatus);
  const platform=clean(seed.INITIAL_TARGET_PLATFORM).toUpperCase();
  const platformKnown=['ROBLOX','UNITY'].includes(platform);
  const playMode=clean(design.multiplayerMode||seed.MULTIPLAYER_DESIGN_MODE).toUpperCase();
  const playModeKnown=['SINGLE','COOP','COMPETITIVE','HYBRID'].includes(playMode);
  const seedGrammar=Number(seed?.GAMEPLAY_SKETCH?.version||0)>=4&&seed?.GAMEPLAY_SKETCH?.novelGameGrammar&&typeof seed.GAMEPLAY_SKETCH.novelGameGrammar==='object'?seed.GAMEPLAY_SKETCH.novelGameGrammar:null;
  const designText=JSON.stringify(design);
  const grammarIds=distinct(list(seedGrammar?.causalDNAs).map(row=>clean(row?.id)));
  const carriedGrammarIds=grammarIds.filter(id=>id&&designText.includes(id));
  const grammarIdMinimum=seedGrammar?Math.min(2,grammarIds.length):0;
  const primaryVerb=clean(seedGrammar?.newPrimaryVerb);
  const worldRule=clean(seedGrammar?.worldRule);
  const primaryVerbCarried=!seedGrammar||!primaryVerb||designText.includes(primaryVerb);
  const worldRuleCarried=!seedGrammar||!worldRule||designText.includes(worldRule);
  const fusion=seedGrammar?.gameplaySystemFusion||{};
  const mainName=clean(fusion?.main?.name);
  const majorAxisNames=list(fusion?.majorAxes).map(row=>clean(row?.name)).filter(Boolean);
  const subElementNames=list(fusion?.subElements).map(row=>clean(row?.name)).filter(Boolean);
  const delveNames=list(seedGrammar?.delveLayer?.elements).map(row=>clean(row?.name)).filter(Boolean);
  const emergentGenreName=clean(seedGrammar?.emergentGenre?.name);
  const mainCarried=!seedGrammar||!mainName||designText.includes(mainName);
  const carriedMajorAxes=majorAxisNames.filter(name=>designText.includes(name));
  const carriedSubElements=subElementNames.filter(name=>designText.includes(name));
  const carriedDelveElements=delveNames.filter(name=>designText.includes(name));
  const emergentGenreCarried=!seedGrammar||!emergentGenreName||designText.includes(emergentGenreName);
  const creative=design.creativeGrammar||{};
  const seedV5=Number(seed?.GAMEPLAY_SKETCH?.version||0)>=5;
  const seedC=seedGrammar?.gameplaySystemFusion?.themeFusion?.themes||[];
  const creativityCarried=!seedV5||(
    textReady(creative.mainIdentity,15)
    &&[0,1].every((index)=>{const key=index?'b':'a',axis=creative[key]||{},seedAxis=list(fusion.majorAxes)[index]||{};
      return textReady(axis.system,2)&&textReady(axis.material,2)&&textReady(axis.stateChange,20)
        &&clean(axis.material).includes(clean(seedAxis.sourceMaterial));})
    &&list(creative.cThemes).length===2&&list(creative.cThemes).some(row=>row?.kind==='GENRE')
    &&seedC.every(row=>list(creative.cThemes).some(c=>clean(c?.name)===clean(row?.name)&&clean(c?.kind)===clean(row?.kind)))
    &&textReady(creative.abCausality,35)&&textReady(creative.cWorldAndGameplayEffect,30)
    &&list(creative.delveDiscoveries).length>=4&&textReady(creative.delveGrowthRule,25));
  const systemFusionCarryOk=!seedGrammar||(mainCarried&&carriedMajorAxes.length>=Math.min(2,majorAxisNames.length)&&carriedSubElements.length>=Math.min(1,subElementNames.length)&&carriedDelveElements.length>=Math.min(1,delveNames.length)&&emergentGenreCarried&&creativityCarried);
  const grammarCarryOk=!seedGrammar||(carriedGrammarIds.length>=grammarIdMinimum&&(primaryVerbCarried||worldRuleCarried)&&systemFusionCarryOk);

  const ideaBasic=textReady(design.identity,60)&&textReady(design.playerFantasy,40)&&textReady(design.coreFun,40)&&materialContractOk;
  const ideaConnected=ideaBasic&&loops.length>=3&&signatureSystems.length>=2&&grammarCarryOk;
  const categoryBasic=textReady(seed.GAME_CATEGORY,3)&&clean(robloxGenreProfile?.genre).length>0;
  const categoryConnected=categoryBasic&&clean(robloxGenreProfile?.genre)!=='Utility & other'&&playModeKnown;
  const coreBasic=loops.length>=3;
  const coreConnected=coreBasic&&signatureSystems.length>=2&&signatureSystems.every(row=>textReady(row?.name,2)&&textReady(row?.purpose,20)&&textReady(row?.playerChoice,20));
  const systemsBasic=list(design.systemInterconnections).length>0;
  const systemsConnected=objectListReady(design.systemInterconnections,['fromSystem','toSystem','trigger','stateChange'],3,8);
  const progressionBasic=Boolean(design.progressionEconomyBalance)&&textReady(design.progressionDirection,24);
  const progressionConnected=progressionBasic&&objectReady(design.progressionEconomyBalance,['progressionLoop','resourceFlow','balanceRules'],20);
  const expansionBasic=list(design.contentExpansionPlan).length>0;
  const expansionConnected=objectListReady(design.contentExpansionPlan,['milestone','newGameplay','systemImpact'],3,12);
  const failureBasic=Boolean(design.failureRetryRisk);
  const failureConnected=failureBasic&&Array.isArray(design.failureRetryRisk?.failureStates)&&distinct(design.failureRetryRisk.failureStates).length>=2&&textReady(design.failureRetryRisk?.retryFlow,20)&&textReady(design.failureRetryRisk?.riskPressure,20)&&textReady(design.failureRetryRisk?.recoveryRules,20);
  const platformProfileFields=['inputModel','sessionModel','multiplayerRuntime','performanceBudget','uiUx','saveAndNetwork','platformContentAdaptation','internalReleaseTarget','validationEvidence'];
  const robloxProfile=design?.platformProfiles?.ROBLOX||{};
  const unityProfile=design?.platformProfiles?.UNITY||{};
  const robloxProfileReady=clean(robloxProfile.platform).toUpperCase()==='ROBLOX'&&objectReady(robloxProfile,platformProfileFields,16);
  const unityProfileReady=clean(unityProfile.platform).toUpperCase()==='UNITY'&&objectReady(unityProfile,platformProfileFields,16);
  const profilesDistinct=robloxProfileReady&&unityProfileReady&&(
    clean(robloxProfile.inputModel)!==clean(unityProfile.inputModel)||
    clean(robloxProfile.sessionModel)!==clean(unityProfile.sessionModel)||
    clean(robloxProfile.performanceBudget)!==clean(unityProfile.performanceBudget)||
    clean(robloxProfile.platformContentAdaptation)!==clean(unityProfile.platformContentAdaptation)
  );
  const platformBasic=platformKnown&&Boolean(design.platformFitPlan)&&Boolean(design.platformProfiles)&&textReady(design.mobileUx,20)&&robloxProfileReady&&unityProfileReady;
  const platformConnected=platformBasic&&profilesDistinct&&clean(design.platformFitPlan?.targetPlatform).toUpperCase()===platform&&textReady(design.platformFitPlan?.targetPlatform,3)&&objectReady(design.platformFitPlan,['inputModel','performanceBudget','sessionConstraints'],16);
  const uxBasic=Boolean(design.uxAccessibilityPlan)&&textReady(design.mobileUx,20);
  const uxConnected=uxBasic&&objectReady(design.uxAccessibilityPlan,['hudPriorities','touchAndInput','readability','accessibility'],16);
  const artBasic=Boolean(design.artAudioDirection)&&textReady(design.visualDirection,20);
  const artConnected=artBasic&&objectReady(design.artAudioDirection,['visualIdentity','audioIdentity','gameplayFeedbackSync'],16);
  const traceBasic=list(design.implementationTraceability).length>0;
  const traceConnected=objectListReady(design.implementationTraceability,['designElement','responsibleSystem','validationEvidence'],3,10)&&distinct(list(design.technicalAssumptions)).length>=2&&distinct(list(design.validationQuestions)).length>=2;

  const evidenceLevels={
    IDEA_AND_DISTINCTNESS:level(ideaBasic,ideaConnected,revalidated&&textReady(design.identity,100)),
    CATEGORY_IDENTITY:level(categoryBasic,categoryConnected,revalidated),
    CORE_LOOP_DESIGN:level(coreBasic,coreConnected,revalidated&&loops.length>=4),
    SYSTEM_INTERCONNECTION_DESIGN:level(systemsBasic,systemsConnected,revalidated&&list(design.systemInterconnections).length>=4),
    PROGRESSION_ECONOMY_BALANCE_DESIGN:level(progressionBasic,progressionConnected,revalidated),
    CONTENT_EXPANSION_PLAN:level(expansionBasic,expansionConnected,revalidated&&list(design.contentExpansionPlan).length>=4),
    FAILURE_RETRY_RISK_DESIGN:level(failureBasic,failureConnected,revalidated),
    PLATFORM_FIT_DESIGN:level(platformBasic,platformConnected,revalidated),
    UX_AND_ACCESSIBILITY_PLAN:level(uxBasic,uxConnected,revalidated),
    ART_AUDIO_DIRECTION:level(artBasic,artConnected,revalidated),
    IMPLEMENTATION_FEASIBILITY_AND_TRACEABILITY:level(traceBasic,traceConnected,revalidated&&list(design.implementationTraceability).length>=4),
  };
  const scores=Object.fromEntries(Object.entries(DESIGN_GATE_WEIGHTS).map(([axis,weight])=>[axis,weighted(evidenceLevels[axis],weight)]));
  const totalScore=Math.round(Object.values(scores).reduce((sum,value)=>sum+Number(value||0),0)*100)/100;
  const criticalAxisFailures=Object.keys(DESIGN_GATE_WEIGHTS).filter(axis=>Number(evidenceLevels[axis]||0)<DESIGN_CRITICAL_AXIS_MINIMUM_PERCENT);
  const rejectionReasons=validateDesignAuthoringContent({design,seed,multiplayerRequired,requirePlayableContract,assetLibrary,sourceText,assetFamilies});
  const hardFailures=rejectionReasons.map(reason=>reason.code);
  const ownerPreservationSeed=seed?.REUSE_EXISTING_GAMEPLAY_IMPLEMENTATION===true&&clean(seed?.OWNER_REBUILD_MODE).toUpperCase()==='PRESERVATION_PRESENTATION_UPGRADE';
  if(ownerPreservationSeed){
    const preservation=design?.preservationContract;
    const requiredLocked=['WORLD_AND_REGIONS','STORY_AND_QUESTS','COMBAT_RULES','CRAFTING_RECIPES_AND_COSTS','SAVE_KEY_AND_SCHEMA_MEANING','PROGRESSION','BALANCE_VALUES','DROPS_AND_REWARDS','HIT_AND_COOLDOWN_SEMANTICS','MULTIPLAYER_MODE'];
    const requiredPasses=['ASSET_ADAPTATION','LIVING_MOTION','ANIMATION_FEEL','VFX','AUDIO_FEEL','CAMERA_LANGUAGE','POLISH_MOBILE'];
    const locked=new Set(list(preservation?.lockedSemantics));
    const passes=new Set(list(preservation?.presentationPasses));
    const preservationReady=preservation?.mode==='PRESERVATION_PRESENTATION_UPGRADE'
      &&preservation?.sourceOfTruth==='EXISTING_IMPLEMENTATION_AND_OWNER_SEED'
      &&preservation?.gameplayRule==='NO_GAMEPLAY_MECHANIC_ADDITION_REMOVAL_OR_REBALANCE'
      &&Number(preservation?.targetSessionMinutes)===Number(seed?.TARGET_SESSION_MINUTES||30)
      &&requiredLocked.every(value=>locked.has(value))
      &&requiredPasses.length===passes.size&&requiredPasses.every(value=>passes.has(value))
      &&(multiplayerRequired&&clean(seed?.MULTIPLAYER_DESIGN_MODE).toUpperCase()==='SINGLE'
        ?['COOP','COMPETITIVE','HYBRID'].includes(playMode)
        :playMode===clean(seed?.MULTIPLAYER_DESIGN_MODE).toUpperCase());
    if(!preservationReady){
      hardFailures.push('OWNER_PRESERVATION_CONTRACT_MISSING');
      rejectionReasons.push(rejectionReason({code:'OWNER_PRESERVATION_CONTRACT_MISSING',axis:'IMPLEMENTATION_FEASIBILITY_AND_TRACEABILITY',evidenceLevel:0,minimumRequired:100,evidence:{ownerRebuildMode:clean(seed?.OWNER_REBUILD_MODE),reuseExistingGameplay:seed?.REUSE_EXISTING_GAMEPLAY_IMPLEMENTATION===true},requiredAction:'기존 게임의 월드·스토리·퀘스트·전투·제작·진행·밸런스·세이브 의미를 잠그고 표현 패스만 허용하는 preservationContract를 설계에 명시한다.'}));
    }
  }
  if(!playModeKnown){
    hardFailures.push('MULTIPLAYER_MISSING');
    rejectionReasons.push(rejectionReason({code:'MULTIPLAYER_MISSING',axis:'CATEGORY_IDENTITY',evidenceLevel:evidenceLevels.CATEGORY_IDENTITY,minimumRequired:DESIGN_CRITICAL_AXIS_MINIMUM_PERCENT,evidence:{multiplayerMode:playMode||'MISSING'},requiredAction:'multiplayerMode을 SINGLE/COOP/COMPETITIVE/HYBRID 중 하나로 명시하고 실제 core loop와 일치시킨다.'}));
  }
  if(!categoryConnected){
    hardFailures.push('CATEGORY_MISMATCH');
    rejectionReasons.push(rejectionReason({code:'CATEGORY_MISMATCH',axis:'CATEGORY_IDENTITY',evidenceLevel:evidenceLevels.CATEGORY_IDENTITY,minimumRequired:DESIGN_CRITICAL_AXIS_MINIMUM_PERCENT,evidence:{category:clean(seed.GAME_CATEGORY),genre:clean(robloxGenreProfile?.genre),playMode:playMode||'MISSING'},requiredAction:AXIS_REPAIR_ACTION.CATEGORY_IDENTITY}));
  }
  if(seedGrammar&&!grammarCarryOk){
    hardFailures.push('NOVEL_GRAMMAR_DILUTED');
    rejectionReasons.push(rejectionReason({code:'NOVEL_GRAMMAR_DILUTED',axis:'IDEA_AND_DISTINCTNESS',evidenceLevel:evidenceLevels.IDEA_AND_DISTINCTNESS,minimumRequired:DESIGN_CRITICAL_AXIS_MINIMUM_PERCENT,evidence:{requiredCausalIds:grammarIds,carriedCausalIds:carriedGrammarIds,primaryVerbCarried,worldRuleCarried,mainName,mainCarried,majorAxisNames,carriedMajorAxes,subElementNames,carriedSubElements,delveNames,carriedDelveElements,emergentGenreName,emergentGenreCarried},requiredAction:'GAMEPLAY_SKETCH v5 MAIN×A×B×C+@ 구조로 게임 설계를 전면 재작성한다. MAIN은 정체성, A/B는 각각 시스템과 창작 소재, C는 장르 최소 하나를 포함하는 두 주제, @는 제한 없이 확장되는 발견과 숙련이다.'}));
  }
  if(Number(evidenceLevels.IDEA_AND_DISTINCTNESS)<60||Number(evidenceLevels.CORE_LOOP_DESIGN)<60){
    hardFailures.push('CORE_FUN_WEAK');
    rejectionReasons.push(rejectionReason({code:'CORE_FUN_WEAK',axis:'CORE_LOOP_DESIGN',evidenceLevel:Math.min(Number(evidenceLevels.IDEA_AND_DISTINCTNESS||0),Number(evidenceLevels.CORE_LOOP_DESIGN||0)),minimumRequired:60,evidence:{ideaAndDistinctness:evidenceLevels.IDEA_AND_DISTINCTNESS,coreLoopDesign:evidenceLevels.CORE_LOOP_DESIGN,coreLoopCount:loops.length,signatureSystemCount:signatureSystems.length},requiredAction:'핵심 재미를 정체성·core loop·signature system의 실제 선택과 상태변화로 강화한다.'}));
  }
  if(criticalAxisFailures.length){
    hardFailures.push('CRITICAL_AXIS_MINIMUM_FAIL');
    for(const axis of criticalAxisFailures)rejectionReasons.push(rejectionReason({code:'CRITICAL_AXIS_MINIMUM_FAIL',axis,evidenceLevel:Number(evidenceLevels[axis]||0),minimumRequired:DESIGN_CRITICAL_AXIS_MINIMUM_PERCENT,evidence:{axisScore:Number(scores[axis]||0),axisWeight:Number(DESIGN_GATE_WEIGHTS[axis]||0)},requiredAction:AXIS_REPAIR_ACTION[axis]||'해당 설계 축의 근거를 75% 이상 직접 증명하도록 보강한다.'}));
  }
  return {
    scoreSystem:'STAGE_GATE_SCORING_V2',
    version:2,
    passMinimum:DESIGN_GATE_PASS_MINIMUM,
    criticalAxisMinimumPercent:DESIGN_CRITICAL_AXIS_MINIMUM_PERCENT,
    directScoreLevels:[...DESIGN_DIRECT_SCORE_LEVELS],
    weights:{...DESIGN_GATE_WEIGHTS},
    evidenceLevels,
    scores,
    totalScore,
    criticalAxisFailures,
    hardFailures:[...new Set(hardFailures)],
    rejectionReasons,
    revalidated,
    thirtyMinuteHardGateApplied:false,
    materialContractOk,
    grammarCarryEvidence:seedGrammar?{formula:seedV5?'MAIN × A × B × C + @':'MATERIAL_CAUSAL_GRAMMAR × (MAIN × A × B × c) + @',creativityCarried,requiredCausalIds:grammarIds,carriedCausalIds:carriedGrammarIds,primaryVerbCarried,worldRuleCarried,mainName,mainCarried,majorAxisNames,carriedMajorAxes,subElementNames,carriedSubElements,delveNames,carriedDelveElements,emergentGenreName,emergentGenreCarried,categoryRole:seedGrammar?.emergentGenre?.categoryRole||null}:null,
  };
}


