// 파일명: qa/vibe2-existing-web-assessment.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { assessExistingWebRepository, assessExistingWebSource, selectDevelopmentWebValidationGames } from '../tools/vibe2-existing-web-assessment.mjs';

const baseline={content:{coreFun:'위치를 선택해 방어 유닛을 배치하고 적의 경로를 막는다',coreLoop:['위치 선택','유닛 배치','적 이동과 전투','보상으로 강화']}};

test('prototype marker alone cannot force a rebuild when real gameplay exists',()=>{
  const html=`<!doctype html><html><body><canvas></canvas><div>검증 패널</div><script>
  let playerX=0,playerY=0,hp=10,wave=1,gold=20,enemy={hp:5};
  addEventListener('pointerdown',e=>{playerX=e.clientX;playerY=e.clientY;enemy.hp-=1;});
  function update(){if(enemy.hp<=0){gold+=5;wave+=1;}requestAnimationFrame(update)} update();
  function restart(){hp=10;wave=1} const victory='victory', defeat='defeat';
  localStorage.setItem('save',JSON.stringify({hp,wave,gold})); const ac=new AudioContext();
  </script></body></html>`;
  const result=assessExistingWebSource({html,baseline,approvedDesign:true,sourceExists:true});
  assert.notEqual(result.strategy,'FULL_REBUILD');
  assert.ok(result.evidence.gameplaySignalCount>=5);
  assert.ok(result.reasons.includes('PROTOTYPE_MARKER_PRESENT_BUT_NOT_DECISIVE'));
});

test('thin validation shell with no gameplay can be rebuilt',()=>{
  const html='<!doctype html><html><body><h1>검증 패널</h1><button data-session-stage="1">다음</button></body></html>';
  const result=assessExistingWebSource({html,baseline,approvedDesign:true,sourceExists:true});
  assert.equal(result.strategy,'FULL_REBUILD');
  assert.equal(result.fullRewriteAllowed,true);
});

test('validated playable web is kept and continued',()=>{
  const html=`<!doctype html><html><body><canvas></canvas><script>
  let hp=10,wave=2,gold=30,playerX=1,playerY=1,enemy={hp:3};
  addEventListener('touchstart',()=>{enemy.hp-=1}); function update(){requestAnimationFrame(update)}update();
  function restart(){wave=1} const victory='victory',defeat='defeat'; localStorage.setItem('save','1'); new AudioContext();
  </script></body></html>`;
  const result=assessExistingWebSource({html,baseline:{},approvedDesign:true,validationScore:84,sourceExists:true});
  assert.equal(result.strategy,'KEEP_AND_CONTINUE');
  assert.equal(result.preserveExistingSource,true);
  assert.equal(result.fullRewriteAllowed,false);
});

test('working but incomplete Web is classified as PARTIAL_REPAIR',()=>{
  const html=`<!doctype html><html><body><button id="play">Play</button><script>
  let score=0,wave=1;
  addEventListener('keydown',()=>{score+=1});
  function update(){requestAnimationFrame(update)} update();
  const victory='victory', defeat='defeat', upgrade='upgrade';
  </script></body></html>`;
  const result=assessExistingWebSource({html,baseline:{},approvedDesign:true,sourceExists:true});
  assert.equal(result.strategy,'PARTIAL_REPAIR');
  assert.equal(result.preserveExistingSource,true);
  assert.equal(result.fullRewriteAllowed,false);
});

test('limited but reusable Web is classified as MAJOR_REWORK instead of rebuild',()=>{
  const html=`<!doctype html><html><body><button id="play">Play</button><script>
  let score=0;
  addEventListener('keydown',()=>{score+=1});
  function update(){requestAnimationFrame(update)} update();
  const victory='victory', defeat='defeat';
  </script></body></html>`;
  const result=assessExistingWebSource({html,baseline:{},approvedDesign:true,sourceExists:true});
  assert.equal(result.strategy,'MAJOR_REWORK');
  assert.equal(result.preserveExistingSource,true);
  assert.equal(result.fullRewriteAllowed,false);
});


test('existing source cannot full rebuild until approved design baseline is proven',()=>{
  const html='<!doctype html><html><body><h1>검증 패널</h1><button data-session-stage="1">다음</button></body></html>';
  const result=assessExistingWebSource({html,baseline,approvedDesign:false,sourceExists:true});
  assert.equal(result.strategy,'MAJOR_REWORK');
  assert.equal(result.fullRewriteAllowed,false);
  assert.ok(result.reasons.includes('FULL_REBUILD_BLOCKED_WITHOUT_APPROVED_DESIGN')||result.reasons.includes('INSUFFICIENT_EVIDENCE_FOR_SAFE_FULL_REBUILD'));
});

test('stale high validation does not hide current approved scope gaps',()=>{
  const scopedBaseline={content:{coreFun:'방어 유닛 배치',coreLoop:['배치','전투','보상'],progression:{early:'초기 방어',mid:'상성 강화',late:'다중 경로 방어'},mobileUx:{primaryControls:['위치 선택','유닛 배치']}}};
  const html=`<!doctype html><html><body><canvas></canvas><script>
  let hp=10,wave=2,gold=30,playerX=1,playerY=1,enemy={hp:3};
  addEventListener('touchstart',()=>{enemy.hp-=1}); function update(){requestAnimationFrame(update)}update();
  function restart(){wave=1} const victory='victory',defeat='defeat'; localStorage.setItem('save','1'); new AudioContext();
  </script></body></html>`;
  const result=assessExistingWebSource({html,baseline:scopedBaseline,approvedDesign:true,validationScore:84,sourceExists:true});
  assert.notEqual(result.strategy,'FULL_REBUILD');
  if(result.evidence.approvedScopeRequiredCount>0&&result.evidence.approvedScopeCoveragePct<55){
    assert.equal(result.strategy,'PARTIAL_REPAIR');
    assert.ok(result.reasons.includes('CURRENT_APPROVED_SCOPE_GAPS_REMAIN'));
  }
});


// 메인: 정상 모듈 문법과 두 배포 경로에서 실존하는 원본 모델을 직접 재검증한다.
test('existing module and shared model URLs parse and resolve on root and project paths',()=>{
  const moon=fs.readFileSync('web-games/moon-ruins/index.html','utf8');
  const moduleBody=moon.match(/<script\b[^>]*type=["']module["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
  assert.ok(moduleBody?.includes('await import'),'moon-ruins real module startup missing');
  const valid=spawnSync(process.execPath,['--check','--input-type=module'],{input:moduleBody,encoding:'utf8'});
  assert.equal(valid.status,0,`moon-ruins module startup syntax: ${valid.stderr||''}`);
  const invalid=spawnSync(process.execPath,['--check','--input-type=module'],{input:'await import(;',encoding:'utf8'});
  assert.notEqual(invalid.status,0,'malformed module syntax must still fail');

  const party=fs.readFileSync('web-games/party-rpg/index.html','utf8');
  const partyImportMap=party.match(/<script\b[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
  assert.ok(partyImportMap,'party-rpg module importmap must remain present');
  assert.equal(typeof JSON.parse(partyImportMap).imports,'object');
  assert.throws(()=>JSON.parse('{"imports":'),SyntaxError,'invalid importmap must fail');
  const modelPaths=[...party.matchAll(/['"]((?:\.\.\/)+assets\/[^'"]+\.glb)['"]/g)].map(row=>row[1]);
  const expected=["Barbarian.glb","Knight.glb","Mage.glb","Rogue.glb","Rogue_Hooded.glb"];
  assert.equal(modelPaths.length,expected.length,
    'party-rpg must use actual licensed originals, not invented replacement binaries');
  assert.deepEqual(modelPaths.map(x=>x.split('/').at(-1)).sort(),expected.sort());
  const license=fs.readFileSync('assets/roblox/actors/sources/kaykit-adventurers/LICENSE.txt','utf8');
  assert.match(license,/Creative Commons Zero, CC0/);
  for(const required of [
    "window.vibe3dDiagnostics={loaded,missing:Object.keys(files).filter(k=>!models[k])}",
    "catch(e){console.warn('Vibe model load:',id,e);}",
    'window.vibe3dCanRender=(kind,obj)=>!!models[role(kind,obj)]',
    'if(!models[id])continue',
    "if(kind==='player')return 'traveler'",
    "if(obj.party)return 'guardian'"
  ])assert.ok(party.includes(required),'3D asset/fallback contract missing: '+required);
  assert.match(party,/name\.charCodeAt\(i\)/,'moving AI must keep the same model identity');
  assert.match(party,/return null;\s*}\s*window\.vibe3dCanRender/s,
    'unmatched creature species must remain on the existing 2D renderer');
  for(const kind of ['enemy','player','ai']){
    assert.ok(party.includes("window.vibe3dCanRender('"+kind+"',"),
      'original 2D renderer fallback must remain active for '+kind);
  }
  const missingModels=new Set();
  for(const base of [
    'https://jaewoon-games.pages.dev/web-games/party-rpg/index.html',
    'https://hans1177.github.io/jaewoon-games/web-games/party-rpg/index.html'
  ])for(const url of modelPaths){
    const actualPath=new URL(url,base).pathname.replace(/^\/jaewoon-games\//,'/').replace(/^\//,'');
    assert.match(actualPath,/^assets\/roblox\/actors\/sources\/kaykit-adventurers\/(?:Barbarian|Knight|Mage|Rogue|Rogue_Hooded)\.glb$/,
      'deployed model URL must resolve to an actual authorized CC0 binary');
    if(!fs.existsSync(actualPath)){missingModels.add(actualPath);continue;}
    assert.ok(fs.statSync(actualPath).isFile(),`party-rpg non-file model ${base} -> ${actualPath}`);
    assert.ok(fs.statSync(actualPath).size>100_000,'3D binary truncated: '+actualPath);
  }
  assert.deepEqual([...missingModels],[],'all declared model assets must exist on both project URL bases');
});

test('active or publicly playable development-confirmed Web entries have parseable startup code and no missing local script entry',()=>{
  const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const allDevelopmentGames=selectDevelopmentWebValidationGames({catalog,policy,
    webSourceExists:game=>{
      const id=String(game.id||'').trim();
      return /^[a-z0-9][a-z0-9-]*$/.test(id)
        &&fs.existsSync(path.join('web-games',id,'index.html'));
    }
  });
  // PR은 변경된 Web 게임의 진짜 시작 코드만 검사한다. main/push는 기존 전수 검사를 유지한다.
  const scope=String(process.env.VIBE2_BROWSER_CHANGED_GAMES||'ALL').trim();
  const scopedIds=scope==='ALL'?null:scope==='NONE'?[]:scope.split(',').map(id=>id.trim()).filter(Boolean);
  if(scopedIds){
    assert.ok(scopedIds.every(id=>/^[a-z0-9][a-z0-9-]*$/.test(id)),'WEB_STARTUP_SCOPE_INVALID');
    assert.deepEqual(scopedIds.filter(id=>!allDevelopmentGames.some(game=>game.id===id)),[],
      'WEB_STARTUP_SCOPE_UNCLAIMED');
  }
  const developmentGames=scopedIds
    ?allDevelopmentGames.filter(game=>scopedIds.includes(game.id))
    :allDevelopmentGames;
  const checked=[];
  for(const game of developmentGames){
    const root=path.join('web-games',String(game.id||''));
    const index=path.join(root,'index.html');
    assert.equal(fs.existsSync(index),true,`${game.id}: DEVELOPMENT_CONFIRMED Web entry missing`);
    const html=fs.readFileSync(index,'utf8');
    assert.doesNotMatch(html,/task-local exploration handoff|placeholder for the actual implementation|Approved Web Bootstrap/i,game.id);
    const markupWithoutScripts=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
    const staticDomIdList=[...markupWithoutScripts.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map(match=>match[1]);
    const staticDomIds=new Set(staticDomIdList);
    const duplicateStaticDomIds=[...staticDomIds].filter(id=>staticDomIdList.filter(candidate=>candidate===id).length>1);
    assert.deepEqual(duplicateStaticDomIds,[],`${game.id}: duplicate static DOM ids ${duplicateStaticDomIds.join(',')}`);
    let startupSource='';
    const scriptTag=/<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    for(const match of html.matchAll(scriptTag)){
      const attrs=match[1]||'',body=match[2]||'';
      const srcMatch=attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
      if(srcMatch){
        const src=srcMatch[1].split(/[?#]/)[0];
        if(/^(?:https?:)?\/\//i.test(src)||src.startsWith('data:')||src.startsWith('blob:'))continue;
        const local=src.startsWith('/')?src.slice(1):path.join(root,src);
        assert.equal(fs.existsSync(local),true,`${game.id}: missing local script ${src}`);
        const isModule=/\btype\s*=\s*["']module["']/i.test(attrs);
        if(/\.js$/i.test(local)){
          const localSource=fs.readFileSync(local,'utf8');
          startupSource+='\\n'+localSource;
          if(isModule){
            // 모듈 스크립트의 import/export/top-level await도 실제 Node 모듈 파서로 검사한다.
            const checked=spawnSync(process.execPath,['--check','--input-type=module'],{input:localSource,encoding:'utf8'});
            assert.equal(checked.status,0,`${game.id}: local module startup syntax ${src}: ${checked.stderr||''}`);
          }else{
            assert.doesNotThrow(()=>new vm.Script(localSource,{filename:local}),`${game.id}: local startup syntax ${src}`);
          }
        }
        continue;
      }
      if(!body.trim())continue;
      // importmap은 실행 JS가 아니라 비활성 JSON이다. 문법 검사를 생략하지 않는다.
      if(/\btype\s*=\s*["']importmap["']/i.test(attrs)){
        let importMap;
        assert.doesNotThrow(()=>{importMap=JSON.parse(body)},`${game.id}: inline importmap syntax`);
        assert.ok(importMap&&typeof importMap==='object'&&!Array.isArray(importMap),
          `${game.id}: importmap must be an object`);
        continue;
      }
      startupSource+='\\n'+body;
      const isModule=/\btype\s*=\s*["']module["']/i.test(attrs);
      if(isModule){
        const checked=spawnSync(process.execPath,['--check','--input-type=module'],{input:body,encoding:'utf8'});
        assert.equal(checked.status,0,`${game.id}: inline module startup syntax: ${checked.stderr||''}`);
      }else{
        assert.doesNotThrow(()=>new vm.Script(body,{filename:index}),`${game.id}: inline startup syntax`);
      }
    }
    const createdDomIds=new Set([
      ...[...startupSource.matchAll(/\\.id\\s*=\\s*["']([^"']+)["']/g)].map(match=>match[1]),
      ...[...startupSource.matchAll(/setAttribute\\(\\s*["']id["']\\s*,\\s*["']([^"']+)["']\\s*\\)/g)].map(match=>match[1]),
      ...[...startupSource.matchAll(/\\bid=["']([^"']+)["']/g)].map(match=>match[1])
    ]);
    const referencedDomIds=new Set([
      ...[...startupSource.matchAll(/getElementById\\(\\s*["']([^"']+)["']\\s*\\)/g)].map(match=>match[1]),
      ...[...startupSource.matchAll(/querySelector\\(\\s*["']#([A-Za-z0-9_-]+)["']\\s*\\)/g)].map(match=>match[1])
    ]);
    const unresolvedDomIds=[...referencedDomIds].filter(id=>!staticDomIds.has(id)&&!createdDomIds.has(id));
    assert.deepEqual(unresolvedDomIds,[],`${game.id}: unresolved startup DOM ids ${unresolvedDomIds.join(',')}`);
    if(/\bbuildUrl\s*=\s*["']Build["']|\/[^"'\s]+\.loader\.js["']/i.test(html)){
      assert.equal(fs.existsSync(path.join(root,'Build')),true,`${game.id}: Unity Web Build directory missing`);
    }
    checked.push(game.id);
  }
  assert.equal(checked.length,developmentGames.length,'every active or publicly playable DEVELOPMENT_CONFIRMED Web game must be checked');
});


test('native-only development hold excludes withdrawn Web prototypes but keeps all Web playability claims',()=>{
  const game=(id,extra={})=>({id,productionClass:'DEVELOPMENT_CONFIRMED',...extra});
  const catalog={games:[game('native'),game('withdrawn',{canonical:{sources:{web:{playable:false,state:'WITHDRAWN_SIMPLE_PROTOTYPE'}}}}),game('public',{homepageWebPlayable:true}),game('canonical-public',{canonical:{sources:{web:{playable:true}}}})]};
  const policy={directNativeDualPlatformDevelopment:{ownerActiveDevelopmentScope20261009:{status:'ACTIVE',activeTargets:['ROBLOX']}}};
  assert.deepEqual(selectDevelopmentWebValidationGames({catalog,policy}).map(game=>game.id),['public','canonical-public']);
  // 선택 플랫폼이 Roblox이고 웹 엔트리 없음이 명시된 게임은 거짓으로 웹 테스트를 요구하지 않는다.
  const verifiedOnly=selectDevelopmentWebValidationGames({catalog,policy:{},
    webSourceExists:row=>row.id==='native'});
  assert.deepEqual(verifiedOnly.map(row=>row.id),['native','public','canonical-public']);
  assert.deepEqual(selectDevelopmentWebValidationGames({catalog:{games:[
    game('web-target',{selectedPlatform:'WEB'}),
    game('roblox-only',{selectedPlatform:'ROBLOX',homepageWebPlayable:false}),
    game('claimed-web',{homepageWebPlayable:true})
  ]},policy:{},webSourceExists:()=>false}).map(row=>row.id),['web-target','claimed-web']);
  assert.equal(selectDevelopmentWebValidationGames({catalog,policy:{}}).length,4);
  policy.directNativeDualPlatformDevelopment.ownerActiveDevelopmentScope20261009.activeTargets.push('UNITY_WEB');
  assert.equal(selectDevelopmentWebValidationGames({catalog,policy}).length,4);
});

// 원본 자산/저장키가 없는 임시 부트스트랩으로 회귀하면 전체 검증을 실패시킨다.
// Web 3D 출시는 승인하지 않으며 기존 보관 소스의 온전함만 확인한다.
test('island-village legacy source retains save and playable startup without missing scripts',()=>{
  const file='web-games/island-village/index.html';
  const html=fs.readFileSync(file,'utf8');
  assert.match(html,/SAVE_KEY\s*=\s*['"]jaewoon-island-v2['"]/);
  assert.match(html,/function\s+load\s*\(/);
  assert.match(html,/function\s+save\s*\(/);
  assert.match(html,/requestAnimationFrame\(frame\)/);
  assert.match(html,/<canvas\b[^>]*id=["']game["']/i);
  assert.doesNotMatch(html,/Approved Web Bootstrap|\/path\/to\/source\.js/i);
  const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length>0,'existing source must have a startup script');
  for(const script of scripts)assert.doesNotThrow(()=>new vm.Script(script[1],{filename:file}));
});

test('large Web HTML is read completely from checkout and is never mistaken for missing source',()=>{
  const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-large-web-'));
  const dir=path.join(cwd,'web-games','large-game');
  try{
    fs.mkdirSync(dir,{recursive:true});
    const html='<!doctype html><html><body><canvas></canvas><script>let hp=10,wave=1,score=0;'
      +'addEventListener("pointerdown",()=>{score+=1});'
      +'function update(){requestAnimationFrame(update)}update();'
      +'const victory="victory",restart="restart";localStorage.setItem("save","1");'
      +'/*'+'x'.repeat(1100000)+'*/'
      +'</script></body></html>';
    const file=path.join(dir,'index.html');
    fs.writeFileSync(file,html,'utf8');
    assert.ok(fs.statSync(file).size>1024*1024);
    const a=assessExistingWebRepository({cwd,gameId:'large-game',sourceRoot:'web-games/large-game'});
    const b=assessExistingWebSource({html,sourceExists:true});
    assert.equal(a.evidence.sourceBytes,fs.statSync(file).size);
    assert.equal(a.evidence.sourceSha256,b.evidence.sourceSha256);
    assert.ok(a.evidence.gameplaySignalCount>=4);
    assert.notEqual(a.strategy,'FULL_REBUILD');
    assert.equal(a.fullRewriteAllowed,false);
    assert.equal(fs.statSync(file).size,Buffer.byteLength(html,'utf8'),'source is never rewritten or truncated');
  }finally{
    fs.rmSync(cwd,{recursive:true,force:true});
  }
});

test('star-frontier asteroid source replay terminates and preserves original sector counts and safe positions',()=>{
  const html=fs.readFileSync(path.join('web-games','star-frontier','index.html'),'utf8');
  const seeded=html.match(/function seeded\(n\)\{[^\n]*\}/)?.[0];
  const start=html.indexOf('function spawnSector(){');
  const end=html.indexOf('function spawnEnemy(index=0){',start);
  assert.ok(seeded&&start>=0&&end>start,'current source functions must be found');
  const actualSpawn=html.slice(start,end);
  const replay=`
    const TAU=Math.PI*2;
    const WORLD={w:4200,h:3000};
    const state={sector:0,asteroidSeq:1,enemies:[],asteroids:[],bullets:[],particles:[],
      player:{x:0,y:0,vx:0,vy:0},station:{x:2100,y:1500},gate:{x:3900,y:1500}};
    const dist=(x,y,a,b)=>Math.hypot(x-a,y-b);
    const rand=(a,b)=>(a+b)/2;
    const currentSector=()=>({oreMul:1});
    const updateHud=()=>{};
    const spawnEnemy=()=>{};
    ${seeded}
    ${actualSpawn}
    const observed=[];
    for(let sector=0;sector<3;sector++){
      state.sector=sector;spawnSector();
      observed.push({sector,count:state.asteroids.length,
        unsafe:state.asteroids.filter(a=>dist(a.x,a.y,2100,1500)<380||dist(a.x,a.y,3900,1500)<220).length});
    }
    observed;
  `;
  const observed=vm.runInNewContext(replay,{Math},{timeout:1200});
  assert.deepEqual(JSON.parse(JSON.stringify(observed)),[
    {sector:0,count:38,unsafe:0},
    {sector:1,count:48,unsafe:0},
    {sector:2,count:58,unsafe:0}
  ]);
});

test('survival2 historical playable source recovery keeps saved progress and original atlas',()=>{
  const root=path.join('web-games','survival2');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(html,/jaewoon-survival2-v3/);
  assert.match(html,/requestAnimationFrame\(loop\)/);
  assert.match(html,/getContext\('2d'\)/);
  assert.doesNotMatch(html,/Approved Web Bootstrap|Simulated game logic/);
  assert.ok(fs.statSync(path.join(root,'assets','survival-atlas.svg')).size>100);
  for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))
    if(match[1].trim())assert.doesNotThrow(()=>new vm.Script(match[1]));
});
