// Vibe5.9: one owner-scoped request generates playable canvas content in existing Web game functions.
// No alternate execution pipeline, persistent-save keys, network writes, external assets or release claims.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {buildGameSourceIndex,resolveGameSourceScope,safeSourceFile,sourceDigest,scriptText,sourceScopeAt} from './vibe2-game-source-index.mjs';
import {applyExactEdits} from './autonomous-safe-edit.mjs';

const CATEGORIES=Object.freeze({
 facilities:['시설','놀이시설','타이쿤시설','facility','facilities'],
 maps:['맵','지역','RPG맵','rpg맵','map','maps','biome'],
 backgrounds:['배경','background','backgrounds'],
 sprites:['그래픽','장식','오브젝트','sprite','sprites','graphics'],
 actions:['액션','행동','action','actions'],
 motions:['모션','애니메이션','동작','motion','motions','animations']
});
const FUNCTION_DEFAULTS=Object.freeze({
 render:['render','draw','drawGame','renderGame','paint'],
 interact:['handleClick','onClick','click','pointerDown','handlePointerDown'],
 update:['update','tick','updateGame','step']
});
const LIMITS=Object.freeze({facilities:12,maps:8,backgrounds:6,sprites:8,actions:8,motions:8});
const SAFE_NAME=/^[\p{L}\p{N} _-]{1,24}$/u;
const SAFE_IDENTIFIER=/^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/;
const HEAD=/^(?:웹\s*)?(?:게임\s*)?볼륨\s*(?:한번에\s*)?(?:추가|확장)\s*:\s*/i;

function readRequest(order){
 const spec=order.selectedTask?.vibe59VolumeRequest??order.vibe59VolumeRequest;
 if(spec!==undefined&&spec!==null)return spec;
 const goal=String(order.selectedTask?.goal||order.originalGoal||order.goal||'').trim();
 if(!HEAD.test(goal))return null;
 const payload=goal.replace(HEAD,'');
 const data={};
 for(const clause of payload.split(';').map(x=>x.trim()).filter(Boolean)){
  const hit=Object.entries(CATEGORIES).find(([,words])=>words.some(w=>
   clause.toLowerCase().startsWith(w.toLowerCase()+' ')));
  if(!hit)throw Error('VIBE59_VOLUME_UNSUPPORTED_CATEGORY');
  const key=hit[0],label=hit[1].find(w=>clause.toLowerCase().startsWith(w.toLowerCase()+' '));
  if(data[key])throw Error('VIBE59_VOLUME_DUPLICATE_CATEGORY');
  data[key]=clause.slice(label.length).trim().split(/\s*,\s*/).filter(Boolean);
 }
 return data;
}
function normalize(request){
 if(!request||typeof request!=='object'||Array.isArray(request))throw Error('VIBE59_VOLUME_INVALID_REQUEST');
 const result={},bindings=request.bindings??{};
 if(typeof bindings!=='object'||Array.isArray(bindings)||bindings===null)throw Error('VIBE59_VOLUME_BINDINGS');
 for(const [key,max] of Object.entries(LIMITS)){
  const raw=request[key]??[];
  if(!Array.isArray(raw)||raw.length>max)throw Error('VIBE59_VOLUME_CATEGORY_LIMIT:'+key);
  const entries=raw.map(x=>typeof x==='string'?x.trim():'');
  if(entries.some(x=>!SAFE_NAME.test(x))||new Set(entries).size!==entries.length)
   throw Error('VIBE59_VOLUME_UNSAFE_OR_DUPLICATE_NAME:'+key);
  result[key]=entries;
 }
 if(Object.values(result).filter(a=>a.length).length<2||!result.facilities.length&&!result.maps.length||
  Object.values(result).reduce((n,a)=>n+a.length,0)>40)throw Error('VIBE59_VOLUME_CONTENT_SCOPE');
 for(const key of ['render','interact','update'])
  if(bindings[key]!==undefined&&!SAFE_IDENTIFIER.test(bindings[key]))
   throw Error('VIBE59_VOLUME_BINDINGS');
 result.bindings=bindings;
 return result;
}
function choose(index,key,request,required){
 const desired=request.bindings[key];
 const names=desired?[desired]:FUNCTION_DEFAULTS[key];
 const matches=index.symbols.filter(s=>s.kind==='function'&&!s.parent&&!s.ambiguous&&
  names.includes(s.name)&&s.unsupported.length===0);
 if(desired&&matches.length!==1||!desired&&matches.length>1)
  throw Error('VIBE59_VOLUME_AMBIGUOUS_FUNCTION:'+key);
 if(required&&matches.length!==1)throw Error('VIBE59_VOLUME_MISSING_FUNCTION:'+key);
 return matches[0]||null;
}
function makePatch(file,owner,addition,location){
 const source=file.source,find=source.slice(owner.start,owner.end);
 const at=(location==='end'?owner.bodyEnd:owner.bodyStart)-owner.start;
 if(at<0||at>find.length)throw Error('VIBE59_VOLUME_FUNCTION_SPAN');
 const replace=find.slice(0,at)+'\n'+addition+'\n'+find.slice(at);
 if(source.split(find).length!==2)throw Error('VIBE59_VOLUME_NONUNIQUE_SOURCE_ANCHOR');
 return {path:file.path,find,replace};
}

const paint = "\n  // VIBE_VOLUME_PACK: procedural gameplay area, directly in the existing renderer.\n  {\n    const v=__VOLUME__, w=Number(ctx.canvas && ctx.canvas.width), h=Number(ctx.canvas && ctx.canvas.height);\n    if(Number.isFinite(w)&&Number.isFinite(h)&&w>=320&&h>=300){\n      const left=w*0.56,top=h*0.04,width=w*0.42,height=h*0.9;\n      const clock=Math.max(v.time,(Date.now()-v.started)/1000);\n      const colors=['#386c7c','#477b61','#bb8a51','#697ab2','#8b608e','#457c84'];\n      const biome=v.maps[v.mapIndex]||'';\n      const skyName=v.backgrounds[v.backgroundIndex]||'';\n      const desert=/사막|desert/i.test(biome),snow=/설원|눈|snow|ice/i.test(biome);\n      const night=/밤|야간|night|우주|space/i.test(skyName);\n      const dusk=/노을|황혼|sunset|dusk/i.test(skyName);\n      const color=desert?'#b99556':snow?'#b1d5e4':colors[v.mapIndex%colors.length];\n      const bg=night?'#1e3052':dusk?'#c96f5e':'#5a9bb2';\n      ctx.save();ctx.translate(left,top);ctx.scale(width/440,height/600);\n      ctx.fillStyle='#14212f';ctx.globalAlpha=0.96;ctx.fillRect(0,0,440,600);ctx.globalAlpha=1;\n      ctx.fillStyle='#eef5f8';ctx.font='bold 18px sans-serif';ctx.fillText('GAME WORLD+',14,27);\n      ctx.font='11px sans-serif';ctx.fillStyle='#a8cbd4';ctx.fillText('시설 · 탐험 · 액션 · 모션',14,43);\n      // Selectable background thumbnails.\n      for(let i=0;i<v.backgrounds.length;i++){\n        const n=v.backgrounds.length,x=10+i*420/n,sw=420/n-4;\n        ctx.fillStyle=i===v.backgroundIndex?'#e8c976':bg;ctx.fillRect(x,54,sw,28);\n        ctx.fillStyle='#16202b';ctx.font='11px sans-serif';ctx.fillText(v.backgrounds[i].slice(0,8),x+4,72);\n      }\n      // Draw game world using the selected map, with tiles and real procedural scenery.\n      ctx.fillStyle=bg;ctx.fillRect(9,91,422,120);\n      ctx.fillStyle=color;ctx.fillRect(9,145,422,66);\n      ctx.fillStyle=night?'#e7eef7':'#ffe2a0';ctx.beginPath();\n      ctx.arc(night?375:342,night?115:120,night?9:19,0,Math.PI*2);ctx.fill();\n      if(night)for(let i=0;i<12;i++){ctx.fillRect(18+(i*71)%391,102+(i*23)%36,2,2);}\n      ctx.globalAlpha=0.28;ctx.fillStyle=snow?'#fff':'#d7e7e1';\n      for(let c=0;c<5;c++){ctx.beginPath();ctx.arc(42+c*91,135+(c%2)*17,25,0,Math.PI*2);ctx.fill();}\n      ctx.globalAlpha=1;\n      for(let i=0;i<9;i++){\n        const bx=23+(i%5)*88,by=162+Math.floor(i/5)*27;\n        if(desert){\n          ctx.fillStyle='#4a8867';ctx.fillRect(bx+3,by-4,6,24);\n          ctx.fillRect(bx-3,by+5,15,4);\n        }else if(snow){\n          ctx.fillStyle='#395f79';ctx.fillRect(bx+3,by+6,5,13);\n          ctx.fillStyle='#edf8fa';ctx.beginPath();\n          ctx.moveTo(bx+5,by-14);ctx.lineTo(bx-9,by+11);ctx.lineTo(bx+19,by+11);ctx.fill();\n        }else{\n          ctx.fillStyle='#4b5c54';ctx.fillRect(bx,by,8,16);\n          ctx.fillStyle='#79c49c';ctx.beginPath();\n          ctx.arc(bx+4,by-2,10+(i%3)*3,0,Math.PI*2);ctx.fill();\n        }\n      }\n      ctx.fillStyle='#fff';ctx.font='bold 13px sans-serif';\n      ctx.fillText('RPG 지역: '+(v.maps[v.mapIndex]||'월드'),18,111);\n      ctx.font='10px sans-serif';ctx.fillText('지역 선택',14,227);\n      for(let i=0;i<v.maps.length;i++){\n        const sw=418/v.maps.length,x=12+i*sw;\n        ctx.fillStyle=i===v.mapIndex?'#f0cc70':'#355064';ctx.fillRect(x,234,sw-3,27);\n        ctx.fillStyle=i===v.mapIndex?'#192d35':'#f3f9fa';ctx.font='10px sans-serif';\n        ctx.fillText(v.maps[i].slice(0,6),x+3,251);\n      }\n      // Procedural decorative graphics, with a visible count tied to the requested content.\n      for(let i=0;i<v.sprites.length;i++){\n        const x=20+(i%8)*52,y=282,name=v.sprites[i];\n        if(/나무|tree/i.test(name)){\n          ctx.fillStyle='#917052';ctx.fillRect(x+9,y-8,6,15);\n          ctx.fillStyle='#76d0a1';ctx.beginPath();ctx.arc(x+12,y-12,9,0,Math.PI*2);ctx.fill();\n        }else if(/구름|cloud/i.test(name)){\n          ctx.fillStyle='#eaf4fa';ctx.beginPath();\n          ctx.arc(x+7,y-8,7,0,Math.PI*2);ctx.arc(x+17,y-11,8,0,Math.PI*2);ctx.fill();\n        }else{\n          ctx.fillStyle=i%2?'#d4b778':'#73cfbb';ctx.beginPath();\n          ctx.moveTo(x+12,y-18);ctx.lineTo(x+22,y+1);ctx.lineTo(x+2,y+1);ctx.fill();\n        }\n        ctx.fillStyle='#e1eef3';ctx.font='10px sans-serif';ctx.fillText(name.slice(0,4),x,y+18);\n      }\n      ctx.fillStyle='#e7f4f7';ctx.font='bold 12px sans-serif';ctx.fillText('타이쿤 시설 · 클릭해 탑승',13,316);\n      for(let i=0;i<v.facilities.length;i++){\n        const x=12+(i%4)*105,y=326+Math.floor(i/4)*55;\n        ctx.fillStyle=i===v.selectedFacility?'#e7c56e':'#294459';ctx.fillRect(x,y,100,51);\n        ctx.strokeStyle='#132f41';ctx.lineWidth=2;\n        const label=v.facilities[i];\n        if(/관람차|ferris|wheel/i.test(label)||i%3===0){\n          ctx.beginPath();ctx.arc(x+23,y+20,12,0,Math.PI*2);ctx.stroke();\n          for(let spoke=0;spoke<6;spoke++){\n            const a=clock*(i===v.selectedFacility?2:0.3)+spoke*Math.PI/3;\n            ctx.beginPath();ctx.moveTo(x+23,y+20);ctx.lineTo(x+23+12*Math.cos(a),y+20+12*Math.sin(a));ctx.stroke();\n          }\n        }else if(/회전목마|carousel|merry/i.test(label)||i%3===1){\n          ctx.fillStyle='#bde7de';ctx.fillRect(x+20,y+11,3,24);\n          ctx.beginPath();ctx.moveTo(x+5,y+15);ctx.lineTo(x+21,y+4);ctx.lineTo(x+37,y+15);ctx.fill();\n          for(let horse=0;horse<3;horse++){\n            ctx.fillStyle='#e9d7aa';ctx.beginPath();\n            ctx.arc(x+9+horse*12,y+29+Math.sin(clock*3+horse)*2,4,0,Math.PI*2);ctx.fill();\n          }\n        }else{\n          ctx.beginPath();ctx.moveTo(x+7,y+24);ctx.lineTo(x+15,y+8);\n          ctx.lineTo(x+23,y+25);ctx.lineTo(x+33,y+9);ctx.stroke();\n        }\n        ctx.fillStyle=i===v.selectedFacility?'#192b3a':'#f4f7fc';ctx.font='10px sans-serif';\n        ctx.fillText(v.facilities[i].slice(0,8),x+40,y+28);\n      }\n      ctx.fillStyle='#9ecbd3';ctx.font='11px sans-serif';\n      ctx.fillText('선택 시설: '+(v.facilities[v.selectedFacility]||'없음'),12,495);\n      for(let i=0;i<v.actions.length;i++){\n        const x=12+(i%4)*105,y=506+Math.floor(i/4)*25;\n        ctx.fillStyle=i===v.actionIndex?'#efbd62':'#426b79';ctx.fillRect(x,y,99,22);\n        ctx.fillStyle='#142b35';ctx.font='11px sans-serif';ctx.fillText(v.actions[i].slice(0,9),x+6,y+15);\n      }\n      ctx.fillStyle='#b3dfe7';ctx.font='11px sans-serif';\n      ctx.fillText('액션: '+(v.actions[v.actionIndex]||'없음')+' · 모션: '+(v.motions[v.motionIndex]||'기본'),12,567);\n      // Actions and motions have distinct source-generated poses, movement and attack effects.\n      const pulse=Math.max(0,1-(clock-v.actionAt)/0.8);\n      const action=v.actions[v.actionIndex]||'',motion=v.motions[v.motionIndex]||'';\n      const dash=/대시|질주|dash/i.test(action),jump=/점프|jump/i.test(action);\n      const strike=/공격|베기|attack|slash/i.test(action),spin=/회전|spin/i.test(motion);\n      const run=/달리|뛰기|run/i.test(motion),dance=/춤|댄스|dance/i.test(motion);\n      const walk=/걷|walk/i.test(motion);\n      const hopping=run?Math.abs(Math.sin(clock*11))*7:walk?Math.abs(Math.sin(clock*5))*4:\n        dance?Math.abs(Math.sin(clock*7))*10:0;\n      const ax=375+(dash?30*pulse:0)+(walk?Math.sin(clock*5)*5:0);\n      const ay=552-hopping-(jump?24*Math.sin(pulse*Math.PI):0);\n      const arms=dance?Math.sin(clock*8)*13:strike?18*pulse:0;\n      ctx.save();ctx.translate(ax,ay);if(spin)ctx.rotate(Math.sin(clock*3)*0.5);\n      ctx.fillStyle='#f1d1a9';ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.fill();\n      ctx.strokeStyle='#e1f5ef';ctx.lineWidth=3;ctx.beginPath();\n      ctx.moveTo(0,8);ctx.lineTo(0,19);ctx.moveTo(0,11);\n      ctx.lineTo(-11,-arms+13);ctx.moveTo(0,11);ctx.lineTo(11,arms+13);\n      ctx.moveTo(0,19);ctx.lineTo(-7,28+(run?Math.sin(clock*11)*7:0));\n      ctx.moveTo(0,19);ctx.lineTo(7,28-(run?Math.sin(clock*11)*7:0));\n      ctx.stroke();ctx.restore();\n      if(strike&&pulse>0){ctx.strokeStyle='#ffd46d';ctx.lineWidth=3;ctx.beginPath();\n        ctx.arc(ax+20,ay+6,13,Math.PI*1.4,Math.PI*2.7);ctx.stroke();}\n      if(dash&&pulse>0){ctx.strokeStyle='#8de4ef';ctx.beginPath();\n        ctx.moveTo(ax-15,ay+5);ctx.lineTo(ax-40,ay+5);ctx.stroke();}\n      ctx.restore();\n    }\n  }\n";
const click = "\n  // VIBE_VOLUME_PACK: scene selectors and ride/action interactions share the game's input handler.\n  {\n    const v=__VOLUME__, w=Number(__CANVAS__.width),h=Number(__CANVAS__.height);\n    const _x=__INPUT_X__,_y=__INPUT_Y__;\n    if(Number.isFinite(w)&&Number.isFinite(h)&&w>=320&&h>=300&&\n       Number.isFinite(_x)&&Number.isFinite(_y)){\n      const rx=(_x-w*0.56)/(w*0.42)*440,ry=(_y-h*0.04)/(h*0.9)*600;\n      if(rx>=0&&rx<440&&ry>=0&&ry<600){\n        const n=v.backgrounds.length;\n        if(ry>=54&&ry<82&&n){v.backgroundIndex=Math.min(n-1,Math.floor((rx-10)/(420/n)));v.backgroundIndex=Math.max(0,v.backgroundIndex);}\n        else if(ry>=234&&ry<261&&v.maps.length){\n          v.mapIndex=Math.max(0,Math.min(v.maps.length-1,Math.floor((rx-12)/(418/v.maps.length))));\n        }else if(ry>=326&&ry<491){\n          const col=Math.floor((rx-12)/105),row=Math.floor((ry-326)/55),index=row*4+col;\n          if(col>=0&&col<4&&row>=0&&row<3&&index<v.facilities.length){\n            v.selectedFacility=index;v.actionAt=Math.max(v.time,(Date.now()-v.started)/1000);\n          }\n        }else if(ry>=506&&ry<556){\n          const col=Math.floor((rx-12)/105),row=Math.floor((ry-506)/25),index=row*4+col;\n          if(col>=0&&col<4&&row>=0&&row<2&&index<v.actions.length){\n            v.actionIndex=index;v.actionAt=Math.max(v.time,(Date.now()-v.started)/1000);\n          }\n        }else if(ry>=557&&v.motions.length){v.motionIndex=(v.motionIndex+1)%v.motions.length;}\n        return;\n      }\n    }\n  }\n";
const tick = "\n  // VIBE_VOLUME_PACK: reuse the existing game update clock; no extra animation loop.\n  __VOLUME__.time += Math.min(0.05,Math.max(0,Number(__DT__)||0));\n";

function generateInsertion(request,index){
 const render=choose(index,'render',request,true);
 const interact=choose(index,'interact',request,true);
 const update=choose(index,'update',request,false);
 if(render.path!==interact.path||update&&update.path!==render.path)
  throw Error('VIBE59_VOLUME_DIFFERENT_GAME_MODULE');
 const owners=[render,interact,...update?[update]:[]];
 if(new Set(owners.map(s=>s.id)).size!==owners.length)throw Error('VIBE59_VOLUME_FUNCTION_CONFLICT');
 if(owners.some(s=>s.lexicalScope.join(',')!==render.lexicalScope.join(',')||
   s.parent||s.ambiguous||s.unsupported.length))
  throw Error('VIBE59_VOLUME_FUNCTION_SCOPE');
 const file=index.files.find(f=>f.path===render.path);
 if(!file||!/\.(?:js|mjs|cjs|html?)$/i.test(file.path)||file.source.includes('VIBE_VOLUME_PACK'))
  throw Error('VIBE59_VOLUME_SOURCE_SCOPE');
 if(/(?:export\s+|async\s+)$/.test(file.source.slice(Math.max(0,render.start-14),render.start)))
  throw Error('VIBE59_VOLUME_RENDER_DECLARATION');
 if(render.parameters.length!==1||interact.parameters.length<1||interact.parameters.length>2||
  update&&(update.parameters.length!==1))
  throw Error('VIBE59_VOLUME_FUNCTION_PARAMETERS');
 const ctx=render.parameters[0],clickArg=interact.parameters;
 if(!new RegExp('\\b'+ctx+'\\s*\\.\\s*(?:fillRect|drawImage|canvas|beginPath)\\b').test(file.code.slice(render.bodyStart,render.bodyEnd)))
  throw Error('VIBE59_VOLUME_CANVAS_CONTEXT_UNPROVEN');
 // Bind input coordinates to the original canvas owner, never to a render-only parameter.
 const clickScope=interact.lexicalScope.join(',');
 const declared=name=>[...file.code.matchAll(new RegExp('\\b(?:const|let|var)\\s+'+name+'\\b','g'))]
  .filter(m=>m.index<interact.start&&sourceScopeAt(file.code,m.index,'web').join(',')===clickScope).length===1;
 const canvasRefs=[...new Set([...file.source.matchAll(/\b([A-Za-z_$][\w$]*)\.getContext\(\s*['"]2d['"]\s*\)/g)]
  .filter(m=>file.code.slice(m.index,m.index+m[1].length)===m[1]&&declared(m[1])).map(m=>m[1]))];
 if(canvasRefs.length>1)throw Error('VIBE59_VOLUME_AMBIGUOUS_CANVAS');
 let canvasRef=canvasRefs[0]||null;
 const requestedCanvas=request.bindings.canvas;
 if(requestedCanvas!==undefined){
  if(!SAFE_IDENTIFIER.test(requestedCanvas)||!declared(requestedCanvas))
   throw Error('VIBE59_VOLUME_CANVAS_BINDING');
  canvasRef=requestedCanvas;
 }
 if(!canvasRef)throw Error('VIBE59_VOLUME_CANVAS_BINDING');
 // New panel clicks may be handled locally only when the existing handler has no valued-return contract.
 if(/\breturn\s+(?![;\r\n}])\S/.test(file.code.slice(interact.bodyStart,interact.bodyEnd)))
  throw Error('VIBE59_VOLUME_CLICK_RETURN_CONTRACT');
 const clickText=clickArg.length===2
  ?click.replaceAll('__INPUT_X__',clickArg[0]).replaceAll('__INPUT_Y__',clickArg[1])
  :click.replaceAll('__INPUT_X__',clickArg[0]+'.offsetX').replaceAll('__INPUT_Y__',clickArg[0]+'.offsetY');
 const id='__vibeVolume_'+sourceDigest(JSON.stringify([file.path,request])).slice(0,12);
 const initial={
  facilities:request.facilities,maps:request.maps,backgrounds:request.backgrounds,
  sprites:request.sprites,actions:request.actions,motions:request.motions,
  selectedFacility:request.facilities.length?0:-1,mapIndex:0,backgroundIndex:0,
  actionIndex:0,motionIndex:0,time:0,actionAt:0,started:0
 };
 const code='const '+id+' = '+JSON.stringify(initial)+';\n'+id+'.started = Date.now();\n';
 const substitutions=text=>text.replaceAll('__VOLUME__',id).replaceAll('ctx',ctx);
 const draw=substitutions(paint);
 // These source-bound edits are independent functions; same-file atomic apply remains the canonical worker's job.
 const renderFind=file.source.slice(render.start,render.end);
 const cut=render.bodyEnd-render.start;
 const renderReplace=code+renderFind.slice(0,cut)+'\n'+draw+'\n'+renderFind.slice(cut);
 const edits=[{path:file.path,find:renderFind,replace:renderReplace},
   makePatch(file,interact,clickText.replaceAll('__VOLUME__',id).replaceAll('__CANVAS__',canvasRef),'start')];
 if(update){
  edits.push(makePatch(file,update,tick.replaceAll('__VOLUME__',id).replaceAll('__DT__',update.parameters[0]),'start'));
 }
 return {edits,ownerFunctions:owners.map(s=>s.name),gameFile:file.path,contentCounts:
  Object.fromEntries(Object.entries(LIMITS).map(([k])=>[k,request[k].length]))};
}

export function createVibe59OneShotVolumeCandidate({order={},sourceRoot='',responsibleFiles=[],
 target='',repositoryRoot=process.cwd()}={}){
 const request=readRequest(order);
 if(!request)return null;
 if(order.ownerApproved!==true&&order.selectedTask?.ownerDirective!==true)
  throw Error('VIBE59_VOLUME_OWNER_APPROVAL_REQUIRED');
 if(target!=='web')throw Error('VIBE59_VOLUME_WEB_CANVAS_ONLY');
 const spec=normalize(request);
 const catalog=JSON.parse(fs.readFileSync(path.join(repositoryRoot,'game-catalog.json'),'utf8'));
 const gameId=String(order.selectedTask?.gameId||order.gameId||'');
 resolveGameSourceScope({repositoryRoot,sourceRoot,gameId,target,catalog});
 const index=buildGameSourceIndex({sourceRoot,responsibleFiles,target,
  baseRevisionSha:String(order.baseRevisionSha||order.baseCommit||order.sourceRevision||'')});
 const {edits,ownerFunctions,gameFile,contentCounts}=generateInsertion(spec,index);
 const docs=new Map(index.files.map(file=>{
  const source=fs.readFileSync(safeSourceFile(sourceRoot,file.path),'utf8');
  if(sourceDigest(source)!==file.sourceSha256)throw Error('VIBE59_VOLUME_STALE_GAME_SOURCE');
  return [file.path,source];
 }));
 applyExactEdits(sourceRoot,edits,{documents:docs});
 const rendered=docs.get(gameFile);
 // Only concrete JS syntax proof, never evidence of a real browser/game publication.
 if(!/\.html?$/i.test(gameFile))new vm.Script(rendered,{filename:gameFile});
 else new vm.Script(scriptText(rendered,true),{filename:gameFile});
 return {
  summary:'한 번에 시설·지역·배경·그래픽·액션·모션 추가',
  expectedEffect:'기존 게임 렌더링·입력·업데이트 함수에 플레이 가능한 벡터 월드 콘텐츠 확장',
  edits,newFiles:[],replaceFiles:[],tests:[],
  vibe59CodeKind:'ONE_SHOT_GAME_VOLUME',vibe59DesignSteps:ownerFunctions.map((name,i)=>({
   id:'volume-'+name,operation:['RENDER_PROCEDURAL_VOLUME','HANDLE_CONTENT_INTERACTION','UPDATE_EXISTING_ANIMATION'][i]})),
  vibe59TestPlan:{pass:true,authority:'LOCAL_SOURCE_SYNTAX_ONLY',
   cases:[{name:'content-count',contentCounts},{name:'source-owners',ownerFunctions}],independentGameQa:false},
  volumePack:{gameFile,ownerFunctions,contentCounts,graphics:'CANVAS_PROCEDURAL',
   interaction:'EXISTING_INPUT_HANDLER',saveSchemaChanged:false},
  ruleDigest:sourceDigest(JSON.stringify(edits)),sourceWrite:false,modelUsed:false,runtimeVerified:false,
  releaseVerified:false};
}
