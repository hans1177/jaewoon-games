// 파일명: tools/vibe-python.mjs
// 파이썬/Blender 실행 파일 찾기 (Windows·Linux 공통). Windows는 보통 python3 가 없고 python 또는 py -3 을 쓴다.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

let cached=null;
// 쓸 수 있는 파이썬: 환경변수 VIBE_PYTHON → python3 → python → py -3
export function pythonCmd(){
  if(cached)return cached;
  const cands=[process.env.VIBE_PYTHON&&[process.env.VIBE_PYTHON],['python3'],['python'],['py','-3']].filter(Boolean);
  for(const [cmd,...pre] of cands){
    const r=spawnSync(cmd,[...pre,'-c','print(1)'],{encoding:'utf8'});
    if(r.status===0&&r.stdout.trim()==='1')return cached={cmd,pre};
  }
  return cached={cmd:'python3',pre:[]};
}
export const runPython=(args,opts={})=>{const {cmd,pre}=pythonCmd();return spawnSync(cmd,[...pre,...args],opts)};

// Blender 실행 파일: VIBE2_BLENDER_BINARY → PATH의 blender → Windows 기본 설치 폴더(가장 높은 버전)
export function findBlender(){
  const env=process.env.VIBE2_BLENDER_BINARY;
  if(env)return spawnSync(env,['--version']).status===0?env:null;
  if(spawnSync('blender',['--version']).status===0)return 'blender';
  if(process.platform==='win32'){
    for(const root of [process.env.ProgramFiles||'C:\\Program Files','D:\\Program Files','E:\\Program Files']){
      const base=path.join(root,'Blender Foundation');
      if(!fs.existsSync(base))continue;
      const dirs=fs.readdirSync(base).filter(n=>/^Blender/i.test(n)).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
      for(const d of dirs){const exe=path.join(base,d,'blender.exe');if(fs.existsSync(exe))return exe}
    }
  }
  return null;
}
