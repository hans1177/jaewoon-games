// 파일명: AndroidTestBuild.cs
// 역할: GitHub-hosted GameCI가 대충 RPG의 첫 Android 테스트 APK를 재현 가능하게 빌드한다.
using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace JaewoonGames.DaechungRpg.Editor
{
    public static class AndroidTestBuild
    {
        private const string SceneFolder = "Assets/Scenes";
        private const string ScenePath = "Assets/Scenes/Main.unity";

        public static void Build()
        {
            EnsureTestScene();

            if (!EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.Android, BuildTarget.Android))
            {
                throw new InvalidOperationException("Failed to switch active build target to Android.");
            }

            EditorUserBuildSettings.buildAppBundle = false;
            PlayerSettings.productName = "Daechung RPG Test";
            PlayerSettings.bundleVersion = "0.1.0-test";

            var repoRoot = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", ".."));
            var outputDirectory = Path.Combine(repoRoot, "build", "Android");
            Directory.CreateDirectory(outputDirectory);
            var outputPath = Path.Combine(outputDirectory, "daechung-rpg.apk");

            var options = new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = outputPath,
                target = BuildTarget.Android,
                options = BuildOptions.None
            };

            Debug.Log($"[JAEWOON BUILD] Building Android APK: {outputPath}");
            var report = BuildPipeline.BuildPlayer(options);
            var summary = report.summary;
            Debug.Log($"[JAEWOON BUILD] result={summary.result} size={summary.totalSize} warnings={summary.totalWarnings} errors={summary.totalErrors}");

            if (summary.result != BuildResult.Succeeded || !File.Exists(outputPath) || new FileInfo(outputPath).Length <= 0)
            {
                throw new InvalidOperationException($"Android test build failed: {summary.result}");
            }
        }

        private static void EnsureTestScene()
        {
            if (!AssetDatabase.IsValidFolder(SceneFolder))
            {
                AssetDatabase.CreateFolder("Assets", "Scenes");
            }

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            if (!EditorSceneManager.SaveScene(scene, ScenePath))
            {
                throw new InvalidOperationException($"Could not save generated test scene: {ScenePath}");
            }

            EditorBuildSettings.scenes = new[]
            {
                new EditorBuildSettingsScene(ScenePath, true)
            };

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log($"[JAEWOON BUILD] Generated and registered scene: {ScenePath}");
        }
    }
}
