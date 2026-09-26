// 파일명: JungleExpeditionGame.cs
// 역할: 정글 탐험대 전체 플레이 흐름 - 탐험, 조사, 전투, 장비, 저장, 최종 보스
using System;
using System.Collections.Generic;
using UnityEngine;

namespace JaewoonGames.JungleExpedition
{
    public sealed class JungleExpeditionGame : MonoBehaviour
    {
        private CharacterController player;
        private Transform playerVisual;
        private Camera cam;
        private readonly List<Enemy> enemies = new List<Enemy>();
        private readonly List<Sample> samples = new List<Sample>();
        private readonly List<GameObject> stageObjects = new List<GameObject>();

        private Vector2 moveInput;
        private Vector2 joyStart;
        private int joyFinger = -1;

        private int hp = 100;
        private int stage;
        private int jungleSamples;
        private int swampHerbs;
        private int ruinSeals;
        private int relics;
        private int kills;

        private bool hasMachete;
        private bool hasHook;
        private bool hasAntidote;
        private bool hasCamera = true;
        private bool hasBinoculars;
        private bool hasTracker;
        private bool hasTrap;
        private bool hasTranquilizer;

        private float attackCd;
        private float toolCd;
        private float hurtCd;
        private float noticeUntil;
        private string notice = "정글 흔적 3개를 조사해.";
        private Vector3 respawnPoint = new Vector3(0, 1.1f, -4f);
        private Enemy boss;
        private bool qaMode;
        private int qaProgress;
        private bool qaMode;
        private bool qaStartLogged;

        private const string SavePrefix = "jungle_expedition_";

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void Boot()
        {
            if (FindFirstObjectByType<JungleExpeditionGame>() != null) return;
            new GameObject("JungleExpeditionGame").AddComponent<JungleExpeditionGame>();
        }

        private void Start()
        {
            Application.targetFrameRate = 60;
            qaMode = Application.absoluteURL.Contains("qa=1");
            qaMode = Application.absoluteURL.Contains("qa=1");
            LoadGame();
            BuildWorld();
            SpawnPlayer();
            SpawnSamplesAndGear();
            SpawnEnemiesForStage();
            WarpToCheckpoint();
            if (qaMode)
            {
                AddEnemy("QA 탐사 표적", player.transform.position + new Vector3(0, 0, 1.7f), 20, 0, 0f, 0f, new Color(0.85f, 0.25f, 0.2f), PrimitiveType.Sphere, EnemyKind.Normal);
                Qa("BOOT game=jungle-expedition status=PASS");
                Qa("MOBILE_TARGET role=action x=0.88 y=0.90");
                QaState();
            }
            Show(Objective(), 4f);
            if (qaMode) { QaLog("BOOT game=jungle-expedition status=PASS"); QaLog("MOBILE_TARGET role=action x=0.88 y=0.92"); QaState(); }
        }

        private void Update()
        {
            attackCd -= Time.deltaTime;
            toolCd -= Time.deltaTime;
            hurtCd -= Time.deltaTime;

            if (qaMode && Input.GetKeyDown(KeyCode.Alpha1) && !qaStartLogged)
            {
                qaStartLogged = true;
                Qa("START region=jungle status=PASS");
            }
            if (qaMode && Input.GetKeyDown(KeyCode.R))
            {
                WarpToCheckpoint();
                Qa("RETURN region=checkpoint status=PASS");
                QaState();
            }

            ReadInput();
            MovePlayer();
            UpdateEnemies();
            UpdateCamera();
            CheckHazards();
            CheckProgress();
        }

        // =========================
        // 월드
        // =========================
        private void BuildWorld()
        {
            RenderSettings.ambientLight = new Color(0.38f, 0.46f, 0.34f);

            var sunGo = new GameObject("Sun");
            var sun = sunGo.AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.intensity = 1.15f;
            sun.transform.rotation = Quaternion.Euler(48f, -32f, 0f);

            MakeZone("정글 입구", 8f, 34f, new Color(0.16f, 0.42f, 0.15f));
            MakeZone("강가", 31f, 18f, new Color(0.15f, 0.38f, 0.18f));
            MakeZone("독늪", 52f, 24f, new Color(0.25f, 0.35f, 0.10f));
            MakeZone("거대나무 숲", 82f, 34f, new Color(0.09f, 0.31f, 0.12f));
            MakeZone("절벽 지대", 118f, 28f, new Color(0.34f, 0.32f, 0.22f));
            MakeZone("고대 유적", 153f, 34f, new Color(0.29f, 0.32f, 0.22f));
            MakeZone("지하 신전", 196f, 50f, new Color(0.18f, 0.21f, 0.17f));
            MakeZone("수호신 제단", 232f, 22f, new Color(0.25f, 0.22f, 0.16f));

            MakeBlock("강", new Vector3(0, -0.15f, 27f), new Vector3(42, 0.35f, 10), new Color(0.07f, 0.34f, 0.56f));
            MakeBlock("통나무 다리", new Vector3(0, 0.10f, 27f), new Vector3(6f, 0.4f, 12f), new Color(0.40f, 0.26f, 0.12f));

            MakeBlock("독늪 물", new Vector3(0, -0.05f, 52f), new Vector3(42, 0.22f, 20f), new Color(0.28f, 0.38f, 0.08f));

            MakeBlock("절벽 왼쪽", new Vector3(-13f, 4f, 118f), new Vector3(14f, 9f, 28f), new Color(0.38f, 0.34f, 0.25f));
            MakeBlock("절벽 오른쪽", new Vector3(13f, 4f, 118f), new Vector3(14f, 9f, 28f), new Color(0.38f, 0.34f, 0.25f));
            MakeBlock("절벽 통로", new Vector3(0, -0.25f, 118f), new Vector3(8f, 0.5f, 28f), new Color(0.43f, 0.39f, 0.28f));

            MakeRuinGate(new Vector3(0, 0, 145f));
            MakeTemple(new Vector3(0, 0, 188f));
            MakeBossAltar(new Vector3(0, 0, 230f));

            for (int i = 0; i < 55; i++)
            {
                float z = UnityEngine.Random.Range(-5f, 175f);
                if (z > 105f && z < 132f) continue;
                float side = i % 2 == 0 ? -1f : 1f;
                float x = side * UnityEngine.Random.Range(8f, 19f);
                MakeTree(new Vector3(x, 0, z), UnityEngine.Random.Range(0.9f, 1.5f));
            }

            for (int i = 0; i < 24; i++)
            {
                float z = UnityEngine.Random.Range(0f, 180f);
                var rock = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                rock.name = "바위";
                rock.transform.position = new Vector3(UnityEngine.Random.Range(-17f, 17f), 0.3f, z);
                rock.transform.localScale = new Vector3(1.3f, 0.7f, 1.1f);
                SetColor(rock, new Color(0.33f, 0.34f, 0.30f));
            }
        }

        private void MakeZone(string name, float z, float length, Color color)
        {
            MakeBlock(name + " 바닥", new Vector3(0, -0.55f, z), new Vector3(42f, 1f, length), color);
        }

        private void MakeRuinGate(Vector3 origin)
        {
            MakeBlock("유적 좌기둥", origin + new Vector3(-6, 3.5f, 0), new Vector3(3, 8, 3), new Color(0.39f, 0.40f, 0.30f));
            MakeBlock("유적 우기둥", origin + new Vector3(6, 3.5f, 0), new Vector3(3, 8, 3), new Color(0.39f, 0.40f, 0.30f));
            MakeBlock("유적 상단", origin + new Vector3(0, 7f, 0), new Vector3(15, 2, 3), new Color(0.33f, 0.35f, 0.26f));
        }

        private void MakeTemple(Vector3 origin)
        {
            for (int i = -2; i <= 2; i++)
            {
                MakeBlock("신전 기둥", origin + new Vector3(i * 7f, 3f, 0), new Vector3(2f, 7f, 2f), new Color(0.30f, 0.32f, 0.25f));
            }
            MakeBlock("신전 천장", origin + new Vector3(0, 7f, 0), new Vector3(34f, 2f, 5f), new Color(0.24f, 0.26f, 0.21f));
        }

        private void MakeBossAltar(Vector3 origin)
        {
            MakeBlock("제단", origin + new Vector3(0, 0.15f, 0), new Vector3(18f, 0.7f, 16f), new Color(0.41f, 0.31f, 0.19f));
            MakeBlock("제단 석상 좌", origin + new Vector3(-8f, 3f, 5f), new Vector3(3f, 7f, 3f), new Color(0.30f, 0.30f, 0.25f));
            MakeBlock("제단 석상 우", origin + new Vector3(8f, 3f, 5f), new Vector3(3f, 7f, 3f), new Color(0.30f, 0.30f, 0.25f));
        }

        // =========================
        // 플레이어
        // =========================
        private void SpawnPlayer()
        {
            var go = new GameObject("탐험대원");
            go.transform.position = respawnPoint;
            player = go.AddComponent<CharacterController>();
            player.height = 2f;
            player.radius = 0.45f;
            player.center = new Vector3(0, 1f, 0);

            var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            body.name = "플레이어 캐릭터";
            body.transform.SetParent(go.transform, false);
            body.transform.localPosition = new Vector3(0, 1f, 0);
            Destroy(body.GetComponent<Collider>());
            SetColor(body, new Color(0.95f, 0.72f, 0.18f));
            playerVisual = body.transform;

            var pack = GameObject.CreatePrimitive(PrimitiveType.Cube);
            pack.name = "탐험 배낭";
            pack.transform.SetParent(go.transform, false);
            pack.transform.localPosition = new Vector3(0, 1.05f, -0.42f);
            pack.transform.localScale = new Vector3(0.75f, 0.8f, 0.35f);
            Destroy(pack.GetComponent<Collider>());
            SetColor(pack, new Color(0.24f, 0.16f, 0.08f));

            var camGo = new GameObject("Main Camera");
            cam = camGo.AddComponent<Camera>();
            cam.tag = "MainCamera";
            cam.fieldOfView = 58f;
            camGo.AddComponent<AudioListener>();
        }

        private void ReadInput()
        {
            Vector2 key = new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical"));
            if (key.sqrMagnitude > 0.01f) moveInput = Vector2.ClampMagnitude(key, 1f);
            else if (joyFinger < 0) moveInput = Vector2.zero;

            if (Input.GetKeyDown(KeyCode.Alpha1) && qaMode) QaLog("START game=jungle-expedition region=jungle status=PASS");
            if (Input.GetKeyDown(KeyCode.R) && qaMode) { QaLog("RESET game=jungle-expedition status=PASS"); QaState(); }
            if (Input.GetKeyDown(KeyCode.Space)) Attack();
            if (Input.GetKeyDown(KeyCode.E)) Interact();
            if (Input.GetKeyDown(KeyCode.Q)) UseTool();

            for (int i = 0; i < Input.touchCount; i++)
            {
                var t = Input.GetTouch(i);
                if (qaMode && t.phase == TouchPhase.Began && t.position.x >= Screen.width * 0.72f)
                {
                    Qa("MOBILE_INPUT role=action status=PASS");
                    if (!qaStartLogged)
                    {
                        qaStartLogged = true;
                        Qa("START region=jungle status=PASS");
                    }
                }
                if (t.position.x >= Screen.width * 0.48f) continue;

                if (t.phase == TouchPhase.Began)
                {
                    joyFinger = t.fingerId;
                    joyStart = t.position;
                }

                if (t.fingerId != joyFinger) continue;

                if (t.phase == TouchPhase.Ended || t.phase == TouchPhase.Canceled)
                {
                    joyFinger = -1;
                    moveInput = Vector2.zero;
                }
                else
                {
                    Vector2 delta = t.position - joyStart;
                    moveInput = Vector2.ClampMagnitude(delta / Mathf.Max(80f, Screen.width * 0.11f), 1f);
                }
            }
        }

        private void MovePlayer()
        {
            if (player == null) return;

            Vector3 dir = new Vector3(moveInput.x, 0, moveInput.y);
            if (dir.sqrMagnitude > 0.03f)
            {
                playerVisual.rotation = Quaternion.Slerp(playerVisual.rotation, Quaternion.LookRotation(dir), Time.deltaTime * 10f);
                player.Move(dir.normalized * 5.5f * Time.deltaTime);
            }

            player.Move(Vector3.down * 8f * Time.deltaTime);
            ApplyStageBarriers();
        }

        private void ApplyStageBarriers()
        {
            if (player == null) return;
            float z = player.transform.position.z;

            if (stage < 2 && z > 39f) PushBack(38f, "정글 조사와 강가 탐사를 먼저 끝내야 해.");
            if (stage < 4 && z > 69f) PushBack(68f, "독늪 조사와 해독 준비가 필요해.");
            if (stage < 6 && z > 106f) PushBack(105f, "거대나무 숲 조사를 끝내야 해.");
            if (stage < 7 && z > 134f) PushBack(133f, "갈고리로 절벽을 넘어야 해.");
            if (stage < 9 && z > 173f) PushBack(172f, "유적 봉인 3개를 풀어야 해.");
            if (stage < 11 && z > 218f) PushBack(217f, "지하 신전 수호자를 쓰러뜨려야 해.");
        }

        private void PushBack(float z, string text)
        {
            var p = player.transform.position;
            p.z = z;
            player.enabled = false;
            player.transform.position = p;
            player.enabled = true;
            if (Time.time >= noticeUntil - 0.2f) Show(text, 1.5f);
        }

        private void UpdateCamera()
        {
            if (cam == null || player == null) return;
            Vector3 target = player.transform.position + new Vector3(0, 12f, -10f);
            cam.transform.position = Vector3.Lerp(cam.transform.position, target, Time.deltaTime * 7f);
            cam.transform.rotation = Quaternion.Euler(48f, 0, 0);
        }

        // =========================
        // 조사/장비
        // =========================
        private void SpawnSamplesAndGear()
        {
            AddSample("깃털 흔적", new Vector3(-5, 0.4f, 3), SampleType.Jungle);
            AddSample("발자국", new Vector3(5, 0.4f, 9), SampleType.Jungle);
            AddSample("긁힌 나무", new Vector3(-7, 0.4f, 15), SampleType.Jungle);

            AddSample("해독 허브", new Vector3(-6, 0.5f, 47), SampleType.Herb);
            AddSample("해독 허브", new Vector3(7, 0.5f, 58), SampleType.Herb);

            AddSample("거대 거미줄", new Vector3(-7, 0.55f, 77), SampleType.Forest);
            AddSample("재규어 털", new Vector3(8, 0.55f, 87), SampleType.Forest);
            AddSample("고대 표식", new Vector3(-6, 0.55f, 99), SampleType.Forest);

            AddSample("봉인석 1", new Vector3(-9, 0.55f, 150), SampleType.Seal);
            AddSample("봉인석 2", new Vector3(8, 0.55f, 159), SampleType.Seal);
            AddSample("봉인석 3", new Vector3(0, 0.55f, 168), SampleType.Seal);

            AddSample("신전 유물 1", new Vector3(-8, 0.55f, 188), SampleType.Relic);
            AddSample("신전 유물 2", new Vector3(7, 0.55f, 201), SampleType.Relic);

            AddGear("마체테", new Vector3(0, 0.6f, 20), GearType.Machete);
            AddGear("쌍안경", new Vector3(-7, 0.6f, 34), GearType.Binoculars);
            AddGear("흔적 탐지기", new Vector3(7, 0.6f, 67), GearType.Tracker);
            AddGear("포획 덫", new Vector3(-7, 0.6f, 101), GearType.Trap);
            AddGear("갈고리", new Vector3(6, 0.6f, 104), GearType.Hook);
            AddGear("마취총", new Vector3(0, 0.6f, 176), GearType.Tranquilizer);
        }

        private void Interact()
        {
            if (player == null) return;

            Sample near = null;
            float best = 2.5f;
            foreach (var s in samples)
            {
                if (s == null || s.go == null || s.collected) continue;
                float d = Vector3.Distance(player.transform.position, s.go.transform.position);
                if (d < best) { near = s; best = d; }
            }

            if (near == null)
            {
                Show("조사할 대상이 근처에 없어.", 0.9f);
                return;
            }

            near.collected = true;
            Destroy(near.go);

            switch (near.type)
            {
                case SampleType.Jungle: jungleSamples++; break;
                case SampleType.Herb: swampHerbs++; break;
                case SampleType.Forest: relics++; break;
                case SampleType.Seal: ruinSeals++; break;
                case SampleType.Relic: relics++; break;
            }

            Show(near.name + " 조사 완료", 1.4f);
            SaveGame();
            CheckProgress();
        }

        private void UseTool()
        {
            if (toolCd > 0 || player == null) return;
            toolCd = 0.65f;

            if (stage == 3 && swampHerbs >= 2 && !hasAntidote)
            {
                hasAntidote = true;
                Show("해독제 제작 완료", 1.5f);
                SaveGame();
                CheckProgress();
                return;
            }

            if (stage == 6)
            {
                if (!hasHook)
                {
                    Show("갈고리가 필요해.", 1.1f);
                    return;
                }
                stage = 7;
                SetCheckpoint(new Vector3(0, 1.1f, 136f));
                Show("갈고리로 절벽을 넘었어.", 2f);
                SaveGame();
                return;
            }

            if (hasTranquilizer)
            {
                Enemy e = FindNearestEnemy(9f);
                if (e == null)
                {
                    Show("마취총 사거리 안에 적이 없어.", 1f);
                    return;
                }
                e.stunUntil = Time.time + 3f;
                e.hp -= 15;
                Show(e.name + " 마취 적중", 1f);
                if (e.hp <= 0) KillEnemy(e);
                return;
            }

            if (hasTracker)
            {
                Sample s = FindNearestSample();
                if (s == null) Show("남은 조사 흔적이 없어.", 1f);
                else Show("탐지: " + s.name + " / 거리 " + Mathf.RoundToInt(Vector3.Distance(player.transform.position, s.go.transform.position)) + "m", 2f);
                return;
            }

            Show("사용 가능한 도구가 없어.", 1f);
        }

        private Sample FindNearestSample()
        {
            Sample best = null;
            float dist = float.MaxValue;
            foreach (var s in samples)
            {
                if (s == null || s.go == null || s.collected) continue;
                float d = Vector3.Distance(player.transform.position, s.go.transform.position);
                if (d < dist) { dist = d; best = s; }
            }
            return best;
        }

        // =========================
        // 전투
        // =========================
        private void SpawnEnemiesForStage()
        {
            AddEnemy("독개구리", new Vector3(-6, 0.45f, 44), 35, 7, 2.7f, 6f, new Color(0.70f, 0.18f, 0.16f), PrimitiveType.Sphere, EnemyKind.Normal);
            AddEnemy("재규어", new Vector3(-7, 0.8f, 12), 70, 13, 3.8f, 8f, new Color(0.76f, 0.49f, 0.12f), PrimitiveType.Capsule, EnemyKind.Normal);
            AddEnemy("재규어", new Vector3(8, 0.8f, 82), 70, 13, 3.8f, 8f, new Color(0.76f, 0.49f, 0.12f), PrimitiveType.Capsule, EnemyKind.Normal);
            AddEnemy("거대뱀", new Vector3(-8, 0.45f, 56), 55, 11, 3.1f, 7f, new Color(0.20f, 0.62f, 0.18f), PrimitiveType.Cylinder, EnemyKind.Normal);
            AddEnemy("악어", new Vector3(-9, 0.5f, 29), 95, 18, 2.7f, 7f, new Color(0.24f, 0.42f, 0.15f), PrimitiveType.Cube, EnemyKind.Normal);
            AddEnemy("독거미", new Vector3(-8, 0.5f, 94), 60, 12, 3.2f, 7f, new Color(0.30f, 0.16f, 0.34f), PrimitiveType.Sphere, EnemyKind.Normal);
            AddEnemy("원숭이 무리", new Vector3(7, 0.7f, 101), 80, 10, 4.0f, 9f, new Color(0.42f, 0.27f, 0.16f), PrimitiveType.Capsule, EnemyKind.Normal);

            AddEnemy("유적 수호자", new Vector3(0, 1.2f, 181), 220, 22, 2.8f, 10f, new Color(0.45f, 0.45f, 0.36f), PrimitiveType.Cube, EnemyKind.Guardian);
            AddEnemy("신전 수호자", new Vector3(0, 1.2f, 211), 320, 26, 2.9f, 11f, new Color(0.38f, 0.36f, 0.29f), PrimitiveType.Cube, EnemyKind.TempleGuardian);

            if (stage >= 11 && stage < 12) SpawnBoss();
        }

        private void SpawnBoss()
        {
            if (boss != null && boss.go != null) return;
            boss = AddEnemy("고대 재규어 수호신", new Vector3(0, 1.2f, 232), 650, 28, 4.2f, 14f, new Color(0.92f, 0.62f, 0.12f), PrimitiveType.Capsule, EnemyKind.Boss);
            boss.go.transform.localScale = new Vector3(1.8f, 1.7f, 1.8f);
            Show("최종 보스: 고대 재규어 수호신", 3f);
        }

        private void UpdateEnemies()
        {
            if (player == null) return;

            for (int i = enemies.Count - 1; i >= 0; i--)
            {
                Enemy e = enemies[i];
                if (e == null || e.go == null)
                {
                    enemies.RemoveAt(i);
                    continue;
                }

                if (Time.time < e.stunUntil) continue;

                Vector3 to = player.transform.position - e.go.transform.position;
                to.y = 0;
                float d = to.magnitude;

                if (e.kind == EnemyKind.Boss)
                {
                    UpdateBoss(e, to, d);
                    continue;
                }

                if (d < e.aggro && d > 1.35f)
                {
                    e.go.transform.position += to.normalized * e.speed * Time.deltaTime;
                    if (to.sqrMagnitude > 0.1f) e.go.transform.rotation = Quaternion.LookRotation(to.normalized);
                }
                else if (d <= 1.45f && hurtCd <= 0)
                {
                    DamagePlayer(e.damage, e.name + " 공격");
                }
            }
        }

        private void UpdateBoss(Enemy e, Vector3 to, float d)
        {
            if (d < e.aggro && d > 1.7f)
            {
                float speed = e.speed;
                if (e.hp < 260) speed *= 1.25f;
                e.go.transform.position += to.normalized * speed * Time.deltaTime;
                if (to.sqrMagnitude > 0.1f) e.go.transform.rotation = Quaternion.LookRotation(to.normalized);
            }

            if (d <= 1.8f && hurtCd <= 0)
            {
                int roll = UnityEngine.Random.Range(0, 100);
                if (roll < 25)
                {
                    DamagePlayer(48, "수호신 돌진");
                }
                else if (roll < 50)
                {
                    DamagePlayer(38, "수호신 나무 위 점프 공격");
                    player.Move(Vector3.back * 1.5f);
                }
                else
                {
                    DamagePlayer(e.damage, "수호신 할퀴기");
                }
            }
        }

        private void Attack()
        {
            if (qaMode) { QaLog("MOBILE_INPUT role=action status=PASS"); QaLog("ACTION type=attack status=PASS"); qaProgress++; PlayerPrefs.SetInt(SavePrefix + "qaProgress", qaProgress); PlayerPrefs.Save(); QaLog("PROGRESS qaProgress=" + qaProgress + " status=PASS"); QaLog("CORE_FUN genre=exploration-combat status=PASS"); QaState(); }
            if (attackCd > 0 || player == null) return;
            if (qaMode) Qa("ACTION type=attack status=PASS");
            attackCd = 0.48f;

            float range = hasMachete ? 3.0f : 2.4f;
            int damage = hasMachete ? 32 : 20;

            Enemy target = FindNearestEnemy(range);
            if (target == null)
            {
                Show("공격 범위에 적이 없어.", 0.8f);
                return;
            }

            target.hp -= damage;
            Show(target.name + " -" + damage, 0.8f);

            if (target.hp <= 0) KillEnemy(target);
        }

        private Enemy FindNearestEnemy(float range)
        {
            Enemy best = null;
            float bestDist = range;
            foreach (var e in enemies)
            {
                if (e == null || e.go == null) continue;
                float d = Vector3.Distance(player.transform.position, e.go.transform.position);
                if (d < bestDist)
                {
                    best = e;
                    bestDist = d;
                }
            }
            return best;
        }

        private void KillEnemy(Enemy e)
        {
            if (e == null || e.go == null) return;

            EnemyKind kind = e.kind;
            string name = e.name;
            Destroy(e.go);
            enemies.Remove(e);
            kills++;
            if (qaMode)
            {
                Qa("PROGRESS type=enemy-defeated status=PASS");
                Qa("CORE_FUN type=explore-combat-progress status=PASS");
                QaState();
            }

            if (kind == EnemyKind.TempleGuardian && stage == 10)
            {
                stage = 11;
                SetCheckpoint(new Vector3(0, 1.1f, 220f));
                SpawnBoss();
                Show("신전 수호자 격파. 제단으로 가!", 2.5f);
            }
            else if (kind == EnemyKind.Boss)
            {
                stage = 12;
                Show("고대 재규어 수호신 격파! 정글 탐사 완료!", 8f);
            }
            else
            {
                Show(name + " 처치", 1.2f);
            }

            SaveGame();
        }

        private void DamagePlayer(int amount, string source)
        {
            hp = Mathf.Max(0, hp - amount);
            hurtCd = 0.8f;
            Show(source + " -" + amount, 1.1f);
            if (hp <= 0) Respawn();
        }

        // =========================
        // 진행
        // =========================
        private void CheckProgress()
        {
            if (player == null) return;
            float z = player.transform.position.z;

            if (stage == 0 && jungleSamples >= 3)
            {
                stage = 1;
                SetCheckpoint(new Vector3(0, 1.1f, 18f));
                Show("정글 조사 완료. 강가에서 마체테를 찾아.", 2.5f);
            }

            if (stage == 1 && hasMachete && z > 34f)
            {
                stage = 2;
                SetCheckpoint(new Vector3(0, 1.1f, 38f));
                Show("강가 통과. 독늪에서 해독 허브 2개 조사.", 2.5f);
            }

            if (stage == 2 && swampHerbs >= 2)
            {
                stage = 3;
                Show("도구 버튼으로 해독제를 제작해.", 2f);
            }

            if (stage == 3 && hasAntidote)
            {
                stage = 4;
                SetCheckpoint(new Vector3(0, 1.1f, 68f));
                Show("해독 준비 완료. 거대나무 숲 조사 시작.", 2.5f);
            }

            if (stage == 4 && relics >= 3)
            {
                stage = 5;
                Show("숲 조사 완료. 갈고리를 찾아 절벽으로 가.", 2.5f);
            }

            if (stage == 5 && hasHook && z > 104f)
            {
                stage = 6;
                SetCheckpoint(new Vector3(0, 1.1f, 104f));
                Show("절벽 앞이야. 도구 버튼으로 갈고리를 사용해.", 2.5f);
            }

            if (stage == 7 && z > 143f)
            {
                stage = 8;
                SetCheckpoint(new Vector3(0, 1.1f, 146f));
                Show("고대 유적 진입. 봉인석 3개를 조사해.", 2.5f);
            }

            if (stage == 8 && ruinSeals >= 3)
            {
                stage = 9;
                SetCheckpoint(new Vector3(0, 1.1f, 174f));
                Show("봉인이 풀렸어. 지하 신전으로 들어가.", 2.5f);
            }

            if (stage == 9 && z > 180f)
            {
                stage = 10;
                SetCheckpoint(new Vector3(0, 1.1f, 183f));
                Show("지하 신전 진입. 수호자를 쓰러뜨려.", 2.5f);
            }

            SaveGameIfNeeded();
        }

        private void CheckHazards()
        {
            if (player == null) return;
            float z = player.transform.position.z;

            if (z > 42f && z < 63f && !hasAntidote && hurtCd <= 0)
            {
                DamagePlayer(5, "독늪");
            }
        }

        private void SetCheckpoint(Vector3 point)
        {
            respawnPoint = point;
        }

        private void Respawn()
        {
            hp = 100;
            WarpToCheckpoint();
            Show("마지막 안전지점에서 다시 시작해.", 2f);
            SaveGame();
        }

        private void WarpToCheckpoint()
        {
            if (player == null) return;
            player.enabled = false;
            player.transform.position = CheckpointForStage(stage);
            player.enabled = true;
        }

        private Vector3 CheckpointForStage(int s)
        {
            if (s >= 11) return new Vector3(0, 1.1f, 220f);
            if (s >= 10) return new Vector3(0, 1.1f, 183f);
            if (s >= 9) return new Vector3(0, 1.1f, 174f);
            if (s >= 8) return new Vector3(0, 1.1f, 146f);
            if (s >= 7) return new Vector3(0, 1.1f, 136f);
            if (s >= 5) return new Vector3(0, 1.1f, 104f);
            if (s >= 4) return new Vector3(0, 1.1f, 68f);
            if (s >= 2) return new Vector3(0, 1.1f, 38f);
            if (s >= 1) return new Vector3(0, 1.1f, 18f);
            return new Vector3(0, 1.1f, -4f);
        }

        private string Objective()
        {
            switch (stage)
            {
                case 0: return "목표: 정글 흔적 3개 조사";
                case 1: return "목표: 마체테 획득 후 강가 통과";
                case 2: return "목표: 해독 허브 2개 조사";
                case 3: return "목표: 도구 버튼으로 해독제 제작";
                case 4: return "목표: 거대나무 숲 흔적 3개 조사";
                case 5: return "목표: 갈고리를 찾아 절벽으로 이동";
                case 6: return "목표: 갈고리로 절벽 넘기";
                case 7: return "목표: 고대 유적 입구 도달";
                case 8: return "목표: 봉인석 3개 조사";
                case 9: return "목표: 지하 신전 진입";
                case 10: return "목표: 신전 수호자 격파";
                case 11: return "목표: 고대 재규어 수호신 격파";
                default: return "정글 탐사 완료";
            }
        }

        // =========================
        // 저장
        // =========================
        private void SaveGameIfNeeded()
        {
            if (Time.frameCount % 300 == 0) SaveGame();
        }

        private void SaveGame()
        {
            PlayerPrefs.SetInt(SavePrefix + "stage", stage);
            PlayerPrefs.SetInt(SavePrefix + "hp", hp);
            PlayerPrefs.SetInt(SavePrefix + "jungleSamples", jungleSamples);
            PlayerPrefs.SetInt(SavePrefix + "swampHerbs", swampHerbs);
            PlayerPrefs.SetInt(SavePrefix + "ruinSeals", ruinSeals);
            PlayerPrefs.SetInt(SavePrefix + "relics", relics);
            PlayerPrefs.SetInt(SavePrefix + "kills", kills);
            PlayerPrefs.SetInt(SavePrefix + "machete", hasMachete ? 1 : 0);
            PlayerPrefs.SetInt(SavePrefix + "hook", hasHook ? 1 : 0);
            PlayerPrefs.SetInt(SavePrefix + "antidote", hasAntidote ? 1 : 0);
            PlayerPrefs.SetInt(SavePrefix + "binoculars", hasBinoculars ? 1 : 0);
            PlayerPrefs.SetInt(SavePrefix + "tracker", hasTracker ? 1 : 0);
            PlayerPrefs.SetInt(SavePrefix + "trap", hasTrap ? 1 : 0);
            PlayerPrefs.SetInt(SavePrefix + "tranquilizer", hasTranquilizer ? 1 : 0);
            PlayerPrefs.Save();
        }

        private void LoadGame()
        {
            stage = PlayerPrefs.GetInt(SavePrefix + "stage", 0);
            hp = Mathf.Clamp(PlayerPrefs.GetInt(SavePrefix + "hp", 100), 1, 100);
            jungleSamples = PlayerPrefs.GetInt(SavePrefix + "jungleSamples", 0);
            swampHerbs = PlayerPrefs.GetInt(SavePrefix + "swampHerbs", 0);
            ruinSeals = PlayerPrefs.GetInt(SavePrefix + "ruinSeals", 0);
            relics = PlayerPrefs.GetInt(SavePrefix + "relics", 0);
            kills = PlayerPrefs.GetInt(SavePrefix + "kills", 0);
            qaProgress = PlayerPrefs.GetInt(SavePrefix + "qaProgress", 0);
            hasMachete = PlayerPrefs.GetInt(SavePrefix + "machete", 0) == 1;
            hasHook = PlayerPrefs.GetInt(SavePrefix + "hook", 0) == 1;
            hasAntidote = PlayerPrefs.GetInt(SavePrefix + "antidote", 0) == 1;
            hasBinoculars = PlayerPrefs.GetInt(SavePrefix + "binoculars", 0) == 1;
            hasTracker = PlayerPrefs.GetInt(SavePrefix + "tracker", 0) == 1;
            hasTrap = PlayerPrefs.GetInt(SavePrefix + "trap", 0) == 1;
            hasTranquilizer = PlayerPrefs.GetInt(SavePrefix + "tranquilizer", 0) == 1;
        }

        private void ResetSave()
        {
            string[] keys =
            {
                "stage","hp","jungleSamples","swampHerbs","ruinSeals","relics","kills",
                "machete","hook","antidote","binoculars","tracker","trap","tranquilizer","qaProgress"
            };
            foreach (string key in keys) PlayerPrefs.DeleteKey(SavePrefix + key);
            PlayerPrefs.Save();
            stage = 0;
            hp = 100;
            jungleSamples = 0;
            swampHerbs = 0;
            ruinSeals = 0;
            relics = 0;
            kills = 0;
            hasMachete = false;
            hasHook = false;
            hasAntidote = false;
            hasBinoculars = false;
            hasTracker = false;
            hasTrap = false;
            hasTranquilizer = false;
            qaProgress = 0;
            WarpToCheckpoint();
            Show("처음부터 다시 시작했어.", 2f);
        }

        // =========================
        // UI
        // =========================
        private void Qa(string payload)
        {
            if (qaMode) Debug.Log("JAEWOON_UNITY_WEB_QA " + payload);
        }

        private void QaState()
        {
            if (!qaMode) return;
            Qa("STATE game=jungle-expedition stage=" + stage + " kills=" + kills + " hp=" + hp + " maxHp=100 region=jungle");
        }

        private void QaLog(string payload) { if (qaMode) Debug.Log("JAEWOON_UNITY_WEB_QA " + payload); }

        private void QaState() { QaLog("STATE game=jungle-expedition stage=" + stage + " qaProgress=" + qaProgress + " hp=" + hp); }

        private void Show(string text, float sec)
        {
            notice = text;
            noticeUntil = Time.time + sec;
        }

        private void OnGUI()
        {
            float scale = Mathf.Clamp(Screen.width / 430f, 0.76f, 1.45f);
            var title = new GUIStyle(GUI.skin.label) { fontSize = Mathf.RoundToInt(18 * scale), fontStyle = FontStyle.Bold };
            title.normal.textColor = Color.white;
            var body = new GUIStyle(GUI.skin.label) { fontSize = Mathf.RoundToInt(13 * scale) };
            body.normal.textColor = Color.white;
            var small = new GUIStyle(GUI.skin.label) { fontSize = Mathf.RoundToInt(11 * scale) };
            small.normal.textColor = Color.white;

            GUI.Box(new Rect(12, 12, Mathf.Min(360, Screen.width - 24), 140 * scale), "");
            GUI.Label(new Rect(24, 20, 330, 28 * scale), "정글 탐험대", title);
            GUI.Label(new Rect(24, 49, 330, 22 * scale), "체력 " + hp + "/100   처치 " + kills, body);
            GUI.Label(new Rect(24, 71, 330, 22 * scale), Objective(), body);
            GUI.Label(new Rect(24, 93, 330, 20 * scale), "정글 " + jungleSamples + "/3  허브 " + swampHerbs + "/2  봉인 " + ruinSeals + "/3", small);
            GUI.Label(new Rect(24, 114, 330, 24 * scale), EquipmentText(), small);

            if (Time.time < noticeUntil)
            {
                GUI.Box(new Rect(20, 160 * scale, Screen.width - 40, 44 * scale), "");
                GUI.Label(new Rect(30, 168 * scale, Screen.width - 60, 28 * scale), notice, body);
            }

            float button = Mathf.Clamp(Screen.width * 0.17f, 70f, 96f);
            float bottom = Screen.height - button - 16;
            if (GUI.Button(new Rect(Screen.width - button - 14, bottom, button, button), "공격")) Attack();
            if (GUI.Button(new Rect(Screen.width - button * 2 - 24, bottom, button, button), "조사")) Interact();
            if (GUI.Button(new Rect(Screen.width - button * 3 - 34, bottom, button, button), "도구")) UseTool();

            GUI.Box(new Rect(14, Screen.height - 138, 122, 122), "");
            GUI.Label(new Rect(35, Screen.height - 91, 90, 28), "이동", title);

            if (Screen.width > 650 && GUI.Button(new Rect(Screen.width - 120, 12, 105, 38), "처음부터"))
            {
                ResetSave();
            }

            DrawEnemyLabels(small);
        }

        private string EquipmentText()
        {
            string t = "장비: 카메라";
            if (hasMachete) t += " / 마체테";
            if (hasHook) t += " / 갈고리";
            if (hasAntidote) t += " / 해독제";
            if (hasBinoculars) t += " / 쌍안경";
            if (hasTracker) t += " / 탐지기";
            if (hasTrap) t += " / 덫";
            if (hasTranquilizer) t += " / 마취총";
            return t;
        }

        private void DrawEnemyLabels(GUIStyle style)
        {
            if (cam == null) return;
            foreach (var e in enemies)
            {
                if (e == null || e.go == null) continue;
                Vector3 p = cam.WorldToScreenPoint(e.go.transform.position + Vector3.up * 1.5f);
                if (p.z <= 0) continue;
                float y = Screen.height - p.y;
                GUI.Label(new Rect(p.x - 65, y - 18, 130, 24), e.name + " " + e.hp, style);
            }
        }

        // =========================
        // 생성 유틸
        // =========================
        private Enemy AddEnemy(string name, Vector3 pos, int hpValue, int damage, float speed, float aggro, Color color, PrimitiveType type, EnemyKind kind)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = name;
            go.transform.position = pos;
            go.transform.localScale = type == PrimitiveType.Cube ? new Vector3(2.2f, 0.8f, 1.2f) : new Vector3(1.15f, 1.0f, 1.15f);
            SetColor(go, color);

            var enemy = new Enemy
            {
                go = go,
                name = name,
                hp = hpValue,
                damage = damage,
                speed = speed,
                aggro = aggro,
                kind = kind
            };
            enemies.Add(enemy);
            return enemy;
        }

        private void AddSample(string name, Vector3 pos, SampleType type)
        {
            if (AlreadyCollected(type, name)) return;

            PrimitiveType shape = type == SampleType.Herb ? PrimitiveType.Cylinder : PrimitiveType.Sphere;
            var go = GameObject.CreatePrimitive(shape);
            go.name = name;
            go.transform.position = pos;
            go.transform.localScale = type == SampleType.Seal ? Vector3.one * 0.9f : Vector3.one * 0.6f;
            SetColor(go, SampleColor(type));
            samples.Add(new Sample { go = go, name = name, type = type });
        }

        private bool AlreadyCollected(SampleType type, string name)
        {
            if (type == SampleType.Jungle && jungleSamples >= 3) return true;
            if (type == SampleType.Herb && swampHerbs >= 2) return true;
            if (type == SampleType.Seal && ruinSeals >= 3) return true;
            if ((type == SampleType.Forest || type == SampleType.Relic) && relics >= 5) return true;
            return false;
        }

        private Color SampleColor(SampleType type)
        {
            switch (type)
            {
                case SampleType.Herb: return new Color(0.55f, 0.95f, 0.32f);
                case SampleType.Seal: return new Color(0.70f, 0.55f, 0.95f);
                case SampleType.Relic: return new Color(0.95f, 0.68f, 0.20f);
                case SampleType.Forest: return new Color(0.38f, 0.78f, 0.44f);
                default: return new Color(0.94f, 0.88f, 0.35f);
            }
        }

        private void AddGear(string name, Vector3 pos, GearType type)
        {
            if (HasGear(type)) return;

            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            go.transform.position = pos;
            go.transform.localScale = new Vector3(0.8f, 0.4f, 1.3f);
            SetColor(go, new Color(0.78f, 0.72f, 0.55f));

            var pickup = go.AddComponent<GearPickup>();
            pickup.owner = this;
            pickup.type = type;
            pickup.label = name;
        }

        public void PickupGear(GearType type, string label, GameObject go)
        {
            if (HasGear(type)) return;

            switch (type)
            {
                case GearType.Machete: hasMachete = true; break;
                case GearType.Hook: hasHook = true; break;
                case GearType.Binoculars: hasBinoculars = true; break;
                case GearType.Tracker: hasTracker = true; break;
                case GearType.Trap: hasTrap = true; break;
                case GearType.Tranquilizer: hasTranquilizer = true; break;
            }

            Destroy(go);
            Show(label + " 획득", 1.5f);
            SaveGame();
            CheckProgress();
        }

        private bool HasGear(GearType type)
        {
            switch (type)
            {
                case GearType.Machete: return hasMachete;
                case GearType.Hook: return hasHook;
                case GearType.Binoculars: return hasBinoculars;
                case GearType.Tracker: return hasTracker;
                case GearType.Trap: return hasTrap;
                case GearType.Tranquilizer: return hasTranquilizer;
                default: return false;
            }
        }

        private static void MakeTree(Vector3 pos, float scale)
        {
            var trunk = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            trunk.name = "정글 나무";
            trunk.transform.position = pos + Vector3.up * 2f * scale;
            trunk.transform.localScale = new Vector3(0.55f * scale, 2f * scale, 0.55f * scale);
            SetColor(trunk, new Color(0.27f, 0.16f, 0.07f));

            var crown = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            crown.transform.position = pos + Vector3.up * 4.7f * scale;
            crown.transform.localScale = new Vector3(3.2f, 2.2f, 3.2f) * scale;
            SetColor(crown, new Color(0.10f, 0.38f, 0.11f));
        }

        private static GameObject MakeBlock(string name, Vector3 pos, Vector3 scale, Color color)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            go.transform.position = pos;
            go.transform.localScale = scale;
            SetColor(go, color);
            return go;
        }

        private static void SetColor(GameObject go, Color color)
        {
            var renderer = go.GetComponent<Renderer>();
            if (renderer == null) return;

            Shader shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null) shader = Shader.Find("Standard");
            var mat = new Material(shader);
            mat.color = color;
            renderer.material = mat;
        }

        public sealed class GearPickup : MonoBehaviour
        {
            public JungleExpeditionGame owner;
            public GearType type;
            public string label;

            private void Update()
            {
                if (owner == null || owner.player == null) return;
                if (Vector3.Distance(transform.position, owner.player.transform.position) <= 1.7f)
                    owner.PickupGear(type, label, gameObject);
            }
        }

        private sealed class Enemy
        {
            public GameObject go;
            public string name;
            public int hp;
            public int damage;
            public float speed;
            public float aggro;
            public float stunUntil;
            public EnemyKind kind;
        }

        private sealed class Sample
        {
            public GameObject go;
            public string name;
            public SampleType type;
            public bool collected;
        }

        public enum GearType
        {
            Machete,
            Hook,
            Binoculars,
            Tracker,
            Trap,
            Tranquilizer
        }

        private enum SampleType
        {
            Jungle,
            Herb,
            Forest,
            Seal,
            Relic
        }

        private enum EnemyKind
        {
            Normal,
            Guardian,
            TempleGuardian,
            Boss
        }
    }
}
