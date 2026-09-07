// 파일명: RuntimeBootstrap.cs
// 역할: 대충 RPG Unity 재개발의 첫 Android 플레이 가능 시스템 슬라이스
// 주의: 최종 그래픽이 아니라 전투/성장/저장/지역 루프와 클라우드 빌드를 검증하는 기술 테스트 UI다.
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

            if (_core != null && _core.Player.currentRegionId != "town")
            {
                SpawnFirstEnemyInCurrentRegion();
            }
        }

        private void OnGUI()
        {
            if (_core == null)
            {
                GUI.Label(new Rect(24, 24, Screen.width - 48, 60), "GameCore is not ready.");
                return;
            }

            var scale = Mathf.Clamp(Screen.dpi > 0 ? Screen.dpi / 180f : 1.5f, 1.15f, 2.1f);
            var width = Mathf.Min(Screen.width - 24f, 760f * scale);
            var height = Screen.height - 24f;
            var left = (Screen.width - width) * 0.5f;

            GUI.skin.label.fontSize = Mathf.RoundToInt(18f * scale);
            GUI.skin.button.fontSize = Mathf.RoundToInt(18f * scale);
            GUI.skin.box.fontSize = Mathf.RoundToInt(18f * scale);
            GUI.skin.button.fixedHeight = 52f * scale;

            GUILayout.BeginArea(new Rect(left, 12f, width, height), GUI.skin.box);
            _scroll = GUILayout.BeginScrollView(_scroll);

            GUILayout.Label("DAECHUNG RPG · UNITY ANDROID TEST");
            GUILayout.Label("Technical playable slice: combat / growth / save / region flow");
            GUILayout.Space(8f * scale);

            DrawPlayerStatus();
            GUILayout.Space(8f * scale);
            DrawRegionControls();
            GUILayout.Space(8f * scale);
            DrawCombatControls();
            GUILayout.Space(8f * scale);
            DrawTownControls();
            GUILayout.Space(8f * scale);

            GUILayout.Label("LOG");
            GUILayout.TextArea(_message, GUILayout.MinHeight(84f * scale));

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
            GUILayout.Label($"REGION {regionName}   JOB {player.job}   WEAPON {player.equippedWeaponId}");
        }

        private void DrawRegionControls()
        {
            GUILayout.Label("REGION");
            GUILayout.BeginHorizontal();
            if (GUILayout.Button("TOWN"))
            {
                MoveTo("town");
            }
            if (GUILayout.Button("FIELD 1"))
            {
                MoveTo("field-1");
            }
            GUILayout.EndHorizontal();

            GUILayout.BeginHorizontal();
            GUI.enabled = _core.Player.level >= 2;
            if (GUILayout.Button("FIELD 2"))
            {
                MoveTo("field-2");
            }
            GUI.enabled = _core.Player.level >= 4;
            if (GUILayout.Button("FIELD 3"))
            {
                MoveTo("field-3");
            }
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
            if (GUILayout.Button("ATTACK"))
            {
                AttackEnemy();
            }
            if (GUILayout.Button("RETREAT"))
            {
                MoveTo("town");
            }
            GUILayout.EndHorizontal();
        }

        private void DrawTownControls()
        {
            if (_core.Player.currentRegionId != "town")
            {
                return;
            }

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
            _core.SetRegion(regionId);
            _enemy = null;
            _enemyHp = 0;

            if (regionId == "town")
            {
                _message = "Returned to town.";
                return;
            }

            SpawnFirstEnemyInCurrentRegion();
        }

        private void SpawnFirstEnemyInCurrentRegion()
        {
            if (!GameCatalog.Regions.TryGetValue(_core.Player.currentRegionId, out var region) || region.enemies.Count == 0)
            {
                _enemy = null;
                _enemyHp = 0;
                _message = "This region has no combat encounter in the current slice.";
                return;
            }

            _enemy = region.enemies[0];
            _enemyHp = _enemy.maxHp;
            _message = $"Encountered {_enemy.displayName}.";
        }

        private void AttackEnemy()
        {
            if (_enemy == null)
            {
                return;
            }

            var damage = _core.GetAttackPower();
            _enemyHp = Mathf.Max(0, _enemyHp - damage);

            if (_enemyHp <= 0)
            {
                RewardEnemyDefeat(_enemy);
                SpawnFirstEnemyInCurrentRegion();
                return;
            }

            _core.Player.currentHp -= _enemy.attack;
            if (_core.Player.currentHp <= 0)
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
