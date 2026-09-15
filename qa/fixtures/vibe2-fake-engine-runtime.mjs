import fs from 'node:fs';
const engine=process.env.VIBE2_AUTO_PLAYER_ENGINE;
const nonce=process.env.VIBE2_AUTO_PLAYER_NONCE;
const out=process.env.VIBE2_AUTO_PLAYER_RUNTIME_RESULT;
const capabilities=engine==='roblox'?{studioTestService:true,virtualInput:true}:{playMode:true,realInputDriver:true};
const authority=engine==='roblox'?'vibe2-roblox-studio-runtime':'vibe2-unity-playmode-runtime';
const result={version:1,engine,nonce,authority,runtimeVerified:true,capabilities,project:'fixture',actions:[{id:'input',type:'key',dispatched:true,ok:true}],checkpoints:[{id:'checkpoint',name:'runtime state changed',required:true,pass:true,value:true}],errors:[],metrics:{timeToFirstActionMs:5,consoleErrorCount:0}};
fs.writeFileSync(out,JSON.stringify(result),'utf8');
