#!/usr/bin/env node
// 파일명: tools/vibe-look-govern.mjs
// 룩 자동 적용 관리자(외부 AI 없음): 게임의 실제 캡처 화면 점수를 보고 룩 프리셋을 자동으로 적용·확인·되돌린다. 기준은 아주 높다.
// 적용 관문(모두 통과, 3번 연속 캡처에서 같은 프리셋이 1위여야 함):
//   ① 프레임 4장 이상  ② 추정 평균 이득 ≥ +8  ③ 가장 손해 본 프레임도 ≥ +3(한 화면이라도 나빠지면 탈락)
//   ④ 레퍼런스가 있으면 레퍼런스 근접도가 기준선보다 +5 이상  ⑤ 게임 정책(lookPolicy)이 허용한 프리셋만, 밝은 게임은 밝은 낮 프리셋만
//   ⑥ 게임당 24시간에 한 번만 바꿈(쿨다운)  ⑦ 이전에 되돌려진 프리셋은 그 게임에서 영구 차단
// 적용 뒤 확인: 실제 캡처 2회의 평균이 적용 전 점수 +3 이상이어야 확정. 한 번이라도 -3 미만이면 즉시 되돌림.
// 게임 정책이 없으면(spec.lookPolicy.enabled !== true) 아무것도 하지 않는다. 결과는 게임의 LookAssignment.luau(Preset=nil 또는 id)로만 나간다.
export const GATE={minFrames:4,minGain:8,minFrameGain:3,minReferenceGain:5,streak:3,cooldownHours:24,keepMargin:3,verifyCaptures:2,panicDrop:-3};

export const emptyLook=()=>({preset:null,baseline:null,since:null,lastChange:null,pending:null,verify:null,confirmed:false,blocked:[],history:[]});

// 게임 정책이 허용하는 프리셋인가(허용 목록, 자동 프리셋 허용 여부, 밝은 게임 조건)
export function allowedByPolicy(preset,policy,mood='bright'){
  if(!preset||!policy||policy.enabled!==true)return false;
  const listed=(policy.allow||[]).includes(preset.id);
  const auto=preset.auto===true&&policy.allowAuto===true;
  if(!listed&&!auto)return false;
  if(mood==='bright'&&policy.brightOnly!==false){
    const l=preset.lighting||{};
    if(!(l.Brightness>=1.8)||!(l.ClockTime>=7&&l.ClockTime<=19))return false;
  }
  return true;
}

const hoursBetween=(a,b)=>(new Date(b)-new Date(a))/36e5;

// 순수 판정. look(현재 상태)·aesthetic(스코어러 결과)·policy·table·mood·now → {look,event}
export function decideLook({look=emptyLook(),aesthetic,policy,table,mood='bright',now=new Date().toISOString(),gate=GATE}){
  const cur={...emptyLook(),...look,blocked:[...(look.blocked||[])],history:[...(look.history||[])]};
  if(!policy||policy.enabled!==true)return {look:cur,event:{type:'DISABLED'}};
  if(!aesthetic||!aesthetic.available||!(aesthetic.checked>=gate.minFrames))return {look:cur,event:{type:'NOT_ENOUGH_FRAMES'}};

  // 적용 중: 확인 또는 되돌림
  if(cur.preset){
    const v=cur.verify||{scores:[]};
    const scores=[...v.scores,aesthetic.score];
    const worstDrop=aesthetic.score-cur.baseline;
    if(worstDrop<=gate.panicDrop||(scores.length>=gate.verifyCaptures&&scores.reduce((t,x)=>t+x,0)/scores.length<cur.baseline+gate.keepMargin&&!cur.confirmed)){
      const id=cur.preset;
      cur.history.push({at:now,type:'ROLLBACK',preset:id,baseline:cur.baseline,scores});
      if(!cur.blocked.includes(id))cur.blocked.push(id);
      return {look:{...cur,preset:null,baseline:null,verify:null,confirmed:false,pending:null,lastChange:now,history:cur.history.slice(-30)},event:{type:'ROLLBACK',preset:id,scores,baseline:cur.baseline}};
    }
    if(!cur.confirmed&&scores.length>=gate.verifyCaptures){
      cur.confirmed=true;cur.verify={scores:scores.slice(-5)};
      cur.history.push({at:now,type:'CONFIRMED',preset:cur.preset,baseline:cur.baseline,scores});
      return {look:{...cur,history:cur.history.slice(-30)},event:{type:'CONFIRMED',preset:cur.preset,scores}};
    }
    cur.verify={scores:scores.slice(-5)};
    return {look:cur,event:{type:'VERIFYING',preset:cur.preset,captures:scores.length}};
  }

  // 대기 중: 후보 평가
  if(cur.lastChange&&hoursBetween(cur.lastChange,now)<gate.cooldownHours)return {look:{...cur,pending:null},event:{type:'COOLDOWN'}};
  const rows=(aesthetic.lookSimulation&&aesthetic.lookSimulation.ranking)||[];
  const byId=Object.fromEntries((table.presets||[]).map(p=>[p.id,p]));
  const refBase=aesthetic.reference?aesthetic.reference.score:null;
  const eligible=rows.filter(r=>{
    const preset=byId[r.id];
    if(!preset||cur.blocked.includes(r.id)||!allowedByPolicy(preset,policy,mood))return false;
    if(!(r.gain>=gate.minGain)||!(r.minGain>=gate.minFrameGain))return false;
    if(refBase!==null&&!(r.referenceScore>=refBase+gate.minReferenceGain))return false;
    return true;
  }).sort((a,b)=>b.gain-a.gain);
  const top=eligible[0];
  if(!top)return {look:{...cur,pending:null},event:{type:'NO_CANDIDATE'}};
  const streak=cur.pending&&cur.pending.id===top.id?cur.pending.streak+1:1;
  if(streak<gate.streak)return {look:{...cur,pending:{id:top.id,streak}},event:{type:'STREAK',preset:top.id,streak,need:gate.streak}};
  cur.history.push({at:now,type:'APPLY',preset:top.id,baseline:aesthetic.score,estimatedGain:top.gain,minGain:top.minGain});
  return {look:{...cur,preset:top.id,baseline:aesthetic.score,since:now,lastChange:now,pending:null,verify:{scores:[]},confirmed:false,history:cur.history.slice(-30)},event:{type:'APPLY',preset:top.id,estimatedGain:top.gain}};
}

export function lookLuau(look){
  const id=look&&look.preset?`"${String(look.preset).replace(/[^a-z0-9-]/g,'')}"`:'nil';
  return `-- 자동 생성: tools/vibe-look-govern.mjs · tools/vibe-visual-ladder.mjs (직접 수정 금지).\n`+
    `-- 룩 자동 적용 결과. Preset 이 nil 이면 룩 키트를 쓰지 않는다(게임 원래 연출 그대로).\n`+
    `return {\n  Preset=${id},\n  Confirmed=${look&&look.confirmed?'true':'false'},\n}\n`;
}
