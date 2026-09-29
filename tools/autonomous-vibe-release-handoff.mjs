// 파일명: tools/autonomous-vibe-release-handoff.mjs
// 역할: 독립 QA를 통과해 autonomous-dev로 승격된 후보를 기존 Vibe2 release manifest 형식으로 연결한다.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const clean=value=>String(value??'').trim();
const posix=value=>clean(value).replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');

function targetFromSource(sourcePath){
  const root=posix(sourcePath);
  if(/^web-games\/[^/]+$/.test(root))return 'web';
  if(/^unity-games\/[^/]+$/.test(root))return 'unity';
  throw new Error(`Vibe2 자동 릴리즈 인수인계 미지원 source root: ${root||'EMPTY'}`);
}

export function buildAutonomousVibeReleaseHandoff({evidence,catalog,baseMainSha,promotedDevRevision,independentQaPass=false}={}){
  if(!evidence||typeof evidence!=='object')throw new Error('autonomous candidate evidence 필요');
  if(!catalog||!Array.isArray(catalog.games))throw new Error('game catalog 필요');
  if(independentQaPass!==true)throw new Error('독립 QA PASS 없이는 Vibe2 릴리즈 인수인계 금지');
  if(evidence.departmentCycleGate!=='PASS')throw new Error('AI 부서 협업 게이트 PASS 필요');
  const sourceRoot=posix(evidence.sourcePath);
  const target=targetFromSource(sourceRoot);
  const gameId=sourceRoot.split('/')[1];
  const row=catalog.games.find(game=>clean(game?.id)===gameId);
  if(!row)throw new Error(`카탈로그 게임을 찾을 수 없음: ${gameId}`);
  const expectedRoot=target==='web'?`web-games/${gameId}`:`unity-games/${gameId}`;
  if(sourceRoot!==expectedRoot)throw new Error(`카탈로그 source root 불일치: ${sourceRoot}`);
  const releaseState=clean(row.homepageCategory).toLowerCase();
  if(!['development-confirmed','release-confirmed'].includes(releaseState))throw new Error(`현재 릴리즈 자동 인수인계 불가 상태: ${releaseState||'other'}`);
  const base=clean(baseMainSha),dev=clean(promotedDevRevision),candidateId=clean(evidence.candidateId);
  if(!base||!dev||!candidateId)throw new Error('baseMainSha/promotedDevRevision/candidateId 필요');
  return {
    version:1,
    taskId:`autonomous-${candidateId}`,
    gameId,
    target,
    sourceRoot,
    baseMainSha:base,
    releaseState,
    origin:'AUTONOMOUS_DEV_VERIFIED_HANDOFF',
    autonomousCandidateId:candidateId,
    autonomousProjectId:clean(evidence.gameId)||null,
    promotedDevRevision:dev,
    departmentCycleGate:'PASS',
    independentQa:'PASS',
    publicMainDirectWrite:false,
  };
}

function arg(name){const prefix=`--${name}=`;return process.argv.slice(2).find(value=>value.startsWith(prefix))?.slice(prefix.length)??null;}
function main(){
  const evidenceFile=arg('evidence'),catalogFile=arg('catalog'),output=arg('output');
  if(!evidenceFile||!catalogFile||!output)throw new Error('--evidence/--catalog/--output 필요');
  const manifest=buildAutonomousVibeReleaseHandoff({
    evidence:JSON.parse(fs.readFileSync(evidenceFile,'utf8')),
    catalog:JSON.parse(fs.readFileSync(catalogFile,'utf8')),
    baseMainSha:arg('base-main-sha'),
    promotedDevRevision:arg('promoted-dev-revision'),
    independentQaPass:arg('independent-qa')==='PASS',
  });
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify(manifest,null,2));
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){try{main();}catch(error){console.error(error.message);process.exitCode=1;}}
