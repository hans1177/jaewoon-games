// 파일명: assets/vibe-genre-game-ui-browser.mjs
// [임포트] 기존 프리뷰 UI·저장·경제 구조는 그대로 유지한다.
// Standalone, dependency-free UI overlay for Vibe game previews.
import {createVibeGameUi} from './vibe-genre-game-ui.mjs';
import {createGenreGameplay,recipes,structures,arts} from './vibe-genre-gameplay.mjs';
import {createVibeSaveSlots,calculateVibeCombatStats} from './vibe-game-world-runtime.mjs';
const css=`
.vibe-shell{position:fixed;right:max(12px,env(safe-area-inset-right));top:max(12px,env(safe-area-inset-top));z-index:2147480000;color:#f5f7fc;font:14px/1.45 system-ui,sans-serif;max-width:min(360px,calc(100vw - 24px));pointer-events:auto}
.vibe-shell button,.vibe-shell select,.vibe-shell input{font:inherit}
.vibe-launch{background:#162a42;color:white;border:1px solid #7799ba;border-radius:9px;padding:10px 14px;min-height:44px;cursor:pointer;touch-action:manipulation}
.vibe-panel{margin-top:8px;padding:15px;background:rgba(15,23,39,.95);border:1px solid #6d879e;border-radius:14px;box-shadow:0 12px 35px #0008;max-height:min(75dvh,calc(100dvh - 92px));overflow:auto;overscroll-behavior:contain}
.vibe-panel h2{font-size:18px;margin:0 0 10px}.vibe-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.vibe-grid button{background:#243c56;border:1px solid #637d98;color:white;padding:10px 8px;min-height:48px;border-radius:9px;cursor:pointer;touch-action:manipulation;display:inline-flex;align-items:center;justify-content:flex-start;gap:9px;text-align:left;line-height:1.3}
.vibe-grid button svg{width:20px;height:20px;flex:none;stroke:currentColor;stroke-width:1.8;fill:none;stroke-linecap:round;stroke-linejoin:round}
.vibe-shell.vibe-contrast .vibe-panel{background:#03070e;border:2px solid #f5f7fc}
.vibe-shell.vibe-contrast .vibe-grid button{background:#12263c;border-color:#f5f7fc}
@media(max-width:430px){.vibe-shell{max-width:calc(100vw - 24px)}.vibe-panel{padding:12px}.vibe-grid{gap:6px}}

.vibe-grid button:focus-visible,.vibe-launch:focus-visible{outline:3px solid #e4cb8a}
.vibe-panel label{display:flex;justify-content:space-between;gap:10px;margin:10px 0}.vibe-panel input[type=range]{width:125px}
`;
// [아이콘] 승인된 메뉴 슬롯만 동일한 선 굵기·격자의 벡터 표기로 그린다. 외부 자산 없음.
const menuIconPath=Object.freeze({
 equipment:'M4 4h16v16H4z M8 8h8v8H8z',loadout:'M4 4h16v16H4z M8 8h8v8H8z',
 inventory:'M5 9h14l-1 11H6L5 9z M9 9V7a3 3 0 0 1 6 0v2',hotbar:'M5 9h14l-1 11H6L5 9z M9 9V7a3 3 0 0 1 6 0v2',
 crafting:'M4 20l9-9 M8 4l5 5 M7 3l3 0 7 7-3 3z',recipes:'M4 20l9-9 M8 4l5 5 M7 3l3 0 7 7-3 3z',
 skills:'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z',abilities:'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z',
 character:'M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8z M4 21a8 8 0 0 1 16 0',
 map:'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2z M9 3v16 M15 5v16',worldMap:'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2z M9 3v16 M15 5v16'
});
// [메인] 브라우저 메뉴: 기존 메뉴 ID·패널·저장 API 유지.
export function mountVibeGenreUi({documentRef=document,genre='storybook',onAction=()=>{}}={}){
 const ui=createVibeGameUi({genre,onAction});const gameplay=createGenreGameplay();const saves=createVibeSaveSlots({storage:documentRef.defaultView?.localStorage||null,gameId:'vibe-preview'});let buildingCell=0;const style=documentRef.createElement('style');style.textContent=css;documentRef.head.append(style);
 const root=documentRef.createElement('aside');root.className='vibe-shell';root.setAttribute('aria-label','게임 구성창');
 const launch=documentRef.createElement('button');launch.className='vibe-launch';launch.textContent='☰ 게임 메뉴';launch.setAttribute('aria-expanded','false');
 const panel=documentRef.createElement('section');panel.className='vibe-panel';panel.hidden=true;root.append(launch,panel);documentRef.body.append(root);
 // [메인: 아이콘 버튼] 실제 데이터 메뉴 icon ID만 렌더링하고 클릭/접근성 이름을 보존한다.
 function button(label,action,icon=''){
  const el=documentRef.createElement('button');el.type='button';
  const pathData=menuIconPath[icon];
  if(pathData){
   const svg=documentRef.createElementNS('http://www.w3.org/2000/svg','svg');
   svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
   const path=documentRef.createElementNS('http://www.w3.org/2000/svg','path');
   path.setAttribute('d',pathData);svg.append(path);el.append(svg,documentRef.createTextNode(label));
  }else el.textContent=label;
  el.addEventListener('click',action);return el;
 }
 function render(){
  panel.replaceChildren();const layout=ui.layout();launch.setAttribute('aria-expanded',String(!panel.hidden));root.classList.toggle('vibe-contrast',!!layout.preferences.highContrast);root.style.fontSize=(14*layout.preferences.textScale)+'px';
  const title=documentRef.createElement('h2');title.textContent=layout.title+' · 게임 구성';panel.append(title);
  const grid=documentRef.createElement('div');grid.className='vibe-grid';
  for(const item of layout.panels)grid.append(button(item.label,()=>{ui.open(item.id);render()},item.icon));
  grid.append(button('설정',()=>{ui.open('settings');render()}),button('닫기',()=>{ui.close();panel.hidden=true;render()}));panel.append(grid);
  if(layout.openPanel==='settings'){
   const settings=ui.settings;
   for(const [key,label,min,max,step] of [['masterVolume','전체 음량',0,1,.05],['musicVolume','음악 음량',0,1,.05],['effectsVolume','효과음',0,1,.05],['textScale','글자 크기',.8,1.6,.1]]){
    const row=documentRef.createElement('label');row.textContent=label;
    const slider=documentRef.createElement('input');slider.type='range';slider.min=min;slider.max=max;slider.step=step;slider.value=settings[key];slider.setAttribute('aria-label',label);
    slider.addEventListener('input',()=>{ui.setSettings({[key]:Number(slider.value)});if(key==='textScale')root.style.fontSize=(14*ui.settings.textScale)+'px'});row.append(slider);panel.append(row);
   }
   for(const [key,label] of [['subtitles','자막'],['reducedMotion','화면 움직임 줄이기'],['highContrast','고대비'],['showHints','도움말']]){
    const row=documentRef.createElement('label');row.textContent=label;const check=documentRef.createElement('input');check.type='checkbox';check.checked=settings[key];check.addEventListener('change',()=>{ui.setSettings({[key]:check.checked});if(key==='highContrast')root.classList.toggle('vibe-contrast',check.checked)});row.append(check);panel.append(row);
   }
  }else if(layout.openPanel){
   const id=layout.openPanel;const state=gameplay.snapshot();
   const status=documentRef.createElement('p');status.setAttribute('aria-live','polite');const stats=calculateVibeCombatStats(state);status.textContent='공격력 '+stats.attack+' · 기력 '+stats.stamina+' · 수련 점수 '+state.points+' · 골드 '+state.gold+' · 소지품 '+Object.entries(state.items).filter(([,v])=>v>0).map(([k,v])=>k+':'+v).join(' / ');panel.append(status);
   const actions=documentRef.createElement('div');actions.className='vibe-grid';panel.append(actions);
   const perform=(label,callback)=>actions.append(button(label,()=>{try{callback();render()}catch(error){status.textContent=error.message}}));
   if(id==='pause'){
    perform('1번 슬롯 저장',()=>saves.save(1,gameplay,{genre:ui.genre}));perform('1번 슬롯 불러오기',()=>{if(!saves.load(1,gameplay))throw Error('저장 데이터 없음')});
   }else if(id==='martialArts'||id==='meridians'||id==='skills'){
    for(const [key,spec] of Object.entries(arts))perform(key+' Lv.'+(state.arts[key]||0)+' / '+spec.max,()=>gameplay.train(key));
   }else if(id==='crafting'||id==='recipes'||id==='inventory'){
    for(const [key,cost] of Object.entries(recipes))perform(key+' ('+Object.entries(cost).map(([k,v])=>k+' '+v).join(', ')+')',()=>gameplay.craft(key));
   }else if(id==='building'||id==='home'){
    for(const key of Object.keys(structures))perform(key+' 건설',()=>{const x=buildingCell%16,z=Math.floor(buildingCell/16);gameplay.build(key,x,z);buildingCell=(buildingCell+3)%256});
   }else if(id==='equipment'||id==='loadout'){
    perform('철검 강화 +'+state.upgrades.sword,()=>gameplay.upgrade('sword'));
   }else{
    const info=documentRef.createElement('p');info.textContent='게임별 데이터 연결 대기';panel.append(info);
   }
  }
 }
 launch.addEventListener('click',()=>{panel.hidden=!panel.hidden;if(!panel.hidden)ui.open('pause');render()});
 render();
 return {ui,gameplay,saves,setGenre(name){ui.selectGenre(name);render()},dispose(){root.remove();style.remove()},render};
}
