// 파일명: DungeonGame.cs
// 역할: 던전 회사 상태, 건설, 강화, 저장
using System;
using System.Collections.Generic;
using UnityEngine;

namespace JaewoonGames.DungeonCompany
{
    public enum RoomType { Empty, Guard, TrapLab, Vault }
    public enum MonsterType { None, Slime, Goblin, Skeleton }
    public enum TrapType { None, Spikes, Darts, Flame }

    [Serializable]
    public sealed class RoomState
    {
        public RoomType room = RoomType.Empty;
        public MonsterType monster = MonsterType.None;
        public TrapType trap = TrapType.None;
        public int monsterLevel = 1;
        public int trapLevel = 1;
    }

    [Serializable]
    public sealed class SaveState
    {
        public int version = 1;
        public int gold = 320;
        public int infamy;
        public int wave = 1;
        public int coreHp = 100;
        public int unlockedRooms = 3;
        public List<RoomState> rooms = new();
    }

    public readonly struct MonsterStat
    {
        public readonly int cost;
        public readonly int hp;
        public readonly int attack;
        public MonsterStat(int cost, int hp, int attack) { this.cost = cost; this.hp = hp; this.attack = attack; }
    }

    public readonly struct TrapStat
    {
        public readonly int cost;
        public readonly int damage;
        public TrapStat(int cost, int damage) { this.cost = cost; this.damage = damage; }
    }

    public sealed partial class DungeonGame : MonoBehaviour
    {
        private const string SaveKey = "dungeon-company-save-v1";
        public const int MaxRooms = 5;

        public SaveState State { get; private set; }
        public bool WaveActive { get; private set; }
        public bool HeroPresent { get; private set; }
        public int HeroHp { get; private set; }
        public int HeroMaxHp { get; private set; }
        public int HeroAttack { get; private set; }
        public int CurrentRoom { get; private set; } = -1;
        public float HeroZ { get; private set; } = -12f;
        public string Message { get; private set; } = "방을 꾸미고 첫 침입을 시작해.";

        private readonly int[] monsterHp = new int[MaxRooms];

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        private static void AutoCreate()
        {
            if (FindFirstObjectByType<DungeonGame>() == null)
                new GameObject("DungeonGame").AddComponent<DungeonGame>();
        }

        private void Awake()
        {
            DontDestroyOnLoad(gameObject);
            Load();
            Application.targetFrameRate = 60;
        }

        public bool BuildRoom(int index, RoomType type)
        {
            if (!CanEdit(index) || type == RoomType.Empty || State.rooms[index].room != RoomType.Empty) return false;
            var cost = RoomCost(type);
            if (State.gold < cost) return Fail($"방 건설에 {cost}G 필요해.");
            State.gold -= cost;
            State.rooms[index].room = type;
            Message = $"{RoomName(type)} 완성.";
            Save();
            return true;
        }

        public bool HireMonster(int index, MonsterType type)
        {
            if (!CanEdit(index) || type == MonsterType.None) return false;
            var r = State.rooms[index];
            if (r.room == RoomType.Empty || r.monster != MonsterType.None) return false;
            var stat = GetMonster(type, 1);
            if (State.gold < stat.cost) return Fail($"고용비 {stat.cost}G가 필요해.");
            State.gold -= stat.cost;
            r.monster = type;
            r.monsterLevel = 1;
            Message = $"{MonsterName(type)} 고용 완료.";
            Save();
            return true;
        }

        public bool InstallTrap(int index, TrapType type)
        {
            if (!CanEdit(index) || type == TrapType.None) return false;
            var r = State.rooms[index];
            if (r.room == RoomType.Empty || r.trap != TrapType.None) return false;
            var stat = GetTrap(type, 1);
            if (State.gold < stat.cost) return Fail($"설치비 {stat.cost}G가 필요해.");
            State.gold -= stat.cost;
            r.trap = type;
            r.trapLevel = 1;
            Message = $"{TrapName(type)} 설치 완료.";
            Save();
            return true;
        }

        public bool UpgradeMonster(int index)
        {
            if (!CanEdit(index)) return false;
            var r = State.rooms[index];
            if (r.monster == MonsterType.None || r.monsterLevel >= 5) return false;
            var cost = 45 + r.monsterLevel * 35;
            if (State.gold < cost) return Fail($"몬스터 강화에 {cost}G 필요해.");
            State.gold -= cost;
            r.monsterLevel++;
            Message = $"{MonsterName(r.monster)} LV {r.monsterLevel}.";
            Save();
            return true;
        }

        public bool UpgradeTrap(int index)
        {
            if (!CanEdit(index)) return false;
            var r = State.rooms[index];
            if (r.trap == TrapType.None || r.trapLevel >= 5) return false;
            var cost = 35 + r.trapLevel * 30;
            if (State.gold < cost) return Fail($"함정 강화에 {cost}G 필요해.");
            State.gold -= cost;
            r.trapLevel++;
            Message = $"{TrapName(r.trap)} LV {r.trapLevel}.";
            Save();
            return true;
        }

        public bool Expand()
        {
            if (WaveActive || State.unlockedRooms >= MaxRooms) return false;
            var cost = State.unlockedRooms == 3 ? 180 : 320;
            if (State.gold < cost) return Fail($"던전 확장에 {cost}G 필요해.");
            State.gold -= cost;
            State.unlockedRooms++;
            Message = $"던전이 {State.unlockedRooms}개 방으로 확장됐어.";
            Save();
            return true;
        }

        public void ResetSave()
        {
            if (WaveActive) return;
            PlayerPrefs.DeleteKey(SaveKey);
            State = DefaultState();
            Save();
            Message = "새 던전 회사를 시작했어.";
        }

        public int GetMonsterHp(int index) => index >= 0 && index < MaxRooms ? Mathf.Max(0, monsterHp[index]) : 0;

        public static int RoomCost(RoomType type) => type switch
        {
            RoomType.Guard => 50, RoomType.TrapLab => 65, RoomType.Vault => 80, _ => 0
        };

        public static MonsterStat GetMonster(MonsterType type, int level)
        {
            var s = 1f + (Mathf.Clamp(level, 1, 5) - 1) * 0.42f;
            return type switch
            {
                MonsterType.Slime => new MonsterStat(45, Mathf.RoundToInt(55 * s), Mathf.RoundToInt(8 * s)),
                MonsterType.Goblin => new MonsterStat(80, Mathf.RoundToInt(85 * s), Mathf.RoundToInt(13 * s)),
                MonsterType.Skeleton => new MonsterStat(125, Mathf.RoundToInt(125 * s), Mathf.RoundToInt(19 * s)),
                _ => new MonsterStat(0, 0, 0)
            };
        }

        public static TrapStat GetTrap(TrapType type, int level)
        {
            var s = 1f + (Mathf.Clamp(level, 1, 5) - 1) * 0.5f;
            return type switch
            {
                TrapType.Spikes => new TrapStat(35, Mathf.RoundToInt(18 * s)),
                TrapType.Darts => new TrapStat(65, Mathf.RoundToInt(30 * s)),
                TrapType.Flame => new TrapStat(105, Mathf.RoundToInt(46 * s)),
                _ => new TrapStat(0, 0)
            };
        }

        public static string RoomName(RoomType type) => type switch
        {
            RoomType.Guard => "경비실", RoomType.TrapLab => "함정 공방", RoomType.Vault => "보물방", _ => "빈 방"
        };

        public static string MonsterName(MonsterType type) => type switch
        {
            MonsterType.Slime => "슬라임", MonsterType.Goblin => "고블린", MonsterType.Skeleton => "해골 전사", _ => "없음"
        };

        public static string TrapName(TrapType type) => type switch
        {
            TrapType.Spikes => "가시 함정", TrapType.Darts => "화살 함정", TrapType.Flame => "화염 함정", _ => "없음"
        };

        private bool CanEdit(int index) => !WaveActive && index >= 0 && index < State.unlockedRooms;
        private bool Fail(string message) { Message = message; return false; }

        private void Save()
        {
            Normalize();
            PlayerPrefs.SetString(SaveKey, JsonUtility.ToJson(State));
            PlayerPrefs.Save();
        }

        private void Load()
        {
            if (!PlayerPrefs.HasKey(SaveKey)) { State = DefaultState(); return; }
            try { State = JsonUtility.FromJson<SaveState>(PlayerPrefs.GetString(SaveKey)); }
            catch { State = null; }
            if (State == null) State = DefaultState();
            Normalize();
        }

        private void Normalize()
        {
            State ??= DefaultState();
            State.gold = Mathf.Max(0, State.gold);
            State.infamy = Mathf.Max(0, State.infamy);
            State.wave = Mathf.Max(1, State.wave);
            State.coreHp = Mathf.Clamp(State.coreHp, 1, 100);
            State.unlockedRooms = Mathf.Clamp(State.unlockedRooms, 3, MaxRooms);
            State.rooms ??= new List<RoomState>();
            while (State.rooms.Count < MaxRooms) State.rooms.Add(new RoomState());
            if (State.rooms.Count > MaxRooms) State.rooms.RemoveRange(MaxRooms, State.rooms.Count - MaxRooms);
            for (var i = 0; i < State.rooms.Count; i++)
            {
                State.rooms[i] ??= new RoomState();
                var r = State.rooms[i];
                r.monsterLevel = Mathf.Clamp(r.monsterLevel, 1, 5);
                r.trapLevel = Mathf.Clamp(r.trapLevel, 1, 5);
                if (r.room == RoomType.Empty) { r.monster = MonsterType.None; r.trap = TrapType.None; }
            }
        }

        private static SaveState DefaultState()
        {
            var s = new SaveState();
            for (var i = 0; i < MaxRooms; i++) s.rooms.Add(new RoomState());
            return s;
        }
    }
}
