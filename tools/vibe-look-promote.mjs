#!/usr/bin/env node
// 파일명: tools/vibe-look-promote.mjs
// 룩 자동 승급: 조명 탐색이 배운 조합(learned-lights.json) 중 아주 엄격한 기준을 통과한 것만 룩 프리셋 후보로 올린다. 외부 AI 없음.
// 엄격한 관문(모두 통과해야 함):
//   ① 점수 ≥ 72 (탐색에서 나온 절대 점수)  ② 그 모델 종류를 3번 이상 연습한 뒤의 결과  ③ 기존 프리셋과 충분히 달라야 함(중복 금지)
//   ④ 처음 보는 CC0 모델 3개에서 다시 그려 평균 ≥ 68, 가장 낮은 것 ≥ 60 (한 모델에서만 좋은 우연 거르기)
//   ⑤ 룩 키트 검증(범위·색·필수 구간)과 Luau 생성 구간 동기화를 통과  ⑥ 자동 프리셋은 최대 12개, 한 번에 1개
// 승급은 '후보 추가'다. 프리셋 표(look-presets.json)를 바꾸는 PR로만 반영되며, 오너 승인 없이 게임 코드가 쓰지 않는다. 대기·색보정·블룸은 가장 가까운 기존 프리셋에서 물려받는다(배운 건 조명뿐).
// 사용: node tools/vibe-look-promote.mjs --learned build/learned-lights.json [--seed N] [--apply]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {pickParents,mulberry32,blenderAvailable} from './vibe-variation-gym.mjs';
import {renderCandidates,scoreDir,toJob} from './vibe-light-search.mjs';
import {loadTable,validate,emitBlock,currentBlock} from './vibe-look-kit.mjs';

export const GATE={minScore:72,minMean:68,minFloor:60,minParents:3,minRuns:3,minDistance:0.12,maxAuto:12,perRun:1,maxConfirmTries:2};

const clamp01=v=>Math.min(1,Math.max(0,v));
const lum=c=>(c[0]+c[1]+c[2])/3/255;
// 조명 특징: 시각, 밝기, 그림자 부드러움, 주변광 밝기, 햇빛 따뜻함(빨강-파랑)
export function features(l){
  return [l.ClockTime/24,l.Brightness/6,l.ShadowSoftness,lum(l.Ambient),(l.ColorShift_Top[0]-l.ColorShift_Top[2])/255*0.5+0.5];
}
export function distance(a,b){
  const fa=features(a),fb=features(b);
  return Math.sqrt(fa.reduce((t,v,i)=>t+(v-fb[i])**2,0));
}

// 순수 판정: 후보·확인 점수·표를 보고 통과 여부와 막힌 이유를 돌려준다.
export function evaluateCandidate({cand,runs,confirm,table,gate=GATE}){
  const failures=[];
  if(!(cand.score>=gate.minScore))failures.push(`SCORE_BELOW_GATE:${cand.score}<${gate.minScore}`);
  if(!(runs>=gate.minRuns))failures.push(`TOO_FEW_RUNS:${runs}<${gate.minRuns}`);
  const autos=(table.presets||[]).filter(p=>p.auto).length;
  if(autos>=gate.maxAuto)failures.push(`AUTO_PRESET_CAP:${autos}`);
  let nearest=Infinity;
  for(const p of table.presets||[])nearest=Math.min(nearest,distance(cand.roblox,p.lighting));
  if(!(nearest>=gate.minDistance))failures.push(`TOO_SIMILAR_TO_EXISTING:${nearest.toFixed(3)}<${gate.minDistance}`);
  if(!confirm||confirm.scores.length<gate.minParents)failures.push(`NOT_CONFIRMED_ON_${gate.minParents}_PARENTS`);
  else{
    const mean=confirm.scores.reduce((t,v)=>t+v,0)/confirm.scores.length,floor=Math.min(...confirm.scores);
    if(!(mean>=gate.minMean))failures.push(`CONFIRM_MEAN_LOW:${mean.toFixed(1)}<${gate.minMean}`);
    if(!(floor>=gate.minFloor))failures.push(`CONFIRM_FLOOR_LOW:${floor.toFixed(1)}<${gate.minFloor}`);
  }
  return {pass:failures.length===0,failures,nearest:Number.isFinite(nearest)?+nearest.toFixed(3):null};
}

const moodOf=l=>{
  const t=l.ClockTime,b=l.Brightness;
  const when=t<8?'이른 아침':t<11?'오전':t<15?'한낮':t<18?'오후':'저녁';
  const tone=l.ColorShift_Top[0]-l.ColorShift_Top[2]>40?'따뜻한':l.ColorShift_Top[2]-l.ColorShift_Top[0]>10?'차가운':'중간 색';
  return `${when} ${tone} 빛, ${b>=3?'밝음':b>=1.8?'보통':'어두움'}`;
};

// 후보 프리셋 만들기: 조명은 배운 값, 나머지는 가장 가까운 기존 프리셋에서 물려받는다.
export function buildPreset(cand,table){
  let best=null,bd=Infinity;
  for(const p of table.presets){const d=distance(cand.roblox,p.lighting);if(d<bd){bd=d;best=p}}
  const id='auto-'+crypto.createHash('sha1').update(JSON.stringify(cand.params)).digest('hex').slice(0,6);
  const preset=JSON.parse(JSON.stringify(best));
  preset.id=id;
  preset.title='자동 발견 조명 '+id.slice(5);
  preset.mood=moodOf(cand.roblox);
  preset.auto=true;
  preset.source={score:cand.score,inheritsFrom:best.id,learnedParams:cand.params};
  preset.lighting={...preset.lighting,...cand.roblox};
  return preset;
}

// 표 파일 서식을 그대로 두고 맨 끝에 한 줄만 추가한다(기존 줄은 한 글자도 바뀌지 않는다).
export function appendPresetText(text,preset){
  const tail='\n  ]\n}';
  const i=text.lastIndexOf(tail);
  if(i<0)throw new Error('PRESET_FILE_SHAPE_UNEXPECTED');
  return text.slice(0,i)+',\n    '+JSON.stringify(preset)+text.slice(i);
}

export function confirmOnParents({repoRoot,cand,seed,out,gate=GATE}){
  const registry=JSON.parse(fs.readFileSync(path.join(repoRoot,'company-asset-library.json'),'utf8'));
  const parents=pickParents(registry,repoRoot,gate.minParents,mulberry32(seed+77));
  const scores=[];
  for(const [i,p] of parents.entries()){
    const dir=path.resolve(out,`confirm${i}`);fs.rmSync(dir,{recursive:true,force:true});
    renderCandidates(path.join(repoRoot,p.file),[toJob('c',cand.params)],dir,192,16);
    scores.push(scoreDir(dir,null).c);
  }
  return {parents:parents.map(p=>p.id),scores};
}

// 승급 실행: 후보를 위에서부터 보고 관문을 통과한 첫 하나만 표에 추가한다.
export function promote({repoRoot=process.cwd(),learned,table,seed=1,out='build/look-promote',apply=false,confirm=confirmOnParents,gate=GATE}){
  const tried=[];
  const pool=Object.entries(learned).flatMap(([family,f])=>(f.top||[]).map(t=>({...t,family,runs:f.runs||0}))).sort((a,b)=>b.score-a.score);
  let confirmTries=0;
  for(const cand of pool){
    // 값싼 검사부터: 점수·연습 횟수·중복·상한. 통과해야만 비싼 재확인을 한다.
    const pre=evaluateCandidate({cand,runs:cand.runs,confirm:{scores:Array(gate.minParents).fill(100)},table,gate});
    if(!pre.pass){tried.push({params:cand.params,score:cand.score,failures:pre.failures});continue}
    if(confirmTries>=gate.maxConfirmTries)break;
    confirmTries++;
    const conf=confirm({repoRoot,cand,seed:seed+confirmTries,out,gate});
    const ev=evaluateCandidate({cand,runs:cand.runs,confirm:conf,table,gate});
    tried.push({params:cand.params,score:cand.score,confirm:conf.scores,failures:ev.failures});
    if(!ev.pass)continue;
    const preset=buildPreset(cand,table);
    const next={...table,presets:[...table.presets,preset]};
    const errors=validate(next);
    if(errors.length){tried[tried.length-1].failures=['KIT_VALIDATION:'+errors[0]];continue}
    return {promoted:true,preset,table:next,tried};
  }
  return {promoted:false,tried};
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const args=process.argv.slice(2);const opt=(n,d)=>{const i=args.indexOf('--'+n);return i>=0?args[i+1]:d};
  const lp=opt('learned');
  if(!lp||!fs.existsSync(lp)){console.log('VIBE_LOOK_PROMOTE none (배운 조합 없음)');process.exit(0)}
  if(!blenderAvailable()){console.error('Blender/bpy 없음');process.exit(2)}
  const table=loadTable();
  const res=promote({learned:JSON.parse(fs.readFileSync(lp,'utf8')),table,seed:+opt('seed',Math.floor(Date.now()/1000))});
  if(!res.promoted){console.log(`VIBE_LOOK_PROMOTE none tried=${res.tried.length} ${JSON.stringify(res.tried.slice(0,2).map(t=>t.failures))}`);process.exit(0)}
  if(args.includes('--apply')){
    const dir='assets/roblox/common-look-v1';
    const jp=path.join(dir,'look-presets.json');
    fs.writeFileSync(jp,appendPresetText(fs.readFileSync(jp,'utf8'),res.preset));
    const luau=path.join(dir,'RobloxCommonLookKit.luau');
    const src=fs.readFileSync(luau,'utf8');
    fs.writeFileSync(luau,src.replace(currentBlock(src),()=>emitBlock(res.table)));
  }
  console.log(`VIBE_LOOK_PROMOTE promoted id=${res.preset.id} score=${res.preset.source.score} mood="${res.preset.mood}"${args.includes('--apply')?' applied':' dry-run'}`);
}
