#!/usr/bin/env node
// 바이브 리그 키트 점검: 스튜디오 진단 보고서(BONES 줄)를 읽어 몹마다 어느 리그 가족·모션 계획이 맡는지, 색칠 팔레트가 있는지 표로 보여 준다.
// 새 몬스터를 등록했을 때 '모션 없음(static)'·'팔레트 없음'을 바로 알려 주어, 바이브가 다음에 채울 일감이 된다.
// 사용: node tools/vibe-rig-kit.mjs --game <게임> --report <report.json> [--emit]   (--emit: Luau 모듈의 생성 구간을 JSON 표와 맞춘다)
//      node tools/vibe-rig-kit.mjs --check   (Luau 모듈의 생성 구간이 JSON 표와 같은지 검사)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const args=process.argv.slice(2);
const flag=n=>args.includes(`--${n}`);
const opt=n=>{const i=args.indexOf(`--${n}`);return i>=0?args[i+1]:null};
const kitDir='assets/roblox/common-rig-kit-v1';
const table=JSON.parse(fs.readFileSync(path.join(kitDir,'rig-families.json'),'utf8'));
const luauPath=path.join(kitDir,'RobloxCommonRigKit.luau');
const norm=n=>n.toLowerCase().replace(/[._\s]/g,'');

export function classify(boneNames){
  const set=new Set(boneNames.map(norm));
  for(const f of table.families){
    const allOk=!f.all||f.all.every(b=>set.has(b));
    const anyOk=!f.any||f.any.some(b=>set.has(b));
    if(allOk&&anyOk)return f;
  }
  return table.fallback;
}

function generated(){
  const rows=table.families.map(f=>`\t{ id = "${f.id}", all = {${(f.all||[]).map(x=>`"${x}"`).join(', ')}}, any = {${(f.any||[]).map(x=>`"${x}"`).join(', ')}} },`);
  return `-- BEGIN GENERATED FAMILIES (tools/vibe-rig-kit.mjs --emit, 직접 수정 금지)\nKit.Families = {\n${rows.join('\n')}\n}\n-- END GENERATED FAMILIES`;
}
function syncLuau(write){
  const src=fs.readFileSync(luauPath,'utf8');
  const re=/-- BEGIN GENERATED FAMILIES[\s\S]*?-- END GENERATED FAMILIES/;
  if(!re.test(src)){console.error('생성 구간 표식 없음');process.exit(2)}
  const next=src.replace(re,generated());
  if(write){fs.writeFileSync(luauPath,next);return true}
  return next===src;
}
function main(){
if(flag('check')){
  if(!syncLuau(false)){console.error('RobloxCommonRigKit.luau의 가족 표가 rig-families.json과 다름: --emit 필요');process.exit(1)}
  console.log('OK rig kit in sync');process.exit(0);
}
if(flag('emit')){syncLuau(true);console.log('가족 표 갱신');}

const rp=opt('report'),game=opt('game');
if(!rp||!game)process.exit(0);
if(!/^[a-z0-9-]+$/.test(game)){console.error('bad game id');process.exit(2)}
const text=fs.readFileSync(rp,'utf8');
const models=new Map();
const r15=new Set();
for(const m of text.matchAll(/BONES (\S+?)=(.*?) PARTS=([^|\n]*)/g)){
  const bones=m[2].split(',').filter(x=>x&&!x.startsWith('M:'));
  models.set(m[1],bones);
  // 뼈 없이 UpperTorso·LeftUpperLeg 같은 R15 부품 이름이 있으면 Roblox R15 공식 애니메이션이 맡는다.
  if(bones.length===0&&/UpperTorso/.test(m[3]))r15.add(m[1]);
}
if(!models.size){console.log('보고서에 BONES 줄이 없어 점검을 건너뜀');process.exit(0)}
// 색칠 팔레트 키: 서버 소스의 palette 블록에서 읽는다.
const serverFile=`roblox-games/${game}/server/Game.server.luau`;
const paletteKeys=new Set();
if(fs.existsSync(serverFile)){
  const src=fs.readFileSync(serverFile,'utf8');
  const i=src.indexOf('local palette={');
  if(i>=0){const j=src.indexOf('\n    }',i);for(const k of src.slice(i,j).matchAll(/(\w+)=C\(/g))paletteKeys.add(k[1])}
}
const rows=[...models.entries()].sort().map(([name,bones])=>{
  if(/^ghost/.test(name)){const fam=classify(bones);return {name,bones:bones.length,family:fam.id,plan:fam.plan,palette:null}} // 유령 계열은 반투명 영혼 빛으로 따로 칠한다.
  if(r15.has(name))return {name,bones:0,family:'r15',plan:'R15 공식 애니메이션이 맡는다.',palette:null};
  const fam=classify(bones);
  return {name,bones:bones.length,family:fam.id,plan:fam.plan,palette:paletteKeys.size?paletteKeys.has(name):null};
});
const lines=[`# 리그 키트 점검 (${game})`,'',`몹 ${rows.length}종 · 모션 없음 ${rows.filter(r=>r.family==='static').length}종${paletteKeys.size?` · 팔레트 없음 ${rows.filter(r=>r.palette===false).length}종`:''}`,'',
  '| 몹 | 뼈 | 가족 | 팔레트 |','|---|---|---|---|'];
for(const r of rows)lines.push(`| ${r.name} | ${r.bones} | ${r.family} | ${r.palette===null?'-':r.palette?'있음':'없음'} |`);
const todo=rows.filter(r=>r.family==='static'||r.palette===false);
lines.push('','## 바이브가 채울 일감','');
if(todo.length)for(const r of todo)lines.push(`- ${r.name}: ${r.family==='static'?'뼈 모션 가족 규칙 필요':''}${r.family==='static'&&r.palette===false?' · ':''}${r.palette===false?'색칠 팔레트 필요':''}`);else lines.push('- 없음');
fs.mkdirSync('docs/devloop',{recursive:true});
fs.writeFileSync(`docs/devloop/RIG_KIT_${game}.md`,lines.join('\n')+'\n');
console.log(`리그 키트 점검: ${rows.length}종, 일감 ${todo.length}건`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
