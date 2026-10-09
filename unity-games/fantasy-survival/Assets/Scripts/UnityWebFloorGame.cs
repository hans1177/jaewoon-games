// UnityWebFloorGame.cs
// 임포트 · 3D 마력숲 게임 소스
using System;
using System.Collections.Generic;
using System.Globalization;
using UnityEngine;

public sealed class UnityWebFloorGame : MonoBehaviour
{
    private const string GameId = "fantasy-survival";
    private const string SavePrefix = "fantasy_survival_webfloor_";
    private const string CreativeSaveKey = SavePrefix + "creative_v1";
    private const string LegacyCreativeSaveKey = SavePrefix + "creative_world_v1";
    private const string LegacyNormalSaveKey = SavePrefix + "world_v1";
    private const float HoldSeconds = 0.7f;
    private const float DoubleTapSeconds = 0.42f;

    // 게임 데이터 · 기존 마력숲 몬스터 / 레시피 원본에서 식별자와 수치를 가져온다.
    private const string SpeciesText = @"mossboar|이끼멧돼지|neutral|72|9|62
golem|돌정령|neutral|150|18|42
goblin|숲 고블린|aggressive|42|7|72
shadowwolf|그림자늑대|aggressive|95|14|90
fairy|빛의 요정|harmless|26|0|55
foreststag|이끼뿔사슴|neutral|105|12|68
thornhound|가시숲 사냥개|aggressive|128|18|86
ironspirit|철 정령|aggressive|66.5|9.8|135
worldtreebear|세계수 곰|aggressive|380|28|70
sporegiant|독포자 거대버섯|aggressive|340|24|54
rootsovereign|근원포식자 녹스바르|boss|4500|150|186
firewolf|화염 늑대|aggressive|150|10|96
giantburrower|초거대 잠복벌레|aggressive|300|20|68
sandwalker|오아시스 샌드 워커|neutral|500|44|58
firegolemneutral|중립 화염 골렘|neutral|555|30|38
firegolemaggressive|공격적 화염 골렘|aggressive|555|30|42
firesnake|화염 뱀|aggressive|300|25|105
ironibex|철갑 산양|neutral|180|18|64
sapdeer|수액사슴|harmless|120|0|72
crystalboar|수정 멧돼지|aggressive|350|40|82
crystalboarjunior|수정 멧돼지 주니어|aggressive|140|16|82
crystalguardian|수정 수호자|aggressive|500|50|76
crystalgoblin|수정 고블린|aggressive|120|22|82
crystalironspirit|수정 철 정령|aggressive|210|31|138
crystalbear|수정 곰|aggressive|650|46|76
crystalfiresnake|수정 화염 뱀|aggressive|430|38|112
crystalibex|수정 산양|aggressive|360|36|80
shadowwolfleader|그림자 늑대 우두머리|aggressive|250|30|96
crystalfiregolem|수정 화염골렘|aggressive|560|30|54
vampirebat|거대 흡혈 박쥐|aggressive|190|35|118
foresthare|숲토끼|harmless|55|0|86
worldpheasant|세계수 꿩|harmless|70|0|80
ironhidehound|철가죽 들개|aggressive|150|17|88
crystalgoat|수정염소|neutral|135|16|70
lakecroc|거대 호수 악어|aggressive|777|58|88
lakebuffalo|호수 물소|neutral|560|42|58
crystaldeer|수정 사슴|neutral|360|28|82
lakeheron|호수 왜가리|harmless|95|0|78
shark|거대 호수 상어|neutral|800|50|104
giantSquid|대왕오징어|aggressive|1111|66|86
deepAngler|심해 아귀|aggressive|900|60|72
lakefish|호수 물고기|harmless|50|0|72
giantleech|초거대 거머리|aggressive|400|44|74
gorilla|밀림 고릴라|neutral|1000|50|70
anaconda|아나콘다|aggressive|800|65|86
mudwalker|머드 워커|aggressive|750|40|66
yetileader|예티 우두머리|aggressive|2599|72|68
yeticub|예티 새끼|aggressive|400|30|82
polarbear|북극곰|aggressive|1000|50|72
polarwolf|북극늑대|neutral|650|35|92
polarfox|북극여우|harmless|100|0|95
froststalker|서리 추적자|aggressive|220|24|95
icegolem|빙결 골렘|aggressive|420|36|50
jungletiger|밀림 호랑이|aggressive|850|55|110
jungletigerleader|밀림 호랑이 우두머리|aggressive|4500|70|90
primitiveSpearman|창병 원시인|aggressive|600|30|68
primitiveArcher|원거리 원시인|aggressive|400|50|64
jungleGuardian|밀림 수호자|aggressive|1300|70|76
flowergoblin|꽃 고블린|neutral|222|30|72
giantbee|거대 꿀벌|neutral|350|40|110
thornmantis|가시 사마귀|aggressive|600|40|88
giantspider|거대 거미|aggressive|555|50|76
giantspiderling|새끼 거대거미|aggressive|100|15|92
toxicmycelium|맹독 균사체 버섯|aggressive|1800|60|54
toxicsporeorb|맹독 포자 구슬|aggressive|100|0|0
swampgolem|늪 골렘|neutral|1888|70|52
fearbear|공포 곰|aggressive|1800|60|82
swampPrimitiveSpearman|늪 원시인 창병|aggressive|886|70|68
swampPrimitiveArcher|늪 원시인 궁수|aggressive|700|80|64
swampPrimitiveGuard|늪 원시인 보초|aggressive|886|50|0
swampArrowTower|원시 화살탑|aggressive|1200|60|0
sandSpirit|모래 정령|aggressive|400|55|78
giantVenomScorpion|거대 맹독 전갈|aggressive|2222|90|82
wastelandMummy|황무지 미라|aggressive|1800|88|64";
    private const string RecipesText = @"bench|제작대|hand|structure|wood:3,stone:2,fiber:2|0
storage-chest|상자|hand|structure|wood:10|0
wood-wall|나무벽|hand|structure|wood:3|0
wood-door|나무문|hand|structure|wood:6,fiber:2|0
defense-tower|수비탑|hand|structure|ironIngot:4,flowerLeather:3,wood:5|0
bed|침대|hand|structure|wood:6,fiber:8|0
garden-plot|텃밭|hand|structure|wood:5|0
wood-spear|나무창|hand|weapon|wood:6,fiber:3|0
wood-bow|나무 활|hand|weapon|wood:5,fiber:4|0
wood-arrow|나무화살|hand|ammo|wood:2,fiber:1|0
spider-arrow|거미 화살|ironbench|ammo|wood:2,fiber:1,giantSpiderWeb:1|0
reinforced-bow|강화 활|bench|weapon|wood:6,stone:4,fiber:5|0
firewolf-arrow|화염늑대 화살|ironbench|ammo|wood:2,fiber:1,fireWolfFang:1|0
iron-bow|철 활|ironbench|weapon|wood:4,fiber:5,ironIngot:4|0
iron-arrow|철화살|ironbench|ammo|wood:1,fiber:1,ironIngot:1|0
shark-arrow|상어 화살|goldbench|ammo|wood:2,fiber:1,sharkSkin:1|0
gold-bow|황금 활|goldbench|weapon|wood:4,fiber:5,goldIngot:5|0
yeti-arrow|예티 화살|junglebench|ammo|wood:2,fiber:1,yetiHide:1|0
jungle-bow|밀림 활|junglebench|weapon|wood:4,fiber:6,monopolyIngot:3,giantSpiderSilk:2|0
bandage|섬유붕대|hand|consumable|fiber:6|0
flag|깃발|hand|structure|wood:5,fiber:4|0
torch|마력 횃불|hand|torch|wood:4,stone:1,fiber:2|0
stone-sword|돌검|bench|weapon|wood:2,stone:3,fiber:1|0
stone-axe|돌도끼|bench|tool|wood:2,stone:3,fiber:1|0
stone-pick|돌곡괭이|bench|tool|wood:2,stone:3,fiber:1|0
fiber-knife|섬유칼|bench|tool|wood:4,stone:5,fiber:8|0
rune-shield|룬 방패|bench|armor|wood:8,stone:12,fiber:6|0
forest-armor|숲 갑옷|bench|armor|wood:5,stone:7,fiber:14|0
map|지도|bench|map|wood:2,fiber:5|0
furnace|화로|hand|structure|wood:3,stone:6|0
blacksmith-anvil|대장장이 모루|hand|structure|ironIngot:6,crystalShard:3|0
flower-leather|꽃가죽|ironbench|material|giantPetal:3|0
iron-sword|철 검|ironbench|weapon|wood:1,stone:2,fiber:3,ironIngot:3|0
iron-axe|철 도끼|ironbench|weapon|wood:1,stone:2,fiber:3,ironIngot:3|0
iron-pick|철 곡괭이|ironbench|tool|wood:1,fiber:2,ironIngot:3|0
forest-wooden-sword|숲의 목검|reward|weapon||0
good-bandage|좋은 붕대|ironbench|consumable|wood:1,fiber:3|0
gold-greatsword|황금 검|goldbench|weapon|wood:2,fiber:2,goldIngot:6|0
gold-dagger|금단검|goldbench|weapon|wood:1,fiber:2,goldIngot:3|0
gold-axe|금 도끼|goldbench|tool|wood:2,fiber:2,goldIngot:4|0
gold-pick|금 곡괭이|goldbench|tool|wood:2,fiber:2,goldIngot:4,leechSucker:1|0
wolf-armor|늑대 방어구|ironbench|armor|wolfHide:3,wood:2|0
walker-greatsword|워커 대검|goldbench|weapon|walkerClaw:4,goldIngot:7,wood:3,fiber:3|0
sand-armor|모래의 방어구|goldbench|armor|walkerClaw:2,goldIngot:9,flowerLeather:2|0
bear-spear|곰 창|ironbench|weapon|bearClaw:2,wood:4,fiber:2|0
bear-armor|곰 방어구|ironbench|armor|bearHide:2,wood:4,walkerClaw:1|0
spore-seeker|포자 추적구|ironbench|weapon|sporeSac:3,ironIngot:2,fiber:4|0
boar-spear|이끼엄니 창|bench|weapon|mossTusk:2,wood:4,fiber:2|0
boar-armor|이끼가죽 방어구|bench|armor|mossTusk:3,wood:3,fiber:4|0
golem-hammer|돌정령 망치|ironbench|weapon|stoneCore:3,wood:3,ironIngot:2|0
golem-armor|돌정령 갑옷|ironbench|armor|stoneCore:4,stone:6,ironIngot:2|0
goblin-dagger|고블린 단검|bench|weapon|goblinCharm:2,wood:2,fiber:2|0
goblin-armor|고블린 가죽옷|bench|armor|goblinCharm:3,fiber:6,wood:2|0
wolf-blade|늑대 송곳검|bench|weapon|wolfHide:2,wood:3,stone:2|0
ironspirit-sword|철정령 검|bench|weapon|ironSpiritCore:3,wood:2,stone:3|0
ironspirit-armor|철정령 갑옷|bench|armor|ironSpiritCore:4,stone:5,fiber:3|0
sovereign-cleaver|근원 대검|goldbench|weapon|sovereignCore:2,goldIngot:10,wood:4,fiber:5|0
sovereign-armor|근원포식자 갑옷|goldbench|armor|sovereignCore:3,goldIngot:12,walkerClaw:2,flowerLeather:2|0
firewolf-saber|화염늑대 검|ironbench|weapon|fireWolfFang:3,ironIngot:3,wood:2|0
firewolf-armor|화염늑대 갑옷|ironbench|armor|fireWolfFang:4,ironIngot:3,fiber:4|0
burrower-lance|잠복벌레 창|ironbench|weapon|burrowerShell:3,wood:4,ironIngot:2|0
burrower-armor|잠복벌레 갑각|ironbench|armor|burrowerShell:4,ironIngot:3,fiber:3,essence:5|0
calm-golem-maul|고요한 용암망치|goldbench|weapon|calmMagmaCore:3,goldIngot:7,wood:3|0
calm-golem-armor|고요한 현무암 갑옷|goldbench|armor|calmMagmaCore:4,goldIngot:8,stone:6,essence:6,flowerLeather:2|0
rage-golem-axe|격노의 용암도끼|goldbench|weapon|rageMagmaCore:3,goldIngot:8,wood:3|0
rage-golem-armor|격노의 화산갑옷|goldbench|armor|rageMagmaCore:4,goldIngot:9,fiber:4,essence:6,flowerLeather:2|0
firesnake-blade|화염뱀 칼|ironbench|weapon|fireSnakeScale:3,ironIngot:3,wood:2|0
firesnake-armor|화염뱀 비늘갑옷|ironbench|armor|fireSnakeScale:4,ironIngot:3,fiber:4,essence:5|0
ironibex-spear|철뿔 창|ironbench|weapon|ironHorn:3,wood:4,ironIngot:2|0
ironibex-armor|철뿔 갑옷|ironbench|armor|ironHorn:4,ironIngot:3,fiber:3|0
crystal-boar-armor|멧돼지 갑각 갑옷|goldbench|armor|mossTusk:4,hardShell:3,crystalCore:2,flowerLeather:2|0
crystal-core-greatsword|수정 코어 대검|goldbench|weapon|hardShell:4,crystalCore:3,essence:5,goldIngot:4,wood:3|0
mantis-scythe|가시 사마귀 낫|ironbench|weapon|mantisBlade:3,ironIngot:3,wood:2|0
cooking-station|요리대|hand|structure|wood:4,stone:4,ironIngot:4|0
shadow-wolf-incubator|그림자 늑대 부화기|hand|structure|wood:3,stone:5,ironIngot:4|0
shadow-wolf-egg|그림자 늑대 알|egg|ingredient||0
giant-croc-egg|거대 악어 알|egg|ingredient||0
raw-deer-meat|수액사슴고기|loot|ingredient||0
raw-bug-meat|초거대 벌레고기|loot|ingredient||0
carrot|당근|gather|consumable||0
carrot-seed|당근 씨앗|gather|seed||0
greens-seed|야채 씨앗|gather|seed||0
cooked-deer-meat|구운 사슴고기|smelt|consumable||0
cooked-bug-meat|구운 벌레고기|smelt|consumable||0
firewolf-cooked-meat|화염늑대 구운고기|loot|consumable||0
forest-hare-meat|숲토끼고기|loot|ingredient||0
world-bird-meat|세계수 꿩고기|loot|ingredient||0
canyon-lizard-meat|협곡도마뱀고기|loot|ingredient||0
crystal-goat-meat|수정염소고기|loot|ingredient||0
worldtree-greens|세계수 잎채소|loot|ingredient||0
meal-hare-roast|숲토끼 통구이|meal|consumable||0
meal-worldbird-roast|세계수 꿩구이|meal|consumable||0
meal-canyon-roast|협곡 도마뱀구이|meal|consumable||0
meal-crystal-roast|수정염소 스테이크|meal|consumable||0
meal-worldtree-greens|세계수 채소찜|meal|consumable||0
meal-hare-greens|토끼고기 잎채소 스튜|meal|consumable||0
meal-worldbird-greens|세계수 꿩 잎쌈|meal|consumable||0
meal-canyon-greens|협곡 고기 채소볶음|meal|consumable||0
meal-crystal-greens|수정염소 채소전골|meal|consumable||0
meal-carrot-carrot|당근 샐러드|meal|consumable||0
meal-carrot-deer|사슴 고기 볶음|meal|consumable||0
meal-carrot-bug|벌레고기 당근 볶음|meal|consumable||0
meal-carrot-firewolf|화염고기 당근구이|meal|consumable||0
meal-deer-deer|사슴 스테이크 모둠|meal|consumable||0
meal-deer-bug|사슴·벌레 혼합구이|meal|consumable||0
meal-deer-firewolf|화염 사슴구이|meal|consumable||0
meal-bug-bug|벌레고기 대접|meal|consumable||0
meal-bug-firewolf|화염 벌레구이|meal|consumable||0
meal-firewolf-firewolf|화염 고기 만찬|meal|consumable||0
croc-jaw-blade|악어 턱날|goldbench|weapon|crocTooth:5,crocHide:2,goldIngot:7,flowerLeather:3|0
croc-tooth-spear|악어 이빨창|goldbench|weapon|crocTooth:7,crocHide:1,goldIngot:6,wood:3,flowerLeather:3|0
croc-armor|악어 껍질갑옷|goldbench|armor|crocHide:8,crocTooth:3,goldIngot:8,flowerLeather:3|0
diving-suit|잠수복|goldbench|armor|sharkSkin:4,ironIngot:6,fiber:8,flowerLeather:2|0
deep-diver-armor|심해 잠수갑|goldbench|armor|sharkSkin:6,crocHide:4,goldIngot:5,flowerLeather:4|0
raw-squid-meat|오징어 생고기|loot|ingredient||0
cooked-squid-meat|구운 오징어고기|smelt|consumable||0
raw-fish|생선|loot|ingredient||0
cooked-fish|구운생선|loot|consumable||0
raw-crystal-deer-meat|수정 사슴고기|loot|ingredient||0
cooked-crystal-deer-meat|구운 수정사슴고기|loot|consumable||0
cooked-hare-meat|구운 숲토끼고기|loot|consumable||0
cooked-lizard-meat|구운 도마뱀고기|loot|consumable||0
cooked-greens|구운 야채|loot|consumable||0
meal-lake-fish-greens|호수 생선 야채찜|meal|consumable||0
meal-lake-fish-deer|생선 수정사슴 모둠|meal|consumable||0
meal-lake-fish-fish|거대 호수 생선 만찬|meal|consumable||0
meal-lake-hare-greens|토끼 야채구이|meal|consumable||0
meal-lake-lizard-greens|도마뱀 야채볶음|meal|consumable||0
meal-lake-deer-greens|수정사슴 야채전골|meal|consumable||0
meal-cooked-greens|구운 야채 한상|meal|consumable||0
leech-cleaver|거머리 흡혈도|junglebench|weapon|leechSucker:4,monopolyIngot:5,goldIngot:4|0
gorilla-armor|고릴라 중갑|junglebench|armor|gorillaHide:6,monopolyIngot:8,goldIngot:7|0
gorilla-guard-armor|고릴라 수호갑|junglebench|armor|gorillaHide:8,monopolyIngot:10,goldIngot:8|0
anaconda-armor|아나콘다 비늘갑옷|junglebench|armor|anacondaScale:7,monopolyIngot:7,goldIngot:6|0
mud-blade|머드 워커 도|junglebench|weapon|mudCore:5,monopolyIngot:5,goldIngot:4|0
mud-spear|머드 워커 창|junglebench|weapon|mudCore:6,monopolyIngot:6,goldIngot:4,wood:3|0
jungle-guardian-glaive|밀림 수호자의 장창|junglebench|weapon|jungleGuardianCore:1,monopolyIngot:8,goldIngot:6|0
tiger-twin-blades|호랑이 쌍검|hidden|weapon||0
tiger-dagger|호랑이 단검|hidden|weapon||0
toxic-spore-seeker|맹독 포자 추적구|junglebench|weapon|toxicMycelium:4,sporeSac:3,monopolyIngot:8,goldIngot:6|0
toxic-mycelium-armor|맹독 균사체 갑옷|junglebench|armor|toxicMycelium:7,monopolyIngot:10,flowerLeather:5|0
swamp-golem-armor|늪 골렘 갑옷|junglebench|armor|swampCore:6,monopolyIngot:8,goldIngot:4|0
fear-bear-claw|공포 곰 발톱검|junglebench|weapon|fearBearClaw:5,fearBearHide:3,monopolyIngot:7|0
fear-bear-armor|공포 곰 중갑|junglebench|armor|fearBearHide:7,fearBearClaw:2,monopolyIngot:8|0
fear-bear-hunter-armor|공포 곰 사냥갑|junglebench|armor|fearBearHide:6,fearBearClaw:4,monopolyIngot:7,flowerLeather:3|0
monopoly-pick|독점석 곡괭이|junglebench|tool|monopolyIngot:8,goldIngot:4,wood:3|0
toxic-furnace|독가스 용광로|junglebench|structure|monopolyStone:15,ironIngot:25,goldIngot:17,wood:20|0
sunstone-pick|태양석 곡괭이|sunstonebench|tool|sunstoneOre:8,monopolyIngot:5,wood:3|0
sunstone-greatsword|태양석 대검|sunstonebench|weapon|sunstoneIngot:12,monopolyIngot:8,goldIngot:6|0
sunstone-dagger|태양석 암살 단검|sunstonebench|weapon|sunstoneIngot:10,monopolyIngot:4,goldIngot:4|0
sunstone-orb|태양석 마법 구슬|sunstonebench|weapon|sunstoneIngot:14,monopolyIngot:6,goldIngot:5|0
sunstone-scorpion-blade|맹독 전갈검|sunstonebench|weapon|sunstoneOre:10,monopolyIngot:5,goldIngot:4|0
sunstone-scorpion-heavy|맹독 전갈 중갑|sunstonebench|armor|sunstoneOre:12,monopolyIngot:6,flowerLeather:4|0
sunstone-scorpion-light|맹독 전갈 경갑|sunstonebench|armor|sunstoneOre:10,monopolyIngot:5,flowerLeather:5|0
cooked-bird-meat|구운 꿩고기|smelt|consumable||0
cooked-crystal-goat-meat|구운 수정염소고기|smelt|consumable||0
yeti-horn-maul|예티 뿔 대검|junglebench|weapon|yetiHorn:2,yetiHide:2,monopolyIngot:8,goldIngot:5|0
yeti-armor|예티 방어구|junglebench|armor|yetiHide:4,yetiHorn:1,monopolyIngot:10,goldIngot:6|0
polar-bear-axe|북극곰 발톱도끼|junglebench|weapon|polarBearClaw:4,polarBearHide:2,monopolyIngot:6|0
polar-bear-spear|북극곰 창|junglebench|weapon|polarBearClaw:3,polarBearHide:3,monopolyIngot:6,wood:3|0
polar-bear-armor|북극곰 방어구|junglebench|armor|polarBearHide:7,polarBearClaw:3,monopolyIngot:7,flowerLeather:3|0
polar-wolf-blade|북극늑대 검|junglebench|weapon|polarWolfPelt:5,monopolyIngot:5,goldIngot:3|0
polar-wolf-armor|북극늑대 방어구|junglebench|armor|polarWolfPelt:7,monopolyIngot:6,flowerLeather:3|0
polar-wolf-hunter-armor|북극늑대 사냥갑|junglebench|armor|polarWolfPelt:8,monopolyIngot:6,goldIngot:2,flowerLeather:3|0
spider-fang-blade|거대거미 송곳니검|ironbench|weapon|giantSpiderSilk:4,giantSpiderFang:3,ironIngot:4,flowerLeather:3|0
spider-silk-spear|거대거미 실창|ironbench|weapon|giantSpiderSilk:5,giantSpiderFang:2,ironIngot:3,flowerLeather:3,wood:2|0
spider-silk-armor|거대거미 실갑옷|ironbench|armor|giantSpiderSilk:8,giantSpiderFang:2,ironIngot:4,flowerLeather:3|0";

    private sealed class Species
    {
        public string id, name, mood;
        public float hp, damage, speed;
    }

    private sealed class Recipe
    {
        public string id, name, station, kind, cost;
        public int power;
    }

    private sealed class Monster
    {
        public int runtimeId;
        public Species spec;
        public float hp, nextAttack;
        public bool creative, attackPlayer;
        public int opponentId = -1;
        public GameObject obj;
    }

    private sealed class SpawnBlock
    {
        public int id;
        public GameObject obj;
    }

    // 저장 · 기존 3D 저장 구조를 새 크리에이티브 저장 형식으로 안전하게 이관
    [Serializable] private sealed class LegacyBlock { public float x, z; }
    [Serializable] private sealed class LegacyMonster { public string id; public float x, z, hp; public int enemyIndex; public bool attackPlayer; }
    [Serializable] private sealed class LegacyWorld
    {
        public float x, z, hp;
        public int progress, level, resource, actions, wood, stone;
        public LegacyBlock[] blocks;
        public LegacyMonster[] monsters;
    }

    [Serializable]
    private sealed class BlockRecord
    {
        public int id;
        public Vector3 position;
    }

    [Serializable]
    private sealed class BuildingRecord
    {
        public string recipeId;
        public Vector3 position;
    }

    private sealed class BuiltStructure
    {
        public string recipeId;
        public GameObject obj;
    }

    [Serializable]
    private sealed class MonsterRecord
    {
        public int id, opponentId;
        public string speciesId;
        public Vector3 position;
        public float hp;
        public bool attackPlayer;
    }

    [Serializable]
    private sealed class CreativeRecord
    {
        public Vector3 playerPosition;
        public int nextId;
        public List<BlockRecord> blocks = new List<BlockRecord>();
        public List<MonsterRecord> monsters = new List<MonsterRecord>();
        public List<string> crafted = new List<string>();
        public List<BuildingRecord> buildings = new List<BuildingRecord>();
    }

    private enum ScreenMode { Title, SelectMode, Playing }
    private enum Panel { None, Options, Bag, Craft, Spawner, Aggro }

    private readonly List<Species> species = new List<Species>();
    private readonly List<Recipe> recipes = new List<Recipe>();
    private readonly List<Monster> monsters = new List<Monster>();
    private readonly List<SpawnBlock> blocks = new List<SpawnBlock>();
    private readonly List<string> crafted = new List<string>();
    private readonly List<BuiltStructure> buildings = new List<BuiltStructure>();
    private readonly Dictionary<Collider, Monster> monsterColliders = new Dictionary<Collider, Monster>();
    private readonly Dictionary<Collider, SpawnBlock> blockColliders = new Dictionary<Collider, SpawnBlock>();
    private readonly Dictionary<string, int> materials = new Dictionary<string, int>();
    private Camera mainCamera;
    private Transform player;
    private GameObject worldRoot;
    private ScreenMode screenMode = ScreenMode.Title;
    private Panel panel = Panel.None;
    private bool creative, placingBlock, musicEnabled = true;
    private float musicVolume = 1f, currentHp = 100f, attackCooldown, saveClock;
    private float cameraDistance = 14f, moveSpeed = 5.8f;
    private int nextId = 1, selectedMonsterId = -1, aggroMonsterId = -1;
    private int selectedSpeciesIndex, spawnCount = 1, speciesPage, craftPage;
    private string spawnCountText = "1", equippedWeapon = "", info = "";
    private Vector2 moveFromButtons, craftScroll;
    private float lastTapTime, touchStartTime;
    private int lastTapId = -1, pointerMonsterId = -1, pointerBlockId = -1;
    private bool holdTriggered, pointerActive;
    private Vector2 pointerOrigin;
    private int progress, level = 1, resource = 10, actions;

    // 메인 · 초기화
    private void Awake()
    {
        Application.targetFrameRate = 60;
        Screen.sleepTimeout = SleepTimeout.NeverSleep;
        ReadGameData();
        LoadNormalCounters();
        cameraDistance = Mathf.Clamp(PlayerPrefs.GetFloat(SavePrefix + "camera_distance", 14f), 8f, 24f);
        moveSpeed = Mathf.Clamp(PlayerPrefs.GetFloat(SavePrefix + "move_speed", 5.8f), 3f, 9f);
        BuildWorld();
        Debug.Log("JAEWOON_UNITY_WEB_QA BOOT game=" + GameId + " status=SOURCE_READY_3D");
    }

    private static float ParseFloat(string value)
    {
        float n;
        return float.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out n) ? n : 0f;
    }

    private void ReadGameData()
    {
        foreach (string row in SpeciesText.Split('\n'))
        {
            string[] p = row.Trim().Split('|');
            if (p.Length != 6) continue;
            species.Add(new Species { id = p[0], name = p[1], mood = p[2], hp = ParseFloat(p[3]), damage = ParseFloat(p[4]), speed = ParseFloat(p[5]) });
        }
        foreach (string row in RecipesText.Split('\n'))
        {
            string[] p = row.Trim().Split('|');
            if (p.Length != 6) continue;
            recipes.Add(new Recipe { id = p[0], name = p[1], station = p[2], kind = p[3], cost = p[4], power = Mathf.RoundToInt(ParseFloat(p[5])) });
        }
    }

    private void BuildWorld()
    {
        worldRoot = new GameObject("MagicForest_3D_World");
        mainCamera = Camera.main;
        if (mainCamera == null)
        {
            GameObject cameraObject = new GameObject("Main Camera");
            mainCamera = cameraObject.AddComponent<Camera>();
            cameraObject.tag = "MainCamera";
        }
        mainCamera.clearFlags = CameraClearFlags.SolidColor;
        mainCamera.backgroundColor = new Color(0.065f, 0.16f, 0.14f);
        mainCamera.fieldOfView = 57f;

        if (FindFirstObjectByType<Light>() == null)
        {
            GameObject source = new GameObject("Sunlight");
            Light sunlight = source.AddComponent<Light>();
            sunlight.type = LightType.Directional;
            sunlight.intensity = 1.15f;
            source.transform.rotation = Quaternion.Euler(46f, -25f, 0f);
        }

        Color[] regionColors =
        {
            new Color(.16f,.39f,.21f), new Color(.35f,.30f,.25f),
            new Color(.22f,.34f,.42f), new Color(.25f,.28f,.37f),
            new Color(.55f,.37f,.20f)
        };
        for (int i = 0; i < regionColors.Length; i++)
        {
            GameObject ground = GameObject.CreatePrimitive(PrimitiveType.Cube);
            ground.name = "3D_Region_" + i;
            ground.transform.SetParent(worldRoot.transform);
            ground.transform.position = new Vector3((i - 2) * 16f, -.45f, 0f);
            ground.transform.localScale = new Vector3(16f, .9f, 80f);
            Tint(ground, regionColors[i]);
        }
        for (int i = 0; i < 85; i++)
        {
            float x = (i * 19 % 77) - 38f;
            float z = (i * 43 % 77) - 38f;
            if (Mathf.Abs(x) < 4 && Mathf.Abs(z) < 4) continue;
            GameObject trunk = GameObject.CreatePrimitive(i % 4 == 0 ? PrimitiveType.Cube : PrimitiveType.Cylinder);
            trunk.name = i % 4 == 0 ? "Rock" : "Tree";
            trunk.transform.SetParent(worldRoot.transform);
            trunk.transform.position = new Vector3(x, i % 4 == 0 ? .55f : 1.4f, z);
            trunk.transform.localScale = i % 4 == 0 ? new Vector3(1.5f, 1f, 1.3f) : new Vector3(.5f, 1.4f, .5f);
            Tint(trunk, i % 4 == 0 ? new Color(.48f,.51f,.53f) : new Color(.4f,.27f,.16f));
            if (i % 4 != 0)
            {
                GameObject crown = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                crown.name = "LeafCrown";
                crown.transform.SetParent(trunk.transform, false);
                crown.transform.localPosition = Vector3.up * .85f;
                crown.transform.localScale = new Vector3(4.5f, .9f, 4.5f);
                Tint(crown, new Color(.19f + i % 3 * .05f, .39f, .22f));
            }
        }
        GameObject character = new GameObject("Player_3D");
        character.transform.SetParent(worldRoot.transform);
        character.transform.position = Vector3.zero;
        player = character.transform;
        CreatePart(character.transform, PrimitiveType.Capsule, "Body", Vector3.up * 1f, new Vector3(.7f,.82f,.52f), new Color(.33f,.65f,.51f), false);
        CreatePart(character.transform, PrimitiveType.Sphere, "Head", Vector3.up * 2.07f, Vector3.one * .63f, new Color(.90f,.75f,.61f), false);
        CreatePart(character.transform, PrimitiveType.Cube, "Bag", new Vector3(0,1.25f,-.36f), new Vector3(.64f,.68f,.22f), new Color(.36f,.24f,.15f), false);
        CreatePart(character.transform, PrimitiveType.Capsule, "LeftArm", new Vector3(-.55f,1.32f,0), new Vector3(.24f,.48f,.24f), new Color(.30f,.53f,.38f), false);
        CreatePart(character.transform, PrimitiveType.Capsule, "RightArm", new Vector3(.55f,1.32f,0), new Vector3(.24f,.48f,.24f), new Color(.30f,.53f,.38f), false);
        FollowCamera(true);
    }

    private static GameObject CreatePart(Transform parent, PrimitiveType primitive, string name, Vector3 localPos, Vector3 localScale, Color color, bool keepCollider)
    {
        GameObject obj = GameObject.CreatePrimitive(primitive);
        obj.name = name;
        obj.transform.SetParent(parent, false);
        obj.transform.localPosition = localPos;
        obj.transform.localScale = localScale;
        Tint(obj, color);
        if (!keepCollider) Destroy(obj.GetComponent<Collider>());
        return obj;
    }

    private static void Tint(GameObject obj, Color color)
    {
        Renderer rr = obj.GetComponent<Renderer>();
        if (rr != null) rr.material.color = color;
    }

    private void FollowCamera(bool instant)
    {
        Vector3 pos = player.position + new Vector3(0f, cameraDistance, -cameraDistance);
        mainCamera.transform.position = instant ? pos : Vector3.Lerp(mainCamera.transform.position, pos, Time.deltaTime * 7f);
        mainCamera.transform.LookAt(player.position + Vector3.up);
    }

    // 메인 · 플레이 선택과 저장 분리
    private void EnterMode(bool useCreative)
    {
        ClearEntities();
        creative = useCreative;
        currentHp = 100f;
        placingBlock = false;
        selectedMonsterId = -1;
        aggroMonsterId = -1;
        panel = Panel.None;
        player.position = Vector3.zero;
        materials.Clear();
        crafted.Clear();
        materials["wood"] = 0;
        materials["stone"] = 0;
        materials["fiber"] = 0;
        equippedWeapon = "";
        if (creative)
        {
            LoadCreative();
            info = "가방에서 몬스터 스폰 블록을 설치해.";
        }
        else
        {
            LoadNormalWorld();
            for (int i = 0; i < 8; i++)
                SpawnMonster(species[i % Mathf.Min(8, species.Count)], new Vector3(Mathf.Cos(i*.78f)*13,0f,Mathf.Sin(i*.78f)*13), false);
            info = "일반 모드 · 전투, 채집, 제작";
        }
        screenMode = ScreenMode.Playing;
        FollowCamera(true);
    }

    private void ClearEntities()
    {
        foreach (Monster m in monsters) if (m.obj != null) Destroy(m.obj);
        foreach (BuiltStructure building in buildings) if (building.obj != null) Destroy(building.obj);
        buildings.Clear();
        foreach (SpawnBlock b in blocks) if (b.obj != null) Destroy(b.obj);
        monsters.Clear();
        blocks.Clear();
        monsterColliders.Clear();
        blockColliders.Clear();
    }

    // 메인 · 기존 몬스터 정보를 3D로 표현
    private Monster SpawnMonster(Species spec, Vector3 position, bool isOwned)
    {
        if (spec == null || monsters.Count >= 150) return null;
        Monster m = new Monster { runtimeId = nextId++, spec = spec, hp = Mathf.Max(1,spec.hp), creative = isOwned, attackPlayer = false };
        GameObject root = new GameObject("Monster_" + spec.id);
        root.transform.SetParent(worldRoot.transform);
        root.transform.position = new Vector3(Mathf.Clamp(position.x,-38f,38f),0,Mathf.Clamp(position.z,-38f,38f));
        int silhouette = Mathf.Abs(spec.id.GetHashCode()) % 5;
        Color tone = Color.HSVToRGB((Mathf.Abs(spec.id.GetHashCode() % 1000))/1000f,.45f,.75f);
        PrimitiveType bodyShape = silhouette==0?PrimitiveType.Capsule:silhouette==1?PrimitiveType.Cube:silhouette==2?PrimitiveType.Cylinder:PrimitiveType.Sphere;
        float size = Mathf.Clamp(Mathf.Sqrt(spec.hp)/10f,.6f,2.6f);
        GameObject body = CreatePart(root.transform,bodyShape,"Body",new Vector3(0,size*.55f,0),new Vector3(size,Mathf.Max(.55f,size),size*.9f),tone,true);
        monsterColliders[body.GetComponent<Collider>()] = m;
        if (silhouette == 3 || silhouette == 4)
        {
            CreatePart(root.transform,PrimitiveType.Cube,"Crest",new Vector3(0,size*1.12f,0),new Vector3(size*.3f,size*.4f,size*.9f),tone*.75f,false);
        }
        else if (silhouette == 1 || silhouette == 2)
        {
            CreatePart(root.transform,PrimitiveType.Sphere,"Head",new Vector3(0,size*1.1f,size*.38f),Vector3.one*size*.55f,tone*.9f,false);
        }
        m.obj=root;
        monsters.Add(m);
        return m;
    }

    private SpawnBlock PlaceBlock(Vector3 at)
    {
        if (blocks.Count >= 100) { info = "스폰 블록 최대 100개"; return null; }
        GameObject root = GameObject.CreatePrimitive(PrimitiveType.Cube);
        root.name = "MonsterSpawnBlock";
        root.transform.SetParent(worldRoot.transform);
        root.transform.position = new Vector3(Mathf.Clamp(at.x,-38,38),.47f,Mathf.Clamp(at.z,-38,38));
        root.transform.localScale = Vector3.one * .95f;
        Tint(root,new Color(.43f,.28f,.75f));
        SpawnBlock b = new SpawnBlock{ id=nextId++, obj=root };
        blocks.Add(b);
        blockColliders[root.GetComponent<Collider>()] = b;
        return b;
    }

    private void SpawnFromBlock()
    {
        if (blocks.Count==0 || selectedSpeciesIndex<0 || selectedSpeciesIndex>=species.Count) return;
        int count;
        if(!int.TryParse(spawnCountText,out count) || count<1 || count>30) {info="마릿수는 1~30만 가능";return;}
        if(monsters.Count+count>150) {info="몬스터는 최대 150마리";return;}
        Vector3 center = blocks[blocks.Count-1].obj.transform.position;
        foreach(SpawnBlock b in blocks) if(b.id==selectedBlockId) center=b.obj.transform.position;
        for(int i=0;i<count;i++)
        {
            float angle=i*2.39996f, radius=1.7f+Mathf.Sqrt(i)*.62f;
            SpawnMonster(species[selectedSpeciesIndex],center+new Vector3(Mathf.Cos(angle)*radius,0,Mathf.Sin(angle)*radius),true);
        }
        info=species[selectedSpeciesIndex].name+" "+count+"마리 소환";
        panel=Panel.None;
        SaveCreative();
    }

    private int selectedBlockId=-1;
    private Monster FindMonster(int id) {return monsters.Find(m=>m.runtimeId==id && m.hp>0);}
    private void ChooseOpponent(Monster monster)
    {
        if (monster==null || !monster.creative) return;
        if (monster.spec.mood=="harmless"){selectedMonsterId=-1;info="무해한 몬스터는 누구도 공격하지 않아.";return;}
        Monster first=FindMonster(selectedMonsterId);
        if(first==null || first==monster){selectedMonsterId=monster.runtimeId;info=monster.spec.name+" 선택 · 다른 몬스터를 두 번 눌러";return;}
        if(first.spec.mood=="harmless"){selectedMonsterId=-1;return;}
        first.opponentId=monster.runtimeId;
        monster.opponentId=first.runtimeId;
        first.attackPlayer=false;
        monster.attackPlayer=false;
        selectedMonsterId=-1;
        info=first.spec.name+" 대 "+monster.spec.name+" 전투 시작";
        SaveCreative();
    }

    private void UpdateMonsters(float dt)
    {
        for(int i=monsters.Count-1;i>=0;i--)
        {
            Monster m=monsters[i];
            if(m.hp<=0){if(m.obj!=null)Destroy(m.obj);monsters.RemoveAt(i);continue;}
            if(m.creative && m.spec.mood=="harmless"){m.attackPlayer=false;m.opponentId=-1;continue;}
            Monster opponent=m.creative?FindMonster(m.opponentId):null;
            if(opponent!=null && opponent.spec.mood=="harmless"){m.opponentId=-1;opponent=null;}
            Transform target=opponent!=null?opponent.obj.transform:((!m.creative && m.spec.mood=="aggressive") || (m.creative && m.attackPlayer) ? player:null);
            if(target==null)continue;
            Vector3 delta=target.position-m.obj.transform.position;
            delta.y=0;
            float d=delta.magnitude;
            float range=opponent!=null?1.4f:.95f;
            if(d>range && d < (m.creative?18f:24f))
            {
                float speed=Mathf.Clamp(m.spec.speed/35f,.75f,5f);
                m.obj.transform.position += delta.normalized * speed * dt;
                if(delta.sqrMagnitude>.01f)m.obj.transform.rotation=Quaternion.Slerp(m.obj.transform.rotation,Quaternion.LookRotation(delta),dt*8f);
            }
            else if(d<=range && Time.time>=m.nextAttack)
            {
                m.nextAttack=Time.time + 1f;
                if(opponent!=null)HurtMonster(opponent,m.spec.damage);
                else if (m.spec.damage>0)
                {
                    currentHp=Mathf.Max(0,currentHp-m.spec.damage);
                    if(currentHp<=0){player.position=Vector3.zero;currentHp=100;info="쓰러져 시작 위치로 돌아왔어.";}
                }
            }
        }
    }

    private void HurtMonster(Monster monster,float amount)
    {
        if(monster==null || monster.hp<=0)return;
        monster.hp=Mathf.Max(0,monster.hp-Mathf.Max(0,amount));
        if(monster.hp<=0){if(!creative){progress++;actions++;SaveNormalCounters();}info=monster.spec.name+" 처치";}
    }

    private void Attack()
    {
        if(Time.time<attackCooldown)return;
        attackCooldown=Time.time+.65f;
        Monster closest=null;
        float best=2.8f;
        foreach(Monster m in monsters)
        {
            if(m.hp<=0)continue;
            float d=Vector3.Distance(player.position,m.obj.transform.position);
            if(d<best){best=d;closest=m;}
        }
        if(closest==null){info="공격 범위에 몬스터가 없어.";return;}
        int damage=5;
        foreach(Recipe recipe in recipes)if(recipe.id==equippedWeapon){damage=Mathf.Max(5,recipe.power);break;}
        HurtMonster(closest,damage);
    }

    // 메인 · 조작과 터치 길게 누르기
    private void Update()
    {
        if(screenMode!=ScreenMode.Playing)return;
        float dt=Mathf.Min(Time.deltaTime,.05f);
        if(panel==Panel.None)
        {
            Vector2 keys=new Vector2(Input.GetAxisRaw("Horizontal"),Input.GetAxisRaw("Vertical"));
            Vector2 movement=Vector2.ClampMagnitude(keys+moveFromButtons,1f);
            Vector3 direct=new Vector3(movement.x,0,movement.y);
            if(direct.sqrMagnitude>.02f)
            {
                player.position+=direct*moveSpeed*dt;
                player.position=new Vector3(Mathf.Clamp(player.position.x,-38f,38f),0,Mathf.Clamp(player.position.z,-38f,38f));
                player.rotation=Quaternion.Slerp(player.rotation,Quaternion.LookRotation(direct),dt*9f);
            }
            UpdateMonsters(dt);
            ReadWorldPointer();
            if(Input.GetKeyDown(KeyCode.Space))Attack();
            if(Input.GetKeyDown(KeyCode.I))panel=Panel.Bag;
            if(Input.GetKeyDown(KeyCode.C))panel=Panel.Craft;
        }
        FollowCamera(false);
        saveClock+=dt;
        if(saveClock>12f){saveClock=0;if(creative)SaveCreative();else SaveNormalCounters();}
    }

    private bool OnHud(Vector2 screenPointer)
    {
        float y=Screen.height-screenPointer.y;
        return y<90f || y>Screen.height*.76f;
    }

    private void ReadWorldPointer()
    {
        if(Input.touchCount>0)
        {
            Touch t=Input.GetTouch(0);
            if(t.phase==TouchPhase.Began)BeginPointer(t.position);
            else if(t.phase==TouchPhase.Moved||t.phase==TouchPhase.Stationary)MovePointer(t.position);
            else if(t.phase==TouchPhase.Ended)EndPointer(t.position);
            else if(t.phase==TouchPhase.Canceled)CancelPointer();
        }
        else
        {
            Vector2 pos=Input.mousePosition;
            if(Input.GetMouseButtonDown(0))BeginPointer(pos);
            if(Input.GetMouseButton(0))MovePointer(pos);
            if(Input.GetMouseButtonUp(0))EndPointer(pos);
        }
    }

    private void BeginPointer(Vector2 pos)
    {
        CancelPointer();
        if(OnHud(pos))return;
        pointerActive=true;
        touchStartTime=Time.unscaledTime;
        pointerOrigin=pos;
        RaycastHit hit;
        if(!Physics.Raycast(mainCamera.ScreenPointToRay(pos),out hit,100f))return;
        Monster m;
        SpawnBlock b;
        if(monsterColliders.TryGetValue(hit.collider,out m))pointerMonsterId=m.runtimeId;
        else if(blockColliders.TryGetValue(hit.collider,out b))pointerBlockId=b.id;
    }

    private void MovePointer(Vector2 pos)
    {
        if(!pointerActive)return;
        if((pos-pointerOrigin).sqrMagnitude>30f*30f){CancelPointer();return;}
        if(!holdTriggered && creative && pointerMonsterId>0 && Time.unscaledTime-touchStartTime>=HoldSeconds)
        {
            Monster m=FindMonster(pointerMonsterId);
            holdTriggered=true;
            if(m!=null && m.creative && m.spec.mood!="harmless"){aggroMonsterId=m.runtimeId;panel=Panel.Aggro;}
            else info="무해한 몬스터는 공격 설정이 없어.";
        }
    }

    private void EndPointer(Vector2 pos)
    {
        if(!pointerActive)return;
        int monsterId=pointerMonsterId,blockId=pointerBlockId;
        bool consumed=holdTriggered;
        CancelPointer();
        if(consumed)return;
        if(placingBlock && creative)
        {
            RaycastHit ground;
            if(Physics.Raycast(mainCamera.ScreenPointToRay(pos),out ground,120f))
            {
                Vector3 point=ground.point;
                point.y=0;
                PlaceBlock(point);
                placingBlock=false;
                info="스폰 블록 설치 · 두 번 눌러 설정";
                SaveCreative();
            }
            return;
        }
        int targetId=monsterId>0?monsterId:-blockId-1000;
        if(targetId==lastTapId && Time.unscaledTime-lastTapTime<DoubleTapSeconds)
        {
            lastTapId=-1;
            if(blockId>0 && creative){selectedBlockId=blockId;panel=Panel.Spawner;}
            else if(monsterId>0 && creative)ChooseOpponent(FindMonster(monsterId));
            return;
        }
        lastTapId=targetId;
        lastTapTime=Time.unscaledTime;
        if(monsterId>0)info="몬스터를 한 번 더 눌러 선택";
        if(blockId>0)info="스폰 블록을 한 번 더 눌러";
    }

    private void CancelPointer()
    {
        pointerActive=false;
        pointerMonsterId=-1;
        pointerBlockId=-1;
        holdTriggered=false;
    }

    // 메인 · 제작 (크리에이티브에서는 재료를 사용하지 않는다)
    private void Craft(Recipe recipe)
    {
        if(!creative)
        {
            string[] costs=recipe.cost.Split(',');
            foreach(string entry in costs)
            {
                string[] kv=entry.Split(':');
                int required,owned;
                if(kv.Length!=2 || !int.TryParse(kv[1],out required))continue;
                if(!materials.TryGetValue(kv[0],out owned)||owned<required){info="재료가 부족해.";return;}
            }
            foreach(string entry in costs)
            {
                string[] kv=entry.Split(':');
                int required,owned;
                if(kv.Length!=2 || !int.TryParse(kv[1],out required))continue;
                if(materials.TryGetValue(kv[0],out owned))materials[kv[0]]=owned-required;
            }
        }
        crafted.Add(recipe.id);
        if(recipe.kind=="weapon")equippedWeapon=recipe.id;
        if(recipe.kind=="structure")
        {
            GameObject building=GameObject.CreatePrimitive(PrimitiveType.Cube);
            building.name="Built_"+recipe.id;
            building.transform.SetParent(worldRoot.transform);
            building.transform.position=player.position+player.forward*2.5f+Vector3.up*.65f;
            building.transform.localScale=new Vector3(1.4f,1.3f,1.4f);
            Tint(building,new Color(.55f,.4f,.27f));
            buildings.Add(new BuiltStructure { recipeId=recipe.id, obj=building });
        }
        info=recipe.name+" 제작 완료";
        if(creative)SaveCreative();
    }

    private void Gather()
    {
        Vector3 position=player.position;
        float nearest=3.1f;
        string material="";
        foreach(Collider col in Physics.OverlapSphere(position,3.1f))
        {
            string n=col.gameObject.name;
            if(n!="Tree" && n!="Rock")continue;
            float d=Vector3.Distance(position,col.transform.position);
            if(d<nearest){nearest=d;material=n=="Tree"?"wood":"stone";}
        }
        if(material==""){info="가까운 나무나 돌이 없어.";return;}
        if(!materials.ContainsKey(material))materials[material]=0;
        materials[material]++;
        info=(material=="wood"?"나무":"돌")+" 1개 채집";
    }

    // 저장 · 크리에이티브 데이터는 기존 일반 저장 키에 쓰지 않는다
    private void LoadNormalCounters()
    {
        progress=PlayerPrefs.GetInt(SavePrefix+"progress",0);
        level=Mathf.Max(1,PlayerPrefs.GetInt(SavePrefix+"level",1));
        resource=PlayerPrefs.GetInt(SavePrefix+"resource",10);
        actions=PlayerPrefs.GetInt(SavePrefix+"actions",0);
    }

    private void LoadNormalWorld()
    {
        string raw=PlayerPrefs.GetString(LegacyNormalSaveKey,"");
        if(raw.Length==0)return;
        try
        {
            LegacyWorld old=JsonUtility.FromJson<LegacyWorld>(raw);
            if(old==null)return;
            player.position=new Vector3(Mathf.Clamp(old.x,-38f,38f),0,Mathf.Clamp(old.z,-38f,38f));
            currentHp=Mathf.Clamp(old.hp,1f,100f);
            materials["wood"]=Mathf.Max(0,old.wood);
            materials["stone"]=Mathf.Max(0,old.stone);
        }
        catch(Exception){info="기존 일반 저장 읽기 실패 · 새 게임 진행";}
    }

    private void SaveNormalCounters()
    {
        PlayerPrefs.SetInt(SavePrefix+"progress",progress);
        PlayerPrefs.SetInt(SavePrefix+"level",level);
        PlayerPrefs.SetInt(SavePrefix+"resource",resource);
        PlayerPrefs.SetInt(SavePrefix+"actions",actions);
        LegacyWorld data=new LegacyWorld
        {
            x=player.position.x,z=player.position.z,hp=currentHp,
            progress=progress,level=level,resource=resource,actions=actions,
            wood=materials.ContainsKey("wood")?materials["wood"]:0,
            stone=materials.ContainsKey("stone")?materials["stone"]:0,
            blocks=new LegacyBlock[0],monsters=new LegacyMonster[0]
        };
        PlayerPrefs.SetString(LegacyNormalSaveKey,JsonUtility.ToJson(data));
        PlayerPrefs.Save();
    }

    private void SaveCreative()
    {
        if(!creative)return;
        CreativeRecord record=new CreativeRecord{playerPosition=player.position,nextId=nextId};
        foreach(SpawnBlock b in blocks)record.blocks.Add(new BlockRecord{id=b.id,position=b.obj.transform.position});
        foreach(Monster m in monsters)if(m.creative && m.hp>0)record.monsters.Add(new MonsterRecord{id=m.runtimeId,opponentId=m.opponentId,speciesId=m.spec.id,position=m.obj.transform.position,hp=m.hp,attackPlayer=m.attackPlayer && m.spec.mood!="harmless"});
        record.crafted.AddRange(crafted);
        foreach(BuiltStructure building in buildings)if(building.obj!=null)record.buildings.Add(new BuildingRecord { recipeId=building.recipeId, position=building.obj.transform.position });
        PlayerPrefs.SetString(CreativeSaveKey,JsonUtility.ToJson(record));
        PlayerPrefs.Save();
    }

    private void LoadCreative()
    {
        string saved=PlayerPrefs.GetString(CreativeSaveKey,"");
        if(saved.Length==0)
        {
            string legacy=PlayerPrefs.GetString(LegacyCreativeSaveKey,"");
            if(legacy.Length==0)return;
            try
            {
                LegacyWorld old=JsonUtility.FromJson<LegacyWorld>(legacy);
                if(old==null)return;
                player.position=new Vector3(Mathf.Clamp(old.x,-38f,38f),0,Mathf.Clamp(old.z,-38f,38f));
                currentHp=Mathf.Clamp(old.hp,1,100);
                if(old.blocks!=null)foreach(LegacyBlock b in old.blocks)
                {
                    if(blocks.Count>=100)break;
                    PlaceBlock(new Vector3(b.x,0,b.z));
                }
                var converted=new List<Monster>();
                if(old.monsters!=null)foreach(LegacyMonster previous in old.monsters)
                {
                    Species type=species.Find(v=>v.id==previous.id);
                    if(type==null || converted.Count>=150){converted.Add(null);continue;}
                    Monster m=SpawnMonster(type,new Vector3(previous.x,0,previous.z),true);
                    if(m!=null){m.hp=Mathf.Clamp(previous.hp,1,m.spec.hp);m.attackPlayer=previous.attackPlayer && m.spec.mood!="harmless";}
                    converted.Add(m);
                }
                if(old.monsters!=null)for(int i=0;i<Mathf.Min(converted.Count,old.monsters.Length);i++)
                {
                    Monster m=converted[i];if(m==null || m.spec.mood=="harmless")continue;
                    int target=old.monsters[i].enemyIndex;
                    if(target>=0 && target<converted.Count && converted[target]!=null && converted[target].spec.mood!="harmless" && target!=i)
                        m.opponentId=converted[target].runtimeId;
                }
                SaveCreative();
            }
            catch(Exception){info="기존 크리에이티브 저장 읽기 실패";}
            return;
        }
        CreativeRecord record;
        try{record=JsonUtility.FromJson<CreativeRecord>(saved);}catch(Exception){return;}
        if(record==null)return;
        player.position=record.playerPosition;
        nextId=Mathf.Max(1,record.nextId);
        if(record.crafted!=null)crafted.AddRange(record.crafted);
        if(record.buildings!=null)foreach(BuildingRecord item in record.buildings)
        {
            if(buildings.Count>=300)break;
            if(recipes.Find(x=>x.id==item.recipeId && x.kind=="structure")==null)continue;
            GameObject building=GameObject.CreatePrimitive(PrimitiveType.Cube);
            building.name="Built_"+item.recipeId;
            building.transform.SetParent(worldRoot.transform);
            building.transform.position=item.position;
            building.transform.localScale=new Vector3(1.4f,1.3f,1.4f);
            Tint(building,new Color(.55f,.4f,.27f));
            buildings.Add(new BuiltStructure { recipeId=item.recipeId, obj=building });
        }
        if(record.blocks!=null)foreach(BlockRecord b in record.blocks)
        {
            if(blocks.Count>=100)break;
            SpawnBlock at=PlaceBlock(b.position);
            if(at!=null)at.id=b.id;
        }
        if(record.monsters!=null)foreach(MonsterRecord item in record.monsters)
        {
            Species spec=species.Find(x=>x.id==item.speciesId);
            if(spec==null)continue;
            Monster m=SpawnMonster(spec,item.position,true);
            if(m==null)break;
            m.runtimeId=item.id;
            m.hp=Mathf.Clamp(item.hp,1,m.spec.hp);
            m.opponentId=item.opponentId;
            m.attackPlayer=item.attackPlayer && m.spec.mood!="harmless";
        }
        int maxId=nextId;
        foreach(Monster m in monsters)maxId=Mathf.Max(maxId,m.runtimeId+1);
        foreach(SpawnBlock b in blocks)maxId=Mathf.Max(maxId,b.id+1);
        nextId=maxId;
    }

    private void OnApplicationPause(bool paused){if(paused){if(creative)SaveCreative();else if(screenMode==ScreenMode.Playing)SaveNormalCounters();}}
    private void OnApplicationQuit(){if(creative)SaveCreative();else if(screenMode==ScreenMode.Playing)SaveNormalCounters();}

    // 화면 · 모바일 터치 조작과 메뉴
    private void OnGUI()
    {
        float w=Screen.width,h=Screen.height;
        GUI.skin.button.fontSize=Mathf.Clamp(Mathf.RoundToInt(w/29f),12,20);
        GUI.skin.label.fontSize=Mathf.Clamp(Mathf.RoundToInt(w/31f),12,18);
        if(screenMode==ScreenMode.Title || screenMode==ScreenMode.SelectMode)
        {
            Rect box=new Rect(w*.1f,h*.18f,w*.8f,h*.64f);
            GUI.Box(box,"마력숲 생존기 3D");
            float bw=w*.62f,bx=w*.19f,bh=Mathf.Max(48,h*.09f);
            if(screenMode==ScreenMode.Title)
            {
                if(GUI.Button(new Rect(bx,h*.41f,bw,bh),"플레이"))screenMode=ScreenMode.SelectMode;
                if(GUI.Button(new Rect(bx,h*.54f,bw,bh),"옵션"))panel=Panel.Options;
            }
            else
            {
                if(GUI.Button(new Rect(bx,h*.34f,bw,bh),"일반 모드"))EnterMode(false);
                if(GUI.Button(new Rect(bx,h*.47f,bw,bh),"크리에이티브 모드"))EnterMode(true);
                if(GUI.Button(new Rect(bx,h*.60f,bw,bh),"뒤로"))screenMode=ScreenMode.Title;
            }
            if(panel==Panel.Options)DrawPanel(w,h);
            return;
        }
        GUI.Box(new Rect(8,8,w*.57f,74f),(creative?"크리에이티브":"일반")+" · 체력 "+Mathf.CeilToInt(currentHp)+"/100\n"+info);
        if(GUI.Button(new Rect(w-88,8,80,48),"메뉴"))panel=Panel.Options;
        if(panel!=Panel.None){DrawPanel(w,h);return;}
        float sz=Mathf.Max(50f,Mathf.Min(w*.16f,74f));
        float yy=h-sz-12f;
        moveFromButtons=Vector2.zero;
        if(GUI.RepeatButton(new Rect(12,yy-sz,sz,sz),"▲"))moveFromButtons.y+=1;
        if(GUI.RepeatButton(new Rect(12,yy,sz,sz),"▼"))moveFromButtons.y-=1;
        if(GUI.RepeatButton(new Rect(12+sz,yy,sz,sz),"▶"))moveFromButtons.x+=1;
        if(GUI.RepeatButton(new Rect(12+sz*2,yy,sz,sz),"◀"))moveFromButtons.x-=1;
        if(GUI.Button(new Rect(w-sz-14,yy-sz,sz,sz),"공격"))Attack();
        if(GUI.Button(new Rect(w-sz*2-19,yy,sz,sz),"가방"))panel=Panel.Bag;
        if(GUI.Button(new Rect(w-sz-14,yy,sz,sz),"제작")){craftPage=0;panel=Panel.Craft;}
        if(GUI.Button(new Rect(w*.42f,yy,sz,sz),"채집"))Gather();
    }

    private void DrawPanel(float w,float h)
    {
        Rect rect=new Rect(w*.05f,h*.1f,w*.9f,h*.78f);
        GUI.Box(rect, panel==Panel.Options?"옵션":panel==Panel.Bag?"가방":panel==Panel.Craft?"제작":panel==Panel.Spawner?"몬스터 스폰 블록":"몬스터 공격 설정");
        GUILayout.BeginArea(new Rect(rect.x+14,rect.y+35,rect.width-28,rect.height-45));
        if(panel==Panel.Options)
        {
            if(GUILayout.Button(musicEnabled?"음악 켜짐":"음악 꺼짐",GUILayout.Height(45))){musicEnabled=!musicEnabled;AudioListener.pause=!musicEnabled;}
            GUILayout.Label("카메라 거리 "+cameraDistance.ToString("0.0"));
            GUILayout.BeginHorizontal();
            if(GUILayout.Button("가까이",GUILayout.Height(40)))cameraDistance=Mathf.Max(8f,cameraDistance-1f);
            if(GUILayout.Button("멀리",GUILayout.Height(40)))cameraDistance=Mathf.Min(24f,cameraDistance+1f);
            GUILayout.EndHorizontal();
            GUILayout.Label("이동 속도 "+moveSpeed.ToString("0.0"));
            GUILayout.BeginHorizontal();
            if(GUILayout.Button("느리게",GUILayout.Height(40)))moveSpeed=Mathf.Max(3f,moveSpeed-.5f);
            if(GUILayout.Button("빠르게",GUILayout.Height(40)))moveSpeed=Mathf.Min(9f,moveSpeed+.5f);
            GUILayout.EndHorizontal();
            PlayerPrefs.SetFloat(SavePrefix+"camera_distance",cameraDistance);
            PlayerPrefs.SetFloat(SavePrefix+"move_speed",moveSpeed);
            GUILayout.Label("음량 "+Mathf.RoundToInt(musicVolume*100)+"%");
            musicVolume=GUILayout.HorizontalSlider(musicVolume,0f,1f,GUILayout.Height(35));
            AudioListener.volume=musicVolume;
            if(GUILayout.Button("타이틀로",GUILayout.Height(48)))
            {
                if(creative)SaveCreative();
                panel=Panel.None;
                screenMode=ScreenMode.Title;
                GUILayout.EndArea();
                return;
            }
        }
        else if(panel==Panel.Bag)
        {
            GUILayout.Label("장착 무기: "+(equippedWeapon==""?"맨손":equippedWeapon));
            if(creative)
            {
                GUILayout.Label("몬스터 스폰 블록 ×무제한");
                if(GUILayout.Button("몬스터 스폰 블록 설치",GUILayout.Height(52))){placingBlock=true;panel=Panel.None;info="설치할 땅을 눌러."; }
            }
            else GUILayout.Label("나무 "+materials["wood"]+" · 돌 "+materials["stone"]+" · 섬유 "+materials["fiber"]);
            GUILayout.Label("제작 완료 "+crafted.Count+"개");
        }
        else if(panel==Panel.Craft)
        {
            GUILayout.Label(creative?"기존 마력숲 제작법 "+recipes.Count+"종 · 재료 무제한":"제작법 · 보유 재료 필요");
            int pages=Mathf.CeilToInt(recipes.Count/8f);
            GUILayout.BeginHorizontal();
            if(GUILayout.Button("이전",GUILayout.Height(45)))craftPage=Mathf.Max(0,craftPage-1);
            GUILayout.Label((craftPage+1)+" / "+pages,GUILayout.Width(70));
            if(GUILayout.Button("다음",GUILayout.Height(45)))craftPage=Mathf.Min(pages-1,craftPage+1);
            GUILayout.EndHorizontal();
            craftScroll=GUILayout.BeginScrollView(craftScroll);
            for(int i=craftPage*8;i<Mathf.Min(recipes.Count,craftPage*8+8);i++)
            {
                Recipe recipe=recipes[i];
                if(GUILayout.Button(recipe.name+" · "+recipe.kind+(creative?" · 무료":" · "+recipe.cost),GUILayout.Height(48)))Craft(recipe);
            }
            GUILayout.EndScrollView();
        }
        else if(panel==Panel.Spawner)
        {
            if(species.Count==0){GUILayout.Label("소환 가능한 몬스터가 없어.");}
            else
            {
                GUILayout.Label("몬스터 선택: "+species[selectedSpeciesIndex].name);
                GUILayout.BeginHorizontal();
                if(GUILayout.Button("이전 목록",GUILayout.Height(42)))speciesPage=Mathf.Max(0,speciesPage-1);
                if(GUILayout.Button("다음 목록",GUILayout.Height(42)))speciesPage=Mathf.Min((species.Count-1)/6,speciesPage+1);
                GUILayout.EndHorizontal();
                for(int i=speciesPage*6;i<Mathf.Min(species.Count,speciesPage*6+6);i++)
                {
                    if(GUILayout.Button(species[i].name+" · "+species[i].mood,GUILayout.Height(40)))selectedSpeciesIndex=i;
                }
                GUILayout.Label("마릿수 1~30");
                spawnCountText=GUILayout.TextField(spawnCountText,4,GUILayout.Height(44));
                if(GUILayout.Button("소환",GUILayout.Height(52)))SpawnFromBlock();
            }
        }
        else if(panel==Panel.Aggro)
        {
            Monster monster=FindMonster(aggroMonsterId);
            if(monster!=null)
            {
                GUILayout.Label(monster.spec.name+" · 현재 "+(monster.attackPlayer?"플레이어 공격":"공격 안 함"));
                if(monster.spec.mood=="harmless")GUILayout.Label("무해한 몬스터는 공격할 수 없어.");
                else
                {
                    if(GUILayout.Button("플레이어를 공격하지 않음",GUILayout.Height(50))){monster.attackPlayer=false;monster.opponentId=-1;panel=Panel.None;SaveCreative();}
                    if(GUILayout.Button("플레이어 공격",GUILayout.Height(50))){monster.attackPlayer=true;monster.opponentId=-1;panel=Panel.None;SaveCreative();}
                }
            }
        }
        if(GUILayout.Button("닫기",GUILayout.Height(46)))panel=Panel.None;
        GUILayout.EndArea();
    }
}
