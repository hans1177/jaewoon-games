import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')).map(x=>{
  const i=x.indexOf('=');
  return i>0?[x.slice(2,i),x.slice(i+1)]:[x.slice(2),'true'];
}));
const gameId=String(args['game-id']||'').trim();
const gameName=String(args['game-name']||gameId).trim();
const baselinePath=String(args.baseline||'').trim();
const webEvidencePath=String(args['web-evidence']||'').trim();
const output=String(args.output||`unity-games/${gameId}`).trim().replaceAll('\\','/');
if(!/^[a-z0-9][a-z0-9-]{1,80}$/.test(gameId))throw new Error(`invalid game id: ${gameId}`);
if(!baselinePath||!fs.existsSync(baselinePath))throw new Error(`design baseline missing: ${baselinePath}`);
if(webEvidencePath&&!fs.existsSync(webEvidencePath))throw new Error(`web evidence missing: ${webEvidencePath}`);
if(!/^unity-games\/[A-Za-z0-9._-]+$/.test(output)||output.includes('..'))throw new Error(`invalid Unity output: ${output}`);

const UNITY_EDITOR_VERSION='6000.6.0f1';
const UNITY_EDITOR_REVISION='f7f8ed4d1e24';
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const baseline=readJson(baselinePath);
let web=null;
let webEvidenceBound=false;
if(webEvidencePath){
  web=readJson(webEvidencePath);
  const webState=String(web.state||web.status||'').toUpperCase();
  webEvidenceBound=Boolean(web.pass===true||web.validated===true||webState==='PASS'||webState==='PASSED'||webState==='VALIDATED');
  if(!webEvidenceBound)throw new Error('OPTIONAL_WEB_EVIDENCE_MUST_PASS_WHEN_PROVIDED');
}
const design=baseline.content||baseline;
const coreLoop=Array.isArray(design.coreLoop)?design.coreLoop.map(v=>String(v).trim()).filter(Boolean).slice(0,5):[];
const identity=String(design.identity||gameName).replace(/\s+/g,' ').trim();
const category=
  gameId.includes('action-survival')?'SURVIVAL':
  gameId.includes('single-defense')?'DEFENSE':
  gameId.includes('puzzle')?'PUZZLE':
  gameId.includes('casual')?'CASUAL':
  gameId.includes('idle-growth')?'IDLE_RPG':
  gameId.includes('story-complete')?'STORY_RPG':'GENERAL';
const packageId=`com.jaewoongames.${gameId.replace(/[^a-z0-9]/g,'').slice(0,48)}`;
const csharp=v=>String(v).replaceAll('\\','\\\\').replaceAll('"','\\"').replace(/\r?\n/g,' ');
const prefix=gameId.replace(/[^a-zA-Z0-9]/g,'_');

fs.rmSync(output,{recursive:true,force:true});
for(const dir of ['Assets/Scripts','Assets/Editor','Packages','ProjectSettings'])fs.mkdirSync(path.join(output,dir),{recursive:true});
fs.writeFileSync(path.join(output,'Packages/manifest.json'),JSON.stringify({dependencies:{'com.unity.modules.imgui':'1.0.0'}},null,2)+'\n');
fs.writeFileSync(path.join(output,'ProjectSettings/ProjectVersion.txt'),`m_EditorVersion: ${UNITY_EDITOR_VERSION}\nm_EditorVersionWithRevision: ${UNITY_EDITOR_VERSION} (${UNITY_EDITOR_REVISION})\n`);

const runtime=`using System;
using UnityEngine;
using UnityEngine.Profiling;

public sealed class SeedTechnicalPrototype : MonoBehaviour
{
    private const string GameId = "${csharp(gameId)}";
    private const string GameName = "${csharp(gameName)}";
    private const string Mode = "${category}";
    private const string Identity = "${csharp(identity).slice(0,480)}";
    private const string CoreLoop = "${csharp(coreLoop.join(' → ')||'ACT → FEEDBACK → CHOICE → REWARD').slice(0,700)}";
    private const string SavePrefix = "${prefix}_tech_";

    private int actionCount;
    private int progress;
    private int resource = 10;
    private int level = 1;
    private int chain;
    private float elapsed;
    private float metricTimer;
    private float fpsTime;
    private int fpsFrames;
    private string lastAction = "READY";

    private void Awake()
    {
        Application.targetFrameRate = 60;
        Screen.sleepTimeout = SleepTimeout.NeverSleep;
        LoadState();
        Debug.Log("JAEWOON_TECH_BOOT game=" + GameId + " mode=" + Mode + " restoredActions=" + actionCount);
    }

    private void Update()
    {
        float dt = Mathf.Min(Time.unscaledDeltaTime, 0.25f);
        elapsed += dt;
        metricTimer += dt;
        fpsTime += dt;
        fpsFrames++;

        if (Mode == "IDLE_RPG" && elapsed >= 1f)
        {
            elapsed -= 1f;
            resource += Mathf.Max(1, level);
            progress += level;
        }

        if (metricTimer >= 2f)
        {
            float fps = fpsTime > 0.001f ? fpsFrames / fpsTime : 0f;
            long memory = Profiler.GetTotalAllocatedMemoryLong();
            Debug.Log("JAEWOON_TECH_METRIC game=" + GameId + " fps=" + fps.ToString("F1") +
                      " memBytes=" + memory + " actions=" + actionCount + " progress=" + progress +
                      " level=" + level + " resource=" + resource);
            metricTimer = 0f;
            fpsTime = 0f;
            fpsFrames = 0;
        }
    }

    private void OnGUI()
    {
        int w = Screen.width;
        int h = Screen.height;
        float scale = Mathf.Max(1f, w / 390f);
        GUI.skin.label.fontSize = Mathf.RoundToInt(17f * scale);
        GUI.skin.button.fontSize = Mathf.RoundToInt(20f * scale);
        GUI.skin.box.fontSize = Mathf.RoundToInt(16f * scale);

        GUI.Box(new Rect(w * 0.04f, h * 0.04f, w * 0.92f, h * 0.88f), "");
        GUI.Label(new Rect(w * 0.08f, h * 0.07f, w * 0.84f, h * 0.06f), GameName + " · Unity Android 기술 프로토타입");
        GUI.Label(new Rect(w * 0.08f, h * 0.14f, w * 0.84f, h * 0.10f), Identity);
        GUI.Label(new Rect(w * 0.08f, h * 0.25f, w * 0.84f, h * 0.10f), "핵심 루프: " + CoreLoop);
        GUI.Label(new Rect(w * 0.08f, h * 0.36f, w * 0.84f, h * 0.08f),
            "MODE " + Mode + "   행동 " + actionCount + "   진행 " + progress + "   자원 " + resource + "   Lv." + level);
        GUI.Label(new Rect(w * 0.08f, h * 0.45f, w * 0.84f, h * 0.06f), "최근 입력: " + lastAction);

        for (int i = 0; i < 7; i++)
        {
            float x = w * (0.10f + i * 0.12f);
            float y = h * (0.53f + 0.018f * Mathf.Sin(Time.unscaledTime * (1.2f + i * 0.08f) + i));
            GUI.Box(new Rect(x, y, w * 0.075f, w * 0.075f), ((progress + i) % 9).ToString());
        }

        if (GUI.Button(new Rect(w * 0.10f, h * 0.62f, w * 0.80f, h * 0.12f), PrimaryLabel()))
            PrimaryAction();
        if (GUI.Button(new Rect(w * 0.10f, h * 0.78f, w * 0.80f, h * 0.12f), SecondaryLabel()))
            SecondaryAction();
    }

    private string PrimaryLabel()
    {
        switch (Mode)
        {
            case "SURVIVAL": return "회피 이동 + 적 처치";
            case "DEFENSE": return "타워 배치 + 웨이브 방어";
            case "PUZZLE": return "색 연결 + 연쇄";
            case "CASUAL": return "세계 조각 연결";
            case "IDLE_RPG": return "성장 업그레이드";
            case "STORY_RPG": return "전투 선택 진행";
            default: return "핵심 행동";
        }
    }

    private string SecondaryLabel()
    {
        switch (Mode)
        {
            case "SURVIVAL": return "보상 선택";
            case "DEFENSE": return "타워 강화";
            case "PUZZLE": return "보드 재배치";
            case "CASUAL": return "보상 수확";
            case "IDLE_RPG": return "보스 도전";
            case "STORY_RPG": return "대화 선택";
            default: return "선택 / 보상";
        }
    }

    private void PrimaryAction()
    {
        actionCount++;
        switch (Mode)
        {
            case "SURVIVAL": progress += 2 + level; resource += 1; lastAction = "DODGE_KILL"; break;
            case "DEFENSE": progress += level; resource = Mathf.Max(0, resource - 1); lastAction = "PLACE_DEFEND"; break;
            case "PUZZLE": chain = (chain % 5) + 1; progress += chain; resource += chain >= 4 ? 2 : 0; lastAction = "CHAIN_" + chain; break;
            case "CASUAL": progress += 2; resource += progress % 6 == 0 ? 3 : 0; lastAction = "WEAVE_NODE"; break;
            case "IDLE_RPG": if (resource >= level * 2) { resource -= level * 2; level++; } progress += level; lastAction = "UPGRADE"; break;
            case "STORY_RPG": progress += level + 1; resource += 1; lastAction = "BATTLE_CHOICE"; break;
            default: progress++; lastAction = "CORE_ACTION"; break;
        }
        SaveState();
        Debug.Log("JAEWOON_TECH_ACTION game=" + GameId + " type=PRIMARY count=" + actionCount + " progress=" + progress);
    }

    private void SecondaryAction()
    {
        actionCount++;
        switch (Mode)
        {
            case "SURVIVAL": level++; resource += 2; lastAction = "REWARD_BUILD"; break;
            case "DEFENSE": if (resource > 0) { resource--; level++; } lastAction = "UPGRADE_TOWER"; break;
            case "PUZZLE": chain = 0; resource = Mathf.Max(0, resource - 1); lastAction = "RESHUFFLE"; break;
            case "CASUAL": resource += Mathf.Max(1, progress / 3); level += progress >= level * 5 ? 1 : 0; lastAction = "HARVEST"; break;
            case "IDLE_RPG": progress += level * 3; resource += level; lastAction = "BOSS"; break;
            case "STORY_RPG": level += progress > level * 3 ? 1 : 0; resource += 2; lastAction = "STORY_CHOICE"; break;
            default: resource++; lastAction = "CHOICE"; break;
        }
        SaveState();
        Debug.Log("JAEWOON_TECH_ACTION game=" + GameId + " type=SECONDARY count=" + actionCount + " progress=" + progress);
    }

    private void SaveState()
    {
        PlayerPrefs.SetInt(SavePrefix + "actions", actionCount);
        PlayerPrefs.SetInt(SavePrefix + "progress", progress);
        PlayerPrefs.SetInt(SavePrefix + "resource", resource);
        PlayerPrefs.SetInt(SavePrefix + "level", level);
        PlayerPrefs.SetInt(SavePrefix + "chain", chain);
        PlayerPrefs.Save();
        Debug.Log("JAEWOON_TECH_SAVE game=" + GameId + " actions=" + actionCount + " progress=" + progress);
    }

    private void LoadState()
    {
        actionCount = PlayerPrefs.GetInt(SavePrefix + "actions", 0);
        progress = PlayerPrefs.GetInt(SavePrefix + "progress", 0);
        resource = PlayerPrefs.GetInt(SavePrefix + "resource", 10);
        level = Mathf.Max(1, PlayerPrefs.GetInt(SavePrefix + "level", 1));
        chain = PlayerPrefs.GetInt(SavePrefix + "chain", 0);
        Debug.Log("JAEWOON_TECH_SAVE_RESTORED game=" + GameId + " actions=" + actionCount + " progress=" + progress);
    }

    private void OnApplicationPause(bool paused)
    {
        if (paused) SaveState();
        Debug.Log("JAEWOON_TECH_PAUSE game=" + GameId + " paused=" + paused);
    }

    private void OnApplicationFocus(bool focused)
    {
        Debug.Log("JAEWOON_TECH_FOCUS game=" + GameId + " focused=" + focused);
    }

    private void OnApplicationQuit() { SaveState(); }
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

public static class SeedAndroidBuild
{
    private const string SceneFolder = "Assets/Scenes";
    private const string ScenePath = "Assets/Scenes/Main.unity";
    private const string PrototypeRootName = "JAEWOON_DEVELOPMENT_UNITY_TECHNICAL_PROTOTYPE";

    public static void Build()
    {
        EnsureScene();
        string projectRoot = Directory.GetParent(Application.dataPath).FullName;
        string outputDir = Path.GetFullPath(Path.Combine(projectRoot, "..", "..", "build", "Android"));
        string outputPath = Path.Combine(outputDir, "${csharp(gameId)}.apk");
        Directory.CreateDirectory(outputDir);

        PlayerSettings.productName = "${csharp(gameName)}";
        PlayerSettings.companyName = "Jaewoon Games";
        PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Android, "${packageId}");
        PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;
        PlayerSettings.Android.forceInternetPermission = false;
        PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
        PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.Android, false);
        PlayerSettings.SetGraphicsAPIs(BuildTarget.Android, new[] { GraphicsDeviceType.OpenGLES3 });
        PlayerSettings.openGLRequireES31 = false;
        PlayerSettings.openGLRequireES31AEP = false;
        PlayerSettings.openGLRequireES32 = false;

        BuildPlayerOptions options = new BuildPlayerOptions
        {
            scenes = new[] { ScenePath },
            locationPathName = outputPath,
            target = BuildTarget.Android,
            options = BuildOptions.Development
        };
        BuildReport report = BuildPipeline.BuildPlayer(options);
        if (report.summary.result != BuildResult.Succeeded)
            throw new Exception("Android build failed: " + report.summary.result);
        if (!File.Exists(outputPath) || new FileInfo(outputPath).Length <= 0)
            throw new Exception("APK missing or empty: " + outputPath);
        Debug.Log("JAEWOON_DEVELOPMENT_APK_READY=" + outputPath + " SIZE=" + new FileInfo(outputPath).Length);
    }

    private static void EnsureScene()
    {
        if (!AssetDatabase.IsValidFolder(SceneFolder))
            AssetDatabase.CreateFolder("Assets", "Scenes");

        Scene scene;
        SceneAsset sceneAsset = AssetDatabase.LoadAssetAtPath<SceneAsset>(ScenePath);
        if (sceneAsset == null)
            scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        else
            scene = EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);

        GameObject root = GameObject.Find(PrototypeRootName);
        if (root == null)
            root = new GameObject(PrototypeRootName);
        if (root.GetComponent<SeedTechnicalPrototype>() == null)
            root.AddComponent<SeedTechnicalPrototype>();

        EditorSceneManager.MarkSceneDirty(scene);
        EditorSceneManager.SaveScene(scene, ScenePath);
        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        Debug.Log("JAEWOON_TECH_SCENE_BOUND=" + ScenePath + " ROOT=" + PrototypeRootName);
    }
}
#endif
`;

fs.writeFileSync(path.join(output,'Assets/Scripts/SeedTechnicalPrototype.cs'),runtime);
fs.writeFileSync(path.join(output,'Assets/Editor/SeedAndroidBuild.cs'),build);
fs.writeFileSync(path.join(output,'README.md'),`# ${gameName} — DEVELOPMENT_CONFIRMED Unity technical prototype\n\n- gameId: \`${gameId}\`\n- mode: \`${category}\`\n- Unity editor: \`${UNITY_EDITOR_VERSION}\` (${UNITY_EDITOR_REVISION})\n- source design: \`${baselinePath}\`\n- optional source web evidence: \`${webEvidencePath||'NONE'}\`\n- build method: \`SeedAndroidBuild.Build\`\n- Android graphics profile: \`OpenGLES3 with ES 3.0 minimum compatibility\`\n- purpose: \`TARGET_PLATFORM_TECHNICAL_VALIDATION\`\n- public/release authority: **NO**\n\nThis project is generated directly from the locked design baseline. Web gameplay evidence is optional; when supplied it must be a real PASS.\nIt is a one-game-one-Unity-project technical prototype, not a RELEASE_CONFIRMED production build.\n`);
fs.writeFileSync(path.join(output,'prototype-source.json'),JSON.stringify({
  version:3,gameId,gameName,category,identity,coreLoop,
  selectedPlatform:'UNITY',
  unityEditorVersion:UNITY_EDITOR_VERSION,unityEditorRevision:UNITY_EDITOR_REVISION,
  androidGraphicsCompatibilityProfile:'OPEN_GLES3_ES30_MINIMUM',
  designBaseline:baselinePath,webEvidence:webEvidencePath||null,
  webEvidenceBound,webEvidenceOptional:true,productionClass:'DEVELOPMENT_CONFIRMED',
  purpose:'TARGET_PLATFORM_TECHNICAL_VALIDATION',releaseAuthority:false,
  generatedAt:new Date().toISOString()
},null,2)+'\n');
console.log(`UNITY_TECH_PROJECT=${output}`);
console.log(`UNITY_EDITOR_VERSION=${UNITY_EDITOR_VERSION}`);
console.log(`UNITY_EDITOR_REVISION=${UNITY_EDITOR_REVISION}`);
console.log(`UNITY_TECH_MODE=${category}`);
console.log('UNITY_TECH_BUILD_METHOD=SeedAndroidBuild.Build');
console.log('ANDROID_GRAPHICS_COMPATIBILITY_PROFILE=OPEN_GLES3_ES30_MINIMUM');
console.log(`WEB_EVIDENCE_BOUND=${webEvidenceBound?'YES':'NO'}`);
console.log('WEB_EVIDENCE_OPTIONAL=YES');
console.log('RELEASE_AUTHORITY=NO');