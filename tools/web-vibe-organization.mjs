// 파일명: tools/web-vibe-organization.mjs
// WEB_VIBE_1 웹조직 단독 큐. 검증된 같은 게임 이력만 다음 한방패치에 연결.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildPwaVibeTask} from './pwa-command-vibe2-task.mjs';

export const WEB_VIBE_QUEUE_FILE='.web-vibe/queue.json';
export const WEB_VIBE_CONTROL_BRANCH='web-vibe-control';
export const WEB_VIBE_ENGINE='WEB_VIBE_1';
const clean=value=>String(value??'').trim();
const idPattern=/^pwa-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const gamePattern=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;
const STATES=new Set(['queued','running','review','merged','failed','blocked','cancelled']);
export const emptyWebVibeQueue=()=>({version:1,organization:'WEB',engine:WEB_VIBE_ENGINE,platform:'web',tasks:[]});
export function assertWebVibeTask(task){
  const game=clean(task?.gameId),root='web-games/'+game;
  if(!idPattern.test(clean(task?.id))||!gamePattern.test(game)||
     clean(task?.target)!=='web'||clean(task?.sourceRoot)!==root||
     !STATES.has(clean(task?.status))||
     !clean(task?.goal)||clean(task.goal).length>12000||
     (task.responsibleFiles||[]).some(f=>!String(f).replaceAll('\\','/').startsWith(root+'/'))||
     (task.evidence||[]).some(e=>/^native-development-enabled|^unity-runner/i.test(clean(e))))
    throw new Error('WEB_VIBE_NATIVE_OR_INVALID_TASK_REJECTED');
  const lineage=task?.ownerPatchLineage;
  if(lineage&&(lineage.gameId!==game||lineage.platform!=='WEB'
    ||lineage.sourceRoot!==root||lineage.authority!=='SAME_GAME_VERIFIED_MERGE_ONLY'
    ||!Array.isArray(lineage.verifiedPredecessors)||lineage.verifiedPredecessors.length>4
    ||lineage.verifiedPredecessors.some(id=>!idPattern.test(clean(id))||id===task.id)))
    throw new Error('WEB_VIBE_LINEAGE_INVALID');
  return task;
}
export function assertWebVibeQueue(input){
  if(!input||Array.isArray(input)||input.version!==1||
     input.organization!=='WEB'||input.engine!==WEB_VIBE_ENGINE||
     input.platform!=='web'||!Array.isArray(input.tasks)||
     input.tasks.length>5000)throw new Error('WEB_VIBE_QUEUE_OWNERSHIP_INVALID');
  const seen=new Map();
  for(const task of input.tasks){
    assertWebVibeTask(task);
    if(seen.has(task.id))throw new Error('WEB_VIBE_DUPLICATE_TASK_ID');
    for(const id of task.ownerPatchLineage?.verifiedPredecessors||[]){
      const previous=seen.get(id);
      if(!previous||previous.status!=='merged'||previous.gameId!==task.gameId
        ||previous.sourceRoot!==task.sourceRoot)
        throw new Error('WEB_VIBE_UNVERIFIED_OR_FOREIGN_LINEAGE');
    }
    seen.set(task.id,task);
  }
  return input;
}
export function ingestWebVibeTask({task,queue,catalog={},status={},repoRoot=process.cwd(),filesystem=fs}={}){
  const validated=assertWebVibeQueue(queue);
  const old=buildPwaVibeTask(task,{catalog,status,repoRoot,filesystem});
  const verified=validated.tasks.filter(row=>row.gameId===old.gameId
    &&row.target==='web'&&row.sourceRoot===old.sourceRoot&&row.status==='merged')
    .slice(-4).map(row=>row.id);
  const next=assertWebVibeTask({
    id:old.id,gameId:old.gameId,target:'web',sourceRoot:old.sourceRoot,
    goal:clean(task.body),responsibleFiles:[],priority:'owner-immediate',status:'queued',
    ownerDirective:true,
    ...(verified.length?{ownerPatchLineage:{gameId:old.gameId,platform:'WEB',
      sourceRoot:old.sourceRoot,authority:'SAME_GAME_VERIFIED_MERGE_ONLY',
      verifiedPredecessors:verified}}:{}),
    evidence:['web-vibe-independent:v1','owner-source-authenticated','qa-required-before-pr-merge',
      ...(verified.length?['web-onepatch-build-up-carry:verified-only']:[])]
  });
  const current=validated.tasks.find(item=>item.id===next.id);
  if(current){
    if(current.gameId!==next.gameId||current.target!=='web'||current.goal!==next.goal)
      throw new Error('WEB_VIBE_QUEUE_IDENTITY_COLLISION');
    return {...validated,ingest:{added:false,taskId:next.id,reason:'ALREADY_QUEUED'}};
  }
  return {...validated,tasks:[...validated.tasks,next],ingest:{added:true,taskId:next.id,reason:'WEB_VIBE_QUEUED'}};
}
export function buildWebVibeSync(queue){
  const data=assertWebVibeQueue(queue),updates=[];
  const statuses={queued:'working',running:'working',review:'testing',merged:'done',
    failed:'failed',blocked:'needs_input',cancelled:'cancelled'};
  for(const task of data.tasks){
    // No auto-completion: only a separately verified merge can set merged.
    updates.push({taskId:task.id.slice(4),status:statuses[task.status],blocker:clean(task.blocker)||null});
  }
  return {action:'sync',updates};
}
function argsOf(argv){const result={};for(const str of argv){if(!str.startsWith('--'))continue;const i=str.indexOf('=');if(i>2)result[str.slice(2,i)]=str.slice(i+1);else result[str.slice(2)]=true;}return result;}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function save(file,value){fs.mkdirSync(path.dirname(path.resolve(file)),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
export function runWebVibeQueueCommand(argv=process.argv.slice(2)){
  const [command='']=argv.filter(x=>!x.startsWith('--')),args=argsOf(argv);
  if(!['ingest','sync','status'].includes(command))throw new Error('WEB_VIBE_COMMAND_NOT_SUPPORTED');
  const data=assertWebVibeQueue(readJson(args.queue||WEB_VIBE_QUEUE_FILE));
  if(command==='status')return {engine:data.engine,organization:data.organization,queued:data.tasks.filter(x=>x.status==='queued').length,states:data.tasks.map(x=>({id:x.id,gameId:x.gameId,status:x.status}))};
  if(command==='sync'){const value=buildWebVibeSync(data);if(args.output)save(args.output,value);return value;}
  if(!args.task||!args.catalog||!args.status||!args.root||!args.output)throw new Error('WEB_VIBE_INGEST_INPUT_REQUIRED');
  const payload=readJson(args.task),task=payload.task||payload;
  const next=ingestWebVibeTask({task,queue:data,catalog:readJson(args.catalog),status:readJson(args.status),repoRoot:args.root});
  save(args.output,next);return {added:next.ingest.added,taskId:next.ingest.taskId,engine:WEB_VIBE_ENGINE};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{console.log('WEB_VIBE_RESULT='+JSON.stringify(runWebVibeQueueCommand()));}
  catch(error){console.error('WEB_VIBE_BLOCKED='+error.message);process.exitCode=1;}
}
