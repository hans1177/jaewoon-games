// 파일명: JungleExpeditionGame.cs
// 역할: 정글 탐험대 1차 플레이어블 - 월드, 이동, 전투, 조사, 모바일 UI
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
        private Vector2 moveInput;
        private int hp = 100;
        private int stage = 0;
        private int jungleSamples = 0;
        private int swampHerbs = 0;
        private float attackCd;
        private float hurtCd;
        private string notice = "정글 표본 3개를 조사해.";
        private float noticeUntil;
        private Vector2 joyStart;
        private int joyFinger = -1;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void Boot()
        {
            if (FindFirstObjectByType<JungleExpeditionGame>() != null) return;
            var go = new GameObject("JungleExpeditionGame");
            go.AddComponent<JungleExpeditionGame>();
        }

        private void Start()
        {
            Application.targetFrameRate = 60;
            BuildWorld();
            SpawnPlayer();
            SpawnEnemies();
            SpawnSamples();
            Show("정글 표본 3개를 조사해.", 5f);
        }

        private void BuildWorld()
        {
            RenderSettings.ambientLight = new Color(0.42f, 0.48f, 0.38f);
            var sunGo = new GameObject("Sun");
            var sun = sunGo.AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.intensity = 1.2f;
            sun.transform.rotation = Quaternion.Euler(48f, -35f, 0f);

            MakeBlock("정글 바닥", new Vector3(0, -0.5f, 40), new Vector3(42, 1, 100), new Color(0.18f, 0.42f, 0.16f));
            MakeBlock("강", new Vector3(0, -0.15f, 18), new Vector3(42, 0.35f, 10), new Color(0.08f, 0.36f, 0.55f));
            MakeBlock("강 다리", new Vector3(0, 0.08f, 18), new Vector3(6, 0.45f, 12), new Color(0.38f, 0.25f, 0.12f));
            MakeBlock("독늪", new Vector3(0, -0.08f, 48), new Vector3(42, 0.22f, 24), new Color(0.25f, 0.37f, 0.10f));

            for (int i = 0; i < 36; i++)
            {
                float side = i % 2 == 0 ? -1f : 1f;
                float x = side * UnityEngine.Random.Range(8f, 19f);
                float z = UnityEngine.Random.Range(-5f, 86f);
                MakeTree(new Vector3(x, 0, z), UnityEngine.Random.Range(1.0f, 1.55f));
            }

            for (int i = 0; i < 16; i++)
            {
                var rock = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                rock.name = "바위";
                rock.transform.position = new Vector3(UnityEngine.Random.Range(-16f, 16f), 0.3f, UnityEngine.Random.Range(0f, 78f));
                rock.transform.localScale = new Vector3(1.2f, 0.7f, 1.1f);
                SetColor(rock, new Color(0.34f, 0.35f, 0.31f));
            }

            // 고대 유적 입구
            MakeBlock("유적 좌기둥", new Vector3(-5, 3, 88), new Vector3(3, 7, 3), new Color(0.38f, 0.39f, 0.30f));
            MakeBlock("유적 우기둥", new Vector3(5, 3, 88), new Vector3(3, 7, 3), new Color(0.38f, 0.39f, 0.30f));
            MakeBlock("유적 상단", new Vector3(0, 6, 88), new Vector3(13, 2, 3), new Color(0.32f, 0.34f, 0.26f));
            MakeBlock("유적 바닥", new Vector3(0, 0, 92), new Vector3(20, 0.6f, 12), new Color(0.29f, 0.31f, 0.24f));
        }

        private void SpawnPlayer()
        {
            var go = new GameObject("탐험대원");
            go.transform.position = new Vector3(0, 1.1f, -1f);
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

        private void SpawnEnemies()
        {
            AddEnemy("재규어", new Vector3(-6, 0.8f, 9), 60, 12, 3.7f, new Color(0.75f, 0.48f, 0.12f), PrimitiveType.Capsule);
            AddEnemy("재규어", new Vector3(8, 0.8f, 30), 60, 12, 3.7f, new Color(0.75f, 0.48f, 0.12f), PrimitiveType.Capsule);
            AddEnemy("거대뱀", new Vector3(-7, 0.45f, 52), 45, 10, 3.1f, new Color(0.20f, 0.62f, 0.18f), PrimitiveType.Cylinder);
            AddEnemy("거대뱀", new Vector3(7, 0.45f, 61), 45, 10, 3.1f, new Color(0.20f, 0.62f, 0.18f), PrimitiveType.Cylinder);
            AddEnemy("악어", new Vector3(-9, 0.5f, 20), 85, 18, 2.6f, new Color(0.24f, 0.42f, 0.15f), PrimitiveType.Cube);
            AddEnemy("악어", new Vector3(9, 0.5f, 16), 85, 18, 2.6f, new Color(0.24f, 0.42f, 0.15f), PrimitiveType.Cube);
        }

        private void SpawnSamples()
        {
            AddSample("깃털 흔적", new Vector3(-5, 0.4f, 5), false);
            AddSample("발자국", new Vector3(5, 0.4f, 10), false);
            AddSample("긁힌 나무", new Vector3(-8, 0.4f, 14), false);
            AddSample("해독 허브", new Vector3(-6, 0.5f, 44), true);
            AddSample("해독 허브", new Vector3(7, 0.5f, 58), true);
        }

        private void Update()
        {
            attackCd -= Time.deltaTime;
            hurtCd -= Time.deltaTime;
            ReadInput();
            MovePlayer();
            UpdateEnemies();
            UpdateCamera();
            CheckStage();
        }

        private void ReadInput()
        {
            Vector2 key = new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical"));
            if (key.sqrMagnitude > 0.01f) moveInput = Vector2.ClampMagnitude(key, 1f);

            if (Input.GetKeyDown(KeyCode.Space)) Attack();
            if (Input.GetKeyDown(KeyCode.E)) Interact();

            for (int i = 0; i < Input.touchCount; i++)
            {
                var t = Input.GetTouch(i);
                if (t.position.x < Screen.width * 0.48f)
                {
                    if (t.phase == TouchPhase.Began)
                    {
                        joyFinger = t.fingerId;
                        joyStart = t.position;
                    }
                    if (t.fingerId == joyFinger)
                    {
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
            }
        }

        private void MovePlayer()
        {
            if (player == null) return;
            Vector3 dir = new Vector3(moveInput.x, 0, moveInput.y);
            if (dir.sqrMagnitude > 0.03f)
            {
                playerVisual.rotation = Quaternion.Slerp(playerVisual.rotation, Quaternion.LookRotation(dir), Time.deltaTime * 10f);
                player.Move(dir.normalized * 5.3f * Time.deltaTime);
            }
            player.Move(Vector3.down * 8f * Time.deltaTime);
        }

        private void UpdateEnemies()
        {
            if (player == null) return;
            for (int i = enemies.Count - 1; i >= 0; i--)
            {
                var e = enemies[i];
                if (e == null || e.go == null) { enemies.RemoveAt(i); continue; }
                Vector3 to = player.transform.position - e.go.transform.position;
                to.y = 0;
                float d = to.magnitude;
                if (d < 8f && d > 1.25f)
                {
                    e.go.transform.position += to.normalized * e.speed * Time.deltaTime;
                    if (to.sqrMagnitude > 0.1f) e.go.transform.rotation = Quaternion.LookRotation(to.normalized);
                }
                else if (d <= 1.35f && hurtCd <= 0)
                {
                    hp = Mathf.Max(0, hp - e.damage);
                    hurtCd = 0.8f;
                    Show(e.name + " 공격! -" + e.damage, 1.2f);
                    if (hp <= 0) Respawn();
                }
            }
        }

        private void UpdateCamera()
        {
            if (cam == null || player == null) return;
            Vector3 target = player.transform.position + new Vector3(0, 12f, -10f);
            cam.transform.position = Vector3.Lerp(cam.transform.position, target, Time.deltaTime * 7f);
            cam.transform.rotation = Quaternion.Euler(48f, 0, 0);
        }

        private void Attack()
        {
            if (attackCd > 0 || player == null) return;
            attackCd = 0.55f;
            Enemy best = null;
            float bestDist = 2.7f;
            foreach (var e in enemies)
            {
                if (e == null || e.go == null) continue;
                float d = Vector3.Distance(player.transform.position, e.go.transform.position);
                if (d < bestDist) { best = e; bestDist = d; }
            }
            if (best == null) { Show("공격 범위에 적이 없어.", 0.8f); return; }
            best.hp -= 25;
            Show(best.name + "에게 25 피해", 0.8f);
            if (best.hp <= 0)
            {
                Destroy(best.go);
                enemies.Remove(best);
                Show(best.name + " 처치", 1.2f);
            }
        }

        private void Interact()
        {
            if (player == null) return;
            Sample near = null;
            float best = 2.4f;
            foreach (var s in samples)
            {
                if (s == null || s.go == null || s.collected) continue;
                float d = Vector3.Distance(player.transform.position, s.go.transform.position);
                if (d < best) { near = s; best = d; }
            }
            if (near == null) { Show("조사할 흔적이 근처에 없어.", 0.9f); return; }
            near.collected = true;
            Destroy(near.go);
            if (near.herb) swampHerbs++; else jungleSamples++;
            Show(near.name + " 조사 완료", 1.3f);
            CheckStage();
        }

        private void CheckStage()
        {
            if (player == null) return;
            if (stage == 0 && jungleSamples >= 3)
            {
                stage = 1;
                Show("강가를 지나 독늪으로 이동해.", 3f);
            }
            if (stage == 1 && player.transform.position.z > 34f)
            {
                stage = 2;
                Show("독늪에서 해독 허브 2개를 조사해.", 3f);
            }
            if (stage == 2 && swampHerbs >= 2)
            {
                stage = 3;
                Show("해독 준비 완료. 북쪽 고대 유적으로 가.", 3f);
            }
            if (stage == 3 && player.transform.position.z > 84f)
            {
                stage = 4;
                Show("고대 유적 발견! 1차 탐사가 완료됐어.", 8f);
            }

            if (player.transform.position.z > 36f && player.transform.position.z < 62f && hurtCd <= 0 && stage < 3)
            {
                hp = Mathf.Max(0, hp - 4);
                hurtCd = 1f;
                Show("독늪 피해 -4", 0.8f);
                if (hp <= 0) Respawn();
            }
        }

        private void Respawn()
        {
            hp = 100;
            player.enabled = false;
            player.transform.position = new Vector3(0, 1.1f, -1f);
            player.enabled = true;
            Show("캠프로 복귀했어.", 2f);
        }

        private void Show(string text, float sec)
        {
            notice = text;
            noticeUntil = Time.time + sec;
        }

        private void OnGUI()
        {
            float s = Mathf.Clamp(Screen.width / 430f, 0.75f, 1.45f);
            var title = new GUIStyle(GUI.skin.label) { fontSize = Mathf.RoundToInt(18 * s), fontStyle = FontStyle.Bold };
            title.normal.textColor = Color.white;
            var body = new GUIStyle(GUI.skin.label) { fontSize = Mathf.RoundToInt(14 * s) };
            body.normal.textColor = Color.white;

            GUI.Box(new Rect(12, 12, Mathf.Min(330, Screen.width - 24), 110 * s), "");
            GUI.Label(new Rect(24, 20, 300, 28 * s), "정글 탐험대", title);
            GUI.Label(new Rect(24, 50, 300, 24 * s), "체력 " + hp + "/100", body);
            GUI.Label(new Rect(24, 72, 300, 24 * s), "정글 표본 " + jungleSamples + "/3  |  허브 " + swampHerbs + "/2", body);
            GUI.Label(new Rect(24, 94, Screen.width - 48, 26 * s), Objective(), body);

            if (Time.time < noticeUntil)
            {
                GUI.Box(new Rect(20, 135 * s, Screen.width - 40, 44 * s), "");
                GUI.Label(new Rect(30, 143 * s, Screen.width - 60, 28 * s), notice, body);
            }

            float button = Mathf.Clamp(Screen.width * 0.18f, 72f, 100f);
            if (GUI.Button(new Rect(Screen.width - button - 18, Screen.height - button - 18, button, button), "공격")) Attack();
            if (GUI.Button(new Rect(Screen.width - button * 2 - 30, Screen.height - button - 18, button, button), "조사")) Interact();

            GUI.Box(new Rect(18, Screen.height - 142, 124, 124), "");
            GUI.Label(new Rect(33, Screen.height - 92, 100, 30), "이동", title);

            DrawEnemyLabels(body);
        }

        private string Objective()
        {
            switch (stage)
            {
                case 0: return "목표: 정글 흔적 3개 조사";
                case 1: return "목표: 강가를 지나 북쪽으로 이동";
                case 2: return "목표: 해독 허브 2개 조사";
                case 3: return "목표: 고대 유적 발견";
                default: return "1차 탐사 완료";
            }
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
                GUI.Label(new Rect(p.x - 45, y - 16, 90, 22), e.name + " " + e.hp, style);
            }
        }

        private void AddEnemy(string name, Vector3 pos, int hpValue, int damage, float speed, Color color, PrimitiveType type)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = name;
            go.transform.position = pos;
            go.transform.localScale = type == PrimitiveType.Cube ? new Vector3(2.3f, 0.7f, 1.1f) : new Vector3(1.1f, 1f, 1.1f);
            SetColor(go, color);
            enemies.Add(new Enemy { go = go, name = name, hp = hpValue, damage = damage, speed = speed });
        }

        private void AddSample(string name, Vector3 pos, bool herb)
        {
            var go = GameObject.CreatePrimitive(herb ? PrimitiveType.Cylinder : PrimitiveType.Sphere);
            go.name = name;
            go.transform.position = pos;
            go.transform.localScale = herb ? new Vector3(0.6f, 0.3f, 0.6f) : Vector3.one * 0.6f;
            SetColor(go, herb ? new Color(0.55f, 0.95f, 0.32f) : new Color(0.94f, 0.88f, 0.35f));
            samples.Add(new Sample { go = go, name = name, herb = herb });
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
            var r = go.GetComponent<Renderer>();
            if (r == null) return;
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard"));
            mat.color = color;
            r.material = mat;
        }

        private sealed class Enemy
        {
            public GameObject go;
            public string name;
            public int hp;
            public int damage;
            public float speed;
        }

        private sealed class Sample
        {
            public GameObject go;
            public string name;
            public bool herb;
            public bool collected;
        }
    }
}
