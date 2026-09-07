// 파일명: AndroidCiBuild.cs
// 역할: GitHub Actions에서 animation-test Android APK를 결정적으로 생성

#if UNITY_EDITOR
using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

public static class AndroidCiBuild
{
    private const string SceneFolder = "Assets/Scenes";
    private const string ScenePath = "Assets/Scenes/Main.unity";

    public static void Build()
    {
        EnsureScene();

        string projectRoot = Directory.GetParent(Application.dataPath)!.FullName;
        string outputDir = Path.Combine(projectRoot, "Build");
        string outputPath = Path.Combine(outputDir, "animation-test.apk");
        Directory.CreateDirectory(outputDir);

        PlayerSettings.productName = "Animation Test";
        PlayerSettings.companyName = "Jaewoon Games";
        PlayerSettings.Android.forceInternetPermission = true;

        BuildPlayerOptions options = new BuildPlayerOptions
        {
            scenes = new[] { ScenePath },
            locationPathName = outputPath,
            target = BuildTarget.Android,
            options = BuildOptions.Development
        };

        BuildReport report = BuildPipeline.BuildPlayer(options);
        if (report.summary.result != BuildResult.Succeeded)
        {
            throw new Exception($"Android build failed: {report.summary.result}");
        }

        if (!File.Exists(outputPath) || new FileInfo(outputPath).Length <= 0)
        {
            throw new Exception("APK was not created or is empty: " + outputPath);
        }

        Debug.Log($"ANDROID_APK_READY={outputPath} SIZE={new FileInfo(outputPath).Length}");
    }

    private static void EnsureScene()
    {
        if (!AssetDatabase.IsValidFolder(SceneFolder))
        {
            AssetDatabase.CreateFolder("Assets", "Scenes");
        }

        SceneAsset mainScene = AssetDatabase.LoadAssetAtPath<SceneAsset>(ScenePath);
        if (mainScene == null)
        {
            Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            EditorSceneManager.SaveScene(scene, ScenePath);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
        }

        EditorBuildSettings.scenes = new[]
        {
            new EditorBuildSettingsScene(ScenePath, true)
        };
    }
}
#endif
