#!/usr/bin/env node
// 바이브 비주얼 래더: 자동개발 루프가 한 바퀴(플로어) 돌 때마다 NPC·배경·몹의 디테일 단계를 한 칸씩 올리는 엔진 모듈.
// 사용: node tools/vibe-visual-ladder.mjs --game fantasy-survival [--report studio-report.json] [--advance] [--check] [--force]
//   --advance : 검증 통과 시 가장 뒤처진 분야를 한 단계 올린다(상태 파일·Luau 상태 모듈·보고서 갱신).
//   --report  : devloop Studio 캡처 report.json. 없거나 오류 로그가 있으면 승급하지 않고 현재 단계를 유지한다.
//   --check   : 상태 파일과 생성된 Luau 모듈이 일치하는지만 검사한다(불일치 시 종료코드 1).
//   --frames  : 캡처 프레임 폴더. 검거나 하얗거나 단색인 깨진 화면이 40% 이상이면 승급하지 않는다. 승급하면 썸네일을 docs/devloop/ladder/에 남긴다.
//   --telemetry: 성능 측정 JSON({sessions,fpsAvg,fpsMin}). 표본 3회 이상에서 평균 FPS가 예산(spec.perfBudget.minAvgFps, 기본 35) 미만이면 직전 승급을 한 단계 되돌린다.
//   --force   : 보고서 없이 승급(오너 수동 승급용).
// 규칙: requires가 있는 단계는 approved-assets.json의 승인 키가 true가 되기 전에는 올리지 않고 '부족 자산'으로 기록한다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {decideLook,lookLuau} from './vibe-look-govern.mjs';

const args=process.argv.slice(2);
const flag=n=>args.includes(`--${n}`);
const opt=n=>{const i=args.indexOf(`--${n}`);return i>=0?args[i+1]:null};
const game=opt('game')||'fantasy-survival';
if(!/^[a-z0-9-]+$/.test(game)){console.error('bad game id');process.exit(2)}
const dir=path.join('roblox-games',game);
const read=f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));
const spec=read('visual-ladder.json');
const approved=fs.existsSync(path.join(dir,'approved-assets.json'))?read('approved-assets.json'):{};
const state=fs.existsSync(path.join(dir,'visual-ladder-state.json'))?read('visual-ladder-state.json'):{floor:0,tiers:{},history:[]};
const cats=Object.keys(spec.categories);
// 게임마다 폴더 구조가 달라 spec.paths.shared(생성 Luau 위치)로 지정한다. 기본은 shared/.
const sharedDir=(spec.paths&&spec.paths.shared)||'shared';
const mood=spec.mood||'bright';
for(const c of cats){if(!state.tiers[c])state.tiers[c]=1}

function nextTier(cat){
  const tiers=spec.categories[cat].tiers;
  const cur=state.tiers[cat];
  const nxt=tiers.find(t=>t.tier===cur+1);
  if(!nxt)return {done:true};
  const missing=(nxt.requires||[]).filter(k=>approved[k]!==true);
  return {tier:nxt,missing,blocked:missing.length>0};
}

// 승인 후보 매칭: 등록된 CC0 레지스트리에서 막힌 승인 키와 이름이 맞는 에셋을 찾아 '오너 승인만 하면 풀릴 후보'로 보여 준다(자동 승인은 하지 않는다).
function registryNames(){
  const names=new Set();
  for(const rel of spec.registries||[]){
    const f=path.join(dir,rel);
    if(!fs.existsSync(f))continue;
    try{
      const walk=v=>{
        if(Array.isArray(v))v.forEach(walk);
        else if(v&&typeof v==='object')for(const [k,x] of Object.entries(v)){if(k.length<80)names.add(k);walk(x)}
        else if(typeof v==='string'&&v.length<80&&!/^https?:|^rbxasset/.test(v))names.add(v);
      };
      walk(JSON.parse(fs.readFileSync(f,'utf8')));
    }catch{}
  }
  return [...names];
}
function candidatesFor(key,names){
  const rx=spec.approvalMatch&&spec.approvalMatch[key];
  if(!rx)return [];
  const re=new RegExp(rx,'i');
  return names.filter(n=>re.test(n)).slice(0,8);
}

// 보고서에서 승급을 막는 런타임 오류 흔적. Luau/Roblox가 실제로 출력하는 대표 문구만 잡는다(설명 문장의 오탐을 피하려고 짧고 구체적인 형태).
const RUNTIME_ERROR_PATTERN=/(CHAIN_RIG_ERROR|BIPED_RIG_ERROR|BOSS_SKILL_ERROR)[^\n"]{0,80}|Script error[^\n"]{0,80}|attempt to (index|call|perform|compare|concatenate|iterate|get length)[^\n"]{0,80}|\S+ is not a valid member of \S+[^\n"]{0,60}|Requested module experienced an error while loading[^\n"]{0,60}/;
// 검증: 보고서가 있고 스크립트 오류 흔적이 없어야 통과.
let pendingSha=null;
let framesInfo=null;
let aestheticInfo=null;
function verify(){
  if(flag('force'))return {ok:true,why:'오너 수동 승급'};
  const rp=opt('report');
  if(!rp||!fs.existsSync(rp))return {ok:false,why:'Studio 보고서 없음'};
  const text=fs.readFileSync(rp,'utf8');
  // [대항해시대 실증] 원본을 고정하지 않은 캡처·일부 화면·미디어 실패는 자동 자산/룩 승격에 사용하지 않는다.
  if(game==='mare-essentia'){
    if(!opt('frames'))return {ok:false,why:'실제 Studio 프레임 없는 룩 승격 금지'};
    let report;
    try{report=JSON.parse(text)}catch{return {ok:false,why:'Studio 보고서 JSON 오류'}}
    const head=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});
    const revision=String(head.stdout||'').trim();
    if(head.status!==0||!/^[0-9a-f]{40}$/.test(revision)||report.sourceRevision!==revision)
      return {ok:false,why:'Studio 검사 소스 버전이 현재 main과 불일치'};
    const summary=report.summary||{},assets=report.assetAudit||{},client=report.clientImageAudit||{};
    if(!Array.isArray(report.errors)||report.errors.length>0
      ||summary.plannedSteps!==185||summary.completedSteps!==185||summary.abortedEarly!==false
      ||summary.plannedClicks!==30||summary.successfulClicks!==30
      ||summary.plannedFrames!==31||summary.capturedFrames!==31
      ||assets.models?.status!=='PASS'||assets.features?.status!=='PASS'
      ||assets.registered?.status!=='PASS'||assets.registered.clientVerified!==true
      ||assets.registered.soundClientVerified!==true
      ||client.mode!=='VISIBLE_CLIENT_IMAGE_AND_SOUND_ISLOADED'
      ||!Number.isSafeInteger(client.expected)||client.expected<1||client.loaded!==client.expected
      ||!Array.isArray(client.missing)||client.missing.length!==0
      ||!Number.isSafeInteger(client.soundExpected)||client.soundExpected<1
      ||client.soundLoaded!==client.soundExpected
      ||!Array.isArray(client.soundMissing)||client.soundMissing.length!==0)
      return {ok:false,why:'Studio 전체 클릭/화면/미디어 전수 검증 미통과'};
  }
  const sha=crypto.createHash('sha256').update(text).digest('hex').slice(0,16);
  if(state.lastReportSha===sha)return {ok:false,why:'이미 반영된 보고서(새 캡처 필요)'};
  pendingSha=sha;
  const bad=text.match(RUNTIME_ERROR_PATTERN);
  if(bad)return {ok:false,why:`보고서에 오류: ${bad[0].trim()}`};
  const fr=opt('frames');
  if(fr&&!fs.existsSync(fr))return {ok:false,why:'프레임 폴더 없음: 화면 증거 없이는 승급하지 않음'};
  if(fr){
    const py=spawnSync('python3',['tools/vibe-ladder-frames.py','--dir',fr,'--save',path.join('docs','devloop','ladder',game,'_pending'),'--max','4'],{encoding:'utf8'});
    try{framesInfo=JSON.parse(py.stdout.trim().split('\n').pop())}catch{framesInfo=null}
    // --frames를 준 회차는 화면 증거가 있어야 승급한다. 분석기가 없거나(Pillow 없음) 0장이면 '정상'을 입증하지 못한 것이다.
    if(!framesInfo||framesInfo.available!==true)return {ok:false,why:'화면 검사 불가(Pillow 또는 분석기 오류): 화면 증거 없이는 승급하지 않음'};
    if(!(framesInfo.checked>0))return {ok:false,why:'캡처 화면 0장: 화면 증거 없이는 승급하지 않음'};
    if(framesInfo.ratio>=.4)return {ok:false,why:`깨진 화면 ${framesInfo.bad}/${framesInfo.checked}장(검정·흰색·단색)`};
    // 미적 점수(외부 AI 없이 픽셀 통계): 기본은 보고만 하고, spec.aestheticBudget.minScore 가 있을 때만 승급을 막는다.
    const budget=spec.aestheticBudget||{};
    const aargs=['tools/vibe_aesthetic_score.py','--dir',fr,'--looks','assets/roblox/common-look-v1/look-presets.json'];
    if(budget.referenceDir&&fs.existsSync(budget.referenceDir))aargs.push('--reference',budget.referenceDir);
    const ap=spawnSync('python3',aargs,{encoding:'utf8',maxBuffer:1<<26});
    try{aestheticInfo=JSON.parse(ap.stdout.trim().split('\n').pop())}catch{aestheticInfo=null}
    if(aestheticInfo&&aestheticInfo.available&&Number.isFinite(budget.minScore)&&aestheticInfo.score<budget.minScore)
      return {ok:false,why:`미적 점수 ${aestheticInfo.score} < 기준 ${budget.minScore}: ${(aestheticInfo.advice||[]).map(x=>x.text).join(' / ')||'점수 개선 필요'}`};
  }
  return {ok:true,why:'Studio 캡처 오류 없음'+(framesInfo&&framesInfo.available?`, 화면 ${framesInfo.checked}장 정상`:'')};
}

function features(cat){
  return spec.categories[cat].tiers.filter(t=>t.tier<=state.tiers[cat]).flatMap(t=>t.features||[]);
}
function luauModule(){
  const t=cats.map(c=>`  ${c}=${state.tiers[c]},`).join('\n');
  return `-- 자동 생성: tools/vibe-visual-ladder.mjs (직접 수정 금지). 루프(플로어) ${state.floor}회차 기준 디테일 단계.\n`+
    `-- 각 값은 visual-ladder.json의 해당 분야 단계 번호다. 게임 코드는 이 값 이하의 효과만 켠다.\n`+
    `-- Features: 현재 단계까지 켜진 기능 이름(분야별). Mood: 게임 분위기(bright|dark).\n`+
    `return {\n  Floor=${state.floor},\n  Mood="${mood}",\n  Tier={\n${t}\n  },\n  Features={\n${cats.map(c=>`    ${c}={${features(c).map(f=>`"${f}"`).join(',')}},`).join('\n')}\n  },\n}\n`;
}
const luauPath=path.join(dir,sharedDir,'VisualLadderState.luau');

const lookPolicy=spec.lookPolicy&&spec.lookPolicy.enabled===true?spec.lookPolicy:null;
const lookLuauPath=path.join(dir,sharedDir,'LookAssignment.luau');
if(flag('check')){
  const want=luauModule();
  const have=fs.existsSync(luauPath)?fs.readFileSync(luauPath,'utf8'):'';
  if(want!==have){console.error('VisualLadderState.luau가 상태 파일과 다름: --advance 또는 생성 필요');process.exit(1)}
  if(lookPolicy){
    const wantLook=lookLuau(state.look),haveLook=fs.existsSync(lookLuauPath)?fs.readFileSync(lookLuauPath,'utf8'):'';
    if(wantLook!==haveLook){console.error('LookAssignment.luau가 상태 파일과 다름: --advance 또는 생성 필요');process.exit(1)}
  }
  console.log('OK visual ladder in sync');process.exit(0);
}

let advancedCat=null,verdict=null,rolledBack=null;
let perf=null;
if(opt('telemetry')&&fs.existsSync(opt('telemetry'))){
  try{perf=JSON.parse(fs.readFileSync(opt('telemetry'),'utf8'))}catch{}
}
const minFps=(spec.perfBudget&&spec.perfBudget.minAvgFps)||35;
if(flag('advance')){
  // 성능 게이트: 최근 승급 뒤 실제 플레이 평균 FPS가 예산 아래면 그 승급을 되돌린다(승급은 이번 회차에 하지 않는다).
  if(perf&&perf.sessions>=3&&typeof perf.fpsAvg==='number'&&perf.fpsAvg<minFps){
    const last=[...state.history].reverse().find(h=>!h.rolledBack&&h.floor>0&&state.tiers[h.category]===h.tier&&h.tier>1);
    if(last){
      state.tiers[last.category]=last.tier-1;last.rolledBack=true;rolledBack=last;
      state.history.push({floor:state.floor+1,category:last.category,tier:last.tier-1,name:`되돌림(평균 ${perf.fpsAvg}FPS < ${minFps})`,why:'성능 예산 초과',at:new Date().toISOString().slice(0,10),rolledBack:true});
      state.floor+=1;
    }
  }
  verdict=rolledBack?{ok:false,why:`성능 예산 초과로 ${spec.categories[rolledBack.category].label} ${rolledBack.tier}단계 되돌림`}:verify();
  if(verdict.ok){
    // 가장 뒤처진(현재 단계/최대 단계가 낮은) 분야 중 막히지 않은 곳을 올린다.
    const order=cats.map(c=>({c,r:state.tiers[c]/spec.categories[c].tiers.length})).sort((a,b)=>a.r-b.r);
    for(const {c} of order){
      const n=nextTier(c);
      if(n.done||n.blocked)continue;
      state.tiers[c]=n.tier.tier;advancedCat=c;
      state.history.push({floor:state.floor+1,category:c,tier:n.tier.tier,name:n.tier.name,why:verdict.why,at:new Date().toISOString().slice(0,10)});
      break;
    }
    state.floor+=1;
    if(pendingSha)state.lastReportSha=pendingSha;
    // 승급 전후 비교용 썸네일을 회차 폴더로 옮기고 오래된 회차는 6개만 남긴다.
    const pend=path.join('docs','devloop','ladder',game,'_pending');
    if(advancedCat&&fs.existsSync(pend)){
      const dest=path.join('docs','devloop','ladder',game,`floor-${String(state.floor).padStart(3,'0')}-${advancedCat}-t${state.tiers[advancedCat]}`);
      fs.rmSync(dest,{recursive:true,force:true});fs.renameSync(pend,dest);
      const root=path.join('docs','devloop','ladder',game);
      const olds=fs.readdirSync(root).filter(n=>n.startsWith('floor-')).sort().slice(0,-6);
      for(const o of olds)fs.rmSync(path.join(root,o),{recursive:true,force:true});
    }
  }
}
// 룩 자동 적용: 실제 캡처 점수로 프리셋을 적용·확인·되돌린다(게임 정책이 켜져 있고, 이번 회차 검증이 통과했을 때만).
let lookEvent=null;
if(flag('advance')&&lookPolicy&&verdict&&verdict.ok&&aestheticInfo){
  const table=JSON.parse(fs.readFileSync(path.join('assets','roblox','common-look-v1','look-presets.json'),'utf8'));
  const res=decideLook({look:state.look,aesthetic:aestheticInfo,policy:lookPolicy,table,mood});
  state.look=res.look;lookEvent=res.event;
}
{const pend=path.join('docs','devloop','ladder',game,'_pending');if(fs.existsSync(pend))fs.rmSync(pend,{recursive:true,force:true})}
state.history=state.history.slice(-40);
fs.writeFileSync(path.join(dir,'visual-ladder-state.json'),JSON.stringify(state,null,2)+'\n');
fs.writeFileSync(luauPath,luauModule());
if(lookPolicy)fs.writeFileSync(lookLuauPath,lookLuau(state.look));

// 보고서: 현재 단계, 다음 단계, 막힌 이유(부족 자산).
const lines=[`# 비주얼 래더 (${game})`,'',`루프 회차: ${state.floor}`,''];
lines.push('| 분야 | 현재 | 다음 단계 | 상태 |','|---|---|---|---|');
const gaps=new Set();
for(const c of cats){
  const cur=spec.categories[c].tiers.find(t=>t.tier===state.tiers[c]);
  const n=nextTier(c);
  let status;
  if(n.done)status='최고 단계';
  else if(n.blocked){status=`막힘: 승인 필요 → ${n.missing.join(', ')}`;n.missing.forEach(m=>gaps.add(`${spec.categories[c].label} ${n.tier.tier}단계(${n.tier.name}): ${m}`))}
  else status='다음 회차에 승급 가능';
  lines.push(`| ${spec.categories[c].label} | ${state.tiers[c]} · ${cur.name} | ${n.done?'-':`${n.tier.tier} · ${n.tier.name}`} | ${status} |`);
}
const names=registryNames();
const gapRows=[];
for(const c of cats){
  const n=nextTier(c);
  if(n.done||!n.blocked)continue;
  for(const m of n.missing)gapRows.push({category:c,tier:n.tier.tier,tierName:n.tier.name,key:m,candidates:candidatesFor(m,names)});
}
lines.push('','## 부족 자산(오너 승인 필요)','');
if(gapRows.length)for(const g of gapRows)lines.push(`- ${spec.categories[g.category].label} ${g.tier}단계(${g.tierName}): ${g.key}`+(g.candidates.length?` · 등록 후보 ${g.candidates.length}개: ${g.candidates.join(', ')} (오너가 승인하면 바로 풀림)`:' · 등록된 후보 없음(새 에셋 필요)'));else lines.push('- 없음');
if(framesInfo&&framesInfo.available)lines.push('',`## 최근 화면 검사`,'',`- 프레임 ${framesInfo.checked}장 중 깨진 화면 ${framesInfo.bad}장`);
if(aestheticInfo&&aestheticInfo.available&&aestheticInfo.checked>0){
  lines.push('',`## 미적 점수(픽셀 통계, 외부 AI 없음)`,'',`- 평균 ${aestheticInfo.score}점 · 최저 ${aestheticInfo.worst}점 (프레임 ${aestheticInfo.checked}장)`);
  for(const a of aestheticInfo.advice||[])lines.push(`- 고칠 점: ${a.text}`);
  if(aestheticInfo.reference)lines.push(`- 오너 레퍼런스 근접도 ${aestheticInfo.reference.score}점`+(aestheticInfo.reference.deviations.length?` · ${aestheticInfo.reference.deviations.map(d=>d.text).join(', ')}`:''));
  const rk=aestheticInfo.lookSimulation&&aestheticInfo.lookSimulation.ranking;
  if(rk&&rk.length)lines.push(`- 룩 프리셋 추정 순위(색보정만 흉내, 스튜디오 재확인 필요): ${rk.slice(0,3).map(r=>`${r.id} ${r.score}`).join(' > ')}`);
}
if(lookPolicy&&state.look){
  lines.push('',`## 룩 자동 적용`,'',`- 현재: ${state.look.preset?`${state.look.preset}${state.look.confirmed?' (확정)':' (확인 중)'}`:'적용 안 함(게임 원래 연출)'}${lookEvent?` · 이번 회차: ${lookEvent.type}${lookEvent.preset?' '+lookEvent.preset:''}`:''}`);
  if(state.look.blocked&&state.look.blocked.length)lines.push(`- 되돌려져 차단된 프리셋: ${state.look.blocked.join(', ')}`);
}
if(perf&&perf.sessions)lines.push('',`## 성능`,'',`- 접속 ${perf.sessions}회 · 평균 ${perf.fpsAvg??'?'}FPS · 최저 ${perf.fpsMin??'?'}FPS (예산 ${minFps})`);
lines.push('','## 최근 승급 기록','');
if(state.history.length)for(const h of state.history.slice(-10).reverse())lines.push(`- ${h.at} · ${h.floor}회차 · ${spec.categories[h.category].label} → ${h.tier}단계 ${h.name} (${h.why})`);else lines.push('- 아직 없음');
fs.mkdirSync(path.join('docs','devloop'),{recursive:true});
fs.writeFileSync(path.join('docs','devloop',`VISUAL_LADDER_${game}.md`),lines.join('\n')+'\n');
// 전체 게임 현황 JSON(대시보드 페이지 vibe-ladder.html이 읽는다).
{
  const statusPath='vibe-ladder-status.json';
  const all=fs.existsSync(statusPath)?JSON.parse(fs.readFileSync(statusPath,'utf8')):{games:{}};
  const ladderRoot=path.join('docs','devloop','ladder',game);
  const floors=fs.existsSync(ladderRoot)?fs.readdirSync(ladderRoot).filter(n=>n.startsWith('floor-')).sort().slice(-2):[];
  all.games[game]={
    floor:state.floor,
    categories:cats.map(c=>{const n=nextTier(c);return {id:c,label:spec.categories[c].label,tier:state.tiers[c],max:spec.categories[c].tiers.length,
      name:spec.categories[c].tiers.find(t=>t.tier===state.tiers[c]).name,
      next:n.done?null:{tier:n.tier.tier,name:n.tier.name,blocked:n.blocked,missing:n.missing}}}),
    gaps:gapRows,
    perf:perf&&perf.sessions?perf:(all.games[game]&&all.games[game].perf)||null,
    frames:framesInfo&&framesInfo.available?{checked:framesInfo.checked,bad:framesInfo.bad}:(all.games[game]&&all.games[game].frames)||null,
    aesthetic:aestheticInfo&&aestheticInfo.available&&aestheticInfo.checked>0?{score:aestheticInfo.score,worst:aestheticInfo.worst,advice:(aestheticInfo.advice||[]).map(x=>x.axis),referenceScore:aestheticInfo.reference?aestheticInfo.reference.score:null,bestLook:aestheticInfo.lookSimulation?aestheticInfo.lookSimulation.ranking[0].id:null}:(all.games[game]&&all.games[game].aesthetic)||null,
    thumbs:floors.map(f=>({floor:f,files:fs.readdirSync(path.join(ladderRoot,f)).map(x=>`docs/devloop/ladder/${game}/${f}/${x}`)})),
    history:state.history.slice(-10).reverse(),
    updated:new Date().toISOString().slice(0,10),
  };
  fs.writeFileSync(statusPath,JSON.stringify(all,null,1)+'\n');
}
if(flag('advance'))console.log(advancedCat?`승급: ${advancedCat} → ${state.tiers[advancedCat]}단계`:`승급 없음 (${verdict&&verdict.ok?'올릴 수 있는 분야 없음':verdict.why})`);
else console.log('상태 갱신 완료');
