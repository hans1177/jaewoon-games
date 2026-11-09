#!/usr/bin/env node
// 파일명: tools/vibe-practice-loop.mjs
// 로컬 PC에서 연습을 쉬지 않고 돌린다(기본 60초마다 한 회차 = 사실상 매분). GitHub cron은 최소 5분이라 매분은 이 루프로만 가능하다.
// 안전장치: 한 번에 한 회차(겹치지 않음), build/STOP 파일이 생기면 멈춤, 회차가 실패해도 다음 회차로 계속, 학습 상태는 N회차마다 vibe-gym-data 브랜치로만 올림(main에는 쓰지 않음).
// 사용: node tools/vibe-practice-loop.mjs [--interval 60] [--publish-every 10] [--max 0(무제한)] [--no-publish]
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {runPracticeSession} from './vibe-practice-session.mjs';
import {blenderAvailable} from './vibe-variation-gym.mjs';
import {pull,publish} from './vibe-gym-publish.mjs';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export async function loop({interval=60,publishEvery=10,max=0,doPublish=true,repoRoot=process.cwd(),session=runPracticeSession,log=console.log}={}){
  const stop=path.join(repoRoot,'build','STOP');
  const stats='build/gym-stats.json',lights='build/learned-lights.json';
  fs.mkdirSync(path.join(repoRoot,'build'),{recursive:true});
  fs.rmSync(stop,{force:true});
  if(doPublish){try{pull({stats,cwd:repoRoot});pull({stats:lights,file:'learned-lights.json',cwd:repoRoot})}catch(e){log('pull 실패(처음부터 시작):',String(e.message||e).slice(0,120))}}
  let n=0,fails=0;
  while(!fs.existsSync(stop)&&(max===0||n<max)){
    const t0=Date.now();n++;
    try{
      const {session:s}=session({repoRoot,seed:Math.floor(t0/1000),parents:2,variants:4,out:'build/practice',statsPath:stats,lightsPath:lights});
      log(`[${new Date().toISOString()}] #${n} gym=${JSON.stringify(s.gym.tally)} light=${s.light?.best??'-'} bake=${s.bake?(s.bake.pass?'PASS':'FAIL'):'-'}`);
    }catch(e){fails++;log(`#${n} 실패(계속함): ${String(e.message||e).slice(0,160)}`)}
    if(doPublish&&n%publishEvery===0){
      try{
        const led=path.join(repoRoot,'build/practice/gym/ledger.json');
        if(fs.existsSync(led))publish({stats,ledger:'build/practice/gym/ledger.json',lights,cwd:repoRoot});
      }catch(e){log('publish 실패(계속함):',String(e.message||e).slice(0,160))}
    }
    const wait=Math.max(0,interval*1000-(Date.now()-t0));
    if(wait&&!fs.existsSync(stop)&&(max===0||n<max))await sleep(wait);
  }
  return {rounds:n,fails};
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const args=process.argv.slice(2);const opt=(n,d)=>{const i=args.indexOf('--'+n);return i>=0?args[i+1]:d};
  if(!blenderAvailable()){console.error('Blender/bpy 없음');process.exit(2)}
  const r=await loop({interval:+opt('interval',60),publishEvery:+opt('publish-every',10),max:+opt('max',0),doPublish:!args.includes('--no-publish')});
  console.log(`VIBE_PRACTICE_LOOP rounds=${r.rounds} fails=${r.fails}`);
}
