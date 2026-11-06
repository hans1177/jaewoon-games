// 파일명: DungeonQaBridge.cs
// 역할: Unity Web 실게임 QA 모드에서 실제 던전 기능을 키보드 입력으로 검증한다.
using UnityEngine;
using System.Globalization;

namespace JaewoonGames.DungeonCompany
{
    public sealed class DungeonQaBridge : MonoBehaviour
    {
        private DungeonGame game;
        private bool active;
        private int lastGold;
        private int lastInfamy;
        private int lastWave;
        private int targetWidth;
        private int targetHeight;
        private static bool QaActive => Application.absoluteURL.Contains("qa=1");

        public static void ObserveCommand(bool touch, bool starting = false)
        {
            if (!QaActive) return;
            if (starting) Debug.Log("JAEWOON_UNITY_WEB_QA START game=dungeon-company region=dungeon status=PASS");
            Debug.Log("JAEWOON_UNITY_WEB_QA ACTION game=dungeon-company action=command-defense status=PASS");
            if (touch) Debug.Log("JAEWOON_UNITY_WEB_QA MOBILE_INPUT game=dungeon-company role=action status=PASS");
        }

        public static void ObserveDefenseReward(int gold, int infamy)
        {
            if (!QaActive || gold <= 0 || infamy <= 0) return;
            Debug.Log($"JAEWOON_UNITY_WEB_QA REWARD game=dungeon-company gold={gold} infamy={infamy} status=PASS");
            Debug.Log("JAEWOON_UNITY_WEB_QA CORE_FUN game=dungeon-company kind=defeat-invader-and-earn-reward status=PASS");
        }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void AutoCreate()
        {
            if (FindAnyObjectByType<DungeonQaBridge>() == null)
                new GameObject("DungeonQaBridge").AddComponent<DungeonQaBridge>();
        }

        private void Start()
        {
            active = Application.absoluteURL.Contains("qa=1");
            if (!active)
            {
                enabled = false;
                return;
            }

            game = FindAnyObjectByType<DungeonGame>();
            if (game == null) return;

            lastGold = game.State.gold;
            lastInfamy = game.State.infamy;
            lastWave = game.State.wave;
            Debug.Log("JAEWOON_UNITY_WEB_QA BOOT game=dungeon-company status=PASS");
            LogMobileTarget();
            LogState();
        }

        private void Update()
        {
            if (!active) return;
            if (game == null)
            {
                game = FindAnyObjectByType<DungeonGame>();
                if (game == null) return;
            }
            if (Screen.width != targetWidth || Screen.height != targetHeight) LogMobileTarget();

            if (Input.GetKeyDown(KeyCode.Alpha1))
            {
                PrepareStarterDefense();
                if (game.StartWave())
                    Debug.Log("JAEWOON_UNITY_WEB_QA START game=dungeon-company region=dungeon status=PASS");
                LogState();
            }

            if (Input.GetKeyDown(KeyCode.R))
            {
                game.QaSafeReturn();
                Debug.Log("JAEWOON_UNITY_WEB_QA RESET game=dungeon-company region=management status=PASS");
                LogState();
            }

            if (game.State.gold != lastGold || game.State.infamy != lastInfamy || game.State.wave != lastWave)
            {
                LogState();
            }
        }

        private void LogMobileTarget()
        {
            targetWidth = Screen.width;
            targetHeight = Screen.height;
            var center = DungeonUI.ActionRect().center;
            var x = (center.x / Mathf.Max(1, targetWidth)).ToString("F5", CultureInfo.InvariantCulture);
            var y = (center.y / Mathf.Max(1, targetHeight)).ToString("F5", CultureInfo.InvariantCulture);
            Debug.Log($"JAEWOON_UNITY_WEB_QA MOBILE_TARGET game=dungeon-company role=action x={x} y={y}");
        }

        private void PrepareStarterDefense()
        {
            var room = game.State.rooms[0];
            if (room.room == RoomType.Empty) game.BuildRoom(0, RoomType.Guard);
            room = game.State.rooms[0];
            if (room.monster == MonsterType.None) game.HireMonster(0, MonsterType.Slime);
            room = game.State.rooms[0];
            if (room.trap == TrapType.None) game.InstallTrap(0, TrapType.Spikes);
        }

        private void LogState()
        {
            lastGold = game.State.gold;
            lastInfamy = game.State.infamy;
            lastWave = game.State.wave;
            Debug.Log($"JAEWOON_UNITY_WEB_QA STATE game=dungeon-company gold={game.State.gold} infamy={game.State.infamy} wave={game.State.wave} core={game.State.coreHp} rooms={game.State.unlockedRooms}");
        }
    }

    public sealed partial class DungeonGame
    {
        public void QaSafeReturn()
        {
            WaveActive = false;
            HeroPresent = false;
            CurrentRoom = -1;
            HeroZ = -12f;
            phase = Phase.Idle;
            timer = 0f;
            Message = "관리 화면으로 복귀했어.";
            Save();
        }
    }
}
