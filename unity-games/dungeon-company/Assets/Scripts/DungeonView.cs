// 파일명: DungeonView.cs
// 역할: 저폴리 3D 던전과 전투 시각화
using System.Collections.Generic;
using UnityEngine;

namespace JaewoonGames.DungeonCompany
{
    public sealed class DungeonView : MonoBehaviour
    {
        private DungeonGame game;
        private readonly List<GameObject> roomRoots = new();
        private readonly List<Transform> flames = new();
        private GameObject hero;
        private GameObject core;
        private Material floor, wall, purple, gold, green, bone, blue;
        private int visualHash = int.MinValue;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void AutoCreate()
        {
            if (FindFirstObjectByType<DungeonView>() == null)
                new GameObject("DungeonView").AddComponent<DungeonView>();
        }

        private void Awake()
        {
            DontDestroyOnLoad(gameObject);
            floor = Mat(new Color(.16f, .18f, .22f));
            wall = Mat(new Color(.07f, .08f, .11f));
            purple = Mat(new Color(.42f, .18f, .62f));
            gold = Mat(new Color(.96f, .56f, .1f));
            green = Mat(new Color(.25f, .72f, .3f));
            bone = Mat(new Color(.86f, .84f, .76f));
            blue = Mat(new Color(.25f, .5f, .9f));
            SetupWorld();
        }

        private void Start()
        {
            game = FindFirstObjectByType<DungeonGame>();
            Rebuild(true);
        }

        private void Update()
        {
            if (game == null) game = FindFirstObjectByType<DungeonGame>();
            if (game == null) return;
            Rebuild(false);
            UpdateHero();
            UpdateMonsters();
            Animate();
        }

        private void SetupWorld()
        {
            var camObj = new GameObject("DungeonCamera");
            var cam = camObj.AddComponent<Camera>();
            cam.tag = "MainCamera";
            cam.transform.position = new Vector3(10.5f, 13.5f, -14f);
            cam.transform.LookAt(Vector3.zero);
            cam.fieldOfView = 48f;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(.03f, .035f, .055f);

            var sun = new GameObject("DungeonLight").AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.intensity = 1.15f;
            sun.color = new Color(1f, .86f, .68f);
            sun.transform.rotation = Quaternion.Euler(50f, -35f, 0f);

            Cube("Floor", new Vector3(0, -.55f, 0), new Vector3(8, .6f, 27), floor, transform);
            Cube("WallL", new Vector3(-4.3f, 1.1f, 0), new Vector3(.65f, 3.8f, 27), wall, transform);
            Cube("WallR", new Vector3(4.3f, 1.1f, 0), new Vector3(.65f, 3.8f, 27), wall, transform);
            Cube("Entrance", new Vector3(0, 1.1f, -12.7f), new Vector3(6.3f, 2.7f, .6f), wall, transform);
            core = Sphere("Core", new Vector3(0, 1.2f, 12.2f), Vector3.one * 1.7f, purple, transform);

            for (var i = 0; i < DungeonGame.MaxRooms; i++)
            {
                var root = new GameObject($"Room-{i + 1}");
                root.transform.SetParent(transform, false);
                root.transform.position = new Vector3(0, 0, -8f + i * 4f);
                roomRoots.Add(root);
            }

            hero = Humanoid("Invader", new Vector3(0, 0, -12f), blue, transform);
            hero.SetActive(false);
        }

        private void Rebuild(bool force)
        {
            if (game?.State == null) return;
            var h = game.State.unlockedRooms;
            for (var i = 0; i < DungeonGame.MaxRooms; i++)
            {
                var r = game.State.rooms[i];
                h = h * 31 + (int)r.room;
                h = h * 31 + (int)r.monster + r.monsterLevel * 7;
                h = h * 31 + (int)r.trap + r.trapLevel * 11;
            }
            if (!force && h == visualHash) return;
            visualHash = h;
            flames.Clear();

            for (var i = 0; i < roomRoots.Count; i++)
            {
                var root = roomRoots[i].transform;
                for (var c = root.childCount - 1; c >= 0; c--) Destroy(root.GetChild(c).gameObject);
                var unlocked = i < game.State.unlockedRooms;
                Cube("Plate", Vector3.zero, new Vector3(7.3f, .32f, 3.4f), unlocked ? floor : wall, root);
                if (!unlocked) { Cube("Gate", new Vector3(0, 1f, 0), new Vector3(5.6f, 2f, .3f), wall, root); continue; }

                var r = game.State.rooms[i];
                if (r.room == RoomType.Guard)
                {
                    Cube("BannerL", new Vector3(-3, 1, 0), new Vector3(.25f, 1.9f, 1.1f), purple, root);
                    Cube("BannerR", new Vector3(3, 1, 0), new Vector3(.25f, 1.9f, 1.1f), purple, root);
                }
                else if (r.room == RoomType.TrapLab)
                {
                    Cube("Bench", new Vector3(-2.7f, .55f, .6f), new Vector3(1.7f, .8f, 1.1f), wall, root);
                    Cube("Rack", new Vector3(2.7f, .65f, -.4f), new Vector3(1.3f, 1.1f, .7f), purple, root);
                }
                else if (r.room == RoomType.Vault)
                {
                    for (var x = -1; x <= 1; x++) Cube("Gold", new Vector3(x * 1.1f, .35f, .9f), new Vector3(.8f, .55f, .65f), gold, root);
                }
                else Cube("BuildPad", new Vector3(0, .18f, 0), new Vector3(2.4f, .14f, 2.1f), purple, root);

                BuildTrap(root, r.trap);
                BuildMonster(root, r.monster);
            }
        }

        private void BuildTrap(Transform root, TrapType type)
        {
            if (type == TrapType.Spikes)
            {
                for (var x = -2; x <= 2; x++) Cube("Spike", new Vector3(x * .65f, .32f, -.95f), new Vector3(.22f, .65f, .22f), bone, root).transform.rotation = Quaternion.Euler(0, 0, 45);
            }
            else if (type == TrapType.Darts)
            {
                Cube("DartsL", new Vector3(-3.2f, .65f, -.85f), new Vector3(.35f, 1.25f, 1.1f), purple, root);
                Cube("DartsR", new Vector3(3.2f, .65f, -.85f), new Vector3(.35f, 1.25f, 1.1f), purple, root);
            }
            else if (type == TrapType.Flame)
            {
                for (var x = -1; x <= 1; x++) flames.Add(Sphere("Flame", new Vector3(x * 1.15f, .45f, -.95f), new Vector3(.45f, .85f, .45f), gold, root).transform);
            }
        }

        private void BuildMonster(Transform root, MonsterType type)
        {
            if (type == MonsterType.Slime) Sphere("Slime", new Vector3(0, .55f, .5f), new Vector3(1.15f, .75f, 1.05f), green, root);
            else if (type == MonsterType.Goblin) Humanoid("Goblin", new Vector3(0, 0, .5f), green, root);
            else if (type == MonsterType.Skeleton) Humanoid("Skeleton", new Vector3(0, 0, .5f), bone, root);
        }

        private void UpdateHero()
        {
            hero.SetActive(game.HeroPresent);
            if (!game.HeroPresent) return;
            hero.transform.position = new Vector3(Mathf.Sin(Time.time * 7f) * .08f, Mathf.Abs(Mathf.Sin(Time.time * 5f)) * .07f, game.HeroZ);
        }

        private void UpdateMonsters()
        {
            for (var i = 0; i < game.State.unlockedRooms; i++)
            {
                var alive = !game.WaveActive || game.GetMonsterHp(i) > 0;
                var root = roomRoots[i].transform;
                for (var c = 0; c < root.childCount; c++)
                {
                    var go = root.GetChild(c).gameObject;
                    if (go.name == "Slime" || go.name == "Goblin" || go.name == "Skeleton") go.SetActive(alive);
                }
            }
        }

        private void Animate()
        {
            var s = 1.55f + Mathf.Sin(Time.time * 2.6f) * .1f;
            core.transform.localScale = Vector3.one * s;
            core.transform.Rotate(Vector3.up, 22f * Time.deltaTime, Space.World);
            for (var i = 0; i < flames.Count; i++)
            {
                if (flames[i] == null) continue;
                var f = .9f + Mathf.Sin(Time.time * 8f + i) * .12f;
                flames[i].localScale = new Vector3(f, 1.15f + f * .25f, f);
            }
        }

        private static Material Mat(Color color)
        {
            var probe = GameObject.CreatePrimitive(PrimitiveType.Cube);
            var source = probe.GetComponent<Renderer>().sharedMaterial;
            var m = new Material(source);
            m.color = color;
            Object.Destroy(probe);
            return m;
        }

        private static GameObject Cube(string name, Vector3 pos, Vector3 scale, Material mat, Transform parent)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name; go.transform.SetParent(parent, false); go.transform.localPosition = pos; go.transform.localScale = scale;
            go.GetComponent<Renderer>().sharedMaterial = mat;
            var col = go.GetComponent<Collider>(); if (col != null) Object.Destroy(col);
            return go;
        }

        private static GameObject Sphere(string name, Vector3 pos, Vector3 scale, Material mat, Transform parent)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            go.name = name; go.transform.SetParent(parent, false); go.transform.localPosition = pos; go.transform.localScale = scale;
            go.GetComponent<Renderer>().sharedMaterial = mat;
            var col = go.GetComponent<Collider>(); if (col != null) Object.Destroy(col);
            return go;
        }

        private static GameObject Humanoid(string name, Vector3 pos, Material mat, Transform parent)
        {
            var root = new GameObject(name); root.transform.SetParent(parent, false); root.transform.localPosition = pos;
            Cube("Body", new Vector3(0, .9f, 0), new Vector3(.75f, 1.05f, .48f), mat, root.transform);
            Sphere("Head", new Vector3(0, 1.72f, 0), Vector3.one * .62f, mat, root.transform);
            Cube("ArmL", new Vector3(-.55f, .95f, 0), new Vector3(.22f, .9f, .22f), mat, root.transform);
            Cube("ArmR", new Vector3(.55f, .95f, 0), new Vector3(.22f, .9f, .22f), mat, root.transform);
            Cube("LegL", new Vector3(-.2f, .25f, 0), new Vector3(.25f, .75f, .28f), mat, root.transform);
            Cube("LegR", new Vector3(.2f, .25f, 0), new Vector3(.25f, .75f, .28f), mat, root.transform);
            return root;
        }
    }
}
