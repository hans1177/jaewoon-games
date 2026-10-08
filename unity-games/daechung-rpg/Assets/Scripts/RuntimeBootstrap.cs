// 파일명: RuntimeBootstrap.cs
// 역할: 대충 RPG Unity 재개발의 Android 플레이 가능 초안
// 초안 그래픽: 검증된 무료 애니메이션 Pirate/Skeleton 에셋을 실제 전투 상태와 연결한다.

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
            var topHeight = Mathf.Min(194f * scale, safe.height * 0.29f);
            var controlsY = Mathf.Max(topY + topHeight + 12f, safe.yMin + safe.height * 0.50f);
            var tabsHeight = Mathf.Max(48f, 38f * scale);
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
            GUILayout.Label("DAECHUNG RPG · ANIMATED PROTOTYPE");
            if (safe.height > 560f)
                GUILayout.Label("Combat / growth / save / regions + verified animated actors");
            DrawPlayerStatus();
            GUILayout.Label("ASSET  " + (_visuals != null ? _visuals.StatusText : "STARTING"));
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
                GUILayout.Label("LOG");
                GUILayout.TextArea(_message, GUILayout.MinHeight(58f * scale));
            }
            GUILayout.EndScrollView();
            _menuScrollPositions[_menuPage] = _scroll;
            GUILayout.EndArea();

            // 하단 행동 버튼은 메뉴를 스크롤하거나 탭을 바꿔도 같은 위치에서 동작한다.
            DrawPrimaryCombatActionButton();
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
            _visuals?.SetRegionVisual(regionId);
            Debug.Log($"JAEWOON_UNITY_WEB_QA REGION game=daechung-rpg region={regionId}");
            _enemy = null;
            _enemyHp = 0;

            if (regionId == "town")
            {
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
