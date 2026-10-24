// Party RPG audio: procedurally generated, original adaptive BGM and diegetic SFX.
// All voices are synthesized locally. No third-party audio files, network calls or timers.
const THEMES=[
 {root:110,pace:1.02,pattern:[0,3,5,2],air:360}, // town: mournful strings
 {root:123.47,pace:.96,pattern:[0,5,3,7],air:460}, // moor
 {root:98,pace:1.16,pattern:[0,2,5,3],air:330}, // forest
 {root:92.5,pace:1.24,pattern:[0,1,3,6],air:260}, // cave
 {root:130.81,pace:.9,pattern:[0,5,7,3],air:480}, // desert
 {root:103.83,pace:1.18,pattern:[0,3,7,5],air:420}, // snow
 {root:82.41,pace:.78,pattern:[0,1,6,3],air:240}  // forgotten city
];
export class PartyAudio{
 constructor(){
  this.ctx=null;this.master=null;this.music=null;this.fx=null;this.nextBeat=0;this.beat=0;
  this.zone=0;this.dungeon=false;this.fighting=false;this.lastStep=0;this.lastHit=0;
  try{this.muted=localStorage.getItem('party-rpg-audio-v1')==='off';}catch{this.muted=false;}
 }
 start(){
  if(this.muted)return false;
  try{
   if(!this.ctx){
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;
    this.ctx=new Audio({latencyHint:'interactive'});
    this.master=this.ctx.createGain();this.master.gain.value=.76;this.master.connect(this.ctx.destination);
    this.music=this.ctx.createGain();this.music.gain.value=.31;this.music.connect(this.master);
    this.fx=this.ctx.createGain();this.fx.gain.value=.43;this.fx.connect(this.master);
    this.nextBeat=this.ctx.currentTime+.07;
    // Reused short noise buffer: no per-step allocations or file requests.
    this.noise=this.ctx.createBuffer(1,Math.floor(this.ctx.sampleRate*.35),this.ctx.sampleRate);
    const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
   }
   if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
   return true;
  }catch{return false;}
 }
 setMuted(value){
  this.muted=!!value;
  try{localStorage.setItem('party-rpg-audio-v1',this.muted?'off':'on');}catch{}
  if(this.ctx){this.master.gain.setTargetAtTime(this.muted?0:.76,this.ctx.currentTime,.06);}
  if(!this.muted)this.start();
  return this.muted;
 }
 tone(freq,time,duration,volume,type='triangle',destination=this.music,cutoff=900){
  if(!this.ctx||this.muted)return;
  const ctx=this.ctx,osc=ctx.createOscillator(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  osc.type=type;osc.frequency.setValueAtTime(freq,time);filter.type='lowpass';filter.frequency.setValueAtTime(cutoff,time);
  gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),time+.08);
  gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  osc.connect(filter);filter.connect(gain);gain.connect(destination);osc.start(time);osc.stop(time+duration+.03);
  osc.onended=()=>{osc.disconnect();filter.disconnect();gain.disconnect();};
 }
 noiseHit(time,seconds,volume,frequency){
  if(!this.ctx||this.muted)return;
  const c=this.ctx,src=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
  src.buffer=this.noise;filter.type='bandpass';filter.frequency.setValueAtTime(frequency,time);
  filter.Q.value=.7;gain.gain.setValueAtTime(Math.max(.0001,volume),time);
  gain.gain.exponentialRampToValueAtTime(.0001,time+seconds);
  src.connect(filter);filter.connect(gain);gain.connect(this.fx);
  src.start(time);src.stop(time+seconds+.01);src.onended=()=>{src.disconnect();filter.disconnect();gain.disconnect();};
 }
 update(zone,dungeon,fighting){
  if(!this.ctx||this.muted||this.ctx.state!=='running')return;
  const c=this.ctx,z=dungeon?6:Math.min(6,Math.max(0,zone)),theme=THEMES[z];
  if(z!==this.zone||!!dungeon!==this.dungeon||!!fighting!==this.fighting){
   this.zone=z;this.dungeon=!!dungeon;this.fighting=!!fighting;
   this.beat=0;this.nextBeat=Math.max(this.nextBeat,c.currentTime+.06);
  }
  const pace=theme.pace*(fighting?.73:1),minor=[0,3,7,10,12,15,19,22],now=c.currentTime;
  if(this.nextBeat<now-.3)this.nextBeat=now+.05;
  let scheduled=0;
  while(this.nextBeat<now+.25&&scheduled++<3){
   const n=this.beat++,t=this.nextBeat,idx=theme.pattern[Math.floor(n/4)%theme.pattern.length];
   const root=theme.root*Math.pow(2,idx/12);
   if(n%4===0){
    this.tone(root/2,t,pace*3.95,.125,'sine',this.music,310);
    this.tone(root*1.5,t,pace*3.65,.044,'triangle',this.music,theme.air);
    this.tone(root*2,t+.08,pace*3.45,.036,'sine',this.music,440);
   }
   if(n%2===0){
    const pitch=minor[(n/2+idx)%minor.length];
    this.tone(theme.root*2*Math.pow(2,pitch/12),t+.09,pace*1.18,fighting?.065:.037,'triangle',this.music,fighting?720:530);
   }
   if(fighting&&n%2===1)this.tone(root*1.01,t,pace*.48,.047,'sawtooth',this.music,210);
   this.nextBeat+=pace;
  }
 }
 step(surface){
  if(!this.ctx||this.muted||this.ctx.state!=='running')return;
  const t=this.ctx.currentTime;if(t-this.lastStep<.26)return;this.lastStep=t;
  const freq=surface==='stone'?610:surface==='snow'?310:surface==='sand'?260:surface==='dungeon'?470:400;
  this.noiseHit(t,.095,.085,freq);
  if(surface==='stone'||surface==='dungeon')this.tone(88,t,.1,.035,'triangle',this.fx,190);
 }
 effect(name){
  if(!this.ctx||this.muted||this.ctx.state!=='running')return;
  const t=this.ctx.currentTime;if(name==='hit'&&t-this.lastHit<.12)return;
  if(name==='hit')this.lastHit=t;
  if(name==='attack'){this.noiseHit(t,.13,.19,880);this.tone(190,t,.16,.09,'sawtooth',this.fx,680);}
  else if(name==='hit'){this.noiseHit(t,.17,.21,360);this.tone(78,t,.14,.09,'triangle',this.fx,230);}
  else if(name==='magic'||name==='heal'){for(let i=0;i<3;i++)this.tone(290*Math.pow(2,i*4/12),t+i*.08,.38,.08,'sine',this.fx,1000);}
  else if(name==='interact'){this.noiseHit(t,.1,.07,540);this.tone(370,t,.22,.07,'triangle',this.fx,800);}
  else if(name==='ui'){this.tone(415,t,.07,.035,'sine',this.fx,900);}
  else if(name==='story'){this.tone(221,t,.44,.085,'triangle',this.fx,440);this.tone(330,t+.17,.53,.061,'sine',this.fx,560);}
 }
 visibility(hidden){
  if(!this.ctx)return;
  if(hidden&&this.ctx.state==='running')this.ctx.suspend().catch(()=>{});
  else if(!hidden&&!this.muted)this.ctx.resume().catch(()=>{});
 }
}
