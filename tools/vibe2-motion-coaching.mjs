// 파일명: tools/vibe2-motion-coaching.mjs
// 역할: 기존 소스 워커에 내부 모션 원리·실제 코드·형태별 응용 과제를 읽기 전용으로 제공한다.
// Read-only design coaching for the existing source worker. No queue, trainer or source writer.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT='assets/roblox/world-ghosts';
// Rig facts below must be reviewed again if the factory changes, even if its new build passes.
const RIG_SHA='e091c6a1d92f775b2648a3312e64a632dd0bfcab30483fa3f1053fb9e4b53958';
const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
export const MOTION_DETAIL_AXES=Object.freeze(['POSE_AND_STAGING','WEIGHT_AND_BALANCE','JOINT_ARCS_AND_SPACING','CONTACT_AND_CONSTRAINTS','OVERLAP_AND_SETTLE','LOOP_AND_TRANSITION']);
const PRINCIPLES=[
  'POSE_AND_STAGING: express this creature silhouette and intent in its existing torso/head/limbs; neutral rest and action poses must remain readable at the game camera.',
  'WEIGHT_AND_BALANCE: shift load toward support before a limb lifts; separate support, swing and settling instead of making every joint share one sine wave.',
  'JOINT_ARCS_AND_SPACING: give each visible joint a bounded arc and purposeful phase; smooth acceleration into slow preparation and faster release without snapping.',
  'CONTACT_AND_CONSTRAINTS: respect actual parent joints and prop grips. Check support height and drift; a lifted joint or numeric curve does not prove planted world-space contact.',
  'OVERLAP_AND_SETTLE: delay existing head/arm/tail response behind the torso, reduce secondary amplitude, and settle after the primary action. Do not invent hair/cloth/prop bones.',
  'LOOP_AND_TRANSITION: periodic clips need matching position AND velocity at the seam; one-shot clips need bounded anticipation, release, recovery and rest outside their interval.'
];
const FORM_IDEAS={
  HUNCHED:'Low stalking: long support, short quiet swing, asymmetric shoulders, head looking ahead of a hunched chest.',
  SHROUD:'Unsettling glide: low-frequency closed drift, brief suspension, delayed head turn; the hem is welded to Torso, not separately simulated cloth.',
  BEAST:'Four-foot stalking: ordered footfalls, long support, chest load transfer, restrained head/tail counter-motion; no humanoid two-leg substitution.',
  CENTAUR:'Four-foot support under an independently staged upper body; phase front/back legs and counterbalance the upper torso.',
  SERPENT:'Traveling coil wave: spatial phase offset and amplitude taper; Coil0..6 are siblings under Tail, not a recursive chain.',
  RIBBON:'Soft traveling ribbon wave with restrained head lead; sibling coils must not accumulate parent rotation.',
  HEADLESS:'Carried-head stability: shoulder lead and torso weight shift while the actual carrying arm compensates to hold the prop steady.',
  ARACHNID:'Alternating support groups with low abdomen; each SpiderLeft/Right1..4 has its own child Knee. Lift only the swing group and preserve support.',
  GIANT:'Heavy deliberate steps: visible weight acceptance, slower torso acceleration, small delayed head and arm settling, no random whole-body jitter.',
  STOCKY:'Compact grounded gait: short arcs, wide support, shoulder roll; keep feet beneath the loaded mass.',
  SMALL:'Quick cautious steps with short travel and a stable head; vary support/swing timing rather than scaling a giant gait.',
  TALL:'Measured long strides: restrained vertical bob, shoulder counter-rotation, delayed gaze; check long limbs for intersections.',
  SLENDER:'Narrow silent steps, offset shoulders, controlled head tracking; avoid identical left/right arm amplitudes.',
  SKELETON:'Angular staging with smooth joint velocity: clear elbows and head silhouette, restrained follow-through; do not add nonexistent elbow joints.',
  LONG_ARM:'Low hanging arm pendulums delayed behind footfalls; avoid hands sweeping through the torso or floor.',
  LONG_NECK:'Head anticipation followed by torso response; the visible long neck follows Head, so use bounded existing Head offsets, not invented neck segments.',
  THIN_NECK:'Small delayed head tilt with stable torso; avoid exaggerated rotation that disconnects the thin neck silhouette.',
  CRAWLER:'Low forward intent and coordinated existing arms/legs; inspect hand and foot clearance instead of claiming unimplemented IK.',
  HALF_BODY:'Upper-body pull and delayed head/arms; inspect actual visible geometry before relying on unused base leg joints.',
  FLOATING_HEAD:'Head-led drift and restrained turn/settle; animate the visible Head, not invisible walking legs.',
  BOUND:'Constrained sway and small controlled progression; keep bound silhouette and do not invent free limbs.',
  UMBRELLA:'Shaft-led balance and canopy counter-tilt; for ONE_LEG use only the visible supporting leg, then bounded landing recovery.',
  LANTERN:'Pendulum-like body drift with a delayed turn and soft settle; preserve rigid lantern construction.',
  WALL:'Massive hesitant translation/tilt with a slow load shift; blocks share Torso, so avoid pretending they move independently.',
  WHEEL:'Coherent visual roll and small axle settling; Root stays unchanged and visual roll alone does not prove world-space no-slip travel.',
  WINGED:'Torso-led suspension and delayed existing appendages; inspect actual wing attachment before promising independent flapping.',
  OBJECT_SWARM:'Gather, directional push, recoil and recovery through Torso; books are welded to it, so independent orbit requires a separate authorized rig task.'
};
const TEACHERS=['ghoul','banshee','dullahan','kelpie','leshy','boitata','ifrit','redcap','mare','poltergeist'];
const BIPEDS=new Set(['HUNCHED','HEADLESS','GIANT','STOCKY','SMALL','TALL','SLENDER','SKELETON','LONG_ARM','LONG_NECK','THIN_NECK','CRAWLER','HALF_BODY','WINGED']);
function family(form){return BIPEDS.has(form)?'BIPED':form==='CENTAUR'?'BEAST':form==='RIBBON'?'SERPENT':form;}
function rowsFromCatalog(source){
  return source.split('\n').map(line=>{
    const id=line.match(/\bid="([a-z0-9-]+)"/)?.[1],form=line.match(/\bform="([A-Z_]+)"/)?.[1];
    return id&&form?{id,form,name:line.match(/\bname="([^"]+)"/)?.[1]||id,role:line.match(/\brole="([^"]+)"/)?.[1]||'',features:[...(line.match(/features=\{([^}]*)\}/)?.[1]||'').matchAll(/"([A-Z_]+)"/g)].map(m=>m[1])}:null;
  }).filter(Boolean);
}
function rigFor(row){
  const parents={Root:null,Torso:'Root',Head:'Torso',LeftArm:'Torso',RightArm:'Torso',LeftLeg:'Root',RightLeg:'Root',Tail:'Torso'};
  if(['BEAST','CENTAUR'].includes(row.form))for(const end of ['Front','Back'])for(const side of ['Left','Right'])parents[end+side+'Leg']='Torso';
  if(['SERPENT','RIBBON'].includes(row.form))for(let i=0;i<7;i++)parents['Coil'+i]='Tail';
  if(row.form==='ARACHNID')for(const side of ['Left','Right'])for(let i=1;i<=4;i++){const name='Spider'+side+i;parents[name]='Torso';parents[name+'Knee']=name;}
  const props=new Set(['LANTERN','KEYS','CLUB','SCROLL','FAN','SCISSORS','BELL','JADE_ORB','WRAPPED_BUNDLE','COIN_BAG','PIPE','CARRIED_HEAD','COMB','HOOK','CANDLE','BROOM','AXE','PUMPKIN','SWORD','BONE_BAG','HAIR_PIN','TALISMAN','UMBRELLA']);
  return {parents,propParents:Object.fromEntries(row.features.flatMap((feature,i)=>props.has(feature)?[[feature,i%2===0?'RightArm':'LeftArm']]:[])),rootMotion:'ZERO_VISUAL_ROOT; locomotion remains owned by gameplay',units:'local translation and radians; rest C0 * translation * Euler rotation',caution:'Base joints can exist without visible body parts. No biped knee/ankle joints. Only spider knees exist.'};
}

export function buildInternalMotionCoaching({cwd=process.cwd(),order={}}={}){
  const unit=order.assetProduction?.motionRepairWorkUnit;
  const inactive=reason=>({block:'',evidence:{retrieved:false,reason,advisoryOnly:true,applicationVerified:false,weightTraining:false}});
  if(order.source?.internalAssetMotion!==true||unit?.scope!=='INTERNAL_ASSET_LIBRARY')return inactive('NOT_INTERNAL_MOTION');
  const id=String(unit.objectId||'').replace(/^roblox-world-ghost-/,'');
  if(!/^[a-z0-9-]+$/.test(id)||!['walk','attack'].includes(unit.clipId))return inactive('UNSUPPORTED_BINDING');
  try{
    const root=path.resolve(cwd,ROOT);
    const read=relative=>{
      const absolute=fs.realpathSync(path.join(root,relative));
      if(!absolute.startsWith(fs.realpathSync(root)+path.sep))throw new Error('REFERENCE_OUTSIDE_ROOT');
      return fs.readFileSync(absolute,'utf8');
    };
    const build=JSON.parse(read('native/build-evidence.json'));
    if(build.officialLuauCompiled!==true)return inactive('COMPILED_REFERENCE_REQUIRED');
    const hashes=new Map((build.sources||[]).map(row=>[row.file,row.sha256]));
    const checked=relative=>{const code=read(relative);if(hashes.get(relative)!==sha(code))throw new Error('STALE_REFERENCE:'+relative);return code;};
    const factory=checked('GhostSkinFactory.luau');
    if(sha(factory)!==RIG_SHA)return inactive('RIG_CONTRACT_REVIEW_REQUIRED');
    const catalog=checked('GhostSkinCatalog.luau'),rows=rowsFromCatalog(catalog),target=rows.find(row=>row.id===id);
    if(!target)return inactive('TARGET_NOT_IN_CATALOG');
    const compatible=TEACHERS.map(teacherId=>rows.find(row=>row.id===teacherId)).filter(row=>row&&row.id!==id&&family(row.form)===family(target.form));
    compatible.sort((a,b)=>Number(b.form===target.form)-Number(a.form===target.form));
    let reference=null;
    for(const row of compatible){
      const relative='motions/'+row.id+'/init.luau';
      try{
        const code=checked(relative);
        if(!code.includes('Motion.AuthoredClip = "'+unit.clipId+'"')||!code.includes('Motion.AssetId = "'+row.id+'"')||Buffer.byteLength(code,'utf8')>6000)continue;
        reference={path:ROOT+'/'+relative,sha256:sha(code),objectId:row.id,form:row.form,clipId:unit.clipId,code};break;
      }catch{} // A stale/missing example is omitted; it never bypasses task validation.
    }
    const evidence={retrieved:true,kind:'SOURCE_BOUND_DESIGN_COACHING',targetId:id,form:target.form,clipId:unit.clipId,catalogSha256:sha(catalog),factorySha256:sha(factory),reference:reference?{path:reference.path,sha256:reference.sha256,objectId:reference.objectId,form:reference.form,clipId:reference.clipId}:null,advisoryOnly:true,applicationVerified:false,nativeQualityVerified:false,weightTraining:false};
    const block=[
      '[INTERNAL MOTION COACHING BEGIN]',
      JSON.stringify(evidence),
      'DISTILLED DESIGN PRINCIPLES (design advice, not a learned-weight or visual-quality claim):',...PRINCIPLES,
      'TARGET IDENTITY AND REAL RIG: '+JSON.stringify({...target,rig:rigFor(target)}),
      'APPLIED IDEA: '+(FORM_IDEAS[target.form]||'Preserve the observed anatomy and refine only the assigned motion.'),
      unit.clipId==='attack'?'ACTION: stage anticipation -> release at the existing hit timing -> follow-through -> recovery. Keep damage, hitbox, attack duration and event timing unchanged.':'WALK: develop support -> transfer -> swing -> contact -> settle inside the existing loop. Preserve any declared duration; attack ideas belong to a separate assigned clip.',
      'VARIATION TASK: derive timing, load direction, arc shape and asymmetry from this target form, features and role. Choose a coherent signature; random coefficients or renaming the teacher do not count as a new design.',
      'QUALITY REVIEW: at the actual game camera and mobile distance, compare the same source-bound clip before/after at normal and quarter speed. Name the worst frame and actual joint for each applicable depth axis. Inspect support transfer, floor/prop contact, silhouette intersections, delayed settling and position/velocity at seams. Recheck the same failed interval after repair; keep unmeasured world contact and native quality UNVERIFIED. Preserve already sound channels instead of making every joint move more.',
      'FAILURE CHECKS: no empty patch, no Root displacement, no invisible-joint-only polish, no invented joints, no prop detachment, no loop snap, no unrelated clip edit. Request same-camera before/after runtime review; do not claim it happened.',
      reference?'READ-ONLY APPLIED CODE EXAMPLE '+reference.path+' sha256='+reference.sha256+'\n'+reference.code:'No compatible compiled example is available; do not substitute a different body topology or claim successful reference reuse.',
      'The example was source-compiled, not native-quality-approved. Edit only the TARGET sourceWindow. Keep its object binding, existing API, locked source and semantics; do not copy the example AssetId or Duration.',
      '[INTERNAL MOTION COACHING END]'
    ].join('\n');
    return {block,evidence};
  }catch(error){return inactive(String(error.message||error));}
}

export function singleMotionResponseSchema(){
  const string={type:'string',minLength:1};
  return {type:'object',properties:{
    edits:{type:'array',minItems:1,items:{type:'object',properties:{path:string,find:string,replace:string},required:['path','find','replace'],additionalProperties:false}},
    motionRepairReport:{type:'object',properties:{objectId:string,clipId:string,depthEvidence:{type:'array',minItems:6,maxItems:6,items:{type:'object',properties:{axis:{type:'string',enum:[...MOTION_DETAIL_AXES]},status:{type:'string',enum:['CHANGED','PRESERVED']},before:string,after:string},required:['axis','status','before','after'],additionalProperties:false}}},required:['objectId','clipId','depthEvidence'],additionalProperties:false},
    summary:string,expectedEffect:string,tests:{type:'array',items:string}
  },required:['edits','motionRepairReport','summary','expectedEffect'],additionalProperties:false};
}
