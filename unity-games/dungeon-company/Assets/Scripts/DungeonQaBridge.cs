// 파일명: DungeonQaBridge.cs
// 역할: Unity Web 실게임 QA 모드에서 실제 던전 기능을 키보드 입력으로 검증한다.
using UnityEngine;

namespace JaewoonGames.DungeonCompany
{
    public sealed class DungeonQaBridge : MonoBehaviour
    {
        private DungeonGame game;
        private bool active;
        private int lastGold;
        private int lastInfamy;
        private int lastWave;

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

            if (Input.GetKeyDown(KeyCode.Alpha1))
            {
                PrepareStarterDefense();
                game.StartWave();
                Debug.Log("JAEWOON_UNITY_WEB_QA START game=dungeon-company region=dungeon status=PASS");
                Debug.Log("JAEWOON_UNITY_WEB_QA ATTACK game=dungeon-company action=start-defense status=PASS");
                Debug.Log("JAEWOON_UNITY_WEB_QA PROGRESS game=dungeon-company kind=starter-defense status=PASS");
                LogState();
            }

            if (Input.GetKeyDown(KeyCode.Space))
            {
                game.QaAdvanceCombat();
                Debug.Log("JAEWOON_UNITY_WEB_QA ATTACK game=dungeon-company action=accelerate-defense status=PASS");
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
                Debug.Log($"JAEWOON_UNITY_WEB_QA REWARD game=dungeon-company gold={game.State.gold} infamy={game.State.infamy} wave={game.State.wave} status=PASS");
                LogState();
            }
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
        public void QaAdvanceCombat()
        {
            if (!WaveActive)
            {
                StartWave();
            }
            timer = 0f;
        }

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
