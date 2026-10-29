// Vibe5.9: one owner-scoped request generates playable canvas content in existing Web game functions.
// No alternate execution pipeline, persistent-save keys, network writes, external assets or release claims.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {buildGameSourceIndex,resolveGameSourceScope,safeSourceFile,sourceDigest,scriptText,sourceScopeAt} from './vibe2-game-source-index.mjs';
import {applyExactEdits} from './autonomous-safe-edit.mjs';

const CATEGORIES=Object.freeze({
 facilities:['타이쿤 놀이 시설','타이쿤 놀이시설','타이쿤 시설','놀이 시설','놀이시설','타이쿤시설','시설','facility','facilities'],
 maps:['RPG 맵','rpg map','RPG맵','rpg맵','맵','지역','map','maps','biome'],
 backgrounds:['배경','background','backgrounds'],
 sprites:['그래픽','장식','오브젝트','sprite','sprites','graphics'],
 actions:['액션','행동','action','actions'],
 motions:['모션','애니메이션','동작','motion','motions','animations']
});
const FUNCTION_DEFAULTS=Object.freeze({
 render:['render','draw','drawGame','renderGame','paint'],
 interact:['handleClick','onClick','click','pointerDown','handlePointerDown'],
 update:['update','tick','updateGame','step'],
 keyboard:['handleKeydown','handleKeyDown','onKeyDown','keyDown','handleKey','onKey']
});
const LIMITS=Object.freeze({facilities:12,maps:8,backgrounds:6,sprites:8,actions:8,motions:8});
const SAFE_NAME=/^[\p{L}\p{N} _-]{1,24}$/u;
const SAFE_IDENTIFIER=/^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/;
const HEAD=/^(?:(?:한\s*번에|한\s*방에)\s*)?(?:웹\s*)?(?:게임\s*)?볼륨\s*(?:한\s*번에\s*)?(?:추가|확장)\s*:\s*/i;

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
 for(const key of ['render','interact','update','keyboard'])
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

const paint = "\n  // VIBE_VOLUME_PACK: procedural gameplay area, directly in the existing renderer.\n  {\n    const v=__VOLUME__, w=Number(ctx.canvas && ctx.canvas.width), h=Number(ctx.canvas && ctx.canvas.height);\n    if(Number.isFinite(w)&&Number.isFinite(h)&&w>=320&&h>=300){\n      if(v.open){\n      const compact=w<720;\n      const left=compact?w*0.05:w*0.56,top=compact?h*0.06:h*0.04;\n      const width=compact?w*0.90:w*0.42,height=compact?h*0.86:h*0.90;\n      const clock=v.reduceMotion?0:Math.max(v.time,(Date.now()-v.started)/1000);\n      const colors=['#386c7c','#477b61','#bb8a51','#697ab2','#8b608e','#457c84'];\n      const biome=v.maps[v.mapIndex]||'';\n      const skyName=v.backgrounds[v.backgroundIndex]||'';\n      const desert=/사막|desert/i.test(biome),snow=/설원|눈|snow|ice/i.test(biome);\n      const night=/밤|야간|night|우주|space/i.test(skyName);\n      const dusk=/노을|황혼|sunset|dusk/i.test(skyName);\n      const color=desert?'#b99556':snow?'#b1d5e4':colors[v.mapIndex%colors.length];\n      const bg=night?'#1e3052':dusk?'#c96f5e':'#5a9bb2';\n      ctx.save();ctx.translate(left,top);ctx.scale(width/440,height/600);\n      ctx.fillStyle='#14212f';ctx.globalAlpha=0.96;ctx.fillRect(0,0,440,600);ctx.globalAlpha=1;\n      ctx.fillStyle='#eef5f8';ctx.font='bold 18px sans-serif';ctx.fillText('GAME WORLD+',14,27);\n      ctx.font='11px sans-serif';ctx.fillStyle='#a8cbd4';ctx.fillText('시설 · 탐험 · 액션 · 모션',14,43);\n      const tabs=['월드','상태','시설','지도','목표'],extraTabs=['가방','장비','제작','퀘스트','상점'];\n      if(compact){\n        // One large, reachable menu button instead of five tiny phone targets.\n        ctx.fillStyle=v.menuOpen?'#e6c678':'#355568';ctx.fillRect(280,5,151,43);\n        ctx.fillStyle=v.menuOpen?'#142636':'#eef8fa';ctx.font='bold 17px sans-serif';\n        ctx.fillText(v.menuOpen?'메뉴 닫기':'화면 메뉴',313,32);\n      }else{\n        ctx.fillStyle='#426576';ctx.fillRect(10,8,180,28);\n        ctx.fillStyle='#f4f8fb';ctx.font='bold 12px sans-serif';\n        ctx.fillText('생활 메뉴',22,27);\n      }\n      if(!compact)for(let i=0;i<tabs.length;i++){\n        const x=205+i*46;\n        ctx.fillStyle=v.tab===tabs[i]?'#e6c678':'#355568';ctx.fillRect(x,8,43,28);\n        ctx.fillStyle=v.tab===tabs[i]?'#142636':'#eef8fa';ctx.font='bold 11px sans-serif';\n        ctx.fillText(tabs[i],x+8,27);\n      }\n      if(v.tab==='월드'){\n      // Selectable background thumbnails.\n      for(let i=0;i<v.backgrounds.length;i++){\n        const n=v.backgrounds.length,x=10+i*420/n,sw=420/n-4;\n        ctx.fillStyle=i===v.backgroundIndex?'#e8c976':bg;ctx.fillRect(x,54,sw,28);\n        ctx.fillStyle='#16202b';ctx.font='11px sans-serif';ctx.fillText(v.backgrounds[i].slice(0,8),x+4,72);\n      }\n      // Draw game world using the selected map, with tiles and real procedural scenery.\n      ctx.fillStyle=bg;ctx.fillRect(9,91,422,120);\n      ctx.fillStyle=color;ctx.fillRect(9,145,422,66);\n      ctx.fillStyle=night?'#e7eef7':'#ffe2a0';ctx.beginPath();\n      ctx.arc(night?375:342,night?115:120,night?9:19,0,Math.PI*2);ctx.fill();\n      if(night)for(let i=0;i<12;i++){ctx.fillRect(18+(i*71)%391,102+(i*23)%36,2,2);}\n      ctx.globalAlpha=0.28;ctx.fillStyle=snow?'#fff':'#d7e7e1';\n      for(let c=0;c<5;c++){ctx.beginPath();ctx.arc(42+c*91,135+(c%2)*17,25,0,Math.PI*2);ctx.fill();}\n      ctx.globalAlpha=1;\n      for(let i=0;i<9;i++){\n        const bx=23+(i%5)*88,by=162+Math.floor(i/5)*27;\n        if(desert){\n          ctx.fillStyle='#4a8867';ctx.fillRect(bx+3,by-4,6,24);\n          ctx.fillRect(bx-3,by+5,15,4);\n        }else if(snow){\n          ctx.fillStyle='#395f79';ctx.fillRect(bx+3,by+6,5,13);\n          ctx.fillStyle='#edf8fa';ctx.beginPath();\n          ctx.moveTo(bx+5,by-14);ctx.lineTo(bx-9,by+11);ctx.lineTo(bx+19,by+11);ctx.fill();\n        }else{\n          ctx.fillStyle='#4b5c54';ctx.fillRect(bx,by,8,16);\n          ctx.fillStyle='#79c49c';ctx.beginPath();\n          ctx.arc(bx+4,by-2,10+(i%3)*3,0,Math.PI*2);ctx.fill();\n        }\n      }\n      ctx.fillStyle='#fff';ctx.font='bold 13px sans-serif';\n      ctx.fillText('RPG 지역: '+(v.maps[v.mapIndex]||'월드'),18,111);\n      ctx.font='bold 11px sans-serif';ctx.fillStyle='#edf7ec';\n      ctx.fillText('방문 '+v.visitedMaps.filter(Boolean).length+' · 체험 '+v.rides+' · 액션 '+v.actionsDone,18,201);\n      ctx.font='10px sans-serif';ctx.fillText('지역 선택',14,227);\n      for(let i=0;i<v.maps.length;i++){\n        const sw=418/v.maps.length,x=12+i*sw;\n        ctx.fillStyle=i===v.mapIndex?'#f0cc70':'#355064';ctx.fillRect(x,234,sw-3,27);\n        ctx.fillStyle=i===v.mapIndex?'#192d35':'#f3f9fa';ctx.font='10px sans-serif';\n        ctx.fillText(v.maps[i].slice(0,6),x+3,251);\n      }\n      // Procedural decorative graphics, with a visible count tied to the requested content.\n      for(let i=0;i<v.sprites.length;i++){\n        const x=20+(i%8)*52,y=282,name=v.sprites[i];\n        if(/나무|tree/i.test(name)){\n          ctx.fillStyle='#917052';ctx.fillRect(x+9,y-8,6,15);\n          ctx.fillStyle='#76d0a1';ctx.beginPath();ctx.arc(x+12,y-12,9,0,Math.PI*2);ctx.fill();\n        }else if(/구름|cloud/i.test(name)){\n          ctx.fillStyle='#eaf4fa';ctx.beginPath();\n          ctx.arc(x+7,y-8,7,0,Math.PI*2);ctx.arc(x+17,y-11,8,0,Math.PI*2);ctx.fill();\n        }else{\n          ctx.fillStyle=i%2?'#d4b778':'#73cfbb';ctx.beginPath();\n          ctx.moveTo(x+12,y-18);ctx.lineTo(x+22,y+1);ctx.lineTo(x+2,y+1);ctx.fill();\n        }\n        ctx.fillStyle='#e1eef3';ctx.font='10px sans-serif';ctx.fillText(name.slice(0,4),x,y+18);\n      }\n      ctx.fillStyle='#e7f4f7';ctx.font='bold 12px sans-serif';ctx.fillText('타이쿤 시설 · 클릭해 탑승',13,316);\n      for(let i=0;i<v.facilities.length;i++){\n        const x=12+(i%4)*105,y=326+Math.floor(i/4)*55;\n        ctx.fillStyle=i===v.selectedFacility?'#e7c56e':'#294459';ctx.fillRect(x,y,100,51);\n        ctx.strokeStyle='#132f41';ctx.lineWidth=2;\n        const label=v.facilities[i];\n        if(/관람차|ferris|wheel/i.test(label)||i%3===0){\n          ctx.beginPath();ctx.arc(x+23,y+20,12,0,Math.PI*2);ctx.stroke();\n          for(let spoke=0;spoke<6;spoke++){\n            const a=clock*(i===v.selectedFacility?2:0.3)+spoke*Math.PI/3;\n            ctx.beginPath();ctx.moveTo(x+23,y+20);ctx.lineTo(x+23+12*Math.cos(a),y+20+12*Math.sin(a));ctx.stroke();\n          }\n        }else if(/회전목마|carousel|merry/i.test(label)||i%3===1){\n          ctx.fillStyle='#bde7de';ctx.fillRect(x+20,y+11,3,24);\n          ctx.beginPath();ctx.moveTo(x+5,y+15);ctx.lineTo(x+21,y+4);ctx.lineTo(x+37,y+15);ctx.fill();\n          for(let horse=0;horse<3;horse++){\n            ctx.fillStyle='#e9d7aa';ctx.beginPath();\n            ctx.arc(x+9+horse*12,y+29+Math.sin(clock*3+horse)*2,4,0,Math.PI*2);ctx.fill();\n          }\n        }else{\n          ctx.beginPath();ctx.moveTo(x+7,y+24);ctx.lineTo(x+15,y+8);\n          ctx.lineTo(x+23,y+25);ctx.lineTo(x+33,y+9);ctx.stroke();\n        }\n        ctx.fillStyle=i===v.selectedFacility?'#192b3a':'#f4f7fc';ctx.font='10px sans-serif';\n        ctx.fillText(v.facilities[i].slice(0,8),x+40,y+28);\n      }\n      ctx.fillStyle='#9ecbd3';ctx.font='11px sans-serif';\n      ctx.fillText('선택 시설: '+(v.facilities[v.selectedFacility]||'없음'),12,495);\n      for(let i=0;i<v.actions.length;i++){\n        const x=12+(i%4)*105,y=506+Math.floor(i/4)*25;\n        ctx.fillStyle=i===v.actionIndex?'#efbd62':'#426b79';ctx.fillRect(x,y,99,22);\n        ctx.fillStyle='#142b35';ctx.font='11px sans-serif';ctx.fillText(v.actions[i].slice(0,9),x+6,y+15);\n      }\n      ctx.fillStyle='#b3dfe7';ctx.font='11px sans-serif';\n      ctx.fillText('액션: '+(v.actions[v.actionIndex]||'없음')+' · 모션: '+(v.motions[v.motionIndex]||'기본'),12,567);\n      ctx.fillText('코인 '+v.coins+' · 재료 '+v.materials.reduce((a,b)=>a+b,0),12,590);\n      // Actions and motions have distinct source-generated poses, movement and attack effects.\n      const pulse=v.reduceMotion?0:Math.max(0,1-(clock-v.actionAt)/0.8);\n      const action=v.actions[v.actionIndex]||'',motion=v.motions[v.motionIndex]||'';\n      const dash=/대시|질주|dash/i.test(action),jump=/점프|jump/i.test(action);\n      const strike=/공격|베기|attack|slash/i.test(action),spin=/회전|spin/i.test(motion);\n      const run=/달리|뛰기|run/i.test(motion),dance=/춤|댄스|dance/i.test(motion);\n      const walk=/걷|walk/i.test(motion);\n      const hopping=run?Math.abs(Math.sin(clock*11))*7:walk?Math.abs(Math.sin(clock*5))*4:\n        dance?Math.abs(Math.sin(clock*7))*10:0;\n      const ax=375+(dash?30*pulse:0)+(walk?Math.sin(clock*5)*5:0);\n      const ay=552-hopping-(jump?24*Math.sin(pulse*Math.PI):0);\n      const arms=dance?Math.sin(clock*8)*13:strike?18*pulse:0;\n      ctx.save();ctx.translate(ax,ay);if(spin)ctx.rotate(Math.sin(clock*3)*0.5);\n      ctx.fillStyle='#f1d1a9';ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.fill();\n      ctx.strokeStyle='#e1f5ef';ctx.lineWidth=3;ctx.beginPath();\n      ctx.moveTo(0,8);ctx.lineTo(0,19);ctx.moveTo(0,11);\n      ctx.lineTo(-11,-arms+13);ctx.moveTo(0,11);ctx.lineTo(11,arms+13);\n      ctx.moveTo(0,19);ctx.lineTo(-7,28+(run?Math.sin(clock*11)*7:0));\n      ctx.moveTo(0,19);ctx.lineTo(7,28-(run?Math.sin(clock*11)*7:0));\n      ctx.stroke();ctx.restore();\n      if(strike&&pulse>0){ctx.strokeStyle='#ffd46d';ctx.lineWidth=3;ctx.beginPath();\n        ctx.arc(ax+20,ay+6,13,Math.PI*1.4,Math.PI*2.7);ctx.stroke();}\n      if(dash&&pulse>0){ctx.strokeStyle='#8de4ef';ctx.beginPath();\n        ctx.moveTo(ax-15,ay+5);ctx.lineTo(ax-40,ay+5);ctx.stroke();}\n\n      }else{\n        const visited=v.visitedMaps.filter(Boolean).length;\n        const facilityName=v.facilities[v.selectedFacility]||'시설 없음';\n        const actionName=v.actions[v.actionIndex]||'동작 없음';\n        const goals=[\n          {name:'새로운 지역 둘러보기',value:visited,target:Math.min(2,v.maps.length),hint:'지도 탭에서 방문할 지역 선택'},\n          {name:'놀이 시설 체험하기',value:v.rides,target:v.facilities.length?1:0,hint:'시설 탭에서 체험하기'},\n          {name:'액션 두 번 사용하기',value:v.actionsDone,target:v.actions.length?2:0,hint:'월드 탭에서 액션 선택'}\n        ];\n        if(v.tab==='상태'){\n          ctx.fillStyle='#f2d59b';ctx.font='bold 23px sans-serif';ctx.fillText('플레이 상태창',18,88);\n          ctx.fillStyle='#a9c8d3';ctx.font='12px sans-serif';\n          ctx.fillText('기존 게임 저장값과 분리된 콘텐츠 체험 정보',18,110);\n          const status=[\n            ['탐험',visited+' / '+v.maps.length,'현재 지역 · '+(v.maps[v.mapIndex]||'없음')],\n            ['시설',String(v.rides)+' 회','선택 · '+facilityName],\n            ['액션',String(v.actionsDone)+' 회','현재 · '+actionName]\n          ];\n          for(let i=0;i<status.length;i++){\n            const y=130+i*97,box=status[i];\n            ctx.fillStyle='#29475c';ctx.fillRect(17,y,408,83);\n            ctx.fillStyle='#a6dce0';ctx.font='bold 14px sans-serif';ctx.fillText(box[0],30,y+23);\n            ctx.fillStyle='#ffdf8e';ctx.font='bold 24px sans-serif';ctx.fillText(box[1],310,y+32);\n            ctx.fillStyle='#edf4f5';ctx.font='12px sans-serif';ctx.fillText(box[2].slice(0,35),30,y+59);\n          }\n          ctx.fillStyle=v.reduceMotion?'#d5ab71':'#4c8d83';ctx.fillRect(17,440,408,57);\n          ctx.fillStyle='#172c35';ctx.font='bold 16px sans-serif';\n          ctx.fillText('움직임 줄이기: '+(v.reduceMotion?'켜짐':'꺼짐'),30,477);\n          ctx.fillStyle='#bdd8e0';ctx.font='12px sans-serif';\n          ctx.fillText('화면을 눌러 애니메이션 효과를 전환할 수 있어',18,518);\n          ctx.fillText('위쪽 탭으로 상태 / 시설 / 지도 / 목표창 이동',18,542);\n          ctx.fillText('마지막 활동: '+v.lastEvent.slice(0,32),18,572);\n        }else if(v.tab==='시설'){\n          ctx.fillStyle='#f2d59b';ctx.font='bold 22px sans-serif';ctx.fillText('놀이 시설 정보창',18,81);\n          ctx.fillStyle='#a9c8d3';ctx.font='11px sans-serif';\n          ctx.fillText('시설을 선택하면 아래에서 체험할 수 있어',18,100);\n          for(let i=0;i<v.facilities.length;i++){\n            const x=14+(i%2)*211,y=110+Math.floor(i/2)*62;\n            ctx.fillStyle=i===v.selectedFacility?'#dfbc6e':'#29475b';ctx.fillRect(x,y,204,54);\n            ctx.fillStyle=i===v.selectedFacility?'#193145':'#ecf4f7';\n            ctx.font='bold 12px sans-serif';ctx.fillText(v.facilities[i].slice(0,12),x+9,y+20);\n            ctx.font='10px sans-serif';ctx.fillText('이용 '+v.rideCounts[i]+'회',x+9,y+40);\n          }\n          ctx.fillStyle='#c6dee1';ctx.font='12px sans-serif';ctx.fillText('선택: '+facilityName,18,500);\n          ctx.fillStyle='#f2c86b';ctx.fillRect(14,517,202,63);\n          ctx.fillStyle='#4a8994';ctx.fillRect(224,517,202,63);\n          ctx.fillStyle='#152d3a';ctx.font='bold 18px sans-serif';\n          ctx.fillText('체험하기',68,555);ctx.fillText('다음 시설',278,555);\n        }else if(v.tab==='지도'){\n          ctx.fillStyle='#f2d59b';ctx.font='bold 22px sans-serif';ctx.fillText('RPG 탐험 미니맵',18,83);\n          ctx.fillStyle='#a9c8d3';ctx.font='12px sans-serif';\n          ctx.fillText('지역을 눌러 이동해. 방문한 지역은 체크 표시돼.',18,105);\n          for(let i=0;i<v.maps.length;i++){\n            const x=17+(i%2)*211,y=118+Math.floor(i/2)*105;\n            ctx.fillStyle=i===v.mapIndex?'#e9c87b':'#32566a';ctx.fillRect(x,y,199,90);\n            ctx.fillStyle=i===v.mapIndex?'#153047':'#dfeff4';ctx.font='bold 15px sans-serif';\n            ctx.fillText((i===v.mapIndex?'● ':'○ ')+v.maps[i].slice(0,10),x+11,y+33);\n            ctx.font='12px sans-serif';ctx.fillText(v.visitedMaps[i]?'✓ 방문 완료':'아직 탐험하지 않음',x+11,y+62);\n          }\n          ctx.fillStyle='#c0dfe2';ctx.font='bold 13px sans-serif';\n          ctx.fillText('탐험한 지역: '+visited+' / '+v.maps.length,18,577);\n        }else if(v.tab==='목표'){\n          ctx.fillStyle='#f2d59b';ctx.font='bold 22px sans-serif';ctx.fillText('플레이 목표 / 진행도',18,83);\n          const total=goals.filter(g=>g.target>0).length;\n          const complete=goals.filter(g=>g.target>0&&g.value>=g.target).length;\n          ctx.fillStyle='#bcd8df';ctx.font='12px sans-serif';\n          ctx.fillText('이 콘텐츠 묶음의 목표 '+complete+' / '+total+' 완료',18,106);\n          for(let i=0;i<goals.length;i++){\n            const g=goals[i],y=128+i*139;\n            ctx.fillStyle='#2c4a5f';ctx.fillRect(17,y,408,124);\n            ctx.fillStyle='#f1f6f8';ctx.font='bold 15px sans-serif';ctx.fillText(g.name,28,y+28);\n            ctx.fillStyle='#ffdb8e';ctx.font='bold 14px sans-serif';\n            ctx.fillText(g.target?Math.min(g.value,g.target)+' / '+g.target:'해당 없음',334,y+29);\n            ctx.fillStyle='#14283a';ctx.fillRect(29,y+44,384,15);\n            ctx.fillStyle=g.target&&g.value>=g.target?'#83d6a0':'#e3b95b';\n            ctx.fillRect(29,y+44,384*(g.target?Math.min(1,g.value/g.target):0),15);\n            ctx.fillStyle='#b5d0d7';ctx.font='12px sans-serif';ctx.fillText(g.hint,29,y+89);\n            if(g.target&&g.value>=g.target){ctx.fillStyle='#89d8aa';ctx.fillText('완료!',350,y+105);}\n          }\n          ctx.fillStyle='#b8d5dc';ctx.font='12px sans-serif';\n          ctx.fillText('목표를 누르면 해당 플레이 화면으로 이동',18,576);\n        }else if(extraTabs.includes(v.tab)){\n          const title={가방:'인벤토리창',장비:'장비창',제작:'제작창',퀘스트:'퀘스트 목록',상점:'상점 UI'}[v.tab];\n          ctx.fillStyle='#f4d898';ctx.font='bold 23px sans-serif';ctx.fillText(title,18,83);\n          ctx.fillStyle='#b5d6df';ctx.font='12px sans-serif';\n          ctx.fillText('코인 '+v.coins+' · 제작 '+v.crafted+' · 구매 '+v.purchases+' · '+v.lastEvent.slice(0,25),18,104);\n          const entries=v.tab==='가방'?\n            [...v.maps.map((n,i)=>[n+' 재료','보유 '+v.materials[i]+' · 제작창 이동']),\n             ...v.facilities.map((n,i)=>[n+' 이용권','보유 '+v.tickets[i]+' · 시설 체험 사용'])]:\n            v.tab==='장비'?v.actions.map((n,i)=>[n+' 장비','보유 '+v.gearCounts[i]+' · '+(v.equipped===i?'장착 중':'눌러 착용')]):\n            v.tab==='제작'?v.actions.map((n,i)=>[n+' 장비 제작',\n              '필요 '+(v.maps.length?v.maps[i%v.maps.length]:'없음')+' 재료 2 · 보유 '+(v.maps.length?v.materials[i%v.maps.length]:0)]):\n            v.tab==='퀘스트'?goals.map((g,i)=>[g.name,(v.claimed[i]?'보상 수령 완료':\n              g.value>=g.target&&g.target>0?'눌러 코인 2 수령':'진행 중')+' · '+Math.min(g.value,g.target)+'/'+g.target]):\n            v.facilities.map((n,i)=>[n+' 이용권','코인 3 · 보유 '+v.tickets[i]+' · 구매하기']);\n          const page=v.pages[v.tab]||0;\n          for(let r=0;r<6;r++){\n            const item=entries[page*6+r];if(!item)break;\n            const y=117+r*65;ctx.fillStyle='#2f5065';ctx.fillRect(17,y,408,56);\n            ctx.fillStyle='#eff7fa';ctx.font='bold 15px sans-serif';ctx.fillText(item[0].slice(0,24),29,y+22);\n            ctx.fillStyle='#bdd7e1';ctx.font='12px sans-serif';ctx.fillText(item[1].slice(0,48),29,y+44);\n          }\n          ctx.fillStyle='#477686';ctx.fillRect(17,520,193,50);ctx.fillRect(229,520,194,50);\n          ctx.fillStyle='#f0f7fa';ctx.font='bold 17px sans-serif';\n          ctx.fillText('이전',80,550);ctx.fillText('다음',290,550);\n          ctx.font='12px sans-serif';ctx.fillText('페이지 '+(page+1)+' / '+Math.max(1,Math.ceil(entries.length/6)),18,590);\n        }\n      }\n      if(v.menuOpen){\n        const shown=v.menuPage?extraTabs:tabs;\n        ctx.globalAlpha=0.98;ctx.fillStyle='#142838';ctx.fillRect(15,68,410,525);ctx.globalAlpha=1;\n        for(let i=0;i<shown.length;i++){\n          const y=85+i*86;\n          ctx.fillStyle=v.tab===shown[i]?'#edcf83':'#3e6779';ctx.fillRect(25,y,390,72);\n          ctx.fillStyle=v.tab===shown[i]?'#183144':'#eef9fc';ctx.font='bold 24px sans-serif';\n          ctx.fillText(shown[i]+' 화면',47,y+46);\n        }\n        ctx.fillStyle='#e6c77a';ctx.fillRect(25,536,390,49);\n        ctx.fillStyle='#162d3d';ctx.font='bold 18px sans-serif';\n        ctx.fillText(v.menuPage?'기본 화면 5종 보기':'생활 기능 5종 보기',90,566);\n      }\n      ctx.restore();\n      }\n      // Toggle: on phones the full-size panel opens and closes without hiding gameplay permanently.\n      ctx.save();ctx.fillStyle='#152b3a';ctx.fillRect(w-90,5,85,28);\n      ctx.fillStyle='#e9f1f4';ctx.font='bold 12px sans-serif';\n      ctx.fillText(v.open?'CLOSE':'WORLD+',w-84,24);ctx.restore();\n    }\n  }\n";
const click = "\n  // VIBE_VOLUME_PACK: use the existing game click handler; overlay clicks never double-trigger gameplay.\n  {\n    const v=__VOLUME__,w=Number(__CANVAS__.width),h=Number(__CANVAS__.height);\n    const _x=__INPUT_X__,_y=__INPUT_Y__;\n    if(Number.isFinite(w)&&Number.isFinite(h)&&w>=320&&h>=300&&\n       Number.isFinite(_x)&&Number.isFinite(_y)){\n      if(_x>=w-90&&_x<w-5&&_y>=5&&_y<33){v.open=!v.open;return;}\n      if(v.open){\n        const compact=w<720;\n        const rx=(_x-w*(compact?0.05:0.56))/(w*(compact?0.90:0.42))*440;\n        const ry=(_y-h*(compact?0.06:0.04))/(h*(compact?0.86:0.90))*600;\n        if(rx>=0&&rx<440&&ry>=0&&ry<600){\n          const tabs=['월드','상태','시설','지도','목표'],extraTabs=['가방','장비','제작','퀘스트','상점'];\n          if(compact&&ry>=4&&ry<48&&rx>=280&&rx<432){\n            v.menuOpen=!v.menuOpen;if(v.menuOpen)v.menuPage=0;return;\n          }\n          if(!compact&&ry>=8&&ry<36&&rx>=10&&rx<190){\n            v.menuOpen=!v.menuOpen;if(v.menuOpen)v.menuPage=1;return;\n          }\n          if(v.menuOpen){\n            const shown=v.menuPage?extraTabs:tabs;\n            if(rx>=25&&rx<415&&ry>=85&&ry<525){\n              const i=Math.floor((ry-85)/86);\n              if(i>=0&&i<5&&ry-85-i*86<72){v.tab=shown[i];v.menuOpen=false;}\n            }else if(rx>=25&&rx<415&&ry>=536&&ry<585)v.menuPage=1-v.menuPage;\n            return;\n          }\n          if(!compact&&ry>=8&&ry<36&&rx>=205&&rx<432){\n            const index=Math.floor((rx-205)/46);\n            if(index>=0&&index<tabs.length){v.tab=tabs[index];return;}\n          }\n          const eventTime=()=>Math.max(v.time,(Date.now()-v.started)/1000);\n          const enterMap=i=>{\n            if(i>=0&&i<v.maps.length){\n              v.mapIndex=i;v.visitedMaps[i]=true;v.materials[i]++;\n              v.lastEvent='지역 탐험: '+v.maps[i]+' 재료 +1';\n            }\n          };\n          const ride=i=>{\n            if(i>=0&&i<v.facilities.length){\n              v.selectedFacility=i;v.rides++;v.rideCounts[i]++;v.coins++;\n              v.lastEvent='시설 체험: '+v.facilities[i]+' 코인 +1';v.actionAt=eventTime();\n            }\n          };\n          const doAction=i=>{\n            if(i>=0&&i<v.actions.length){\n              v.actionIndex=i;v.actionsDone++;v.actionAt=eventTime();\n              const earn=v.equipped<0?1:2;v.coins+=earn;\n              v.lastEvent='액션 사용: '+v.actions[i]+' 코인 +'+earn;\n            }\n          };\n          if(v.tab==='월드'){\n            if(ry>=54&&ry<82&&v.backgrounds.length&&rx>=10&&rx<430){\n              v.backgroundIndex=Math.min(v.backgrounds.length-1,\n                Math.floor((rx-10)/(420/v.backgrounds.length)));\n              v.lastEvent='배경: '+v.backgrounds[v.backgroundIndex];\n            }else if(ry>=234&&ry<261&&v.maps.length&&rx>=12&&rx<430){\n              enterMap(Math.floor((rx-12)/(418/v.maps.length)));\n            }else if(ry>=326&&ry<491&&rx>=12&&rx<432){\n              const col=Math.floor((rx-12)/105),row=Math.floor((ry-326)/55);\n              if(col>=0&&col<4&&row>=0&&row<3&&\n                 rx-12-col*105<100&&ry-326-row*55<51)ride(row*4+col);\n            }else if(ry>=506&&ry<556&&rx>=12&&rx<432){\n              const col=Math.floor((rx-12)/105),row=Math.floor((ry-506)/25);\n              if(col>=0&&col<4&&row>=0&&row<2&&rx-12-col*105<99)\n                doAction(row*4+col);\n            }else if(ry>=557&&v.motions.length){\n              v.motionIndex=(v.motionIndex+1)%v.motions.length;\n              v.lastEvent='모션: '+v.motions[v.motionIndex];\n            }\n          }else if(v.tab==='상태'){\n            if(ry>=440&&ry<497&&rx>=17&&rx<425){\n              v.reduceMotion=!v.reduceMotion;\n              v.lastEvent=v.reduceMotion?'움직임 줄이기 켜짐':'움직임 줄이기 꺼짐';\n            }\n          }else if(v.tab==='시설'){\n            if(ry>=110&&ry<482&&rx>=14&&rx<429){\n              const col=Math.floor((rx-14)/211),row=Math.floor((ry-110)/62);\n              const index=row*2+col;\n              if(col>=0&&col<2&&row>=0&&row<6&&\n                 rx-14-col*211<204&&ry-110-row*62<54&&index<v.facilities.length){\n                v.selectedFacility=index;v.lastEvent='시설 선택: '+v.facilities[index];\n              }\n            }else if(ry>=517&&ry<580){\n              if(rx>=14&&rx<216)ride(v.selectedFacility);\n              else if(rx>=224&&rx<426&&v.facilities.length){\n                v.selectedFacility=(v.selectedFacility+1)%v.facilities.length;\n                v.lastEvent='시설 선택: '+v.facilities[v.selectedFacility];\n              }\n            }\n          }else if(v.tab==='지도'){\n            if(ry>=118&&ry<538&&rx>=17&&rx<427){\n              const col=Math.floor((rx-17)/211),row=Math.floor((ry-118)/105);\n              const index=row*2+col;\n              if(col>=0&&col<2&&row>=0&&row<4&&\n                 rx-17-col*211<199&&ry-118-row*105<90)enterMap(index);\n            }\n          }else if(v.tab==='목표'){\n            if(ry>=128&&ry<545){\n              const row=Math.floor((ry-128)/139);\n              if(row>=0&&row<3&&ry-128-row*139<124)\n                v.tab=['지도','시설','월드'][row];\n            }\n\n          }else if(extraTabs.includes(v.tab)){\n            const count=v.tab==='가방'?v.maps.length+v.facilities.length:v.tab==='퀘스트'?3:\n              v.tab==='상점'?v.facilities.length:v.actions.length;\n            const page=v.pages[v.tab]||0;\n            if(rx>=17&&rx<425&&ry>=117&&ry<507){\n              const r=Math.floor((ry-117)/65),i=page*6+r;\n              if(i<count&&r<6&&ry-117-r*65<56){\n                if(v.tab==='가방'){\n                  if(i<v.maps.length){v.tab='제작';v.lastEvent='재료 확인 · 제작';}\n                  else{\n                    const f=i-v.maps.length;\n                    if(v.tickets[f]>0){v.tickets[f]--;v.rides++;v.rideCounts[f]++;\n                      v.selectedFacility=f;v.lastEvent=v.facilities[f]+' 이용권 체험';}\n                    else v.lastEvent='이용권 부족';\n                  }\n                }else if(v.tab==='장비'){\n                  if(v.equipped===i){v.equipped=-1;v.lastEvent='장비 해제';}\n                  else if(v.gearCounts[i]>0){v.equipped=i;v.lastEvent=v.actions[i]+' 장비 장착';}\n                  else v.lastEvent='장비 없음 · 제작 필요';\n                }else if(v.tab==='제작'){\n                  const m=v.maps.length?i%v.maps.length:-1;\n                  if(m>=0&&v.materials[m]>=2){v.materials[m]-=2;v.gearCounts[i]++;v.crafted++;\n                    v.lastEvent=v.actions[i]+' 장비 제작';}\n                  else v.lastEvent='재료 부족';\n                }else if(v.tab==='퀘스트'){\n                  const progress=[[v.visitedMaps.filter(Boolean).length,Math.min(2,v.maps.length)],\n                    [v.rides,v.facilities.length?1:0],[v.actionsDone,v.actions.length?2:0]][i];\n                  if(progress[1]>0&&progress[0]>=progress[1]&&!v.claimed[i]){\n                    v.claimed[i]=true;v.coins+=2;v.lastEvent='퀘스트 보상 +2 코인';}\n                  else v.lastEvent=v.claimed[i]?'이미 수령함':'아직 완료되지 않음';\n                }else if(v.tab==='상점'){\n                  if(v.coins>=3){v.coins-=3;v.tickets[i]++;v.purchases++;\n                    v.lastEvent=v.facilities[i]+' 이용권 구매';}\n                  else v.lastEvent='코인 부족 · 구매 실패';\n                }\n              }\n            }else if(ry>=520&&ry<570){\n              const maxPage=Math.max(1,Math.ceil(count/6))-1;\n              if(rx>=17&&rx<210)v.pages[v.tab]=Math.max(0,page-1);\n              else if(rx>=229&&rx<423)v.pages[v.tab]=Math.min(maxPage,page+1);\n            }\n          }\n          return;\n        }\n      }\n    }\n  }\n";
const keyboardControl = "\n  // VIBE_VOLUME_PACK: use the original keyboard event directly, never shadow its parameter.\n  {\n    // Alt-only shortcuts preserve all ordinary keyboard controls.\n    if(__KEY_EVENT__ && __KEY_EVENT__.altKey===true &&\n       __KEY_EVENT__.ctrlKey!==true && __KEY_EVENT__.metaKey!==true){\n      if(__KEY_EVENT__.key==='v'||__KEY_EVENT__.key==='V'){\n        __VOLUME__.open=!__VOLUME__.open;__VOLUME__.menuOpen=false;return;\n      }\n      if(__VOLUME__.open){\n        if(/^[1-5]$/.test(String(__KEY_EVENT__.key||''))){\n          __VOLUME__.tab=['월드','상태','시설','지도','목표'][Number(__KEY_EVENT__.key)-1];\n          __VOLUME__.menuOpen=false;return;\n        }\n        if(/^[6-9]$/.test(String(__KEY_EVENT__.key||''))||__KEY_EVENT__.key==='0'){\n          __VOLUME__.tab=['가방','장비','제작','퀘스트','상점'][__KEY_EVENT__.key==='0'?4:Number(__KEY_EVENT__.key)-6];\n          __VOLUME__.menuOpen=false;return;\n        }\n        if(__KEY_EVENT__.key==='m'||__KEY_EVENT__.key==='M'){\n          __VOLUME__.reduceMotion=!__VOLUME__.reduceMotion;return;\n        }\n      }\n    }\n  }\n";
const tick = "\n  // VIBE_VOLUME_PACK: reuse the existing game update clock; no extra animation loop.\n  __VOLUME__.time += Math.min(0.05,Math.max(0,Number(__DT__)||0));\n";

function generateInsertion(request,index){
 const render=choose(index,'render',request,true);
 const interact=choose(index,'interact',request,true);
 const update=choose(index,'update',request,false);
 const keyboard=choose(index,'keyboard',request,false);
 if(render.path!==interact.path||update&&update.path!==render.path||keyboard&&keyboard.path!==render.path)
  throw Error('VIBE59_VOLUME_DIFFERENT_GAME_MODULE');
 const owners=[render,interact,...update?[update]:[],...keyboard?[keyboard]:[]];
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
  update&&(update.parameters.length!==1)||keyboard&&keyboard.parameters.length!==1)
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
  actionIndex:0,motionIndex:0,time:0,actionAt:0,started:0,open:true,menuOpen:false,
  tab:'월드',reduceMotion:false,visitedMaps:request.maps.map((_,i)=>i===0),
  rides:0,rideCounts:request.facilities.map(()=>0),actionsDone:0,lastEvent:'게임 시작',
  coins:0,materials:request.maps.map(()=>0),gearCounts:request.actions.map(()=>0),
  tickets:request.facilities.map(()=>0),equipped:-1,crafted:0,purchases:0,
  claimed:[false,false,false],pages:{},menuPage:0
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
 if(keyboard){
  if(/\breturn\s+(?![;\r\n}])\S/.test(file.code.slice(keyboard.bodyStart,keyboard.bodyEnd)))
   throw Error('VIBE59_VOLUME_KEYBOARD_RETURN_CONTRACT');
  edits.push(makePatch(file,keyboard,keyboardControl.replaceAll('__VOLUME__',id)
   .replaceAll('__KEY_EVENT__',keyboard.parameters[0]),'start'));
 }
 const ownerOperations=['RENDER_PROCEDURAL_VOLUME','HANDLE_CONTENT_INTERACTION',
  ...update?['UPDATE_EXISTING_ANIMATION']:[],...keyboard?['OPTIONAL_KEYBOARD_NAVIGATION']:[]];
 return {edits,ownerOperations,ownerFunctions:owners.map(s=>s.name),gameFile:file.path,contentCounts:
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
 const {edits,ownerOperations,ownerFunctions,gameFile,contentCounts}=generateInsertion(spec,index);
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
  summary:'월드와 인벤토리·장비·제작·퀘스트·상점 한 번에 생성',
  expectedEffect:'탐험 재료 수집·제작·착용·퀘스트 보상·상점 거래를 기존 렌더링 및 입력 함수로 연결',
  edits,newFiles:[],replaceFiles:[],tests:[],
  vibe59CodeKind:'ONE_SHOT_GAME_VOLUME',vibe59DesignSteps:ownerFunctions.map((name,i)=>({
   id:'volume-'+name,operation:ownerOperations[i]})),
  vibe59TestPlan:{pass:true,authority:'LOCAL_SOURCE_SYNTAX_ONLY',
   cases:[{name:'content-count',contentCounts},{name:'source-owners',ownerFunctions}],independentGameQa:false},
  volumePack:{gameFile,ownerFunctions,contentCounts,graphics:'CANVAS_PROCEDURAL',
   uiPages:['월드','상태','시설','지도','목표','가방','장비','제작','퀘스트','상점'],
   gameplayBuildUp:['MAP_RESOURCE_COLLECTION','EQUIPMENT_CRAFTING','EQUIPPED_ACTION_REWARD',
    'QUEST_REWARD_CLAIM','SHOP_TICKET_REDEMPTION'],
   convenience:['RESPONSIVE_MOBILE_PANEL','REDUCED_MOTION','EXISTING_KEYBOARD_WHEN_BOUND'],
   objectives:['VISIT_REGIONS','EXPERIENCE_FACILITY','PERFORM_ACTIONS'],
   interaction:'EXISTING_INPUT_HANDLER',saveSchemaChanged:false},
  ruleDigest:sourceDigest(JSON.stringify(edits)),sourceWrite:false,modelUsed:false,runtimeVerified:false,
  releaseVerified:false};
}
