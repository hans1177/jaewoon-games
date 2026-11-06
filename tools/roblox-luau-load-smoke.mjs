#!/usr/bin/env node
// Roblox 소스 로드 스모크: 배포 전에 (1) 모든 .luau가 컴파일되는지, (2) shared/GameConfig.luau가
// 스텁 Roblox 환경에서 끝까지 실행되는지(순서 오류·nil 인덱스 같은 로드 크래시) 검사한다.
// 사용: node tools/roblox-luau-load-smoke.mjs roblox-games/fantasy-survival [...게임 폴더]
// luau 바이너리: $LUAU_BIN_DIR, /tmp/luau_bin, 또는 PATH의 luau/luau-compile.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';

export function findLuau(){
  const dirs=[process.env.LUAU_BIN_DIR,'/tmp/luau_bin','/usr/local/bin','/usr/bin'].filter(Boolean);
  for(const d of dirs){
    const luau=path.join(d,'luau'),compile=path.join(d,'luau-compile');
    if(fs.existsSync(luau)&&fs.existsSync(compile))return {luau,compile};
  }
  const which=(n)=>{const r=spawnSync('which',[n],{encoding:'utf8'});return r.status===0?r.stdout.trim():null};
  const luau=which('luau'),compile=which('luau-compile');
  return luau&&compile?{luau,compile}:null;
}

const STUB_PRELUDE=`
local function stub() return setmetatable({},{
  __index=function() return stub end,__call=function() return stub() end,
  __add=function() return stub() end,__sub=function() return stub() end,__mul=function() return stub() end,
  __div=function() return stub() end,__unm=function() return stub() end,__lt=function() return false end,
  __le=function() return false end,__len=function() return 0 end})
end
Random={new=function() return {NextNumber=function(_,a,b) return a or 0 end,NextInteger=function(_,a,b) return a or 0 end,NextUnitVector=function() return stub() end} end}
Color3=stub() Vector3=stub() Vector2=stub() UDim2=stub() UDim=stub() CFrame=stub() Enum=stub() Instance=stub()
NumberRange=stub() ColorSequence=stub() NumberSequence=stub() ColorSequenceKeypoint=stub() NumberSequenceKeypoint=stub()
Rect=stub() BrickColor=stub() TweenInfo=stub() Ray=stub() Region3=stub() Font=stub() PhysicalProperties=stub()
game=stub() workspace=stub() script=stub()
`;

export function smokeGame(gameDir,tools=findLuau()){
  const errors=[];
  if(!tools)return {skipped:true,errors};
  const files=[];
  for(const sub of ['server','client','shared']){
    const dir=path.join(gameDir,sub);
    if(!fs.existsSync(dir))continue;
    for(const f of fs.readdirSync(dir))if(f.endsWith('.luau')||f.endsWith('.lua'))files.push(path.join(dir,f));
  }
  for(const file of files){
    const r=spawnSync(tools.compile,['--text',file],{encoding:'utf8',maxBuffer:1<<28});
    if(r.status!==0)errors.push(`COMPILE ${file}: ${String(r.stderr||r.stdout).split('\n')[0]}`);
  }
  const config=path.join(gameDir,'shared','GameConfig.luau');
  if(fs.existsSync(config)){
    const body=fs.readFileSync(config,'utf8');
    const program=STUB_PRELUDE.replace(/local function wrap\(\) return $/,'')
      +`local ok,res=pcall(function()\n${body}\nend)\nif not ok then print("LOADERR "..tostring(res)) elseif type(res)~="table" then print("LOADERR GameConfig did not return a table") else print("LOADOK") end\n`;
    const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'luau-smoke-'));
    const file=path.join(tmp,'config-smoke.luau');
    fs.writeFileSync(file,program);
    const r=spawnSync(tools.luau,[file],{encoding:'utf8',timeout:60000,maxBuffer:1<<26});
    fs.rmSync(tmp,{recursive:true,force:true});
    const out=String(r.stdout)+String(r.stderr);
    if(!out.includes('LOADOK'))errors.push(`CONFIG ${config}: ${(out.split('\n').find(l=>l.includes('LOADERR'))||out.split('\n')[0]||'no output').replace(/^.*LOADERR /,'')}`);
  }
  return {skipped:false,errors,count:files.length};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const games=process.argv.slice(2);
  const tools=findLuau();
  if(!tools){console.error('luau 바이너리를 찾을 수 없어 스모크를 건너뜀');process.exit(games.length?2:0)}
  let failed=0;
  for(const game of games){
    const result=smokeGame(game,tools);
    if(result.errors.length){failed++;for(const e of result.errors)console.error('FAIL',e)}
    else console.log('OK',game,`(${result.count} files)`);
  }
  process.exit(failed?1:0);
}
