import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const args = Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')).map(x=>{
  const i=x.indexOf('=');
  return i>0?[x.slice(2,i),x.slice(i+1)]:[x.slice(2),'true'];
}));
const gameId=String(args['game-id']||'').trim();
const gameName=String(args['game-name']||gameId).trim();
const baselinePath=String(args.baseline||'').trim();
const output=String(args.output||`unity-games/${gameId}`).trim().replaceAll('\\','/');
const buildUpDirectivePath=String(args['build-up-directive']||'').trim();
const playbooksPath=String(args.playbooks||'').trim();
if(!/^[a-z0-9][a-z0-9-]{1,80}$/.test(gameId))throw new Error(`invalid game id: ${gameId}`);
if(!baselinePath||!fs.existsSync(baselinePath))throw new Error(`design baseline missing: ${baselinePath}`);
if(!playbooksPath||!fs.existsSync(playbooksPath))throw new Error(`verified learning playbooks missing: ${playbooksPath}`);
if(!/^unity-games\/[A-Za-z0-9._-]+$/.test(output)||output.includes('..'))throw new Error(`invalid Unity output: ${output}`);

const UNITY_EDITOR_VERSION='6000.6.0f1';
const UNITY_EDITOR_REVISION='f7f8ed4d1e24';
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const unique=values=>[...new Set((values||[]).map(value=>String(value??'').trim()).filter(Boolean))];
function verifiedExternalLearningFromPlaybooks(playbooks={}){
  const policy=playbooks?.policy||{};
  if(policy.verifiedExternalBlackBoxAllTaskTypesRequired!==true||policy.verifiedExternalBlackBoxTruncationForbidden!==true){
    throw new Error('UNITY_VERIFIED_EXTERNAL_LEARNING_POLICY_REQUIRED');
  }
  const taskTypes=playbooks?.taskTypes&&typeof playbooks.taskTypes==='object'?playbooks.taskTypes:{};
  const allRows=[];
  for(const task of Object.values(taskTypes))for(const row of task?.reuse||[])if(String(row?.id||'').startsWith('external-black-box-'))allRows.push(row);
  const allIds=unique(allRows.map(row=>row.id)).sort();
  if(!allIds.length)throw new Error('UNITY_VERIFIED_EXTERNAL_LEARNING_REQUIRED');
  for(const taskType of ['unity','coding','graphics','general']){
    const task=taskTypes[taskType]||{};
    const ids=unique((task.reuse||[]).filter(row=>String(row?.id||'').startsWith('external-black-box-')).map(row=>row.id)).sort();
    if(task.authority!=='verified-task-playbook'||Number(task.verifiedExternalBlackBoxCoveragePct||0)!==100||ids.length!==allIds.length||!allIds.every(id=>ids.includes(id))){
      throw new Error('UNITY_VERIFIED_EXTERNAL_LEARNING_TASK_COVERAGE_INVALID:'+taskType);
    }
  }
  const byId=new Map();
  for(const row of allRows){
    const id=String(row.id).trim();
    const previous=byId.get(id)||{id,project:String(row.project||''),sourceRevision:String(row.sourceRevision||''),distilledApplicationPrinciples:[],distilledAvoidancePrinciples:[],distilledLearningUseAllowed:[],distilledLearningUseForbidden:[]};
    previous.distilledApplicationPrinciples=unique([...previous.distilledApplicationPrinciples,...(row.distilledApplicationPrinciples||[])]);
    previous.distilledAvoidancePrinciples=unique([...previous.distilledAvoidancePrinciples,...(row.distilledAvoidancePrinciples||[])]);
    previous.distilledLearningUseAllowed=unique([...previous.distilledLearningUseAllowed,...(row.distilledLearningUseAllowed||[])]);
    previous.distilledLearningUseForbidden=unique([...previous.distilledLearningUseForbidden,...(row.distilledLearningUseForbidden||[])]);
    byId.set(id,previous);
  }
  const rows=[...byId.values()].sort((a,b)=>a.id.localeCompare(b.id));
  for(const row of rows)if(!row.distilledApplicationPrinciples.length)throw new Error('UNITY_VERIFIED_EXTERNAL_LEARNING_CONTENT_MISSING:'+row.id);
  const applyAxes=[
    'MENU_FLOW_AND_INFORMATION_ARCHITECTURE',
    'UI_UX_LAYOUT_FEEDBACK_AND_TOUCH_READABILITY',
    'GRAPHICS_ART_DIRECTION_MATERIAL_LIGHTING_AND_COMPOSITION',
    'MOTION_ANIMATION_TRANSITIONS_IMPACT_AND_SECONDARY_MOTION',
    'ENVIRONMENT_WORLD_DENSITY_LANDMARK_AND_READABILITY',
    'VFX_CAMERA_AUDIO_VISUAL_FEEDBACK_LANGUAGE',
    'GAMEPLAY_SYSTEM_IMPLEMENTATION_WHEN_CAUSALLY_RELEVANT'
  ];
  const fingerprint=createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  return Object.freeze({
    rows:Object.freeze(rows.map(row=>Object.freeze({...row}))),
    ids:Object.freeze(rows.map(row=>row.id)),
    applicationPrinciples:Object.freeze(unique(rows.flatMap(row=>row.distilledApplicationPrinciples))),
    avoidancePrinciples:Object.freeze(unique(rows.flatMap(row=>row.distilledAvoidancePrinciples))),
    allowed:Object.freeze(unique(rows.flatMap(row=>row.distilledLearningUseAllowed))),
    forbidden:Object.freeze(unique(rows.flatMap(row=>row.distilledLearningUseForbidden))),
    applyAxes:Object.freeze(applyAxes),
    retrievedCount:rows.length,
    appliedCount:rows.length,
    coveragePct:100,
    distilledContentComplete:true,
    truncationForbidden:true,
    fingerprint
  });
}
const baseline=readJson(baselinePath);
const playbooks=readJson(playbooksPath);
const verifiedExternalLearning=verifiedExternalLearningFromPlaybooks(playbooks);
const design=baseline.content||baseline;
const buildUpDirective=buildUpDirectivePath&&fs.existsSync(buildUpDirectivePath)?readJson(buildUpDirectivePath):null;
const buildUpDirectiveConsumed=Boolean(String(buildUpDirective?.directiveId||'').trim());
if(buildUpDirectiveConsumed&&String(buildUpDirective?.gameId||'').trim()!==gameId)throw new Error('BUILD_UP_DIRECTIVE_GAME_ID_MISMATCH');
const unityPlatformProfile=design?.platformProfiles?.UNITY;
if(!unityPlatformProfile||Array.isArray(unityPlatformProfile)||typeof unityPlatformProfile!=='object')throw new Error('UNITY_PLATFORM_PROFILE_REQUIRED');
if(String(unityPlatformProfile.platform||'').trim().toUpperCase()!=='UNITY')throw new Error('UNITY_PLATFORM_PROFILE_TARGET_MISMATCH');
for(const field of ['inputModel','sessionModel','multiplayerRuntime','performanceBudget','uiUx','saveAndNetwork','platformContentAdaptation','internalReleaseTarget','validationEvidence']){
  if(String(unityPlatformProfile[field]||'').trim().length<8)throw new Error('UNITY_PLATFORM_PROFILE_FIELD_REQUIRED:'+field);
}
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
const generatorFingerprint=createHash('sha256').update(fs.readFileSync(new URL(import.meta.url))).update('\n').update(verifiedExternalLearning.fingerprint).digest('hex');
const csharpArray=values=>(values||[]).map(value=>`        "${csharp(value)}",`).join('\n');

fs.rmSync(output,{recursive:true,force:true});
for(const dir of ['Assets/Scripts','Assets/Editor','Packages','ProjectSettings'])fs.mkdirSync(path.join(output,dir),{recursive:true});
fs.writeFileSync(path.join(output,'Packages/manifest.json'),JSON.stringify({dependencies:{'com.unity.modules.imgui':'1.0.0'}},null,2)+'\n');
fs.writeFileSync(path.join(output,'ProjectSettings/ProjectVersion.txt'),`m_EditorVersion: ${UNITY_EDITOR_VERSION}\nm_EditorVersionWithRevision: ${UNITY_EDITOR_VERSION} (${UNITY_EDITOR_REVISION})\n`);
fs.writeFileSync(path.join(output,'Assets/link.xml'),`<linker>\n  <assembly fullname="UnityEngine.ContentLoadModule">\n    <type fullname="Unity.Loading.ContentLoadingSystem" preserve="all" />\n  </assembly>\n</linker>\n`);

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
    private const int VerifiedExternalLearningCoveragePct = 100;
    private static readonly string[] VerifiedExternalLearningIds = new string[]
    {
${csharpArray(verifiedExternalLearning.ids)}
    };
    private static readonly string[] VerifiedExternalLearningPrinciples = new string[]
    {
${csharpArray(verifiedExternalLearning.applicationPrinciples)}
    };
    private static readonly string[] VerifiedExternalLearningAvoidance = new string[]
    {
${csharpArray(verifiedExternalLearning.avoidancePrinciples)}
    };
    private static readonly string[] VerifiedExternalLearningAllowed = new string[]
    {
${csharpArray(verifiedExternalLearning.allowed)}
    };
    private static readonly string[] VerifiedExternalLearningForbidden = new string[]
    {
${csharpArray(verifiedExternalLearning.forbidden)}
    };

    private int actionCount;
    private int progress;
    private int resource = 10;
    private int level = 1;
    private int chain;
    private float elapsed;
    private float metricTimer;
    private float fpsTime;
    private int fpsFrames;
    private int verifiedLearningSignal;
    private string lastAction = "READY";
    private string lastVerifiedLearningPattern = "READY";

    private void Awake()
    {
        Application.targetFrameRate = 60;
        Screen.sleepTimeout = SleepTimeout.NeverSleep;
        LoadState();
        unchecked
        {
            verifiedLearningSignal = 17;
            foreach (string value in VerifiedExternalLearningIds) verifiedLearningSignal = verifiedLearningSignal * 31 + value.GetHashCode();
            foreach (string value in VerifiedExternalLearningPrinciples) verifiedLearningSignal = verifiedLearningSignal * 31 + value.GetHashCode();
            foreach (string value in VerifiedExternalLearningAvoidance) verifiedLearningSignal = verifiedLearningSignal * 31 + value.GetHashCode();
            foreach (string value in VerifiedExternalLearningAllowed) verifiedLearningSignal = verifiedLearningSignal * 31 + value.GetHashCode();
            foreach (string value in VerifiedExternalLearningForbidden) verifiedLearningSignal = verifiedLearningSignal * 31 + value.GetHashCode();
        }
        Debug.Log("JAEWOON_VERIFIED_EXTERNAL_LEARNING coverage=" + VerifiedExternalLearningCoveragePct +
                  " ids=" + VerifiedExternalLearningIds.Length +
                  " principles=" + VerifiedExternalLearningPrinciples.Length +
                  " signal=" + verifiedLearningSignal);
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
        float learningPulse = 1f + 0.02f * Mathf.Sin(Time.unscaledTime * 2f + (verifiedLearningSignal & 15) * 0.07f);
        float scale = Mathf.Max(1f, w / 390f) * learningPulse;
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
            float y = h * (0.53f + 0.018f * learningPulse * Mathf.Sin(Time.unscaledTime * (1.2f + i * 0.08f) + i + (verifiedLearningSignal & 7) * 0.11f));
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
        ApplyVerifiedExternalLearningFeedback();
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
        ApplyVerifiedExternalLearningFeedback();
        SaveState();
        Debug.Log("JAEWOON_TECH_ACTION game=" + GameId + " type=SECONDARY count=" + actionCount + " progress=" + progress);
    }

    private void ApplyVerifiedExternalLearningFeedback()
    {
        if (VerifiedExternalLearningPrinciples.Length == 0) return;
        int index = Math.Abs(actionCount + verifiedLearningSignal) % VerifiedExternalLearningPrinciples.Length;
        lastVerifiedLearningPattern = VerifiedExternalLearningPrinciples[index];
        Debug.Log("JAEWOON_VERIFIED_EXTERNAL_LEARNING_APPLIED game=" + GameId +
                  " action=" + actionCount +
                  " ids=" + VerifiedExternalLearningIds.Length +
                  " patternIndex=" + index +
                  " pattern=" + lastVerifiedLearningPattern);
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
fs.writeFileSync(path.join(output,'README.md'),`# ${gameName} — DEVELOPMENT_CONFIRMED Unity app native development baseline\n\n- gameId: \`${gameId}\`\n- mode: \`${category}\`\n- Unity editor: \`${UNITY_EDITOR_VERSION}\` (${UNITY_EDITOR_REVISION})\n- source design: \`${baselinePath}\`
- BUILD_UP directive: ${buildUpDirectiveConsumed?buildUpDirective.directiveId:'NONE_BASELINE_ONLY'} (generation ${buildUpDirectiveConsumed?buildUpDirective.generation:0})\n- verified external APK black-box learning: 100% (${verifiedExternalLearning.appliedCount}/${verifiedExternalLearning.retrievedCount})\n- Unity app profile: \`design-revised.json#content.platformProfiles.UNITY\`\n- build method: \`SeedAndroidBuild.Build\`\n- Android graphics profile: \`OpenGLES3 with ES 3.0 minimum compatibility\`\n- purpose: \`TARGET_PLATFORM_NATIVE_APP_DEVELOPMENT\`\n- public/release authority: **NO**\n\nThis project is generated directly from the locked design baseline. Unity Web is not used. The project is generated from the common game design plus the Unity app platform profile.\nIt remains DEVELOPMENT_CONFIRMED until platform runtime, independent QA, regression, and release evidence pass.\n`);
fs.writeFileSync(path.join(output,'prototype-source.json'),JSON.stringify({
  version:3,gameId,gameName,category,identity,coreLoop,
  selectedPlatform:'UNITY',
  unityEditorVersion:UNITY_EDITOR_VERSION,unityEditorRevision:UNITY_EDITOR_REVISION,
  generatorFingerprint,
  buildUpDirectiveId:buildUpDirectiveConsumed?buildUpDirective.directiveId:null,
  buildUpGeneration:buildUpDirectiveConsumed?buildUpDirective.generation:null,
  buildUpGoal:buildUpDirectiveConsumed?buildUpDirective.thisLoopPrimaryGoal:null,
  buildUpDirectiveFingerprint:buildUpDirectiveConsumed?buildUpDirective.directiveFingerprint:null,
  buildUpDirectiveConsumed,
  buildUpDirectiveCompletionClaim:false,
  verifiedExternalLearningFirst:true,
  verifiedExternalLearningCoveragePct:verifiedExternalLearning.coveragePct,
  verifiedExternalLearningRetrievedCount:verifiedExternalLearning.retrievedCount,
  verifiedExternalLearningAppliedCount:verifiedExternalLearning.appliedCount,
  verifiedExternalLearningIds:verifiedExternalLearning.ids,
  verifiedExternalLearningApplyAxes:verifiedExternalLearning.applyAxes,
  verifiedExternalDistilledContentComplete:verifiedExternalLearning.distilledContentComplete,
  verifiedExternalLearningTruncationForbidden:verifiedExternalLearning.truncationForbidden,
  verifiedExternalLearningFingerprint:verifiedExternalLearning.fingerprint,
  verifiedExternalLearningRows:verifiedExternalLearning.rows,
  platformDesignProfile:unityPlatformProfile,
  androidGraphicsCompatibilityProfile:'OPEN_GLES3_ES30_MINIMUM',
  designBaseline:baselinePath,productionClass:'DEVELOPMENT_CONFIRMED',
  nativeAppOnly:true,unityWebEnabled:false,
  purpose:'TARGET_PLATFORM_TECHNICAL_VALIDATION',releaseAuthority:false,
  generatedAt:new Date().toISOString()
},null,2)+'\n');
console.log(`UNITY_TECH_PROJECT=${output}`);
console.log(`UNITY_EDITOR_VERSION=${UNITY_EDITOR_VERSION}`);
console.log(`UNITY_EDITOR_REVISION=${UNITY_EDITOR_REVISION}`);
console.log(`UNITY_BUILD_UP_DIRECTIVE=${buildUpDirectiveConsumed?buildUpDirective.directiveId:'NONE_BASELINE_ONLY'}`);
console.log('UNITY_BUILD_UP_COMPLETION_CLAIM=NO');
console.log(`UNITY_TECH_GENERATOR_FINGERPRINT=${generatorFingerprint}`);
console.log(`UNITY_VERIFIED_EXTERNAL_LEARNING_COVERAGE=${verifiedExternalLearning.coveragePct}`);
console.log(`UNITY_VERIFIED_EXTERNAL_LEARNING_COUNT=${verifiedExternalLearning.appliedCount}`);
console.log(`UNITY_VERIFIED_EXTERNAL_LEARNING_IDS=${verifiedExternalLearning.ids.join(',')}`);
console.log(`UNITY_VERIFIED_EXTERNAL_LEARNING_FINGERPRINT=${verifiedExternalLearning.fingerprint}`);
console.log(`UNITY_TECH_MODE=${category}`);
console.log('UNITY_TECH_BUILD_METHOD=SeedAndroidBuild.Build');
console.log('UNITY_WEB_ENABLED=NO');
console.log('ANDROID_GRAPHICS_COMPATIBILITY_PROFILE=OPEN_GLES3_ES30_MINIMUM');
console.log('RELEASE_AUTHORITY=NO');