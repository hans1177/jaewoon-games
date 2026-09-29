import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const args=Object.fromEntries(process.argv.slice(2).map(v=>{const i=v.indexOf('=');return i<0?[v.replace(/^--/,''),'']:[v.slice(2,i),v.slice(i+1)];}));
const before=String(args.before||'').trim();
const after=String(args.after||'').trim();
const queuePath=String(args.queue||'').trim();
const roadmapPath=String(args.roadmap||'company-learning/platform-release-roadmap.json').trim();
const outputPath=String(args.output||'owner-web-edit-propagation.json').trim();
if(!before||!after||!queuePath)throw new Error('before/after/queue required');
const run=(a)=>execFileSync('git',a,{encoding:'utf8',maxBuffer:64*1024*1024});
const changed=run(['diff','--name-only',before,after,'--','web-games/']).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const ids=[...new Set(changed.map(p=>p.match(/^web-games\/([^/]+)\//)?.[1]).filter(Boolean))];
const queue=JSON.parse(fs.readFileSync(queuePath,'utf8'));
const roadmap=JSON.parse(fs.readFileSync(roadmapPath,'utf8'));
const classify=diff=>{
  const t=diff.toLowerCase();
  const rules=[
    ['MOVEMENT',/(joystick|move|position|velocity|speed|dash|이동|속도)/],
    ['COMBAT',/(attack|damage|enemy|boss|hit|combat|공격|피해|보스|몬스터)/],
    ['CRAFTING',/(craft|recipe|workbench|제작|제작대)/],
    ['INVENTORY',/(inventory|equip|item|인벤토리|장착|아이템)/],
    ['WORLD',/(region|map|area|weather|snow|rain|jungle|lake|지역|지도|날씨|눈|비|밀림|호수)/],
    ['MULTIPLAYER',/(multi|party|room|player sync|멀티|파티|방|동기화)/],
    ['PROGRESSION',/(level|xp|gold|quest|progress|레벨|경험치|골드|퀘스트|진행)/],
    ['AUDIO',/(audio|music|bgm|sound|volume|mute|브금|음악|소리|볼륨|음소거)/],
    ['UI_UX',/(button|hud|menu|modal|touch|mobile|버튼|메뉴|터치|모바일)/],
    ['SAVE',/(save|load|persist|저장|불러오기)/],
    ['BALANCE',/(cooldown|chance|rate|health|hp|cost|damage|확률|체력|가격|쿨타임)/],
  ];
  const out=rules.filter(([,re])=>re.test(t)).map(([name])=>name);
  return out.length?out:['GENERAL_GAMEPLAY'];
};
const focus=roadmap?.assetProductionParallelContract?.firstAdoption||{};
const now=new Date().toISOString();
const manifests=[];
for(const gameId of ids){
  const item=(queue.items||[]).find(x=>String(x.gameId||'')===gameId);
  if(!item)continue;
  const diff=run(['diff','--unified=0',before,after,'--',`web-games/${gameId}/`]);
  const affectedSystems=classify(diff);
  const targets=new Set();
  const selected=String(item.selectedPlatform||item.targetPlatform||'').toUpperCase();
  if(selected)targets.add(selected);
  if(roadmap?.assetProductionParallelContract?.enabled===true&&String(focus.gameId||'')===gameId&&String(focus.mode||'').toUpperCase().includes('CONCURRENT')){
    for(const p of Array.isArray(focus.targetPlatforms)?focus.targetPlatforms:[])targets.add(String(p).toUpperCase());
  }
  const manifest={
    version:1,
    authority:'OWNER_DIRECTIVE',
    gameId,
    sourcePath:`web-games/${gameId}`,
    sourceBefore:before,
    sourceAfter:after,
    semanticIntentFingerprint:crypto.createHash('sha256').update(diff).digest('hex'),
    affectedSystems,
    platformTargets:[...targets].filter(Boolean),
    literalWebCodeCrossPlatformCopyForbidden:true,
    semanticIntentPropagationRequired:true,
    affectedWebQaRequired:true,
    affectedPlatformQaRequired:true,
    detectedAt:now,
    state:'PLATFORM_PROPAGATION_REQUIRED'
  };
  item.ownerWebEditPropagation=manifest;
  item.ownerWebEditPropagationPending=true;
  item.ownerWebEditPropagationUpdatedAt=now;
  manifests.push(manifest);
}
queue.updatedAt=now;
fs.writeFileSync(queuePath,JSON.stringify(queue,null,2)+'\n');
fs.writeFileSync(outputPath,JSON.stringify({version:1,before,after,generatedAt:now,manifests},null,2)+'\n');
console.log(`OWNER_WEB_EDIT_GAMES=${manifests.map(x=>x.gameId).join(',')||'NONE'}`);
console.log(`OWNER_WEB_EDIT_PLATFORM_TARGETS=${[...new Set(manifests.flatMap(x=>x.platformTargets))].join(',')||'NONE'}`);
