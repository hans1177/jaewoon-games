import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGameSpecificBuildUpDirective} from '../tools/company-build-up-directive.mjs';
import {buildPrompt,buildGenerationRetryPrompt,buildFocusedReplaceOnlyPrompt} from '../tools/vibe2-source-worker.mjs';

const server='roblox-games/garden/server/Game.server.luau';
const client='roblox-games/garden/client/Game.client.luau';
const files=[server,client];
function fixture(){
  const source={sourceTreeFingerprint:'production-handoff-fixture',signals:{},observations:[],sourceAnchors:[{file:client,line:1,kind:'FUNCTION',symbol:'showGoal',context:'show current habitat goal',score:10}],topFiles:files.map(file=>({file,score:10}))};
  const designRecord={content:{identity:'정원 서식지 방어',robloxBuildProfile:{genre:'DEFENSE'},coreLoop:['경로 관찰','서식지 배치','웨이브 대응'],signatureSystems:[{name:'서식지 상성'}],progressionDirection:'다음 서식지 선택',ownerFeatureChanges:[{requestId:'owner-remove-1',featureId:'daily-reward',action:'REMOVE',requirement:'일일 보상 제거'},{requestId:'owner-add-2',featureId:'party',action:'ADD',requirement:'파티 기능 추가'}]}};
  const directive=buildGameSpecificBuildUpDirective({gameId:'garden',platform:'ROBLOX',sourceObservation:source,designRecord,responsibleFiles:files});
  const order={id:'production-flow-fixture',gameId:'garden',target:'roblox',goal:'서식지 행동과 다음 목표 연결',selectedTask:{type:'implementation',buildUpDirective:directive}};
  const context={files:[{path:client,editable:true,content:'function showGoal()\n  return "habitat"\nend\n'},{path:server,editable:false,content:'function awardHabitat()\n  return true\nend\n'}]};
  return {directive,order,context};
}

test('genre production design reaches the real source worker and compact retry without widening ownership',()=>{
  const {directive,order,context}=fixture();
  const prompt=buildPrompt(order,context,[client]);
  assert.ok(prompt.includes(directive.robloxProductionPlan.selectedIdea.id));
  const line=prompt.split('\n').find(x=>x.startsWith('robloxProductionFILES='));
  assert.ok(line?.includes(client));assert.ok(!line.includes(server));
  assert.match(prompt,/robloxProductionCONNECTION=.*서식지/);
  const focused=buildFocusedReplaceOnlyPrompt(prompt,{responsibleFiles:[client]}).prompt;
  assert.match(focused,/robloxProductionIDEA=/);
  assert.match(focused,/robloxProductionSCOPE=/);
  assert.match(focused,/owner-remove-1/);
  assert.match(focused,/owner-add-2/);
  assert.match(focused,/REMOVE must not be restored/);
  const retry=buildGenerationRetryPrompt(prompt,{error:new Error('JSON parse error'),responsibleFiles:[client],attempt:2});
  assert.match(retry,/robloxProductionIDEA=/);
  assert.match(retry,/allowed write scope/);
  assert.match(retry,/owner-remove-1/);
  assert.match(retry,/owner-add-2/);
});

test('non-Roblox worker cannot consume a stale Roblox production plan',()=>{
  const {order,context}=fixture();
  const prompt=buildPrompt({...order,target:'web'},context,[client]);
  assert.doesNotMatch(prompt,/robloxProductionIDEA=/);
  const otherGame=buildPrompt({...order,gameId:'different-game'},context,[client]);
  assert.doesNotMatch(otherGame,/robloxProductionIDEA=/);
});

test('Unity and Web connected-quality plans survive real source prompts and focused retries',()=>{
  for(const target of ['unity','web']){
    const root=target+'-games/garden';
    const own=root+(target==='unity'?'/Assets/Scripts/GameCore.cs':'/game.js');
    const sibling=root+(target==='unity'?'/Assets/Scripts/RuntimeBootstrap.cs':'/view.js');
    const code=target==='unity'?'public class GameCore { public int Tick() { return 1; } }':'function tick(){return 1;}';
    const source={sourceTreeFingerprint:'quality-handoff',signals:{},observations:[],sourceAnchors:[{file:own,line:1,symbol:'Tick',kind:'FUNCTION',score:10}],topFiles:[own,sibling].map(file=>({file,score:10}))};
    const directive=buildGameSpecificBuildUpDirective({gameId:'garden',platform:target.toUpperCase(),sourceRoot:root,sourceObservation:source,responsibleFiles:[own,sibling],designRecord:{content:{identity:'서식지 방어',genre:'DEFENSE',coreLoop:['관찰','배치','방어'],ownerFeatureChanges:[{requestId:'keep-removal',featureId:'shop',action:'REMOVE',requirement:'상점 복원 금지'}]}}});
    const order={gameId:'garden',target,goal:'기존 방어 흐름 완성',selectedTask:{type:'implementation',buildUpDirective:directive}};
    const prompt=buildPrompt(order,{files:[{path:own,editable:true,content:code},{path:sibling,editable:false,content:code}]},[own]);
    const filesLine=prompt.split('\n').find(line=>line.startsWith('gameProductionFILES='));
    assert.ok(filesLine.includes(own));assert.ok(!filesLine.includes(sibling));
    for(const text of [prompt,buildFocusedReplaceOnlyPrompt(prompt,{responsibleFiles:[own]}).prompt,buildGenerationRetryPrompt(prompt,{error:new Error('JSON parse error'),responsibleFiles:[own],attempt:2})]){
      assert.match(text,/gameProductionIDEA=/);assert.match(text,/gameProductionQUALITY=/);
      assert.match(text,/keep-removal/);assert.doesNotMatch(text,/robloxProductionIDEA=/);
    }
  }
});
