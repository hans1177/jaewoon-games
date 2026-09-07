// Validates repo/local asset presence, license policy, actor animation evidence, and external source reachability.
import fs from 'node:fs';
import path from 'node:path';

const manifest=JSON.parse(fs.readFileSync('assets/asset-manifest.json','utf8'));
const now=new Date().toISOString();
const blocked=new Set(manifest?.policy?.blocked||[]);
const actorTypes=new Set(['character','enemy','boss']);
const results=[];

async function sourceReachable(url){
  if(!url)return null;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);
  try{
    let response=await fetch(url,{method:'HEAD',redirect:'follow',signal:controller.signal,headers:{'User-Agent':'jaewoon-games-asset-health'}});
    if(response.status===405||response.status===403){
      response=await fetch(url,{method:'GET',redirect:'follow',signal:controller.signal,headers:{'User-Agent':'jaewoon-games-asset-health','Range':'bytes=0-0'}});
    }
    return {ok:response.ok||response.status===206,status:response.status,finalUrl:response.url};
  }catch(error){return {ok:false,status:0,error:String(error?.message||error)}};
  finally{clearTimeout(timer);}
}

for(const asset of manifest.assets||[]){
  const types=Array.isArray(asset.types)?asset.types:[];
  const actor=types.some(type=>actorTypes.has(type));
  const localPath=String(asset.path||'').trim();
  const localExists=localPath?fs.existsSync(localPath):null;
  const license=String(asset.license||'unknown');
  const licenseOk=!blocked.has(license)&&license!=='unknown';
  const animationOk=!actor||(
    asset.verifiedAnimation===true&&
    Array.isArray(asset.animationEvidence)&&asset.animationEvidence.length>0&&
    Array.isArray(asset.animations)&&asset.animations.some(x=>['walk','run','move','jump'].includes(String(x).toLowerCase()))
  );
  const source=await sourceReachable(asset.sourceUrl);
  const healthy=licenseOk&&animationOk&&(localExists!==false)&&(source?.ok!==false);
  results.push({id:asset.id,name:asset.name||asset.id,actor,license,licenseOk,verifiedAnimation:asset.verifiedAnimation===true,animationOk,localPath:localPath||null,localExists,sourceUrl:asset.sourceUrl||null,source,healthy});
}

const output={
  version:1,
  updatedAt:now,
  policy:{blockedLicenses:[...blocked],actorsRequireVerifiedMovementAnimation:true,externalSourceCheck:true},
  summary:{total:results.length,healthy:results.filter(x=>x.healthy).length,unhealthy:results.filter(x=>!x.healthy).length},
  assets:results
};
fs.writeFileSync('asset-health.json',JSON.stringify(output,null,2)+'\n');
console.log(`ASSET_HEALTH_TOTAL=${results.length}`);
console.log(`ASSET_HEALTH_UNHEALTHY=${output.summary.unhealthy}`);
if(output.summary.unhealthy)process.exitCode=2;
