// 파일명: RuntimeBootstrap.cs
using UnityEngine;

namespace JaewoonGames.Generated
{
    public sealed class RuntimeBootstrap : MonoBehaviour
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void AutoStart()
        {
public sealed class RuntimeBootstrap : MonoBehaviour
{
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void AutoStart()
    {
        var go = new GameObject("RuntimeBootstrap");
        DontDestroyOnLoad(go);
        go.AddComponent<RuntimeBootstrap>();
    }

    private void Start()
    {
        Debug.Log("JAEWOON_UNITY_WEB_QA_BOOT game=cozy-island status=BOOTSTRAP_STUB");
    }
}
            DontDestroyOnLoad(go);
            go.AddComponent<RuntimeBootstrap>();
        }

        private void Start()
        {
            Debug.Log("JAEWOON_UNITY_WEB_QA BOOT game=cozy-island status=BOOTSTRAP_STUB");
        }
    }
}
