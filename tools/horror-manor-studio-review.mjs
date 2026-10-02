// 파일명: tools/horror-manor-studio-review.mjs
// 공식 Roblox Studio MCP로 실제 로비 입장·카메라·UI·콘솔을 검증한다. AI subagent/생성 도구는 사용하지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {spawn} from 'node:child_process';

const output=process.env.MANOR_REVIEW_OUT;
fs.mkdirSync(output,{recursive:true});
const child=spawn(process.env.MANOR_MCP_EXE,[],{stdio:['pipe','pipe','pipe'],windowsHide:true});
const pending=new Map();let serial=0;let playStarted=false;
child.stderr.on('data',chunk=>fs.appendFileSync(path.join(output,'mcp-stderr.log'),chunk));
const send=x=>child.stdin.write(JSON.stringify(x)+'\n');
readline.createInterface({input:child.stdout}).on('line',line=>{let m;try{m=JSON.parse(line);}catch{return;}
 if(m.method==='ping'&&m.id!==undefined){send({jsonrpc:'2.0',id:m.id,result:{}});return;}
 const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);
});
function request(method,params={}){return new Promise((resolve,reject)=>{const id=++serial;const timer=setTimeout(()=>{pending.delete(id);reject(Error('MCP_TIMEOUT:'+method));},60000);pending.set(id,{resolve,reject,timer});send({jsonrpc:'2.0',id,method,params});});}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const textContent=result=>(result?.content||[]).filter(x=>x?.type==='text').map(x=>String(x.text||'')).join('\n');
function parsedText(result){
 const texts=(result?.content||[]).filter(x=>x?.type==='text').map(x=>String(x.text||'').trim()).filter(Boolean);
 for(const text of texts){
  for(const candidate of [text,text.replace(/^\`\`\`(?:json)?\s*/i,'').replace(/\s*\`\`\`$/,'')]){
   try{const value=JSON.parse(candidate);if(value&&typeof value==='object')return value;}catch{}
   const a=candidate.indexOf('{'),b=candidate.lastIndexOf('}');
   if(a>=0&&b>a)try{return JSON.parse(candidate.slice(a,b+1));}catch{}
  }
 }
 return null;
}
function studioIdFrom(value){
 const seen=new Set();
 function walk(v){
  if(!v||typeof v!=='object'||seen.has(v))return null;seen.add(v);
  for(const key of ['studio_id','studioId','id']){
   if(typeof v[key]==='string'&&v[key])return v[key];
  }
  for(const child of Object.values(v)){
   if(typeof child==='string'){
    try{const parsed=JSON.parse(child);const found=walk(parsed);if(found)return found;}catch{}
   }else{const found=walk(child);if(found)return found;}
  }
  return null;
 }
 return walk(value);
}
function toolDef(catalog,name){return catalog.tools?.find(x=>x.name===name);}
async function call(name,args){return request('tools/call',{name,arguments:args||{}});}
function saveImage(result,name){
 const image=(result?.content||[]).find(x=>x?.type==='image'&&x.data);
 if(!image)return false;
 const ext=(image.mimeType||image.mime_type||'image/png').includes('jpeg')?'jpg':'png';
 fs.writeFileSync(path.join(output,name+'.'+ext),Buffer.from(image.data,'base64'));return true;
}
function mouseClickArgs(def,studioId,x,y){
 const props=def?.inputSchema?.properties||{};
 const args={};if(props.studio_id)args.studio_id=studioId;
 if(props.datamodel_type)args.datamodel_type='Client';
 if(props.actions){
  const itemProps=props.actions?.items?.properties||{};
  const actionKey=['action','type','kind'].find(k=>itemProps[k])||'action';
  const enums=itemProps[actionKey]?.enum||[];
  const click=enums.find(v=>String(v).toLowerCase()==='mousebuttonclick')
   ||enums.find(v=>String(v).toLowerCase().includes('click'))||'mouseButtonClick';
  const action={[actionKey]:click};
  if(itemProps.mouse_button)action.mouse_button='left';
  if(itemProps.x&&itemProps.y){action.x=Math.round(x);action.y=Math.round(y);}
  else if(itemProps.position)action.position={x:Math.round(x),y:Math.round(y)};
  else if(itemProps.coordinates)action.coordinates={x:Math.round(x),y:Math.round(y)};
  else {action.x=Math.round(x);action.y=Math.round(y);}
  args.actions=[action];
 }else{
  if(props.action)args.action='click';else if(props.type)args.type='click';
  args.x=Math.round(x);args.y=Math.round(y);
 }
 return args;
}
const clientSnapshot=`
local Players=game:GetService("Players")
local HttpService=game:GetService("HttpService")
local p=Players.LocalPlayer
local gui=p and p:FindFirstChild("PlayerGui") and p.PlayerGui:FindFirstChild("PersonalManorUI")
if not gui then return HttpService:JSONEncode({ok=false,error="PERSONAL_MANOR_UI_MISSING"}) end
local enter,depart,welcome
for _,d in ipairs(gui:GetDescendants())do
 if d:IsA("TextButton") and d.Text=="저택 들어가기" then enter=d end
 if d:IsA("TextButton") and d.Text=="출정" then depart=d end
 if d.Name=="ManorWelcome" then welcome=d end
end
local camera=workspace.CurrentCamera
return HttpService:JSONEncode({
 ok=true,
 guiEnabled=gui.Enabled,
 welcomeVisible=welcome and welcome.Visible or false,
 enterVisible=enter and enter.Visible or false,
 enterX=enter and enter.AbsolutePosition.X+enter.AbsoluteSize.X/2 or -1,
 enterY=enter and enter.AbsolutePosition.Y+enter.AbsoluteSize.Y/2 or -1,
 enterW=enter and enter.AbsoluteSize.X or 0,
 enterH=enter and enter.AbsoluteSize.Y or 0,
 departVisible=depart and depart.Visible or false,
 cameraType=camera and tostring(camera.CameraType) or "NONE",
 owner=p:GetAttribute("PersonalLobbyOwner"),
 clientReady=p:GetAttribute("LobbyClientReady"),
 physicalReady=workspace:GetAttribute("PhysicalLobbyReady")
})
`;
const errorSnapshot=`
local LogService=game:GetService("LogService")
local HttpService=game:GetService("HttpService")
local errors={}
for _,row in ipairs(LogService:GetLogHistory())do
 if row.messageType==Enum.MessageType.MessageError then table.insert(errors,row.message) end
end
return HttpService:JSONEncode({count=#errors,errors=errors})
`;

const groundContactSnapshot=`
local Players=game:GetService("Players")
local HttpService=game:GetService("HttpService")
local p=Players.LocalPlayer
local c=p and p.Character
local h=c and c:FindFirstChildOfClass("Humanoid")
local r=c and c:FindFirstChild("HumanoidRootPart")
if not p or not c or not h or not r then
 return HttpService:JSONEncode({ok=false,error="CHARACTER_NOT_READY"})
end
local params=RaycastParams.new()
params.FilterType=Enum.RaycastFilterType.Exclude
params.FilterDescendantsInstances={c}
params.IgnoreWater=true
local hit=workspace:Raycast(r.Position,Vector3.new(0,-16,0),params)
local ground=hit and hit.Instance or nil
local personalGround=ground~=nil and ground.Name=="PersonalGround" and ground:GetAttribute("WalkableGround")==true
local originZ=tonumber(p:GetAttribute("ManorOriginZ"))
local localZ=originZ and(r.Position.Z-originZ)or nil
return HttpService:JSONEncode({
 ok=true,
 rootX=r.Position.X,
 rootY=r.Position.Y,
 rootZ=r.Position.Z,
 localZ=localZ,
 floorMaterial=tostring(h.FloorMaterial),
 hit=hit~=nil,
 hitName=ground and ground.Name or "",
 hitY=hit and hit.Position.Y or nil,
 personalGround=personalGround,
 rootAnchored=r.Anchored,
 platformStand=h.PlatformStand,
 physicalReady=workspace:GetAttribute("PhysicalLobbyReady")==true,
 lobbySpawnGroundedAt=p:GetAttribute("LobbySpawnGroundedAt")
})
`;
async function captureGroundContact(studioId,label){
 let last=null;
 for(let attempt=1;attempt<=16;attempt++){
  const result=await call('execute_luau',{studio_id:studioId,datamodel_type:'Client',code:groundContactSnapshot});
  fs.writeFileSync(path.join(output,label+'-ground-attempt-'+String(attempt).padStart(2,'0')+'.json'),JSON.stringify(result,null,2));
  const data=parsedText(result);last=data;
  const floor=String(data?.floorMaterial||'');
  const rootY=Number(data?.rootY);
  const localZ=Number(data?.localZ);
  if(data?.ok===true&&data.physicalReady===true&&data.hit===true&&data.personalGround===true
    &&!floor.includes('Air')&&Number.isFinite(rootY)&&rootY>=2.5&&rootY<=6.5
    &&Number.isFinite(localZ)&&localZ>=52&&localZ<=68
    &&data.rootAnchored===false&&data.platformStand===false){
   fs.writeFileSync(path.join(output,label+'-ground-contact.json'),JSON.stringify(data,null,2)+'\n');
   console.log('MANOR_GROUND_CONTACT=PASS:'+label+':Y='+rootY+':LOCAL_Z='+localZ+':HIT='+String(data.hitName||''));
   return data;
  }
  await sleep(500);
 }
 throw Error('STUDIO_GROUND_CONTACT_FAILED:'+label+':'+JSON.stringify(last));
}

try{
 await request('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'midnight-manor-review',version:'2.0'}});
 send({jsonrpc:'2.0',method:'notifications/initialized',params:{}});
 let catalog;
 for(let attempt=0;attempt<8;attempt++){
  catalog=await request('tools/list');
  if(catalog.tools?.some(t=>t.name==='list_roblox_studios'))break;
  await sleep(1500);
 }
 fs.writeFileSync(path.join(output,'mcp-tools.json'),JSON.stringify(catalog,null,2));
 const required=['list_roblox_studios','get_studio_state','start_stop_play','execute_luau','get_console_output','screen_capture','user_mouse_input'];
 const names=new Set(catalog.tools?.map(x=>x.name)||[]);
 for(const name of required)if(!names.has(name))throw Error('STUDIO_MCP_TOOL_MISSING:'+name);
 console.log('MANOR_MCP_TOOLS='+[...names].join(','));

 let studios=null;let studioId=null;
 for(let attempt=1;attempt<=20;attempt++){
  studios=await call('list_roblox_studios',{});
  fs.writeFileSync(path.join(output,'mcp-studios-attempt-'+String(attempt).padStart(2,'0')+'.json'),JSON.stringify(studios,null,2));
  const parsed=parsedText(studios);
  studioId=studioIdFrom(studios)||studioIdFrom(parsed);
  if(studioId)break;
  await sleep(1500);
 }
 fs.writeFileSync(path.join(output,'mcp-studios.json'),JSON.stringify(studios,null,2));
 if(!studioId)throw Error('STUDIO_ID_NOT_RESOLVED_AFTER_WAIT:'+textContent(studios));
 console.log('MANOR_STUDIO_ID='+studioId);

 const editState=await call('get_studio_state',{studio_id:studioId});
 fs.writeFileSync(path.join(output,'studio-state-edit.json'),JSON.stringify(editState,null,2));

 await call('start_stop_play',{studio_id:studioId,is_start:true});playStarted=true;
 await sleep(7000);
 const playState=await call('get_studio_state',{studio_id:studioId});
 fs.writeFileSync(path.join(output,'studio-state-play.json'),JSON.stringify(playState,null,2));
 const firstGround=await captureGroundContact(studioId,'server-1');

 const before=await call('execute_luau',{studio_id:studioId,datamodel_type:'Client',code:clientSnapshot});
 fs.writeFileSync(path.join(output,'client-before-enter.json'),JSON.stringify(before,null,2));
 const beforeData=parsedText(before);
 if(!beforeData?.ok)throw Error('STUDIO_CLIENT_UI_NOT_READY:'+textContent(before));
 if(beforeData.guiEnabled!==true||beforeData.enterVisible!==true)throw Error('STUDIO_ENTER_BUTTON_NOT_VISIBLE:'+JSON.stringify(beforeData));
 if(Number(beforeData.enterW)<48||Number(beforeData.enterH)<48)throw Error('STUDIO_ENTER_BUTTON_TOUCH_TARGET_TOO_SMALL:'+JSON.stringify(beforeData));
 if(!(Number(beforeData.enterX)>=0&&Number(beforeData.enterY)>=0))throw Error('STUDIO_ENTER_BUTTON_COORDINATE_INVALID');

 const preShot=await call('screen_capture',{studio_id:studioId,capture_id:'manor-before-enter'});
 saveImage(preShot,'studio-before-enter');
 const mouseDef=toolDef(catalog,'user_mouse_input');
 const clickArgs=mouseClickArgs(mouseDef,studioId,beforeData.enterX,beforeData.enterY);
 fs.writeFileSync(path.join(output,'mouse-enter-args.json'),JSON.stringify(clickArgs,null,2));
 await call('user_mouse_input',clickArgs);
 await sleep(1800);

 const after=await call('execute_luau',{studio_id:studioId,datamodel_type:'Client',code:clientSnapshot});
 fs.writeFileSync(path.join(output,'client-after-enter.json'),JSON.stringify(after,null,2));
 const afterData=parsedText(after);
 if(!afterData?.ok)throw Error('STUDIO_CLIENT_AFTER_ENTER_UNREADABLE:'+textContent(after));
 if(afterData.welcomeVisible!==false)throw Error('STUDIO_INVITATION_OVERLAY_STILL_VISIBLE:'+JSON.stringify(afterData));
 if(afterData.departVisible!==true)throw Error('STUDIO_DEPART_BUTTON_NOT_VISIBLE:'+JSON.stringify(afterData));
 if(!String(afterData.cameraType).includes('Custom'))throw Error('STUDIO_CAMERA_NOT_CUSTOM:'+JSON.stringify(afterData));

 const postShot=await call('screen_capture',{studio_id:studioId,capture_id:'manor-after-enter'});
 if(!saveImage(postShot,'studio-after-enter'))fs.writeFileSync(path.join(output,'studio-after-enter.json'),JSON.stringify(postShot,null,2));

 const consoleResult=await call('get_console_output',{studio_id:studioId});
 fs.writeFileSync(path.join(output,'console-output.json'),JSON.stringify(consoleResult,null,2));
 const errors=await call('execute_luau',{studio_id:studioId,datamodel_type:'Client',code:errorSnapshot});
 fs.writeFileSync(path.join(output,'client-errors.json'),JSON.stringify(errors,null,2));
 const errorData=parsedText(errors);
 if(errorData&&Number(errorData.count)>0)throw Error('STUDIO_CLIENT_CONSOLE_ERRORS:'+JSON.stringify(errorData));

 await call('start_stop_play',{studio_id:studioId,is_start:false});playStarted=false;
 await sleep(2200);
 await call('start_stop_play',{studio_id:studioId,is_start:true});playStarted=true;
 await sleep(7000);
 const restartGround=await captureGroundContact(studioId,'server-2');
 const restartErrors=await call('execute_luau',{studio_id:studioId,datamodel_type:'Client',code:errorSnapshot});
 fs.writeFileSync(path.join(output,'client-errors-server-2.json'),JSON.stringify(restartErrors,null,2));
 const restartErrorData=parsedText(restartErrors);
 if(restartErrorData&&Number(restartErrorData.count)>0)throw Error('STUDIO_RESTART_CLIENT_CONSOLE_ERRORS:'+JSON.stringify(restartErrorData));

 fs.writeFileSync(path.join(output,'studio-review-evidence.json'),JSON.stringify({
  studioId,actualPlayTest:true,newServerRestarted:true,
  groundContactServer1:firstGround,groundContactServer2:restartGround,
  enterButtonVisible:true,enterButtonActivatedByMouse:true,
  invitationOverlayDismissed:true,cameraReturnedCustom:true,departButtonVisible:true,
  clientConsoleErrorCount:errorData?.count??null,restartClientConsoleErrorCount:restartErrorData?.count??null,pass:true
 },null,2)+'\n');
 console.log('MANOR_NEW_SERVER_GROUND_CONTACT=PASS');
 console.log('MANOR_STUDIO_ENTRY_QA=PASS');
}finally{
 if(playStarted){
  try{
   const catalog=await request('tools/list');
   const studios=await call('list_roblox_studios',{});
   const studioId=studioIdFrom(studios)||studioIdFrom(parsedText(studios));
   if(studioId&&catalog.tools?.some(x=>x.name==='start_stop_play'))await call('start_stop_play',{studio_id:studioId,is_start:false});
  }catch{}
 }
 child.stdin.end();child.kill();
}
