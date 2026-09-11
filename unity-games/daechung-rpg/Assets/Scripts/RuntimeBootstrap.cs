// 파일명: RuntimeBootstrap.cs
// 역할: 대충 RPG Unity 재개발의 Android 플레이 가능 초안
// 초안 그래픽: 검증된 무료 애니메이션 Pirate/Skeleton 에셋을 실제 전투 상태와 연결한다.

using UnityEngine;

namespace JaewoonGames.DaechungRpg
{
    public sealed class RuntimeBootstrap : MonoBehaviour
    {
        private GameCore _core;
        private EnemyDefinition _enemy;
        private int _enemyHp;
        private string _message = "Select a hunting field to begin.";
        private Vector2 _scroll;
        private PrototypeAnimatedVisuals _visuals;

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

        private void Start()
        {
            if (_core == null)
            {
                _core = Object.FindFirstObjectByType<GameCore>();
            }

            _visuals = PrototypeAnimatedVisuals.EnsureCreated();

            if (_core == null) return;

            if (_core.Player.currentRegionId != "town")
            {
                SpawnFirstEnemyInCurrentRegion();
            }
            else
            {
                _visuals.ShowTown();
            }
        }

        private void OnGUI()
        {
            if (_core == null)
            {
                GUI.Label(new Rect(24, 24, Screen.width - 48, 60), "GameCore is not ready.");
                return;
            }

            var scale = Mathf.Clamp(Screen.dpi > 0 ? Screen.dpi / 180f : 1.5f, 1.1f, 2f);
            var width = Mathf.Min(Screen.width - 24f, 760f * scale);
            var left = (Screen.width - width) * 0.5f;
            var topHeight = Mathf.Min(220f * scale, Screen.height * 0.29f);
            var controlsY = Screen.height * 0.60f;
            var controlsHeight = Mathf.Max(120f, Screen.height - controlsY - 12f);

            GUI.skin.label.fontSize = Mathf.RoundToInt(17f * scale);
            GUI.skin.button.fontSize = Mathf.RoundToInt(17f * scale);
            GUI.skin.box.fontSize = Mathf.RoundToInt(17f * scale);
            GUI.skin.button.fixedHeight = 46f * scale;

            GUILayout.BeginArea(new Rect(left, 12f, width, topHeight), GUI.skin.box);
            GUILayout.Label("DAECHUNG RPG · ANIMATED PROTOTYPE");
            GUILayout.Label("Combat / growth / save / regions + verified animated actors");
            DrawPlayerStatus();
            GUILayout.Label("ASSET  " + (_visuals != null ? _visuals.StatusText : "STARTING"));
            GUILayout.EndArea();

            GUILayout.BeginArea(new Rect(left, controlsY, width, controlsHeight), GUI.skin.box);
            _scroll = GUILayout.BeginScrollView(_scroll);

            DrawRegionControls();
            GUILayout.Space(6f * scale);
            DrawCombatControls();
            GUILayout.Space(6f * scale);
            DrawTownControls();
            GUILayout.Space(6f * scale);

            GUILayout.Label("LOG");
            GUILayout.TextArea(_message, GUILayout.MinHeight(58f * scale));

            GUILayout.EndScrollView();
            GUILayout.EndArea();
        }

        private void DrawPlayerStatus()
        {
            var player = _core.Player;
            var regionName = GameCatalog.Regions.TryGetValue(player.currentRegionId, out var region)
                ? region.displayName
                : player.currentRegionId;

            GUILayout.Label($"LV {player.level}   HP {player.currentHp}/{_core.GetMaxHp()}   ATK {_core.GetAttackPower()}");
            GUILayout.Label($"EXP {player.experience}/{ExperienceNeeded(player.level)}   GOLD {player.gold}");
            GUILayout.Label($"REGION {regionName}   JOB {player.job}");
            GUILayout.Label($"WEAPON {player.equippedWeaponId}   ARMOR {player.equippedArmorId}");
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
            if (GUILayout.Button("ATTACK")) AttackEnemy();
            if (GUILayout.Button("RETREAT")) MoveTo("town");
            GUILayout.EndHorizontal();
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

            var ownsWoodArmor = _core.Player.ownedArmors.Contains("wood-armor");
            GUI.enabled = !ownsWoodArmor && _core.Player.gold >= 50;
            if (GUILayout.Button(ownsWoodArmor ? "WOOD ARMOR OWNED" : "BUY WOOD ARMOR · 50G"))
            {
                if (_core.TryBuyArmor("wood-armor"))
                {
                    _message = "Purchased and equipped wood armor.";
                }
            }
            GUI.enabled = true;

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

            if (_enemyHp <= 0)
            {
                _visuals?.PlayCombatExchange(true, false);
                var defeated = _enemy;
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
