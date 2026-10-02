// 파일명: RuntimeBootstrap.cs
using UnityEngine;

namespace JaewoonGames.Generated
{
    public sealed class RuntimeBootstrap : MonoBehaviour
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void AutoStart()
        {
            var go = new GameObject("RuntimeBootstrap");

            go.AddComponent<RuntimeBootstrap>();
        }


        {
            Debug.Log("JAEWOON_UNITY_WEB_QA BOOT game=seed-action-survival-rogu-echoes-of-the-lost-star status=BOOTSTRAP_STUB");
        }
    }
}
