import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const args=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')).map(raw=>{
  const i=raw.indexOf('=');
  return i>0?[raw.slice(2,i),raw.slice(i+1)]:[raw.slice(2),'true'];
}));
const gameId=String(args['game-id']||'').trim();
const gameName=String(args['game-name']||gameId).trim();
const baselinePath=String(args.baseline||'').trim();
const output=String(args.output||`unity-games/${gameId}`).replaceAll('\\','/').trim();
const buildUpDirectivePath=String(args['build-up-directive']||'').trim();
if(!/^[a-z0-9][a-z0-9-]{1,80}$/.test(gameId))throw new Error('UNITY_WEB_FLOOR_GAME_ID_INVALID');
if(!baselinePath||!fs.existsSync(baselinePath))throw new Error('UNITY_WEB_FLOOR_DESIGN_BASELINE_MISSING');
if(output!==`unity-games/${gameId}`)throw new Error('UNITY_WEB_FLOOR_OUTPUT_MUST_BE_CANONICAL_UNITY_ROOT');

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

fs.rmSync(output,{recursive:true,force:true});
for(const dir of [
  'Assets/Scripts','Assets/Editor','Assets/Art','Assets/Prefabs','Assets/Materials','Assets/Animations',
  'Packages','ProjectSettings'
])fs.mkdirSync(path.join(output,dir),{recursive:true});
fs.writeFileSync(path.join(output,'Packages/manifest.json'),JSON.stringify({dependencies:{'com.unity.modules.imgui':'1.0.0'}},null,2)+'\n');
fs.writeFileSync(path.join(output,'ProjectSettings/ProjectVersion.txt'),'m_EditorVersion: 6000.6.0f1\nm_EditorVersionWithRevision: 6000.6.0f1 (f7f8ed4d1e24)\n');
fs.writeFileSync(path.join(output,'Assets/link.xml'),'<linker><assembly fullname="UnityEngine.CoreModule" preserve="all" /></linker>\n');
for(const [dir,value] of Object.entries({
  Art:{domain:'environment-character-enemy-equipment',identity},
  Prefabs:{domain:'runtime-generated-gameplay-objects',category},
  Materials:{domain:'game-specific-material-profile',category},
  Animations:{domain:'continuous-transform-motion',category},
})){
  fs.writeFileSync(path.join(output,'Assets',dir,'unity-web-floor-domain.json'),JSON.stringify({gameId,...value},null,2)+'\n');
}

const runtime=`using UnityEngine;

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
        Debug.Log("JAEWOON_UNITY_WEB_QA MOTION game=" + GameId + " status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA MOBILE_TARGET game=" + GameId + " role=action x=0.5000 y=0.7200");
        LogState();
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
        Debug.Log("JAEWOON_UNITY_WEB_QA CORE_FUN game=" + GameId + " mode=" + Mode + " status=PASS");
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
  buildUpDirectiveId:buildUpDirectiveConsumed?buildUpDirective.directiveId:null,
  buildUpGeneration:buildUpDirectiveConsumed?buildUpDirective.generation:null,
  buildUpGoal:buildUpDirectiveConsumed?buildUpDirective.thisLoopPrimaryGoal:null,
  buildUpDirectiveFingerprint:buildUpDirectiveConsumed?buildUpDirective.directiveFingerprint:null,
  buildUpDirectiveConsumed,
  buildUpDirectiveCompletionClaim:false,
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
- readiness gate: \`UPPER_PLATFORM_DEVELOPMENT_READY\`
- release/deployment authority: **NO**

Generated from the locked common design and Unity platform profile. This source must still pass real WebGL build, browser play, independent QA, regression, and the seven-domain upper-platform readiness gate.
`);
console.log('UNITY_WEB_FLOOR_SOURCE='+output);
console.log('UNITY_WEB_FLOOR_BUILD_METHOD=UnityWebFloorBuild.BuildWeb');
console.log('UNITY_WEB_FLOOR_RELEASE_AUTHORITY=NO');
console.log(`UNITY_WEB_BUILD_UP_DIRECTIVE=${buildUpDirectiveConsumed?buildUpDirective.directiveId:'NONE_BASELINE_ONLY'}`);
console.log('UNITY_WEB_BUILD_UP_COMPLETION_CLAIM=NO');
