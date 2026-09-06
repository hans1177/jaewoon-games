// 파일명: Assets/Scripts/Survival2Bootstrap.cs
// 메인: 유니티 생존2 런타임 시작 / 플레이어 / 여성 동료 / 날짜 진행
using System.Collections.Generic;
using UnityEngine;

public class Survival2Bootstrap : MonoBehaviour
{
    [System.Serializable]
    private struct CompanionDefinition
    {
        public string Name;
        public int UnlockDay;
        public Vector3 SpawnOffset;

        public CompanionDefinition(string name, int unlockDay, Vector3 spawnOffset)
        {
            Name = name;
            UnlockDay = unlockDay;
            SpawnOffset = spawnOffset;
        }
    }

    private static readonly CompanionDefinition[] Companions =
    {
        new CompanionDefinition("유나", 2, new Vector3(1.8f, 0f, 0f)),
        new CompanionDefinition("세라", 3, new Vector3(-1.8f, 0f, 0f)),
        new CompanionDefinition("미라", 4, new Vector3(0f, 1.8f, 0f)),
        new CompanionDefinition("리아", 5, new Vector3(0f, -1.8f, 0f))
    };

    private void Start()
    {
        if (DaySaveSystem.Instance == null)
            gameObject.AddComponent<DaySaveSystem>();

        CreateCamera();
        CreatePlayer();
        CreateCompanions();
        CreateWorldMarker();
    }

    private void CreateCamera()
    {
        Camera existing = Camera.main;
        if (existing == null)
        {
            GameObject cameraObject = new GameObject("Main Camera");
            existing = cameraObject.AddComponent<Camera>();
            cameraObject.tag = "MainCamera";
        }

        existing.orthographic = true;
        existing.orthographicSize = 6.5f;
        existing.transform.position = new Vector3(0f, 0f, -10f);
        existing.transform.rotation = Quaternion.identity;
    }

    private void CreatePlayer()
    {
        GameObject player = CreateActor("Player", Vector3.zero);
        IsometricCharacterAnimator animator = player.GetComponent<IsometricCharacterAnimator>();
        animator.PlayerControlled = true;
        animator.MoveSpeed = 3f;
        player.tag = "Player";
    }

    private void CreateCompanions()
    {
        int day = DaySaveSystem.Instance != null ? DaySaveSystem.Instance.State.day : 1;
        foreach (CompanionDefinition definition in Companions)
        {
            if (day < definition.UnlockDay) continue;

            GameObject companion = CreateActor(definition.Name, definition.SpawnOffset);
            CompanionAI ai = companion.AddComponent<CompanionAI>();
            ai.Player = GameObject.FindGameObjectWithTag("Player")?.transform;
            ai.FollowDistance = 1.5f;
            ai.FollowSpeed = 3.2f;
            ai.AttackRange = 2.5f;
            ai.AttackInterval = 1.2f;
        }
    }

    private static GameObject CreateActor(string objectName, Vector3 position)
    {
        GameObject actor = new GameObject(objectName);
        actor.transform.position = position;
        SpriteRenderer renderer = actor.AddComponent<SpriteRenderer>();
        renderer.sortingLayerName = "Default";
        renderer.sortingOrder = 10;
        IsometricCharacterAnimator animator = actor.AddComponent<IsometricCharacterAnimator>();
        animator.MoveDeadzone = 0.05f;
        return actor;
    }

    private static void CreateWorldMarker()
    {
        GameObject marker = new GameObject("Camp");
        marker.transform.position = new Vector3(0f, -1.2f, 1f);

        SpriteRenderer renderer = marker.AddComponent<SpriteRenderer>();
        Texture2D texture = new Texture2D(1, 1, TextureFormat.RGBA32, false);
        texture.SetPixel(0, 0, new Color(0.08f, 0.25f, 0.15f, 1f));
        texture.Apply();
        renderer.sprite = Sprite.Create(texture, new Rect(0, 0, 1, 1), new Vector2(0.5f, 0.5f), 1f);
        renderer.transform.localScale = new Vector3(12f, 8f, 1f);
        renderer.sortingOrder = -10;
    }
}
