// 파일명: DungeonBuild.cs
// 역할: 던전 회사 Unity Web / Android 재현 빌드
using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;

namespace JaewoonGames.DungeonCompany.Editor
{
    public static class DungeonBuild
    {
        private const string SceneFolder = "Assets/Scenes";
        private const string ScenePath = "Assets/Scenes/Main.unity";
        private const string ApplicationId = "com.jaewoon.games.dungeoncompany";

        public static void BuildWeb()
        {
            EnsureScene();
            if (!EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.WebGL, BuildTarget.WebGL))
                throw Error("WEBGL_TARGET_SWITCH_FAILED", "Could not switch to WebGL.");

            PlayerSettings.companyName = "Jaewoon Games";
            PlayerSettings.productName = "Dungeon Company";

            var output = Output("WebGL", "dungeon-company");
            Build(new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = output,
                target = BuildTarget.WebGL,
                options = BuildOptions.None
            }, "WEBGL_BUILD_FAILED");

            var index = Path.Combine(output, "index.html");
            if (!File.Exists(index) || new FileInfo(index).Length <= 0)
                throw Error("WEBGL_OUTPUT_MISSING", $"Missing WebGL index: {index}");
        }

        public static void BuildAndroid()
        {
            EnsureScene();
            if (!EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.Android, BuildTarget.Android))
                throw Error("ANDROID_TARGET_SWITCH_FAILED", "Could not switch to Android.");

            PlayerSettings.companyName = "Jaewoon Games";
            PlayerSettings.productName = "Dungeon Company";
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, ApplicationId);
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel26;
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            EditorUserBuildSettings.buildAppBundle = false;

            var output = Path.Combine(Output("Android", string.Empty), "dungeon-company.apk");
            Build(new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = output,
                target = BuildTarget.Android,
                options = BuildOptions.Development
            }, "APK_BUILD_FAILED");
        }

        private static void Build(BuildPlayerOptions options, string code)
        {
            var report = BuildPipeline.BuildPlayer(options);
            var s = report.summary;
            if (s.result != BuildResult.Succeeded)
                throw Error(code, $"Build returned {s.result}; errors={s.totalErrors}, warnings={s.totalWarnings}.");
        }

        private static string Output(string platform, string leaf)
        {
            var root = Path.GetFullPath(Path.Combine(UnityEngine.Application.dataPath, "..", "..", ".."));
            var path = Path.Combine(root, "build", platform);
            if (!string.IsNullOrEmpty(leaf)) path = Path.Combine(path, leaf);
            Directory.CreateDirectory(path);
            return path;
        }

        private static void EnsureScene()
        {
            if (!AssetDatabase.IsValidFolder(SceneFolder)) AssetDatabase.CreateFolder("Assets", "Scenes");
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            if (!EditorSceneManager.SaveScene(scene, ScenePath))
                throw Error("SCENE_SAVE_FAILED", $"Could not save scene: {ScenePath}");
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
        }

        private static InvalidOperationException Error(string code, string message)
            => new InvalidOperationException($"[JAEWOON_BUILD_ERROR:{code}] {message}");
    }
}
