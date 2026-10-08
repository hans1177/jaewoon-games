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
        // 저장: 기존 세이브 키/전투·보상 필드는 보존하고 기존 플레이어 상태의 선택형 이야기만 추가한다.
        public List<string> witnessedStoryEvents = new();
        // 실제 네트워크 협동 플레이어와 구별되는 비전투 NPC 동행 상태.
        public bool scoutAccompanying;
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

        // 메인: 게임 소스에서 실제 발생한 사건에만 연결되는 마을·보스 이야기.
        // 캐릭터 대사나 AI 추측 자체는 퀘스트 완료/재화/경험치/전투 상태를 바꿀 수 없다.
        public bool TryRecordStoryEvent(string eventId)
        {
            if (string.IsNullOrEmpty(eventId)) return false;
            Player.witnessedStoryEvents ??= new List<string>();
            if (Player.witnessedStoryEvents.Contains(eventId)) return false;
            bool town = Player.currentRegionId == "town";
            bool valid = eventId switch
            {
                "chief-introduction" => town,
                "smith-visit" => town && Player.witnessedStoryEvents.Contains("chief-introduction"),
                "ogre-sighted" => Player.currentRegionId == "field-6",
                "ogre-defeated" => Player.currentRegionId == "field-6" && Player.witnessedStoryEvents.Contains("ogre-sighted"),
                "chief-ogre-report" => town && Player.witnessedStoryEvents.Contains("ogre-defeated"),
                _ => false
            };
            if (!valid) return false;
            Player.witnessedStoryEvents.Add(eventId);
            Save();
            return true;
        }

        public bool HasStoryEvent(string eventId)
        {
            return Player.witnessedStoryEvents != null
                && !string.IsNullOrEmpty(eventId)
                && Player.witnessedStoryEvents.Contains(eventId);
        }

        public string GetStoryGuidance()
        {
            if (!HasStoryEvent("chief-introduction")) return "마을 주민들과 대화해 첫 단서를 얻자.";
            if (!HasStoryEvent("smith-visit")) return "대장장이에게 장비와 균열 소식을 물어보자.";
            if (!HasStoryEvent("ogre-sighted")) return "성장 후 6번 사냥터의 오우거를 조사하자.";
            if (!HasStoryEvent("ogre-defeated")) return "오우거를 처치해 마을의 위협을 줄이자.";
            if (!HasStoryEvent("chief-ogre-report")) return "촌장에게 돌아가 사건을 보고하자.";
            return "마을 사건의 한 고비를 넘겼다. 다음 지역을 탐험하자.";
        }

        public bool TrySetScoutCompanion(bool accompanying)
        {
            if (Player.currentRegionId != "town" || !HasStoryEvent("chief-introduction")) return false;
            if (Player.scoutAccompanying == accompanying) return true;
            Player.scoutAccompanying = accompanying;
            Save();
            return true;
        }

        public bool TryBuyWeapon(string weaponId)
        {
            if (string.IsNullOrEmpty(weaponId) || !GameCatalog.Weapons.TryGetValue(weaponId, out var weapon) || weapon.hidden || Player.ownedWeapons.Contains(weaponId) || Player.gold < weapon.price)
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
            if (string.IsNullOrEmpty(armorId) || !GameCatalog.Armors.TryGetValue(armorId, out var armor) || Player.ownedArmors.Contains(armorId) || Player.gold < armor.price)
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

        // 장비: 이미 보유한 원본 장비만 교체한다. 새 저장 키·별도 인벤토리·스탯 공식 없음.
        public bool TryEquipWeapon(string weaponId)
        {
            if (weaponId != "bare-hands" &&
                (string.IsNullOrEmpty(weaponId) || !GameCatalog.Weapons.ContainsKey(weaponId) ||
                 !Player.ownedWeapons.Contains(weaponId)))
                return false;
            if (Player.equippedWeaponId == weaponId) return true;
            Player.equippedWeaponId = weaponId;
            Save();
            return true;
        }

        public bool TryEquipArmor(string armorId)
        {
            if (armorId != "none" &&
                (string.IsNullOrEmpty(armorId) || !GameCatalog.Armors.ContainsKey(armorId) ||
                 !Player.ownedArmors.Contains(armorId)))
                return false;
            if (Player.equippedArmorId == armorId) return true;
            Player.equippedArmorId = armorId;
            Player.currentHp = Mathf.Min(Player.currentHp, GetMaxHp());
            Save();
            return true;
        }

        // 매매: 기존 GameCatalog.price를 매입·반품 기준가로 사용한다.
        // 숨겨진 보상 장비는 판매하지 않으며, 플레이어 소유 검증 후 같은 v1 저장 구조에 기록한다.
        // UI에서 제시한 골드나 아이템 수치는 절대 받지 않는다.
        public bool TrySellWeapon(string weaponId)
        {
            if (Player.currentRegionId != "town" || string.IsNullOrEmpty(weaponId) ||
                !GameCatalog.Weapons.TryGetValue(weaponId, out var weapon) || weapon.hidden ||
                !Player.ownedWeapons.Contains(weaponId) || Player.gold > int.MaxValue - weapon.price)
                return false;
            Player.ownedWeapons.Remove(weaponId);
            if (Player.equippedWeaponId == weaponId) Player.equippedWeaponId = "bare-hands";
            Player.gold += weapon.price;
            Save();
            return true;
        }

        public bool TrySellArmor(string armorId)
        {
            if (Player.currentRegionId != "town" || string.IsNullOrEmpty(armorId) ||
                !GameCatalog.Armors.TryGetValue(armorId, out var armor) ||
                !Player.ownedArmors.Contains(armorId) || Player.gold > int.MaxValue - armor.price)
                return false;
            Player.ownedArmors.Remove(armorId);
            if (Player.equippedArmorId == armorId) Player.equippedArmorId = "none";
            Player.currentHp = Mathf.Min(Player.currentHp, GetMaxHp());
            Player.gold += armor.price;
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
            if (string.IsNullOrEmpty(regionId) || !GameCatalog.Regions.ContainsKey(regionId))
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
                // 유틸: 이전 v1 저장은 새 스토리 기록이 없어도 기존 진행/장비/보상을 유지한다.
                if (Player.witnessedStoryEvents == null)
                {
                    Player.witnessedStoryEvents = new List<string>();
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
                if (Player.equippedWeaponId != "bare-hands" && !Player.ownedWeapons.Contains(Player.equippedWeaponId))
                {
                    Player.ownedWeapons.Add(Player.equippedWeaponId);
                }
                if (Player.equippedArmorId != "none" && !Player.ownedArmors.Contains(Player.equippedArmorId))
                {
                    Player.ownedArmors.Add(Player.equippedArmorId);
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
