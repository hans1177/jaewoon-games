// 파일명: RuntimeBootstrap.cs
// 역할: 대충 RPG Unity 재개발의 Android 플레이 가능 초안
// 초안 그래픽: 검증된 무료 애니메이션 Pirate/Skeleton 에셋을 실제 전투 상태와 연결한다.

using System.Collections.Generic;
using UnityEngine;
using Unity.Profiling;

namespace JaewoonGames.DaechungRpg
{
    public sealed class RuntimeBootstrap : MonoBehaviour
    {
        private GameCore _core;
        private EnemyDefinition _enemy;
        private int _enemyHp;
        private string _message = "Select a hunting field to begin.";
        private Vector2 _scroll;
        // 모바일 메뉴: 한 번에 필요한 화면만 그려 재계산 비용을 줄이고 탭별 스크롤을 유지한다.
        private static readonly string[] MenuTabs = { "WORLD", "COMBAT", "SOCIAL" };
        private readonly Vector2[] _menuScrollPositions = new Vector2[3];
        private int _menuPage;
        private Rect _actionButtonRect;
        private PrototypeAnimatedVisuals _visuals;
        private MultiplayerSession _multiplayer;
        private float _qaHeartbeatAt;
        private float _qaMobileTargetAt;
        private float _qaUiBoundsAt;
        private int _coopActionSeen;
        // 메인: 이야기·대화는 기존 GameCore에 기록하며 NPC의 연출/제안은 전투와 멀티 동기화를 바꾸지 않는다.
        private static readonly string[] ResidentIds = { "chief", "smith", "merchant", "scout" };
        private static readonly string[] ResidentNames = { "촌장", "대장장이", "상인", "정찰병" };
        private string _pendingResidentId = string.Empty;
        private bool _scoutInvitationPending;
        private float _nextResidentOfferAt = 4f;
        private float _bossSceneUntil;
        private string _bossSceneName = string.Empty;
        private string _bossSceneDialogue = string.Empty;
        private readonly HashSet<string> _presentedBossScenes = new HashSet<string>();
        // 실제 WebGL 게임의 렌더 카운터. 프로파일러 미지원 환경은 값 미측정으로 둔다.
        private ProfilerRecorder _drawCallsRecorder;
        private ProfilerRecorder _trianglesRecorder;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void AutoStart()
        {
            var core = Object.FindFirstObjectByType<GameCore>();
            if (core == null)
            {
                var coreObject = new GameObject("GameCore");
                core = coreObject.AddComponent<GameCore>();
            }

            var bootstrap = Object.FindFirstObjectByType<RuntimeBootstrap>();
            if (bootstrap == null)
            {
                var uiObject = new GameObject("RuntimeBootstrap");
                bootstrap = uiObject.AddComponent<RuntimeBootstrap>();
            }

            bootstrap._core = core;
        }

        private void Awake()
        {
            DontDestroyOnLoad(gameObject);
        }

        private void OnEnable()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            if (!Application.absoluteURL.Contains("qa=1")) return;
            try
            {
                _drawCallsRecorder = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Draw Calls Count");
                _trianglesRecorder = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Triangles Count");
            }
            catch (System.Exception)
            {
                if (_drawCallsRecorder.Valid) _drawCallsRecorder.Dispose();
                if (_trianglesRecorder.Valid) _trianglesRecorder.Dispose();
            }
#endif
        }

        private void OnDisable()
        {
            if (_drawCallsRecorder.Valid) _drawCallsRecorder.Dispose();
            if (_trianglesRecorder.Valid) _trianglesRecorder.Dispose();
        }

        private void Start()
        {
            Debug.Log("JAEWOON_UNITY_WEB_QA BOOT game=daechung-rpg status=PASS");
            if (_core == null)
            {
                _core = Object.FindFirstObjectByType<GameCore>();
            }

            _visuals = PrototypeAnimatedVisuals.EnsureCreated();
            _visuals?.SetNarrativeCompanion(_core != null && _core.Player.scoutAccompanying);
            _multiplayer = GetComponent<MultiplayerSession>();
            if (_multiplayer == null) _multiplayer = gameObject.AddComponent<MultiplayerSession>();

            if (_core == null) return;
            _visuals.SetRegionVisual(_core.Player.currentRegionId);

            if (_core.Player.currentRegionId != "town")
            {
                SpawnFirstEnemyInCurrentRegion();
            }
            else
            {
                _visuals.ShowTown();
            }
        }

        private void Update()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            var qaMode = Application.absoluteURL.Contains("qa=1");
            if (qaMode)
            {
                if (Input.GetKeyDown(KeyCode.Alpha1)) MoveTo("field-1");
                if (Input.GetKeyDown(KeyCode.Space)) AttackEnemy();
                if (Input.GetKeyDown(KeyCode.R)) MoveTo("town");
            }
#endif

            if (_core == null) return;
            // 중요한 주민은 플레이어가 말을 걸지 않아도 주변에서 인사를 제안한다.
            // 화면에 있는 주민만 선택하며 반복 대사/제안은 한 번에 하나로 제한한다.
            if (_core.Player.currentRegionId == "town")
            {
                if (Time.unscaledTime >= _nextResidentOfferAt && string.IsNullOrEmpty(_pendingResidentId))
                {
                    _nextResidentOfferAt = Time.unscaledTime + 18f;
                    foreach (var id in ResidentIds)
                    {
                        if (_visuals == null || !_visuals.IsVillageResidentNearby(id)) continue;
                        if (id == "scout" && _core.Player.scoutAccompanying) continue;
                        _pendingResidentId = id;
                        break;
                    }
                }
            }
            else _pendingResidentId = string.Empty;
            if (_bossSceneUntil > 0f && Time.unscaledTime >= _bossSceneUntil)
            {
                _bossSceneUntil = 0f;
                _visuals?.SkipBossReveal();
            }
            _multiplayer?.ObserveLocalState(_core.Player.currentRegionId, _enemy != null ? _enemy.id : "",
                _enemyHp, _core.Player.currentHp);
            if (_multiplayer != null)
            {
                _visuals?.SetCoopParty(_multiplayer.Connected && _multiplayer.ParticipantCount >= 2);
                if (_coopActionSeen != _multiplayer.RemoteActionVersion)
                {
                    _coopActionSeen = _multiplayer.RemoteActionVersion;
                    _visuals?.PlayCoopAction();
                }
            }
            if (Time.unscaledTime < _qaHeartbeatAt) return;
            _qaHeartbeatAt = Time.unscaledTime + 2f;
            var player = _core.Player;
            Debug.Log($"JAEWOON_UNITY_WEB_QA STATE game=daechung-rpg region={player.currentRegionId} level={player.level} hp={player.currentHp} maxHp={_core.GetMaxHp()} exp={player.experience} gold={player.gold} enemy={(_enemy != null ? _enemy.id : "none")} enemyHp={_enemyHp}");
#if UNITY_WEBGL && !UNITY_EDITOR
            // 프로파일러 실측값만 전달한다. 미지원 런타임은 가짜 0값을 출력하지 않는다.
            if (Application.absoluteURL.Contains("qa=1") && _drawCallsRecorder.Valid && _trianglesRecorder.Valid
                && _drawCallsRecorder.LastValue > 0 && _trianglesRecorder.LastValue > 0)
            {
                Debug.Log($"JAEWOON_UNITY_WEB_QA RENDER_STATS game=daechung-rpg source=UNITY_NATIVE_RENDERER drawCalls={_drawCallsRecorder.LastValue} triangles={_trianglesRecorder.LastValue}");
            }
#endif
        }

        private void OnGUI()
        {
            if (_core == null)
            {
                GUI.Label(new Rect(24, 24, Mathf.Max(1f, Screen.width - 48f), 60), "GameCore is not ready.");
                return;
            }

            // 모바일: 안전 영역과 화면 회전에 맞추고, 공격 버튼 아래에 스크롤 콘텐츠를 깔지 않는다.
            var safe = Screen.safeArea;
            if (safe.width <= 0f || safe.height <= 0f)
                safe = new Rect(0f, 0f, Screen.width, Screen.height);
            var scale = Mathf.Clamp(Screen.dpi > 0 ? Screen.dpi / 180f : 1.2f, 1f, 1.6f);
            var width = Mathf.Max(1f, Mathf.Min(safe.width - 24f, 760f * scale));
            var left = safe.xMin + (safe.width - width) * 0.5f;
            var topY = safe.yMin + 12f;
            var compactLandscape = safe.width > safe.height && safe.height < 540f;
            var topHeight = compactLandscape ? Mathf.Min(88f, safe.height * 0.24f) :
                Mathf.Min(194f * scale, safe.height * 0.29f);
            var controlsY = compactLandscape ? topY + topHeight + 8f :
                Mathf.Max(topY + topHeight + 12f, safe.yMin + safe.height * 0.50f);
            var tabsHeight = compactLandscape ? 48f : Mathf.Max(48f, 38f * scale);
            var tabsRect = new Rect(left, controlsY, width, tabsHeight);

            var margin = Mathf.Max(12f, safe.width * 0.04f);
            var buttonWidth = Mathf.Min(Mathf.Max(1f, safe.width - margin * 2f), Mathf.Clamp(safe.width * 0.34f, 120f, 180f));
            var buttonHeight = Mathf.Min(Mathf.Max(1f, safe.height - margin * 2f), Mathf.Clamp(safe.height * 0.08f, 56f, 84f));
            _actionButtonRect = new Rect(safe.xMax - buttonWidth - margin, safe.yMax - buttonHeight - margin, buttonWidth, buttonHeight);
            var menuY = tabsRect.yMax + 6f;
            var controlsHeight = Mathf.Max(1f, _actionButtonRect.yMin - 10f - menuY);
            var controlsRect = new Rect(left, menuY, width, controlsHeight);

#if UNITY_WEBGL && !UNITY_EDITOR
            if (Application.absoluteURL.Contains("qa=1") && Event.current.type == EventType.Repaint
                && Time.unscaledTime >= _qaUiBoundsAt)
            {
                _qaUiBoundsAt = Time.unscaledTime + 2f;
                Debug.Log($"JAEWOON_UNITY_WEB_QA UI_BOUNDS game=daechung-rpg surface=UNITY_ONGUI screenWidth={Screen.width} screenHeight={Screen.height} topLeft={left:F2} topY={topY:F2} topWidth={width:F2} topHeight={topHeight:F2} controlsLeft={controlsRect.x:F2} controlsY={controlsRect.y:F2} controlsWidth={controlsRect.width:F2} controlsHeight={controlsRect.height:F2} tabsLeft={tabsRect.x:F2} tabsY={tabsRect.y:F2} tabsWidth={tabsRect.width:F2} tabsHeight={tabsRect.height:F2} actionLeft={_actionButtonRect.x:F2} actionY={_actionButtonRect.y:F2} actionWidth={_actionButtonRect.width:F2} actionHeight={_actionButtonRect.height:F2}");
                var target = new Vector2(tabsRect.x + tabsRect.width * (2.5f / MenuTabs.Length), tabsRect.center.y);
                Debug.Log($"JAEWOON_UNITY_WEB_QA MENU_TARGET game=daechung-rpg role=tab index=2 x={target.x / Screen.width:F4} y={target.y / Screen.height:F4}");
            }
#endif

            GUI.skin.label.fontSize = Mathf.RoundToInt(17f * scale);
            GUI.skin.button.fontSize = Mathf.RoundToInt(17f * scale);
            GUI.skin.box.fontSize = Mathf.RoundToInt(17f * scale);
            GUI.skin.button.fixedHeight = Mathf.Max(48f, 42f * scale);

            GUILayout.BeginArea(new Rect(left, topY, width, topHeight), GUI.skin.box);
            if (compactLandscape)
            {
                var player = _core.Player;
                GUILayout.Label("DAECHUNG RPG");
                GUILayout.Label($"LV {player.level}   HP {player.currentHp}/{_core.GetMaxHp()}   GOLD {player.gold}");
            }
            else
            {
                GUILayout.Label("DAECHUNG RPG · ANIMATED PROTOTYPE");
                if (safe.height > 560f)
                    GUILayout.Label("Combat / growth / save / regions + verified animated actors");
                DrawPlayerStatus();
                GUILayout.Label("ASSET  " + (_visuals != null ? _visuals.StatusText : "STARTING"));
            }
            GUILayout.EndArea();

            // 탭 자체도 충분한 터치 높이를 유지한다. 변경하지 않은 탭의 스크롤 위치는 보존한다.
            var selectedPage = GUI.Toolbar(tabsRect, _menuPage, MenuTabs);
            if (selectedPage >= 0 && selectedPage < MenuTabs.Length && selectedPage != _menuPage)
            {
                _menuScrollPositions[_menuPage] = _scroll;
                _menuPage = selectedPage;
                _scroll = _menuScrollPositions[_menuPage];
#if UNITY_WEBGL && !UNITY_EDITOR
                if (Application.absoluteURL.Contains("qa=1"))
                    Debug.Log($"JAEWOON_UNITY_WEB_QA MENU_INPUT game=daechung-rpg role=tab index={_menuPage} status=PASS");
#endif
            }

            GUILayout.BeginArea(controlsRect, GUI.skin.box);
            _scroll = GUILayout.BeginScrollView(_scroll);
            if (_menuPage == 0)
            {
                DrawRegionControls();
                GUILayout.Space(6f * scale);
                DrawTownControls();
            }
            else if (_menuPage == 1)
            {
                DrawCombatControls();
                GUILayout.Space(6f * scale);
                GUILayout.Label("LOG");
                GUILayout.TextArea(_message, GUILayout.MinHeight(58f * scale));
            }
            else
            {
                _multiplayer?.DrawControls(scale);
                GUILayout.Space(6f * scale);
                DrawSocialControls();
                GUILayout.Space(6f * scale);
                GUILayout.Label("LOG");
                GUILayout.TextArea(_message, GUILayout.MinHeight(58f * scale));
            }
            GUILayout.EndScrollView();
            _menuScrollPositions[_menuPage] = _scroll;
            GUILayout.EndArea();

            // 하단 행동 버튼은 메뉴를 스크롤하거나 탭을 바꿔도 같은 위치에서 동작한다.
            DrawPrimaryCombatActionButton();
            DrawStoryPrompt(safe, scale);
        }

        private void DrawPlayerStatus()
        {
            var player = _core.Player;
            var regionName = GameCatalog.Regions.TryGetValue(player.currentRegionId, out var region)
                ? region.displayName
                : player.currentRegionId;

            GUILayout.Label($"LV {player.level}   HP {player.currentHp}/{_core.GetMaxHp()}   ATK {_core.GetAttackPower()}");
            GUILayout.Label($"EXP {player.experience}/{ExperienceNeeded(player.level)}   GOLD {player.gold}");
            GUILayout.Label($"REGION {regionName}   JOB {player.job}   WEAPON {player.equippedWeaponId}");
        }

        private void DrawRegionControls()
        {
            GUILayout.Label("REGION");
            GUILayout.BeginHorizontal();
            if (GUILayout.Button("TOWN")) MoveTo("town");
            if (GUILayout.Button("FIELD 1")) MoveTo("field-1");
            GUILayout.EndHorizontal();

            GUILayout.BeginHorizontal();
            GUI.enabled = _core.Player.level >= 2;
            if (GUILayout.Button("FIELD 2")) MoveTo("field-2");
            GUI.enabled = _core.Player.level >= 4;
            if (GUILayout.Button("FIELD 3")) MoveTo("field-3");
            GUI.enabled = true;
            GUILayout.EndHorizontal();

            GUILayout.BeginHorizontal();
            GUI.enabled = _core.Player.level >= 5;
            if (GUILayout.Button("FIELD 4")) MoveTo("field-4");
            GUI.enabled = _core.Player.level >= 7;
            if (GUILayout.Button("FIELD 5")) MoveTo("field-5");
            GUI.enabled = true;
            GUILayout.EndHorizontal();

            GUILayout.BeginHorizontal();
            GUI.enabled = _core.Player.level >= 8;
            if (GUILayout.Button("FIELD 6")) MoveTo("field-6");
            GUI.enabled = _core.Player.level >= 11;
            if (GUILayout.Button("JUNGLE")) MoveTo("jungle");
            GUI.enabled = true;
            GUILayout.EndHorizontal();
        }

        private void DrawCombatControls()
        {
            GUILayout.Label("COMBAT");
            if (_enemy == null)
            {
                GUILayout.Label("No enemy. Move to a hunting field.");
                return;
            }

            GUILayout.Label($"ENEMY {_enemy.displayName} · LV {_enemy.level} · HP {_enemyHp}/{_enemy.maxHp} · ATK {_enemy.attack}");
            GUILayout.BeginHorizontal();

            GUILayout.Label("Use the fixed ATTACK button for the primary combat action.");
            if (GUILayout.Button("RETREAT")) MoveTo("town");
            GUILayout.EndHorizontal();
        }

        private void DrawPrimaryCombatActionButton()
        {
            // 마을에서도 동일한 실제 터치 버튼으로 사냥을 시작한다.
            // 첫 WebGL 화면에 버튼이 없어 모바일 QA 타깃이 사라지던 문제를 수정한다.
            var canEnterHunt = _enemy == null && _core != null && _core.Player.currentRegionId == "town";
            if (_enemy == null && !canEnterHunt) return;

            var actionRect = _actionButtonRect;

#if UNITY_WEBGL && !UNITY_EDITOR
            var qaMode = Application.absoluteURL.Contains("qa=1");
            if (qaMode && Event.current.type == EventType.Repaint && Time.unscaledTime >= _qaMobileTargetAt)
            {
                _qaMobileTargetAt = Time.unscaledTime + 0.5f;
                var center = actionRect.center;
                var normalizedX = Screen.width > 0 ? center.x / Screen.width : 0f;
                var normalizedY = Screen.height > 0 ? center.y / Screen.height : 0f;
                Debug.Log($"JAEWOON_UNITY_WEB_QA MOBILE_TARGET game=daechung-rpg role=action x={normalizedX:F4} y={normalizedY:F4}");
            }
#endif

            if (GUI.Button(actionRect, canEnterHunt ? "HUNT" : "ATTACK"))
            {
#if UNITY_WEBGL && !UNITY_EDITOR
                if (qaMode)
                {
                    Debug.Log("JAEWOON_UNITY_WEB_QA MOBILE_INPUT game=daechung-rpg role=action status=PASS");
                }
#endif
                if (canEnterHunt) MoveTo("field-1");
                else AttackEnemy();
            }
        }

        private void DrawTownControls()
        {
            if (_core.Player.currentRegionId != "town") return;

            GUILayout.Label("TOWN");
            GUILayout.Label("STORY · " + _core.GetStoryGuidance());
            GUILayout.BeginHorizontal();
            if (GUILayout.Button("FULL HEAL"))
            {
                _core.Player.currentHp = _core.GetMaxHp();
                _core.Save();
                _message = "Recovered to full HP in town.";
            }

            var ownsStarterWeapon = _core.Player.ownedWeapons.Contains("old-stone-sword");
            GUI.enabled = !ownsStarterWeapon && _core.Player.gold >= 100;
            if (GUILayout.Button(ownsStarterWeapon ? "STONE SWORD OWNED" : "BUY STONE SWORD · 100G"))
            {
                if (_core.TryBuyWeapon("old-stone-sword"))
                {
                    _message = "Purchased and equipped the old stone sword.";
                }
            }
            GUI.enabled = true;
            GUILayout.EndHorizontal();

            if (_core.Player.level >= 5 && _core.Player.job == JobType.None)
            {
                GUILayout.Label("JOB CHANGE");
                GUILayout.BeginHorizontal();
                if (GUILayout.Button("WARRIOR")) TryChangeJob(JobType.Warrior);
                if (GUILayout.Button("ARCHER")) TryChangeJob(JobType.Archer);
                if (GUILayout.Button("MAGE")) TryChangeJob(JobType.Mage);
                GUILayout.EndHorizontal();
            }
        }

        // 메인: 캐릭터별 대화는 실제 거리에 접근한 뒤 플레이어의 터치/승인으로만 진행한다.
        private void DrawSocialControls()
        {
            GUILayout.Label("VILLAGE LIFE / SOCIAL");
            if (_core.Player.currentRegionId != "town")
            {
                GUILayout.Label("마을에 돌아오면 주민들과 대화할 수 있어.");
                return;
            }
            GUILayout.Label(_core.GetStoryGuidance());
            for (var i = 0; i < ResidentIds.Length; i++)
            {
                var id = ResidentIds[i];
                var near = _visuals != null && _visuals.IsVillageResidentNearby(id);
                GUI.enabled = near;
                if (GUILayout.Button(ResidentNames[i] + (near ? " · 대화" : " · 이동 중")))
                    TalkWithResident(id);
                GUI.enabled = true;
            }
            if (_scoutInvitationPending)
            {
                GUILayout.Label("정찰병이 동행을 제안했다. 네트워크 협동 인원에는 포함되지 않는 비전투 NPC야.");
                GUILayout.BeginHorizontal();
                if (GUILayout.Button("동행 수락"))
                {
                    if (_core.TrySetScoutCompanion(true))
                    {
                        _visuals?.SetNarrativeCompanion(true);
                        _message = "정찰병이 함께 길을 걸어간다. 전투 보상·공격력과 멀티 인원은 변하지 않는다.";
                    }
                    _scoutInvitationPending = false;
                }
                if (GUILayout.Button("나중에")) _scoutInvitationPending = false;
                GUILayout.EndHorizontal();
            }
            else if (_core.Player.scoutAccompanying && GUILayout.Button("정찰병과 잠시 헤어지기"))
            {
                if (_core.TrySetScoutCompanion(false))
                {
                    _visuals?.SetNarrativeCompanion(false);
                    _message = "정찰병은 마을 일상으로 돌아간다.";
                }
            }
        }

        private void TalkWithResident(string id)
        {
            if (_core.Player.currentRegionId != "town" || _visuals == null || !_visuals.IsVillageResidentNearby(id))
            {
                _message = "상대가 가까이 걸어올 때 대화할 수 있어.";
                return;
            }
            _visuals.ReactVillageResident(id);
            _pendingResidentId = string.Empty;
            _nextResidentOfferAt = Time.unscaledTime + 18f;
            switch (id)
            {
                case "chief":
                    if (_core.HasStoryEvent("ogre-defeated") && _core.TryRecordStoryEvent("chief-ogre-report"))
                        _message = "촌장: 그 오우거를 쓰러뜨렸구나. 마을 사람들에게도 이 일을 전하마.";
                    else if (_core.TryRecordStoryEvent("chief-introduction"))
                        _message = "촌장: 균열의 흔적이 사냥터로 이어진다. 안전한 곳부터 연습하고 대장장이를 만나보게.";
                    else _message = "촌장: " + _core.GetStoryGuidance();
                    break;
                case "smith":
                    if (_core.TryRecordStoryEvent("smith-visit"))
                        _message = "대장장이: 철의 소리가 거칠어졌어. 균열 근처엔 강한 괴물이 있다더군. 장비를 확인해.";
                    else _message = "대장장이: 오래 쓰는 장비일수록 꼼꼼하게 살펴봐. 장비 구매는 마을 메뉴에서 할 수 있어.";
                    break;
                case "merchant":
                    _message = "상인: 무기와 갑옷은 마을 메뉴에서 준비하고, 자원이 모자라면 낮은 사냥터로 돌아가.";
                    break;
                case "scout":
                    if (!_core.HasStoryEvent("chief-introduction"))
                        _message = "정찰병: 먼저 촌장에게 인사해. 이 지역의 사정을 자세히 알고 계셔.";
                    else if (_core.Player.scoutAccompanying)
                        _message = "정찰병: 바쁜 길을 같이 걸어가자. 전투나 보상은 너의 선택 그대로야.";
                    else
                    {
                        _scoutInvitationPending = true;
                        _message = "정찰병: 사냥터로 가기 전에 같이 다닐래? 따라가며 위험한 곳을 알려줄게.";
                    }
                    break;
            }
        }

        // 연출: 컷신은 실제 보스 조우 사건에서만 시작하고 건너뛰기 가능하다.
        private void DrawStoryPrompt(Rect safe, float scale)
        {
            if (_bossSceneUntil > Time.unscaledTime)
            {
                var height = Mathf.Min(105f * scale, safe.height * 0.20f);
                var box = new Rect(safe.xMin + 10f, safe.yMin + safe.height * 0.31f,
                    Mathf.Max(1f, safe.width - 20f), height);
                GUI.Box(box, _bossSceneName + "\n" + _bossSceneDialogue);
                var skip = new Rect(safe.xMax - Mathf.Min(112f * scale, safe.width * 0.30f) - 10f,
                    box.yMax + 2f, Mathf.Min(112f * scale, safe.width * 0.30f), Mathf.Min(50f * scale, 56f));
                if (GUI.Button(skip, "SKIP"))
                {
                    _bossSceneUntil = 0f;
                    _visuals?.SkipBossReveal();
                }
            }
            if (_core.Player.currentRegionId != "town" || string.IsNullOrEmpty(_pendingResidentId)) return;
            if (_visuals == null || !_visuals.IsVillageResidentNearby(_pendingResidentId)) return;
            var left = _actionButtonRect.xMin - _actionButtonRect.width - 8f;
            if (left < safe.xMin + 8f) return;
            var prompt = new Rect(left, _actionButtonRect.y, _actionButtonRect.width, _actionButtonRect.height);
            if (GUI.Button(prompt, "TALK"))
            {
                _menuScrollPositions[_menuPage] = _scroll;
                _menuPage = 2;
                _scroll = _menuScrollPositions[_menuPage];
                TalkWithResident(_pendingResidentId);
            }
        }

        private void TryChangeJob(JobType job)
        {
            if (_core.TryChangeJob(job))
            {
                _message = $"Job changed to {job}.";
            }
        }

        private void MoveTo(string regionId)
        {
            if (string.IsNullOrEmpty(regionId) || !GameCatalog.Regions.TryGetValue(regionId, out var region))
            {
                _message = "That region is unavailable.";
                return;
            }
            if (regionId != "town" && _core.Player.level < region.recommendedLevelMin)
            {
                _message = $"Reach LV {region.recommendedLevelMin} to enter {region.displayName}.";
                return;
            }

            _core.SetRegion(regionId);
            // 이동 직후 관련 메뉴를 앞에 보여준다. 게임 상태·보상·저장 의미는 그대로 둔다.
            _menuScrollPositions[_menuPage] = _scroll;
            _menuPage = regionId == "town" ? 0 : 1;
            _scroll = _menuScrollPositions[_menuPage];
            _visuals?.SetRegionVisual(regionId);
            Debug.Log($"JAEWOON_UNITY_WEB_QA REGION game=daechung-rpg region={regionId}");
            _enemy = null;
            _enemyHp = 0;

            if (regionId == "town")
            {
                _visuals?.SetNarrativeCompanion(_core.Player.scoutAccompanying);
                _visuals?.ShowTown();
                _message = "Returned to town.";
                return;
            }

            SpawnFirstEnemyInCurrentRegion(false);
            _visuals?.ShowBattle();
            _visuals?.PlayTravelToBattle();
        }

        private void SpawnFirstEnemyInCurrentRegion(bool resetVisual = true, bool announceEncounter = true)
        {
            if (!GameCatalog.Regions.TryGetValue(_core.Player.currentRegionId, out var region) || region.enemies.Count == 0)
            {
                _enemy = null;
                _enemyHp = 0;
                _message = "This region has no combat encounter in the current slice.";
                if (resetVisual) _visuals?.ShowTown();
                return;
            }

            var enemyIndex = 0;
            if (_enemy != null)
            {
                var currentIndex = region.enemies.FindIndex(enemy => enemy.id == _enemy.id);
                if (currentIndex >= 0)
                {
                    enemyIndex = (currentIndex + 1) % region.enemies.Count;
                }
            }

            _enemy = region.enemies[enemyIndex];
            _enemyHp = _enemy.maxHp;
            _visuals?.SetEnemyIdentity(_enemy.id);
            if (announceEncounter)
            {
                _message = $"Encountered {_enemy.displayName}.";
            }
            if (resetVisual) _visuals?.ShowBattle();
            if (_enemy.id == "ogre" && _core.Player.currentRegionId == "field-6")
            {
                _core.TryRecordStoryEvent("ogre-sighted");
                if (_presentedBossScenes.Add("ogre-introduction"))
                {
                    _bossSceneName = "오우거 · 6번 사냥터";
                    _bossSceneDialogue = "감히 내 영역을 밟았느냐. 돌아갈 마지막 기회다.";
                    _bossSceneUntil = Time.unscaledTime + 3.5f;
                    _visuals?.PlayBossReveal();
                }
            }
        }

        private void AttackEnemy()
        {
            if (_enemy == null) return;

            var damage = _core.GetAttackPower();
            _enemyHp = Mathf.Max(0, _enemyHp - damage);
            _multiplayer?.ObserveAttack(_core.Player.currentRegionId, _enemy.id, damage, _enemyHp);
            Debug.Log($"JAEWOON_UNITY_WEB_QA ATTACK game=daechung-rpg damage={damage} enemy={_enemy.id} enemyHp={_enemyHp}");

            if (_enemyHp <= 0)
            {
                _visuals?.PlayCombatExchange(true, false);
                var defeated = _enemy;
                _multiplayer?.ObserveDefeat(_core.Player.currentRegionId, defeated.id);
                RewardEnemyDefeat(defeated);
                if (defeated.id == "ogre") _core.TryRecordStoryEvent("ogre-defeated");
                SpawnFirstEnemyInCurrentRegion(false, false);
                return;
            }

            _core.Player.currentHp -= _enemy.attack;
            var playerDefeated = _core.Player.currentHp <= 0;
            _visuals?.PlayCombatExchange(false, playerDefeated);

            if (playerDefeated)
            {
                _core.Player.currentHp = _core.GetMaxHp();
                _core.SetRegion("town");
                _menuScrollPositions[_menuPage] = _scroll;
                _menuPage = 0;
                _scroll = _menuScrollPositions[_menuPage];
                _visuals?.SetRegionVisual("town");
                _enemy = null;
                _enemyHp = 0;
                _core.Save();
                _message = "Defeated. Returned to town with full HP.";
                return;
            }

            _core.Save();
            _message = $"You dealt {damage}. Enemy countered for {_enemy.attack}.";
        }

        private void RewardEnemyDefeat(EnemyDefinition defeated)
        {
            var player = _core.Player;
            player.gold += defeated.goldReward;
            player.experience += defeated.experienceReward;

            var levelsGained = 0;
            while (player.experience >= ExperienceNeeded(player.level))
            {
                player.experience -= ExperienceNeeded(player.level);
                player.level += 1;
                player.baseMaxHp += 8;
                player.baseAttack += 2;
                player.currentHp = _core.GetMaxHp();
                levelsGained += 1;
            }

            _core.Save();
            Debug.Log($"JAEWOON_UNITY_WEB_QA REWARD game=daechung-rpg enemy={defeated.id} exp={defeated.experienceReward} gold={defeated.goldReward} level={player.level}");
            Debug.Log($"JAEWOON_UNITY_WEB_QA CORE_FUN game=daechung-rpg loop=combat_defeat_reward status=PASS enemy={defeated.id}");
            _message = levelsGained > 0
                ? $"Victory: +{defeated.experienceReward} EXP +{defeated.goldReward}G · LEVEL UP x{levelsGained}."
                : $"Victory: +{defeated.experienceReward} EXP +{defeated.goldReward}G.";
        }

        private static int ExperienceNeeded(int level)
        {
            return Mathf.Max(12, level * 18);
        }
    }
}
