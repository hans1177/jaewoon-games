// Genre-aware commercial-style UI blueprint and settings persistence.
// Data-first: a host can render these panels in HTML, React, Canvas, or game UI.
import {vibeGenreCatalog} from './vibe-genre-director.mjs';
const freeze=x=>Object.freeze(x);
const common={
 pause:[{id:'resume',label:'계속하기'},{id:'settings',label:'설정'},{id:'controls',label:'조작법'},{id:'save',label:'저장'},{id:'quit',label:'나가기'}],
 settings:[{id:'graphics',label:'그래픽'},{id:'audio',label:'사운드'},{id:'controls',label:'조작'},{id:'accessibility',label:'접근성'}],
 hud:[{id:'health',label:'체력'},{id:'stamina',label:'기력'},{id:'objective',label:'목표'},{id:'interaction',label:'상호작용'}]
};
const specialized={
 storybook:['questJournal','character','inventory','map','dialogue'],
 illustration:['storyChapters','sketchbook','inventory','map','dialogue'],
 wuxia:['martialArts','meridians','equipment','sect','questJournal'],
 action:['loadout','missions','combatLog','skills','map'],
 voxel:['crafting','hotbar','inventory','building','recipes'],
 fantasy:['character','skills','inventory','equipment','questJournal'],
 horror:['evidence','journal','flashlight','map','objectives'],
 sciFi:['loadout','scanner','ship','missions','techTree'],
 cozy:['calendar','relationships','crafting','home','inventory'],
 platformer:['worldMap','abilities','collectibles','challenge','records']
};
const labels={questJournal:'퀘스트',character:'캐릭터',inventory:'가방',map:'지도',dialogue:'대화',storyChapters:'이야기',sketchbook:'스케치북',martialArts:'무공',meridians:'내공',equipment:'장비',sect:'문파',loadout:'장비 구성',missions:'임무',combatLog:'전투 기록',skills:'스킬',crafting:'제작',hotbar:'단축 슬롯',building:'건설',recipes:'제작법',evidence:'단서',journal:'기록',flashlight:'손전등',objectives:'목표',scanner:'스캐너',ship:'함선',techTree:'기술 연구',calendar:'달력',relationships:'관계',home:'집 꾸미기',worldMap:'월드 맵',abilities:'능력',collectibles:'수집품',challenge:'도전',records:'기록'};
export const vibeGenrePanels=freeze(Object.fromEntries(Object.keys(vibeGenreCatalog).map(genre=>[genre,freeze(specialized[genre].map(id=>freeze({id,label:labels[id],icon:id})))])));
export const vibeUiDefaults=freeze({textScale:1,highContrast:false,reducedMotion:false,subtitles:true,masterVolume:.8,musicVolume:.65,effectsVolume:.8,quality:'high',showHints:true});
export function validateVibeUiSettings(input={}){
 const value={...vibeUiDefaults};
 for(const key of ['textScale','masterVolume','musicVolume','effectsVolume'])if(Number.isFinite(input[key]))value[key]=Math.max(key==='textScale'?.8:0,Math.min(key==='textScale'?1.6:1,input[key]));
 for(const key of ['highContrast','reducedMotion','subtitles','showHints'])if(typeof input[key]==='boolean')value[key]=input[key];
 if(['low','medium','high','ultra'].includes(input.quality))value.quality=input.quality;
 return value;
}
export function createVibeGameUi({genre='storybook',settings={},onAction=()=>{}}={}){
 if(!vibeGenreCatalog[genre])throw Error('Unknown genre '+genre);
 let current=genre,preferences=validateVibeUiSettings(settings),opened=null;
 return {
  get genre(){return current},get settings(){return {...preferences}},get openPanel(){return opened},
  panels(){return [...vibeGenrePanels[current]]},
  layout(){return {genre:current,title:vibeGenreCatalog[current].label,menu:common.pause.map(x=>({...x})),settingsTabs:common.settings.map(x=>({...x})),hud:common.hud.map(x=>({...x})),panels:this.panels(),preferences:{...preferences},openPanel:opened}},
  selectGenre(next){if(!vibeGenreCatalog[next])throw Error('Unknown genre '+next);current=next;opened=null;onAction({type:'genre',genre:next})},
  open(id){if(!['pause','settings',...vibeGenrePanels[current].map(x=>x.id)].includes(id))throw Error('Unknown panel '+id);opened=id;onAction({type:'open',id})},
  close(){opened=null;onAction({type:'close'})},
  setSettings(patch){preferences=validateVibeUiSettings({...preferences,...patch});onAction({type:'settings',settings:{...preferences}});return this.settings},
  serialize(){return JSON.stringify({version:1,genre:current,settings:preferences})},
  restore(serialized){let data;try{data=JSON.parse(serialized)}catch{return false}if(data?.version!==1||!vibeGenreCatalog[data.genre])return false;current=data.genre;preferences=validateVibeUiSettings(data.settings);opened=null;return true}
 };
}
