// 파일명: GameCore.cs
using UnityEngine;

namespace JaewoonGames.Generated
{
    public sealed class GameCore : MonoBehaviour
{
    // Vibe가 승인 설계의 실제 상태/규칙/세이브 책임으로 교체한다.
    [SerializeField]
    private static readonly string[] _approvedState = { "cozy-island-build-up-g1-a0b017c8d73d" };

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void AutoStart()
    {
        var go = new GameObject("GameCore");
        DontDestroyOnLoad(go);
        go.AddComponent<GameCore>();
    }

    private void Start()
    {
        Debug.Log("JAEWOON_UNITY_WEB_QA_BOOT game=cozy-island status=BOOTSTRAP_STUB");
    }
}
    {
        // Vibe가 승인 설계의 실제 상태/규칙/세이브 책임으로 교체한다.
    }
}
