// 파일명: assets/vibe-godot.js
// 역할: Godot 프로젝트의 자연어 개발/수정/복구 작업 계획 생성
// 규칙: project.godot → 씬 → 스크립트 → 리소스 참조 순으로 확인

const TERMS = Object.freeze({
  scene: ['씬', 'scene', '화면', '레벨', '스테이지'],
  script: ['스크립트', 'gdscript', '.gd', '코드', '로직'],
  input: ['조이스틱', '터치', '버튼', '이동', '입력'],
  save: ['저장', '세이브', '불러오기', '진행도'],
  combat: ['공격', '피해', '데미지', '전투', '적', '보스'],
  asset: ['이미지', '사운드', '에셋', '텍스처', '애니메이션'],
  crash: ['크래시', '멈춰', '에러', '오류', '안 돼', '깨져'],
});
function clean(v){return String(v??'').trim();}
function hasAny(v,words){const s=clean(v).toLowerCase();return words.some(w=>s.includes(String(w).toLowerCase()));}
function unique(v){return [...new Set(v.filter(Boolean))];}

export function planGodotTask({request='',gameId=null,knownFiles=[]}={}){
  const prompt=clean(request); if(!prompt) throw new Error('godot task request required');
  const areas=[];
  for(const [area,words] of Object.entries(TERMS)) if(hasAny(prompt,words)) areas.push(area);
  if(!areas.length) areas.push('general');
  const files=['godot-games/<slug>/project.godot'];
  if(areas.includes('scene')||areas.includes('input')) files.push('godot-games/<slug>/*.tscn');
  if(areas.some(a=>['script','combat','save','input','crash'].includes(a))) files.push('godot-games/<slug>/*.gd');
  if(areas.includes('asset')) files.push('godot-games/<slug>/*.{png,webp,ogg,wav,tres,res}');
  const steps=[
    'project.godot 확인',
    '현재 씬 트리와 연결된 스크립트 확인',
    '리소스/신호/노드 참조 확인',
    '현재 게임 규칙·밸런스·세이브 구조 확인',
    ...areas.map(a=>`영역 검사: ${a}`),
    '원본 책임 파일 직접 수정',
    '씬/스크립트 참조 재검사',
    '입력·조이스틱·안전 여백 검사',
    '저장/복원 검사',
    '실행 가능 환경이면 실제 실행 검사',
    '최종 회귀 QA',
  ];
  const warnings=[];
  if(!gameId) warnings.push('Godot 게임 ID를 먼저 확정');
  if(!knownFiles.length) warnings.push('실제 파일은 프로젝트 구조를 읽은 뒤 확정');
  if(areas.includes('crash')) warnings.push('크래시 원인 위치를 찾기 전 증상 숨기기 금지');
  if(areas.includes('save')) warnings.push('저장 포맷을 바꾸면 migration 필요');
  return Object.freeze({version:1,request:prompt,gameId:gameId?clean(gameId):null,areas:Object.freeze(unique(areas)),candidateFiles:Object.freeze(unique(files)),knownFiles:Object.freeze(knownFiles.map(clean)),steps:Object.freeze(unique(steps)),warnings:Object.freeze(unique(warnings)),mobile:Object.freeze({touchFirst:true,virtualJoystick:true,safeArea:true,responsiveOrientation:true}),policy:Object.freeze({directSourceEdit:true,breakingSaveNeedsMigration:true,autoApplyExistingGame:false})});
}

if(typeof window!=='undefined') window.planJaewoonGodotTask=planGodotTask;
