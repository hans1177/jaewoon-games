// 파일명: PrototypeAnimatedVisuals.cs
// 역할: 대충 RPG 초안에 검증된 무료 Pirate/Skeleton 애니메이션 스프라이트를 실제 적용한다.
// 출처: https://github.com/chongdashu/ai-pixel-snapped-game-sprites (MIT)

using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.Networking;

namespace JaewoonGames.DaechungRpg
{
    public sealed class PrototypeAnimatedVisuals : MonoBehaviour
    {
        private const string SourceRoot = "https://raw.githubusercontent.com/chongdashu/ai-pixel-snapped-game-sprites/main/spritesheets";
        private const int RequestTimeoutSeconds = 12;
        private static readonly string[] Actions = { "idle", "walk", "attack", "hurt", "death" };

        public static PrototypeAnimatedVisuals Instance { get; private set; }
        public bool Ready => _ready;
        public string StatusText => !string.IsNullOrEmpty(_loadError) ? $"ERROR · {_loadError}" : (_ready ? "READY · VERIFIED ANIMATED ASSETS" : "LOADING · VERIFIED ANIMATED ASSETS");

        private AnimatedActor _player;
        private AnimatedActor _enemy;
        private bool _ready;
        private bool _battleVisible;
        private string _loadError = string.Empty;
        private Coroutine _combatRoutine;
        private Coroutine _travelRoutine;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        private static void AutoCreate()
        {
            EnsureCreated();
        }

        public static PrototypeAnimatedVisuals EnsureCreated()
        {
            if (Instance != null) return Instance;

            var existing = FindFirstObjectByType<PrototypeAnimatedVisuals>();
            if (existing != null)
            {
                Instance = existing;
                return existing;
            }

            return new GameObject("PrototypeAnimatedVisuals").AddComponent<PrototypeAnimatedVisuals>();
        }

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            DontDestroyOnLoad(gameObject);
            Application.targetFrameRate = 60;

            SetupCamera();
            _player = new AnimatedActor("PrototypePlayer", new Vector3(0f, -1.65f, 0f), true);
            _enemy = new AnimatedActor("PrototypeEnemy", new Vector3(2.85f, -1.65f, 0f), false);
            _enemy.SetVisible(false);

            StartCoroutine(LoadAll());
        }

        private void Update()
        {
            _player?.Tick(Time.time);
            _enemy?.Tick(Time.time);
        }

        public void ShowTown()
        {
            _battleVisible = false;
            if (!_ready) return;

            StopTravelRoutine();
            if (_combatRoutine != null)
            {
                StopCoroutine(_combatRoutine);
                _combatRoutine = null;
            }

            _player.Dead = false;
            _enemy.Dead = false;
            _player.SetVisible(true);
            _enemy.SetVisible(false);
            _player.Position = new Vector3(0f, -1.65f, 0f);
            _player.Play("idle", true, true);
        }

        public void ShowBattle()
        {
            _battleVisible = true;
            if (!_ready) return;

            StopTravelRoutine();
            if (_combatRoutine != null)
            {
                StopCoroutine(_combatRoutine);
                _combatRoutine = null;
            }

            ResetBattleActors();
        }

        public void PlayTravelToBattle()
        {
            _battleVisible = true;
            if (!_ready) return;

            StopTravelRoutine();
            _travelRoutine = StartCoroutine(TravelRoutine());
        }

        public void PlayCombatExchange(bool enemyDefeated, bool playerDefeated)
        {
            if (!_ready || !_battleVisible) return;

            StopTravelRoutine();
            if (_combatRoutine != null) StopCoroutine(_combatRoutine);
            _combatRoutine = StartCoroutine(CombatExchangeRoutine(enemyDefeated, playerDefeated));
        }

        private void StopTravelRoutine()
        {
            if (_travelRoutine == null) return;

            StopCoroutine(_travelRoutine);
            _travelRoutine = null;
        }

        private IEnumerator LoadAll()
        {
            yield return LoadActor(_player, "pirate");
            if (!string.IsNullOrEmpty(_loadError)) yield break;

            yield return LoadActor(_enemy, "skeleton");
            if (!string.IsNullOrEmpty(_loadError)) yield break;

            _ready = true;
            if (_battleVisible) ResetBattleActors();
            else ShowTown();
        }

        private IEnumerator LoadActor(AnimatedActor actor, string actorId)
        {
            foreach (var action in Actions)
            {
                yield return LoadClip(actor, actorId, action);
                if (!string.IsNullOrEmpty(_loadError)) yield break;
            }

            actor.Loaded = true;
            actor.Play("idle", true, true);
        }

        private IEnumerator LoadClip(AnimatedActor actor, string actorId, string action)
        {
            var baseUrl = $"{SourceRoot}/{actorId}/{action}";
            var cacheDirectory = Path.Combine(Application.persistentDataPath, "prototype-asset-cache", "ai-pixel-snapped", actorId, action);
            var manifestPath = Path.Combine(cacheDirectory, "manifest.json");
            var spritePath = Path.Combine(cacheDirectory, "spritesheet.png");
            Directory.CreateDirectory(cacheDirectory);

            string manifestJson = null;
            if (File.Exists(manifestPath))
            {
                try { manifestJson = File.ReadAllText(manifestPath); }
                catch { manifestJson = null; }
            }

            if (string.IsNullOrEmpty(manifestJson))
            {
                using (var request = UnityWebRequest.Get(baseUrl + "/manifest.json"))
                {
                    request.timeout = RequestTimeoutSeconds;
                    yield return request.SendWebRequest();
                    if (request.result != UnityWebRequest.Result.Success)
                    {
                        _loadError = $"manifest {actorId}/{action}";
                        yield break;
                    }

                    manifestJson = request.downloadHandler.text;
                    try { File.WriteAllText(manifestPath, manifestJson); } catch { }
                }
            }

            RemoteManifest manifest;
            try
            {
                manifest = JsonUtility.FromJson<RemoteManifest>(manifestJson);
            }
            catch
            {
                try { File.Delete(manifestPath); } catch { }
                _loadError = $"manifest parse {actorId}/{action}";
                yield break;
            }

            if (manifest == null)
            {
                try { File.Delete(manifestPath); } catch { }
                _loadError = $"manifest parse {actorId}/{action}";
                yield break;
            }

            byte[] textureBytes = null;
            if (File.Exists(spritePath))
            {
                try { textureBytes = File.ReadAllBytes(spritePath); }
                catch { textureBytes = null; }
            }

            if (textureBytes == null || textureBytes.Length == 0)
            {
                using (var request = UnityWebRequest.Get(baseUrl + "/spritesheet.png"))
                {
                    request.timeout = RequestTimeoutSeconds;
                    yield return request.SendWebRequest();
                    if (request.result != UnityWebRequest.Result.Success)
                    {
                        _loadError = $"spritesheet {actorId}/{action}";
                        yield break;
                    }

                    textureBytes = request.downloadHandler.data;
                    try { File.WriteAllBytes(spritePath, textureBytes); } catch { }
                }
            }

            var texture = new Texture2D(2, 2, TextureFormat.RGBA32, false);
            if (!texture.LoadImage(textureBytes, false))
            {
                Destroy(texture);
                try { File.Delete(spritePath); } catch { }
                _loadError = $"texture decode {actorId}/{action}";
                yield break;
            }

            texture.name = $"{actorId}-{action}";
            texture.filterMode = FilterMode.Point;
            texture.wrapMode = TextureWrapMode.Clamp;

            if (manifest.frames <= 0 || manifest.columns <= 0 || manifest.frameWidth <= 0 || manifest.frameHeight <= 0 || manifest.fps <= 0)
            {
                Destroy(texture);
                try { File.Delete(manifestPath); } catch { }
                _loadError = $"manifest values {actorId}/{action}";
                yield break;
            }

            var frameCount = manifest.frames;
            var columns = manifest.columns;
            var frameWidth = manifest.frameWidth;
            var frameHeight = manifest.frameHeight;
            var rows = ((long)frameCount + columns - 1L) / columns;
            var requiredWidth = (long)Mathf.Min(frameCount, columns) * frameWidth;
            var requiredHeight = rows * frameHeight;
            if (requiredWidth > texture.width || requiredHeight > texture.height)
            {
                Destroy(texture);
                try { File.Delete(manifestPath); } catch { }
                try { File.Delete(spritePath); } catch { }
                _loadError = $"asset bounds {actorId}/{action}";
                yield break;
            }

            var frames = new Sprite[frameCount];

            for (var i = 0; i < frameCount; i++)
            {
                var column = i % columns;
                var row = i / columns;
                var x = column * frameWidth;
                var y = texture.height - ((row + 1) * frameHeight);
                var rect = new Rect(x, y, frameWidth, frameHeight);
                frames[i] = Sprite.Create(texture, rect, new Vector2(0.5f, 0.06f), 128f);
                frames[i].name = $"{actorId}-{action}-{i:00}";
            }

            actor.AddClip(action, frames, manifest.fps);
        }

        private IEnumerator TravelRoutine()
        {
            _player.SetVisible(true);
            _enemy.SetVisible(true);
            _player.Dead = false;
            _enemy.Dead = false;
            _player.Position = new Vector3(-3.4f, -1.65f, 0f);
            _enemy.Position = new Vector3(2.85f, -1.65f, 0f);
            _player.Play("walk", true, true);
            _enemy.Play("idle", true, true);

            var until = Time.time + 0.65f;
            while (Time.time < until)
            {
                _player.Position += Vector3.right * 1.55f * Time.deltaTime;
                yield return null;
            }

            _player.Play("idle", true, true);
            _travelRoutine = null;
        }

        private IEnumerator CombatExchangeRoutine(bool enemyDefeated, bool playerDefeated)
        {
            _player.Play("attack", false, true);
            yield return new WaitForSeconds(0.25f);

            if (enemyDefeated)
            {
                _enemy.Play("death", false, true);
                _enemy.Dead = true;
                yield return new WaitForSeconds(0.95f);
                if (_battleVisible) ResetBattleActors();
                _combatRoutine = null;
                yield break;
            }

            _enemy.Play("hurt", false, true);
            yield return new WaitForSeconds(0.35f);
            _enemy.Play("attack", false, true);
            yield return new WaitForSeconds(0.28f);

            if (playerDefeated)
            {
                _player.Play("death", false, true);
                _player.Dead = true;
                yield return new WaitForSeconds(0.95f);
                ShowTown();
            }
            else
            {
                _player.Play("hurt", false, true);
            }

            _combatRoutine = null;
        }

        private void ResetBattleActors()
        {
            _player.Dead = false;
            _enemy.Dead = false;
            _player.SetVisible(true);
            _enemy.SetVisible(true);
            _player.Position = new Vector3(-2.65f, -1.65f, 0f);
            _enemy.Position = new Vector3(2.65f, -1.65f, 0f);
            _player.Play("idle", true, true);
            _enemy.Play("idle", true, true);
        }

        private static void SetupCamera()
        {
            var camera = Camera.main;
            if (camera == null)
            {
                var cameraObject = new GameObject("Main Camera");
                cameraObject.tag = "MainCamera";
                camera = cameraObject.AddComponent<Camera>();
            }

            camera.orthographic = true;
            camera.orthographicSize = 5.15f;
            camera.transform.position = new Vector3(0f, 0f, -10f);
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.055f, 0.075f, 0.105f, 1f);
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

        private sealed class AnimatedActor
        {
            private sealed class Clip
            {
                public Sprite[] Frames;
                public float Fps;
                public float Duration => Frames == null || Frames.Length == 0 ? 0f : Frames.Length / Mathf.Max(1f, Fps);
            }

            private readonly Dictionary<string, Clip> _clips = new Dictionary<string, Clip>(StringComparer.OrdinalIgnoreCase);
            private readonly GameObject _root;
            private readonly SpriteRenderer _renderer;
            private string _currentAction = string.Empty;
            private bool _loop = true;
            private float _actionStarted;

            public AnimatedActor(string name, Vector3 position, bool faceRight)
            {
                _root = new GameObject(name);
                _root.transform.position = position;
                _root.transform.localScale = Vector3.one * 1.4f;
                _renderer = _root.AddComponent<SpriteRenderer>();
                _renderer.flipX = faceRight;
                _renderer.sortingOrder = 10;
            }

            public bool Loaded { get; set; }
            public bool Dead { get; set; }

            public Vector3 Position
            {
                get => _root.transform.position;
                set => _root.transform.position = value;
            }

            public void SetVisible(bool visible)
            {
                _renderer.enabled = visible;
            }

            public void AddClip(string action, Sprite[] frames, int fps)
            {
                _clips[action] = new Clip { Frames = frames, Fps = fps };
            }

            public void Play(string action, bool shouldLoop, bool force = false)
            {
                if (Dead && !string.Equals(action, "death", StringComparison.OrdinalIgnoreCase)) return;
                if (!_clips.ContainsKey(action)) return;
                if (!force && string.Equals(_currentAction, action, StringComparison.OrdinalIgnoreCase) && _loop == shouldLoop) return;

                _currentAction = action;
                _loop = shouldLoop;
                _actionStarted = Time.time;
            }

            public void Tick(float now)
            {
                if (!_clips.TryGetValue(_currentAction, out var clip) || clip.Frames == null || clip.Frames.Length == 0) return;

                var elapsed = Mathf.Max(0f, now - _actionStarted);
                int frameIndex;
                if (_loop)
                {
                    frameIndex = Mathf.FloorToInt(elapsed * clip.Fps) % clip.Frames.Length;
                }
                else
                {
                    frameIndex = Mathf.Min(clip.Frames.Length - 1, Mathf.FloorToInt(elapsed * clip.Fps));
                    if (!Dead && elapsed >= clip.Duration && !string.Equals(_currentAction, "idle", StringComparison.OrdinalIgnoreCase))
                    {
                        Play("idle", true, true);
                        return;
                    }
                }

                _renderer.sprite = clip.Frames[frameIndex];
            }
        }
    }
}
