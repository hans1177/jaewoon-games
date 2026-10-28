// Official Roblox Studio MCP connection attempt on an ephemeral GitHub-hosted Windows runner.
// Read-only: no Roblox Player bot, no Studio settings mutation, no gameplay/production claims.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {
  McpStdioClient,collectStudios,detectStudioMcpAssistantSetting
} from './company-development-roblox-studio-local-play.mjs';

const toBool=x=>x===true||String(x).toLowerCase()==='true';
const clean=x=>String(x??'').trim();
export const HOSTED_MCP_REQUIRED_TOOLS=Object.freeze([
  'list_roblox_studios','get_studio_state','start_stop_play',
  'screen_capture','user_keyboard_input','user_mouse_input',
  'get_console_output','execute_luau'
]);

export function evaluateHostedStudioMcpConnection(state={}){
  if(state.installerSignatureRejected===true)return 'BLOCKED_UNTRUSTED_INSTALLER';
  if(state.studioInstalled!==true)return 'BLOCKED_STUDIO_NOT_INSTALLED';
  if(state.mcpLauncherAvailable!==true)return 'BLOCKED_OFFICIAL_MCP_LAUNCHER_MISSING';
  if(state.studioRunning!==true)return 'BLOCKED_STUDIO_NOT_RUNNING';
  if(state.assistantSetting==='NO')return 'BLOCKED_MCP_DISABLED_IN_STUDIO';
  if(state.mcpInitialized!==true)return 'BLOCKED_MCP_TRANSPORT_NOT_CONNECTED';
  if(state.requiredToolsReady!==true)return 'BLOCKED_OFFICIAL_MCP_TOOLS_UNAVAILABLE';
  if((state.studioCount||0)<1)return 'BLOCKED_NO_CONNECTED_STUDIO_PLACE';
  if(state.studioStateObserved!==true)return 'BLOCKED_STUDIO_SESSION_NOT_READY';
  return 'CONNECTED_OFFICIAL_STUDIO_MCP';
}
export function hostedConnectionIsVerified(state={}){
  return evaluateHostedStudioMcpConnection(state)==='CONNECTED_OFFICIAL_STUDIO_MCP';
}
function safeFailure(error){
  const value=clean(error?.message||error);
  if(value.includes('MCP process exited'))return 'OFFICIAL_MCP_PROCESS_EXITED';
  if(value.includes('MCP timeout'))return 'OFFICIAL_MCP_PROTOCOL_TIMEOUT';
  if(value.includes('ROBLOX_STUDIO_MCP_REQUIRED_TOOLS_NOT_READY'))return 'OFFICIAL_MCP_TOOL_INVENTORY_MISSING';
  if(value.includes('ROBLOX_STUDIO_MCP_TOOL_ERROR'))return 'OFFICIAL_MCP_TOOL_ERROR';
  if(value.includes('ENOENT'))return 'OFFICIAL_MCP_FILE_NOT_FOUND';
  return 'OFFICIAL_MCP_HANDSHAKE_FAILED';
}
function argumentsMap(argv=[]){
  const out={};
  for(const word of argv){
    if(!word.startsWith('--'))continue;
    const index=word.indexOf('=');
    if(index>2)out[word.slice(2,index)]=word.slice(index+1);
  }
  return out;
}
export function validateOfficialMcpPath(command='',localAppData='',trustedExe=false){
  if(!localAppData||!command)return false;
  const full=path.resolve(command);
  const normal=value=>path.resolve(value).toLowerCase();
  const documented=path.join(localAppData,'Roblox','mcp.bat');
  if(normal(full)===normal(documented))return true;
  if(!trustedExe||path.basename(full).toLowerCase()!=='studiomcp.exe')return false;
  // The official signed Roblox installer may place its version directory
  // outside LOCALAPPDATA/Program Files on ephemeral Windows images. Accept
  // only a same-directory StudioMCP.exe next to the verified Studio binary,
  // with its own Roblox Authenticode signature attested by PowerShell.
  return fs.existsSync(path.join(path.dirname(full),'RobloxStudioBeta.exe'));
}
export async function runHostedStudioMcpProbe({
  platform=process.platform,installed=false,running=false,installerVerified=false,
  installerRejected=false,installerStatus='NOT_INSTALLED',mcpCommand='',trustedMcpExe=false,
  settingsRoot='',localAppData='',output='',transportTimeoutMs=12000
}={}){
  const setting=detectStudioMcpAssistantSetting({settingsRoot});
  const state={
    version:1,authority:'GITHUB_HOSTED_WINDOWS_OFFICIAL_MCP_CONNECTIVITY_DIAGNOSTIC',
    provider:'ROBLOX_BUILT_IN_STUDIO_MCP_STDIO',runner:'GITHUB_HOSTED_WINDOWS',
    installedVia:'OFFICIAL_ROBLOX_SIGNED_INSTALLER_ONLY',
    studioInstalled:toBool(installed),studioRunning:toBool(running),
    installerSignatureVerified:toBool(installerVerified),
    installerSignatureRejected:toBool(installerRejected),
    installerStage:clean(installerStatus)||'UNKNOWN',
    officialExeFallbackTrusted:toBool(trustedMcpExe),
    mcpLauncherAvailable:false,assistantSetting:setting.state,
    assistantSettingsMutation:false,robloxCredentialsUsed:false,
    mcpInitialized:false,requiredToolsReady:false,studioCount:0,
    studioStateObserved:false,studioInstanceNames:[],availableOfficialTools:[],
    connectionAttempted:false,errorCode:null,
    gameplayExecuted:false,actualPlayVerified:false,screenVerified:false,
    simulatedTouchVerified:false,realDeviceTouchVerified:false,
    f0F9ReleaseGate:false,deployApproval:false
  };
  let client=null;
  try{
    if(platform!=='win32')throw new Error('HOSTED_MCP_WINDOWS_ONLY');
    state.mcpLauncherAvailable=validateOfficialMcpPath(mcpCommand,localAppData,toBool(trustedMcpExe))&&fs.existsSync(mcpCommand);
    if(state.studioInstalled&&state.studioRunning&&state.mcpLauncherAvailable&&state.assistantSetting!=='NO'){
      state.connectionAttempted=true;
      const useOfficialExe=path.extname(mcpCommand).toLowerCase()==='.exe';
      client=new McpStdioClient({
        command:useOfficialExe?mcpCommand:'cmd.exe',args:useOfficialExe?[]:['/c',mcpCommand],
        timeoutMs:Math.max(2500,Math.min(20000,Number(transportTimeoutMs)||12000))
      });
      await client.connect();
      state.mcpInitialized=true;
      const list=await client.refreshTools();
      state.availableOfficialTools=list.map(row=>clean(row?.name)).filter(Boolean).sort();
      state.requiredToolsReady=HOSTED_MCP_REQUIRED_TOOLS.every(name=>client.tools.has(name));
      if(state.requiredToolsReady){
        const result=await client.call('list_roblox_studios',{});
        const studios=[...new Map(collectStudios(result,[]).map(s=>[s.studioId,s])).values()];
        state.studioCount=studios.length;
        // Identity-bearing details are not exported from an ephemeral shared runner.
        if(studios.length){
          const tool=client.tool('get_studio_state');
          const props=tool.inputSchema?.properties||{};
          const parameter=Object.hasOwn(props,'studio_id')?'studio_id'
            :Object.hasOwn(props,'studioId')?'studioId':'studio_id';
          await client.call('get_studio_state',{[parameter]:studios[0].studioId});
          state.studioStateObserved=true;
        }
      }
    }
  }catch(error){
    state.errorCode=clean(error?.message)==='HOSTED_MCP_WINDOWS_ONLY'?'HOSTED_MCP_WINDOWS_ONLY':safeFailure(error);
  }finally{
    try{client?.close();}catch{}
  }
  state.status=evaluateHostedStudioMcpConnection(state);
  state.connected=hostedConnectionIsVerified(state);
  if(output){
    fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});
    fs.writeFileSync(output,JSON.stringify(state,null,2)+'\n');
  }
  console.log('ROBLOX_HOSTED_WINDOWS_INSTALLER_STAGE='+state.installerStage);
  console.log('ROBLOX_HOSTED_WINDOWS_STUDIO_INSTALLED='+state.studioInstalled);
  console.log('ROBLOX_HOSTED_WINDOWS_STUDIO_PROCESS='+state.studioRunning);
  console.log('ROBLOX_HOSTED_WINDOWS_MCP_LAUNCHER='+state.mcpLauncherAvailable);
  console.log('ROBLOX_HOSTED_WINDOWS_MCP_INITIALIZED='+state.mcpInitialized);
  console.log('ROBLOX_HOSTED_WINDOWS_MCP_TOOLS_READY='+state.requiredToolsReady);
  console.log('ROBLOX_HOSTED_WINDOWS_CONNECTED_STUDIOS='+state.studioCount);
  console.log('ROBLOX_HOSTED_WINDOWS_MCP_STATUS='+state.status);
  console.log('ROBLOX_HOSTED_WINDOWS_ACTUAL_PLAY=NOT_EXECUTED');
  if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'connected='+String(state.connected)+'\nstatus='+state.status+'\n');
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,[
    '### GitHub-hosted Windows · official Studio MCP connection',
    '| Stage | Result |','|---|---|',
    '| Signed official installer | '+(state.installerSignatureVerified?'Verified':state.installerStage)+' |',
    '| Studio installed | '+state.studioInstalled+' |',
    '| Studio process | '+state.studioRunning+' |',
    '| Documented Roblox MCP launcher | '+state.mcpLauncherAvailable+' |',
    '| Assistant MCP setting (read-only) | '+state.assistantSetting+' |',
    '| stdio initialize | '+state.mcpInitialized+' |',
    '| Required official tools | '+state.requiredToolsReady+' |',
    '| Open Studio instances | '+state.studioCount+' |',
    '| Verified official connection | '+state.connected+' |',
    '| Full play, screenshot or touch | **Not tested** |',
    '',
    '**State:** '+state.status+'. This is infrastructure diagnostics only. It does not unlock Studio playtesting, cloud deployment or F0/F9.',
    ''
  ].join('\n'));
  return state;
}
async function main(){
  const a=argumentsMap(process.argv.slice(2));
  const local=process.env.LOCALAPPDATA||'';
  await runHostedStudioMcpProbe({
    installed:a['studio-installed'],running:a['studio-running'],trustedMcpExe:a['trusted-mcp-exe'],
    installerVerified:a['installer-verified'],installerRejected:a['installer-rejected'],
    installerStatus:a['installer-stage'],localAppData:local,
    settingsRoot:path.join(local,'Roblox','AssistantSettings'),
    mcpCommand:a['mcp-command']||path.join(local,'Roblox','mcp.bat'),
    output:a.output||''
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  main().catch(e=>{console.error('ROBLOX_HOSTED_MCP_PROBE_ERROR='+safeFailure(e));process.exitCode=1;});
}
