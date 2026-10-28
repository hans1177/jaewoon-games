// Vibe4: offline code generation from explicit, owner-specified, bounded patterns.
// This module only returns candidates. The existing Vibe2 worker performs all
// authority, source-write, safety, semantic, syntax and publication checks.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
const member=/^[A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)*$/;
function ref(input,label){
  if(typeof input!=='string'||!member.test(input)
    ||input.split('.').some(x=>['__proto__','constructor','prototype'].includes(x)))
    throw Error('VIBE4_INVALID_IDENTIFIER:'+label);
  return input;
}
function amount(n,label,min,max){
  if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)
    throw Error('VIBE4_INVALID_NUMBER:'+label);
  return n;
}
export const VIBE4_PATTERNS=Object.freeze([
  Object.freeze({id:'health-threshold-speed',required:['currentHealth','maximumHealth','speedOutput','baseSpeed','thresholdPercent','speedMultiplier']}),
  Object.freeze({id:'bounded-stat',required:['value','output','minimum','maximum']})
]);
export function createVibe4OfflinePatternCandidate({order={},sourceRoot='',responsibleFiles=[],target=''}={}){
  const recipe=order?.selectedTask?.vibe4DeterministicRecipe??order?.vibe4DeterministicRecipe;
  if(recipe==null)return null;
  if(!recipe||typeof recipe!=='object'||Array.isArray(recipe))throw Error('VIBE4_STRUCTURED_RECIPE_REQUIRED');
  if(recipe.explicitOwnerParameters!==true)throw Error('VIBE4_EXPLICIT_PARAMETERS_REQUIRED');
  if(!['web','roblox'].includes(target))throw Error('VIBE4_TARGET_UNSUPPORTED');
  const pattern=VIBE4_PATTERNS.find(x=>x.id===recipe.kind);
  if(!pattern)throw Error('VIBE4_PATTERN_UNSUPPORTED');
  for(const name of ['path','find',...pattern.required])
    if(!Object.prototype.hasOwnProperty.call(recipe,name))throw Error('VIBE4_MISSING_PARAMETER:'+name);
  const relative=String(recipe.path||'').replaceAll('\\','/');
  if(!relative||relative.startsWith('/')||relative.includes('//')
    ||relative.split('/').some(v=>!v||v==='.'||v==='..')
    ||!responsibleFiles.includes(relative))throw Error('VIBE4_UNAPPROVED_SOURCE');
  if(target==='web'&&!/\.(?:js|mjs|cjs)$/.test(relative))throw Error('VIBE4_WEB_SOURCE_REQUIRED');
  if(target==='roblox'&&!/\.(?:lua|luau)$/.test(relative))throw Error('VIBE4_LUAU_SOURCE_REQUIRED');
  const root=path.resolve(sourceRoot),full=path.resolve(root,relative);
  if(!full.startsWith(root+path.sep))throw Error('VIBE4_PATH_ESCAPE');
  const stat=fs.lstatSync(full);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>260000)throw Error('VIBE4_UNSAFE_FILE');
  const contents=fs.readFileSync(full,'utf8'),digest=sha256(contents);
  if(recipe.expectedSourceSha256!=null&&recipe.expectedSourceSha256!==digest)
    throw Error('VIBE4_SOURCE_REVISION_MISMATCH');
  const find=recipe.find;
  if(typeof find!=='string'||!find||find.length>512
    ||contents.indexOf(find)<0||contents.indexOf(find,contents.indexOf(find)+find.length)>=0)
    throw Error('VIBE4_UNIQUE_EXISTING_ANCHOR_REQUIRED');
  let replace;
  if(pattern.id==='health-threshold-speed'){
    const hp=ref(recipe.currentHealth,'currentHealth');
    const max=ref(recipe.maximumHealth,'maximumHealth');
    const speed=ref(recipe.speedOutput,'speedOutput');
    const base=ref(recipe.baseSpeed,'baseSpeed');
    if(speed===base||hp===max)throw Error('VIBE4_UNSAFE_SPEED_STATE');
    const percent=amount(recipe.thresholdPercent,'thresholdPercent',1,99);
    const multiplier=amount(recipe.speedMultiplier,'speedMultiplier',1.001,10);
    const threshold=Number((percent/100).toFixed(6));
    replace=target==='roblox'?
      ['if '+max+' > 0 and '+hp+' / '+max+' <= '+threshold+' then',
       '  '+speed+' = '+base+' * '+multiplier,'else','  '+speed+' = '+base,'end'].join('\n'):
      ['if ('+max+' > 0 && '+hp+' / '+max+' <= '+threshold+') {',
       '  '+speed+' = '+base+' * '+multiplier+';','} else {',
       '  '+speed+' = '+base+';','}'].join('\n');
  }else{
    const value=ref(recipe.value,'value'),output=ref(recipe.output,'output');
    const minimum=amount(recipe.minimum,'minimum',-1e9,1e9);
    const maximum=amount(recipe.maximum,'maximum',-1e9,1e9);
    if(minimum>=maximum)throw Error('VIBE4_INVALID_CLAMP_RANGE');
    replace=target==='roblox'?
      output+' = math.clamp('+value+', '+minimum+', '+maximum+')':
      output+' = Math.min('+maximum+', Math.max('+minimum+', '+value+'));';
  }
  if(find.trim()===replace.trim())throw Error('VIBE4_NO_EDIT');
  return Object.freeze({
    summary:'Vibe4 offline '+pattern.id+' focused candidate',
    expectedEffect:'Implement exact owner-specified '+pattern.id+' rule in responsible source',
    edits:[{path:relative,find,replace}],newFiles:[],replaceFiles:[],tests:[],
    vibe4PatternId:pattern.id,sourceSha256:digest,
    proof:Object.freeze({explicitParameters:true,uniqueAnchor:true,modelUsed:false,
      sourceWrite:false,runtimeVerified:false,authority:'candidate-only'})
  });
}
