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
        if (!EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.WebGL, BuildTarget.WebGL))
            throw new Exception("WEBGL_TARGET_SWITCH_FAILED");
        PlayerSettings.companyName = "Jaewoon Games";
        PlayerSettings.productName = "마력숲 생존기 Web";
        string root = Directory.GetParent(Application.dataPath).FullName;
        string output = Path.GetFullPath(Path.Combine(root, "..", "..", "build", "WebGL", "fantasy-survival"));
        Directory.CreateDirectory(output);
        var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions {
            scenes = new[] { ScenePath },
            locationPathName = output,
            target = BuildTarget.WebGL,
            options = BuildOptions.None
        });
        if (report.summary.result != BuildResult.Succeeded) throw new Exception("WEBGL_BUILD_FAILED:" + report.summary.result);
        if (!File.Exists(Path.Combine(output, "index.html"))) throw new Exception("WEBGL_OUTPUT_MISSING");
    }

    public static void Build()
    {
        EnsureScene();
        if (!EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.Android, BuildTarget.Android))
            throw new Exception("ANDROID_TARGET_SWITCH_FAILED");
        PlayerSettings.companyName = "Jaewoon Games";
        PlayerSettings.productName = "마력숲 생존기";
        PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Android, "com.jaewoongames.fantasysurvival");
        PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
        PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.Android, false);
        PlayerSettings.SetGraphicsAPIs(BuildTarget.Android, new[] { GraphicsDeviceType.OpenGLES3 });
        string root = Directory.GetParent(Application.dataPath).FullName;
        string dir = Path.GetFullPath(Path.Combine(root, "..", "..", "build", "Android"));
        Directory.CreateDirectory(dir);
        string output = Path.Combine(dir, "fantasy-survival.apk");
        var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions {
            scenes = new[] { ScenePath },
            locationPathName = output,
            target = BuildTarget.Android,
            options = BuildOptions.Development
        });
        if (report.summary.result != BuildResult.Succeeded) throw new Exception("ANDROID_BUILD_FAILED:" + report.summary.result);
    }

    private static void EnsureScene()
    {
        if (!AssetDatabase.IsValidFolder(SceneFolder)) AssetDatabase.CreateFolder("Assets", "Scenes");
        Scene scene = AssetDatabase.LoadAssetAtPath<SceneAsset>(ScenePath) == null
            ? EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single)
            : EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
        var root = GameObject.Find("UNITY_WEB_FLOOR_ROOT") ?? new GameObject("UNITY_WEB_FLOOR_ROOT");
        if (root.GetComponent<UnityWebFloorGame>() == null) root.AddComponent<UnityWebFloorGame>();
        EditorSceneManager.MarkSceneDirty(scene);
        if (!EditorSceneManager.SaveScene(scene, ScenePath)) throw new Exception("SCENE_SAVE_FAILED");
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
    }
}
#endif
