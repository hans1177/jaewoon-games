// 파일명: UnityWebFloorGame.cs
// 임포트
using System;
using System.Collections.Generic;
using System.Globalization;
using UnityEngine;

// 메인: 기존 웹 마력숲과 별개의 Unity WebGL 3D 개발본.
// 원래 웹 게임의 저장 키와 게임 데이터는 변경하지 않는다.
public sealed class UnityWebFloorGame : MonoBehaviour
{
    private const string GameId = "fantasy-survival";
    private const string GameName = "마력숲 생존기";
    private const string SavePrefix = "fantasy_survival_webfloor_";
    private const string CreativePrefix = "fantasy_survival_webfloor_creative_";
    private const int MaxSummoned = 150;
    private const float HoldSeconds = 0.7f;
    private const float DoubleTapSeconds = 0.45f;

    // 마력숲 원본 몬스터 데이터: 종류 · 이름 · 공격 성향 · 체력 · 공격력 · 이동속도.
    // 데이터는 web-games/fantasy-survival/index.html의 실제 생물 목록에서 가져온다.
    private const string Catalog = "mossboar|이끼멧돼지|neutral|72|9|62;golem|돌정령|neutral|150|18|42;goblin|숲 고블린|aggressive|42|7|72;shadowwolf|그림자늑대|aggressive|95|14|90;fairy|빛의 요정|harmless|26|0|55;foreststag|이끼뿔사슴|neutral|105|12|68;thornhound|가시숲 사냥개|aggressive|128|18|86;ironspirit|철 정령|aggressive|66.5|9.8|135;worldtreebear|세계수 곰|aggressive|380|28|70;sporegiant|독포자 거대버섯|aggressive|340|24|54;rootsovereign|근원포식자 녹스바르|boss|4500|150|186;firewolf|화염 늑대|aggressive|150|10|96;giantburrower|초거대 잠복벌레|aggressive|300|20|68;sandwalker|오아시스 샌드 워커|neutral|500|44|58;firegolemneutral|중립 화염 골렘|neutral|555|30|38;firegolemaggressive|공격적 화염 골렘|aggressive|555|30|42;firesnake|화염 뱀|aggressive|300|25|105;ironibex|철갑 산양|neutral|180|18|64;sapdeer|수액사슴|harmless|120|0|72;crystalboar|수정 멧돼지|aggressive|350|40|82;crystalboarjunior|수정 멧돼지 주니어|aggressive|140|16|82;crystalguardian|수정 수호자|aggressive|500|50|76;crystalgoblin|수정 고블린|aggressive|120|22|82;crystalironspirit|수정 철 정령|aggressive|210|31|138;crystalbear|수정 곰|aggressive|650|46|76;crystalfiresnake|수정 화염 뱀|aggressive|430|38|112;crystalibex|수정 산양|aggressive|360|36|80;shadowwolfleader|그림자 늑대 우두머리|aggressive|250|30|96;crystalfiregolem|수정 화염골렘|aggressive|560|30|54;vampirebat|거대 흡혈 박쥐|aggressive|190|35|118;foresthare|숲토끼|harmless|55|0|86;worldpheasant|세계수 꿩|harmless|70|0|80;ironhidehound|철가죽 들개|aggressive|150|17|88;crystalgoat|수정염소|neutral|135|16|70;lakecroc|거대 호수 악어|aggressive|777|58|88;lakebuffalo|호수 물소|neutral|560|42|58;crystaldeer|수정 사슴|neutral|360|28|82;lakeheron|호수 왜가리|harmless|95|0|78;shark|거대 호수 상어|neutral|800|50|104;giantSquid|대왕오징어|aggressive|1111|66|86;deepAngler|심해 아귀|aggressive|900|60|72;lakefish|호수 물고기|harmless|50|0|72;giantleech|초거대 거머리|aggressive|400|44|74;gorilla|밀림 고릴라|neutral|1000|50|70;anaconda|아나콘다|aggressive|800|65|86;mudwalker|머드 워커|aggressive|750|40|66;yetileader|예티 우두머리|aggressive|2599|72|68;yeticub|예티 새끼|aggressive|400|30|82;polarbear|북극곰|aggressive|1000|50|72;polarwolf|북극늑대|neutral|650|35|92;polarfox|북극여우|harmless|100|0|95;froststalker|서리 추적자|aggressive|220|24|95;icegolem|빙결 골렘|aggressive|420|36|50;jungletiger|밀림 호랑이|aggressive|850|55|110;jungletigerleader|밀림 호랑이 우두머리|aggressive|4500|70|90;primitiveSpearman|창병 원시인|aggressive|600|30|68;primitiveArcher|원거리 원시인|aggressive|400|50|64;jungleGuardian|밀림 수호자|aggressive|1300|70|76;flowergoblin|꽃 고블린|neutral|222|30|72;giantbee|거대 꿀벌|neutral|350|40|110;thornmantis|가시 사마귀|aggressive|600|40|88;giantspider|거대 거미|aggressive|555|50|76;giantspiderling|새끼 거대거미|aggressive|100|15|92;toxicmycelium|맹독 균사체 버섯|aggressive|1800|60|54;toxicsporeorb|맹독 포자 구슬|aggressive|100|0|0;swampgolem|늪 골렘|neutral|1888|70|52;fearbear|공포 곰|aggressive|1800|60|82;swampPrimitiveSpearman|늪 원시인 창병|aggressive|886|70|68;swampPrimitiveArcher|늪 원시인 궁수|aggressive|700|80|64;swampPrimitiveGuard|늪 원시인 보초|aggressive|886|50|0;swampArrowTower|원시 화살탑|aggressive|1200|60|0;sandSpirit|모래 정령|aggressive|400|55|78;giantVenomScorpion|거대 맹독 전갈|aggressive|2222|90|82;wastelandMummy|황무지 미라|aggressive|1800|88|64";

    private enum ScreenMode { Title, Choose, Normal, Creative }
    private ScreenMode mode = ScreenMode.Title;
    private bool playing { get { return mode == ScreenMode.Normal || mode == ScreenMode.Creative; } }
    private bool creative { get { return mode == ScreenMode.Creative; } }
    private bool inventoryOpen, craftingOpen, spawnerOpen, aggressionOpen;
    private int selectedKind, spawnCount = 1;
    private int progress, level = 1, resource = 10, actions, wood, stone;
    private float hp = 100f, maxHp = 100f, nextAttackAt, autosaveAt;
    private Vector3 touchMotion;
    private GameObject player, heldObject, lastTapped;
    private float pressStartedAt, previousTapAt;
    private bool holdFired;
    private Monster selectedMonster, aggressionMonster;
    private SpawnBlock editingSpawner;
    private readonly List<MonsterKind> kinds = new List<MonsterKind>();
    private readonly List<Monster> enemies = new List<Monster>();
    private readonly List<SpawnBlock> blocks = new List<SpawnBlock>();
    private Camera camera3d;
    private Vector2 craftingScroll;

    [Serializable] private sealed class SavedBlock { public float x, z; }
    [Serializable] private sealed class SavedMonster { public string id; public float x, z, hp; public int enemyIndex; public bool attackPlayer; }
    [Serializable] private sealed class SavedWorld
    {
        public float x, z, hp;
        public int progress, level, resource, actions, wood, stone;
        public SavedBlock[] blocks;
        public SavedMonster[] monsters;
    }
    private sealed class MonsterKind
    {
        public string id, name, mood;
        public float health, damage, speed;
        public bool harmless { get { return mood == "harmless"; } }
    }
    private sealed class Monster
    {
        public GameObject root;
        public MonsterKind kind;
        public float hp, attackAt;
        public bool summoned, attackPlayer;
        public Monster opponent;
    }
    private sealed class SpawnBlock { public GameObject root; }

    // 메인: 실제 3차원 세계 생성
    private void Awake()
    {
        Application.targetFrameRate = 60;
        Screen.sleepTimeout = SleepTimeout.NeverSleep;
        ReadMonsterCatalog();
        Build3DWorld();
        Debug.Log("MAGIC_FOREST_3D_SOURCE_READY game=" + GameId + " species=" + kinds.Count + " validation=NOT_YET_RUN");
    }

    private void ReadMonsterCatalog()
    {
        foreach (string record in Catalog.Split(';'))
        {
            string[] v = record.Split('|');
            if (v.Length != 6) continue;
            float health, damage, speed;
            if (!float.TryParse(v[3], NumberStyles.Float, CultureInfo.InvariantCulture, out health) ||
                !float.TryParse(v[4], NumberStyles.Float, CultureInfo.InvariantCulture, out damage) ||
                !float.TryParse(v[5], NumberStyles.Float, CultureInfo.InvariantCulture, out speed)) continue;
            kinds.Add(new MonsterKind { id=v[0], name=v[1], mood=v[2], health=health, damage=damage, speed=speed });
        }
    }

    private GameObject Primitive(PrimitiveType shape, string name, Vector3 at, Vector3 scale, Color tint, Transform parent = null)
    {
        GameObject o = GameObject.CreatePrimitive(shape);
        o.name = name;
        if (parent != null) o.transform.SetParent(parent, false);
        o.transform.position = at;
        o.transform.localScale = scale;
        Renderer r = o.GetComponent<Renderer>();
        if (r != null) r.material.color = tint;
        return o;
    }

    private void Build3DWorld()
    {
        camera3d = Camera.main;
        if (camera3d == null)
        {
            GameObject cameraObject = new GameObject("Main Camera");
            cameraObject.tag = "MainCamera";
            camera3d = cameraObject.AddComponent<Camera>();
        }
        camera3d.orthographic = false;
        camera3d.fieldOfView = 60f;
        camera3d.nearClipPlane = 0.05f;
        camera3d.farClipPlane = 190f;
        camera3d.backgroundColor = new Color(.07f,.17f,.14f);

        if (FindFirstObjectByType<Light>() == null)
        {
            GameObject sun = new GameObject("마력숲 태양");
            Light l = sun.AddComponent<Light>();
            l.type = LightType.Directional;
            l.intensity = 1.35f;
            sun.transform.rotation = Quaternion.Euler(48f, -27f, 0f);
        }
        Primitive(PrimitiveType.Plane, "3D 마력숲 지형", Vector3.zero, new Vector3(8f,1f,8f), new Color(.13f,.29f,.19f));

        // 유니티 프리미티브의 실제 3D 메시로 나무, 바위, 지형 소품을 만든다.
        System.Random random = new System.Random(1177);
        for (int i=0;i<70;i++)
        {
            float x=(float)(random.NextDouble()*70-35),z=(float)(random.NextDouble()*70-35);
            if (Mathf.Abs(x)<5f&&Mathf.Abs(z)<7f) continue;
            float height=2.6f+(float)random.NextDouble()*2f;
            Primitive(PrimitiveType.Cylinder,"숲 나무줄기",new Vector3(x,height*.45f,z),new Vector3(.35f,height*.45f,.35f),new Color(.33f,.19f,.11f));
            Primitive(PrimitiveType.Sphere,"숲 나무수관",new Vector3(x,height,z),new Vector3(2.1f,2.5f,2.1f),
                new Color(.13f+(float)random.NextDouble()*.13f,.38f+(float)random.NextDouble()*.17f,.19f));
        }
        for (int i=0;i<36;i++)
        {
            float x=(float)(random.NextDouble()*69-34.5),z=(float)(random.NextDouble()*69-34.5);
            float r=.4f+(float)random.NextDouble()*.8f;
            Primitive(PrimitiveType.Sphere,"채집 가능한 돌",new Vector3(x,.22f,z),new Vector3(r,.45f*r,r),
                new Color(.36f,.41f,.43f));
        }
        player = Primitive(PrimitiveType.Capsule,"마력숲 플레이어",new Vector3(0,1,0),
            new Vector3(.85f,1f,.85f),new Color(.85f,.79f,.59f));
        Primitive(PrimitiveType.Sphere,"플레이어 머리",new Vector3(0,2.2f,0),new Vector3(.68f,.68f,.68f),
            new Color(.93f,.76f,.56f),player.transform);
        Update3DCamera(true);
    }

    private void Update3DCamera(bool instant = false)
    {
        if (player == null || camera3d == null) return;
        Vector3 target = player.transform.position + new Vector3(0,11.5f,-14f);
        camera3d.transform.position = instant ? target :
            Vector3.Lerp(camera3d.transform.position,target,Mathf.Clamp01(Time.deltaTime*5f));
        camera3d.transform.LookAt(player.transform.position+new Vector3(0,.7f,2.3f));
    }

    // 메인: 기존 Unity 저장 키는 일반 모드에서 유지하고 크리에이티브는 따로 보관한다.
    private string ModePrefix { get { return creative ? CreativePrefix : SavePrefix; } }

    private void StartGame(ScreenMode selected)
    {
        ClearDynamicObjects();
        mode = selected;
        inventoryOpen = craftingOpen = spawnerOpen = aggressionOpen = false;
        selectedMonster = aggressionMonster = null;
        LoadGame();
        if (!creative && enemies.Count == 0)
        {
            SpawnMonster(GetKind("goblin"),new Vector3(8,0,7),false);
            SpawnMonster(GetKind("shadowwolf"),new Vector3(-9,0,10),false);
            SpawnMonster(GetKind("mossboar"),new Vector3(11,0,-7),false);
        }
        Debug.Log("MAGIC_FOREST_MODE game="+GameId+" mode="+mode+" ready=SOURCE_ONLY");
    }

    private MonsterKind GetKind(string id)
    {
        foreach (MonsterKind kind in kinds) if (kind.id == id) return kind;
        return kinds.Count>0?kinds[0]:null;
    }

    private void ClearDynamicObjects()
    {
        foreach (Monster m in enemies) if (m.root != null) Destroy(m.root);
        enemies.Clear();
        foreach (SpawnBlock b in blocks) if (b.root != null) Destroy(b.root);
        blocks.Clear();
    }

    private Monster SpawnMonster(MonsterKind kind,Vector3 location,bool summoned)
    {
        if (kind == null) return null;
        location.y = 1f;
        int identity = Math.Abs(kind.id.GetHashCode()%5);
        PrimitiveType shape = identity==0?PrimitiveType.Capsule:
            identity==1?PrimitiveType.Cube:
            identity==2?PrimitiveType.Cylinder:PrimitiveType.Sphere;
        float size = Mathf.Clamp(Mathf.Sqrt(kind.health/95f),.48f,2.6f);
        float colorCode = (Math.Abs(kind.id.GetHashCode()%360))/360f;
        Color color = Color.HSVToRGB(colorCode,.58f,.82f);
        GameObject root = Primitive(shape,"3D 몬스터 · "+kind.name,location,new Vector3(size,Mathf.Max(.7f,size),size),color);
        Primitive(PrimitiveType.Sphere,"머리",location+new Vector3(0,size*.68f,.35f*size),
            Vector3.one*size*.5f,Color.Lerp(color,Color.white,.25f),root.transform);
        // 서로 다른 신체 실루엣: 뿔, 날개, 꼬리, 몸통의 3D 조합
        if (identity%2==0)
        {
            Primitive(PrimitiveType.Cylinder,"뿔 좌",location+new Vector3(-size*.35f,size,.1f),
                new Vector3(.14f*size,.36f*size,.14f*size),Color.Lerp(color,Color.white,.4f),root.transform);
            Primitive(PrimitiveType.Cylinder,"뿔 우",location+new Vector3(size*.35f,size,.1f),
                new Vector3(.14f*size,.36f*size,.14f*size),Color.Lerp(color,Color.white,.4f),root.transform);
        }
        else
        {
            Primitive(PrimitiveType.Cube,"날개 좌",location+new Vector3(-size*.72f,.2f,0),
                new Vector3(.55f*size,.18f*size,1.1f*size),Color.Lerp(color,Color.black,.2f),root.transform);
        }
        Monster m=new Monster {root=root,kind=kind,hp=kind.health,summoned=summoned,
            attackPlayer=!summoned&&kind.mood=="aggressive"};
        enemies.Add(m);
        return m;
    }

    private void PlaceSpawnBlock()
    {
        if (!creative || blocks.Count>=100) return;
        Vector3 ahead=player.transform.position+player.transform.forward*3.2f;
        ahead.x=Mathf.Clamp(ahead.x,-34,34);
        ahead.z=Mathf.Clamp(ahead.z,-34,34);
        SpawnBlock b=new SpawnBlock();
        b.root=Primitive(PrimitiveType.Cube,"몬스터 스폰 블록",new Vector3(ahead.x,.6f,ahead.z),
            new Vector3(1.25f,1.2f,1.25f),new Color(.48f,.24f,.75f));
        Primitive(PrimitiveType.Sphere,"마력 핵",b.root.transform.position+new Vector3(0,.8f,0),
            new Vector3(.65f,.65f,.65f),new Color(.85f,.55f,1f),b.root.transform);
        blocks.Add(b);
        inventoryOpen=false;
        SaveGame();
    }

    private void SummonAtBlock()
    {
        if (!creative || editingSpawner==null||selectedKind<0||selectedKind>=kinds.Count) return;
        int current=0;
        foreach(Monster m in enemies) if(m.summoned)current++;
        int count=Mathf.Clamp(spawnCount,1,30);
        if(current+count>MaxSummoned)return;
        for(int i=0;i<count;i++)
        {
            float angle=i*2.39996f,distance=3f+Mathf.Sqrt(i)*1.6f;
            Vector3 pos=editingSpawner.root.transform.position+
                new Vector3(Mathf.Cos(angle)*distance,0,Mathf.Sin(angle)*distance);
            pos.x=Mathf.Clamp(pos.x,-34,34);pos.z=Mathf.Clamp(pos.z,-34,34);
            SpawnMonster(kinds[selectedKind],pos,true);
        }
        spawnerOpen=false;
        SaveGame();
    }

    // 메인: 원본처럼 무해한 몬스터는 전투와 플레이어 공격을 모두 거부한다.
    private void SelectDuelMonster(Monster m)
    {
        if (!creative || !m.summoned || m.kind.harmless)return;
        if (selectedMonster==null || selectedMonster==m || selectedMonster.hp<=0)
        {
            selectedMonster=m;return;
        }
        Monster first=selectedMonster;
        selectedMonster=null;
        if (first.kind.harmless)return;
        first.opponent=m;m.opponent=first;
        first.attackPlayer=false;m.attackPlayer=false;
        SaveGame();
    }

    private void SetPlayerAggression(bool value)
    {
        if (aggressionMonster!=null&&aggressionMonster.summoned&&!aggressionMonster.kind.harmless)
        {
            aggressionMonster.attackPlayer=value;
            aggressionMonster.opponent=null;
            selectedMonster=null;
            SaveGame();
        }
        aggressionOpen=false;
        aggressionMonster=null;
    }

    private void ApplyDamage(Monster m,float damage)
    {
        if(m==null||m.hp<=0)return;
        m.hp-=damage;
        if(m.hp>0)return;
        if(m.root!=null)Destroy(m.root);
        if(selectedMonster==m)selectedMonster=null;
        if(aggressionMonster==m){aggressionMonster=null;aggressionOpen=false;}
        foreach(Monster other in enemies)if(other.opponent==m)other.opponent=null;
        enemies.Remove(m);
        if(!creative){progress+=1;resource+=1;actions++;if(progress>=level*4)level++;}
        SaveGame();
    }

    private void Attack()
    {
        if(!playing || Time.time<nextAttackAt)return;
        nextAttackAt=Time.time+.48f;
        Monster closest=null;float best=3.7f;
        foreach(Monster m in enemies)
        {
            if(m.hp<=0)continue;
            float d=Vector3.Distance(player.transform.position,m.root.transform.position);
            if(d<best){best=d;closest=m;}
        }
        if(closest!=null)ApplyDamage(closest,18f+Mathf.Max(0,level-1)*2f);
    }

    private void UpdateMonsters()
    {
        for(int i=enemies.Count-1;i>=0;i--)
        {
            Monster m=enemies[i];
            if(m.root==null||m.hp<=0)continue;
            if(m.kind.harmless)continue;
            Monster opponent=m.opponent;
            if(opponent!=null && (opponent.hp<=0||opponent.root==null||opponent.kind.harmless))m.opponent=null;
            opponent=m.opponent;
            Vector3 target;
            bool attackPlayer=opponent==null&&m.attackPlayer;
            if(opponent!=null)target=opponent.root.transform.position;
            else if(attackPlayer)target=player.transform.position;
            else continue;
            Vector3 delta=target-m.root.transform.position;
            delta.y=0;
            float distance=delta.magnitude,limit=opponent!=null?1.9f:1.35f;
            if(attackPlayer&&distance>12f)continue;
            if(distance>limit)
            {
                Vector3 next=m.root.transform.position+delta.normalized*
                    Mathf.Clamp(m.kind.speed/22f,.9f,6.4f)*Time.deltaTime;
                next.x=Mathf.Clamp(next.x,-35,35);
                next.z=Mathf.Clamp(next.z,-35,35);
                m.root.transform.position=next;
                m.root.transform.rotation=Quaternion.Slerp(m.root.transform.rotation,
                    Quaternion.LookRotation(delta.normalized),Time.deltaTime*6f);
            }
            else if(Time.time>=m.attackAt)
            {
                m.attackAt=Time.time+1.1f;
                if(opponent!=null)ApplyDamage(opponent,m.kind.damage);
                else if(attackPlayer){hp=Mathf.Max(0,hp-m.kind.damage);if(hp<=0)Respawn();}
            }
        }
    }

    private void Respawn()
    {
        hp=maxHp;
        player.transform.position=new Vector3(0,1f,0);
        foreach(Monster m in enemies)if(m.summoned){m.attackPlayer=false;m.opponent=null;}
        SaveGame();
    }

    // 메인: 모바일 화면 누르기와 길게 누르기 · PC 마우스 공통 입력
    private GameObject HitWorld(Vector2 screenPosition)
    {
        // GUI 버튼 영역을 월드 선택에서 제외한다.
        if(screenPosition.y<Screen.height*.20f || screenPosition.y>Screen.height*.76f)return null;
        Ray ray=camera3d.ScreenPointToRay(screenPosition);
        RaycastHit hit;
        if(Physics.Raycast(ray,out hit,150f))return hit.collider.gameObject;
        return null;
    }

    private void PointerDown(Vector2 screen)
    {
        heldObject=HitWorld(screen);
        pressStartedAt=Time.time;
        holdFired=false;
    }

    private void PointerHeld()
    {
        if(holdFired||heldObject==null||!creative||Time.time-pressStartedAt<HoldSeconds)return;
        Monster m=MonsterAtObject(heldObject);
        if(m!=null&&m.summoned&&!m.kind.harmless)
        {
            aggressionMonster=m;aggressionOpen=true;
            holdFired=true;
        }
    }

    private Monster MonsterAtObject(GameObject o)
    {
        foreach(Monster m in enemies)
            if(m.root==o||(o.transform.IsChildOf(m.root.transform)))return m;
        return null;
    }

    private void PointerUp(Vector2 screen)
    {
        if(holdFired){heldObject=null;return;}
        GameObject clicked=HitWorld(screen);
        if(clicked==null||clicked!=heldObject){heldObject=null;return;}
        if(clicked==lastTapped&&Time.time-previousTapAt<=DoubleTapSeconds)
        {
            Monster m=MonsterAtObject(clicked);
            if(creative&&m!=null&&m.summoned)SelectDuelMonster(m);
            if(creative)
                foreach(SpawnBlock b in blocks)if(clicked==b.root||clicked.transform.IsChildOf(b.root.transform))
                    {editingSpawner=b;spawnerOpen=true;spawnCount=1;break;}
            lastTapped=null;
        }
        else {lastTapped=clicked;previousTapAt=Time.time;}
        heldObject=null;
    }

    private void HandlePointer()
    {
        if(inventoryOpen||craftingOpen||spawnerOpen||aggressionOpen)return;
        if(Input.touchCount>0)
        {
            Touch t=Input.GetTouch(0);
            if(t.phase==TouchPhase.Began)PointerDown(t.position);
            if(t.phase==TouchPhase.Stationary||t.phase==TouchPhase.Moved)PointerHeld();
            if(t.phase==TouchPhase.Ended)PointerUp(t.position);
            if(t.phase==TouchPhase.Canceled)heldObject=null;
        }
        else
        {
            if(Input.GetMouseButtonDown(0))PointerDown(Input.mousePosition);
            if(Input.GetMouseButton(0))PointerHeld();
            if(Input.GetMouseButtonUp(0))PointerUp(Input.mousePosition);
        }
    }

    private void Update()
    {
        if(!playing)return;
        Vector3 move=new Vector3(
            (Input.GetKey(KeyCode.D)||Input.GetKey(KeyCode.RightArrow)?1f:0f)-
            (Input.GetKey(KeyCode.A)||Input.GetKey(KeyCode.LeftArrow)?1f:0f)+touchMotion.x,
            0,
            (Input.GetKey(KeyCode.W)||Input.GetKey(KeyCode.UpArrow)?1f:0f)-
            (Input.GetKey(KeyCode.S)||Input.GetKey(KeyCode.DownArrow)?1f:0f)+touchMotion.z);
        if(move.sqrMagnitude>1f)move.Normalize();
        if(move.sqrMagnitude>.01f)
        {
            Vector3 next=player.transform.position+move*5.8f*Time.deltaTime;
            next.x=Mathf.Clamp(next.x,-35,35);next.z=Mathf.Clamp(next.z,-35,35);
            player.transform.position=next;
            player.transform.rotation=Quaternion.Slerp(player.transform.rotation,Quaternion.LookRotation(move),Time.deltaTime*12f);
        }
        if(Input.GetKeyDown(KeyCode.Space)||Input.GetKeyDown(KeyCode.J))Attack();
        if(Input.GetKeyDown(KeyCode.I))inventoryOpen=!inventoryOpen;
        if(Input.GetKeyDown(KeyCode.C))craftingOpen=!craftingOpen;
        HandlePointer();
        UpdateMonsters();
        autosaveAt+=Time.deltaTime;
        if(autosaveAt>15f){autosaveAt=0;SaveGame();}
    }

    private void LateUpdate(){Update3DCamera();}

    // 메인: 3D 캐릭터 조작과 창 표시, 안전 영역 기반 모바일 UI
    private void OnGUI()
    {
        float w=Screen.width,h=Screen.height;
        Rect safe=Screen.safeArea;
        if(safe.width<10||safe.height<10)safe=new Rect(0,0,w,h);
        float sx=safe.x,sy=h-safe.yMax,sw=safe.width,sh=safe.height;
        float buttonHeight=Mathf.Clamp(sh*.09f,44f,72f);

        if(mode==ScreenMode.Title||mode==ScreenMode.Choose)
        {
            float panelW=Mathf.Min(sw*.92f,470f),panelH=Mathf.Min(sh*.76f,370f);
            Rect panel=new Rect(sx+(sw-panelW)/2,sy+(sh-panelH)/2,panelW,panelH);
            GUI.Box(panel,"");
            GUI.Label(new Rect(panel.x+20,panel.y+18,panelW-40,55),GameName+" · 3D");
            if(mode==ScreenMode.Title)
            {
                if(GUI.Button(new Rect(panel.x+25,panel.y+90,panelW-50,buttonHeight),"플레이"))mode=ScreenMode.Choose;
                if(GUI.Button(new Rect(panel.x+25,panel.y+100+buttonHeight,panelW-50,buttonHeight),"옵션 · 조작: 방향키 / 화면 버튼"))GUI.FocusControl(null);
            }
            else
            {
                if(GUI.Button(new Rect(panel.x+25,panel.y+78,panelW-50,buttonHeight),"일반 모드"))StartGame(ScreenMode.Normal);
                if(GUI.Button(new Rect(panel.x+25,panel.y+88+buttonHeight,panelW-50,buttonHeight),"크리에이티브 모드"))StartGame(ScreenMode.Creative);
                if(GUI.Button(new Rect(panel.x+25,panel.y+98+buttonHeight*2,panelW-50,buttonHeight),"뒤로"))mode=ScreenMode.Title;
            }
            return;
        }

        GUI.Box(new Rect(sx+5,sy+5,sw-10,buttonHeight*1.4f),"");
        GUI.Label(new Rect(sx+15,sy+8,sw*.68f,24f),GameName+" · "+(creative?"크리에이티브":"일반")+" · 3D");
        GUI.Label(new Rect(sx+15,sy+31,sw*.72f,24f),"체력 "+Mathf.CeilToInt(hp)+"/"+maxHp+"  나무 "+wood+"  돌 "+stone+"  재료 "+resource);
        if(GUI.Button(new Rect(sx+sw-85,sy+10,75,buttonHeight*.8f),"메뉴")){SaveGame();mode=ScreenMode.Title;inventoryOpen=craftingOpen=false;return;}

        if(spawnerOpen)
        {
            Rect box=new Rect(sx+sw*.09f,sy+sh*.13f,sw*.82f,Mathf.Min(sh*.79f,440f));
            GUI.Box(box,"몬스터 스폰 블록 · 종류 / 마릿수");
            float row=Mathf.Min(buttonHeight,box.height*.13f);
            if(kinds.Count>0)
            {
                GUI.Label(new Rect(box.x+10,box.y+box.height*.12f,box.width-20,row),kinds[selectedKind].name+
                    (kinds[selectedKind].harmless?" (무해 · 전투 금지)":""));
                if(GUI.Button(new Rect(box.x+10,box.y+box.height*.26f,55,row),"<"))selectedKind=(selectedKind+kinds.Count-1)%kinds.Count;
                if(GUI.Button(new Rect(box.x+box.width-65,box.y+box.height*.26f,55,row),">"))selectedKind=(selectedKind+1)%kinds.Count;
                GUI.Label(new Rect(box.x+box.width*.29f,box.y+box.height*.26f,box.width*.45f,row),"종류 "+(selectedKind+1)+"/"+kinds.Count);
                if(GUI.Button(new Rect(box.x+10,box.y+box.height*.43f,55,row),"-"))spawnCount=Mathf.Max(1,spawnCount-1);
                GUI.Label(new Rect(box.x+box.width*.37f,box.y+box.height*.43f,box.width*.30f,row),spawnCount+"마리");
                if(GUI.Button(new Rect(box.x+box.width-65,box.y+box.height*.43f,55,row),"+"))spawnCount=Mathf.Min(30,spawnCount+1);
                if(GUI.Button(new Rect(box.x+10,box.y+box.height*.61f,box.width-20,row),"소환"))SummonAtBlock();
            }
            if(GUI.Button(new Rect(box.x+10,box.y+box.height*.82f,box.width-20,row),"닫기"))spawnerOpen=false;
            return;
        }

        if(aggressionOpen)
        {
            Rect box=new Rect(sx+sw*.09f,sy+sh*.15f,sw*.82f,Mathf.Min(sh*.74f,320f));
            GUI.Box(box,"소환 몬스터 · 플레이어 공격 설정");
            float row=Mathf.Min(buttonHeight,box.height*.16f);
            GUI.Label(new Rect(box.x+12,box.y+box.height*.18f,box.width-24,row),aggressionMonster!=null?aggressionMonster.kind.name:"");
            if(GUI.Button(new Rect(box.x+12,box.y+box.height*.36f,box.width-24,row),"공격 안 함 (기본)"))SetPlayerAggression(false);
            if(GUI.Button(new Rect(box.x+12,box.y+box.height*.55f,box.width-24,row),"나를 공격"))SetPlayerAggression(true);
            if(GUI.Button(new Rect(box.x+12,box.y+box.height*.78f,box.width-24,row),"닫기")){aggressionOpen=false;aggressionMonster=null;}
            return;
        }

        if(inventoryOpen||craftingOpen)
        {
            Rect box=new Rect(sx+sw*.06f,sy+sh*.12f,sw*.88f,Mathf.Min(sh*.82f,450f));
            GUI.Box(box,inventoryOpen?"가방":"제작");
            if(inventoryOpen)
            {
                if(creative)
                {
                    if(GUI.Button(new Rect(box.x+12,box.y+62,box.width-24,buttonHeight*1.1f),"몬스터 스폰 블록 ×∞ · 설치"))PlaceSpawnBlock();
                }
                else GUI.Label(new Rect(box.x+10,box.y+65,box.width-20,70),"나무 "+wood+" · 돌 "+stone+" · 재료 "+resource);
            }
            else
            {
                string[] recipes={"나무 도구", "돌 도구", "철제 무기", "모닥불"};
                Rect view=new Rect(box.x+12,box.y+45,box.width-24,box.height-112);
                craftingScroll=GUI.BeginScrollView(view,craftingScroll,
                    new Rect(0,0,box.width-48,recipes.Length*(buttonHeight+5)));
                for(int i=0;i<recipes.Length;i++)
                {
                    int cost=(i+1)*3;
                    if(GUI.Button(new Rect(0,i*(buttonHeight+5),box.width-48,buttonHeight),
                        recipes[i]+(creative?" · 무료":" · 재료 "+cost)) && (creative||resource>=cost))
                    {
                        if(!creative)resource-=cost;
                        actions++;SaveGame();
                    }
                }
                GUI.EndScrollView();
            }
            if(GUI.Button(new Rect(box.x+12,box.y+box.height-58,box.width-24,buttonHeight),"닫기"))
                {inventoryOpen=false;craftingOpen=false;}
            return;
        }

        float dpad=Mathf.Clamp(sw*.115f,40f,54f);
        float actionWidth=Mathf.Clamp(sw*.19f,64f,92f);
        float bottom=sy+sh-dpad*2.57f;
        float left=sx+8f,right=sx+sw-actionWidth-8f;
        touchMotion=Vector3.zero;
        if(GUI.RepeatButton(new Rect(left+dpad,bottom,dpad,dpad),"▲"))touchMotion.z=1f;
        if(GUI.RepeatButton(new Rect(left,bottom+dpad*.76f,dpad,dpad),"◀"))touchMotion.x=-1f;
        if(GUI.RepeatButton(new Rect(left+dpad*2,bottom+dpad*.76f,dpad,dpad),"▶"))touchMotion.x=1f;
        if(GUI.RepeatButton(new Rect(left+dpad,bottom+dpad*1.52f,dpad,dpad),"▼"))touchMotion.z=-1f;
        if(GUI.Button(new Rect(right,bottom,actionWidth,dpad),"공격"))Attack();
        if(GUI.Button(new Rect(right,bottom+dpad*1.05f,actionWidth,dpad),"가방"))inventoryOpen=true;
        if(GUI.Button(new Rect(right-actionWidth-5f,bottom+dpad*1.05f,actionWidth,dpad),"제작"))craftingOpen=true;
        if(!creative)
        {
            if(GUI.Button(new Rect(right-actionWidth-5f,bottom,actionWidth,dpad),"채집")){wood++;stone++;resource++;SaveGame();}
        }
        else
        {
            if(selectedMonster!=null)
                GUI.Label(new Rect(sx+sw*.23f,sy+sh*.52f,sw*.55f,44),selectedMonster.kind.name+" 선택 · 상대를 두 번 누르기");
        }
    }

    // 저장 · 기존 Unity 일반 진행 키 유지, 크리에이티브 격리
    private void SaveGame()
    {
        if(!playing)return;
        string prefix=ModePrefix;
        PlayerPrefs.SetInt(prefix+"progress",progress);
        PlayerPrefs.SetInt(prefix+"level",level);
        PlayerPrefs.SetInt(prefix+"resource",resource);
        PlayerPrefs.SetInt(prefix+"actions",actions);
        SavedWorld s=new SavedWorld();
        s.x=player.transform.position.x;s.z=player.transform.position.z;s.hp=hp;
        s.progress=progress;s.level=level;s.resource=resource;s.actions=actions;s.wood=wood;s.stone=stone;
        s.blocks=new SavedBlock[creative?blocks.Count:0];
        if(creative)for(int i=0;i<blocks.Count;i++)s.blocks[i]=new SavedBlock {x=blocks[i].root.transform.position.x,z=blocks[i].root.transform.position.z};
        List<Monster> summoned=new List<Monster>();
        if(creative)foreach(Monster m in enemies)if(m.summoned&&m.root!=null&&m.hp>0)summoned.Add(m);
        s.monsters=new SavedMonster[summoned.Count];
        for(int i=0;i<summoned.Count;i++)
        {
            Monster m=summoned[i];Vector3 p=m.root.transform.position;
            s.monsters[i]=new SavedMonster{id=m.kind.id,x=p.x,z=p.z,hp=m.hp,
                attackPlayer=m.attackPlayer,enemyIndex=summoned.IndexOf(m.opponent)};
        }
        PlayerPrefs.SetString(prefix+"world_v1",JsonUtility.ToJson(s));
        PlayerPrefs.Save();
    }

    private void LoadGame()
    {
        string prefix=ModePrefix;
        progress=PlayerPrefs.GetInt(prefix+"progress",0);
        level=Mathf.Max(1,PlayerPrefs.GetInt(prefix+"level",1));
        resource=PlayerPrefs.GetInt(prefix+"resource",10);
        actions=PlayerPrefs.GetInt(prefix+"actions",0);
        wood=stone=0;hp=maxHp;
        player.transform.position=new Vector3(0,1f,0);
        string json=PlayerPrefs.GetString(prefix+"world_v1","");
        if(String.IsNullOrEmpty(json))return;
        SavedWorld s;
        try{s=JsonUtility.FromJson<SavedWorld>(json);}catch(Exception){return;}
        if(s==null)return;
        player.transform.position=new Vector3(Mathf.Clamp(s.x,-35,35),1f,Mathf.Clamp(s.z,-35,35));
        hp=Mathf.Clamp(s.hp,1,maxHp);wood=Mathf.Max(0,s.wood);stone=Mathf.Max(0,s.stone);
        if(!creative)return;
        if(s.blocks!=null)foreach(SavedBlock b in s.blocks)
        {
            if(blocks.Count>=100)break;
            SpawnBlock block=new SpawnBlock();
            block.root=Primitive(PrimitiveType.Cube,"몬스터 스폰 블록",new Vector3(
                Mathf.Clamp(b.x,-34,34),.6f,Mathf.Clamp(b.z,-34,34)),
                new Vector3(1.25f,1.2f,1.25f),new Color(.48f,.24f,.75f));
            blocks.Add(block);
        }
        if(s.monsters==null)return;
        List<Monster> restored=new List<Monster>();
        foreach(SavedMonster m in s.monsters)
        {
            if(restored.Count>=MaxSummoned)break;
            Monster kind=SpawnMonster(GetKind(m.id),new Vector3(Mathf.Clamp(m.x,-34,34),1,
                Mathf.Clamp(m.z,-34,34)),true);
            if(kind!=null){kind.hp=Mathf.Clamp(m.hp,1,kind.kind.health);kind.attackPlayer=!kind.kind.harmless&&m.attackPlayer;}
            restored.Add(kind);
        }
        for(int i=0;i<restored.Count&&i<s.monsters.Length;i++)
        {
            int enemyIndex=s.monsters[i].enemyIndex;
            if(enemyIndex>=0&&enemyIndex<restored.Count&&enemyIndex!=i&&!restored[i].kind.harmless&&!restored[enemyIndex].kind.harmless)
                restored[i].opponent=restored[enemyIndex];
        }
    }

    private void OnApplicationPause(bool paused){if(paused)SaveGame();}
    private void OnApplicationQuit(){SaveGame();}
}
