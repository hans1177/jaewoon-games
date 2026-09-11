// 파일명: AndroidTestBuild.cs
// 역할: GitHub-hosted GameCI가 대충 RPG Android 테스트 APK를 재현 가능하게 빌드한다.
using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace JaewoonGames.DaechungRpg.Editor
{
    public static class AndroidTestBuild
    {
        private const string SceneFolder = "Assets/Scenes";
        private const string ScenePath = "Assets/Scenes/Main.unity";
        private const string ApplicationId = "com.jaewoon.games.daechungrpg";

        public static void Build()
        {
            EnsureTestScene();

            if (!EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.Android, BuildTarget.Android))
            {
                throw BuildError("ANDROID_TARGET_SWITCH_FAILED", "Failed to switch active build target to Android.");
            }

            EditorUserBuildSettings.buildAppBundle = false;
            PlayerSettings.companyName = "Jaewoon Games";
            PlayerSettings.productName = "Daechung RPG Test";
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, ApplicationId);
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel26;
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            PlayerSettings.Android.forceInternetPermission = true;

            var runNumber = ResolveRunNumber();
            PlayerSettings.Android.bundleVersionCode = 20000 + runNumber;
            PlayerSettings.bundleVersion = $"0.2.{runNumber}";

            var repoRoot = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", ".."));
            var outputDirectory = Path.Combine(repoRoot, "build", "Android");
            Directory.CreateDirectory(outputDirectory);
            var outputPath = Path.Combine(outputDirectory, "daechung-rpg.apk");

            var options = new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = outputPath,
                target = BuildTarget.Android,
                options = BuildOptions.Development
            };

            Debug.Log($"[JAEWOON BUILD] package={ApplicationId} version={PlayerSettings.bundleVersion} versionCode={PlayerSettings.Android.bundleVersionCode} architectures={PlayerSettings.Android.targetArchitectures}");
            Debug.Log($"[JAEWOON BUILD] Building Android APK: {outputPath}");
            var report = BuildPipeline.BuildPlayer(options);
            var summary = report.summary;
            Debug.Log($"[JAEWOON BUILD] result={summary.result} size={summary.totalSize} warnings={summary.totalWarnings} errors={summary.totalErrors}");

            if (summary.result != BuildResult.Succeeded)
            {
                throw BuildError("APK_BUILD_FAILED", $"Unity BuildPipeline returned {summary.result}; errors={summary.totalErrors}, warnings={summary.totalWarnings}.");
            }
            if (!File.Exists(outputPath))
            {
                throw BuildError("APK_OUTPUT_MISSING", $"Build reported success but APK is missing: {outputPath}");
            }
            if (new FileInfo(outputPath).Length <= 0)
            {
                throw BuildError("APK_OUTPUT_EMPTY", $"Build reported success but APK is empty: {outputPath}");
            }
        }

        private static int ResolveRunNumber()
        {
            var raw = Environment.GetEnvironmentVariable("GITHUB_RUN_NUMBER");
            if (!int.TryParse(raw, out var runNumber) || runNumber < 1)
            {
                return 1;
            }
            return Math.Min(runNumber, int.MaxValue - 20000);
        }

        private static InvalidOperationException BuildError(string code, string message)
        {
            return new InvalidOperationException($"[JAEWOON_BUILD_ERROR:{code}] {message}");
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
                throw BuildError("SCENE_SAVE_FAILED", $"Could not save generated test scene: {ScenePath}");
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
