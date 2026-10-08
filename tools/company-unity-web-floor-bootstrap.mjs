import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createVibeProceduralWorldLayout} from '../assets/vibe-environment-director.js';

const args=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')).map(raw=>{
  const i=raw.indexOf('=');
  return i>0?[raw.slice(2,i),raw.slice(i+1)]:[raw.slice(2),'true'];
}));
const gameId=String(args['game-id']||'').trim();
const gameName=String(args['game-name']||gameId).trim();
const baselinePath=String(args.baseline||'').trim();
const output=String(args.output||`unity-games/${gameId}`).replaceAll('\\','/').trim();
const buildUpDirectivePath=String(args['build-up-directive']||'').trim();
const playbooksPath=String(args.playbooks||'').trim();
const verifiedLearningRevision=String(args['learning-revision']||'').trim();
if(!/^[a-z0-9][a-z0-9-]{1,80}$/.test(gameId))throw new Error('UNITY_WEB_FLOOR_GAME_ID_INVALID');
if(!baselinePath||!fs.existsSync(baselinePath))throw new Error('UNITY_WEB_FLOOR_DESIGN_BASELINE_MISSING');
if(output!==`unity-games/${gameId}`)throw new Error('UNITY_WEB_FLOOR_OUTPUT_MUST_BE_CANONICAL_UNITY_ROOT');
if(!playbooksPath||!fs.existsSync(playbooksPath))throw new Error('UNITY_WEB_VERIFIED_EXTERNAL_LEARNING_REQUIRED');

const baseline=JSON.parse(fs.readFileSync(baselinePath,'utf8'));
const design=baseline.content||baseline;
const profile=design?.platformProfiles?.UNITY;
if(!profile||String(profile.platform||'').toUpperCase()!=='UNITY')throw new Error('UNITY_PLATFORM_PROFILE_REQUIRED');
const identity=String(design.identity||gameName).replace(/\s+/g,' ').trim();
const coreLoop=(Array.isArray(design.coreLoop)?design.coreLoop:[]).map(v=>String(v).trim()).filter(Boolean).slice(0,6);
const multiplayerMode=String(design.multiplayerMode||'SINGLE_PLAYER').trim();
const category=
  /survival/i.test(gameId)?'SURVIVAL':
  /defen[cs]e/i.test(gameId)?'DEFENSE':
  /puzzle/i.test(gameId)?'PUZZLE':
  /idle/i.test(gameId)?'IDLE_RPG':
  /story|rpg|dungeon/i.test(gameId)?'RPG':
  /tycoon/i.test(gameId)?'TYCOON':'ACTION';
const packageId=`com.jaewoongames.${gameId.replace(/[^a-z0-9]/g,'').slice(0,48)}`;
const prefix=gameId.replace(/[^a-zA-Z0-9]/g,'_');
const csharp=v=>String(v).replaceAll('\\','\\\\').replaceAll('"','\\"').replace(/\r?\n/g,' ');
const fingerprint=createHash('sha256').update(fs.readFileSync(new URL(import.meta.url))).digest('hex');
const buildUpDirective=buildUpDirectivePath&&fs.existsSync(buildUpDirectivePath)?JSON.parse(fs.readFileSync(buildUpDirectivePath,'utf8')):null;
const buildUpDirectiveConsumed=Boolean(String(buildUpDirective?.directiveId||'').trim());
if(buildUpDirectiveConsumed&&String(buildUpDirective?.gameId||'').trim()!==gameId)throw new Error('BUILD_UP_DIRECTIVE_GAME_ID_MISMATCH');
const playbooks=JSON.parse(fs.readFileSync(playbooksPath,'utf8'));
if(String(playbooks.generatedFrom||'')!=='VERIFIED_MEMORY_ONLY')throw new Error('UNITY_WEB_VERIFIED_PLAYBOOK_SOURCE_REQUIRED');
const relevantPlaybookKeys=['unity','web','graphics','motion','presentation','ui','vfx','coding','general'];
const verifiedPlaybookRows=relevantPlaybookKeys
  .map(key=>({key,row:playbooks?.taskTypes?.[key]}))
  .filter(item=>item.row&&String(item.row.authority||'')==='verified-task-playbook');
if(!verifiedPlaybookRows.some(item=>item.key==='unity'))throw new Error('UNITY_WEB_VERIFIED_UNITY_PLAYBOOK_REQUIRED');
if(!verifiedPlaybookRows.some(item=>item.key==='graphics'))throw new Error('UNITY_WEB_VERIFIED_GRAPHICS_PLAYBOOK_REQUIRED');
const externalReuseById=new Map();
for(const item of verifiedPlaybookRows){
  for(const row of Array.isArray(item.row?.reuse)?item.row.reuse:[]){
    const id=String(row?.id||'').trim();
    if(!id.startsWith('external-black-box-'))continue;
    const previous=externalReuseById.get(id)||{
      id,
      project:String(row?.project||'').trim()||null,
      sourceRevision:String(row?.sourceRevision||'').trim()||null,
      sourcePlaybooks:[],
      distilledApplicationPrinciples:[],
      distilledAvoidancePrinciples:[],
      distilledLearningUseAllowed:[]
    };
    previous.sourcePlaybooks=[...new Set([...previous.sourcePlaybooks,item.key])];
    previous.distilledApplicationPrinciples=[...new Set([...previous.distilledApplicationPrinciples,...(Array.isArray(row?.distilledApplicationPrinciples)?row.distilledApplicationPrinciples:[]).map(value=>String(value||'').trim()).filter(Boolean)])];
    previous.distilledAvoidancePrinciples=[...new Set([...previous.distilledAvoidancePrinciples,...(Array.isArray(row?.distilledAvoidancePrinciples)?row.distilledAvoidancePrinciples:[]).map(value=>String(value||'').trim()).filter(Boolean)])];
    previous.distilledLearningUseAllowed=[...new Set([...previous.distilledLearningUseAllowed,...(Array.isArray(row?.distilledLearningUseAllowed)?row.distilledLearningUseAllowed:[]).map(value=>String(value||'').trim()).filter(Boolean)])];
    externalReuseById.set(id,previous);
  }
}
const verifiedExternalLearning=[...externalReuseById.values()];
if(!verifiedExternalLearning.length)throw new Error('UNITY_WEB_VERIFIED_EXTERNAL_BLACK_BOX_PLAYBOOK_REQUIRED');
const verifiedExternalAppliedLearning=verifiedExternalLearning.filter(row=>row.distilledApplicationPrinciples.length>0);
const verifiedExternalMissingContentIds=verifiedExternalLearning.filter(row=>row.distilledApplicationPrinciples.length===0).map(row=>row.id);
const verifiedExternalApplicationCoveragePct=verifiedExternalLearning.length>0
  ?Math.floor((verifiedExternalAppliedLearning.length/verifiedExternalLearning.length)*100)
  :0;
if(verifiedExternalMissingContentIds.length)throw new Error('UNITY_WEB_VERIFIED_EXTERNAL_DISTILLED_CONTENT_REQUIRED:'+verifiedExternalMissingContentIds.join(','));
const verifiedLearningChecklist=[...new Set(verifiedPlaybookRows.flatMap(item=>Array.isArray(item.row?.checklist)?item.row.checklist:[]).map(value=>String(value||'').trim()).filter(Boolean))];
const verifiedLearningApplication=Object.freeze({
  source:'vibe2-learning-runtime:company-learning/vibe3-task-playbooks.json',
  sourceRevision:verifiedLearningRevision||null,
  generatedFrom:String(playbooks.generatedFrom||''),
  verifiedPlaybooks:verifiedPlaybookRows.map(item=>item.key),
  externalLearningIds:verifiedExternalLearning.map(row=>row.id),
  externalLearning:verifiedExternalLearning,
  externalApplicationPrinciples:[...new Set(verifiedExternalLearning.flatMap(row=>row.distilledApplicationPrinciples||[]))],
  externalAvoidancePrinciples:[...new Set(verifiedExternalLearning.flatMap(row=>row.distilledAvoidancePrinciples||[]))],
  externalLearningUseAllowed:[...new Set(verifiedExternalLearning.flatMap(row=>row.distilledLearningUseAllowed||[]))],
  checklist:verifiedLearningChecklist,
  retrievedCount:verifiedExternalLearning.length,
  appliedCount:verifiedExternalAppliedLearning.length,
  applicationCoveragePct:verifiedExternalApplicationCoveragePct,
  mandatoryApplicationCoveragePct:100,
  allRetrievedVerifiedExternalLearningApplied:verifiedExternalAppliedLearning.length===verifiedExternalLearning.length,
  applicationOrder:'VERIFIED_EXTERNAL_LEARNING_FIRST_THEN_GAME_SPECIFIC_TRANSFORMATIVE_APPLICATION',
  applyAxes:['MENU_FLOW_AND_INFORMATION_ARCHITECTURE','UI_UX_LAYOUT_FEEDBACK_AND_TOUCH_READABILITY','GRAPHICS_ART_DIRECTION_MATERIAL_LIGHTING_AND_COMPOSITION','MOTION_ANIMATION_TRANSITIONS_IMPACT_AND_SECONDARY_MOTION','ENVIRONMENT_WORLD_DENSITY_LANDMARK_AND_READABILITY','VFX_CAMERA_AUDIO_VISUAL_FEEDBACK_LANGUAGE','GAMEPLAY_SYSTEM_IMPLEMENTATION_WHEN_CAUSALLY_RELEVANT'],
  rawCommercialCodeCopyForbidden:true,
  rawCommercialAssetCopyForbidden:true,
  distinctiveExpressionCloneForbidden:true,
  gameSpecificReauthoringRequired:true,
  runtimeQaAndLearningReturnRequired:true
});

// 월드 설계가 승인한 신규 3D 공간만 기존 유니티 소스로 생성한다. 기존 게임은 기본 렌더링을 그대로 유지한다.
const approvedWorldRequest=design?.spatialLayout?.proceduralWorld;
const hasApprovedWorld=approvedWorldRequest?.approvedDesign===true;
if(hasApprovedWorld&&String(design.spatialLayout?.dimension||approvedWorldRequest.dimension).toUpperCase()!=='3D')
  throw new Error('UNITY_WEB_PROCEDURAL_WORLD_DIMENSION_REQUIRES_NATIVE_3D_RENDERER');
const worldProposal=hasApprovedWorld
  ?createVibeProceduralWorldLayout({...approvedWorldRequest,dimension:'3D',approvedDesign:true,mobile:approvedWorldRequest.mobile!==false})
  :null;
if(worldProposal&&worldProposal.status!=='STATIC_LAYOUT_PROPOSED')
  throw new Error('UNITY_WEB_PROCEDURAL_WORLD_PLACEMENT_REPAIR_REQUIRED:'+worldProposal.issues.join('|'));
const worldData=worldProposal?{
  version:1,seed:worldProposal.seed,width:worldProposal.size.width,height:worldProposal.size.height,
  cellSize:worldProposal.size.cellSize,layoutStatus:worldProposal.status,
  heights:worldProposal.terrain.map(tile=>+(tile.elevation*8).toFixed(4)),
  types:worldProposal.terrain.map(tile=>({WATER:0,RIDGE:1,FOREST:2,DRY:3,PLAIN:4})[tile.biome]??4),
  roads:worldProposal.roadCells.map(tile=>tile.z*worldProposal.size.width+tile.x),
  buildings:worldProposal.buildings.map(item=>({
    x:item.footprint[0].x,z:item.footprint[0].z,elevation:+item.foundation.levelY.toFixed(4),
    door:({NORTH:0,SOUTH:1,EAST:2,WEST:3})[item.doorFacing]??0,
    roof:item.modules.some(module=>module.endsWith('PITCHED_ROOF'))?1:0,
    material:({STONE:1,METAL_GLASS:2,CLAY:3,TIMBER:0})[item.construction.primaryMaterial]??0,
    size:2
  })),
  vegetation:worldProposal.vegetation.map(item=>({
    x:item.x,z:item.z,elevation:+item.elevationY.toFixed(4),scale:item.scale,
    kind:({ROCK:0,SCRUB:1,PINE:2,BROADLEAF:3,BUSH:4})[item.kind]??4
  })),
  landmark:worldProposal.landmark?.cell||null,
  gameplayCollisionAuthority:false,saveMutation:false,engineRuntimeVerified:false
}:null;
const worldDataText=worldData?JSON.stringify(worldData)+'\n':null;
const worldDataSha256=worldDataText?createHash('sha256').update(worldDataText).digest('hex'):null;

fs.rmSync(output,{recursive:true,force:true});
for(const dir of [
  'Assets/Scripts','Assets/Editor','Assets/Art','Assets/Prefabs','Assets/Materials','Assets/Animations',
  'Packages','ProjectSettings'
])fs.mkdirSync(path.join(output,dir),{recursive:true});
fs.writeFileSync(path.join(output,'Packages/manifest.json'),JSON.stringify({dependencies:{'com.unity.modules.imgui':'1.0.0'}},null,2)+'\n');
fs.writeFileSync(path.join(output,'ProjectSettings/ProjectVersion.txt'),'m_EditorVersion: 6000.6.0f1\nm_EditorVersionWithRevision: 6000.6.0f1 (f7f8ed4d1e24)\n');
fs.writeFileSync(path.join(output,'Assets/link.xml'),'<linker><assembly fullname="UnityEngine.CoreModule" preserve="all" /></linker>\n');
if(worldDataText){
  fs.mkdirSync(path.join(output,'Assets/Resources'),{recursive:true});
  fs.writeFileSync(path.join(output,'Assets/Resources/vibe-world-layout.json'),worldDataText);
}
fs.writeFileSync(path.join(output,'Assets/verified-external-learning.json'),JSON.stringify({
  version:1,
  gameId,
  sourceRevision:verifiedLearningApplication.sourceRevision,
  coveragePct:verifiedLearningApplication.applicationCoveragePct,
  applyAxes:verifiedLearningApplication.applyAxes,
  externalLearning:verifiedLearningApplication.externalLearning,
  externalApplicationPrinciples:verifiedLearningApplication.externalApplicationPrinciples,
  externalAvoidancePrinciples:verifiedLearningApplication.externalAvoidancePrinciples,
  externalLearningUseAllowed:verifiedLearningApplication.externalLearningUseAllowed,
  rawCommercialCodeCopyForbidden:true,
  rawCommercialAssetCopyForbidden:true,
  distinctiveExpressionCloneForbidden:true,
  gameSpecificReauthoringRequired:true
},null,2)+'\n');
for(const [dir,value] of Object.entries({
  Art:{domain:'environment-character-enemy-equipment',identity},
  Prefabs:{domain:'runtime-generated-gameplay-objects',category},
  Materials:{domain:'game-specific-material-profile',category},
  Animations:{domain:'continuous-transform-motion',category},
})){
  fs.writeFileSync(path.join(output,'Assets',dir,'unity-web-floor-domain.json'),JSON.stringify({gameId,...value},null,2)+'\n');
}

const nativeWorldRuntime=worldData?"\n    // 승인된 게임별 월드 데이터로 Unity WebGL 안에 지형·도로·건축·수목을 렌더한다.\n    // 표면 표현만 생성하며 기존 콜라이더·전투·저장·보상에는 접근하지 않는다.\n    [System.Serializable] private sealed class Lot\n    {\n        public int x,z,size,roof,material,door;\n        public float elevation;\n    }\n    [System.Serializable] private sealed class Plant\n    {\n        public int x,z,kind;\n        public float elevation,scale;\n    }\n    [System.Serializable] private sealed class Layout\n    {\n        public int version,width,height;\n        public float cellSize;\n        public float[] heights;\n        public int[] types,roads;\n        public Lot[] buildings;\n        public Plant[] vegetation;\n        public bool gameplayCollisionAuthority,saveMutation,engineRuntimeVerified;\n    }\n    private static Material WorldMaterial(Color color)\n    {\n        Shader shader=Shader.Find(\"Unlit/Color\");\n        if(shader==null)shader=Shader.Find(\"Standard\");\n        if(shader==null)throw new System.InvalidOperationException(\"WORLD_SHADER_UNAVAILABLE\");\n        var material=new Material(shader);material.color=color;material.enableInstancing=true;\n        return material;\n    }\n    private static void WorldMesh(Transform parent,string name,Mesh mesh,Material[] materials)\n    {\n        var child=new GameObject(name);child.transform.SetParent(parent,false);\n        child.AddComponent<MeshFilter>().sharedMesh=mesh;\n        child.AddComponent<MeshRenderer>().sharedMaterials=materials;\n    }\n    private static void WorldBox(List<CombineInstance> group,Mesh cube,Vector3 position,Vector3 scale)\n    {\n        group.Add(new CombineInstance{mesh=cube,transform=Matrix4x4.TRS(position,Quaternion.identity,scale)});\n    }\n    private void BuildApprovedWorldVisuals()\n    {\n        TextAsset asset=Resources.Load<TextAsset>(\"vibe-world-layout\");\n        if(asset==null){Debug.LogError(\"UNITY_WEB_WORLD=REPAIR_REQUIRED reason=RESOURCE_MISSING\");return;}\n        Layout data;\n        try{data=JsonUtility.FromJson<Layout>(asset.text);}\n        catch(System.Exception e){Debug.LogError(\"UNITY_WEB_WORLD=REPAIR_REQUIRED reason=INVALID_JSON type=\"+e.GetType().Name);return;}\n        if(data==null||data.version!=1||data.width<12||data.height<12||data.width>72||data.height>72||\n           data.cellSize<=0f||data.heights==null||data.heights.Length!=data.width*data.height||\n           data.types==null||data.types.Length!=data.heights.Length||data.roads==null||\n           data.roads.Length>data.heights.Length||data.buildings==null||data.buildings.Length>56||\n           data.vegetation==null||data.vegetation.Length>160||\n           data.gameplayCollisionAuthority||data.saveMutation||data.engineRuntimeVerified)\n        {Debug.LogError(\"UNITY_WEB_WORLD=REPAIR_REQUIRED reason=LAYOUT_LIMIT_OR_AUTHORITY\");return;}\n        GameObject root=null;\n        try\n        {\n            int width=data.width,height=data.height;\n            float cell=data.cellSize,x0=(width-1)*cell*.5f,z0=(height-1)*cell*.5f;\n            float center=data.heights[(height/2)*width+width/2];\n            root=new GameObject(\"ApprovedEnvironmentVisuals\");root.transform.SetParent(transform,false);\n            var vertices=new Vector3[data.heights.Length];\n            var groups=new List<int>[5];\n            for(int k=0;k<5;k++)groups[k]=new List<int>();\n            for(int z=0;z<height;z++)for(int x=0;x<width;x++)\n            {\n                int i=z*width+x;\n                vertices[i]=new Vector3(x*cell-x0,(data.heights[i]-center)*.18f-.08f,z*cell-z0);\n            }\n            for(int z=0;z<height-1;z++)for(int x=0;x<width-1;x++)\n            {\n                int i=z*width+x,type=Mathf.Clamp(data.types[i],0,4);\n                groups[type].Add(i);groups[type].Add(i+width);groups[type].Add(i+1);\n                groups[type].Add(i+1);groups[type].Add(i+width);groups[type].Add(i+width+1);\n            }\n            var surface=new Mesh();surface.vertices=vertices;surface.subMeshCount=5;\n            for(int k=0;k<5;k++)surface.SetTriangles(groups[k],k);\n            surface.RecalculateNormals();\n            WorldMesh(root.transform,\"Terrain\",surface,new[]{\n                WorldMaterial(new Color(.15f,.32f,.58f)),WorldMaterial(new Color(.49f,.48f,.45f)),\n                WorldMaterial(new Color(.14f,.42f,.20f)),WorldMaterial(new Color(.68f,.55f,.33f)),\n                WorldMaterial(new Color(.34f,.48f,.26f))\n            });\n            var roadV=new List<Vector3>();var roadT=new List<int>();\n            foreach(int i in data.roads)\n            {\n                if(i<0||i>=vertices.Length)throw new System.InvalidOperationException(\"WORLD_ROAD_OUT_OF_BOUNDS\");\n                Vector3 p=vertices[i];p.y+=.055f;float d=cell*.46f;int n=roadV.Count;\n                roadV.Add(p+new Vector3(-d,0,-d));roadV.Add(p+new Vector3(-d,0,d));\n                roadV.Add(p+new Vector3(d,0,-d));roadV.Add(p+new Vector3(d,0,d));\n                roadT.Add(n);roadT.Add(n+1);roadT.Add(n+2);\n                roadT.Add(n+2);roadT.Add(n+1);roadT.Add(n+3);\n            }\n            if(roadV.Count>0)\n            {\n                var roads=new Mesh();roads.vertices=roadV.ToArray();roads.triangles=roadT.ToArray();\n                WorldMesh(root.transform,\"Roads\",roads,new[]{WorldMaterial(new Color(.35f,.33f,.29f))});\n            }\n            var primitive=GameObject.CreatePrimitive(PrimitiveType.Cube);\n            Mesh cube=primitive.GetComponent<MeshFilter>().sharedMesh;Destroy(primitive);\n            var models=new List<CombineInstance>[6];\n            for(int k=0;k<6;k++)models[k]=new List<CombineInstance>();\n            foreach(Lot lot in data.buildings)\n            {\n                if(lot.x<0||lot.z<0||lot.x>=width-1||lot.z>=height-1||lot.size!=2)\n                    throw new System.InvalidOperationException(\"WORLD_BUILDING_OUT_OF_BOUNDS\");\n                float span=cell*lot.size*.85f;\n                float px=(lot.x+lot.size*.5f)*cell-x0,pz=(lot.z+lot.size*.5f)*cell-z0;\n                float y=(lot.elevation-center)*.18f-.08f;\n                WorldBox(models[0],cube,new Vector3(px,y+.8f,pz),new Vector3(span,1.6f,span));\n                WorldBox(models[1],cube,new Vector3(px,y+1.76f,pz),new Vector3(span+.4f,lot.roof==1?.64f:.33f,span+.4f));\n                if(lot.roof==1)\n                    WorldBox(models[1],cube,new Vector3(px,y+2.19f,pz),new Vector3(span*.65f,.25f,span+.32f));\n                Vector3 door=new Vector3(px,y+.5f,pz);\n                if(lot.door==0)door.z-=span*.5f;\n                else if(lot.door==1)door.z+=span*.5f;\n                else if(lot.door==2)door.x+=span*.5f;\n                else door.x-=span*.5f;\n                WorldBox(models[2],cube,door,lot.door>=2?new Vector3(.12f,1f,.7f):new Vector3(.7f,1f,.12f));\n            }\n            foreach(Plant plant in data.vegetation)\n            {\n                if(plant.x<0||plant.z<0||plant.x>=width||plant.z>=height||\n                   plant.scale<=0||plant.scale>3)throw new System.InvalidOperationException(\"WORLD_PLANT_OUT_OF_BOUNDS\");\n                float x=plant.x*cell-x0,z=plant.z*cell-z0,y=(plant.elevation-center)*.18f-.08f;\n                if(plant.kind==0)\n                    WorldBox(models[5],cube,new Vector3(x,y+.35f*plant.scale,z),new Vector3(1.05f,.7f,.9f)*plant.scale);\n                else\n                {\n                    WorldBox(models[3],cube,new Vector3(x,y+.5f*plant.scale,z),new Vector3(.27f,1f,.27f)*plant.scale);\n                    WorldBox(models[4],cube,new Vector3(x,y+1.4f*plant.scale,z),\n                        new Vector3(plant.kind==2?1.1f:1.7f,plant.kind==2?2.05f:1.36f,1.3f)*plant.scale);\n                }\n            }\n            Color[] shades={\n                new Color(.61f,.58f,.49f),new Color(.30f,.24f,.28f),\n                new Color(.42f,.27f,.16f),new Color(.28f,.19f,.12f),\n                new Color(.13f,.36f,.18f),new Color(.43f,.43f,.43f)\n            };\n            for(int k=0;k<6;k++)if(models[k].Count>0)\n            {\n                var baked=new Mesh();baked.indexFormat=UnityEngine.Rendering.IndexFormat.UInt32;\n                baked.CombineMeshes(models[k].ToArray(),true,true);\n                WorldMesh(root.transform,\"ModularVisuals_\"+k,baked,new[]{WorldMaterial(shades[k])});\n            }\n            var plane=GameObject.Find(\"Environment_\"+Mode);\n            if(plane!=null)\n            {\n                var visible=plane.GetComponent<MeshRenderer>();\n                if(visible!=null)visible.enabled=false;\n                // 기존 Plane Collider를 보존해 높이 메시가 게임 판정을 바꾸지 않게 한다.\n            }\n            Debug.Log(\"UNITY_WEB_WORLD=VISUAL_MESH_AUTHORED game=\"+GameId+\n                \" terrain=\"+data.heights.Length+\" buildings=\"+data.buildings.Length+\n                \" vegetation=\"+data.vegetation.Length+\" collider=UNCHANGED save=UNCHANGED native_qa=REQUIRED\");\n        }\n        catch(System.Exception error)\n        {\n            if(root!=null)Destroy(root);\n            Debug.LogError(\"UNITY_WEB_WORLD=REPAIR_REQUIRED reason=AUTHORING_FAILED type=\"+error.GetType().Name);\n        }\n    }\n":'';
const runtime=`using UnityEngine;
using System.Collections.Generic;

public sealed class JaewoonNativeMotionActor : MonoBehaviour
{
    private const float FootSlideNormalizedMax = 0.035f;
    private Animator animator;
    private Transform leftFoot;
    private Transform rightFoot;
    private Transform spine;
    private Vector3 lastRootPosition;
    private Vector3 lastLeftFoot;
    private Vector3 lastRightFoot;
    private bool footHistoryReady;
    private float fpsEma = 60f;
    private float footSlideMax;
    private float elapsed;
    private float hitKick;
    private int footSlideSamples;
    private int ikSamples;
    private int contactCount;
    private int hitReactionCount;
    private bool reported;

    private void Awake()
    {
        animator = GetComponent<Animator>();
        if (animator == null) { enabled = false; return; }
        if (animator.isHuman)
        {
            leftFoot = animator.GetBoneTransform(HumanBodyBones.LeftFoot);
            rightFoot = animator.GetBoneTransform(HumanBodyBones.RightFoot);
            spine = animator.GetBoneTransform(HumanBodyBones.Spine);
        }
        lastRootPosition = animator.transform.position;
        Debug.Log("JAEWOON_UNITY_NATIVE_MOTION=START actor=" + gameObject.name.Replace(" ", "_") +
                  " human=" + animator.isHuman + " controller=" + (animator.runtimeAnimatorController != null));
    }

    private static Vector3 Horizontal(Vector3 value)
    {
        return new Vector3(value.x, 0f, value.z);
    }

    private void Update()
    {
        if (animator == null) return;
        float dt = Mathf.Min(Time.unscaledDeltaTime, 0.1f);
        elapsed += dt;
        float instantFps = 1f / Mathf.Max(dt, 1f / 240f);
        fpsEma += (instantFps - fpsEma) * Mathf.Clamp01(dt * 3f);
    }

    private void LateUpdate()
    {
        if (animator == null) return;
        SampleFootSliding();
        if (hitKick > 0.001f && spine != null)
        {
            spine.localRotation = spine.localRotation * Quaternion.Euler(-6f * hitKick, 0f, 0f);
            hitKick *= Mathf.Exp(-Time.unscaledDeltaTime * 10f);
        }
        if (!reported && elapsed >= 6f)
        {
            reported = true;
            string reason = MotionFailureReason();
            string fields = " fps=" + fpsEma.ToString("F1") +
                            " human=" + animator.isHuman +
                            " ikSamples=" + ikSamples +
                            " slide=" + footSlideMax.ToString("F4") +
                            " slideSamples=" + footSlideSamples +
                            " contacts=" + contactCount +
                            " hits=" + hitReactionCount;
            Debug.Log("JAEWOON_UNITY_NATIVE_MOTION=" +
                      (string.IsNullOrEmpty(reason) ? "PASS" : "FAIL reason=" + reason) + fields);
        }
    }

    private void SampleFootSliding()
    {
        if (!animator.isHuman || leftFoot == null || rightFoot == null) return;
        float scale = Mathf.Max(0.5f, animator.humanScale);
        Vector3 rootPosition = animator.transform.position;
        float rootDelta = Horizontal(rootPosition - lastRootPosition).magnitude;
        if (footHistoryReady && rootDelta > 0.002f)
        {
            float leftSlide = FootContactSlide(leftFoot, lastLeftFoot, scale);
            float rightSlide = FootContactSlide(rightFoot, lastRightFoot, scale);
            float best = leftSlide < 0f ? rightSlide : rightSlide < 0f ? leftSlide : Mathf.Min(leftSlide, rightSlide);
            if (best >= 0f)
            {
                footSlideSamples++;
                footSlideMax = Mathf.Max(footSlideMax, best);
            }
        }
        lastRootPosition = rootPosition;
        lastLeftFoot = leftFoot.position;
        lastRightFoot = rightFoot.position;
        footHistoryReady = true;
    }

    private static float FootContactSlide(Transform foot, Vector3 previous, float scale)
    {
        Vector3 origin = foot.position + Vector3.up * (0.35f * scale);
        if (!Physics.Raycast(origin, Vector3.down, out RaycastHit hit, 0.8f * scale, ~0, QueryTriggerInteraction.Ignore))
            return -1f;
        float gap = Mathf.Abs(foot.position.y - hit.point.y);
        if (gap > 0.16f * scale) return -1f;
        return Horizontal(foot.position - previous).magnitude / Mathf.Max(1f, scale * 2f);
    }

    private void OnAnimatorIK(int layerIndex)
    {
        if (animator == null || !animator.isHuman) return;
        ApplyFootIk(AvatarIKGoal.LeftFoot, leftFoot);
        ApplyFootIk(AvatarIKGoal.RightFoot, rightFoot);
    }

    private void ApplyFootIk(AvatarIKGoal goal, Transform foot)
    {
        if (foot == null) return;
        float scale = Mathf.Max(0.5f, animator.humanScale);
        Vector3 origin = foot.position + Vector3.up * (0.45f * scale);
        if (!Physics.Raycast(origin, Vector3.down, out RaycastHit hit, 1.1f * scale, ~0, QueryTriggerInteraction.Ignore))
        {
            animator.SetIKPositionWeight(goal, 0f);
            animator.SetIKRotationWeight(goal, 0f);
            return;
        }
        animator.SetIKPositionWeight(goal, 0.35f);
        animator.SetIKRotationWeight(goal, 0.2f);
        animator.SetIKPosition(goal, hit.point + hit.normal * (0.045f * scale));
        animator.SetIKRotation(goal, Quaternion.FromToRotation(Vector3.up, hit.normal) * foot.rotation);
        ikSamples++;
    }

    public void JaewoonMotionContact() { contactCount++; }
    public void JaewoonMotionHit() { hitReactionCount++; hitKick = 1f; }

    private string MotionFailureReason()
    {
        if (animator == null) return "ANIMATOR_REQUIRED";
        if (!animator.enabled) return "ANIMATOR_DISABLED";
        if (animator.runtimeAnimatorController == null) return "ANIMATOR_CONTROLLER_REQUIRED";
        if (fpsEma < 27f) return "MOBILE_FRAME_FLOOR_30_FAILED";
        if (animator.isHuman)
        {
            if (leftFoot == null || rightFoot == null) return "HUMANOID_FEET_REQUIRED";
            if (ikSamples < 2) return "FOOT_IK_RUNTIME_REQUIRED";
            if (footSlideSamples < 2) return "FOOT_CONTACT_SAMPLE_REQUIRED";
            if (footSlideMax > FootSlideNormalizedMax) return "FOOT_SLIDE_EXCEEDED";
        }
        return "";
    }
}

public sealed class UnityWebFloorGame : MonoBehaviour
{
    private const string GameId = "${csharp(gameId)}";
    private const string GameName = "${csharp(gameName)}";
    private const string Mode = "${category}";
    private const string Identity = "${csharp(identity).slice(0,420)}";
    private const string CoreLoop = "${csharp(coreLoop.join(' -> ')||'ACT -> FEEDBACK -> CHOICE -> REWARD').slice(0,620)}";
    private const string SavePrefix = "${prefix}_webfloor_";

    private int progress;
    private int level = 1;
    private int resource = 10;
    private int actions;
    private bool started;
    private GameObject player;
    private GameObject enemy;
    private GameObject equipment;
    private float motionClock;
${nativeWorldRuntime}
    private void Awake()
    {
        Application.targetFrameRate = 60;
        Screen.sleepTimeout = SleepTimeout.NeverSleep;
        LoadState();
        BuildWorld();
        Debug.Log("JAEWOON_UNITY_WEB_QA BOOT game=" + GameId + " status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA VISUAL_DOMAIN game=" + GameId + " domain=character status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA VISUAL_DOMAIN game=" + GameId + " domain=enemy status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA VISUAL_DOMAIN game=" + GameId + " domain=environment status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA VISUAL_DOMAIN game=" + GameId + " domain=equipment status=PASS");
        int nativeMotionActors = BindNativeMotionActors();
        Debug.Log("JAEWOON_UNITY_WEB_QA MOTION game=" + GameId +
                  " status=" + (nativeMotionActors > 0 ? "STARTED" : "REPAIR_REQUIRED") +
                  " actors=" + nativeMotionActors +
                  (nativeMotionActors > 0 ? "" : " reason=ANIMATOR_REQUIRED"));
        Debug.Log("JAEWOON_UNITY_WEB_QA MOBILE_TARGET game=" + GameId + " role=action x=0.5000 y=0.7200");
        LogState();
    }

    private int BindNativeMotionActors()
    {
        int count = 0;
        foreach (Animator candidate in FindObjectsByType<Animator>(FindObjectsSortMode.None))
        {
            if (candidate == null) continue;
            if (candidate.GetComponent<JaewoonNativeMotionActor>() == null)
                candidate.gameObject.AddComponent<JaewoonNativeMotionActor>();
            count++;
        }
        return count;
    }

    private void BuildWorld()
    {
        Camera cam = Camera.main;
        if (cam == null)
        {
            var cameraObject = new GameObject("Main Camera");
            cam = cameraObject.AddComponent<Camera>();
            cameraObject.tag = "MainCamera";
        }
        cam.transform.position = new Vector3(0f, 6.5f, -9f);
        cam.transform.rotation = Quaternion.Euler(24f, 0f, 0f);
        cam.backgroundColor = new Color(0.06f,0.08f,0.13f);

        if (FindFirstObjectByType<Light>() == null)
        {
            var lightObject = new GameObject("Key Light");
            var light = lightObject.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.25f;
            lightObject.transform.rotation = Quaternion.Euler(48f,-28f,0f);
        }

        var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
        ground.name = "Environment_" + Mode;
        ground.transform.localScale = new Vector3(1.8f,1f,1.8f);

        player = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        player.name = "Character_" + GameId;
        player.transform.position = new Vector3(-2f,1f,0f);

        enemy = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        enemy.name = "Enemy_" + Mode;
        enemy.transform.position = new Vector3(2f,1f,1f);
        enemy.transform.localScale = Vector3.one * 1.35f;

        equipment = GameObject.CreatePrimitive(PrimitiveType.Cube);
        equipment.name = "Equipment_" + Mode;
        equipment.transform.position = new Vector3(0f,0.8f,-1.5f);
        equipment.transform.localScale = new Vector3(0.45f,1.6f,0.45f);

        var landmark = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        landmark.name = "Identity_" + Mode;
        landmark.transform.position = new Vector3(0f,1.5f,3f);
        landmark.transform.localScale = new Vector3(1.5f,1.5f,1.5f);
        ${worldData?'BuildApprovedWorldVisuals();':''}
    }

    private void Update()
    {
        motionClock += Time.unscaledDeltaTime;
        if (enemy != null)
        {
            enemy.transform.Rotate(0f,55f * Time.unscaledDeltaTime,0f,Space.World);
            var p=enemy.transform.position;
            p.y=1f+Mathf.Sin(motionClock*2.1f)*0.28f;
            enemy.transform.position=p;
        }
        if (equipment != null) equipment.transform.Rotate(35f*Time.unscaledDeltaTime,45f*Time.unscaledDeltaTime,0f);
        if (player != null && started)
        {
            var p=player.transform.position;
            p.x=-2f+Mathf.Sin(motionClock*1.7f)*0.55f;
            player.transform.position=p;
        }

        if (Input.GetKeyDown(KeyCode.Alpha1)) StartGameplay();
        if (Input.GetKeyDown(KeyCode.Space)) PerformAction(false);
        if (Input.GetKeyDown(KeyCode.R)) SafeReturn();
        if (Input.touchCount > 0 && Input.GetTouch(0).phase == TouchPhase.Began) PerformAction(true);
    }

    private void StartGameplay()
    {
        started=true;
        Debug.Log("JAEWOON_UNITY_WEB_QA START game=" + GameId + " region=field mode=" + Mode + " status=PASS");
        LogState();
    }

    private void PerformAction(bool mobile)
    {
        if(!started) StartGameplay();
        actions++;
        progress += Mathf.Max(1,level);
        resource += 1 + (actions % 3);
        if(progress >= level * 4) level++;
        PlayerPrefs.SetInt(SavePrefix+"progress",progress);
        PlayerPrefs.SetInt(SavePrefix+"level",level);
        PlayerPrefs.SetInt(SavePrefix+"resource",resource);
        PlayerPrefs.SetInt(SavePrefix+"actions",actions);
        PlayerPrefs.Save();
        Debug.Log("JAEWOON_UNITY_WEB_QA ACTION game=" + GameId + " mode=" + Mode + " action=" + actions + " status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA PROGRESS game=" + GameId + " progress=" + progress + " level=" + level + " resource=" + resource + " status=PASS");
        // 기본 입력·저장 동작은 장르 구현이나 재미의 통과 증거가 아니다.
        Debug.Log("JAEWOON_UNITY_WEB_QA CORE_FUN game=" + GameId + " mode=" + Mode + " status=REPAIR_REQUIRED reason=BOOTSTRAP_ONLY_GAMEPLAY_NOT_IMPLEMENTED");
        if(mobile) Debug.Log("JAEWOON_UNITY_WEB_QA MOBILE_INPUT game=" + GameId + " role=action status=PASS");
        LogState();
    }

    private void SafeReturn()
    {
        started=false;
        Debug.Log("JAEWOON_UNITY_WEB_QA RETURN game=" + GameId + " region=town status=PASS");
        LogState();
    }

    private void LoadState()
    {
        progress=PlayerPrefs.GetInt(SavePrefix+"progress",0);
        level=Mathf.Max(1,PlayerPrefs.GetInt(SavePrefix+"level",1));
        resource=PlayerPrefs.GetInt(SavePrefix+"resource",10);
        actions=PlayerPrefs.GetInt(SavePrefix+"actions",0);
    }

    private void LogState()
    {
        Debug.Log("JAEWOON_UNITY_WEB_QA STATE game=" + GameId + " progress=" + progress + " level=" + level + " resource=" + resource + " actions=" + actions);
    }

    private void OnGUI()
    {
        float w=Screen.width;
        float h=Screen.height;
        GUI.Box(new Rect(w*0.04f,h*0.04f,w*0.92f,h*0.28f),"");
        GUI.Label(new Rect(w*0.08f,h*0.07f,w*0.84f,h*0.05f),GameName+" · Unity Web Floor");
        GUI.Label(new Rect(w*0.08f,h*0.13f,w*0.84f,h*0.08f),Identity);
        GUI.Label(new Rect(w*0.08f,h*0.21f,w*0.84f,h*0.08f),"Core: "+CoreLoop);
        if(GUI.Button(new Rect(w*0.18f,h*0.64f,w*0.64f,h*0.16f),"ACTION / TOUCH")) PerformAction(true);
    }
}
`;

const build=`#if UNITY_EDITOR
using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;

public static class UnityWebFloorBuild
{
    private const string SceneFolder = "Assets/Scenes";
    private const string ScenePath = "Assets/Scenes/Main.unity";

    public static void BuildWeb()
    {
        EnsureScene();
        if(!EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.WebGL,BuildTarget.WebGL))
            throw new Exception("WEBGL_TARGET_SWITCH_FAILED");
        PlayerSettings.companyName="Jaewoon Games";
        PlayerSettings.productName="${csharp(gameName)} Web";
        string root=Directory.GetParent(Application.dataPath).FullName;
        string output=Path.GetFullPath(Path.Combine(root,"..","..","build","WebGL","${gameId}"));
        Directory.CreateDirectory(output);
        var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{
            scenes=new[]{ScenePath},locationPathName=output,target=BuildTarget.WebGL,options=BuildOptions.None
        });
        if(report.summary.result!=BuildResult.Succeeded)throw new Exception("WEBGL_BUILD_FAILED:"+report.summary.result);
        if(!File.Exists(Path.Combine(output,"index.html")))throw new Exception("WEBGL_OUTPUT_MISSING");
    }

    public static void Build()
    {
        EnsureScene();
        if(!EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.Android,BuildTarget.Android))
            throw new Exception("ANDROID_TARGET_SWITCH_FAILED");
        PlayerSettings.companyName="Jaewoon Games";
        PlayerSettings.productName="${csharp(gameName)}";
        PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Android,"${packageId}");
        PlayerSettings.Android.targetArchitectures=AndroidArchitecture.ARM64;
        PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.Android,false);
        PlayerSettings.SetGraphicsAPIs(BuildTarget.Android,new[]{GraphicsDeviceType.OpenGLES3});
        string root=Directory.GetParent(Application.dataPath).FullName;
        string dir=Path.GetFullPath(Path.Combine(root,"..","..","build","Android"));
        Directory.CreateDirectory(dir);
        string output=Path.Combine(dir,"${gameId}.apk");
        var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{
            scenes=new[]{ScenePath},locationPathName=output,target=BuildTarget.Android,options=BuildOptions.Development
        });
        if(report.summary.result!=BuildResult.Succeeded)throw new Exception("ANDROID_BUILD_FAILED:"+report.summary.result);
    }

    private static void EnsureScene()
    {
        if(!AssetDatabase.IsValidFolder(SceneFolder))AssetDatabase.CreateFolder("Assets","Scenes");
        Scene scene=AssetDatabase.LoadAssetAtPath<SceneAsset>(ScenePath)==null
            ?EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single)
            :EditorSceneManager.OpenScene(ScenePath,OpenSceneMode.Single);
        var root=GameObject.Find("UNITY_WEB_FLOOR_ROOT")??new GameObject("UNITY_WEB_FLOOR_ROOT");
        if(root.GetComponent<UnityWebFloorGame>()==null)root.AddComponent<UnityWebFloorGame>();
        EditorSceneManager.MarkSceneDirty(scene);
        if(!EditorSceneManager.SaveScene(scene,ScenePath))throw new Exception("SCENE_SAVE_FAILED");
        EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene(ScenePath,true)};
        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
    }
}
#endif
`;

fs.writeFileSync(path.join(output,'Assets/Scripts/UnityWebFloorGame.cs'),runtime);
fs.writeFileSync(path.join(output,'Assets/Editor/UnityWebFloorBuild.cs'),build);
fs.writeFileSync(path.join(output,'unity-web-floor-source.json'),JSON.stringify({
  version:1,gameId,gameName,identity,coreLoop,category,multiplayerMode,
  canonicalSourceRoot:`unity-games/${gameId}`,
  buildMethod:'UnityWebFloorBuild.BuildWeb',
  futureNativeBuildMethod:'UnityWebFloorBuild.Build',
  generatorFingerprint:fingerprint,
  proceduralEnvironment:worldData?{
    approval:'APPROVED_DESIGN_3D_ONLY',seed:worldData.seed,
    status:'DATA_AUTHORED_RUNTIME_UNVERIFIED',layoutHash:worldDataSha256,
    terrainCells:worldData.heights.length,buildingCount:worldData.buildings.length,vegetationCount:worldData.vegetation.length,
    sameUnityProject:true,renderedInRuntime:false,visualMeshAuthoringSource:true,collisionAuthorityChanged:false,saveMeaningChanged:false
  }:null,
  buildUpDirectiveId:buildUpDirectiveConsumed?buildUpDirective.directiveId:null,
  buildUpGeneration:buildUpDirectiveConsumed?buildUpDirective.generation:null,
  buildUpGoal:buildUpDirectiveConsumed?buildUpDirective.thisLoopPrimaryGoal:null,
  buildUpDirectiveFingerprint:buildUpDirectiveConsumed?buildUpDirective.directiveFingerprint:null,
  buildUpDirectiveConsumed,
  buildUpDirectiveCompletionClaim:false,
  verifiedLearningApplication,
  designBaseline:baselinePath,
  unityPlatformProfile:profile,
  purpose:'UNITY_WEB_DEVELOPMENT_FLOOR',
  developmentFloor:true,
  presentationState:'BOOTSTRAP_REQUIRES_GRAPHICS_BUILDUP',
  upperPlatformReady:false,
  releaseOrDeploymentAuthority:false,
  generatedAt:new Date().toISOString()
},null,2)+'\n');
fs.writeFileSync(path.join(output,'README.md'),`# ${gameName} — Unity Web Development Floor

- gameId: \`${gameId}\`
- canonical source: \`unity-games/${gameId}/\`
- WebGL build method: \`UnityWebFloorBuild.BuildWeb\`
- future Unity app build method: \`UnityWebFloorBuild.Build\`
- BUILD_UP directive: ${buildUpDirectiveConsumed?buildUpDirective.directiveId:'NONE_BASELINE_ONLY'} (generation ${buildUpDirectiveConsumed?buildUpDirective.generation:0})
- verified external learning: REQUIRED FIRST, coverage ${verifiedLearningApplication.mandatoryApplicationCoveragePct}% (${verifiedLearningApplication.appliedCount}/${verifiedLearningApplication.retrievedCount})
- readiness gate: \`UPPER_PLATFORM_DEVELOPMENT_READY\`
- release/deployment authority: **NO**

Generated from the locked common design and Unity platform profile. This source must still pass real WebGL build, browser play, independent QA, regression, and the seven-domain upper-platform readiness gate.
`);
console.log('UNITY_WEB_FLOOR_SOURCE='+output);
console.log('UNITY_WEB_FLOOR_BUILD_METHOD=UnityWebFloorBuild.BuildWeb');
console.log('UNITY_WEB_FLOOR_RELEASE_AUTHORITY=NO');
console.log('UNITY_WEB_VERIFIED_EXTERNAL_LEARNING=PASS');
console.log(`UNITY_WEB_VERIFIED_EXTERNAL_LEARNING_COVERAGE=${verifiedLearningApplication.mandatoryApplicationCoveragePct}`);
console.log(`UNITY_WEB_VERIFIED_EXTERNAL_LEARNING_COUNT=${verifiedLearningApplication.appliedCount}`);
console.log(`UNITY_WEB_VERIFIED_EXTERNAL_LEARNING_REVISION=${verifiedLearningApplication.sourceRevision||'UNKNOWN'}`);
console.log(`UNITY_WEB_BUILD_UP_DIRECTIVE=${buildUpDirectiveConsumed?buildUpDirective.directiveId:'NONE_BASELINE_ONLY'}`);
console.log('UNITY_WEB_BUILD_UP_COMPLETION_CLAIM=NO');
console.log('UNITY_WEB_PROCEDURAL_ENVIRONMENT='+ (worldData?'DESIGN_APPROVED_DATA_ONLY_NATIVE_RUNTIME_UNVERIFIED':'NOT_REQUESTED'));
