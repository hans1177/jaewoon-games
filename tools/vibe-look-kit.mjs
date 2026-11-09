#!/usr/bin/env node
// 바이브 룩 키트: 조명·대기·색보정·블룸 프리셋 표(look-presets.json)를 검사하고 Luau 모듈의 생성 구간을 맞춘다.
// 사용: node tools/vibe-look-kit.mjs --check   (표 검증 + Luau 생성 구간이 표와 같은지)
//      node tools/vibe-look-kit.mjs --emit    (Luau 생성 구간을 표에서 다시 만든다)
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const dir='assets/roblox/common-look-v1';
const jsonPath=path.join(dir,'look-presets.json');
const luauPath=path.join(dir,'RobloxCommonLookKit.luau');
const BEGIN='-- BEGIN GENERATED PRESETS (tools/vibe-look-kit.mjs --emit, 직접 수정 금지)';
const END='-- END GENERATED PRESETS';
const REQUIRED=['lighting','atmosphere','colorCorrection','bloom'];
const COLOR_KEYS={lighting:['Ambient','OutdoorAmbient','ColorShift_Top'],atmosphere:['Color','Decay'],colorCorrection:['TintColor']};

// 룩 정책이 켜진 게임(visual-ladder.json 의 lookPolicy.enabled)은 키트 사본을 Shared/Common 에 둔다. 원본과 같아야 한다.
export function policyGames(root='roblox-games'){
  const out=[];
  if(!fs.existsSync(root))return out;
  for(const g of fs.readdirSync(root)){
    const f=path.join(root,g,'visual-ladder.json');
    if(!fs.existsSync(f))continue;
    try{
      const spec=JSON.parse(fs.readFileSync(f,'utf8'));
      if(spec.lookPolicy&&spec.lookPolicy.enabled===true)out.push({game:g,copy:path.join(root,g,(spec.paths&&spec.paths.shared)||'shared','Common','RobloxCommonLookKit.luau')});
    }catch{}
  }
  return out;
}
export function syncGames(root='roblox-games'){
  const src=fs.readFileSync(luauPath,'utf8'),changed=[];
  for(const g of policyGames(root)){
    fs.mkdirSync(path.dirname(g.copy),{recursive:true});
    if(!fs.existsSync(g.copy)||fs.readFileSync(g.copy,'utf8')!==src){fs.writeFileSync(g.copy,src);changed.push(g.copy)}
  }
  return changed;
}

export function loadTable(){return JSON.parse(fs.readFileSync(jsonPath,'utf8'))}

// 표 검증: 필수 구간, 숫자 범위, 색 0~255, id 유일, 허용되지 않은 속성 거부. 오류 문자열 배열을 돌려준다.
export function validate(table){
  const errors=[],seen=new Set();
  if(!Array.isArray(table.presets)||!table.presets.length)return ['NO_PRESETS'];
  for(const p of table.presets){
    if(!/^[a-z0-9-]+$/.test(p.id||''))errors.push(`BAD_ID:${p.id}`);
    if(seen.has(p.id))errors.push(`DUPLICATE_ID:${p.id}`);
    seen.add(p.id);
    for(const sec of REQUIRED)if(!p[sec])errors.push(`MISSING_SECTION:${p.id}:${sec}`);
    for(const sec of [...REQUIRED,'sunRays','depthOfField']){
      const body=p[sec];if(!body)continue;
      const ranges=table.ranges[sec]||{};
      const colors=COLOR_KEYS[sec]||[];
      for(const [k,v] of Object.entries(body)){
        if(colors.includes(k)){
          if(!Array.isArray(v)||v.length!==3||v.some(n=>!Number.isInteger(n)||n<0||n>255))errors.push(`BAD_COLOR:${p.id}:${sec}.${k}`);
        }else if(Object.hasOwn(ranges,k)){
          const [lo,hi]=ranges[k];
          if(typeof v!=='number'||v<lo||v>hi)errors.push(`OUT_OF_RANGE:${p.id}:${sec}.${k}=${v} (${lo}~${hi})`);
        }else errors.push(`UNKNOWN_PROPERTY:${p.id}:${sec}.${k}`);
      }
    }
  }
  return errors;
}

const lit=v=>Array.isArray(v)?`Color3.fromRGB(${v.join(', ')})`:String(v);
function emitSection(body){
  return '{ '+Object.entries(body).map(([k,v])=>`${k} = ${lit(v)}`).join(', ')+' }';
}
export function emitBlock(table){
  const out=[BEGIN,'Kit.Presets = {'];
  for(const p of table.presets){
    out.push(`  ["${p.id}"] = {`,`    title = ${JSON.stringify(p.title)},`,`    mood = ${JSON.stringify(p.mood)},`);
    for(const sec of [...REQUIRED,'sunRays','depthOfField'])if(p[sec])out.push(`    ${sec} = ${emitSection(p[sec])},`);
    out.push('  },');
  }
  out.push('}','Kit.Order = { '+table.presets.map(p=>`"${p.id}"`).join(', ')+' }',END);
  return out.join('\n');
}

export function currentBlock(src){
  const a=src.indexOf(BEGIN),b=src.indexOf(END);
  if(a<0||b<a)return null;
  return src.slice(a,b+END.length);
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const table=loadTable();
  const errors=validate(table);
  if(errors.length){console.error('VIBE_LOOK_KIT=INVALID\n'+errors.join('\n'));process.exit(1);}
  const src=fs.readFileSync(luauPath,'utf8');
  const want=emitBlock(table);
  if(process.argv.includes('--sync-games')){
    const c=syncGames();console.log(`VIBE_LOOK_KIT_SYNCED games=${policyGames().length} changed=${c.length}`);process.exit(0);
  }
  if(process.argv.includes('--emit')){
    const cur=currentBlock(src);
    if(!cur){console.error('생성 구간 표식이 없다');process.exit(1);}
    fs.writeFileSync(luauPath,src.replace(cur,()=>want));
    console.log(`VIBE_LOOK_KIT_EMITTED presets=${table.presets.length}`);
  }else{
    if(currentBlock(src)!==want){console.error('VIBE_LOOK_KIT=STALE (node tools/vibe-look-kit.mjs --emit)');process.exit(1);}
    const stale=policyGames().filter(g=>!fs.existsSync(g.copy)||fs.readFileSync(g.copy,'utf8')!==src);
    if(stale.length){console.error('VIBE_LOOK_KIT=GAME_COPY_STALE '+stale.map(g=>g.game).join(',')+' (node tools/vibe-look-kit.mjs --sync-games)');process.exit(1);}
    console.log(`VIBE_LOOK_KIT=PASS presets=${table.presets.length}`);
  }
}
