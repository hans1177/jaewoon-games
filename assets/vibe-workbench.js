// 파일명: assets/vibe-workbench.js
// 역할: 자연어 게임 개발·수정·복구 요청을 안전한 실행계획과 실제 편집 지시로 정규화
// 규칙: 기존 코드/세이브/밸런스 보호, 완료 아트북 컨셉 잠금, 책임 파일 직접 수정, QA 후 적용

import {
  createArtbookDevelopmentLock,
  createCompanyFlow,
  createCompanyProposal,
  classifyCompanyProposalApproval
} from './vibe-company-development-flow.js';
import { createVibeEngineAdapter } from './vibe-engine-adapter.js';

const TARGET_WORDS={
  roblox:['roblox','로블록스','luau','.luau','.rbxl','.rbxlx','rojo'],
  unreal:['unreal','언리얼','ue5','ue 5','uproject','blueprint','블루프린트','animation blueprint','anim blueprint','control rig','ik retargeter'],
  unity:['unity','유니티','c#','cs','urp','apk','aab','android build','안드로이드 빌드'],
  godot:['godot','고도','씬','project.godot','gdscript','.gd'],
  web:['웹','웹게임','html','css','javascript','자바스크립트','브라우저','모바일 웹']
};
const TASK_WORDS={
  repair:['오류','버그','고장','멈춰','안 돼','에러','크래시','깨져','복구'],
  change:['수정','바꿔','변경','고쳐','개선'],
  feature:['추가','넣어','만들어','구현','제작','생성'],
  balance:['체력','공격력','데미지','웨이브','보상','드랍률','속도','쿨타임','밸런스'],
  mobile:['모바일','핸드폰','휴대폰','터치','조이스틱','스마트폰'],
  save:['저장','세이브','불러오기','진행도']
};
const QUALITY={
  visual:['그래픽','비주얼','그림','에셋','배경','캐릭터','적 디자인','보스 디자인','UI','화면','퀄리티','못생','구려'],
  animation:['애니','애니메이션','모션','움직임','동작','전환','프레임','피격 모션','공격 모션'],
  vfx:['이펙트','효과','파티클','폭발','타격감','히트스톱','화면 흔들림','쉐이크'],
  audio:['음악','소리','사운드','BGM','효과음','타격음','공격음','피격음'],
  gameplay:['재미','재미없','게임성','루프','콘텐츠','보스 패턴','긴장감','보상 구조','선택지'],
  ux:['불편','버튼','조작','화면 잘림','여백','레이아웃','가독성'],
  performance:['렉','느려','버벅','프레임','성능','로딩'],
  multiplayer:['멀티','협동','온라인','사람+AI','AI 동료','파티'],
  export:['APK','AAB','안드로이드','빌드','배포','내보내기','패키징','packaging']
};
const PROTECTED=['체력','공격력','웨이브','보상','드랍률','저장 키','저장 구조','진행도','플레이 규칙'];
const QUALITY_LABEL={visual:'그래픽/에셋',animation:'애니메이션/모션',vfx:'VFX/연출',audio:'음악/사운드',gameplay:'게임성/콘텐츠',ux:'UI/UX',performance:'성능/최적화',multiplayer:'멀티플레이/AI 협동',export:'플랫폼/빌드'};
const clean=v=>String(v??'').trim();
const has=(v,words)=>{const s=clean(v).toLowerCase();return words.some(w=>s.includes(String(w).toLowerCase()));};
const unique=v=>[...new Set(v.filter(Boolean))];

function targetOf(request,target='auto'){
  if(['roblox','unreal','unity','godot','web'].includes(target))return target;
  if(has(request,TARGET_WORDS.roblox))return'roblox';
  if(has(request,TARGET_WORDS.unreal))return'unreal';
  if(has(request,TARGET_WORDS.unity))return'unity';
  if(has(request,TARGET_WORDS.godot))return'godot';
  return'web';
}
function modeOf(request){if(has(request,TASK_WORDS.repair))return'repair';if(has(request,TASK_WORDS.feature))return'feature';if(has(request,TASK_WORDS.change))return'change';return'inspect';}
function priorityOf(request){if(has(request,['크래시','게임이 안 돼','멈춰','진행이 막힘','앱이 꺼져']))return'critical';if(has(request,TASK_WORDS.repair))return'high';if(has(request,['느려','불편','깨짐','구려','못생']))return'medium';return'normal';}
function detectSystems(request){
  const a=[];
  if(has(request,['공격','피해','데미지','투사체','원거리','근접','넉백','기절','슬로우']))a.push('전투');
  if(has(request,TASK_WORDS.balance))a.push('밸런스/규칙');
  if(has(request,TASK_WORDS.mobile))a.push('모바일 입력/레이아웃');
  if(has(request,TASK_WORDS.save))a.push('저장/복원');
  if(has(request,['인벤토리','아이템','장비','무기','방어구']))a.push('인벤토리/장비');
  if(has(request,['제작','레시피','재료']))a.push('제작');
  if(has(request,['퀘스트','미션','대화','NPC']))a.push('퀘스트/대화');
  if(has(request,['스킬','필살기','버프','디버프']))a.push('스킬/효과');
  if(has(request,['골드','돈','상점','보상','드랍','드롭']))a.push('경제/보상');
  if(has(request,['웨이브','스폰','보스','적이 나와']))a.push('웨이브/스폰');
  return unique(a);
}
function detectQuality(request){return Object.entries(QUALITY).filter(([,words])=>has(request,words)).map(([k])=>k);}
function candidateFiles(target,systems,quality){
  const a=[];
  if(target==='roblox'){
    a.push('roblox-games/<slug>/**/*.luau','roblox-games/<slug>/**/*.lua','roblox-games/<slug>/**/*.json','roblox-games/<slug>/*.rbxlx','roblox-games/<slug>/*.rbxl');
    return unique(a);
  }
  if(target==='unreal'){
    a.push('unreal-games/<slug>/*.uproject','unreal-games/<slug>/Content/**','unreal-games/<slug>/Config/**','unreal-games/<slug>/Source/**');
    if(quality.some(k=>['visual','animation','vfx'].includes(k)))a.push('unreal-games/<slug>/Content/Characters/**','unreal-games/<slug>/Content/Animations/**','unreal-games/<slug>/Content/VFX/**');
    if(quality.includes('audio'))a.push('unreal-games/<slug>/Content/Audio/**');
    return unique(a);
  }
  if(target==='unity'){
    a.push('unity-games/<slug>/Assets/**/*.cs','unity-games/<slug>/Assets/**/*.unity','unity-games/<slug>/Assets/**/*.prefab','unity-games/<slug>/Packages/manifest.json','unity-games/<slug>/ProjectSettings/*.asset');
    if(quality.some(k=>['visual','animation','vfx'].includes(k)))a.push('unity-games/<slug>/Assets/Art/**/*','unity-games/<slug>/Assets/VFX/**/*');
    if(quality.includes('audio'))a.push('unity-games/<slug>/Assets/Audio/**/*');
    return unique(a);
  }
  if(target==='godot'){
    a.push('godot-games/<slug>/project.godot','godot-games/<slug>/main.tscn','godot-games/<slug>/*.gd');
    if(systems.includes('모바일 입력/레이아웃'))a.push('godot-games/<slug>/*.tscn');
    if(quality.some(k=>['visual','animation','vfx'].includes(k)))a.push('godot-games/<slug>/assets/*','godot-games/<slug>/*.tres');
    if(quality.includes('audio'))a.push('godot-games/<slug>/audio/*');
    return unique(a);
  }
  a.push('web-games/<slug>/index.html','web-games/<slug>/*.js','assets/*.js');
  if(quality.some(k=>['visual','animation','vfx'].includes(k)))a.push('web-games/<slug>/assets/*');
  if(quality.includes('audio'))a.push('web-games/<slug>/audio/*','assets/audio/*');
  return unique(a);
}
function qualitySteps(keys){
  const a=[];
  if(keys.includes('visual'))a.push('그래픽 품질 진단 → 스타일 프로필 → 캐릭터/적/배경/UI 에셋 개선');
  if(keys.includes('animation'))a.push('Motion Contract 확인 → idle/move/attack/hit/skill/death 모션 → 전환/블렌딩 → 판정/VFX/SFX 동기화 → Motion QA');
  if(keys.includes('vfx'))a.push('타격/피격/폭발/스킬 VFX와 카메라 연출');
  if(keys.includes('audio'))a.push('BGM/SFX 연결과 모바일 용량/라이선스 확인');
  if(keys.includes('gameplay'))a.push('전투 루프/웨이브/보스/보상/선택 구조의 재미 진단');
  if(keys.includes('ux'))a.push('터치 영역/안전영역/UI 겹침/가독성 점검');
  if(keys.includes('performance'))a.push('프레임/스폰 폭증/로딩/메모리/에셋 용량 점검');
  if(keys.includes('multiplayer'))a.push('사람+AI 협동 슬롯/역할/동기화/이탈 복구 점검');
  if(keys.includes('export'))a.push('대상 플랫폼 빌드/패키징/설치 호환성 점검');
  return a;
}
function editDirectives(request,target,systems,quality){
  const a=[];
  if(quality.includes('visual'))a.push('기존 렌더 책임부에서 스타일·실루엣·레이어·배경 표현을 개선하고 게임 수치는 유지');
  if(quality.includes('animation'))a.push('기존 캐릭터 상태 전환에 실제 모션을 연결하고 공격 판정·투사체 생성·VFX·SFX 타이밍을 Motion Contract와 동기화');
  if(quality.includes('vfx'))a.push('기존 피격/공격/사망 이벤트 지점에 VFX를 연결하되 실제 피해 계산은 변경하지 않음');
  if(quality.includes('audio'))a.push('기존 이벤트 지점에 BGM/SFX 재생을 연결하고 게임 규칙과 저장 데이터는 변경하지 않음');
  if(quality.includes('ux')||systems.includes('모바일 입력/레이아웃'))a.push('기존 입력 책임부와 UI를 직접 수정해 터치 영역·safe area·겹침·한손 조작을 개선');
  if(quality.includes('performance'))a.push('기존 업데이트/스폰/렌더 루프에서 중복 작업과 불필요한 할당을 줄이고 동작 결과는 유지');
  if(quality.includes('gameplay'))a.push('게임성 문제의 원인을 먼저 진단하고 명시되지 않은 체력·공격력·웨이브·보상·드랍률은 변경하지 않음');
  if(quality.includes('multiplayer'))a.push('기존 플레이어/AI 책임 흐름에 협동 동작을 연결하고 싱글플레이 진행과 저장 호환성을 유지');
  if(target==='roblox')a.push('Roblox Luau/Lua/JSON 책임 소스를 직접 수정하고 .rbxl/.rbxlx place package는 텍스트 worker가 직접 편집하지 않음');
  else if(target==='unreal')a.push('Unreal .uproject/Content/Config/Source의 실제 책임 파일을 직접 수정하고 Binaries/DerivedDataCache/Intermediate/Saved는 소스 변경 대상으로 사용하지 않음');
  else if(target==='unity')a.push('Unity Assets/Packages/ProjectSettings의 실제 책임 파일을 직접 수정하고 임시 MonoBehaviour override/중복 패치 컴포넌트를 추가하지 않음');
  else if(target==='godot')a.push('main.gd/main.tscn 및 실제 책임 스크립트를 우선 수정하고 임시 override 노드를 추가하지 않음');
  else a.push('web-games는 보관용 원본이므로 읽기/분석만 하고 소스 수정하지 않음');
  if(has(request,['저장 구조','저장 키','세이브 구조']))a.push('저장 변경이 불가피하면 기존 데이터를 읽는 명시적 마이그레이션 경로를 함께 구현');
  return unique(a);
}
function isNewGameDevelopmentRequest(request){return has(request,['새 게임','신작','게임 만들어','게임 제작','새 프로젝트','처음부터 만들어','프로토타입 만들어']);}
function majorCategoryOf(request){
  if(has(request,['장르']))return'genre';
  if(has(request,['핵심 루프','게임 방식','플레이 방식']))return'core-loop';
  if(has(request,['스토리','세계관','메인 스토리']))return'story-direction';
  if(has(request,['아트 방향','아트스타일','비주얼 방향','그래픽 컨셉']))return'art-direction';
  if(has(request,['캐릭터 정체성','주인공 컨셉','보스 컨셉','몬스터 컨셉']))return'character-identity';
  if(has(request,['지역 구조','월드 구조','세계 구조']))return'world-structure';
  if(has(request,['카메라','아이소메트릭','2.5d','시점']))return'camera-model';
  if(has(request,['전투 방식','자동전투','턴제','실시간 전투']))return'combat-model';
  if(has(request,['성장 구조','레벨업 구조','성장 방식']))return'progression-model';
  if(has(request,['플랫폼','안드로이드','ios','pc','모바일 전용']))return'platform';
  if(has(request,['roblox','로블록스','unity','유니티','unreal','언리얼','ue5','godot','고도','엔진']))return'engine';
  if(has(request,['저장 호환성 깨','세이브 호환성 깨']))return'save-breaking-change';
  if(has(request,['전면 개편','전체 리메이크','대규모 변경']))return'large-scope-change';
  if(has(request,['과금','광고','인앱결제','수익화']))return'monetization';
  if(has(request,['유료 ai','유료AI','과금 ai']))return'paid-ai-use';
  return'implementation';
}
function resolveArtbookLock({artbook=null,artbookStatus='',artbookCutCount=0,artbookPostprocessComplete=null,artbookRef=''}={}){
  const status=clean(artbookStatus||artbook?.status||'');
  const cutCount=Number(artbookCutCount)||Number(artbook?.cuts?.length)||Number(artbook?.postprocess?.cutCount)||0;
  const postprocessComplete=artbookPostprocessComplete===null||artbookPostprocessComplete===undefined?Boolean(artbook?.postprocess?.complete):Boolean(artbookPostprocessComplete);
  const ref=clean(artbookRef||artbook?.sourcePath||artbook?.path||artbook?.file||'');
  return createArtbookDevelopmentLock({status,cutCount,postprocessComplete,ref});
}
function companyDevelopmentContext({request,gameId,mode,artbook=null,artbookStatus='',artbookCutCount=0,artbookPostprocessComplete=null,artbookRef=''}={}){
  const newGame=isNewGameDevelopmentRequest(request);
  const artbookLock=resolveArtbookLock({artbook,artbookStatus,artbookCutCount,artbookPostprocessComplete,artbookRef});
  const conceptPlanningRequired=newGame&&!artbookLock.locked;
  const category=majorCategoryOf(request);
  const proposal=createCompanyProposal({
    sourceRole:'director',targetRole:conceptPlanningRequired?'planning':'development',direction:'top-down',category,summary:request,
    reason:artbookLock.locked?'완료 아트북을 잠금 기준으로 사용하고 Vibe2는 재기획 없이 기술검증/구현만 수행':newGame?'새 게임은 본개발 전에 기획·기술시험·플레이어블 초안·내부평가를 통과해야 함':'기존 게임 작업은 보호 규칙을 유지하며 기존 작업 흐름으로 처리',
    evidence:artbookLock.locked&&artbookLock.ref?[artbookLock.ref]:[],impact:newGame?'high':'medium',estimatedCost:'unknown',artbookLocked:artbookLock.locked
  });
  const approval=classifyCompanyProposalApproval(proposal);
  return Object.freeze({required:newGame,conceptPlanningRequired,artbookLock,mode:artbookLock.locked?'locked-artbook-implementation':newGame?'predevelopment-gated':'maintenance-or-iteration',flow:createCompanyFlow({gameId:gameId||'',maxRevisionRounds:2,artbookStatus:artbookLock.status,artbookCutCount:artbookLock.cutCount,artbookPostprocessComplete:artbookLock.postprocessComplete,artbookRef:artbookLock.ref}),proposal,proposalApproval:approval,ownerGateRequired:newGame||approval.requiresOwnerApproval,executionBeforeGateAllowed:!newGame&&mode!=='inspect'&&!approval.changeRequestRequired,rule:artbookLock.locked?'locked-artbook-skips-redesign-and-enters-technical-validation':newGame?'brief-to-owner-gate-before-full-development':'existing-workbench-policy'});
}

export function createVibeEditBrief({request='',target='auto',gameId=null,files=[]}={}){
  const prompt=clean(request);
  if(!prompt)throw new Error('edit brief request required');
  const resolvedTarget=targetOf(prompt,target),systems=detectSystems(prompt),quality=detectQuality(prompt),paths=unique(files.map(f=>clean(typeof f==='string'?f:f?.path)));
  const engineAdapter=createVibeEngineAdapter({request:prompt,target:resolvedTarget,gameSlug:gameId||''});
  const engineChecks=resolvedTarget==='roblox'?['Luau 소스/프로젝트 구조 확인','place package 확인','Roblox 런타임','독립 QA','회귀','exact revision 확인']:resolvedTarget==='unreal'?['Unreal C++ 컴파일','Blueprint/Animation Blueprint 참조','Map/Level 로드','Montage/State Machine/IK Rig/Retargeter/Control Rig','패키징/런타임 확인']:resolvedTarget==='unity'?['Unity 컴파일/씬 참조/Android 빌드 확인']:resolvedTarget==='godot'?['Godot 씬/스크립트 참조 확인']:['web-games 읽기 전용 확인'];
  return Object.freeze({version:3,request:prompt,target:resolvedTarget,gameId:gameId?clean(gameId):null,responsibleFiles:Object.freeze(paths),engineAdapter,directives:Object.freeze(editDirectives(prompt,resolvedTarget,systems,quality)),protectedTargets:Object.freeze(PROTECTED.filter(x=>!prompt.includes(x))),requiredChecks:Object.freeze(unique(['변경 전 원본 일치','변경 diff 확인','보호 대상 값/키 변경 검사','문법/구조 QA','실행 회귀 QA','모바일 UI QA',...engineChecks,...engineAdapter.qa])),outputContract:Object.freeze({returnCompleteFiles:true,noWrapperPatch:true,noOverridePatch:true,checkpointBeforeWrite:true,atomicApply:true,rollbackOnFailure:true,sourceWriteAllowed:engineAdapter.mayWriteSource})});
}

export function planVibeWorkbenchTask({request='',target='auto',gameId=null,file=null,knownBroken=false,artbook=null,artbookStatus='',artbookCutCount=0,artbookPostprocessComplete=null,artbookRef=''}={}){
  const prompt=clean(request);
  if(!prompt)throw new Error('workbench request required');
  const resolvedTarget=targetOf(prompt,target),mode=modeOf(prompt),priority=priorityOf(prompt),systems=detectSystems(prompt),quality=detectQuality(prompt),protectedTargets=PROTECTED.filter(x=>prompt.includes(x));
  const engineAdapter=createVibeEngineAdapter({request:prompt,target:resolvedTarget,gameSlug:gameId||''});
  const candidates=unique([...candidateFiles(resolvedTarget,systems,quality),...engineAdapter.source.candidateFiles]);
  const structureStep=resolvedTarget==='roblox'?'roblox-games Luau/Lua/JSON 소스와 place package 구조 확인':resolvedTarget==='unreal'?'.uproject/Content/Config/Source 구조와 Animation Blueprint/Montage/State Machine 확인':resolvedTarget==='unity'?'Unity Assets/Packages/ProjectSettings 구조 확인':resolvedTarget==='godot'?'Godot project.godot와 씬/스크립트 구조 확인':'web-games 보관 원본을 읽기 전용으로 분석';
  const steps=['현재 main 기준 대상 게임/파일 확인',structureStep,'현재 게임 규칙·밸런스·저장 구조 확인'];
  const company=companyDevelopmentContext({request:prompt,gameId,mode,artbook,artbookStatus,artbookCutCount,artbookPostprocessComplete,artbookRef});
  if(company.artbookLock.locked)steps.push('완료 아트북 잠금 확인 → 한줄 정의/핵심 재미/세계관/콘티/시스템 재기획 건너뜀','잠긴 아트북 → 기술 구조 → 기술 스파이크 → 플레이어블 초안 → 내부 평가 → 사용자 승인 → 본개발','아트북과 충돌하는 변경 필요 시 구현 중단 → ARTBOOK_CHANGE_REQUEST');
  else if(company.conceptPlanningRequired)steps.push('재운컴퍼니 사전 플로우 시작: 한줄 정의 → 핵심 재미 → 세계관/스토리 → 콘티 → 시스템 설계 → 기술 구조 → 기술 스파이크 → 플레이어블 초안 → 내부 평가 → 사용자 승인');
  if(mode==='repair'||knownBroken)steps.push('오류 재현 조건과 실제 실패 지점 확인');
  if(systems.length)steps.push(`영향 시스템 확인: ${systems.join(', ')}`);
  steps.push(...qualitySteps(quality),'검증된 이전 경험 검색 후 재사용 가능 패턴 확인','현재 실행 결과/캡처/로그와 계획 대조');
  if(engineAdapter.mayWriteSource)steps.push('변경 범위를 최소화해 원본 책임 파일 직접 수정');else steps.push('읽기 전용 소스이므로 변경 후보와 이식 계획만 생성');
  if(mode==='repair')steps.push('원인 수정 후 동일 오류 재검사');
  steps.push('전용 기능 테스트','로딩/시작','진행 막힘','터치/버튼','저장/불러오기','일시정지/재시작','런타임 오류','모바일 화면','최종 회귀 QA','변경 전후 비교','사용자 피드백 반영 확인');
  if(company.artbookLock.locked)steps.push('완료 아트북 10장 대비 컨셉 드리프트 검사');
  if(resolvedTarget==='roblox')steps.push('Roblox place package/런타임/독립 QA/회귀/exact revision 증거 확인 후 Open Cloud 게시 게이트로 전달');
  if(resolvedTarget==='unreal')steps.push('Unreal C++ 컴파일/Blueprint 참조/Map 로드/Animation Blueprint·Montage·Blend Space·IK Rig/Retargeter/Control Rig/패키징/런타임 회귀 확인');
  if(resolvedTarget==='unity')steps.push('Unity 컴파일/씬 참조/MCP 연결/Android APK 또는 AAB 빌드 회귀 확인');
  if(resolvedTarget==='godot')steps.push('Godot 씬/스크립트 참조 및 세이브 회귀 확인');
  if(quality.includes('animation'))steps.push('Motion Quality Score 산출 및 치명적 게이트 실패 0개 확인');
  if(mode==='feature')steps.push('새 기능이 기존 규칙/세이브를 변경하지 않았는지 확인');
  const warnings=[];
  if(!gameId)warnings.push('대상 게임 ID가 아직 지정되지 않음');
  if(!file)warnings.push('실제 수정 전 후보 파일을 읽어 책임 파일 확정');
  if(protectedTargets.length)warnings.push(`보존 대상: ${protectedTargets.join(', ')}. 현재 값을 먼저 기록`);
  if(company.artbookLock.locked)warnings.push(`완료 아트북 컨셉 잠금: ${company.artbookLock.ref||'completed-artbook'} — Vibe2 재기획 금지`,'컨셉 변경이 필요하면 ARTBOOK_CHANGE_REQUEST 없이 자동 실행 금지');
  if(mode==='repair')warnings.push('증상만 가리는 우회 패치 금지');
  if(resolvedTarget==='web')warnings.push('web-games는 archive/read-only이며 자동 수정 금지');
  if(resolvedTarget==='roblox')warnings.push('Roblox .rbxl/.rbxlx 패키지는 텍스트 worker 직접 편집 금지','실제 게시 전 runtime/independent QA/regression/exact revision 증거 필수');
  if(resolvedTarget==='godot')warnings.push('Godot 바이너리 실행 검증 가능 여부 별도 확인');
  if(resolvedTarget==='unity')warnings.push('Unity 프로젝트는 Library/Temp/Logs/APK/AAB를 소스에 커밋하지 않음');
  if(resolvedTarget==='unreal')warnings.push('Unreal 프로젝트는 Binaries/DerivedDataCache/Intermediate/Saved 및 패키징 산출물을 소스에 커밋하지 않음');
  if(quality.includes('visual'))warnings.push('기존 에셋 재사용/라이선스를 먼저 확인');
  if(quality.includes('audio'))warnings.push('오디오 라이선스와 모바일 용량을 확인');
  return Object.freeze({version:6,request:prompt,target:resolvedTarget,mode,priority,gameId:gameId?clean(gameId):null,file:file?clean(file):null,knownBroken:Boolean(knownBroken),affectedSystems:Object.freeze(systems),qualityKeys:Object.freeze(quality),qualitySystems:Object.freeze(quality.map(k=>QUALITY_LABEL[k])),candidateFiles:Object.freeze(candidates),protectedTargets:Object.freeze(protectedTargets),engineAdapter,mobileDefaults:Object.freeze({touchFirst:true,virtualJoystick:true,safeArea:true,responsiveOrientation:true,keyboardDefault:false}),companyDevelopment:company,steps:Object.freeze(unique(steps)),warnings:Object.freeze(unique(warnings)),editBrief:createVibeEditBrief({request:prompt,target:resolvedTarget,gameId,files:file?[file]:[]}),applyPolicy:Object.freeze({existingGameAutoApply:false,directSourceEditPreferred:true,saveMigrationRequiredForBreakingChange:true,reviewBeforeCommit:true,checkpointBeforeQualityRebuild:quality.length>0,atomicApply:true,rollbackOnFailure:true,completedArtbookConceptLocked:company.artbookLock.locked,artbookChangeRequestRequired:company.artbookLock.locked,fullDevelopmentBlockedUntilCompanyGate:company.required,sourceWriteAllowed:engineAdapter.mayWriteSource,webArchiveReadOnly:engineAdapter.webArchiveReadOnly,motionRuntimeEvidenceRequired:engineAdapter.requiresMotionRuntimeEvidence})});
}

export const inspectVibeWorkbenchRequest=planVibeWorkbenchTask;
if(typeof window!=='undefined'){
  window.planJaewoonVibeWorkbenchTask=planVibeWorkbenchTask;
  window.createJaewoonVibeEditBrief=createVibeEditBrief;
}
