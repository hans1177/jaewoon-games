#if UNITY_EDITOR
using System;
using System.IO;
using System.Security.Cryptography;
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

    // 외부 CC0 공용 메시의 일부만 마력숲 숲마을·캠프·길의 실제 3D 소비처에 연결한다.
    // 임의 다운로드/새 파이프라인 없이 기존 공용 자산 원본과 등록 해시를 사용한다.
    private static readonly string[] VillageModelNames = {
        "house", "house_door", "house_chimney", "fence_straight", "fence_corner",
        "gate_single", "bench_A", "tree", "tree_large", "foliage_A", "foliage_B",
        "cobblestones", "package", "mailbox"
    };

    [Serializable] private sealed class SharedRegistry { public SharedAsset[] assets; }
    [Serializable] private sealed class SharedAsset
    {
        public string id, path, sourceHash, license;
        public bool originalSourceImmutable, companyCommonBase;
    }

    // 공용 에셋을 게임 기존 Resources 소비처로 임포트한다. 원본은 읽기 전용이고
    // 생성 파일은 Editor에서만 존재하며, 실제 출시 여부는 WebGL 런타임 검증이 결정한다.
    private static void ImportSharedVillageModels()
    {
        string project = Directory.GetParent(Application.dataPath).FullName;
        string repoRoot = Path.GetFullPath(Path.Combine(project, "..", ".."));
        string registryPath = Path.Combine(repoRoot, "company-asset-library.json");
        if (!File.Exists(registryPath)) throw new Exception("MAGIC_FOREST_COMMON_REGISTRY_MISSING");
        SharedRegistry registry = JsonUtility.FromJson<SharedRegistry>(File.ReadAllText(registryPath));
        if (registry == null || registry.assets == null)
            throw new Exception("MAGIC_FOREST_COMMON_REGISTRY_INVALID");
        string folder = "Assets/Resources/CompanyAssets/";
        int imported = 0;
        foreach (string name in VillageModelNames)
        {
            string original = "assets/shared/homely-house/" + name + ".obj";
            SharedAsset entry = Array.Find(registry.assets, row => row != null
                && row.id == "external-tinytreats-" + name.ToLowerInvariant().Replace('_', '-') + "-v1");
            if (entry == null || entry.path != "/" + original || entry.license != "CC0"
                || !entry.companyCommonBase || !entry.originalSourceImmutable
                || string.IsNullOrEmpty(entry.sourceHash))
                throw new Exception("MAGIC_FOREST_SHARED_SOURCE_UNREGISTERED:" + name);
            string source = Path.Combine(repoRoot, original);
            string material = Path.Combine(repoRoot, "assets/shared/homely-house/" + name + ".mtl");
            if (!File.Exists(source) || !File.Exists(material) || new FileInfo(source).Length > 3 * 1024 * 1024)
                throw new Exception("MAGIC_FOREST_SHARED_SOURCE_MISSING:" + name);
            string sourceHash;
            using (SHA256 sha = SHA256.Create())
                sourceHash = BitConverter.ToString(sha.ComputeHash(File.ReadAllBytes(source)))
                    .Replace("-", "").ToLowerInvariant();
            if (!String.Equals(sourceHash, entry.sourceHash, StringComparison.OrdinalIgnoreCase))
                throw new Exception("MAGIC_FOREST_SHARED_SOURCE_HASH_MISMATCH:" + name);
            string target = Path.Combine(project, folder + "MagicForestVillage_" + name + ".obj");
            string targetMaterial = Path.Combine(project, folder + name + ".mtl");
            // glTF/FBX wrapper 대신 Unity의 기존 OBJ 임포터를 직접 사용한다.
            if (!File.Exists(target) || !File.ReadAllBytes(target).AsSpan().SequenceEqual(File.ReadAllBytes(source)))
                File.Copy(source, target, true);
            if (!File.Exists(targetMaterial) || File.ReadAllText(targetMaterial) != File.ReadAllText(material))
                File.Copy(material, targetMaterial, true);
            imported++;
        }
        AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
        foreach (string name in VillageModelNames)
        {
            string modelPath = folder + "MagicForestVillage_" + name + ".obj";
            GameObject model = AssetDatabase.LoadAssetAtPath<GameObject>(modelPath);
            if (model == null) throw new Exception("MAGIC_FOREST_SHARED_MESH_IMPORT_FAILED:" + name);
            int indices = 0;
            foreach (MeshFilter filter in model.GetComponentsInChildren<MeshFilter>(true))
                if (filter != null && filter.sharedMesh != null)
                    for (int submesh = 0; submesh < filter.sharedMesh.subMeshCount; submesh++)
                        if (filter.sharedMesh.GetTopology(submesh) == MeshTopology.Triangles)
                            indices += (int)filter.sharedMesh.GetIndexCount(submesh);
            if (indices < 45 || model.GetComponentInChildren<Renderer>(true) == null)
                throw new Exception("MAGIC_FOREST_SHARED_MESH_GEOMETRY_FAILED:" + name);
        }
        Debug.Log("MAGIC_FOREST_SHARED_CC0_3D=SOURCE_BOUND_RUNTIME_QA_REQUIRED models=" + imported);
    }

    public static void BuildWeb()
    {
        EnsureScene();
        if(!EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.WebGL,BuildTarget.WebGL))
            throw new Exception("WEBGL_TARGET_SWITCH_FAILED");
        PlayerSettings.companyName="Jaewoon Games";
        PlayerSettings.productName="마력숲 생존기 Web";
        string root=Directory.GetParent(Application.dataPath).FullName;
        string output=Path.GetFullPath(Path.Combine(root,"..","..","build","WebGL","fantasy-survival"));
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
        PlayerSettings.productName="마력숲 생존기";
        PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Android,"com.jaewoongames.fantasysurvival");
        PlayerSettings.Android.targetArchitectures=AndroidArchitecture.ARM64;
        PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.Android,false);
        PlayerSettings.SetGraphicsAPIs(BuildTarget.Android,new[]{GraphicsDeviceType.OpenGLES3});
        string root=Directory.GetParent(Application.dataPath).FullName;
        string dir=Path.GetFullPath(Path.Combine(root,"..","..","build","Android"));
        Directory.CreateDirectory(dir);
        string output=Path.Combine(dir,"fantasy-survival.apk");
        var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{
            scenes=new[]{ScenePath},locationPathName=output,target=BuildTarget.Android,options=BuildOptions.Development
        });
        if(report.summary.result!=BuildResult.Succeeded)throw new Exception("ANDROID_BUILD_FAILED:"+report.summary.result);
    }


    // 자산 · 얇은 도로 메시는 X/Z 면적과 최소 높이를 따로 검사한다.
    private static bool RoadHasDepth(GameObject model)
    {
        foreach (MeshFilter filter in model.GetComponentsInChildren<MeshFilter>(true))
        {
            if (filter == null || filter.sharedMesh == null) continue;
            Vector3 size = filter.sharedMesh.bounds.size;
            if (size.x > .2f && size.z > .2f && size.y > .002f) return true;
        }
        return false;
    }

    private static void EnsureScene()
    {
        // 그래픽 · 공용 스킨드 GLB의 실제 본/액션 클립을 기존 Unity 빌드 진입점에서 변환한다.
        // 변환 실패는 웹 빌드를 중단하며 준비된 소스만으로 출시 PASS를 만들지 않는다.
        UnityCompanyAssets.Prepare();
        ImportSharedVillageModels();
        foreach(string role in new[]{"Traveler","Rogue","Guardian","Archer","Mage",
            "Wolf","Golem","Spider","Serpent","Beetle"})
        {
            string prefab="Assets/Resources/CompanyAssets/MagicForest"+role+".prefab";
            GameObject actor=AssetDatabase.LoadAssetAtPath<GameObject>(prefab);
            if(actor==null || actor.GetComponent<Animation>()==null)
                throw new Exception("UNITY_COMPANY_ACTOR_ANIMATION_MISSING:"+role);
            SkinnedMeshRenderer skin=actor.GetComponentInChildren<SkinnedMeshRenderer>(true);
            if(skin==null || skin.sharedMesh==null || skin.sharedMesh.vertexCount<100 || skin.bones.Length<3)
                throw new Exception("UNITY_COMPANY_ACTOR_SKIN_MISSING:"+role);
            // 모션 · Unity 프리팹 에셋의 AnimationState 열거는 에디터 비활성 상태에서 0개로 반환될 수 있다.
            // 기존 GLB 변환기가 생성한 실제 .anim 에셋의 Legacy 클립/커브를 검증한다.
            string clipPrefix="Assets/Resources/CompanyAssets/MagicForest"+role+"_";
            int clipCount=0;
            foreach(string guid in AssetDatabase.FindAssets("t:AnimationClip",new[]{"Assets/Resources/CompanyAssets"}))
            {
                string clipPath=AssetDatabase.GUIDToAssetPath(guid);
                if(!clipPath.StartsWith(clipPrefix,StringComparison.Ordinal)
                    || !clipPath.EndsWith(".anim",StringComparison.OrdinalIgnoreCase))continue;
                AnimationClip clip=AssetDatabase.LoadAssetAtPath<AnimationClip>(clipPath);
                if(clip!=null && clip.legacy && !clip.empty)clipCount++;
            }
            if(clipCount<5)throw new Exception("UNITY_COMPANY_ACTOR_ACTION_COVERAGE_MISSING:"+role);
            if(role=="Guardian")
            {
                // 실제 플레이어가 사용하는 모든 모션은 동일한 원본 리그의 import 결과여야 한다.
                foreach(string action in new[]{"IDLE_BREATH","RUN","ATTACK_LIGHT_SLASH","ATTACK_HEAVY",
                    "HIT_FRONT","GUARDIAN_REVIVE","GUARDIAN_PARRY"})
                {
                    AnimationClip clip=AssetDatabase.LoadAssetAtPath<AnimationClip>(clipPrefix+action+".anim");
                    if(clip==null || !clip.legacy || clip.empty)
                        throw new Exception("UNITY_COMPANY_GUARDIAN_ACTION_CLIP_MISSING:"+action);
                }
            }
            Debug.Log("UNITY_COMPANY_ACTOR_SKINNED_ACTION=SOURCE_READY_RUNTIME_UNVERIFIED:"+role+":clips="+clipCount);
        }
        // Build 전 검사 · 기존 Unity 프로젝트에 실제 네이티브 3D 자산이 임포트됐는지 확인한다.
        // 파일명이나 원장 메타데이터만으로 메시 품질 및 배포 통과로 인정하지 않는다.
        string[] modelPaths =
        {
            "Assets/Resources/CompanyAssets/MagicForestTrunk.obj",
            "Assets/Resources/CompanyAssets/MagicForestCrown.obj",
            "Assets/Resources/CompanyAssets/MagicForestRock.obj",
            "Assets/Resources/CompanyAssets/MagicForestRoad.obj",
            "Assets/Resources/CompanyAssets/MagicForestChest.obj",
            "Assets/Resources/CompanyAssets/MagicForestCrate.obj",
            "Assets/Resources/CompanyAssets/MagicForestWall.obj",
            "Assets/Resources/CompanyAssets/MagicForestDoor.obj",
            "Assets/Resources/CompanyAssets/MagicForestFoundation.obj",
            "Assets/Resources/CompanyAssets/MagicForestRoof.obj",
            "Assets/Resources/CompanyAssets/MagicForestLamp.obj",
            "Assets/Resources/CompanyAssets/MagicForestTorso.obj",
            "Assets/Resources/CompanyAssets/MagicForestCape.obj",
            "Assets/Resources/CompanyAssets/MagicForestShoulder.obj",
            "Assets/Resources/CompanyAssets/MagicForestCanine.obj",
            "Assets/Resources/CompanyAssets/MagicForestClaw.obj",
            "Assets/Resources/CompanyAssets/MagicForestSword.obj",
            "Assets/Resources/CompanyAssets/MagicForestGrip.obj"
        };
        foreach (string modelPath in modelPaths)
        {
            GameObject model = AssetDatabase.LoadAssetAtPath<GameObject>(modelPath);
            if (model == null) throw new Exception("UNITY_WEB_NATIVE_ASSET_IMPORT_FAILED:" + modelPath);
            MeshFilter[] filters = model.GetComponentsInChildren<MeshFilter>(true);
            Renderer[] renderers = model.GetComponentsInChildren<Renderer>(true);
            int triangles = 0;
            bool hasDepth = false, hasMaterial = false;
            foreach (MeshFilter filter in filters)
            {
                if (filter == null || filter.sharedMesh == null) continue;
                Mesh mesh = filter.sharedMesh;
                // Unity가 Read/Write를 비활성화한 수입 메시도 안전하게 검사한다.
                for (int submesh = 0; submesh < mesh.subMeshCount; submesh++)
                    if (mesh.GetTopology(submesh) == MeshTopology.Triangles)
                        triangles += (int)(mesh.GetIndexCount(submesh) / 3);
                Vector3 bounds = mesh.bounds.size;
                // 얇은 길/장식은 입체 메시의 두께를 따로 검증한다.
                float minimumHeight=modelPath.EndsWith("MagicForestRoad.obj") ? 0.012f:.08f;
                if (bounds.x > .1f && bounds.y > minimumHeight && bounds.z > .1f) hasDepth = true;
            }
            foreach (Renderer renderer in renderers)
            {
                if (renderer == null) continue;
                foreach (Material material in renderer.sharedMaterials)
                    if (material != null && material.shader != null) hasMaterial = true;
            }
            int minimumTriangles=modelPath.EndsWith("MagicForestTrunk.obj")
                ||modelPath.EndsWith("MagicForestCrown.obj")?150:16;
            if (triangles < minimumTriangles || !hasDepth || !hasMaterial)
                throw new Exception("UNITY_WEB_NATIVE_ASSET_GEOMETRY_OR_MATERIAL_FAILED:" + modelPath
                    + ":triangles=" + triangles + ":depth=" + hasDepth + ":material=" + hasMaterial);
            Debug.Log("UNITY_WEB_NATIVE_ASSET_IMPORT=SOURCE_READY_RUNTIME_UNVERIFIED:"
                + modelPath + ":triangles=" + triangles);
        }
        foreach(string sourceName in new[]{"MagicForestUI","MagicForestMotion"})
        {
            string sourcePath="Assets/Resources/CompanyAssets/"+sourceName+".json";
            TextAsset nativeConfig=AssetDatabase.LoadAssetAtPath<TextAsset>(sourcePath);
            if(nativeConfig==null || string.IsNullOrWhiteSpace(nativeConfig.text))
                throw new Exception("UNITY_WEB_NATIVE_PRESENTATION_SOURCE_MISSING:"+sourcePath);
            Debug.Log("UNITY_WEB_NATIVE_PRESENTATION_SOURCE=SOURCE_READY_RUNTIME_UNVERIFIED:"+sourcePath);
        }
        if(!AssetDatabase.IsValidFolder(SceneFolder))AssetDatabase.CreateFolder("Assets","Scenes");
        Scene scene=AssetDatabase.LoadAssetAtPath<SceneAsset>(ScenePath)==null
            ?EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single)
            :EditorSceneManager.OpenScene(ScenePath,OpenSceneMode.Single);
        var root=GameObject.Find("UNITY_WEB_FLOOR_ROOT");
        if(root==null)root=new GameObject("UNITY_WEB_FLOOR_ROOT");
        if(root.GetComponent<UnityWebFloorGame>()==null)root.AddComponent<UnityWebFloorGame>();
        // 물리 · Unity 6은 link.xml만으로 Physics 모듈의 네이티브 빌드 포함을 보장하지 않는다.
        // 이미 존재하는 씬 루트에 비활성 콜라이더를 직렬화해 실제 Box/Sphere/Capsule 클래스를 빌드에 포함한다.
        // 충돌판정에는 참여하지 않아 기존 저장·동작·전투 수치에 영향을 주지 않는다.
        // Editor의 누락 컴포넌트는 관리 참조가 남을 수 있으므로 Unity의 null 비교로 생성 여부를 판단한다.
        BoxCollider nativeBox=root.GetComponent<BoxCollider>();
        if(nativeBox==null)nativeBox=root.AddComponent<BoxCollider>();
        SphereCollider nativeSphere=root.GetComponent<SphereCollider>();
        if(nativeSphere==null)nativeSphere=root.AddComponent<SphereCollider>();
        CapsuleCollider nativeCapsule=root.GetComponent<CapsuleCollider>();
        if(nativeCapsule==null)nativeCapsule=root.AddComponent<CapsuleCollider>();
        nativeBox.enabled=false;
        nativeSphere.enabled=false;
        nativeCapsule.enabled=false;
        EditorSceneManager.MarkSceneDirty(scene);
        if(!EditorSceneManager.SaveScene(scene,ScenePath))throw new Exception("SCENE_SAVE_FAILED");
        EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene(ScenePath,true)};
        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
    }
}
#endif
