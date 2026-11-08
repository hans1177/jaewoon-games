#!/usr/bin/env node
// 바이브 비주얼 래더: 자동개발 루프가 한 바퀴(플로어) 돌 때마다 NPC·배경·몹의 디테일 단계를 한 칸씩 올리는 엔진 모듈.
// 사용: node tools/vibe-visual-ladder.mjs --game fantasy-survival [--report studio-report.json] [--advance] [--check] [--force]
//   --advance : 검증 통과 시 가장 뒤처진 분야를 한 단계 올린다(상태 파일·Luau 상태 모듈·보고서 갱신).
//   --report  : devloop Studio 캡처 report.json. 없거나 오류 로그가 있으면 승급하지 않고 현재 단계를 유지한다.
//   --check   : 상태 파일과 생성된 Luau 모듈이 일치하는지만 검사한다(불일치 시 종료코드 1).
//   --force   : 보고서 없이 승급(오너 수동 승급용).
// 규칙: requires가 있는 단계는 approved-assets.json의 승인 키가 true가 되기 전에는 올리지 않고 '부족 자산'으로 기록한다.
import fs from 'node:fs';
import path from 'node:path';

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
for(const c of cats){if(!state.tiers[c])state.tiers[c]=1}

function nextTier(cat){
  const tiers=spec.categories[cat].tiers;
  const cur=state.tiers[cat];
  const nxt=tiers.find(t=>t.tier===cur+1);
  if(!nxt)return {done:true};
  const missing=(nxt.requires||[]).filter(k=>approved[k]!==true);
  return {tier:nxt,missing,blocked:missing.length>0};
}

// 검증: 보고서가 있고 스크립트 오류 흔적이 없어야 통과.
function verify(){
  if(flag('force'))return {ok:true,why:'오너 수동 승급'};
  const rp=opt('report');
  if(!rp||!fs.existsSync(rp))return {ok:false,why:'Studio 보고서 없음'};
  const text=fs.readFileSync(rp,'utf8');
  const bad=text.match(/(CHAIN_RIG_ERROR|BIPED_RIG_ERROR|BOSS_SKILL_ERROR)[^\n"]{0,80}|Script error[^\n"]{0,80}|attempt to (index|call|perform)[^\n"]{0,80}/);
  if(bad)return {ok:false,why:`보고서에 오류: ${bad[0].trim()}`};
  return {ok:true,why:'Studio 캡처 오류 없음'};
}

function luauModule(){
  const t=cats.map(c=>`  ${c}=${state.tiers[c]},`).join('\n');
  return `-- 자동 생성: tools/vibe-visual-ladder.mjs (직접 수정 금지). 루프(플로어) ${state.floor}회차 기준 디테일 단계.\n`+
    `-- 각 값은 visual-ladder.json의 해당 분야 단계 번호다. 게임 코드는 이 값 이하의 효과만 켠다.\n`+
    `return {\n  Floor=${state.floor},\n  Tier={\n${t}\n  },\n}\n`;
}
const luauPath=path.join(dir,'shared/VisualLadderState.luau');

if(flag('check')){
  const want=luauModule();
  const have=fs.existsSync(luauPath)?fs.readFileSync(luauPath,'utf8'):'';
  if(want!==have){console.error('VisualLadderState.luau가 상태 파일과 다름: --advance 또는 생성 필요');process.exit(1)}
  console.log('OK visual ladder in sync');process.exit(0);
}

let advancedCat=null,verdict=null;
if(flag('advance')){
  verdict=verify();
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
  }
}
state.history=state.history.slice(-40);
fs.writeFileSync(path.join(dir,'visual-ladder-state.json'),JSON.stringify(state,null,2)+'\n');
fs.writeFileSync(luauPath,luauModule());

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
lines.push('','## 부족 자산(오너 승인 필요)','');
if(gaps.size)for(const g of gaps)lines.push(`- ${g}`);else lines.push('- 없음');
lines.push('','## 최근 승급 기록','');
if(state.history.length)for(const h of state.history.slice(-10).reverse())lines.push(`- ${h.at} · ${h.floor}회차 · ${spec.categories[h.category].label} → ${h.tier}단계 ${h.name} (${h.why})`);else lines.push('- 아직 없음');
fs.mkdirSync(path.join('docs','devloop'),{recursive:true});
fs.writeFileSync(path.join('docs','devloop','VISUAL_LADDER.md'),lines.join('\n')+'\n');
if(flag('advance'))console.log(advancedCat?`승급: ${advancedCat} → ${state.tiers[advancedCat]}단계`:`승급 없음 (${verdict&&verdict.ok?'올릴 수 있는 분야 없음':verdict.why})`);
else console.log('상태 갱신 완료');
