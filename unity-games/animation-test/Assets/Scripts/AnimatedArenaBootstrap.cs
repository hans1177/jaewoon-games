// 파일명: AnimatedArenaBootstrap.cs
// 역할: 검증된 Pirate/Skeleton 스프라이트시트를 런타임 로드해 간단한 모바일 전투를 구성

using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;

public sealed class AnimatedArenaBootstrap : MonoBehaviour
{
    private const string SourceRoot = "https://raw.githubusercontent.com/chongdashu/ai-pixel-snapped-game-sprites/main/spritesheets";
    private static readonly string[] Actions = { "idle", "walk", "attack", "hurt", "death" };

    private Actor player;
    private Actor enemy;
    private int playerHp = 100;
    private int enemyHp = 120;
    private bool ready;
    private bool roundEnded;
    private string resultText = string.Empty;
    private string loadError = string.Empty;
    private float nextPlayerAttack;
    private float nextEnemyAttack;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void CreateRuntime()
    {
        if (FindFirstObjectByType<AnimatedArenaBootstrap>() != null) return;
        new GameObject("AnimationTest").AddComponent<AnimatedArenaBootstrap>();
    }

    private void Awake()
    {
        Application.targetFrameRate = 60;
        SetupCamera();

        player = new Actor("Pirate", new Vector3(-3.2f, -2f, 0f), true);
        enemy = new Actor("Skeleton", new Vector3(3.2f, -2f, 0f), false);

        StartCoroutine(LoadActor(player, "pirate"));
        StartCoroutine(LoadActor(enemy, "skeleton"));
    }

    private void Update()
    {
        player?.Tick(Time.time);
        enemy?.Tick(Time.time);

        if (!ready || roundEnded) return;

        float distance = Mathf.Abs(enemy.Position.x - player.Position.x);
        bool moveHeld = (Input.GetMouseButton(0) && Input.mousePosition.x < Screen.width * 0.5f) || Input.GetKey(KeyCode.D);
        bool attackPressed = (Input.GetMouseButtonDown(0) && Input.mousePosition.x >= Screen.width * 0.5f) || Input.GetKeyDown(KeyCode.Space);

        if (!player.IsBusy)
        {
            if (moveHeld && distance > 1.45f)
            {
                player.Position += Vector3.right * 2.2f * Time.deltaTime;
                player.Play("walk", true);
            }
            else
            {
                player.Play("idle", true);
            }
        }

        if (attackPressed && Time.time >= nextPlayerAttack)
        {
            nextPlayerAttack = Time.time + 0.65f;
            player.Play("attack", false, true);
            if (distance <= 1.9f) StartCoroutine(DelayedDamage(true, 0.28f, 20));
        }

        if (enemy.Dead) return;

        distance = Mathf.Abs(enemy.Position.x - player.Position.x);
        if (!enemy.IsBusy && distance > 1.45f)
        {
            enemy.Position += Vector3.left * 1.35f * Time.deltaTime;
            enemy.Play("walk", true);
        }
        else if (!enemy.IsBusy && distance <= 1.45f && Time.time >= nextEnemyAttack)
        {
            nextEnemyAttack = Time.time + 1.05f;
            enemy.Play("attack", false, true);
            StartCoroutine(DelayedDamage(false, 0.32f, 12));
        }
        else if (!enemy.IsBusy)
        {
            enemy.Play("idle", true);
        }

        if (Input.GetKeyDown(KeyCode.R)) ResetRound();
    }

    private IEnumerator DelayedDamage(bool targetEnemy, float delay, int damage)
    {
        yield return new WaitForSeconds(delay);
        if (roundEnded) yield break;

        if (targetEnemy)
        {
            enemyHp = Mathf.Max(0, enemyHp - damage);
            if (enemyHp <= 0)
            {
                enemy.Play("death", false, true);
                enemy.Dead = true;
                EndRound("YOU WIN");
            }
            else
            {
                enemy.Play("hurt", false, true);
            }
        }
        else
        {
            playerHp = Mathf.Max(0, playerHp - damage);
            if (playerHp <= 0)
            {
                player.Play("death", false, true);
                player.Dead = true;
                EndRound("YOU LOSE");
            }
            else
            {
                player.Play("hurt", false, true);
            }
        }
    }

    private void EndRound(string text)
    {
        roundEnded = true;
        resultText = text;
    }

    private void ResetRound()
    {
        playerHp = 100;
        enemyHp = 120;
        resultText = string.Empty;
        roundEnded = false;
        nextPlayerAttack = 0f;
        nextEnemyAttack = 0f;

        player.Dead = false;
        enemy.Dead = false;
        player.Position = new Vector3(-3.2f, -2f, 0f);
        enemy.Position = new Vector3(3.2f, -2f, 0f);
        player.Play("idle", true, true);
        enemy.Play("idle", true, true);
    }

    private IEnumerator LoadActor(Actor actor, string actorId)
    {
        foreach (string action in Actions)
        {
            yield return LoadClip(actor, actorId, action);
            if (!string.IsNullOrEmpty(loadError)) yield break;
        }

        actor.Loaded = true;
        actor.Play("idle", true, true);

        if (player.Loaded && enemy.Loaded)
        {
            ready = true;
        }
    }

    private IEnumerator LoadClip(Actor actor, string actorId, string action)
    {
        string baseUrl = $"{SourceRoot}/{actorId}/{action}";
        RemoteManifest manifest;

        using (UnityWebRequest manifestRequest = UnityWebRequest.Get(baseUrl + "/manifest.json"))
        {
            yield return manifestRequest.SendWebRequest();
            if (manifestRequest.result != UnityWebRequest.Result.Success)
            {
                loadError = $"manifest load failed: {actorId}/{action}";
                yield break;
            }

            manifest = JsonUtility.FromJson<RemoteManifest>(manifestRequest.downloadHandler.text);
        }

        using (UnityWebRequest textureRequest = UnityWebRequestTexture.GetTexture(baseUrl + "/spritesheet.png"))
        {
            yield return textureRequest.SendWebRequest();
            if (textureRequest.result != UnityWebRequest.Result.Success)
            {
                loadError = $"spritesheet load failed: {actorId}/{action}";
                yield break;
            }

            Texture2D texture = DownloadHandlerTexture.GetContent(textureRequest);
            texture.filterMode = FilterMode.Point;
            texture.wrapMode = TextureWrapMode.Clamp;

            Sprite[] frames = new Sprite[manifest.frames];
            for (int i = 0; i < manifest.frames; i++)
            {
                int column = i % manifest.columns;
                int row = i / manifest.columns;
                float x = column * manifest.frameWidth;
                float y = texture.height - ((row + 1) * manifest.frameHeight);
                Rect rect = new Rect(x, y, manifest.frameWidth, manifest.frameHeight);
                frames[i] = Sprite.Create(texture, rect, new Vector2(0.5f, 0.05f), 128f);
            }

            actor.AddClip(action, frames, Mathf.Max(1, manifest.fps));
        }
    }

    private void SetupCamera()
    {
        Camera camera = Camera.main;
        if (camera == null)
        {
            GameObject cameraObject = new GameObject("Main Camera");
            cameraObject.tag = "MainCamera";
            camera = cameraObject.AddComponent<Camera>();
        }

        camera.orthographic = true;
        camera.orthographicSize = 5.2f;
        camera.transform.position = new Vector3(0f, 0f, -10f);
        camera.backgroundColor = new Color(0.08f, 0.11f, 0.16f);
    }

    private void OnGUI()
    {
        int width = Screen.width;
        int height = Screen.height;
        GUI.skin.label.fontSize = Mathf.Max(18, width / 28);
        GUI.skin.button.fontSize = Mathf.Max(18, width / 30);

        DrawHealth(new Rect(24, 24, width * 0.36f, 34), playerHp, 100, "PIRATE");
        DrawHealth(new Rect(width * 0.64f - 24, 24, width * 0.36f, 34), enemyHp, 120, "SKELETON");

        if (!string.IsNullOrEmpty(loadError))
        {
            GUI.Label(new Rect(24, 80, width - 48, 80), loadError);
            return;
        }

        if (!ready)
        {
            GUI.Label(new Rect(24, 80, width - 48, 60), "LOADING ANIMATED SPRITES...");
            return;
        }

        GUI.Box(new Rect(0, height - 110, width * 0.5f, 110), "HOLD LEFT = MOVE");
        GUI.Box(new Rect(width * 0.5f, height - 110, width * 0.5f, 110), "TAP RIGHT = ATTACK");

        if (roundEnded)
        {
            GUI.Label(new Rect(width * 0.35f, height * 0.32f, width * 0.3f, 60), resultText);
            if (GUI.Button(new Rect(width * 0.35f, height * 0.45f, width * 0.3f, 70), "RESTART"))
            {
                ResetRound();
            }
        }
    }

    private static void DrawHealth(Rect rect, int value, int max, string label)
    {
        GUI.Box(rect, string.Empty);
        Rect fill = new Rect(rect.x + 3, rect.y + 3, (rect.width - 6) * Mathf.Clamp01(value / (float)max), rect.height - 6);
        GUI.Box(fill, string.Empty);
        GUI.Label(new Rect(rect.x, rect.y + rect.height + 2, rect.width, 28), $"{label} {value}/{max}");
    }

    [Serializable]
    private sealed class RemoteManifest
    {
        public int frameWidth;
        public int frameHeight;
        public int frames;
        public int columns;
        public int fps;
    }

    private sealed class Actor
    {
        private sealed class Clip
        {
            public Sprite[] Frames;
            public float Fps;
            public float Duration => Frames == null || Frames.Length == 0 ? 0f : Frames.Length / Mathf.Max(1f, Fps);
        }

        private readonly Dictionary<string, Clip> clips = new Dictionary<string, Clip>(StringComparer.OrdinalIgnoreCase);
        private readonly GameObject root;
        private readonly SpriteRenderer renderer;
        private string currentAction = string.Empty;
        private bool loop = true;
        private float actionStarted;

        public Actor(string name, Vector3 position, bool faceRight)
        {
            root = new GameObject(name);
            root.transform.position = position;
            root.transform.localScale = Vector3.one * 1.25f;
            renderer = root.AddComponent<SpriteRenderer>();
            renderer.flipX = faceRight;
            renderer.sortingOrder = 10;
        }

        public bool Loaded { get; set; }
        public bool Dead { get; set; }
        public Vector3 Position
        {
            get => root.transform.position;
            set => root.transform.position = value;
        }

        public bool IsBusy
        {
            get
            {
                if (Dead) return true;
                if (!clips.TryGetValue(currentAction, out Clip clip)) return false;
                return !loop && Time.time - actionStarted < clip.Duration;
            }
        }

        public void AddClip(string action, Sprite[] frames, int fps)
        {
            clips[action] = new Clip { Frames = frames, Fps = fps };
        }

        public void Play(string action, bool shouldLoop, bool force = false)
        {
            if (Dead && !string.Equals(action, "death", StringComparison.OrdinalIgnoreCase)) return;
            if (!clips.ContainsKey(action)) return;
            if (!force && string.Equals(currentAction, action, StringComparison.OrdinalIgnoreCase) && loop == shouldLoop) return;
            if (!force && IsBusy) return;

            currentAction = action;
            loop = shouldLoop;
            actionStarted = Time.time;
        }

        public void Tick(float now)
        {
            if (!clips.TryGetValue(currentAction, out Clip clip) || clip.Frames.Length == 0) return;

            float elapsed = Mathf.Max(0f, now - actionStarted);
            int frameIndex;

            if (loop)
            {
                frameIndex = Mathf.FloorToInt(elapsed * clip.Fps) % clip.Frames.Length;
            }
            else
            {
                frameIndex = Mathf.Min(clip.Frames.Length - 1, Mathf.FloorToInt(elapsed * clip.Fps));
                if (!Dead && elapsed >= clip.Duration && !string.Equals(currentAction, "idle", StringComparison.OrdinalIgnoreCase))
                {
                    Play("idle", true, true);
                    return;
                }
            }

            renderer.sprite = clip.Frames[frameIndex];
        }
    }
}
