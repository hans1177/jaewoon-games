// 파일명: DungeonUI.cs
// 역할: 던전 회사 모바일 운영 UI
using UnityEngine;

namespace JaewoonGames.DungeonCompany
{
    public sealed class DungeonUI : MonoBehaviour
    {
        private DungeonGame game;
        private int selected;
        private Vector2 scroll;
        private bool resetMenu;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void AutoCreate()
        {
            if (FindFirstObjectByType<DungeonUI>() == null)
                new GameObject("DungeonUI").AddComponent<DungeonUI>();
        }

        private void Awake() => DontDestroyOnLoad(gameObject);
        private void Start() => game = FindFirstObjectByType<DungeonGame>();

        private void OnGUI()
        {
            if (game == null) game = FindFirstObjectByType<DungeonGame>();
            if (game == null) return;

            var scale = Mathf.Clamp(Screen.dpi > 0 ? Screen.dpi / 190f : 1.35f, 1f, 1.8f);
            GUI.skin.label.fontSize = Mathf.RoundToInt(15f * scale);
            GUI.skin.button.fontSize = Mathf.RoundToInt(14f * scale);
            GUI.skin.box.fontSize = Mathf.RoundToInt(15f * scale);
            GUI.skin.button.fixedHeight = 40f * scale;

            var width = Mathf.Min(Screen.width - 16f, 700f * scale);
            var left = (Screen.width - width) * .5f;
            var topH = Mathf.Min(125f * scale, Screen.height * .25f);
            var bottomY = Screen.height * .55f;

            GUILayout.BeginArea(new Rect(left, 8, width, topH), GUI.skin.box);
            GUILayout.Label("던전 회사");
            GUILayout.Label($"GOLD {game.State.gold}   악명 {game.State.infamy}   WAVE {game.State.wave}   CORE {game.State.coreHp}/100");
            if (game.HeroPresent) GUILayout.Label($"침입자 HP {game.HeroHp}/{game.HeroMaxHp}   공격 {game.HeroAttack}");
            GUILayout.Label(game.Message);
            GUILayout.EndArea();

            GUILayout.BeginArea(new Rect(left, bottomY, width, Screen.height - bottomY - 8), GUI.skin.box);
            scroll = GUILayout.BeginScrollView(scroll);
            DrawRooms();
            GUILayout.Space(6f * scale);
            DrawSelectedRoom();
            GUILayout.Space(8f * scale);
            DrawWave();
            GUILayout.Space(8f * scale);
            DrawReset();
            GUILayout.EndScrollView();
            GUILayout.EndArea();
        }

        private void DrawRooms()
        {
            GUILayout.Label("방 선택");
            GUILayout.BeginHorizontal();
            for (var i = 0; i < DungeonGame.MaxRooms; i++)
            {
                var unlocked = i < game.State.unlockedRooms;
                GUI.enabled = unlocked;
                var name = unlocked ? ShortRoom(game.State.rooms[i].room) : "잠김";
                if (GUILayout.Button($"{i + 1}번\n{name}")) selected = i;
            }
            GUI.enabled = true;
            GUILayout.EndHorizontal();
            selected = Mathf.Clamp(selected, 0, game.State.unlockedRooms - 1);
        }

        private void DrawSelectedRoom()
        {
            var r = game.State.rooms[selected];
            GUILayout.Label($"{selected + 1}번 방 · {DungeonGame.RoomName(r.room)}");
            GUI.enabled = !game.WaveActive;

            if (r.room == RoomType.Empty)
            {
                GUILayout.BeginHorizontal();
                if (GUILayout.Button("경비실\n50G")) game.BuildRoom(selected, RoomType.Guard);
                if (GUILayout.Button("함정 공방\n65G")) game.BuildRoom(selected, RoomType.TrapLab);
                if (GUILayout.Button("보물방\n80G")) game.BuildRoom(selected, RoomType.Vault);
                GUILayout.EndHorizontal();
                GUI.enabled = true;
                return;
            }

            GUILayout.Label($"몬스터: {DungeonGame.MonsterName(r.monster)}" + (r.monster == MonsterType.None ? "" : $" LV {r.monsterLevel}"));
            if (r.monster == MonsterType.None)
            {
                GUILayout.BeginHorizontal();
                if (GUILayout.Button("슬라임\n45G")) game.HireMonster(selected, MonsterType.Slime);
                if (GUILayout.Button("고블린\n80G")) game.HireMonster(selected, MonsterType.Goblin);
                if (GUILayout.Button("해골\n125G")) game.HireMonster(selected, MonsterType.Skeleton);
                GUILayout.EndHorizontal();
            }
            else
            {
                var m = DungeonGame.GetMonster(r.monster, r.monsterLevel);
                GUILayout.Label($"HP {m.hp} / 공격 {m.attack}");
                GUI.enabled = !game.WaveActive && r.monsterLevel < 5;
                if (GUILayout.Button(r.monsterLevel >= 5 ? "몬스터 MAX" : $"몬스터 강화 · {45 + r.monsterLevel * 35}G"))
                    game.UpgradeMonster(selected);
            }

            GUI.enabled = !game.WaveActive;
            GUILayout.Label($"함정: {DungeonGame.TrapName(r.trap)}" + (r.trap == TrapType.None ? "" : $" LV {r.trapLevel}"));
            if (r.trap == TrapType.None)
            {
                GUILayout.BeginHorizontal();
                if (GUILayout.Button("가시\n35G")) game.InstallTrap(selected, TrapType.Spikes);
                if (GUILayout.Button("화살\n65G")) game.InstallTrap(selected, TrapType.Darts);
                if (GUILayout.Button("화염\n105G")) game.InstallTrap(selected, TrapType.Flame);
                GUILayout.EndHorizontal();
            }
            else
            {
                var t = DungeonGame.GetTrap(r.trap, r.trapLevel);
                GUILayout.Label($"함정 피해 {t.damage}");
                GUI.enabled = !game.WaveActive && r.trapLevel < 5;
                if (GUILayout.Button(r.trapLevel >= 5 ? "함정 MAX" : $"함정 강화 · {35 + r.trapLevel * 30}G"))
                    game.UpgradeTrap(selected);
            }
            GUI.enabled = true;
        }

        private void DrawWave()
        {
            GUI.enabled = !game.WaveActive;
            if (GUILayout.Button(game.WaveActive ? "침입 진행 중" : $"WAVE {game.State.wave} 침입 시작")) game.StartWave();

            if (game.State.unlockedRooms < DungeonGame.MaxRooms)
            {
                var cost = game.State.unlockedRooms == 3 ? 180 : 320;
                if (GUILayout.Button($"던전 확장 · {cost}G") && game.Expand()) selected = game.State.unlockedRooms - 1;
            }
            GUI.enabled = true;
        }

        private void DrawReset()
        {
            if (!resetMenu)
            {
                if (GUILayout.Button("초기화 메뉴")) resetMenu = true;
                return;
            }

            GUILayout.BeginHorizontal();
            GUI.enabled = !game.WaveActive;
            if (GUILayout.Button("저장 초기화"))
            {
                game.ResetSave();
                selected = 0;
                resetMenu = false;
            }
            GUI.enabled = true;
            if (GUILayout.Button("취소")) resetMenu = false;
            GUILayout.EndHorizontal();
        }

        private static string ShortRoom(RoomType type) => type switch
        {
            RoomType.Guard => "경비", RoomType.TrapLab => "공방", RoomType.Vault => "보물", _ => "빈방"
        };
    }
}
