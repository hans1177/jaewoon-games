import crypto from 'node:crypto';

const clean=v=>String(v??'').trim();
const upper=v=>clean(v).toUpperCase();
const lower=v=>clean(v).toLowerCase();
const unique=(values=[])=>[...new Set(values.map(clean).filter(Boolean))];
const hash=value=>crypto.createHash('sha256').update(String(value)).digest('hex').slice(0,16);

function parseJsonText(value){try{return JSON.parse(clean(value));}catch{return null;}}
function qaOf(record={}){const qa=record.qa||record.verification||{};return{independentQa:upper(qa.independentQa??record.independentQa),browserQa:upper(qa.browserQa??record.browserQa),runtime:upper(qa.runtime??record.runtime)};}
function sourceKindOf(record={}){return lower(record.provenance?.sourceKind??record.sourceKind);}
function sourceRevisionOf(record={}){return clean(record.provenance?.sourceRevision??record.sourceRevision??record.sourceCommit);}
function projectOf(record={}){return clean(record.project??record.gameId??record.provenance?.gameId??'shared');}

export function transformativeMaterialEligibility(record={}){
  if(lower(record.lifecycle||'active')!=='active')return{pass:false,reason:'INACTIVE'};
  const qa=qaOf(record),sourceKind=sourceKindOf(record),revision=sourceRevisionOf(record);
  if(!revision)return{pass:false,reason:'SOURCE_REVISION_MISSING'};
  if(sourceKind==='authorized-source'){
    const verification=record.verification||{};
    const pass=upper(record.provenance?.authority)==='OWNER_ASSERTED_REUSE_REINTERPRETATION'
      &&qa.independentQa==='AUTHORIZED_SOURCE_EVIDENCE_PASS'
      &&qa.browserQa==='NOT_APPLICABLE'
      &&qa.runtime==='STATIC_VERIFIED'
      &&upper(verification.authorizedSourceEvidence)==='PASS'
      &&verification.runtimePassClaimed===false;
    return{pass,reason:pass?'AUTHORIZED_SOURCE_VERIFIED':'AUTHORIZED_SOURCE_GATE_FAILED',mode:'AUTHORIZED_SOURCE'};
  }
  if(sourceKind==='external-black-box'){
    const pass=qa.independentQa==='BLACK_BOX_EVIDENCE_PASS'&&qa.browserQa==='NOT_APPLICABLE'&&qa.runtime==='PASS';
    return{pass,reason:pass?'BLACK_BOX_VERIFIED':'BLACK_BOX_GATE_FAILED',mode:'BLACK_BOX_RUNTIME'};
  }
  if(sourceKind==='commercial-runtime-reference'){
    const p=record.provenance||{};
    const pass=record.practiceOnly===true
      &&record.runtimePromotionAllowed===false
      &&upper(p.observationKind)==='BLACK_BOX_RUNTIME_ONLY'
      &&p.codeExtracted===false
      &&p.binaryRedistributed===false
      &&qa.runtime==='PASS';
    return{pass,reason:pass?'COMMERCIAL_RUNTIME_VERIFIED':'COMMERCIAL_RUNTIME_GATE_FAILED',mode:'BLACK_BOX_RUNTIME'};
  }
  const task=lower(record.taskType),nativeTask=task==='unity'||task==='roblox';
  const pass=qa.runtime==='PASS'&&qa.independentQa==='PASS'&&(nativeTask?qa.browserQa==='NOT_APPLICABLE':qa.browserQa==='PASS');
  return{pass,reason:pass?'CANONICAL_VERIFIED':'CANONICAL_GATE_FAILED',mode:'CANONICAL_VERIFIED'};
}

function extractFeatures(record={}){
  const sourceKind=sourceKindOf(record),parsed=parseJsonText(record.input)||{};
  const domains=Array.isArray(parsed.learningDomains)?parsed.learningDomains:[];
  const authorizedPatterns=clean(record.output).split(/\r?\n/).map(x=>x.trim())
    .filter(line=>line.startsWith('- AUTHORIZED_SOURCE:'))
    .map(line=>line.slice('- AUTHORIZED_SOURCE:'.length));
  const runtimeSignals=[];
  const verification=record.verification||record.qa||{};
  for(const [key,value] of Object.entries(verification)){
    if(upper(value)==='PASS'||value===true)runtimeSignals.push('runtime:'+key);
  }
  return{
    domains:unique([...(record.tags||[]),...domains,...authorizedPatterns,clean(record.topic),lower(record.taskType)]).slice(0,32),
    runtimeSignals:unique(runtimeSignals).slice(0,24),
    capabilities:{
      sourceStructure:sourceKind==='authorized-source'&&Number(parsed?.counts?.sourceDocuments||0)>0,
      assetStructure:sourceKind==='authorized-source'&&Number(parsed?.counts?.assets||0)>0,
      algorithmStructure:sourceKind==='authorized-source',
      runtimeObservation:sourceKind!=='authorized-source'||upper(verification.runtime)==='PASS'
    }
  };
}

export function buildTransformativeRecombination({trainingSamples=[],maxRecipes=64}={}){
  const materials=[];
  trainingSamples.forEach((record,index)=>{
    const gate=transformativeMaterialEligibility(record);
    if(!gate.pass)return;
    const project=projectOf(record);
    if(!project||project==='shared')return;
    const features=extractFeatures(record);
    materials.push({
      id:clean(record.sampleId||record.candidateId)||'material_'+hash(project+'|'+index+'|'+sourceRevisionOf(record)),
      project,
      gameId:clean(record.gameId||record.provenance?.gameId)||project,
      taskType:lower(record.taskType)||'general',
      sourceKind:sourceKindOf(record),
      evidenceMode:gate.mode,
      sourceRevision:sourceRevisionOf(record),
      domains:features.domains,
      runtimeSignals:features.runtimeSignals,
      capabilities:features.capabilities,
      authority:'derived-feature-material-only',
      rawSourceOutputAllowed:false,
      rawAssetOutputAllowed:false,
      directCopyAllowed:false
    });
  });

  const dedup=[],seen=new Set();
  for(const item of materials){
    const key=item.project+'|'+item.sourceRevision+'|'+item.evidenceMode;
    if(seen.has(key))continue;
    seen.add(key);dedup.push(item);
  }

  const operators=['change-core-goal','change-input-model','change-progression-cadence','change-risk-reward-relationship','change-spatial-layout','change-visual-language','change-session-structure','change-feedback-rhythm'];
  const recipes=[],limit=Math.max(1,Math.floor(Number(maxRecipes)||64));
  for(let i=0;i<dedup.length&&recipes.length<limit;i+=1){
    for(let j=i+1;j<dedup.length&&recipes.length<limit;j+=1){
      const left=dedup[i],right=dedup[j];
      if(left.project===right.project)continue;
      const featureBlend=unique([...left.domains.slice(0,6),...right.domains.slice(0,6)]).slice(0,10);
      if(featureBlend.length<2)continue;
      const seed=left.id+'|'+right.id;
      const opIndex=parseInt(hash(seed).slice(0,8),16)%operators.length;
      recipes.push({
        id:'recombine_'+hash(seed),
        sourceProjects:[left.project,right.project],
        sourceMaterialIds:[left.id,right.id],
        featureBlend,
        transformationOperator:operators[opIndex],
        internalCreationRequirement:'ADD_PROJECT_SPECIFIC_ORIGINAL_MECHANIC_OR_CONSTRAINT',
        assetStrategy:{
          newAssetRequired:true,
          mayUseAuthorizedAssetStructureAsReference:left.capabilities.assetStructure||right.capabilities.assetStructure,
          mayUseCommercialVisualObservationAsReference:left.evidenceMode==='BLACK_BOX_RUNTIME'||right.evidenceMode==='BLACK_BOX_RUNTIME',
          outputMustBeNewExpression:true,
          rawPixelReuseAllowed:false,
          rawAudioReuseAllowed:false,
          logoOrSourceIdentityReuseAllowed:false
        },
        codeStrategy:{
          newImplementationRequired:true,
          architecturePatternsMayBeReinterpreted:true,
          verbatimSourceReuseAllowed:false,
          sourceSpecificIdentifiersAllowed:false
        },
        noveltyChecks:['MULTI_PROJECT_BLEND','ORIGINAL_MODIFIER_REQUIRED','NO_RAW_SOURCE_OUTPUT','NO_RAW_ASSET_OUTPUT','NO_SOURCE_IDENTITY_OUTPUT','INDEPENDENT_QA_REQUIRED'],
        countsAsTrainingSample:false,
        authority:'transformative-recombination-context-only'
      });
    }
  }

  return{
    version:1,
    generation:'V3-PUMP-TRANSFORMATIVE-RECOMBINATION',
    materials:dedup,
    recipes,
    policy:{
      copyMode:false,
      transformativeReinterpretation:true,
      multiProjectBlendRequired:true,
      minimumDistinctProjects:2,
      originalModifierRequired:true,
      rawSourceOutputAllowed:false,
      rawAssetOutputAllowed:false,
      commercialRuntimeUsesObservationOnly:true,
      authorizedSourceMayContributeSourceAssetAlgorithmStructure:true,
      finalOutputRequiresExistingQaRuntimeRegressionGates:true,
      countsAsTrainingSample:false
    },
    authority:'derived-feature-and-recombination-memory'
  };
}
