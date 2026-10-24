// 포근섬 독자 제작 오디오: 외부 음악/폰트 없음. 원본 선율을 Web Audio API로 연주한다.
// 사용자가 음악을 켠 이후에만 AudioContext를 생성 (모바일 자동재생 정책 준수).
const STORE='jaewoon-games:cozy-island:audio:v1';
const THEMES=[
 {id:'dusk',name:'황혼의 성벽',tempo:80,root:196,notes:[0,4,7,11,9,7,4,2,0,2,4,7,9,7,4,-3]},
 {id:'market',name:'아침의 시장',tempo:108,root:220,notes:[0,2,4,7,9,7,4,2,0,4,7,12,9,7,4,2]},
 {id:'forest',name:'달빛의 포도밭',tempo:72,root:174.61,notes:[0,3,7,10,7,5,3,0,-2,0,3,7,5,3,0,-4]}
];
let settings={enabled:false,theme:'dusk',volume:.22,effects:true,voice:false};
try{settings={...settings,...JSON.parse(localStorage.getItem(STORE)||'{}')}}catch{}
let ctx=null,out=null,seq=0,nextAt=0,battle=false,lastBell=0;
const cap=x=>Math.max(0,Math.min(1,Number(x)||0));
function store(){try{localStorage.setItem(STORE,JSON.stringify(settings))}catch{}}
async function unlock(){
 const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;
 try{
  if(!ctx){ctx=new Audio();out=ctx.createGain();out.connect(ctx.destination)}
  if(ctx.state==='suspended')await ctx.resume();
  return true;
 }catch{return false}
}
function tone(freq,when,dur,gain=.12,wave='sine'){
 if(!ctx||!out||ctx.state!=='running')return;
 const osc=ctx.createOscillator(),env=ctx.createGain();
 osc.type=wave;osc.frequency.setValueAtTime(freq,when);
 env.gain.setValueAtTime(.0001,when);
 env.gain.exponentialRampToValueAtTime(Math.max(.001,gain),when+.018);
 env.gain.exponentialRampToValueAtTime(.0001,when+dur);
 osc.connect(env);env.connect(out);osc.start(when);osc.stop(when+dur+.02);
}
function percussion(when,strong=false){
 if(!ctx||ctx.state!=='running'||!settings.effects)return;
 const osc=ctx.createOscillator(),g=ctx.createGain();
 osc.type='triangle';osc.frequency.setValueAtTime(strong?95:130,when);
 osc.frequency.exponentialRampToValueAtTime(48,when+.17);
 g.gain.setValueAtTime(.0001,when);
 g.gain.exponentialRampToValueAtTime(strong?.23:.11,when+.008);
 g.gain.exponentialRampToValueAtTime(.0001,when+.28);
 osc.connect(g);g.connect(out);osc.start(when);osc.stop(when+.31);
}
function sched(){
 if(!settings.enabled||!ctx||ctx.state!=='running'||document.hidden)return;
 out.gain.value=cap(settings.volume)*.8;
 const theme=THEMES.find(t=>t.id===settings.theme)||THEMES[0];
 const beat=60/theme.tempo/2;
 const now=ctx.currentTime;if(nextAt<now-.5)nextAt=now+.03;
 for(;nextAt<now+.4;nextAt+=beat){
  const semitone=theme.notes[seq%theme.notes.length];
  const hz=theme.root*Math.pow(2,semitone/12);
  tone(hz,nextAt,beat*.92,battle?.085:.105,'sine');
  if(seq%4===0){
    tone(theme.root/2,nextAt,beat*3,.068,'triangle');
    if(battle)percussion(nextAt,true);
  }else if(battle&&seq%2===0)percussion(nextAt,false);
  seq++;
 }
}
setInterval(sched,180);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ctx)nextAt=ctx.currentTime+.05});
export const WarAudio={
 themes:THEMES,
 settings:()=>({...settings}),
 async change(patch){
  settings={...settings,...patch,volume:cap(patch.volume??settings.volume)};
  store();
  if(settings.enabled){const ok=await unlock();if(!ok){settings.enabled=false;store();return false}}
  if(!settings.voice&&'speechSynthesis'in window)window.speechSynthesis.cancel();
  if(ctx)nextAt=ctx.currentTime+.02;
  return true;
 },
 setBattle(value){battle=Boolean(value)},
 event(kind,message){
  if(settings.effects&&ctx&&ctx.state==='running'&&Date.now()-lastBell>900){
    lastBell=Date.now();const now=ctx.currentTime+.025;
    if(kind==='battle'||kind==='siege'||kind==='defeat'){
      percussion(now,true);percussion(now+.35);percussion(now+.7,true);
      tone(kind==='defeat'?164:220,now,1,.09,'triangle');
    }else{tone(392,now,.28,.11);tone(494,now+.23,.34,.1)}
  }
  if(settings.voice&&message&&'speechSynthesis'in window){
    try{window.speechSynthesis.cancel();
      const utter=new SpeechSynthesisUtterance(String(message).slice(0,120));
      utter.lang='ko-KR';utter.rate=.92;utter.volume=cap(settings.volume)*.9;
      window.speechSynthesis.speak(utter);
    }catch{}
  }
 },
 stop(){if(ctx){ctx.close().catch(()=>{});ctx=null;out=null}settings.enabled=false;store()}
};
window.addEventListener('cozy:war-event',event=>WarAudio.event(event.detail?.type||'notice',event.detail?.message||''));
window.addEventListener('cozy:battle-state',event=>WarAudio.setBattle(event.detail?.active));
