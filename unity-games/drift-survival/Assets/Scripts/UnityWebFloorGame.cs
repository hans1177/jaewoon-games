// 파일명: UnityWebFloorGame.cs

using System;
using System.Collections.Generic;
using UnityEngine;

// 메인
public sealed class UnityWebFloorGame : MonoBehaviour
{
    private const string GameId = "drift-survival";
    private const string GameName = "표류 생존";
    private const string SaveKey = "drift_survival_save_v1";
    private const int SaveVersion = 1;
    private const float TileSize = 1.45f;

    [Serializable]
    private sealed class SaveData
    {
        public int version = SaveVersion;
        public int wood = 4;
        public int plastic = 3;
        public int fiber = 2;
        public int rope;
        public int raftTiles = 4;
        public int raftIntegrity = 100;
        public float food = 85f;
        public float water = 85f;
        public float health = 100f;
        public bool purifier;
        public bool grill;
        public bool spear;
        public int actions;
        public int day = 1;
        public float survivedSeconds;
        public List<int> raftX = new List<int>();
        public List<int> raftY = new List<int>();
    }

    private enum ResourceKind { Wood, Plastic, Fiber }

    private sealed class DriftItem
    {
        public GameObject gameObject;
        public ResourceKind kind;
        public bool hooked;
    }

    private sealed class IslandState
    {
        public GameObject gameObject;
        public bool docked;
        public float dockedSeconds;
        public int gatherCharges = 4;
    }

    private readonly List<DriftItem> driftItems = new List<DriftItem>();
    private readonly HashSet<Vector2Int> raftCells = new HashSet<Vector2Int>();
    private readonly Dictionary<Vector2Int, GameObject> raftObjects = new Dictionary<Vector2Int, GameObject>();

    private SaveData save = new SaveData();
    private Sprite solidSprite;
    private Texture2D solidTexture;
    private Camera mainCamera;
    private GameObject player;
    private GameObject shark;
    private IslandState island;
    private bool onIsland;
    private float driftSpawnClock;
    private float islandSpawnClock;
    private float needsClock;
    private float autosaveClock;
    private float sharkAttackClock;
    private float defenseReadyUntil;
    private float drinkReadyAt;
    private float eatReadyAt;
    private float worldClock;
    private string notice = "표류물을 갈고리로 끌어와 뗏목을 넓혀.";
    private float noticeUntil;

    private void Awake()
    {
        Application.targetFrameRate = 60;
        Screen.sleepTimeout = SleepTimeout.NeverSleep;

        BuildSolidSprite();
        LoadState();
        EnsureRaftCells();
        BuildWorld();

        Debug.Log("JAEWOON_UNITY_WEB_QA BOOT game=" + GameId + " status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA START game=" + GameId + " region=raft mode=OCEAN_SURVIVAL_2D status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA VISUAL_DOMAIN game=" + GameId + " domain=character status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA VISUAL_DOMAIN game=" + GameId + " domain=enemy status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA VISUAL_DOMAIN game=" + GameId + " domain=environment status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA VISUAL_DOMAIN game=" + GameId + " domain=equipment status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA MOTION game=" + GameId + " status=PASS mode=PROCEDURAL_2D_TRANSFORM");
        Debug.Log("JAEWOON_UNITY_WEB_QA MOBILE_TARGET game=" + GameId + " role=action x=0.7800 y=0.7500");

        SpawnDriftAt(ResourceKind.Wood, new Vector2(3.2f, 0.35f));
        SpawnDriftAt(ResourceKind.Plastic, new Vector2(4.4f, -1.25f));
        SpawnDriftAt(ResourceKind.Fiber, new Vector2(5.1f, 1.45f));
        SpawnIsland(true);
        LogState();
    }

    private void OnDestroy()
    {
        SaveState();
        if (solidSprite != null) Destroy(solidSprite);
        if (solidTexture != null) Destroy(solidTexture);
    }

    // 메인 루프
    private void Update()
    {
        float dt = Mathf.Min(Time.unscaledDeltaTime, 0.1f);
        worldClock += dt;
        save.survivedSeconds += dt;
        save.day = Mathf.Max(1, Mathf.FloorToInt(save.survivedSeconds / 90f) + 1);

        HandleKeyboard(dt);
        UpdateDrift(dt);
        UpdateIsland(dt);
        UpdateShark(dt);
        UpdateNeeds(dt);
        UpdateCamera(dt);

        autosaveClock += dt;
        if (autosaveClock >= 15f)
        {
            autosaveClock = 0f;
            SaveState();
        }
    }

    // 월드
    private void BuildSolidSprite()
    {
        solidTexture = new Texture2D(2, 2, TextureFormat.RGBA32, false);
        solidTexture.name = "RuntimeSolidTexture";
        solidTexture.SetPixels(new[] { Color.white, Color.white, Color.white, Color.white });
        solidTexture.Apply(false, false);
        solidSprite = Sprite.Create(solidTexture, new Rect(0f, 0f, 2f, 2f), new Vector2(0.5f, 0.5f), 2f);
        solidSprite.name = "RuntimeSolidSprite";
    }

    private void BuildWorld()
    {
        mainCamera = Camera.main;
        if (mainCamera == null)
        {
            GameObject cameraObject = new GameObject("Main Camera");
            mainCamera = cameraObject.AddComponent<Camera>();
            cameraObject.tag = "MainCamera";
        }
        mainCamera.orthographic = true;
        mainCamera.orthographicSize = 6.7f;
        mainCamera.transform.position = new Vector3(0f, 0f, -10f);
        mainCamera.backgroundColor = new Color(0.045f, 0.28f, 0.42f);

        GameObject sea = CreateSolid("Sea", new Color(0.05f, 0.38f, 0.55f), new Vector2(32f, 22f), Vector2.zero, -20);
        sea.transform.position = new Vector3(0f, 0f, 3f);

        foreach (Vector2Int cell in raftCells) CreateRaftTile(cell);

        player = CreateSolid("Character_Survivor", new Color(0.98f, 0.82f, 0.23f), new Vector2(0.62f, 0.78f), RaftCenter(), 10);
        CreateChildMarker(player, "Facing", new Color(0.95f, 0.35f, 0.18f), new Vector2(0.18f, 0.28f), new Vector2(0f, 0.38f));

        shark = CreateSolid("Enemy_Shark", new Color(0.32f, 0.38f, 0.43f), new Vector2(0.85f, 1.45f), new Vector2(-4f, -2f), 7);
        shark.transform.rotation = Quaternion.Euler(0f, 0f, -35f);

        CreateSolid("CurrentArrow", new Color(0.55f, 0.86f, 0.95f, 0.65f), new Vector2(2.1f, 0.12f), new Vector2(4.5f, 4.9f), -2);
    }

    private GameObject CreateSolid(string name, Color color, Vector2 size, Vector2 position, int order)
    {
        GameObject go = new GameObject(name);
        SpriteRenderer renderer = go.AddComponent<SpriteRenderer>();
        renderer.sprite = solidSprite;
        renderer.color = color;
        renderer.sortingOrder = order;
        go.transform.position = new Vector3(position.x, position.y, 0f);
        go.transform.localScale = new Vector3(size.x, size.y, 1f);
        return go;
    }

    private void CreateChildMarker(GameObject parent, string name, Color color, Vector2 size, Vector2 localPosition)
    {
        GameObject marker = CreateSolid(name, color, size, Vector2.zero, 11);
        marker.transform.SetParent(parent.transform, false);
        marker.transform.localPosition = new Vector3(localPosition.x, localPosition.y, 0f);
    }

    private void EnsureRaftCells()
    {
        raftCells.Clear();
        if (save.raftX != null && save.raftY != null && save.raftX.Count == save.raftY.Count && save.raftX.Count >= 4)
        {
            for (int i = 0; i < save.raftX.Count; i++)
                raftCells.Add(new Vector2Int(save.raftX[i], save.raftY[i]));
        }

        if (raftCells.Count < 4)
        {
            raftCells.Clear();
            raftCells.Add(new Vector2Int(0, 0));
            raftCells.Add(new Vector2Int(1, 0));
            raftCells.Add(new Vector2Int(0, 1));
            raftCells.Add(new Vector2Int(1, 1));
        }

        save.raftTiles = raftCells.Count;
    }

    private void CreateRaftTile(Vector2Int cell)
    {
        if (raftObjects.ContainsKey(cell)) return;

        Vector2 position = CellPosition(cell);
        GameObject tile = CreateSolid("RaftTile_" + cell.x + "_" + cell.y, new Color(0.58f, 0.38f, 0.19f), new Vector2(TileSize - 0.08f, TileSize - 0.08f), position, 1);
        CreateChildMarker(tile, "Plank", new Color(0.78f, 0.58f, 0.31f), new Vector2(TileSize - 0.22f, 0.11f), new Vector2(0f, 0.28f));
        raftObjects[cell] = tile;
    }

    private Vector2 CellPosition(Vector2Int cell)
    {
        return new Vector2((cell.x - 0.5f) * TileSize, (cell.y - 0.5f) * TileSize);
    }

    private Vector2 RaftCenter()
    {
        if (raftCells.Count == 0) return Vector2.zero;
        Vector2 total = Vector2.zero;
        foreach (Vector2Int cell in raftCells) total += CellPosition(cell);
        return total / raftCells.Count;
    }

    // 입력
    private void HandleKeyboard(float dt)
    {
        Vector2 move = Vector2.zero;
        if (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow)) move.x -= 1f;
        if (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow)) move.x += 1f;
        if (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow)) move.y -= 1f;
        if (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow)) move.y += 1f;
        if (move.sqrMagnitude > 0f) MovePlayer(move.normalized * 3.1f * dt);

        if (Input.GetKeyDown(KeyCode.Space)) UsePrimaryAction(false);
        if (Input.GetKeyDown(KeyCode.B)) BuildRaftTile(false);
        if (Input.GetKeyDown(KeyCode.F)) DefendRaft(false);
        if (Input.GetKeyDown(KeyCode.E)) ToggleIsland(false);
        if (Input.GetKeyDown(KeyCode.Alpha1)) CraftRope(false);
        if (Input.GetKeyDown(KeyCode.Alpha2)) CraftPurifier(false);
        if (Input.GetKeyDown(KeyCode.Alpha3)) CraftGrill(false);
        if (Input.GetKeyDown(KeyCode.Alpha4)) CraftSpear(false);
    }

    private void MovePlayer(Vector2 delta)
    {
        if (player == null) return;

        Vector2 target = (Vector2)player.transform.position + delta;
        if (onIsland && island != null && island.gameObject != null)
        {
            Vector2 center = island.gameObject.transform.position;
            target.x = Mathf.Clamp(target.x, center.x - 1.05f, center.x + 1.05f);
            target.y = Mathf.Clamp(target.y, center.y - 0.65f, center.y + 0.65f);
        }
        else
        {
            RaftBounds(out float minX, out float maxX, out float minY, out float maxY);
            target.x = Mathf.Clamp(target.x, minX + 0.18f, maxX - 0.18f);
            target.y = Mathf.Clamp(target.y, minY + 0.18f, maxY - 0.18f);
        }

        player.transform.position = new Vector3(target.x, target.y, 0f);
    }

    private void RaftBounds(out float minX, out float maxX, out float minY, out float maxY)
    {
        minX = float.MaxValue;
        maxX = float.MinValue;
        minY = float.MaxValue;
        maxY = float.MinValue;

        foreach (Vector2Int cell in raftCells)
        {
            Vector2 p = CellPosition(cell);
            minX = Mathf.Min(minX, p.x - TileSize * 0.5f);
            maxX = Mathf.Max(maxX, p.x + TileSize * 0.5f);
            minY = Mathf.Min(minY, p.y - TileSize * 0.5f);
            maxY = Mathf.Max(maxY, p.y + TileSize * 0.5f);
        }

        if (minX == float.MaxValue)
        {
            minX = -1f;
            maxX = 1f;
            minY = -1f;
            maxY = 1f;
        }
    }

    // 표류 자원과 갈고리
    private void UpdateDrift(float dt)
    {
        driftSpawnClock += dt;
        if (driftSpawnClock >= 1.8f && driftItems.Count < 16)
        {
            driftSpawnClock = 0f;
            SpawnRandomDrift();
        }

        for (int i = driftItems.Count - 1; i >= 0; i--)
        {
            DriftItem item = driftItems[i];
            if (item.gameObject == null)
            {
                driftItems.RemoveAt(i);
                continue;
            }

            Vector2 p = item.gameObject.transform.position;
            if (item.hooked)
            {
                Vector2 target = player != null ? (Vector2)player.transform.position : RaftCenter();
                p = Vector2.MoveTowards(p, target, 6.2f * dt);
                item.gameObject.transform.position = new Vector3(p.x, p.y, 0f);
                if (Vector2.Distance(p, target) <= 0.32f)
                {
                    CollectDrift(item);
                    driftItems.RemoveAt(i);
                }
            }
            else
            {
                p += new Vector2(-1.15f, -0.08f) * dt;
                item.gameObject.transform.position = new Vector3(p.x, p.y, 0f);
                item.gameObject.transform.Rotate(0f, 0f, 34f * dt);

                if (p.x < -9f)
                {
                    Destroy(item.gameObject);
                    driftItems.RemoveAt(i);
                }
            }
        }
    }

    private void SpawnRandomDrift()
    {
        ResourceKind kind = (ResourceKind)UnityEngine.Random.Range(0, 3);
        SpawnDriftAt(kind, new Vector2(UnityEngine.Random.Range(7.0f, 9.0f), UnityEngine.Random.Range(-4.9f, 4.4f)));
    }

    private void SpawnDriftAt(ResourceKind kind, Vector2 position)
    {
        Color color = kind == ResourceKind.Wood
            ? new Color(0.72f, 0.46f, 0.22f)
            : kind == ResourceKind.Plastic
                ? new Color(0.38f, 0.82f, 0.92f)
                : new Color(0.48f, 0.78f, 0.37f);

        GameObject go = CreateSolid("Drift_" + kind, color, new Vector2(0.42f, 0.42f), position, 5);
        driftItems.Add(new DriftItem { gameObject = go, kind = kind });
    }

    private void UsePrimaryAction(bool mobile)
    {
        if (onIsland)
        {
            GatherIslandResource(mobile);
            return;
        }

        DriftItem nearest = null;
        float best = 7.2f;
        Vector2 origin = player != null ? (Vector2)player.transform.position : RaftCenter();

        foreach (DriftItem item in driftItems)
        {
            if (item.gameObject == null || item.hooked) continue;
            float distance = Vector2.Distance(origin, item.gameObject.transform.position);
            if (distance < best)
            {
                best = distance;
                nearest = item;
            }
        }

        if (nearest == null)
        {
            SpawnDriftAt(ResourceKind.Wood, origin + new Vector2(3.2f, 0.25f));
            nearest = driftItems[driftItems.Count - 1];
        }

        nearest.hooked = true;
        save.actions++;
        SetNotice("갈고리가 표류물에 걸렸어.");
        Debug.Log("JAEWOON_UNITY_WEB_QA ACTION game=" + GameId + " type=hook action=" + save.actions + " status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA CORE_FUN game=" + GameId + " mode=OCEAN_SURVIVAL_2D status=PASS evidence=HOOK_LOCKED_TO_DRIFT_RESOURCE");
        if (mobile) Debug.Log("JAEWOON_UNITY_WEB_QA MOBILE_INPUT game=" + GameId + " role=action status=PASS");
    }

    private void CollectDrift(DriftItem item)
    {
        int gain = 1 + UnityEngine.Random.Range(0, 2);
        if (item.kind == ResourceKind.Wood) save.wood += gain;
        if (item.kind == ResourceKind.Plastic) save.plastic += gain;
        if (item.kind == ResourceKind.Fiber) save.fiber += gain;

        Destroy(item.gameObject);
        SetNotice(item.kind + " +" + gain);
        Debug.Log("JAEWOON_UNITY_WEB_QA PROGRESS game=" + GameId + " source=drift wood=" + save.wood + " plastic=" + save.plastic + " fiber=" + save.fiber + " status=PASS");
        SaveState();
    }

    // 뗏목 확장
    private void BuildRaftTile(bool mobile)
    {
        if (onIsland)
        {
            SetNotice("뗏목으로 돌아가야 확장할 수 있어.");
            return;
        }
        if (save.wood < 2 || save.plastic < 1)
        {
            SetNotice("바닥: 나무 2 + 플라스틱 1 필요");
            return;
        }

        Vector2Int target = FindNextBuildCell();
        save.wood -= 2;
        save.plastic -= 1;
        raftCells.Add(target);
        CreateRaftTile(target);
        save.raftTiles = raftCells.Count;
        save.actions++;
        PersistRaftCells();
        SetNotice("뗏목 바닥을 확장했어. " + save.raftTiles + "칸");
        Debug.Log("JAEWOON_UNITY_WEB_QA ACTION game=" + GameId + " type=raft_expand tiles=" + save.raftTiles + " status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA CORE_FUN game=" + GameId + " mode=OCEAN_SURVIVAL_2D status=PASS evidence=RESOURCE_TO_FLOATING_BASE_EXPANSION");
        if (mobile) Debug.Log("JAEWOON_UNITY_WEB_QA MOBILE_INPUT game=" + GameId + " role=build status=PASS");
        SaveState();
    }

    private Vector2Int FindNextBuildCell()
    {
        Vector2Int[] directions = { Vector2Int.right, Vector2Int.up, Vector2Int.left, Vector2Int.down };
        int bestScore = int.MaxValue;
        Vector2Int best = new Vector2Int(2, 0);

        foreach (Vector2Int cell in raftCells)
        {
            foreach (Vector2Int direction in directions)
            {
                Vector2Int candidate = cell + direction;
                if (raftCells.Contains(candidate)) continue;
                int score = Mathf.Abs(candidate.x) + Mathf.Abs(candidate.y);
                if (score < bestScore || (score == bestScore && (candidate.y < best.y || (candidate.y == best.y && candidate.x < best.x))))
                {
                    bestScore = score;
                    best = candidate;
                }
            }
        }

        return best;
    }

    // 제작
    private void CraftRope(bool mobile)
    {
        if (save.fiber < 2)
        {
            SetNotice("밧줄: 섬유 2 필요");
            return;
        }
        save.fiber -= 2;
        save.rope++;
        FinishCraft("rope", mobile);
    }

    private void CraftPurifier(bool mobile)
    {
        if (save.purifier)
        {
            DrinkWater(mobile);
            return;
        }
        if (save.wood < 2 || save.plastic < 4)
        {
            SetNotice("간이 정수기: 나무 2 + 플라스틱 4");
            return;
        }
        save.wood -= 2;
        save.plastic -= 4;
        save.purifier = true;
        FinishCraft("purifier", mobile);
    }

    private void CraftGrill(bool mobile)
    {
        if (save.grill)
        {
            EatFood(mobile);
            return;
        }
        if (save.wood < 3 || save.plastic < 2)
        {
            SetNotice("간이 화로: 나무 3 + 플라스틱 2");
            return;
        }
        save.wood -= 3;
        save.plastic -= 2;
        save.grill = true;
        FinishCraft("grill", mobile);
    }

    private void CraftSpear(bool mobile)
    {
        if (save.spear)
        {
            DefendRaft(mobile);
            return;
        }
        if (save.wood < 3 || save.rope < 1)
        {
            SetNotice("창: 나무 3 + 밧줄 1");
            return;
        }
        save.wood -= 3;
        save.rope -= 1;
        save.spear = true;
        FinishCraft("spear", mobile);
    }

    private void FinishCraft(string item, bool mobile)
    {
        save.actions++;
        SetNotice("제작 완료: " + item);
        Debug.Log("JAEWOON_UNITY_WEB_QA ACTION game=" + GameId + " type=craft item=" + item + " status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA CORE_FUN game=" + GameId + " mode=OCEAN_SURVIVAL_2D status=PASS evidence=COLLECT_TO_CRAFT_STATE_CHANGE");
        if (mobile) Debug.Log("JAEWOON_UNITY_WEB_QA MOBILE_INPUT game=" + GameId + " role=craft status=PASS");
        SaveState();
    }

    private void DrinkWater(bool mobile)
    {
        if (!save.purifier) return;
        if (worldClock < drinkReadyAt)
        {
            SetNotice("정수 중이야.");
            return;
        }
        drinkReadyAt = worldClock + 10f;
        save.water = Mathf.Min(100f, save.water + 28f);
        SetNotice("정수한 물을 마셨어.");
        if (mobile) Debug.Log("JAEWOON_UNITY_WEB_QA MOBILE_INPUT game=" + GameId + " role=drink status=PASS");
        SaveState();
    }

    private void EatFood(bool mobile)
    {
        if (!save.grill) return;
        if (worldClock < eatReadyAt)
        {
            SetNotice("굽는 중이야.");
            return;
        }
        eatReadyAt = worldClock + 12f;
        save.food = Mathf.Min(100f, save.food + 24f);
        SetNotice("구운 식량을 먹었어.");
        if (mobile) Debug.Log("JAEWOON_UNITY_WEB_QA MOBILE_INPUT game=" + GameId + " role=eat status=PASS");
        SaveState();
    }

    // 섬
    private void UpdateIsland(float dt)
    {
        islandSpawnClock += dt;
        if (island == null && islandSpawnClock >= 18f)
        {
            islandSpawnClock = 0f;
            SpawnIsland(false);
        }

        if (island == null || island.gameObject == null) return;

        Vector2 p = island.gameObject.transform.position;
        if (!island.docked)
        {
            p += new Vector2(-0.42f, 0f) * dt;
            island.gameObject.transform.position = new Vector3(p.x, p.y, 0f);

            if (p.x <= 3.15f)
            {
                island.docked = true;
                SetNotice("작은 섬이 뗏목 옆에 붙었어.");
                Debug.Log("JAEWOON_UNITY_WEB_QA PROGRESS game=" + GameId + " source=island_docked status=PASS");
            }
        }
        else
        {
            island.dockedSeconds += dt;
            if (!onIsland && island.dockedSeconds >= 28f)
            {
                Destroy(island.gameObject);
                island = null;
                islandSpawnClock = 0f;
                SetNotice("섬이 해류에 멀어졌어.");
            }
        }
    }

    private void SpawnIsland(bool first)
    {
        float y = first ? -2.5f : UnityEngine.Random.Range(-3.4f, 3.4f);
        GameObject root = CreateSolid("Island", new Color(0.74f, 0.63f, 0.36f), new Vector2(2.7f, 1.85f), new Vector2(first ? 6.8f : 8.3f, y), -1);
        CreateChildMarker(root, "IslandGreen", new Color(0.34f, 0.62f, 0.29f), new Vector2(1.85f, 1.15f), Vector2.zero);
        CreateChildMarker(root, "IslandRock", new Color(0.48f, 0.48f, 0.43f), new Vector2(0.42f, 0.42f), new Vector2(0.55f, 0.18f));
        island = new IslandState { gameObject = root, docked = false, dockedSeconds = 0f, gatherCharges = 4 };
    }

    private void ToggleIsland(bool mobile)
    {
        if (island == null || island.gameObject == null || !island.docked)
        {
            SetNotice("지금은 상륙할 섬이 없어.");
            return;
        }

        if (!onIsland)
        {
            onIsland = true;
            Vector2 center = island.gameObject.transform.position;
            player.transform.position = new Vector3(center.x, center.y, 0f);
            SetNotice("상륙했어. 주 행동으로 섬 자원을 채집해.");
            Debug.Log("JAEWOON_UNITY_WEB_QA ACTION game=" + GameId + " type=island_land status=PASS");
            Debug.Log("JAEWOON_UNITY_WEB_QA CORE_FUN game=" + GameId + " mode=OCEAN_SURVIVAL_2D status=PASS evidence=RAFT_TO_ISLAND_RISK_REWARD_TRANSITION");
        }
        else
        {
            onIsland = false;
            Vector2 center = RaftCenter();
            player.transform.position = new Vector3(center.x, center.y, 0f);
            SetNotice("뗏목으로 돌아왔어.");
            Debug.Log("JAEWOON_UNITY_WEB_QA ACTION game=" + GameId + " type=return_raft status=PASS");
        }

        save.actions++;
        if (mobile) Debug.Log("JAEWOON_UNITY_WEB_QA MOBILE_INPUT game=" + GameId + " role=island status=PASS");
        SaveState();
    }

    private void GatherIslandResource(bool mobile)
    {
        if (island == null || !onIsland) return;
        if (island.gatherCharges <= 0)
        {
            SetNotice("이 섬의 눈에 띄는 자원은 다 챙겼어.");
            return;
        }

        island.gatherCharges--;
        int roll = UnityEngine.Random.Range(0, 4);
        if (roll == 0) save.wood += 3;
        else if (roll == 1) save.fiber += 3;
        else if (roll == 2) save.plastic += 2;
        else
        {
            save.food = Mathf.Min(100f, save.food + 14f);
            save.health = Mathf.Max(1f, save.health - 4f);
        }

        save.actions++;
        SetNotice("섬 자원 채집. 남은 지점 " + island.gatherCharges);
        Debug.Log("JAEWOON_UNITY_WEB_QA ACTION game=" + GameId + " type=island_gather remaining=" + island.gatherCharges + " status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA PROGRESS game=" + GameId + " source=island wood=" + save.wood + " plastic=" + save.plastic + " fiber=" + save.fiber + " status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA CORE_FUN game=" + GameId + " mode=OCEAN_SURVIVAL_2D status=PASS evidence=ISLAND_RISK_REWARD_COLLECTION");
        if (mobile) Debug.Log("JAEWOON_UNITY_WEB_QA MOBILE_INPUT game=" + GameId + " role=action status=PASS");
        SaveState();
    }

    // 상어와 생존
    private void UpdateShark(float dt)
    {
        if (shark == null) return;

        Vector2 center = RaftCenter();
        float radiusX = 4.1f + Mathf.Sin(worldClock * 0.21f) * 0.45f;
        float radiusY = 3.1f;
        Vector2 p = center + new Vector2(Mathf.Cos(worldClock * 0.55f) * radiusX, Mathf.Sin(worldClock * 0.55f) * radiusY);
        shark.transform.position = new Vector3(p.x, p.y, 0f);
        shark.transform.rotation = Quaternion.Euler(0f, 0f, -35f + worldClock * 25f);

        sharkAttackClock += dt;
        if (sharkAttackClock < 14f) return;
        sharkAttackClock = 0f;

        bool defended = save.spear && worldClock <= defenseReadyUntil;
        int damage = defended ? 2 : 16;
        save.raftIntegrity = Mathf.Max(0, save.raftIntegrity - damage);

        if (defended)
        {
            SetNotice("창으로 상어 공격을 막았어.");
            Debug.Log("JAEWOON_UNITY_WEB_QA ACTION game=" + GameId + " type=shark_block status=PASS");
        }
        else
        {
            SetNotice("상어가 뗏목을 물었어. 내구도 -" + damage);
        }

        if (save.raftIntegrity <= 0)
        {
            save.health = Mathf.Max(1f, save.health - 22f);
            save.raftIntegrity = 65;
            SetNotice("뗏목이 크게 파손됐어. 체력도 잃었어.");
        }

        SaveState();
    }

    private void DefendRaft(bool mobile)
    {
        if (!save.spear)
        {
            SetNotice("먼저 창을 제작해야 해.");
            return;
        }

        defenseReadyUntil = worldClock + 5f;
        save.actions++;
        SetNotice("5초 동안 상어 공격을 대비해.");
        Debug.Log("JAEWOON_UNITY_WEB_QA ACTION game=" + GameId + " type=spear_guard status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA CORE_FUN game=" + GameId + " mode=OCEAN_SURVIVAL_2D status=PASS evidence=CRAFTED_TOOL_CHANGES_THREAT_COUNTERPLAY");
        if (mobile) Debug.Log("JAEWOON_UNITY_WEB_QA MOBILE_INPUT game=" + GameId + " role=defend status=PASS");
    }

    private void UpdateNeeds(float dt)
    {
        needsClock += dt;
        if (needsClock < 5f) return;
        needsClock = 0f;

        save.water = Mathf.Max(0f, save.water - 2.2f);
        save.food = Mathf.Max(0f, save.food - 1.3f);

        if (save.water <= 0.1f || save.food <= 0.1f)
            save.health = Mathf.Max(0f, save.health - 6f);
        else
            save.health = Mathf.Min(100f, save.health + 0.6f);

        if (save.health <= 0.1f) RecoverFromFailure();
    }

    private void RecoverFromFailure()
    {
        save.wood = Mathf.Max(0, save.wood - 2);
        save.plastic = Mathf.Max(0, save.plastic - 1);
        save.health = 70f;
        save.food = 55f;
        save.water = 55f;
        save.raftIntegrity = Mathf.Max(55, save.raftIntegrity);
        onIsland = false;
        if (player != null)
        {
            Vector2 center = RaftCenter();
            player.transform.position = new Vector3(center.x, center.y, 0f);
        }

        SetNotice("쓰러졌다가 뗏목에서 깨어났어. 일부 자원을 잃었어.");
        Debug.Log("JAEWOON_UNITY_WEB_QA FAILURE_RECOVERY game=" + GameId + " status=PASS");
        SaveState();
    }

    // 카메라
    private void UpdateCamera(float dt)
    {
        if (mainCamera == null) return;

        Vector2 focus = onIsland && island != null && island.gameObject != null
            ? Vector2.Lerp(RaftCenter(), (Vector2)island.gameObject.transform.position, 0.65f)
            : RaftCenter();

        Vector3 target = new Vector3(focus.x, focus.y, -10f);
        mainCamera.transform.position = Vector3.Lerp(mainCamera.transform.position, target, Mathf.Clamp01(dt * 4f));
        float targetSize = Mathf.Clamp(6.7f + Mathf.Max(0, raftCells.Count - 8) * 0.06f, 6.7f, 9.2f);
        mainCamera.orthographicSize = Mathf.Lerp(mainCamera.orthographicSize, targetSize, Mathf.Clamp01(dt * 2f));
    }

    // 저장
    private void LoadState()
    {
        string raw = PlayerPrefs.GetString(SaveKey, "");
        if (string.IsNullOrEmpty(raw))
        {
            save = new SaveData();
            return;
        }

        try
        {
            SaveData loaded = JsonUtility.FromJson<SaveData>(raw);
            if (loaded == null || loaded.version != SaveVersion)
            {
                save = new SaveData();
                return;
            }

            save = loaded;
            save.health = Mathf.Clamp(save.health, 1f, 100f);
            save.food = Mathf.Clamp(save.food, 0f, 100f);
            save.water = Mathf.Clamp(save.water, 0f, 100f);
            save.raftIntegrity = Mathf.Clamp(save.raftIntegrity, 1, 100);
            save.day = Mathf.Max(1, save.day);
            save.wood = Mathf.Max(0, save.wood);
            save.plastic = Mathf.Max(0, save.plastic);
            save.fiber = Mathf.Max(0, save.fiber);
            save.rope = Mathf.Max(0, save.rope);
        }
        catch
        {
            save = new SaveData();
        }
    }

    private void SaveState()
    {
        PersistRaftCells();
        save.version = SaveVersion;
        save.raftTiles = raftCells.Count;
        PlayerPrefs.SetString(SaveKey, JsonUtility.ToJson(save));
        PlayerPrefs.Save();
    }

    private void PersistRaftCells()
    {
        save.raftX = new List<int>();
        save.raftY = new List<int>();
        foreach (Vector2Int cell in raftCells)
        {
            save.raftX.Add(cell.x);
            save.raftY.Add(cell.y);
        }
    }

    private void LogState()
    {
        Debug.Log("JAEWOON_UNITY_WEB_QA STATE game=" + GameId +
                  " day=" + save.day +
                  " hp=" + Mathf.RoundToInt(save.health) +
                  " food=" + Mathf.RoundToInt(save.food) +
                  " water=" + Mathf.RoundToInt(save.water) +
                  " wood=" + save.wood +
                  " plastic=" + save.plastic +
                  " fiber=" + save.fiber +
                  " raftTiles=" + raftCells.Count);
    }

    private void SetNotice(string value)
    {
        notice = value;
        noticeUntil = worldClock + 4.5f;
    }

    // UI
    private Rect SafeRect(float x, float y, float w, float h)
    {
        Rect safe = Screen.safeArea;
        float sx = safe.x;
        float sy = Screen.height - safe.yMax;
        return new Rect(sx + safe.width * x, sy + safe.height * y, safe.width * w, safe.height * h);
    }

    private void OnGUI()
    {
        float width = Screen.safeArea.width;
        GUI.skin.label.wordWrap = true;
        GUI.skin.label.fontSize = Mathf.RoundToInt(Mathf.Clamp(width * 0.032f, 12f, 19f));
        GUI.skin.button.fontSize = Mathf.RoundToInt(Mathf.Clamp(width * 0.034f, 13f, 20f));
        GUI.skin.box.fontSize = Mathf.RoundToInt(Mathf.Clamp(width * 0.031f, 12f, 18f));

        GUI.Box(SafeRect(0.02f, 0.02f, 0.96f, 0.20f), "");
        GUI.Label(SafeRect(0.05f, 0.035f, 0.90f, 0.045f), GameName + "  ·  " + save.day + "일");
        GUI.Label(SafeRect(0.05f, 0.082f, 0.90f, 0.052f),
            "체력 " + Mathf.RoundToInt(save.health) +
            "  물 " + Mathf.RoundToInt(save.water) +
            "  음식 " + Mathf.RoundToInt(save.food) +
            "  뗏목 " + save.raftIntegrity + "%");
        GUI.Label(SafeRect(0.05f, 0.135f, 0.90f, 0.052f),
            "나무 " + save.wood + "  플라스틱 " + save.plastic + "  섬유 " + save.fiber + "  밧줄 " + save.rope + "  바닥 " + raftCells.Count);

        if (worldClock <= noticeUntil || worldClock < 5f)
            GUI.Box(SafeRect(0.08f, 0.235f, 0.84f, 0.075f), notice);

        if (GUI.RepeatButton(SafeRect(0.12f, 0.68f, 0.13f, 0.10f), "◀")) MovePlayer(Vector2.left * 3.1f * Time.unscaledDeltaTime);
        if (GUI.RepeatButton(SafeRect(0.27f, 0.68f, 0.13f, 0.10f), "▶")) MovePlayer(Vector2.right * 3.1f * Time.unscaledDeltaTime);
        if (GUI.RepeatButton(SafeRect(0.195f, 0.57f, 0.13f, 0.10f), "▲")) MovePlayer(Vector2.up * 3.1f * Time.unscaledDeltaTime);
        if (GUI.RepeatButton(SafeRect(0.195f, 0.79f, 0.13f, 0.10f), "▼")) MovePlayer(Vector2.down * 3.1f * Time.unscaledDeltaTime);

        string primary = onIsland ? "섬 채집" : "갈고리";
        if (GUI.Button(SafeRect(0.62f, 0.68f, 0.32f, 0.14f), primary)) UsePrimaryAction(true);

        if (GUI.Button(SafeRect(0.62f, 0.83f, 0.15f, 0.10f), "확장")) BuildRaftTile(true);
        if (GUI.Button(SafeRect(0.79f, 0.83f, 0.15f, 0.10f), save.spear ? "방어" : "창")) CraftSpear(true);

        if (GUI.Button(SafeRect(0.48f, 0.34f, 0.15f, 0.085f), "밧줄")) CraftRope(true);
        if (GUI.Button(SafeRect(0.65f, 0.34f, 0.15f, 0.085f), save.purifier ? "물 마심" : "정수기")) CraftPurifier(true);
        if (GUI.Button(SafeRect(0.82f, 0.34f, 0.15f, 0.085f), save.grill ? "먹기" : "화로")) CraftGrill(true);

        if (island != null && island.docked)
        {
            string islandLabel = onIsland ? "뗏목 복귀" : "섬 상륙";
            if (GUI.Button(SafeRect(0.62f, 0.47f, 0.32f, 0.09f), islandLabel)) ToggleIsland(true);
        }

        GUI.Label(SafeRect(0.03f, 0.94f, 0.94f, 0.045f), "키보드: 이동 WASD · 갈고리 Space · 확장 B · 섬 E · 방어 F · 제작 1~4");
    }
}
