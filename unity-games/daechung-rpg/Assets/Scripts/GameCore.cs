// 파일명: GameCore.cs
// 역할: 대충 RPG Unity 재개발의 핵심 상태·데이터·세이브 모델
using System;
using System.Collections.Generic;
using UnityEngine;

namespace JaewoonGames.DaechungRpg
{
    public enum JobType
    {
        None,
        Warrior,
        Archer,
        Mage
    }

    [Serializable]
    public sealed class PlayerState
    {
        public int level = 1;
        public int gold;
        public int experience;
        public int baseMaxHp = 100;
        public int currentHp = 100;
        public int baseAttack = 3;
        public string currentRegionId = "town";
        public string equippedWeaponId = "bare-hands";
        public string equippedArmorId = "none";
        public JobType job = JobType.None;
        public int mainQuestStep;
        public List<string> ownedWeapons = new();
        public List<string> ownedArmors = new();
        public List<string> completedHiddenQuests = new();
    }

    [Serializable]
    public sealed class EnemyDefinition
    {
        public string id;
        public string displayName;
        public int level;
        public int maxHp;
        public int attack;
        public float moveSpeed;
        public int experienceReward;
        public int goldReward;
    }

    [Serializable]
    public sealed class RegionDefinition
    {
        public string id;
        public string displayName;
        public int recommendedLevelMin;
        public int recommendedLevelMax;
        public List<EnemyDefinition> enemies = new();
    }

    [Serializable]
    public sealed class WeaponDefinition
    {
        public string id;
        public string displayName;
        public int price;
        public int damage;
        public float attackCooldown;
        public bool hidden;
    }

    [Serializable]
    public sealed class ArmorDefinition
    {
        public string id;
        public string displayName;
        public int price;
        public int bonusHp;
    }

    [Serializable]
    public sealed class QuestDefinition
    {
        public string id;
        public string title;
        public string description;
        public int goldReward;
    }

    [Serializable]
    public sealed class GameSaveData
    {
        public int version = 1;
        public PlayerState player = new();
    }

    public static class GameCatalog
    {
        public static readonly IReadOnlyDictionary<string, WeaponDefinition> Weapons =
            new Dictionary<string, WeaponDefinition>
            {
                ["old-stone-sword"] = new() { id = "old-stone-sword", displayName = "낡은 돌검", price = 100, damage = 5, attackCooldown = 0.35f },
                ["iron-axe"] = new() { id = "iron-axe", displayName = "철 도끼", price = 500, damage = 40, attackCooldown = 0.5f },
                ["iron-dual"] = new() { id = "iron-dual", displayName = "철 쌍검", price = 700, damage = 20, attackCooldown = 0.35f },
                ["iron-hammer"] = new() { id = "iron-hammer", displayName = "철 망치", price = 500, damage = 40, attackCooldown = 1f },
                ["steel-greatsword"] = new() { id = "steel-greatsword", displayName = "강철 대검", price = 700, damage = 50, attackCooldown = 1f },
                ["steel-dual"] = new() { id = "steel-dual", displayName = "강철 쌍검", price = 1000, damage = 35, attackCooldown = 0.35f },
                ["ice-greatsword"] = new() { id = "ice-greatsword", displayName = "빙결 대검", price = 2200, damage = 75, attackCooldown = 0.8f, hidden = true },
                ["cursed-dual"] = new() { id = "cursed-dual", displayName = "저주 쌍검", price = 2600, damage = 65, attackCooldown = 0.32f, hidden = true },
                ["reaper-scythe"] = new() { id = "reaper-scythe", displayName = "사신의 낫", price = 3000, damage = 95, attackCooldown = 1f, hidden = true }
            };

        public static readonly IReadOnlyDictionary<string, ArmorDefinition> Armors =
            new Dictionary<string, ArmorDefinition>
            {
                ["wood-armor"] = new() { id = "wood-armor", displayName = "나무 갑옷", price = 50, bonusHp = 50 },
                ["iron-armor"] = new() { id = "iron-armor", displayName = "철 갑옷", price = 200, bonusHp = 200 },
                ["steel-armor"] = new() { id = "steel-armor", displayName = "강철 갑옷", price = 500, bonusHp = 400 }
            };

        public static readonly IReadOnlyDictionary<string, RegionDefinition> Regions = BuildRegions();

        private static IReadOnlyDictionary<string, RegionDefinition> BuildRegions()
        {
            var regions = new Dictionary<string, RegionDefinition>
            {
                ["town"] = Region("town", "마을", 1, 1),
                ["field-1"] = Region("field-1", "1번 사냥터", 1, 1, Enemy("green-slime", "초록 슬라임", 1, 30, 4, 40f, 6, 3)),
                ["field-2"] = Region("field-2", "2번 사냥터", 2, 3,
                    Enemy("blue-slime", "파란 슬라임", 2, 56, 6, 44f, 9, 5),
                    Enemy("boar", "들멧돼지", 3, 88, 9, 55f, 13, 7)),
                ["field-3"] = Region("field-3", "3번 사냥터", 4, 4, Enemy("gray-wolf", "회색 늑대", 4, 136, 12, 68f, 18, 10)),
                ["field-4"] = Region("field-4", "4번 사냥터", 5, 6,
                    Enemy("orc", "오크", 5, 200, 15, 48f, 24, 14),
                    Enemy("red-wolf", "붉은 늑대", 6, 270, 19, 73f, 31, 18)),
                ["field-5"] = Region("field-5", "5번 사냥터", 7, 8,
                    Enemy("rift-knight", "균열 기사", 7, 380, 24, 56f, 42, 25),
                    Enemy("rift-demon", "균열 악마", 8, 500, 30, 61f, 55, 32)),
                ["field-6"] = Region("field-6", "6번 사냥터", 8, 10,
                    Enemy("skeleton", "해골 전사", 8, 650, 32, 58f, 65, 38),
                    Enemy("elite-goblin", "고블린 정예", 9, 850, 38, 65f, 80, 48),
                    Enemy("ogre", "오우거", 10, 1100, 45, 50f, 100, 60)),
                ["jungle"] = Region("jungle", "7번 정글", 11, 12,
                    Enemy("jungle-tiger", "정글 호랑이", 11, 1250, 48, 76f, 125, 72),
                    Enemy("primitive-warrior", "원시인 전사", 11, 1450, 52, 58f, 138, 78),
                    Enemy("jungle-panther", "정글 표범", 12, 1700, 58, 82f, 155, 88)),
                ["ruined-village"] = Region("ruined-village", "8번 폐허 마을", 13, 15),
                ["graveyard"] = Region("graveyard", "9번 공동묘지", 16, 20),
                ["frozen-mountain"] = Region("frozen-mountain", "10번 빙결 설산", 21, 23),
                ["cursed-castle"] = Region("cursed-castle", "11번 저주받은 성", 24, 27),
                ["cliff"] = Region("cliff", "절벽 지대", 10, 12),
                ["amazon"] = Region("amazon", "아마존", 9, 10),
                ["mountain"] = Region("mountain", "산 등반길", 14, 16),
                ["summit"] = Region("summit", "산 꼭대기", 16, 16)
            };
            return regions;
        }

        private static RegionDefinition Region(string id, string name, int min, int max, params EnemyDefinition[] enemies)
        {
            return new RegionDefinition
            {
                id = id,
                displayName = name,
                recommendedLevelMin = min,
                recommendedLevelMax = max,
                enemies = new List<EnemyDefinition>(enemies)
            };
        }

        private static EnemyDefinition Enemy(string id, string name, int level, int hp, int attack, float speed, int xp, int gold)
        {
            return new EnemyDefinition
            {
                id = id,
                displayName = name,
                level = level,
                maxHp = hp,
                attack = attack,
                moveSpeed = speed,
                experienceReward = xp,
                goldReward = gold
            };
        }
    }

    public sealed class GameCore : MonoBehaviour
    {
        private const string SaveKey = "daechung-rpg-save-v1";

        public PlayerState Player { get; private set; } = new();

        private void Awake()
        {
            DontDestroyOnLoad(gameObject);
            Load();
        }

        public int GetMaxHp()
        {
            var bonus = GameCatalog.Armors.TryGetValue(Player.equippedArmorId, out var armor) ? armor.bonusHp : 0;
            var maxHp = Player.baseMaxHp + bonus;
            if (Player.completedHiddenQuests.Contains("mountain-blessing"))
            {
                maxHp = Mathf.FloorToInt(maxHp * 1.3f);
            }
            return Mathf.Max(1, maxHp);
        }

        public int GetAttackPower()
        {
            var weaponDamage = GameCatalog.Weapons.TryGetValue(Player.equippedWeaponId, out var weapon) ? weapon.damage : 0;
            var attack = Player.baseAttack + weaponDamage;
            if (Player.job == JobType.Archer)
            {
                attack = Mathf.RoundToInt(attack * 1.5f);
            }
            if (Player.completedHiddenQuests.Contains("mountain-blessing"))
            {
                attack = Mathf.RoundToInt(attack * 1.5f);
            }
            return Mathf.Max(1, attack);
        }

        public bool TryBuyWeapon(string weaponId)
        {
            if (!GameCatalog.Weapons.TryGetValue(weaponId, out var weapon) || weapon.hidden || Player.ownedWeapons.Contains(weaponId) || Player.gold < weapon.price)
            {
                return false;
            }
            Player.gold -= weapon.price;
            if (!Player.ownedWeapons.Contains(weaponId))
            {
                Player.ownedWeapons.Add(weaponId);
            }
            Player.equippedWeaponId = weaponId;
            Save();
            return true;
        }

        public bool TryBuyArmor(string armorId)
        {
            if (!GameCatalog.Armors.TryGetValue(armorId, out var armor) || Player.ownedArmors.Contains(armorId) || Player.gold < armor.price)
            {
                return false;
            }
            Player.gold -= armor.price;
            if (!Player.ownedArmors.Contains(armorId))
            {
                Player.ownedArmors.Add(armorId);
            }
            Player.equippedArmorId = armorId;
            Player.currentHp = Mathf.Min(Player.currentHp, GetMaxHp());
            Save();
            return true;
        }

        public bool TryChangeJob(JobType job)
        {
            if (Player.level < 5 || Player.job != JobType.None || job == JobType.None || !Enum.IsDefined(typeof(JobType), job))
            {
                return false;
            }
            Player.job = job;
            Player.currentHp = Mathf.Min(Player.currentHp, GetMaxHp());
            Save();
            return true;
        }

        public void SetRegion(string regionId)
        {
            if (!GameCatalog.Regions.ContainsKey(regionId))
            {
                return;
            }
            Player.currentRegionId = regionId;
            Save();
        }

        public void Save()
        {
            var data = new GameSaveData { player = Player };
            PlayerPrefs.SetString(SaveKey, JsonUtility.ToJson(data));
            PlayerPrefs.Save();
        }

        public void Load()
        {
            if (!PlayerPrefs.HasKey(SaveKey))
            {
                Player = new PlayerState();
                return;
            }

            try
            {
                var data = JsonUtility.FromJson<GameSaveData>(PlayerPrefs.GetString(SaveKey));
                Player = data?.player ?? new PlayerState();

                if (Player.level < 1)
                {
                    Player.level = 1;
                }
                if (Player.gold < 0)
                {
                    Player.gold = 0;
                }
                if (Player.experience < 0)
                {
                    Player.experience = 0;
                }
                if (Player.mainQuestStep < 0)
                {
                    Player.mainQuestStep = 0;
                }
                if (Player.baseMaxHp <= 0)
                {
                    Player.baseMaxHp = 100;
                }
                if (Player.baseAttack <= 0)
                {
                    Player.baseAttack = 3;
                }
                if (!Enum.IsDefined(typeof(JobType), Player.job))
                {
                    Player.job = JobType.None;
                }
                if (Player.ownedWeapons == null)
                {
                    Player.ownedWeapons = new List<string>();
                }
                if (Player.ownedArmors == null)
                {
                    Player.ownedArmors = new List<string>();
                }
                if (Player.completedHiddenQuests == null)
                {
                    Player.completedHiddenQuests = new List<string>();
                }
                if (string.IsNullOrEmpty(Player.currentRegionId) || !GameCatalog.Regions.ContainsKey(Player.currentRegionId))
                {
                    Player.currentRegionId = "town";
                }
                if (string.IsNullOrEmpty(Player.equippedWeaponId) ||
                    (Player.equippedWeaponId != "bare-hands" && !GameCatalog.Weapons.ContainsKey(Player.equippedWeaponId)))
                {
                    Player.equippedWeaponId = "bare-hands";
                }
                if (string.IsNullOrEmpty(Player.equippedArmorId) ||
                    (Player.equippedArmorId != "none" && !GameCatalog.Armors.ContainsKey(Player.equippedArmorId)))
                {
                    Player.equippedArmorId = "none";
                }

                Player.currentHp = Mathf.Clamp(Player.currentHp, 1, GetMaxHp());
            }
            catch (Exception)
            {
                Player = new PlayerState();
            }
        }
    }
}
