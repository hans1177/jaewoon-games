// Standalone, dependency-free UI overlay for Vibe game previews.
import {createVibeGameUi} from './vibe-genre-game-ui.mjs';
import {createGenreGameplay,recipes,structures,arts} from './vibe-genre-gameplay.mjs';
const css=`
.vibe-shell{position:fixed;right:14px;top:14px;z-index:2147480000;color:#f5f7fc;font:14px/1.45 system-ui,sans-serif;max-width:min(360px,calc(100vw - 28px));pointer-events:auto}
.vibe-shell button,.vibe-shell select,.vibe-shell input{font:inherit}
.vibe-launch{background:#162a42;color:white;border:1px solid #7799ba;border-radius:9px;padding:10px 14px;cursor:pointer}
.vibe-panel{margin-top:8px;padding:15px;background:rgba(15,23,39,.95);border:1px solid #6d879e;border-radius:14px;box-shadow:0 12px 35px #0008;max-height:75vh;overflow:auto}
.vibe-panel h2{font-size:18px;margin:0 0 10px}.vibe-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.vibe-grid button{background:#243c56;border:1px solid #637d98;color:white;padding:9px 6px;border-radius:7px;cursor:pointer}
.vibe-grid button:focus-visible,.vibe-launch:focus-visible{outline:3px solid #e4cb8a}
.vibe-panel label{display:flex;justify-content:space-between;gap:10px;margin:10px 0}.vibe-panel input[type=range]{width:125px}
`;
export function mountVibeGenreUi({documentRef=document,genre='storybook',onAction=()=>{}}={}){
 const ui=createVibeGameUi({genre,onAction});const gameplay=createGenreGameplay();let buildingCell=0;const style=documentRef.createElement('style');style.textContent=css;documentRef.head.append(style);
 const root=documentRef.createElement('aside');root.className='vibe-shell';root.setAttribute('aria-label','게임 구성창');
 const launch=documentRef.createElement('button');launch.className='vibe-launch';launch.textContent='☰ 게임 메뉴';launch.setAttribute('aria-expanded','false');
 const panel=documentRef.createElement('section');panel.className='vibe-panel';panel.hidden=true;root.append(launch,panel);documentRef.body.append(root);
 function button(label,action){const el=documentRef.createElement('button');el.type='button';el.textContent=label;el.addEventListener('click',action);return el}
 function render(){
  panel.replaceChildren();const layout=ui.layout();launch.setAttribute('aria-expanded',String(!panel.hidden));
  const title=documentRef.createElement('h2');title.textContent=layout.title+' · 게임 구성';panel.append(title);
  const grid=documentRef.createElement('div');grid.className='vibe-grid';
  for(const item of layout.panels)grid.append(button(item.label,()=>{ui.open(item.id);render()}));
  grid.append(button('설정',()=>{ui.open('settings');render()}),button('닫기',()=>{ui.close();panel.hidden=true;render()}));panel.append(grid);
  if(layout.openPanel==='settings'){
   const settings=ui.settings;
   for(const [key,label,min,max,step] of [['masterVolume','전체 음량',0,1,.05],['musicVolume','음악 음량',0,1,.05],['effectsVolume','효과음',0,1,.05],['textScale','글자 크기',.8,1.6,.1]]){
    const row=documentRef.createElement('label');row.textContent=label;
    const slider=documentRef.createElement('input');slider.type='range';slider.min=min;slider.max=max;slider.step=step;slider.value=settings[key];slider.setAttribute('aria-label',label);
    slider.addEventListener('input',()=>ui.setSettings({[key]:Number(slider.value)}));row.append(slider);panel.append(row);
   }
   for(const [key,label] of [['subtitles','자막'],['reducedMotion','화면 움직임 줄이기'],['highContrast','고대비'],['showHints','도움말']]){
    const row=documentRef.createElement('label');row.textContent=label;const check=documentRef.createElement('input');check.type='checkbox';check.checked=settings[key];check.addEventListener('change',()=>ui.setSettings({[key]:check.checked}));row.append(check);panel.append(row);
   }
  }else if(layout.openPanel){
   const id=layout.openPanel;const state=gameplay.snapshot();
   const status=documentRef.createElement('p');status.setAttribute('aria-live','polite');status.textContent='수련 점수 '+state.points+' · 골드 '+state.gold+' · 소지품 '+Object.entries(state.items).filter(([,v])=>v>0).map(([k,v])=>k+':'+v).join(' / ');panel.append(status);
   const actions=documentRef.createElement('div');actions.className='vibe-grid';panel.append(actions);
   const perform=(label,callback)=>actions.append(button(label,()=>{try{callback();render()}catch(error){status.textContent=error.message}}));
   if(id==='martialArts'||id==='meridians'||id==='skills'){
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
 return {ui,gameplay,setGenre(name){ui.selectGenre(name);render()},dispose(){root.remove();style.remove()},render};
}
