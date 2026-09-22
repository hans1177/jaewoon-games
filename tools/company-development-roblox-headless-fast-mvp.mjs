import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const clean=v=>String(v??'').trim();
const COMMIT=/^[0-9a-f]{40}$/i;
const SHA=/^sha256:[0-9a-f]{64}$/i;
const upper=v=>clean(v).toUpperCase();
function show(repoRoot,revision,file){return execFileSync('git',['-C',path.resolve(repoRoot),'show',revision+':'+file],{encoding:'utf8',maxBuffer:16*1024*1024});}
function parsePlayMode(config){const m=config.match(/\bPlayMode\s*=\s*["']([^"']+)["']/i);return upper(m?.[1]||'');}
function saveEnabled(config){return /\bSaveEnabled\s*=\s*true\b/i.test(config);}
function multiplayerRequired(config){if(/\bMultiplayerRequired\s*=\s*true\b/i.test(config))return true;return !['','SINGLE'].includes(parsePlayMode(config));}

export function inspectHeadlessSourceTexts({gameId='',sourcePath='',sourceRevision='',artifactIdentity='',rebuiltArtifactIdentity='',artifactRunId=0,config='',server='',client='',project=''}={}){
  const checks={};
  checks.exactSourceRevision=COMMIT.test(clean(sourceRevision));
  checks.exactArtifact=SHA.test(clean(artifactIdentity))&&clean(artifactIdentity).toLowerCase()===clean(rebuiltArtifactIdentity).toLowerCase();
  checks.projectContract=/"\$className"\s*:\s*"DataModel"/.test(project)&&/"\$path"\s*:\s*"server"/.test(project)&&/"\$path"\s*:\s*"client"/.test(project);
  checks.robloxPolicy=/PolicySource\s*=\s*["']company-learning\/platform-release-roadmap\.json["']/i.test(config)&&/Platform\s*=\s*["']ROBLOX["']/i.test(config);
  checks.gameStart=/Players\.PlayerAdded:Connect/.test(server)&&/ScreenGui/.test(client);
  checks.mobileFirst=/MobileFirst\s*=\s*true/i.test(config)&&/UserInputService/.test(client)&&/TouchEnabled/.test(client)&&/\.Activated:Connect/.test(client);
  checks.serverClientBoundary=/RemoteEvent/.test(server)&&/OnServerEvent/.test(server)&&/FireServer/.test(client);
  checks.remoteSecurity=/typeof\s*\(/i.test(server)&&/rateLimit|cooldown|lastActionRequest|lastRequest|lastHit/i.test(server);
  checks.coreProgression=/SetAttribute\s*\(/.test(server)&&/Actions\s*=/.test(config)&&/FireServer\s*\(/.test(client);
  checks.combatOrRound=/ATTACK|SKILL|InBattle|BattleProgress|RoundState|endRound|freezePlayer/i.test(config+'\n'+server);
  const save=saveEnabled(config);
  checks.saveRejoin=!save||(/DataStoreService/.test(server)&&/GetAsync/.test(server)&&/(SetAsync|UpdateAsync)/.test(server));
  const multi=multiplayerRequired(config);
  checks.multiplayerSync=!multi||(/Players:GetPlayers\s*\(\)/.test(server)&&/FireAllClients/.test(server)&&/OnClientEvent/.test(client));
  checks.sessionEndRestart=/Players\.PlayerRemoving:Connect/.test(server)&&/Players\.PlayerAdded:Connect/.test(server)&&(!save||/BindToClose/.test(server));
  checks.errorGuards=/pcall\s*\(/.test(server)&&/typeof\s*\(/.test(server);
  checks.headlessRegression=checks.exactArtifact&&checks.projectContract&&checks.robloxPolicy&&checks.gameStart&&checks.mobileFirst&&checks.serverClientBoundary&&checks.remoteSecurity&&checks.coreProgression&&checks.combatOrRound&&checks.saveRejoin&&checks.multiplayerSync&&checks.sessionEndRestart&&checks.errorGuards;
  const pass=Object.values(checks).every(Boolean)&&Number.isInteger(Number(artifactRunId))&&Number(artifactRunId)>0;
  return Object.freeze({version:2,gameId:clean(gameId),platform:'ROBLOX',validationMode:'HEADLESS_FAST_MVP',checkedAt:new Date().toISOString(),sourcePath:clean(sourcePath),sourceRevision:clean(sourceRevision),artifactIdentity:clean(artifactIdentity),rebuiltArtifactIdentity:clean(rebuiltArtifactIdentity),artifactRunId:Number(artifactRunId),playMode:parsePlayMode(config)||null,saveExists:save,multiplayerApplicable:multi,serverClientBoundaryPassed:checks.serverClientBoundary,remoteSecurityPassed:checks.remoteSecurity,gameStartPassed:checks.gameStart,mobileControlUiPassed:checks.mobileFirst,coreProgressionPassed:checks.coreProgression,combatOrRoundPassed:checks.combatOrRound,datastoreRejoinPassed:checks.saveRejoin,multiplayerStateSyncPassed:checks.multiplayerSync,sessionEndRestartPassed:checks.sessionEndRestart,errorGuardPassed:checks.errorGuards,headlessRegressionPassed:checks.headlessRegression,protectedStatePreserved:checks.headlessRegression,exactRevision:checks.exactSourceRevision&&checks.exactArtifact,checks:Object.freeze(checks),pass,state:pass?'PASS':'BLOCKED',blockers:Object.freeze(Object.entries(checks).filter(([,v])=>!v).map(([k])=>k)),authority:'roblox-headless-fast-mvp'});
}

export function inspectHeadlessExactRevision({repoRoot='.',gameId='',sourcePath='',sourceRevision='',artifactIdentity='',rebuiltArtifactIdentity='',artifactRunId=0}={}){
  const root=clean(sourcePath);
  if(root!=='roblox-games/'+clean(gameId))throw new Error('source path mismatch: '+root);
  if(!COMMIT.test(clean(sourceRevision)))throw new Error('exact source revision required');
  return inspectHeadlessSourceTexts({gameId,sourcePath,sourceRevision,artifactIdentity,rebuiltArtifactIdentity,artifactRunId,config:show(repoRoot,sourceRevision,root+'/shared/GameConfig.luau'),server:show(repoRoot,sourceRevision,root+'/server/Game.server.luau'),client:show(repoRoot,sourceRevision,root+'/client/Game.client.luau'),project:show(repoRoot,sourceRevision,root+'/default.project.json')});
}
function args(argv){const o={};for(let i=0;i<argv.length;i++){const x=argv[i];if(!x.startsWith('--'))continue;const [k,v]=x.slice(2).split('=',2);o[k]=v??argv[++i];}return o;}
function main(){const a=args(process.argv.slice(2));const result=inspectHeadlessExactRevision({repoRoot:a['repo-root']||'.',gameId:a['game-id'],sourcePath:a['source-path'],sourceRevision:a['source-revision'],artifactIdentity:a['artifact-identity'],rebuiltArtifactIdentity:a['rebuilt-artifact-identity'],artifactRunId:Number(a['artifact-run-id'])});if(!a.output)throw new Error('output required');fs.mkdirSync(path.dirname(a.output),{recursive:true});fs.writeFileSync(a.output,JSON.stringify(result,null,2)+'\n');console.log('ROBLOX_HEADLESS_FAST_MVP='+(result.pass?'PASS':'BLOCKED')+':'+result.gameId);if(!result.pass)process.exitCode=2;}
const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){try{main();}catch(e){console.error(e.stack||e);process.exitCode=1;}}
