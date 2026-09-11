#if UNITY_EDITOR
using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

public static class SeedAndroidBuild
{
    private const string SceneFolder = "Assets/Scenes";
    private const string ScenePath = "Assets/Scenes/Main.unity";

    public static void Build()
    {
        EnsureScene();
        string projectRoot = Directory.GetParent(Application.dataPath).FullName;
        string outputDir = Path.GetFullPath(Path.Combine(projectRoot, "..", "..", "build", "Android"));
        string outputPath = Path.Combine(outputDir, "seed-casual-realm-weaver.apk");
        Directory.CreateDirectory(outputDir);

        PlayerSettings.productName = "Realm Weaver";
        PlayerSettings.companyName = "Jaewoon Games";
        PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Android, "com.jaewoongames.seedcasualrealmweaver");
        PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;
        PlayerSettings.Android.forceInternetPermission = false;
        PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;

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
        SceneAsset sceneAsset = AssetDatabase.LoadAssetAtPath<SceneAsset>(ScenePath);
        if (sceneAsset == null)
        {
            Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            EditorSceneManager.SaveScene(scene, ScenePath);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
        }
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
    }
}
#endif
