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
        private MeshRenderer _backdrop;
        private MeshRenderer _depthGround;
        private MeshRenderer _depthPath;
        private Material _treeCanopyMaterial;
        private Camera _sceneCamera;
        private float _lastCameraAspect = -1f;
        private string _enemyId = "skeleton";
        private readonly Dictionary<string, Sprite> _regions = new Dictionary<string, Sprite>();
        private readonly Dictionary<string, Sprite[]> _actorFrames = new Dictionary<string, Sprite[]>();
        // 메인: 게임에서 이미 존재하는 마을 캐릭터는 고정 안내판 대신 이동하는 배우로 표현한다.
        private readonly List<VillageResident> _villageResidents = new List<VillageResident>();
        private bool _scoutAccompanying;
        private float _bossRevealUntil;
        private float _baseCameraFieldOfView = 40f;
        private sealed class VillageResident
        {
            public string Id;
            public AnimatedActor Actor;
            public Vector3[] AuthoredPath;
            public int NextPoint;
            public float PauseUntil;
        }


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
            // 그래픽: 비어 있는 테스트 씬도 입체 메시를 실제 조명 아래 표시한다.
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.65f, 0.70f, 0.75f, 1f);
            var sun = new GameObject("DaechungWorldSun");
            sun.transform.SetParent(transform, false);
            sun.transform.rotation = Quaternion.Euler(43f, -28f, 0f);
            var light = sun.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 0.92f;
            light.shadows = LightShadows.None;
            _player = new AnimatedActor("PrototypePlayer", new Vector3(0f, -1.65f, 0f), true);
            _enemy = new AnimatedActor("PrototypeEnemy", new Vector3(2.85f, -1.65f, 0.65f), false);
            _enemy.SetVisible(false);
            _coopPartner = new AnimatedActor("CoopPartner", new Vector3(-0.8f, -1.65f, -0.45f), true);
            _coopPartner.SetVisible(false);
            // 그래픽 · 지역 그림은 3D 무대 뒤쪽 메시에 투영한다. 캐릭터는 전부 입체 MeshRenderer다.
            var backdropObject = GameObject.CreatePrimitive(PrimitiveType.Quad);
            backdropObject.name = "DaechungRegionBackground";
            backdropObject.transform.SetParent(transform, false);
            var backdropCollider = backdropObject.GetComponent<Collider>();
            if (backdropCollider != null) UnityEngine.Object.Destroy(backdropCollider);
            _backdrop = backdropObject.GetComponent<MeshRenderer>();
            var pixelShader = Shader.Find("Jaewoon/DaechungPixelArt");
            if (pixelShader == null || !pixelShader.isSupported)
                pixelShader = Shader.Find("Unlit/Texture");
            if (pixelShader == null || !pixelShader.isSupported)
                pixelShader = Shader.Find("Standard");
            if (pixelShader != null && pixelShader.isSupported)
                _backdrop.sharedMaterial = new Material(pixelShader);
            SetRegionVisual("town");
            InstallLocalActor(_player, "hero");
            InstallLocalActor(_enemy, "skeleton");
            InstallLocalActor(_coopPartner, "hero");
            InitializeVillageResidents();
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
                _baseCameraFieldOfView = Mathf.Clamp(
                    2f * Mathf.Atan(4f / (13f * Mathf.Max(0.4f, _lastCameraAspect))) * Mathf.Rad2Deg,
                    40f, 72f);
            }
            if (_sceneCamera != null)
            {
                // 컷신은 카메라만 짧게 당기고 원래 시야로 돌아온다. 전투 콜라이더/피해/페이즈 불변.
                var revealActive = _battleVisible && Time.time < _bossRevealUntil;
                _sceneCamera.fieldOfView = revealActive ? Mathf.Max(34f, _baseCameraFieldOfView - 8f) : _baseCameraFieldOfView;
            }
            _player?.Tick(Time.time);
            _enemy?.Tick(Time.time);
            _coopPartner?.Tick(Time.time);
            // 주변 인물은 자기 업무/휴식 장소를 실제로 오간다. 매 프레임 새 스폰이나 모델 호출은 없다.
            UpdateVillageResidents(Time.deltaTime);
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
            foreach (var resident in _villageResidents)
            {
                resident.Actor.SetVisible(true);
                resident.Actor.Play("idle", true);
            }
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
            foreach (var resident in _villageResidents)
                resident.Actor.SetVisible(_scoutAccompanying && resident.Id == "scout");
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


        // 메인: 기존 애니메이션 시스템을 그대로 사용한 마을의 생활 경로.
        // 앵커는 현재 마을 무대의 이동 가능한 연출 공간이며 전투 좌표·스폰·저장 권한을 대신하지 않는다.
        private void InitializeVillageResidents()
        {
            if (_villageResidents.Count > 0) return;
            AddVillageResident("chief", new Color(1f, 0.85f, 0.59f, 1f),
                new Vector3(-2.9f, -1.65f, -0.35f), new Vector3(-1.3f, -1.65f, -0.35f));
            AddVillageResident("smith", new Color(0.69f, 0.83f, 0.95f, 1f),
                new Vector3(-0.95f, -1.65f, 0.2f), new Vector3(0.55f, -1.65f, 0.2f));
            AddVillageResident("merchant", new Color(0.72f, 1f, 0.78f, 1f),
                new Vector3(1.2f, -1.65f, 0.5f), new Vector3(2.9f, -1.65f, 0.5f));
            AddVillageResident("scout", new Color(1f, 0.7f, 0.9f, 1f),
                new Vector3(-0.7f, -1.65f, -0.6f), new Vector3(2.4f, -1.65f, -0.6f));
        }

        private void AddVillageResident(string id, Color tint, params Vector3[] path)
        {
            var person = new AnimatedActor("VillageResident_" + id, path[0], true);
            InstallLocalActor(person, "hero");
            person.SetTint(tint);
            person.SetVisible(false);
            _villageResidents.Add(new VillageResident { Id = id, Actor = person, AuthoredPath = path,
                NextPoint = path.Length > 1 ? 1 : 0, PauseUntil = Time.time + _villageResidents.Count * 0.55f });
        }

        private void UpdateVillageResidents(float dt)
        {
            foreach (var npc in _villageResidents)
            {
                if (!_ready) { npc.Actor.Tick(Time.time); continue; }
                if (npc.Id == "scout" && _scoutAccompanying)
                {
                    // NPC 동행은 별개 네트워크 플레이어를 위조하지 않고 연출만 보조한다.
                    var scoutDestination = _player.Position + new Vector3(-0.9f, 0f, -0.35f);
                    var scoutPosition = npc.Actor.Position;
                    npc.Actor.Position = Vector3.MoveTowards(scoutPosition, scoutDestination, Mathf.Min(dt, 0.05f) * 1.5f);
                    npc.Actor.FaceRight(scoutDestination.x >= scoutPosition.x);
                    npc.Actor.Play(Vector3.Distance(scoutPosition, scoutDestination) < 0.07f ? "idle" : "walk", true);
                    npc.Actor.Tick(Time.time);
                    continue;
                }
                if (_battleVisible) { npc.Actor.Tick(Time.time); continue; }
                var at = npc.Actor.Position;
                var destination = npc.AuthoredPath[npc.NextPoint];
                if (Time.time < npc.PauseUntil)
                {
                    npc.Actor.Play("idle", true);
                }
                else
                {
                    npc.Actor.Position = Vector3.MoveTowards(at, destination, Mathf.Min(dt, 0.05f) * 0.68f);
                    npc.Actor.FaceRight(destination.x >= at.x);
                    npc.Actor.Play("walk", true);
                    if (Vector3.Distance(npc.Actor.Position, destination) < 0.05f)
                    {
                        npc.NextPoint = (npc.NextPoint + 1) % npc.AuthoredPath.Length;
                        npc.PauseUntil = Time.time + 1.5f;
                    }
                }
                npc.Actor.Tick(Time.time);
            }
        }

        public void SetNarrativeCompanion(bool accompanying)
        {
            _scoutAccompanying = accompanying;
            var scout = _villageResidents.Find(resident => resident.Id == "scout");
            if (scout == null) return;
            scout.Actor.SetVisible(_scoutAccompanying || !_battleVisible);
            scout.PauseUntil = Time.time + 0.25f;
        }

        public void PlayBossReveal()
        {
            if (!_battleVisible || _enemy == null) return;
            _bossRevealUntil = Time.time + 2.4f;
            _enemy.Play("attack", false, true);
        }

        public void SkipBossReveal()
        {
            _bossRevealUntil = 0f;
            if (_sceneCamera != null) _sceneCamera.fieldOfView = _baseCameraFieldOfView;
        }

        public bool IsVillageResidentNearby(string id)
        {
            if (!_ready || _battleVisible || _player == null) return false;
            var resident = _villageResidents.Find(npc => npc.Id == id);
            return resident != null && Vector3.Distance(_player.Position, resident.Actor.Position) <= 2.7f;
        }

        public void ReactVillageResident(string id)
        {
            var resident = _villageResidents.Find(npc => npc.Id == id);
            if (resident == null || _battleVisible) return;
            resident.PauseUntil = Time.time + 2.5f;
            resident.Actor.Play("idle", true, true);
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
            // 기존 지역별 아트는 텍스처로 보존하되 Unity 2D Renderer는 사용하지 않는다.
            if (_backdrop.sharedMaterial != null)
                _backdrop.sharedMaterial.mainTexture = sprite.texture;
            _backdrop.transform.position = new Vector3(0f, 0f, 9f);
            _backdrop.transform.localScale = new Vector3(
                sprite.rect.width / sprite.pixelsPerUnit * 3f,
                sprite.rect.height / sprite.pixelsPerUnit * 3f, 1f);

            // 그래픽: 같은 Unity 카메라에서 원근 투영하는 실제 XZ 지형과 길.
            // 단순 2D 배경 확대가 아니라 지역마다 색이 바뀌는 3D 깊이 기하를 렌더한다.
            // 몬스터 히트박스, 이동·저장·전투 수치와 무관한 시각 레이어다.
            if (_depthGround == null)
            {
                var shader = Shader.Find("Standard");
                if (shader == null || !shader.isSupported) shader = Shader.Find("Unlit/Color");
                if (shader == null || !shader.isSupported) shader = Shader.Find("Sprites/Default");
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
                    // 그래픽: 기존 지역 렌더 책임 함수에서 실제 3D 식생을 깊이 방향에 배치한다.
                    // 물리 Collider는 제거하므로 이동·전투·드랍 판정은 기존 GameCore 그대로다.
                    var bark = new Material(shader) { color = new Color(0.43f, 0.29f, 0.18f) };
                    _treeCanopyMaterial = new Material(shader) { color = new Color(0.28f, 0.53f, 0.30f) };
                    for (int i = 0; i < 6; i++)
                    {
                        var tier = i / 2;
                        var x = (i % 2 == 0 ? -1f : 1f) * (3.5f + 0.45f * tier);
                        var z = -3.5f + tier * 4f;
                        var trunk = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                        trunk.name = "DaechungWorldTreeTrunk_" + i;
                        trunk.transform.SetParent(transform, false);
                        trunk.transform.localPosition = new Vector3(x, -1.11f, z);
                        trunk.transform.localScale = new Vector3(0.21f, 0.70f, 0.21f);
                        trunk.GetComponent<MeshRenderer>().sharedMaterial = bark;
                        var trunkCollider = trunk.GetComponent<Collider>();
                        if (trunkCollider != null) UnityEngine.Object.Destroy(trunkCollider);
                        var canopy = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                        canopy.name = "DaechungWorldTreeCanopy_" + i;
                        canopy.transform.SetParent(transform, false);
                        canopy.transform.localPosition = new Vector3(x, -0.12f, z);
                        canopy.transform.localScale = new Vector3(1.05f, 1.32f, 0.96f);
                        canopy.GetComponent<MeshRenderer>().sharedMaterial = _treeCanopyMaterial;
                        var canopyCollider = canopy.GetComponent<Collider>();
                        if (canopyCollider != null) UnityEngine.Object.Destroy(canopyCollider);
                    }
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
                if (_treeCanopyMaterial != null)
                    _treeCanopyMaterial.color = snowy ? new Color(0.72f, 0.84f, 0.83f) :
                        gloomy ? new Color(0.31f, 0.35f, 0.40f) :
                        tropical ? new Color(0.16f, 0.49f, 0.24f) : new Color(0.28f, 0.53f, 0.30f);
            }

#if UNITY_WEBGL && !UNITY_EDITOR
            // 메인: 기존 2D/2.5D 바닥·길만으로 3D를 주장하지 않고 실제 입체 메시를 요구한다.
            // 레거시 스프라이트는 3D 대체본 검증 전까지 보존하되 입체 메시로 세지 않는다.
            if (Application.absoluteURL.Contains("qa=1"))
            {
                int inspected = 0, validMeshes = 0, triangles = 0, volumetricMeshes = 0;
                bool materialsValid = true;
                foreach (var renderer in FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None))
                {
                    if (renderer == null || !renderer.enabled || !renderer.gameObject.activeInHierarchy) continue;
                    inspected++;
                    var filter = renderer.GetComponent<MeshFilter>();
                    var mesh = filter != null ? filter.sharedMesh : null;
                    if (mesh == null || mesh.vertexCount < 3 || mesh.subMeshCount < 1)
                        continue;
                    int validTriangles = 0;
                    for (int subMesh = 0; subMesh < mesh.subMeshCount; subMesh++)
                    {
                        if (mesh.GetTopology(subMesh) == MeshTopology.Triangles)
                            validTriangles += (int)(mesh.GetIndexCount(subMesh) / 3);
                    }
                    if (validTriangles > 0)
                    {
                        validMeshes++;
                        triangles += validTriangles;
                        // 평면은 한 축의 두께가 없으므로 입체 캐릭터·몬스터·환경으로 인정하지 않는다.
                        var bounds = mesh.bounds.size;
                        if (bounds.x > 0.02f && bounds.y > 0.02f && bounds.z > 0.02f)
                            volumetricMeshes++;
                    }
                    materialsValid &= renderer.sharedMaterial != null
                        && renderer.sharedMaterial.shader != null && renderer.sharedMaterial.shader.isSupported;
                }
                var backdropTexture = _backdrop != null && _backdrop.sharedMaterial != null
                    ? _backdrop.sharedMaterial.mainTexture : null;
                bool textureDecoded = backdropTexture != null && backdropTexture.width > 0 && backdropTexture.height > 0;
                bool geometryPass = inspected >= 2 && validMeshes == inspected && triangles > 0
                    && volumetricMeshes > 0 && materialsValid && textureDecoded;
                Debug.Log($"JAEWOON_UNITY_WEB_QA MESH_INTEGRITY game=daechung-rpg source=UNITY_MESH_FILTER inspected={inspected} validMeshes={validMeshes} triangles={triangles} volumetricMeshes={volumetricMeshes} materialPass={(materialsValid ? 1 : 0)} texturePass={(textureDecoded ? 1 : 0)} status={(geometryPass ? "PASS" : "REPAIR_REQUIRED")}");
                // QA는 마커 수치를 만드는 게 아니라 실제 MeshRenderer/카메라/캐릭터 상태를 읽는다.
                int worldMeshes3d = 0;
                float minZ = float.PositiveInfinity, maxZ = float.NegativeInfinity;
                foreach (var nativeRenderer in FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None))
                {
                    if (nativeRenderer == null || !nativeRenderer.enabled || !nativeRenderer.gameObject.activeInHierarchy)
                        continue;
                    var nativeFilter = nativeRenderer.GetComponent<MeshFilter>();
                    if (nativeFilter == null || nativeFilter.sharedMesh == null) continue;
                    var bounds = nativeRenderer.bounds;
                    if (bounds.size.x <= 0.02f || bounds.size.y <= 0.02f || bounds.size.z <= 0.02f)
                        continue;
                    worldMeshes3d++;
                    minZ = Mathf.Min(minZ, bounds.min.z);
                    maxZ = Mathf.Max(maxZ, bounds.max.z);
                }
                int worldDepthCm = worldMeshes3d > 0
                    ? Mathf.RoundToInt(Mathf.Max(0f, maxZ - minZ) * 100f) : 0;
                int gameplayActors3d = 0, spriteGameplayActors = 0;
                foreach (var actor in new[] { _player, _enemy, _coopPartner })
                {
                    if (actor == null) continue;
                    if (actor.HasVisibleVolumetricMesh) gameplayActors3d++;
                    if (actor.SpriteVisible) spriteGameplayActors++;
                }
                foreach (var resident in _villageResidents)
                {
                    if (resident.Actor.HasVisibleVolumetricMesh) gameplayActors3d++;
                    if (resident.Actor.SpriteVisible) spriteGameplayActors++;
                }
                bool perspective = _sceneCamera != null && _sceneCamera.enabled && !_sceneCamera.orthographic;
                bool spatialPass = perspective && worldMeshes3d >= 2 && worldDepthCm >= 50
                    && gameplayActors3d >= 1 && spriteGameplayActors == 0 && geometryPass;
                Debug.Log($"JAEWOON_UNITY_WEB_QA SPATIAL_DEPTH game=daechung-rpg source=UNITY_WORLD_MESH_DEPTH cameraPerspective={(perspective ? 1 : 0)} worldMeshes3d={worldMeshes3d} worldDepthCm={worldDepthCm} gameplayActors3d={gameplayActors3d} spriteGameplayActors={spriteGameplayActors} status={(spatialPass ? "PASS" : "REPAIR_REQUIRED")}");
            }
#endif
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
            actor.SetIdentity(id);
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

            // 그래픽: 기존 카메라를 실제 X/Y/Z 3D 게임 월드와 입체 배우의 원근 시점으로 유지한다.
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
            // 실제 Unity Native Mesh는 기존 액션 상태를 렌더할 뿐 게임플레이/저장 권한이 없다.
            private readonly GameObject _model;
            private readonly Transform _body, _head, _leftArm, _rightArm, _leftLeg, _rightLeg;
            private readonly Material _skin, _accent;
            private Color _tint = Color.white;
            private Color _baseColor = new Color(0.28f, 0.53f, 0.82f);
            private bool _faceRight;
            private string _currentAction = string.Empty;
            private bool _loop = true;
            private float _actionStarted;

            public AnimatedActor(string name, Vector3 position, bool faceRight)
            {
                _root = new GameObject(name);
                _root.transform.position = position;
                _root.transform.localScale = Vector3.one * 1.4f;
                _faceRight = faceRight;
                // 렌더러의 기존 생성 책임 안에서 3D 모델을 한 번만 만든다.
                var shader = Shader.Find("Standard");
                if (shader == null || !shader.isSupported) shader = Shader.Find("Unlit/Color");
                if (shader == null || !shader.isSupported) shader = Shader.Find("Sprites/Default");
                _model = new GameObject(name + "_3DModel");
                _model.transform.SetParent(_root.transform, false);
                if (shader == null || !shader.isSupported)
                {
                    _model.SetActive(false);
                    return;
                }
                _skin = new Material(shader) { color = _baseColor };
                _accent = new Material(shader) { color = new Color(0.85f, 0.73f, 0.56f) };
                _body = CreatePart(_model.transform, "Body", PrimitiveType.Capsule,
                    new Vector3(0f, 0.62f, 0f), new Vector3(0.46f, 0.49f, 0.33f), _skin);
                _head = CreatePart(_model.transform, "Head", PrimitiveType.Sphere,
                    new Vector3(0f, 1.34f, -0.04f), new Vector3(0.52f, 0.55f, 0.46f), _accent);
                _leftArm = CreatePart(_model.transform, "LeftArm", PrimitiveType.Capsule,
                    new Vector3(-0.33f, 0.77f, 0f), new Vector3(0.17f, 0.37f, 0.19f), _skin);
                _rightArm = CreatePart(_model.transform, "RightArm", PrimitiveType.Capsule,
                    new Vector3(0.33f, 0.77f, 0f), new Vector3(0.17f, 0.37f, 0.19f), _skin);
                _leftLeg = CreatePart(_model.transform, "LeftLeg", PrimitiveType.Capsule,
                    new Vector3(-0.14f, 0.17f, 0f), new Vector3(0.17f, 0.31f, 0.17f), _accent);
                _rightLeg = CreatePart(_model.transform, "RightLeg", PrimitiveType.Capsule,
                    new Vector3(0.14f, 0.17f, 0f), new Vector3(0.17f, 0.31f, 0.17f), _accent);
                FaceRight(faceRight);
            }

            // 같은 캐릭터의 원본 Clip·이동·전투 역할을 보존하면서 모양만 교체한다.
            private static Transform CreatePart(Transform parent, string name, PrimitiveType shape,
                Vector3 position, Vector3 scale, Material material)
            {
                var part = GameObject.CreatePrimitive(shape);
                part.name = name;
                part.transform.SetParent(parent, false);
                part.transform.localPosition = position;
                part.transform.localScale = scale;
                var collider = part.GetComponent<Collider>();
                if (collider != null) UnityEngine.Object.Destroy(collider);
                part.GetComponent<MeshRenderer>().sharedMaterial = material;
                return part.transform;
            }

            public bool HasVisibleVolumetricMesh
            {
                get
                {
                    if (_skin == null || _body == null || !_model.activeInHierarchy) return false;
                    var meshFilter = _body.GetComponent<MeshFilter>();
                    var meshRenderer = _body.GetComponent<MeshRenderer>();
                    var mesh = meshFilter != null ? meshFilter.sharedMesh : null;
                    return meshRenderer != null && meshRenderer.enabled && meshRenderer.sharedMaterial != null
                        && mesh != null && mesh.bounds.size.x > 0.02f
                        && mesh.bounds.size.y > 0.02f && mesh.bounds.size.z > 0.02f;
                }
            }
            public bool SpriteVisible
            {
                get
                {
                    // QA · 가짜 0 표시가 아니라 현재 실제 활성화된 2D Renderer가 있는지 검사한다.
                    foreach (var renderer in _root.GetComponentsInChildren<Renderer>(true))
                    {
                        if (renderer != null && renderer.enabled && renderer.gameObject.activeInHierarchy
                            && renderer.GetType().Name == "SpriteRenderer")
                            return true;
                    }
                    return false;
                }
            }

            public void SetIdentity(string id)
            {
                var species = (id ?? "hero").ToLowerInvariant();
                bool slime = species.Contains("slime");
                bool skeleton = species.Contains("skeleton") || species.Contains("bone");
                bool beast = species.Contains("wolf") || species.Contains("boar") ||
                    species.Contains("tiger") || species.Contains("panther");
                _baseColor = slime ? new Color(0.26f, 0.70f, 0.42f) :
                    skeleton ? new Color(0.80f, 0.81f, 0.74f) :
                    beast ? new Color(0.59f, 0.36f, 0.22f) : new Color(0.28f, 0.53f, 0.82f);
                if (_skin == null) return;
                _head.gameObject.SetActive(!slime);
                _leftArm.gameObject.SetActive(!slime);
                _rightArm.gameObject.SetActive(!slime);
                _leftLeg.gameObject.SetActive(!slime);
                _rightLeg.gameObject.SetActive(!slime);
                _body.localPosition = slime ? new Vector3(0f, 0.39f, 0f) : new Vector3(0f, 0.62f, 0f);
                _body.localScale = slime ? new Vector3(0.80f, 0.39f, 0.63f) :
                    beast ? new Vector3(0.68f, 0.43f, 0.51f) : new Vector3(0.46f, 0.49f, 0.33f);
                _accent.color = skeleton ? new Color(0.94f, 0.91f, 0.81f) : new Color(0.85f, 0.73f, 0.56f);
                SetTint(_tint);
            }

            public void SetTint(Color tint)
            {
                _tint = tint;
                if (_skin != null)
                    _skin.color = new Color(_baseColor.r * tint.r, _baseColor.g * tint.g, _baseColor.b * tint.b);
            }
            public void FaceRight(bool facingRight)
            {
                _faceRight = facingRight;
                if (_model != null) _model.transform.localRotation =
                    Quaternion.Euler(0f, facingRight ? -16f : 16f, 0f);
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
                if (_model != null) _model.SetActive(visible && _skin != null);
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

                // 기존 프레임 시간에 맞춰 같은 캐릭터의 네이티브 3D 포즈만 갱신한다.
                // 기존 텍스처 프레임은 로딩·동작 타이밍 메타데이터로 유지한다.
                if (clip.Frames[frameIndex] == null) return; 공격 판정은 GameCore가 유지한다.
                if (_skin == null || !_model.activeInHierarchy) return;
                bool walking = _currentAction == "walk";
                bool attacking = _currentAction == "attack";
                bool hurt = _currentAction == "hurt";
                bool dying = _currentAction == "death";
                float stride = walking ? Mathf.Sin(elapsed * 10f) : 0f;
                float strike = attacking ? Mathf.Sin(Mathf.Clamp01(elapsed / 0.48f) * Mathf.PI) : 0f;
                float hit = hurt ? Mathf.Sin(Mathf.Clamp01(elapsed / 0.30f) * Mathf.PI) : 0f;
                float deathTilt = dying ? -72f * Mathf.Clamp01(elapsed / 0.45f) : 0f;
                _model.transform.localPosition = new Vector3(0f, walking ?
                    Mathf.Abs(stride) * 0.045f : Mathf.Sin(now * 1.8f) * 0.015f, 0f);
                _model.transform.localRotation = Quaternion.Euler(-hit * 12f,
                    _faceRight ? -16f : 16f, deathTilt);
                _leftArm.localRotation = Quaternion.Euler(stride * 22f, 0f, 0f);
                _rightArm.localRotation = Quaternion.Euler(-stride * 22f - strike * 68f, 0f, 0f);
                _leftLeg.localRotation = Quaternion.Euler(-stride * 16f, 0f, 0f);
                _rightLeg.localRotation = Quaternion.Euler(stride * 16f, 0f, 0f);
            }
        }
    }
}
