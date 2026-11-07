#!/usr/bin/env node
// 마력숲 지역별 구현 점검표: GameConfig를 Luau로 읽어 지역 상태·캠프·보스·선택·보상 누락을 표로 만든다.
// 사용: node tools/fantasy-region-report.mjs [--check] [--write]   (--check: 누락 있으면 종료코드 1, --write: docs/devloop/QUALITY.md 갱신)
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {STUB_PRELUDE} from './roblox-luau-load-smoke.mjs';

const gameDir='roblox-games/fantasy-survival';
const bins=[process.env.LUAU_BIN_DIR,'/tmp/luau_bin'].filter(Boolean);
const luau=bins.map(d=>path.join(d,'luau')).find(f=>fs.existsSync(f))||'luau';
const cfg=fs.readFileSync(path.join(gameDir,'shared/GameConfig.luau'),'utf8');
const script=`${STUB_PRELUDE}
local Config=(function()
${cfg}
end)()
local function esc(s) return tostring(s):gsub("[\\t\\n|]"," ") end
for _,r in ipairs(Config.Regions) do
  print(table.concat({"R",r.Id,esc(r.Name),r.Status or "?",tostring(r.UnlockMainStage or "")},"|"))
end
for _,z in ipairs(Config.EcoRegions) do
  for _,c in ipairs(z.Camps) do
    local miss={}
    for _,k in ipairs({"Intro","Reach","BossDone","Nodes","Guard","Boss","ChoiceA","ChoiceB","Reward","Title"}) do
      if c[k]==nil then miss[#miss+1]=k end
    end
    print(table.concat({"C",z.Zone,c.Id,esc(c.Name),#miss==0 and "OK" or table.concat(miss,",")},"|"))
  end
end
`;
const tmp=path.join(process.env.TMPDIR||'/tmp','fantasy-region-report.luau');
fs.writeFileSync(tmp,script);
const run=spawnSync(luau,[tmp],{encoding:'utf8'});
if(run.status!==0){console.error(run.stdout+run.stderr);process.exit(2)}
const regions=[],camps=[];
for(const line of run.stdout.split('\n')){
  const p=line.split('|');
  if(p[0]==='R')regions.push({id:p[1],name:p[2],status:p[3],unlock:p[4]});
  if(p[0]==='C')camps.push({zone:p[1],id:p[2],name:p[3],miss:p[4]});
}
const zones=new Map();
for(const c of camps){if(!zones.has(c.zone))zones.set(c.zone,[]);zones.get(c.zone).push(c)}
const rows=[];let problems=0;
for(const r of regions){
  const cs=zones.get(r.id)||[];
  const bad=cs.filter(c=>c.miss!=='OK');
  const note=[];
  if(r.status==='Planned'&&cs.length>0)note.push(`상태 라벨은 Planned(UI에 '준비 중')지만 캠프 ${cs.length}개 콘텐츠가 있음 → 라벨 확인 필요`);
  else if(r.status!=='Open')note.push(`상태 ${r.status}`);
  if(r.id!=='meadow'&&cs.length===0)note.push('서브 캠프 없음(다른 방식 구현일 수 있음)');
  if(bad.length){note.push(`누락: ${bad.map(c=>`${c.id}(${c.miss})`).join(' ')}`);problems++}
  rows.push(`| ${r.name} | ${r.status} | ${r.unlock||'-'} | ${cs.length} | ${note.join(' / ')||'OK'} |`);
}
const md=`# 마력숲 지역 점검표 (자동 생성)\n\n\`node tools/fantasy-region-report.mjs --write\` 로 갱신한다. 설정(GameConfig) 기준이며 화면 확인은 아니다.\n\n| 지역 | 상태 | 해금 스테이지 | 서브 캠프 | 점검 |\n|---|---|---|---|---|\n${rows.join('\n')}\n`;
console.log(md);
if(process.argv.includes('--write')){
  const out=path.join(gameDir,'docs/devloop/QUALITY.md');fs.writeFileSync(out,md);console.log('wrote',out);
}
if(process.argv.includes('--check')&&problems>0){console.error(`점검 실패: ${problems}건`);process.exit(1)}
