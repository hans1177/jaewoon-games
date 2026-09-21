using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace Jaewoon.DaechungRpg.Editor
{
    public static class WebBuild
    {
        private const string OutputDir = "Builds/Web";

        [MenuItem("Jaewoon Games/대충 RPG/Build Web")]
        public static void BuildWeb()
        {
            var scenes = EditorBuildSettings.scenes
                .Where(s => s.enabled)
                .Select(s => s.path)
                .ToArray();

            if (scenes.Length == 0)
                throw new Exception("No enabled scenes in EditorBuildSettings.");

            Directory.CreateDirectory(OutputDir);

            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
            PlayerSettings.WebGL.decompressionFallback = true;
            PlayerSettings.WebGL.initialMemorySize = 256;
            PlayerSettings.WebGL.maximumMemorySize = 2048;
            PlayerSettings.WebGL.memoryGrowthMode = WebGLMemoryGrowthMode.Geometric;
            PlayerSettings.runInBackground = true;

            var options = new BuildPlayerOptions
            {
                scenes = scenes,
                locationPathName = OutputDir,
                target = BuildTarget.WebGL,
                options = BuildOptions.CleanBuildCache
            };

            var report = BuildPipeline.BuildPlayer(options);
            if (report.summary.result != BuildResult.Succeeded)
                throw new Exception($"Unity Web build failed: {report.summary.result}");

            Debug.Log($"UNITY_WEB_BUILD_OK size={report.summary.totalSize} path={Path.GetFullPath(OutputDir)}");
        }
    }
}
