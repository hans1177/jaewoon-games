import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  HOSTED_MCP_REQUIRED_TOOLS,evaluateHostedStudioMcpConnection,
  hostedConnectionIsVerified,runHostedStudioMcpProbe,validateOfficialMcpPath
} from '../tools/company-roblox-hosted-studio-mcp-connection.mjs';

const ready={
  studioInstalled:true,mcpLauncherAvailable:true,studioRunning:true,
  assistantSetting:'YES',mcpInitialized:true,requiredToolsReady:true,
  studioCount:1,studioStateObserved:true
};

test('only authentic connected Studio state is accepted; no installation or process-only PASS',()=>{
  assert.equal(evaluateHostedStudioMcpConnection(ready),'CONNECTED_OFFICIAL_STUDIO_MCP');
  assert.equal(hostedConnectionIsVerified(ready),true);
  for(const [changed,reason] of [
    [{studioInstalled:false},'BLOCKED_STUDIO_NOT_INSTALLED'],
    [{mcpLauncherAvailable:false},'BLOCKED_OFFICIAL_MCP_LAUNCHER_MISSING'],
    [{studioRunning:false},'BLOCKED_STUDIO_NOT_RUNNING'],
    [{assistantSetting:'NO'},'BLOCKED_MCP_DISABLED_IN_STUDIO'],
    [{mcpInitialized:false},'BLOCKED_MCP_TRANSPORT_NOT_CONNECTED'],
    [{requiredToolsReady:false},'BLOCKED_OFFICIAL_MCP_TOOLS_UNAVAILABLE'],
    [{studioCount:0},'BLOCKED_NO_CONNECTED_STUDIO_PLACE'],
    [{studioStateObserved:false},'BLOCKED_STUDIO_SESSION_NOT_READY'],
    [{installerSignatureRejected:true},'BLOCKED_UNTRUSTED_INSTALLER']
  ]){
    const state={...ready,...changed};
    assert.equal(evaluateHostedStudioMcpConnection(state),reason);
    assert.equal(hostedConnectionIsVerified(state),false);
  }
});
test('official tool set contains Studio read, play, input and screenshot but no Player automation',()=>{
  for(const name of ['list_roblox_studios','get_studio_state','start_stop_play',
    'user_keyboard_input','user_mouse_input','screen_capture','execute_luau']){
    assert.ok(HOSTED_MCP_REQUIRED_TOOLS.includes(name));
  }
  assert.ok(HOSTED_MCP_REQUIRED_TOOLS.every(name=>!name.includes('roblox_player')));
});

test('a hosted diagnostic without Windows or a signed installed Studio never grants gameplay credit',async()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'official-studio-mcp-diagnostic-'));
  try{
    const output=path.join(temp,'report.json');
    const state=await runHostedStudioMcpProbe({
      platform:'linux',installed:false,running:false,
      installerVerified:false,installerStatus:'NO_INSTALL',
      mcpCommand:'',settingsRoot:path.join(temp,'settings'),
      localAppData:temp,output
    });
    assert.equal(state.status,'BLOCKED_STUDIO_NOT_INSTALLED');
    assert.equal(state.connected,false);
    assert.equal(state.mcpInitialized,false);
    assert.equal(state.gameplayExecuted,false);
    assert.equal(state.actualPlayVerified,false);
    assert.equal(state.screenVerified,false);
    assert.equal(state.realDeviceTouchVerified,false);
    assert.equal(state.f0F9ReleaseGate,false);
    assert.equal(state.deployApproval,false);
    assert.equal(state.assistantSettingsMutation,false);
    assert.equal(state.robloxCredentialsUsed,false);
    assert.equal(JSON.parse(fs.readFileSync(output,'utf8')).status,state.status);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('an existing authenticated process without documented official launcher stays unconnected',async()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'official-studio-mcp-negative-'));
  try{
    const state=await runHostedStudioMcpProbe({
      platform:'win32',installed:true,running:true,installerVerified:true,
      installerStatus:'OFFICIAL_STUDIO_PREINSTALLED_SIGNED',
      mcpCommand:path.join(temp,'Roblox','mcp.bat'),localAppData:temp,
      settingsRoot:path.join(temp,'Roblox','AssistantSettings')
    });
    assert.equal(state.status,'BLOCKED_OFFICIAL_MCP_LAUNCHER_MISSING');
    assert.equal(state.connectionAttempted,false);
    assert.equal(state.connected,false);
    assert.equal(state.studioCount,0);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('the Roblox-signed MCP executable must accompany the official Studio binary',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'official-studio-mcp-allowed-'));
  try{
    const dir=path.join(temp,'alternate-studio-version');
    fs.mkdirSync(dir,{recursive:true});
    const exe=path.join(dir,'StudioMCP.exe');
    const studio=path.join(dir,'RobloxStudioBeta.exe');
    fs.writeFileSync(exe,'fake-exe-for-path-logic-only');
    assert.equal(validateOfficialMcpPath(exe,temp,true),false);
    fs.writeFileSync(studio,'fake-studio-for-path-logic-only');
    assert.equal(validateOfficialMcpPath(exe,temp,false),false);
    assert.equal(validateOfficialMcpPath(exe,temp,true),true);
    assert.equal(validateOfficialMcpPath(path.join(dir,'arbitrary-tool.exe'),temp,true),false);
    assert.equal(validateOfficialMcpPath(path.join(temp,'Roblox','mcp.bat'),temp,false),true);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('the workflow is diagnostic and cannot silently replace the disabled real-play lane',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-roblox-hosted-studio-mcp-connect.yml','utf8');
  const live=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  const install=workflow;
  assert.match(workflow,/runs-on: windows-latest/);
  assert.match(workflow,/contents: read/);
  assert.match(workflow,/official-studio-mcp-hosted-windows-diagnostic/);
  assert.doesNotMatch(workflow,/ROBLOX_OPEN_CLOUD_API_KEY|ROBLOX_COOKIE|roblosecurity/i);
  assert.match(live,/if: \$\{\{ false \}\} # OWNER_DIRECTIVE_2026-10-05_CLOUD_API_ONLY/);
  assert.match(live,/runs-on: \[self-hosted, Windows, X64, roblox-studio-authenticated\]/);
  assert.match(install,/https:\/\/setup\.rbxcdn\.com\/RobloxStudioInstaller\.exe/);
  assert.match(install,/Get-AuthenticodeSignature/);
  assert.match(install,/StudioMCP\.exe/);
  assert.ok(!fs.existsSync('tools/company-roblox-hosted-studio-mcp-connection.ps1'),'unreviewed standalone executable forbidden');
  assert.match(install,/SIGNED_OFFICIAL_STUDIOMCP_EXE/);
  const connector=fs.readFileSync('tools/company-roblox-hosted-studio-mcp-connection.mjs','utf8');
  assert.match(connector,/trustedMcpExe/);
  assert.match(connector,/command:useOfficialExe\?mcpCommand:'cmd\.exe'/);
  assert.match(install,/Roblox Corporation/);
  assert.match(install,/Start-Process -FilePath \$studio\.FullName/);
  assert.match(install,/Get-AuthenticodeSignature/);
  assert.match(install,/OutputPath=Join-Path/);
  assert.doesNotMatch(install,/\.ROBLOSECURITY|Set-Content.*AssistantSettings|roblox-player|--headless/i);
});
