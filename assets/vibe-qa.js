// 파일명: assets/vibe-qa.js
// 역할: 바이브코딩 요청에서 실행해야 할 회귀 QA 시나리오 생성
// 규칙: 수정 범위가 작아도 핵심 플레이 흐름은 다시 확인

function clean(v){return String(v??'').trim();}
function has(v,words){const s=clean(v).toLowerCase();return words.some(w=>s.includes(String(w).toLowerCase()));}
function unique(v){return [...new Set(v.filter(Boolean))];}

export function buildVibeQaScenario({request='',target='web'}={}){
  const prompt=clean(request);if(!prompt)throw new Error('qa request required');
  const cases=['앱/페이지 로딩','게임 시작','기본 진행','터치 버튼','가상 조이스틱','화면 안전 여백','세로/가로 전환','일시정지','재시작','저장','불러오기','콘솔 오류'];
  if(has(prompt,['공격','전투','피해','데미지','투사체'])) cases.push('타겟 선택','사거리','공격 쿨타임','피해 적용','적 사망');
  if(has(prompt,['웨이브','스폰','보스'])) cases.push('스폰 조건','웨이브 증가','보스 등장','웨이브 종료');
  if(has(prompt,['아이템','장비','인벤토리'])) cases.push('아이템 획득','장착/해제','수량 보존');
  if(has(prompt,['제작','재료'])) cases.push('재료 차감','제작 성공','제작 실패 롤백');
  if(has(prompt,['퀘스트','미션'])) cases.push('목표 진행','완료 판정','보상 중복 방지');
  if(has(prompt,['세이브','저장','진행도'])) cases.push('게임 ID 일치','버전 호환','기존 세이브 보호');
  if(has(prompt,['오류','버그','고장','멈춰','안 돼'])) cases.push('동일 오류 재현','원인 수정 후 재현 실패 확인');
  if(target==='godot') cases.push('씬 참조','스크립트 참조','리소스 경로','실행 가능 여부');
  return Object.freeze({version:1,target:target==='godot'?'godot':'web',request:prompt,cases:Object.freeze(unique(cases)),passCriteria:'모든 필수 시나리오 통과 + 새 콘솔/런타임 오류 없음'});
}

if(typeof window!=='undefined') window.buildJaewoonVibeQaScenario=buildVibeQaScenario;
