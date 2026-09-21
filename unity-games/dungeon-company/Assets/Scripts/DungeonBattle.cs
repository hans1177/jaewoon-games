// 파일명: DungeonBattle.cs
// 역할: 던전 회사 침입 웨이브와 자동 전투
using UnityEngine;

namespace JaewoonGames.DungeonCompany
{
    public sealed partial class DungeonGame
    {
        private enum Phase { Idle, Spawn, Move, Fight, Core, End }
        private Phase phase;
        private int heroesLeft;
        private int heroesTotal;
        private float timer;
        private float moveFrom;
        private float moveTo;
        private float moveTime;
        private float moveDuration;

        private void Update()
        {
            if (!WaveActive) return;

            if (phase == Phase.Move)
            {
                moveTime += Time.deltaTime;
                var t = Mathf.Clamp01(moveTime / Mathf.Max(0.01f, moveDuration));
                HeroZ = Mathf.Lerp(moveFrom, moveTo, Mathf.SmoothStep(0f, 1f, t));
                if (t >= 1f) Arrive();
                return;
            }

            timer -= Time.deltaTime;
            if (timer > 0f) return;

            if (phase == Phase.Spawn) SpawnHero();
            else if (phase == Phase.Fight) Fight();
            else if (phase == Phase.Core) HitCore();
            else if (phase == Phase.End) FinishWave();
        }

        public bool StartWave()
        {
            if (WaveActive) return false;
            WaveActive = true;
            HeroPresent = false;
            CurrentRoom = -1;
            HeroZ = -12f;
            heroesTotal = Mathf.Clamp(2 + State.wave, 3, 7);
            heroesLeft = heroesTotal;
            for (var i = 0; i < MaxRooms; i++)
            {
                var r = State.rooms[i];
                monsterHp[i] = r.monster == MonsterType.None ? 0 : GetMonster(r.monster, r.monsterLevel).hp;
            }
            phase = Phase.Spawn;
            timer = 0.35f;
            Message = $"모험가 {heroesTotal}명이 침입 중이야.";
            return true;
        }

        private void SpawnHero()
        {
            if (heroesLeft <= 0) { phase = Phase.End; timer = 0.8f; return; }
            var fought = heroesTotal - heroesLeft;
            HeroMaxHp = 52 + State.wave * 16 + fought * 6;
            HeroHp = HeroMaxHp;
            HeroAttack = 8 + State.wave * 2 + fought;
            HeroPresent = true;
            CurrentRoom = 0;
            HeroZ = -12f;
            MoveTo(RoomZ(0), 0.7f);
            Message = $"모험가 등장 · HP {HeroHp}.";
        }

        private void Arrive()
        {
            if (!HeroPresent) return;
            if (CurrentRoom < 0 || CurrentRoom >= State.unlockedRooms)
            {
                phase = Phase.Core;
                timer = 0.35f;
                return;
            }

            var r = State.rooms[CurrentRoom];
            if (r.room == RoomType.Empty) { Advance(); return; }

            if (r.trap != TrapType.None)
            {
                var trap = GetTrap(r.trap, r.trapLevel);
                var damage = Mathf.RoundToInt(trap.damage * (r.room == RoomType.TrapLab ? 1.45f : 1f));
                HeroHp = Mathf.Max(0, HeroHp - damage);
                Message = $"{TrapName(r.trap)} 발동 · {damage} 피해.";
                if (HeroHp <= 0) { DefeatHero(); return; }
            }

            if (r.monster != MonsterType.None && monsterHp[CurrentRoom] > 0)
            {
                phase = Phase.Fight;
                timer = 0.45f;
            }
            else Advance();
        }

        private void Fight()
        {
            var r = State.rooms[CurrentRoom];
            if (r.monster == MonsterType.None || monsterHp[CurrentRoom] <= 0) { Advance(); return; }

            var m = GetMonster(r.monster, r.monsterLevel);
            var damage = Mathf.RoundToInt(m.attack * (r.room == RoomType.Guard ? 1.35f : 1f));
            monsterHp[CurrentRoom] = Mathf.Max(0, monsterHp[CurrentRoom] - HeroAttack);
            HeroHp = Mathf.Max(0, HeroHp - damage);

            if (HeroHp <= 0)
            {
                Message = $"{MonsterName(r.monster)}가 침입자를 처치했어.";
                DefeatHero();
                return;
            }

            if (monsterHp[CurrentRoom] <= 0)
            {
                Message = $"{MonsterName(r.monster)}가 쓰러졌어. 침입자 HP {HeroHp}.";
                Advance();
                return;
            }

            Message = $"교전 중 · 침입자 {HeroHp}HP / {MonsterName(r.monster)} {monsterHp[CurrentRoom]}HP.";
            phase = Phase.Fight;
            timer = 0.72f;
        }

        private void Advance()
        {
            CurrentRoom++;
            if (CurrentRoom >= State.unlockedRooms) MoveTo(11.5f, 0.65f);
            else MoveTo(RoomZ(CurrentRoom), 0.62f);
        }

        private void HitCore()
        {
            var damage = Mathf.Clamp(HeroAttack + State.wave * 2, 8, 35);
            var loss = Mathf.Min(State.gold, 8 + State.wave * 4);
            State.coreHp = Mathf.Max(0, State.coreHp - damage);
            State.gold -= loss;
            Message = $"던전 핵 피격 · HP -{damage}, 골드 -{loss}.";

            if (State.coreHp <= 0)
            {
                State.coreHp = 100;
                State.gold = Mathf.Max(90, State.gold / 2);
                State.infamy = Mathf.Max(0, State.infamy - 15);
                Message = "던전 핵 파괴! 긴급 복구로 자산 절반을 잃었어.";
            }

            HeroPresent = false;
            heroesLeft--;
            Save();
            phase = Phase.Spawn;
            timer = 0.8f;
        }

        private void DefeatHero()
        {
            var vaults = 0;
            for (var i = 0; i < State.unlockedRooms; i++) if (State.rooms[i].room == RoomType.Vault) vaults++;
            var reward = Mathf.RoundToInt((18 + State.wave * 6) * (1f + vaults * 0.12f));
            var infamy = 3 + Mathf.CeilToInt(State.wave * 0.7f);
            State.gold += reward;
            State.infamy += infamy;
            HeroPresent = false;
            heroesLeft--;
            Save();
            Message = $"침입자 처치 · +{reward}G / 악명 +{infamy}.";
            phase = Phase.Spawn;
            timer = 0.75f;
        }

        private void FinishWave()
        {
            WaveActive = false;
            HeroPresent = false;
            CurrentRoom = -1;
            HeroZ = -12f;
            State.wave++;
            State.coreHp = Mathf.Min(100, State.coreHp + 8);
            Save();
            Message = $"웨이브 방어 완료. 다음은 WAVE {State.wave}.";
            phase = Phase.Idle;
        }

        private void MoveTo(float z, float duration)
        {
            moveFrom = HeroZ;
            moveTo = z;
            moveTime = 0f;
            moveDuration = duration;
            phase = Phase.Move;
        }

        private static float RoomZ(int index) => -8f + index * 4f;
    }
}
