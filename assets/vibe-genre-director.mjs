// Original, composable genre direction for the shared Vibe engine.
// Styles are generic visual conventions, not reproductions of any protected game.
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:0));
const freeze=o=>Object.freeze(o);
export const vibeGenreCatalog=freeze({
 storybook:freeze({label:'동화풍',world:'enchantedForest',lighting:'forest',camera:{distance:5,height:2.1,fov:42,follow:4.5},movement:{speed:2.8,turn:7,step:1.6},action:{anticipation:1.2,recovery:1.15},audio:{footstep:'soft',impact:'chime',ambience:'wind'},fx:{shake:.25,flash:.15,vignette:.15},render:{pixelated:false,outline:true,saturation:1.06}}),
 illustration:freeze({label:'그림책·수채화풍',world:'sunsetVillage',lighting:'forest',camera:{distance:6,height:2.8,fov:38,follow:3},movement:{speed:2.4,turn:5,step:1.5},action:{anticipation:1.35,recovery:1.3},audio:{footstep:'soft',impact:'chime',ambience:'wind'},fx:{shake:.12,flash:.08,vignette:.12},render:{pixelated:false,outline:true,saturation:.9}}),
 wuxia:freeze({label:'무협풍',world:'moonlitRuins',lighting:'laboratory',camera:{distance:6,height:2.4,fov:52,follow:9},movement:{speed:5.2,turn:12,step:1.8},action:{anticipation:.75,recovery:.75},audio:{footstep:'fast',impact:'blade',ambience:'wind'},fx:{shake:.65,flash:.35,vignette:.25},render:{pixelated:false,outline:true,saturation:.92}}),
 action:freeze({label:'액션·전투풍',world:'emberVolcano',lighting:'volcano',camera:{distance:4.6,height:2,fov:65,follow:11},movement:{speed:6,turn:13,step:2},action:{anticipation:.8,recovery:.85},audio:{footstep:'fast',impact:'heavy',ambience:'rumble'},fx:{shake:.8,flash:.5,vignette:.4},render:{pixelated:false,outline:false,saturation:1.12}}),
 voxel:freeze({label:'블록·복셀풍',world:'enchantedForest',lighting:'forest',camera:{distance:7,height:4,fov:65,follow:8},movement:{speed:4.3,turn:10,step:1.4},action:{anticipation:1,recovery:1},audio:{footstep:'block',impact:'block',ambience:'wind'},fx:{shake:.2,flash:.12,vignette:0},render:{pixelated:true,outline:false,saturation:1.15}}),
 fantasy:freeze({label:'판타지 RPG풍',world:'enchantedForest',lighting:'forest',camera:{distance:6,height:3,fov:54,follow:6},movement:{speed:3.7,turn:8,step:1.8},action:{anticipation:1,recovery:1},audio:{footstep:'soft',impact:'magic',ambience:'chime'},fx:{shake:.45,flash:.4,vignette:.25},render:{pixelated:false,outline:true,saturation:1.2}}),
 horror:freeze({label:'공포·미스터리풍',world:'moonlitRuins',lighting:'laboratory',camera:{distance:3.8,height:1.8,fov:48,follow:3.5},movement:{speed:2.6,turn:5,step:1.8},action:{anticipation:1.2,recovery:1.4},audio:{footstep:'soft',impact:'heavy',ambience:'rumble'},fx:{shake:.3,flash:.1,vignette:.8},render:{pixelated:false,outline:false,saturation:.6}}),
 sciFi:freeze({label:'SF·미래풍',world:'moonlitRuins',lighting:'laboratory',camera:{distance:5,height:2.2,fov:60,follow:8},movement:{speed:4.7,turn:11,step:1.9},action:{anticipation:.9,recovery:.85},audio:{footstep:'metal',impact:'laser',ambience:'hum'},fx:{shake:.5,flash:.5,vignette:.2},render:{pixelated:false,outline:false,saturation:1.05}}),
 cozy:freeze({label:'힐링·생활풍',world:'sunsetVillage',lighting:'forest',camera:{distance:7,height:3.4,fov:42,follow:3.5},movement:{speed:2.2,turn:5,step:1.4},action:{anticipation:1.2,recovery:1.25},audio:{footstep:'soft',impact:'chime',ambience:'wind'},fx:{shake:0,flash:0,vignette:.1},render:{pixelated:false,outline:false,saturation:1.05}}),
 platformer:freeze({label:'횡스크롤·플랫포머풍',world:'enchantedForest',lighting:'forest',camera:{distance:9,height:2.7,fov:40,follow:9},movement:{speed:5,turn:14,step:1.5},action:{anticipation:.75,recovery:.85},audio:{footstep:'fast',impact:'chime',ambience:'wind'},fx:{shake:.3,flash:.2,vignette:0},render:{pixelated:false,outline:true,saturation:1.1}})
});
export function resolveVibeGenre(name,overrides={}){
 const base=vibeGenreCatalog[name];if(!base)throw Error('Unknown genre: '+name);
 const result={...base,...overrides,id:name};
 for(const section of ['camera','movement','action','audio','fx','render'])result[section]={...base[section],...overrides[section]};
 result.fx.shake=clamp(result.fx.shake);result.fx.flash=clamp(result.fx.flash);result.fx.vignette=clamp(result.fx.vignette);
 result.movement.speed=clamp(result.movement.speed,0,20);
 // [미술감독] 기존 장르·월드·카메라·재질 수치로 하나의 일관된 연출 목표를 계산한다.
 // 새 모델이나 게임 수치를 만들지 않으며 후속 픽셀 검사는 실제 렌더 관측이 있어야 한다.
 const regionColor={enchantedForest:0x93b6a1,sunsetVillage:0xf2ba91,moonlitRuins:0x304660,emberVolcano:0x513d40};
 const regionAccent={enchantedForest:0xf7d89c,sunsetVillage:0xffdfaa,moonlitRuins:0xa6d9ff,emberVolcano:0xffa25d};
 const mood=result.id==='horror'?'tension':result.id==='action'||result.id==='wuxia'?'momentum':
  result.id==='cozy'||result.id==='illustration'?'rest':'discovery';
 const world=Object.hasOwn(regionColor,result.world)?result.world:'enchantedForest';
 result.artDirection=freeze({
  genre:name,world,mood,background:regionColor[world],accent:regionAccent[world],
  lighting:result.lighting,subjectPriority:'approved-model-silhouette-first',
  cameraFocus:result.camera.fov>58?'action-wide':'subject-led',
  materialRule:'keep-original-texture-and-authored-surface',audioCue:result.audio.ambience,
  exposureOffset:clamp((1-result.render.saturation)*.12,-.06,.06),
  targetLuminance:.48,review:'observed-pixels-only',
  protected:freeze(['gameplay','collision','stats','save','progression','asset-identity'])
 });
 return result;
}
export function createVibeGenreDirector({genre='storybook',onChange=()=>{},overrides={}}={}){
 let current=resolveVibeGenre(genre,overrides);
 return {
  get current(){return current},
  select(name,custom={}){current=resolveVibeGenre(name,custom);onChange(current);return current},
  serialize(){return JSON.stringify({genre:current.id,config:current})}
 };
}
