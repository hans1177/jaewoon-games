import fs from 'node:fs';
const engine=process.env.VIBE2_AUTO_PLAYER_ENGINE;
const nonce=process.env.VIBE2_AUTO_PLAYER_NONCE;
const out=process.env.VIBE2_AUTO_PLAYER_RUNTIME_RESULT;
const configs={
  roblox:{authority:'vibe2-roblox-studio-runtime',capabilities:{studioTestService:true,virtualInput:true}},
  unity:{authority:'vibe2-unity-playmode-runtime',capabilities:{playMode:true,realInputDriver:true}},
  uefn:{authority:'vibe2-uefn-fortnite-session-runtime',capabilities:{uefnSession:true,fortniteClient:true,win32Input:true,runtimeObservation:true}},
  unreal:{authority:'vibe2-unreal-automation-driver-runtime',capabilities:{automationDriver:true,automationFramework:true,platformInput:true,worldObservation:true}}
};
const config=configs[engine]||{authority:'invalid',capabilities:{}};
const result={version:1,engine,nonce,authority:config.authority,runtimeVerified:true,capabilities:config.capabilities,project:'fixture',actions:[{id:'input',type:'key',dispatched:true,ok:true}],checkpoints:[{id:'checkpoint',name:'runtime state changed',required:true,pass:true,value:true}],errors:[],metrics:{timeToFirstActionMs:5,consoleErrorCount:0}};
fs.writeFileSync(out,JSON.stringify(result),'utf8');
