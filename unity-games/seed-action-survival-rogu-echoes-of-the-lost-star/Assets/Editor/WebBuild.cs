// 파일명: WebBuild.cs
using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace JaewoonGames.UnityWeb.Editor
{
    public static class WebBuild
    {
        private const string ScenePath = "Assets/Scenes/Main.unity";

        public static void BuildWeb()
        {
            if (!AssetDatabase.IsValidFolder("Assets/Scenes"))
                AssetDatabase.CreateFolder("Assets", "Scenes");

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            if (!EditorSceneManager.SaveScene(scene, ScenePath))
                throw new InvalidOperationException("UNITY_WEB_SCENE_SAVE_FAILED");

            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            if (!EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.WebGL, BuildTarget.WebGL))
                throw new InvalidOperationException("UNITY_WEB_TARGET_SWITCH_FAILED");

            PlayerSettings.companyName = "Jaewoon Games";
            PlayerSettings.productName = "seed-action-survival-rogu-echoes-of-the-lost-star";

            var repoRoot = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", ".."));
            var output = Path.Combine(repoRoot, "build", "WebGL", "seed-action-survival-rogu-echoes-of-the-lost-star");
            Directory.CreateDirectory(output);

            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = output,
                target = BuildTarget.WebGL,
                options = BuildOptions.Development
            });
            if (report.summary.result != BuildResult.Succeeded)
                throw new InvalidOperationException("UNITY_WEB_BUILD_FAILED:" + report.summary.result);
            var index = Path.Combine(output, "index.html");
            if (!File.Exists(index) || new FileInfo(index).Length <= 0)
                throw new InvalidOperationException("UNITY_WEB_INDEX_MISSING");
        }
    }
}
