// 파일명: qa/vibe2-game-source-index.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildGameSourceIndex,resolveGameSourceScope} from '../tools/vibe2-game-source-index.mjs';
import {planComplexGameWork} from '../tools/vibe2-complex-work-planner.mjs';
test('real WEB game functions, callback, calls and offsets have exact source evidence',()=>{
 const root='web-games/line-defense',source=fs.readFileSync(root+'/index.html','utf8');
 const index=buildGameSourceIndex({sourceRoot:root,responsibleFiles:['index.html'],target:'web'});
 for(const name of ['hit','team','team::f','onEnemyKilled','hud']){
  const symbol=index.symbols.find(s=>s.name===name);assert.ok(symbol,name);
  assert.equal(symbol.sourceSha256,index.files[0].sourceSha256);
  assert.ok(source.slice(symbol.start,symbol.end).includes(name.split('::')[0]===name?name:'forEach'));
 }
 const team=index.symbols.find(s=>s.name==='team'),hit=index.symbols.find(s=>s.name==='hit');
 assert.ok(index.edges.some(e=>e.from===team.id&&e.to===hit.id));
 assert.ok(index.files[0].storage.some(s=>s.key==='jaewoon-line-defense-v1'&&s.keyRef==='KEY'));
 assert.equal(index.runtimeVerified,false);
});
test('comments, literals, regex and duplicate function names never prove unique executable ownership',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-index-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const source='// function fake() {}\nconst text="function fake2() {}";\nconst pattern=/function fake3() {}/;\nfunction same() {}\nfunction same() {}';
 fs.writeFileSync(path.join(root,'game.js'),source);
 const x=buildGameSourceIndex({sourceRoot:root,responsibleFiles:['game.js']});
 assert.equal(x.symbols.some(s=>/^fake/.test(s.name)),false);
 assert.equal(x.symbols.find(s=>s.name==='same').ambiguous,true);
 fs.symlinkSync(path.join(root,'game.js'),path.join(root,'link.js'));
 assert.throws(()=>buildGameSourceIndex({sourceRoot:root,responsibleFiles:['link.js']}),/SYMLINK/);
 assert.throws(()=>buildGameSourceIndex({sourceRoot:root,responsibleFiles:['../game.js']}),/PATH/);
});
test('catalog mapping checks exact existing game and owner stop flags',()=>{
 const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
 assert.equal(resolveGameSourceScope({repositoryRoot:'.',sourceRoot:'web-games/line-defense',gameId:'line-defense',target:'web',catalog}).gameId,'line-defense');
 assert.throws(()=>resolveGameSourceScope({repositoryRoot:'.',sourceRoot:'web-games/line-defense',gameId:'fantasy-survival',target:'web',catalog}),/ROOT_MISMATCH/);
 assert.throws(()=>resolveGameSourceScope({repositoryRoot:'.',sourceRoot:'web-games/line-defense',gameId:'line-defense',target:'web',catalog:{...catalog,ownerStoppedGameIds:['line-defense']}}),/GAME_BLOCKED/);
});
test('anonymous callback and block-local declarations cannot become foreign function entry bindings',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-scope-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.writeFileSync(path.join(root,'game.js'),'const run=()=>{const state={dead:false};};\nfunction hit(a){a.hp-=1;}');
 const plan=planComplexGameWork({sourceRoot:root,responsibleFiles:['game.js'],target:'web',baseRevisionSha:'a'.repeat(40),
  order:{ownerApproved:true,goal:'함수 hit에서 state.dead이면 중단해'}});
 assert.equal(plan.status,'BLOCKED');assert.equal(plan.unresolved[0].code,'MISSING_GROUNDING_OR_SHADOWED_STATE');
});


test('Roblox source index binds only original ReplicatedStorage RemoteEvents and ignores comments',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-remote-source-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'server'));
 const file='server/Main.server.luau';
 const original='-- local fakeRemote = ReplicatedStorage:WaitForChild("FAKE")\n'+
  'local ReplicatedStorage = game:GetService("ReplicatedStorage")\n'+
  'local HpChanged = ReplicatedStorage:WaitForChild("HP_CHANGED")\n'+
  'local function hit(player: any, state: any)\n state.hp -= 1\n HpChanged:FireClient(player, state.hp)\nend\n';
 fs.writeFileSync(path.join(root,file),original);
 const index=buildGameSourceIndex({sourceRoot:root,responsibleFiles:[file],target:'roblox'});
 assert.deepEqual(index.files[0].remotes.map(r=>[r.variable,r.eventName]),[['HpChanged','HP_CHANGED']]);
 assert.equal(index.files[0].remotes[0].sourceSha256,index.files[0].sourceSha256);
 fs.writeFileSync(path.join(root,file),original.replace('game:GetService("ReplicatedStorage")','other:GetService("ReplicatedStorage")'));
 const blocked=buildGameSourceIndex({sourceRoot:root,responsibleFiles:[file],target:'roblox'});
 assert.equal(blocked.files[0].remotes.length,0);
});
