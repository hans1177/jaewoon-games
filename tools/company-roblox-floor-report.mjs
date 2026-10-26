import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
const now=new Date();
const kst=t=>t?new Date(t).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',hour12:false}):'기록 없음';
const date=kst(now);
const rows=['## Roblox F0–F9 진행 현황','- 확인 시각 (KST): '+date];
let queue;
try {
  const body=JSON.parse(execFileSync('gh',['api','repos/'+process.env.GITHUB_REPOSITORY+'/contents/development-queue.json?ref=company-runtime'],{encoding:'utf8',maxBuffer:32*1024*1024}));
  queue=JSON.parse(Buffer.from(body.content,'base64').toString('utf8'));
} catch(error) {
  rows.push('- 상태: 런타임 큐를 읽지 못함 — PASS 표시 금지');
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,rows.join('\n')+'\n');
  console.warn('ROBLOX_FLOOR_STATUS_UNAVAILABLE',String(error.message).slice(0,220));
  process.exit(0);
}
const items=(queue.items||[]).filter(x=>x.selectedPlatform==='ROBLOX'&&['ACTIVE','PENDING'].includes(String(x.status||'').toUpperCase()));
const countF0=items.filter(x=>x.robloxFoundationF0Passed===true).length;
const countF9=items.filter(x=>x.robloxF9ReleaseRegressionPassed===true).length;
rows.push('- 정식 개발 큐: **'+items.length+'개**, F0 증거 PASS: **'+countF0+'개**, F9 증거 PASS: **'+countF9+'개**');
rows.push('','| 게임 | 실제 진행 단계 | 마지막 검증 날짜(KST) | 병목 |','|---|---|---|---|');
for(const x of items){
  const stage=String(x.currentStep||'대기').replace(/[|\n\r]/g,' ');
  const passed=x.robloxF9ReleaseRegressionPassed===true?'F9 PASS':x.robloxFoundationF0Passed===true?'F0 PASS 확인':'F0 미통과';
  const timestamp=x.robloxRuntimeFailedAt||x.robloxFoundationF0PassedAt||x.robloxBuildPreflightFailedAt||x.robloxBuildPassedAt||x.updatedAt;
  const failure=String(x.robloxFailureSignature||'').replace(/[|\n\r]/g,' ').slice(0,110)||'기록 없음';
  rows.push('| '+x.gameId+' | '+stage+' ('+passed+') | '+kst(timestamp)+' | '+failure+' |');
  console.log('ROBLOX_FLOOR='+x.gameId+'|'+stage+'|'+passed+'|'+kst(timestamp)+'|'+failure);
}
if(!items.some(x=>x.gameId==='baeksu-war')){
  rows.push('| baeksu-war | **정식 큐 편입 대기: 디자인 검증 단계** | '+date+' | 최소설계 검증 전 F0 PASS 주장 금지 |');
}
rows.push('','- 실패/병목 자동 복구: 기존 Vibe2 Recovery Fast(5분 주기) 및 Seed Design Runtime(설계 재시도) 사용. 상태 기록은 복구 성공 증거가 아님.');
fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,rows.join('\n')+'\n');
console.log('ROBLOX_FLOOR_REPORT_KST='+date);
console.log('ROBLOX_FLOOR_ACTIVE_COUNT='+items.length);
console.log('ROBLOX_FLOOR_F0_PASS_COUNT='+countF0);
console.log('ROBLOX_FLOOR_F9_PASS_COUNT='+countF9);
