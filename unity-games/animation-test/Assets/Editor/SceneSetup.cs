// 파일명: SceneSetup.cs
// 역할: 테스트 프로젝트 최초 실행 시 Main 씬 생성 및 Build Settings 등록

#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine.SceneManagement;

[InitializeOnLoad]
public static class SceneSetup
{
    private const string SceneFolder = "Assets/Scenes";
    private const string ScenePath = "Assets/Scenes/Main.unity";

    static SceneSetup()
    {
        EditorApplication.delayCall += EnsureScene;
    }

    private static void EnsureScene()
    {
        if (EditorApplication.isPlayingOrWillChangePlaymode) return;

        if (!AssetDatabase.IsValidFolder(SceneFolder))
        {
            AssetDatabase.CreateFolder("Assets", "Scenes");
        }

        SceneAsset mainScene = AssetDatabase.LoadAssetAtPath<SceneAsset>(ScenePath);
        if (mainScene == null)
        {
            Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            EditorSceneManager.SaveScene(scene, ScenePath);
            AssetDatabase.Refresh();
        }

        EditorBuildSettings.scenes = new[]
        {
            new EditorBuildSettingsScene(ScenePath, true)
        };

        Scene activeScene = SceneManager.GetActiveScene();
        if (activeScene.path != ScenePath && !EditorApplication.isPlaying)
        {
            EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
        }
    }
}
#endif
