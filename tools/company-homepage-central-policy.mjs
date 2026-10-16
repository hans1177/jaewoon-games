// Derive homepage publication authority from the owner-locked canonical roadmap.
// This is a projection into the existing manager/Director workflow, not a new gate.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const POLICY_PATH='company-learning/platform-release-roadmap.json';
const sha=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function compileHomepageCentralPolicy(policy={}){
  const errors=[];
  const home=policy?.serverHomepageIntegration;
  if(policy?.status!=='OWNER_DIRECT_LOCKED'||policy?.machineSourceOfTruth!==POLICY_PATH)
    errors.push('CANONICAL_ROADMAP_UNVERIFIED');
  if(!home||typeof home!=='object'||home.sourceOfTruth!==POLICY_PATH)
    errors.push('HOMEPAGE_EXECUTION_CONTRACT_MISSING');
  const supportedPlatforms=home?.supportedPlatforms;
  if(!Array.isArray(supportedPlatforms)||!supportedPlatforms.length||
     supportedPlatforms.some(x=>typeof x!=='string'||!/^[A-Z][A-Z0-9_]*$/.test(x)))
    errors.push('HOMEPAGE_NATIVE_PLATFORM_SCOPE_INVALID');
  if(home?.runtimeAuthority!=='company-runtime'||home?.serverRuntimeBranch!=='company-runtime'||
     home?.publicSourceBranch!=='main'||home?.directUnsupervisedPublicWriteForbidden!==true)
    errors.push('HOMEPAGE_PUBLICATION_AUTHORITY_INVALID');
  if(home?.managerContract?.mode!=='SINGLE_MANAGER_WITH_SINGLE_POST_WORK_SUPERVISOR'||
     home?.managerContract?.manager!=='HOMEPAGE'||home?.managerContract?.supervisor!=='DIRECTOR'||
     home?.managerContract?.managerCount!==1||home?.managerContract?.supervisorCount!==1||
     home?.directiveMirrorMayNotOverrideCentral!==true)
    errors.push('HOMEPAGE_MANAGER_DIRECTOR_CONTRACT_INVALID');
  if(home?.homepageListingContract?.allDeployedGamesVisible!==true||
     home?.homepageListingContract?.unverifiedOrMissingGameBuildDisablesPlayButtonOnly!==true)
    errors.push('HOMEPAGE_NO_FAKE_PLAY_LINK_CONTRACT_MISSING');
  const contract=home&&typeof home==='object'?{
    version:home.version,managerContractAuthority:home.managerContractAuthority,
    runtimeAuthority:home.runtimeAuthority,serverRuntimeBranch:home.serverRuntimeBranch,
    publicSourceBranch:home.publicSourceBranch,
    supportedPlatforms:[...(Array.isArray(supportedPlatforms)?supportedPlatforms:[])],
    showUnityWeb:home.showUnityWeb===true,
    directiveMirrorMayNotOverrideCentral:home.directiveMirrorMayNotOverrideCentral,
    managerContract:home.managerContract,testingContract:home.testingContract,
    documentationSyncContract:home.documentationSyncContract,
    homepageListingContract:home.homepageListingContract
  }:{};
  return{valid:errors.length===0,errors,
    supportedPlatforms:contract.supportedPlatforms||[],
    fingerprint:errors.length?null:sha({contract,frontDoor:policy.homepagePresentation,
      independentWeb:policy.independentWebGameDevelopment20261017||null}),
    contract};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  try{
    const args=process.argv.slice(2);
    const output=args.find(x=>x.startsWith('--output='))?.slice('--output='.length);
    if(!output)throw new Error('HOMEPAGE_CONTEXT_OUTPUT_REQUIRED');
    const source=args.find(x=>x.startsWith('--policy='))?.slice('--policy='.length)||POLICY_PATH;
    const policy=JSON.parse(fs.readFileSync(source,'utf8'));
    const homepage=compileHomepageCentralPolicy(policy);
    if(!homepage.valid)throw new Error('HOMEPAGE_CENTRAL_POLICY_INVALID:'+homepage.errors.join('|'));
    fs.writeFileSync(output,JSON.stringify({homepage},null,2)+'\n');
    console.log('HOMEPAGE_CENTRAL_POLICY_SYNC=PASS');
    console.log('HOMEPAGE_CENTRAL_POLICY_SHA256='+homepage.fingerprint);
  }catch(error){console.error(String(error.message));process.exitCode=1;}
}
