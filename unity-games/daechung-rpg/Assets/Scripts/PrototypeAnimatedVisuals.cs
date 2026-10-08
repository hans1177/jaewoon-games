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
        public string StatusText => !_ready ? "LOADING" : (!string.IsNullOrEmpty(_loadError) ? "READY · LOCAL ART / REMOTE UNAVAILABLE" : "READY · ANIMATED ACTORS AND LOCAL ART");

        private AnimatedActor _player;
        private AnimatedActor _enemy;
        private AnimatedActor _coopPartner;
        private bool _hasCoopPartner;
        private bool _ready;
        private bool _battleVisible;
        private string _loadError = string.Empty;
        private Coroutine _combatRoutine;
        private Coroutine _travelRoutine;
        // 그래픽: 원격 에셋을 유지하고 오프라인 전용 아트·사냥터 장면을 제공한다.
        private SpriteRenderer _backdrop;
        private MeshRenderer _depthGround;
        private MeshRenderer _depthPath;
        private Camera _sceneCamera;
        private float _lastCameraAspect = -1f;
        private string _enemyId = "skeleton";
        private readonly Dictionary<string, Sprite> _regions = new Dictionary<string, Sprite>();
        private readonly Dictionary<string, Sprite[]> _actorFrames = new Dictionary<string, Sprite[]>();

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
#if UNITY_WEBGL && !UNITY_EDITOR
            // WebGL 소프트웨어 렌더러와 모바일에서 게임 규칙과 무관한 고비용 품질을 제한한다.
            QualitySettings.SetQualityLevel(0, true);
            QualitySettings.vSyncCount = 0;
#endif

            _sceneCamera = SetupCamera();
            _player = new AnimatedActor("PrototypePlayer", new Vector3(0f, -1.65f, 0f), true);
            _enemy = new AnimatedActor("PrototypeEnemy", new Vector3(2.85f, -1.65f, 0.65f), false);
            _enemy.SetVisible(false);
            _coopPartner = new AnimatedActor("CoopPartner", new Vector3(-0.8f, -1.65f, -0.45f), true);
            _coopPartner.SetVisible(false);
            var backdropObject = new GameObject("DaechungRegionBackground");
            backdropObject.transform.SetParent(transform, false);
            _backdrop = backdropObject.AddComponent<SpriteRenderer>();
            _backdrop.sortingOrder = -30;
            var pixelShader = Shader.Find("Jaewoon/DaechungPixelArt");
            if (pixelShader != null)
            {
                var material = new Material(pixelShader);
                _backdrop.sharedMaterial = material;
                _player.SetMaterial(material);
                _enemy.SetMaterial(material);
                _coopPartner.SetMaterial(material);
            }
            SetRegionVisual("town");
            InstallLocalActor(_player, "hero");
            InstallLocalActor(_enemy, "skeleton");
            InstallLocalActor(_coopPartner, "hero");
            _coopPartner.SetTint(new Color(0.64f, 1.0f, 0.8f, 1f));
            _ready = true;
            ShowTown();
            StartCoroutine(LoadAll());
        }

        private void Update()
        {
            // 모바일 세로 화면에서 플레이어/몬스터가 화면 밖으로 잘리지 않도록 원근 시야만 조절한다.
            if (_sceneCamera != null && Mathf.Abs(_sceneCamera.aspect - _lastCameraAspect) > 0.01f)
            {
                _lastCameraAspect = _sceneCamera.aspect;
                _sceneCamera.fieldOfView = Mathf.Clamp(
                    2f * Mathf.Atan(4f / (13f * Mathf.Max(0.4f, _lastCameraAspect))) * Mathf.Rad2Deg,
                    40f, 72f);
            }
            _player?.Tick(Time.time);
            _enemy?.Tick(Time.time);
            _coopPartner?.Tick(Time.time);
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
            _coopPartner.SetVisible(_hasCoopPartner);
            _coopPartner.Position = new Vector3(-1.9f, -1.65f, -0.45f);
            if (_hasCoopPartner) _coopPartner.Play("idle", true, true);
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


        // 메인: 게임 코어/저장값을 바꾸지 않는 지역별 씬과 몬스터 외형.
        public void SetRegionVisual(string id)
        {
            if (_backdrop == null) return;
            id = string.IsNullOrEmpty(id) ? "town" : id;
            if (!_regions.TryGetValue(id, out var sprite))
            {
                sprite = CreateBackdrop(id);
                _regions[id] = sprite;
            }
            _backdrop.sprite = sprite;
            _backdrop.transform.position = new Vector3(0f, 0f, 8f);
            _backdrop.transform.localScale = Vector3.one * 3.0f;

            // 그래픽: 같은 Unity 카메라에서 원근 투영하는 실제 XZ 지형과 길.
            // 단순 2D 배경 확대가 아니라 지역마다 색이 바뀌는 3D 깊이 기하를 렌더한다.
            // 몬스터 히트박스, 이동·저장·전투 수치와 무관한 시각 레이어다.
            if (_depthGround == null)
            {
                var shader = Shader.Find("Unlit/Color");
                if (shader == null) shader = Shader.Find("Sprites/Default");
                if (shader != null)
                {
                    var groundObject = new GameObject("DaechungDepthGround");
                    groundObject.transform.SetParent(transform, false);
                    var groundMesh = new Mesh { name = "DaechungDepthGroundMesh" };
                    groundMesh.vertices = new[]
                    {
                        new Vector3(-24f, -1.85f, 8f),
                        new Vector3(24f, -1.85f, 8f),
                        new Vector3(-24f, -1.85f, -8f),
                        new Vector3(24f, -1.85f, -8f)
                    };
                    groundMesh.triangles = new[] { 0, 1, 2, 1, 3, 2 };
                    groundMesh.RecalculateNormals();
                    groundObject.AddComponent<MeshFilter>().sharedMesh = groundMesh;
                    _depthGround = groundObject.AddComponent<MeshRenderer>();
                    _depthGround.sharedMaterial = new Material(shader);

                    var pathObject = new GameObject("DaechungDepthPath");
                    pathObject.transform.SetParent(transform, false);
                    var pathMesh = new Mesh { name = "DaechungDepthPathMesh" };
                    pathMesh.vertices = new[]
                    {
                        new Vector3(-1.8f, -1.83f, 8f),
                        new Vector3(1.8f, -1.83f, 8f),
                        new Vector3(-4.4f, -1.83f, -8f),
                        new Vector3(4.4f, -1.83f, -8f)
                    };
                    pathMesh.triangles = new[] { 0, 1, 2, 1, 3, 2 };
                    pathMesh.RecalculateNormals();
                    pathObject.AddComponent<MeshFilter>().sharedMesh = pathMesh;
                    _depthPath = pathObject.AddComponent<MeshRenderer>();
                    _depthPath.sharedMaterial = new Material(shader);
                }
            }

            if (_depthGround != null && _depthPath != null)
            {
                bool snowy = id.Contains("frozen") || id.Contains("mountain") || id.Contains("summit");
                bool gloomy = id.Contains("grave") || id.Contains("cursed") || id.Contains("rift");
                bool tropical = id.Contains("jungle") || id.Contains("amazon");
                _depthGround.sharedMaterial.color = snowy ? new Color(0.66f, 0.76f, 0.84f) :
                    gloomy ? new Color(0.22f, 0.23f, 0.30f) :
                    tropical ? new Color(0.20f, 0.39f, 0.23f) : new Color(0.37f, 0.49f, 0.26f);
                _depthPath.sharedMaterial.color = snowy ? new Color(0.76f, 0.80f, 0.78f) :
                    gloomy ? new Color(0.35f, 0.31f, 0.36f) :
                    tropical ? new Color(0.40f, 0.37f, 0.24f) : new Color(0.58f, 0.46f, 0.31f);
            }
        }

        public void SetCoopParty(bool hasPartner)
        {
            if (_hasCoopPartner == hasPartner) return;
            _hasCoopPartner = hasPartner;
            if (_coopPartner == null) return;
            _coopPartner.SetVisible(hasPartner);
            _coopPartner.Dead = false;
            if (hasPartner)
            {
                _coopPartner.Position = new Vector3(_battleVisible ? -0.65f : -1.9f, -1.65f, -0.45f);
                _coopPartner.Play("idle", true, true);
            }
        }

        public void PlayCoopAction()
        {
            if (_hasCoopPartner && _coopPartner != null && _battleVisible)
                _coopPartner.Play("attack", false, true);
        }

        public void SetEnemyIdentity(string id)
        {
            _enemyId = string.IsNullOrEmpty(id) ? "skeleton" : id;
            if (_enemy == null) return;
            InstallLocalActor(_enemy, _enemyId);
        }

        private void InstallLocalActor(AnimatedActor actor, string id)
        {
            foreach (var action in Actions)
            {
                var key = id + "/" + action;
                if (!_actorFrames.TryGetValue(key, out var frames))
                {
                    frames = new Sprite[4];
                    // 기존 Unity Art/Resources의 실제 픽셀 애니메이션 시트를 우선 사용한다.
                    // 리소스가 없는 몬스터는 자체 제작 런타임 아트로 일관되게 대체한다.
                    var sheet = Resources.Load<Texture2D>("DaechungArt/" + id + "-" + action);
                    for (var frame = 0; frame < frames.Length; frame++)
                    {
                        frames[frame] = sheet != null && sheet.width >= 192 && sheet.height >= 56
                            ? Sprite.Create(sheet, new Rect(frame * 48, 0, 48, 56),
                                new Vector2(0.5f, 0.05f), 48f)
                            : CreateActor(id, action, frame);
                    }
                    _actorFrames[key] = frames;
                }
                actor.AddClip(action, frames, action == "walk" ? 8 : 5);
            }
            actor.Play("idle", true, true);
        }

        private static Sprite CreateActor(string id, string action, int frame)
        {
            const int w = 48, h = 56;
            var p = new Color32[w * h];
            bool slime = id.Contains("slime");
            bool beast = id.Contains("wolf") || id.Contains("boar") || id.Contains("tiger") || id.Contains("panther");
            bool bone = id.Contains("skeleton");
            bool plated = id.Contains("knight") || id.Contains("warrior") || id == "hero";
            bool horned = id.Contains("demon") || id.Contains("orc") || id.Contains("ogre");
            var outline = new Color32(23, 27, 42, 255);
            var body = slime ? new Color32(92, 208, 136, 255) :
                beast ? new Color32(157, 107, 78, 255) :
                bone ? new Color32(229, 213, 180, 255) :
                plated ? new Color32(81, 132, 194, 255) :
                horned ? new Color32(148, 81, 127, 255) : new Color32(101, 155, 99, 255);
            int sway = action == "walk" && frame % 2 == 1 ? 2 : 0;
            int swing = action == "attack" && frame >= 1 && frame <= 2 ? 8 : 0;
            if (slime)
            {
                PaintOval(p, w, h, 24 + swing / 2, 18 + sway, 20, 17, outline);
                PaintOval(p, w, h, 24 + swing / 2, 20 + sway, 17, 14, body);
                PaintOval(p, w, h, 20, 26 + sway, 9, 4, new Color32(181, 251, 186, 255));
                PaintRect(p, w, h, 17, 19, 4, 5, outline);
                PaintRect(p, w, h, 31, 19, 4, 5, outline);
            }
            else if (beast)
            {
                PaintOval(p, w, h, 21 + swing / 2, 22 + sway, 20, 12, outline);
                PaintOval(p, w, h, 21 + swing / 2, 23 + sway, 18, 10, body);
                PaintRect(p, w, h, 10, 6, 7, 14, outline);
                PaintRect(p, w, h, 31, 6, 7, 14, outline);
                PaintOval(p, w, h, 36 + swing, 30, 12, 10, body);
                PaintRect(p, w, h, 33, 38, 5, 9, outline);
                PaintRect(p, w, h, 42, 36, 5, 9, outline);
                PaintRect(p, w, h, 40 + swing, 29, 3, 3, new Color32(240, 218, 103, 255));
            }
            else
            {
                PaintRect(p, w, h, 14, 4 + sway, 8, 15, outline);
                PaintRect(p, w, h, 28, 4 - sway, 8, 15, outline);
                PaintRect(p, w, h, 12, 18, 26, 22, outline);
                PaintRect(p, w, h, 15, 21, 20, 17, body);
                PaintRect(p, w, h, 7, 20, 8, 15, outline);
                PaintRect(p, w, h, 35 + swing, 20, 8, 15, outline);
                PaintOval(p, w, h, 25, 42 + sway, 13, 13, outline);
                PaintOval(p, w, h, 25, 42 + sway, 11, 11, body);
                PaintRect(p, w, h, 20, 42 + sway, 4, 4, outline);
                PaintRect(p, w, h, 29, 42 + sway, 4, 4, outline);
                if (plated)
                {
                    PaintRect(p, w, h, 14, 49, 23, 5, new Color32(203, 195, 137, 255));
                    PaintRect(p, w, h, 21, 27, 9, 5, new Color32(187, 209, 218, 255));
                }
                if (horned)
                {
                    PaintRect(p, w, h, 12, 49, 5, 7, outline);
                    PaintRect(p, w, h, 34, 49, 5, 7, outline);
                }
                if (bone || plated || horned)
                {
                    PaintRect(p, w, h, 40 + swing, 15, 4, 25, new Color32(206, 202, 188, 255));
                    PaintRect(p, w, h, 38 + swing, 33, 8, 4, outline);
                }
            }
            if (action == "hurt" && frame == 1)
                PaintRect(p, w, h, 4, 23, 8, 5, new Color32(242, 106, 103, 255));
            if (action == "death")
            {
                var low = new Color32[w * h];
                for (int y = 0; y < h - 5; y++)
                    for (int x = 0; x < w; x++) low[y * w + x] = p[(y + 5) * w + x];
                p = low;
            }
            var texture = new Texture2D(w, h, TextureFormat.RGBA32, false);
            texture.filterMode = FilterMode.Point;
            texture.SetPixels32(p);
            texture.Apply(false, true);
            var sprite = Sprite.Create(texture, new Rect(0, 0, w, h), new Vector2(0.5f, 0.05f), 48f);
            sprite.name = "daechung-local-" + id + "-" + action;
            return sprite;
        }

        private static Sprite CreateBackdrop(string id)
        {
            const int w = 512, h = 320;
            var p = new Color32[w * h];
            bool snowy = id.Contains("frozen") || id.Contains("mountain") || id.Contains("summit");
            bool gloomy = id.Contains("grave") || id.Contains("cursed") || id.Contains("rift");
            bool tropical = id.Contains("jungle") || id.Contains("amazon");
            bool village = id == "town" || id.Contains("village");
            var sky = snowy ? new Color32(105, 164, 198, 255) : gloomy ?
                new Color32(60, 56, 90, 255) : tropical ? new Color32(62, 142, 131, 255) :
                new Color32(110, 174, 212, 255);
            var ground = snowy ? new Color32(189, 211, 225, 255) : gloomy ?
                new Color32(89, 78, 99, 255) : tropical ? new Color32(80, 125, 71, 255) :
                new Color32(137, 158, 98, 255);
            PaintRect(p, w, h, 0, 0, w, h, sky);
            PaintOval(p, w, h, 417, 266, 29, 29, new Color32(245, 222, 162, 255));
            for (var i = 0; i < 8; i++)
                PaintOval(p, w, h, i * 83, 88 + (i % 3) * 9, 82, 83,
                    gloomy ? new Color32(65, 63, 97, 255) : new Color32(93, 132, 141, 255));
            PaintRect(p, w, h, 0, 0, w, 96, ground);
            PaintRect(p, w, h, 0, 0, w, 21, new Color32(77, 99, 73, 255));
            for (int i = 0; i < 9; i++)
            {
                int x = 20 + i * 65;
                if (village)
                {
                    PaintRect(p, w, h, x, 91, 41, 54, new Color32(194, 169, 130, 255));
                    PaintRect(p, w, h, x + 10, 92, 13, 27, new Color32(75, 69, 80, 255));
                    PaintRect(p, w, h, x - 4, 140, 51, 8, new Color32(116, 76, 73, 255));
                }
                else if (snowy)
                {
                    PaintOval(p, w, h, x + 14, 115, 36, 65, new Color32(220, 233, 239, 255));
                    PaintRect(p, w, h, x + 8, 97, 12, 49, new Color32(71, 108, 127, 255));
                }
                else if (gloomy)
                {
                    PaintRect(p, w, h, x + 12, 95, 9, 42, new Color32(40, 38, 68, 255));
                    PaintOval(p, w, h, x + 16, 135, 27, 20, new Color32(53, 48, 84, 255));
                }
                else
                {
                    PaintRect(p, w, h, x + 10, 93, 11, 79, new Color32(79, 77, 63, 255));
                    PaintOval(p, w, h, x + 12, 165, 34, 37,
                        tropical ? new Color32(31, 93, 76, 255) : new Color32(58, 120, 81, 255));
                }
            }
            var tex = new Texture2D(w, h, TextureFormat.RGBA32, false);
            tex.filterMode = FilterMode.Point;
            tex.SetPixels32(p);
            tex.Apply(false, true);
            var sprite = Sprite.Create(tex, new Rect(0, 0, w, h), new Vector2(0.5f, 0.5f), 48f);
            sprite.name = "daechung-region-" + id;
            return sprite;
        }

        private static void PaintRect(Color32[] p, int w, int h, int x, int y, int width, int height, Color32 color)
        {
            for (var yy = Mathf.Max(0, y); yy < Mathf.Min(h, y + height); yy++)
                for (var xx = Mathf.Max(0, x); xx < Mathf.Min(w, x + width); xx++)
                    p[yy * w + xx] = color;
        }

        private static void PaintOval(Color32[] p, int w, int h, int cx, int cy, int rx, int ry, Color32 color)
        {
            for (var yy = Mathf.Max(0, cy - ry); yy < Mathf.Min(h, cy + ry); yy++)
                for (var xx = Mathf.Max(0, cx - rx); xx < Mathf.Min(w, cx + rx); xx++)
                {
                    var dx = (xx - cx) / (float)rx;
                    var dy = (yy - cy) / (float)ry;
                    if (dx * dx + dy * dy <= 1f) p[yy * w + xx] = color;
                }
        }

        private void StopTravelRoutine()
        {
            if (_travelRoutine == null) return;

            StopCoroutine(_travelRoutine);
            _travelRoutine = null;
        }

        private IEnumerator LoadAll()
        {
            // 로컬 정식 픽셀 애니메이션이 존재하면 불필요한 외부 원격 시트 요청을 하지 않는다.
            // 로컬 아트가 없는 기존 프로젝트에서만 원격 MIT 아트 폴백을 유지한다.
            if (Resources.Load<Texture2D>("DaechungArt/hero-idle") != null)
                yield break;

            yield return LoadActor(_player, "pirate");
            if (!string.IsNullOrEmpty(_loadError)) yield break;

            yield return LoadActor(_enemy, "skeleton");
            if (!string.IsNullOrEmpty(_loadError)) yield break;

            _ready = true;
            SetEnemyIdentity(_enemyId);
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
            _coopPartner.SetVisible(_hasCoopPartner);
            _coopPartner.Position = new Vector3(-0.65f, -1.65f, -0.45f);
            if (_hasCoopPartner) _coopPartner.Play("walk", true, true);
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
            _coopPartner.SetVisible(_hasCoopPartner);
            _coopPartner.Position = new Vector3(-0.65f, -1.65f, -0.45f);
            if (_hasCoopPartner) _coopPartner.Play("idle", true, true);
            _player.Position = new Vector3(-2.65f, -1.65f, 0f);
            _enemy.Position = new Vector3(2.65f, -1.65f, 0.65f);
            _player.Play("idle", true, true);
            _enemy.Play("idle", true, true);
        }

        private static Camera SetupCamera()
        {
            var camera = Camera.main;
            if (camera == null)
            {
                var cameraObject = new GameObject("Main Camera");
                cameraObject.tag = "MainCamera";
                camera = cameraObject.AddComponent<Camera>();
            }

            // 그래픽: 2.5D 원근 카메라. 3D XZ 지형과 깊이가 다른 2D 애니메이션 배우를
            // 하나의 Unity 씬에서 합성하며 2D 전용 정면 카메라를 사용하지 않는다.
            camera.orthographic = false;
            camera.fieldOfView = 40f;
            camera.nearClipPlane = 0.2f;
            camera.farClipPlane = 50f;
            camera.allowHDR = false;
            camera.allowMSAA = false;
            camera.transform.position = new Vector3(0f, 2.0f, -13f);
            camera.transform.LookAt(new Vector3(0f, -0.35f, 0f));
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.055f, 0.075f, 0.105f, 1f);
            return camera;
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

            public void SetTint(Color tint) { _renderer.color = tint; }
            public void SetMaterial(Material material) { _renderer.sharedMaterial = material; }

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
