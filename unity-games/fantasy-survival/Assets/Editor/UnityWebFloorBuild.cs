#if UNITY_EDITOR
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

    private static void EnsureScene()
    {
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
                float minimumHeight=modelPath.EndsWith("MagicForestRoad.obj")?.012f:.08f;
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
