// 파일명: tools/vibe3-model-selection.mjs
// 역할: 로컬 학습 장비가 충분하고 호환성 증거가 있을 때만 코드 특화 상위 모델을 선택한다.
// 원칙: 대형 모델 다운로드를 자동 강제하지 않고, 기준 미달이면 검증된 소형 baseline으로 복귀한다.

import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const VIBE3_MODEL_POLICY=Object.freeze({
  version:1,
  route:'LOCAL_SELF_HOSTED_ONLY',
  baselineModel:'Qwen/Qwen3-1.7B',
  coderUpgradeModel:'Qwen/Qwen3-Coder-30B-A3B-Instruct',
  coderUpgrade:Object.freeze({
    trainingMethod:'qlora',
    minCudaVramGiB:48,
    minDiskFreeGiB:80,
    explicitEnableRequired:true,
    compatibilityProbeRequired:true,
    cachedOrPreapprovedDownloadRequired:true,
  }),
  paidApiAllowed:false,
  githubHostedTrainingAllowed:false,
  fallbackToBaseline:true,
});

const finite=(value,fallback=0)=>{const n=Number(value);return Number.isFinite(n)?n:fallback;};
const bool=value=>value===true||String(value??'').trim().toLowerCase()==='true'||String(value??'').trim()==='1';

export function selectVibe3BaseModel({
  taskType='general',
  method='lora',
  cudaAvailable=false,
  cudaVramGiB=0,
  diskFreeGiB=0,
  enableCoderUpgrade=false,
  compatibilityProbePass=false,
  modelCachedOrDownloadApproved=false,
}={}){
  const reasons=[];
  const codingTask=['coding','bugfix','unity'].includes(String(taskType).toLowerCase());
  if(!codingTask)reasons.push('task-not-code-heavy');
  if(!bool(enableCoderUpgrade))reasons.push('coder-upgrade-not-explicitly-enabled');
  if(!bool(cudaAvailable))reasons.push('cuda-unavailable');
  if(String(method).toLowerCase()!=='qlora')reasons.push('qlora-required-for-coder-upgrade');
  if(finite(cudaVramGiB)<VIBE3_MODEL_POLICY.coderUpgrade.minCudaVramGiB)reasons.push('insufficient-vram');
  if(finite(diskFreeGiB)<VIBE3_MODEL_POLICY.coderUpgrade.minDiskFreeGiB)reasons.push('insufficient-disk');
  if(!bool(compatibilityProbePass))reasons.push('compatibility-probe-not-passed');
  if(!bool(modelCachedOrDownloadApproved))reasons.push('large-model-cache-or-download-approval-missing');
  const upgrade=codingTask&&reasons.length===0;
  return Object.freeze({
    version:1,
    model:upgrade?VIBE3_MODEL_POLICY.coderUpgradeModel:VIBE3_MODEL_POLICY.baselineModel,
    tier:upgrade?'CODER_UPGRADE':'BASELINE',
    upgraded:upgrade,
    reasons:Object.freeze(reasons),
    policy:VIBE3_MODEL_POLICY,
    authority:'local-capability-gated-model-selection',
  });
}

function parseArgs(argv){const args={};for(let i=0;i<argv.length;i+=1){const arg=argv[i];if(!arg.startsWith('--'))continue;const [key,inline]=arg.slice(2).split('=',2);args[key]=inline??argv[++i];}return args;}
function main(){const args=parseArgs(process.argv.slice(2));const result=selectVibe3BaseModel({taskType:args['task-type'],method:args.method,cudaAvailable:args.cuda, cudaVramGiB:args['vram-gib'],diskFreeGiB:args['disk-gib'],enableCoderUpgrade:args.enable,compatibilityProbePass:args.compatible,modelCachedOrDownloadApproved:args.cached});console.log(JSON.stringify(result));}
const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain)main();
