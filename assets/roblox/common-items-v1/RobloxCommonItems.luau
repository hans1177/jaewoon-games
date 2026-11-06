-- 파일명: assets/roblox/common-items-v1/RobloxCommonItems.luau
-- 역할: Roblox 공용 내부 아이템 비주얼 40종과 동일 모델 기반 Viewport UI 아이콘 생성
-- 원칙: 순수 표현 자산만 제공한다. 데미지/회복량/가격/세이브/네트워크 권한은 소유하지 않는다.

local RobloxCommonItems = {}

local QUALITY_LEVEL = table.freeze({
	far = 1,
	mid = 2,
	near = 3,
})

local function c(r, g, b)
	return Color3.fromRGB(r, g, b)
end

local Catalog = table.freeze({
	HEALING_POTION = table.freeze({
		id = "HEALING_POTION",
		name = "회복 포션",
		familyRootId = "POTION_BOTTLE",
		family = "PROP",
		subfamily = "ITEM",
		itemRole = "CONSUMABLE",
		silhouette = "ROUND_BOTTLE_SHOULDER_CORK",
		cameraRole = "HANDHELD_SMALL",
		palette = table.freeze({
			glass = c(196, 219, 220),
			liquid = c(205, 64, 76),
			dark = c(51, 39, 36),
			accent = c(244, 207, 118),
			label = c(227, 220, 197),
		}),
	}),
	MANA_CRYSTAL = table.freeze({
		id = "MANA_CRYSTAL",
		name = "마력 수정",
		familyRootId = "CRYSTAL_CLUSTER",
		family = "PROP",
		subfamily = "RESOURCE",
		itemRole = "RESOURCE",
		silhouette = "ASYMMETRIC_FACETED_CLUSTER",
		cameraRole = "HANDHELD_SMALL",
		palette = table.freeze({
			core = c(92, 156, 255),
			mid = c(115, 210, 255),
			glow = c(159, 235, 255),
			base = c(48, 58, 75),
		}),
	}),
	IRON_INGOT = table.freeze({
		id = "IRON_INGOT",
		name = "철괴",
		familyRootId = "METAL_INGOT",
		family = "PROP",
		subfamily = "RESOURCE",
		itemRole = "RESOURCE",
		silhouette = "TAPERED_STACKED_INGOT",
		cameraRole = "HANDHELD_SMALL",
		palette = table.freeze({
			metal = c(115, 124, 132),
			edge = c(164, 172, 179),
			dark = c(62, 68, 73),
		}),
	}),
	GOLD_INGOT = table.freeze({
		id = "GOLD_INGOT",
		name = "금괴",
		familyRootId = "METAL_INGOT",
		family = "PROP",
		subfamily = "RESOURCE",
		itemRole = "RESOURCE",
		silhouette = "TAPERED_STACKED_INGOT",
		cameraRole = "HANDHELD_SMALL",
		palette = table.freeze({
			metal = c(214, 161, 48),
			edge = c(255, 219, 105),
			dark = c(126, 84, 24),
		}),
	}),
	WOOD_BUNDLE = table.freeze({
		id = "WOOD_BUNDLE",
		name = "나무 묶음",
		familyRootId = "RESOURCE_BUNDLE",
		family = "PROP",
		subfamily = "RESOURCE",
		itemRole = "RESOURCE",
		silhouette = "THREE_LOG_BUNDLE_WITH_BINDINGS",
		cameraRole = "HANDHELD_MEDIUM",
		palette = table.freeze({
			bark = c(89, 62, 43),
			cut = c(183, 139, 92),
			band = c(91, 92, 80),
		}),
	}),
	STONE_CHUNK = table.freeze({
		id = "STONE_CHUNK",
		name = "돌 덩이",
		familyRootId = "STONE_RESOURCE",
		family = "PROP",
		subfamily = "RESOURCE",
		itemRole = "RESOURCE",
		silhouette = "ASYMMETRIC_THREE_MASS_ROCK",
		cameraRole = "HANDHELD_SMALL",
		palette = table.freeze({
			stone = c(105, 112, 113),
			mid = c(130, 137, 136),
			dark = c(68, 74, 76),
			moss = c(74, 97, 64),
		}),
	}),
	RELIC_KEY = table.freeze({
		id = "RELIC_KEY",
		name = "유물 열쇠",
		familyRootId = "RELIC_KEY",
		family = "PROP",
		subfamily = "ITEM",
		itemRole = "KEY_ITEM",
		silhouette = "RING_SHAFT_ORNATE_BIT",
		cameraRole = "HANDHELD_SMALL",
		palette = table.freeze({
			metal = c(158, 119, 61),
			edge = c(214, 181, 105),
			dark = c(71, 54, 41),
			gem = c(95, 183, 173),
		}),
	}),
	LANTERN = table.freeze({
		id = "LANTERN",
		name = "랜턴",
		familyRootId = "HAND_LANTERN",
		family = "PROP",
		subfamily = "ITEM",
		itemRole = "UTILITY",
		silhouette = "CAGED_GLASS_LANTERN_HANDLE",
		cameraRole = "HANDHELD_MEDIUM",
		palette = table.freeze({
			metal = c(64, 67, 66),
			edge = c(127, 130, 123),
			glass = c(196, 218, 202),
			glow = c(255, 195, 95),
			dark = c(31, 33, 34),
		}),
	}),

	-- 고급 인벤토리/루팅/제작 공통 역할 확장
	MANA_POTION = table.freeze({
		id="MANA_POTION", name="마력 포션", familyRootId="POTION_BOTTLE", family="PROP", subfamily="ITEM", itemRole="CONSUMABLE",
		inventoryCategory="CONSUMABLE", stackProfile="STACKABLE_SMALL", rarityBand="COMMON_TO_RARE", silhouette="ROUND_BOTTLE_SHOULDER_CORK", cameraRole="HANDHELD_SMALL",
		palette=table.freeze({glass=c(190,218,226), liquid=c(72,126,222), dark=c(40,44,65), accent=c(126,177,255), label=c(221,226,239)}),
	}),
	ANTIDOTE = table.freeze({
		id="ANTIDOTE", name="해독제", familyRootId="POTION_BOTTLE", family="PROP", subfamily="ITEM", itemRole="CONSUMABLE",
		inventoryCategory="CONSUMABLE", stackProfile="STACKABLE_SMALL", rarityBand="COMMON_TO_RARE", silhouette="ROUND_BOTTLE_SHOULDER_CORK", cameraRole="HANDHELD_SMALL",
		palette=table.freeze({glass=c(196,221,205), liquid=c(76,170,105), dark=c(42,61,47), accent=c(158,216,128), label=c(229,231,201)}),
	}),
	STAMINA_TONIC = table.freeze({
		id="STAMINA_TONIC", name="활력 영약", familyRootId="POTION_BOTTLE", family="PROP", subfamily="ITEM", itemRole="CONSUMABLE",
		inventoryCategory="CONSUMABLE", stackProfile="STACKABLE_SMALL", rarityBand="COMMON_TO_EPIC", silhouette="ROUND_BOTTLE_SHOULDER_CORK", cameraRole="HANDHELD_SMALL",
		palette=table.freeze({glass=c(224,216,186), liquid=c(225,157,63), dark=c(72,49,35), accent=c(255,211,109), label=c(238,226,192)}),
	}),
	UPGRADE_SHARD = table.freeze({
		id="UPGRADE_SHARD", name="강화 파편", familyRootId="CRYSTAL_CLUSTER", family="PROP", subfamily="UPGRADE_MATERIAL", itemRole="UPGRADE_MATERIAL",
		inventoryCategory="MATERIAL", stackProfile="STACKABLE_LARGE", rarityBand="UNCOMMON_TO_LEGENDARY", silhouette="ASYMMETRIC_FACETED_CLUSTER", cameraRole="HANDHELD_SMALL",
		palette=table.freeze({core=c(179,123,255), mid=c(205,161,255), glow=c(235,207,255), base=c(66,49,80)}),
	}),
	TREASURE_GEM = table.freeze({
		id="TREASURE_GEM", name="보석", familyRootId="CRYSTAL_CLUSTER", family="PROP", subfamily="TREASURE", itemRole="TREASURE",
		inventoryCategory="TREASURE", stackProfile="STACKABLE_SMALL", rarityBand="RARE_TO_LEGENDARY", silhouette="FACETED_TREASURE_CLUSTER", cameraRole="HANDHELD_SMALL",
		palette=table.freeze({core=c(50,190,170), mid=c(95,230,207), glow=c(184,255,238), base=c(41,70,68)}),
	}),
	SILVER_INGOT = table.freeze({
		id="SILVER_INGOT", name="은괴", familyRootId="METAL_INGOT", family="PROP", subfamily="RESOURCE", itemRole="RESOURCE",
		inventoryCategory="MATERIAL", stackProfile="STACKABLE_LARGE", rarityBand="COMMON_TO_RARE", silhouette="TAPERED_STACKED_INGOT", cameraRole="HANDHELD_SMALL",
		palette=table.freeze({metal=c(155,166,178), edge=c(222,230,238), dark=c(79,87,97)}),
	}),
	CLOTH_ROLL = table.freeze({
		id="CLOTH_ROLL", name="천 두루마리", familyRootId="CRAFT_ROLL", family="PROP", subfamily="CRAFT_MATERIAL", itemRole="CRAFT_MATERIAL",
		inventoryCategory="MATERIAL", stackProfile="STACKABLE_MEDIUM", rarityBand="COMMON_TO_RARE", silhouette="ROLLED_FABRIC_BAND", cameraRole="HANDHELD_SMALL",
		palette=table.freeze({cloth=c(138,126,112), light=c(186,173,153), band=c(83,68,57)}),
	}),
	HERB_BUNDLE = table.freeze({
		id="HERB_BUNDLE", name="약초 묶음", familyRootId="HERB_CLUSTER", family="PROP", subfamily="INGREDIENT", itemRole="INGREDIENT",
		inventoryCategory="INGREDIENT", stackProfile="STACKABLE_LARGE", rarityBand="COMMON_TO_RARE", silhouette="LEAF_STEM_BUNDLE", cameraRole="HANDHELD_SMALL",
		palette=table.freeze({stem=c(75,105,55), leaf=c(83,139,73), light=c(129,173,94), band=c(128,98,63)}),
	}),
	COOKED_MEAT = table.freeze({
		id="COOKED_MEAT", name="구운 고기", familyRootId="FOOD_PORTION", family="PROP", subfamily="FOOD", itemRole="FOOD",
		inventoryCategory="FOOD", stackProfile="STACKABLE_SMALL", rarityBand="COMMON_TO_RARE", silhouette="COOKED_PORTION_BONE", cameraRole="HANDHELD_SMALL",
		palette=table.freeze({meat=c(143,74,52), crust=c(89,54,42), fat=c(211,166,119), bone=c(208,194,165)}),
	}),
	QUEST_SCROLL = table.freeze({
		id="QUEST_SCROLL", name="의뢰 두루마리", familyRootId="DOCUMENT_SCROLL", family="PROP", subfamily="QUEST_ITEM", itemRole="QUEST_ITEM",
		inventoryCategory="QUEST", stackProfile="UNIQUE_OR_STACKABLE", rarityBand="QUEST", silhouette="ROLLED_PARCHMENT_SEAL", cameraRole="HANDHELD_SMALL",
		palette=table.freeze({paper=c(218,201,161), edge=c(166,137,96), seal=c(142,45,49), cord=c(106,76,48)}),
	}),
	LORE_BOOK = table.freeze({
		id="LORE_BOOK", name="기록서", familyRootId="LORE_BOOK", family="PROP", subfamily="LORE", itemRole="LORE",
		inventoryCategory="LORE", stackProfile="UNIQUE", rarityBand="COMMON_TO_UNIQUE", silhouette="HARD_COVER_BOOK_CLASP", cameraRole="HANDHELD_SMALL",
		palette=table.freeze({cover=c(72,59,49), spine=c(104,77,54), page=c(218,207,179), clasp=c(166,135,68)}),
	}),
	COIN_POUCH = table.freeze({
		id="COIN_POUCH", name="동전 주머니", familyRootId="POUCH", family="PROP", subfamily="CURRENCY_CONTAINER", itemRole="CURRENCY_CONTAINER",
		inventoryCategory="CURRENCY", stackProfile="CONTAINER", rarityBand="COMMON", silhouette="TIED_SOFT_POUCH", cameraRole="HANDHELD_SMALL",
		palette=table.freeze({cloth=c(116,83,58), light=c(159,117,78), cord=c(75,56,43), coin=c(210,164,62)}),
	}),
	ARROW_BUNDLE = table.freeze({
		id="ARROW_BUNDLE", name="화살 묶음", familyRootId="AMMO_BUNDLE", family="PROP", subfamily="AMMUNITION", itemRole="AMMUNITION",
		inventoryCategory="AMMO", stackProfile="STACKABLE_LARGE", rarityBand="COMMON_TO_RARE", silhouette="SHAFT_FLETCH_BUNDLE", cameraRole="HANDHELD_MEDIUM",
		palette=table.freeze({shaft=c(112,79,52), metal=c(151,157,158), feather=c(178,169,145), band=c(82,59,45)}),
	}),
	THROWING_BOMB = table.freeze({
		id="THROWING_BOMB", name="투척 폭탄", familyRootId="THROWABLE_BOMB", family="PROP", subfamily="THROWABLE", itemRole="THROWABLE",
		inventoryCategory="THROWABLE", stackProfile="STACKABLE_SMALL", rarityBand="UNCOMMON_TO_EPIC", silhouette="ROUND_BOMB_FUSE_CAGE", cameraRole="HANDHELD_SMALL",
		palette=table.freeze({shell=c(68,72,73), edge=c(128,132,130), fuse=c(111,83,54), accent=c(185,93,50)}),
	}),
	LOCKPICK_SET = table.freeze({
		id="LOCKPICK_SET", name="자물쇠 도구", familyRootId="RELIC_KEY", family="PROP", subfamily="UTILITY", itemRole="UTILITY",
		inventoryCategory="UTILITY", stackProfile="STACKABLE_SMALL", rarityBand="COMMON_TO_RARE", silhouette="RING_PICK_TOOL_SET", cameraRole="HANDHELD_SMALL",
		palette=table.freeze({metal=c(128,132,133), edge=c(194,199,200), dark=c(62,60,58), gem=c(102,126,118)}),
	}),
	SIGNAL_LANTERN = table.freeze({
		id="SIGNAL_LANTERN", name="신호 랜턴", familyRootId="HAND_LANTERN", family="PROP", subfamily="UTILITY", itemRole="UTILITY",
		inventoryCategory="UTILITY", stackProfile="UNIQUE", rarityBand="UNCOMMON_TO_RARE", silhouette="CAGED_GLASS_LANTERN_HANDLE", cameraRole="HANDHELD_MEDIUM",
		palette=table.freeze({metal=c(67,70,72), edge=c(145,148,146), glass=c(198,223,230), glow=c(106,200,255), dark=c(31,35,39)}),
	}),

	GRAPPLING_KIT = table.freeze({id="GRAPPLING_KIT",name="갈고리 로프 키트",familyRootId="UTILITY_GRAPPLING",family="PROP",subfamily="UTILITY_GADGET",itemRole="UTILITY",inventoryCategory="UTILITY",stackProfile="UNIQUE",rarityBand="UNCOMMON_TO_EPIC",interactionFamily="TRAVERSAL_GRAPPLE",silhouette="HOOK_ROPE_REEL",cameraRole="HANDHELD_MEDIUM",palette=table.freeze({metal=c(101,109,113),edge=c(175,184,187),rope=c(124,91,60),dark=c(57,61,63),accent=c(170,126,61)})}),
	FIELD_SCANNER = table.freeze({id="FIELD_SCANNER",name="휴대 스캐너",familyRootId="UTILITY_SCANNER",family="PROP",subfamily="UTILITY_GADGET",itemRole="UTILITY",inventoryCategory="UTILITY",stackProfile="UNIQUE",rarityBand="UNCOMMON_TO_EPIC",interactionFamily="SCAN_INSPECT",silhouette="HANDHELD_SCANNER_SCREEN_SENSOR",cameraRole="HANDHELD_SMALL",palette=table.freeze({body=c(64,73,81),edge=c(127,143,154),screen=c(84,199,221),dark=c(31,37,42),accent=c(181,224,236)})}),
	BINOCULARS = table.freeze({id="BINOCULARS",name="쌍안경",familyRootId="UTILITY_OPTIC",family="PROP",subfamily="UTILITY_GADGET",itemRole="UTILITY",inventoryCategory="UTILITY",stackProfile="UNIQUE",rarityBand="COMMON_TO_RARE",interactionFamily="OBSERVE_ZOOM",silhouette="TWIN_OPTIC_BARRELS",cameraRole="HANDHELD_SMALL",palette=table.freeze({body=c(67,72,66),edge=c(128,133,124),glass=c(74,125,142),dark=c(34,37,34),accent=c(148,132,87)})}),
	COMPASS_TOOL = table.freeze({id="COMPASS_TOOL",name="탐험 나침반",familyRootId="UTILITY_COMPASS",family="PROP",subfamily="UTILITY_GADGET",itemRole="UTILITY",inventoryCategory="UTILITY",stackProfile="UNIQUE",rarityBand="COMMON_TO_RARE",interactionFamily="NAVIGATION",silhouette="ROUND_COMPASS_LID_NEEDLE",cameraRole="HANDHELD_SMALL",palette=table.freeze({metal=c(143,111,61),edge=c(213,177,100),face=c(218,211,183),dark=c(68,54,43),accent=c(157,55,52)})}),
	CHALK_MARKER_KIT = table.freeze({id="CHALK_MARKER_KIT",name="표식 키트",familyRootId="UTILITY_MARKER",family="PROP",subfamily="UTILITY_GADGET",itemRole="UTILITY",inventoryCategory="UTILITY",stackProfile="STACKABLE_SMALL",rarityBand="COMMON_TO_RARE",interactionFamily="WORLD_MARKER",silhouette="CHALK_STICKS_POUCH",cameraRole="HANDHELD_SMALL",palette=table.freeze({cloth=c(104,82,62),light=c(159,129,93),chalk=c(220,217,202),accent=c(185,82,67),dark=c(65,52,44)})}),
	CLIMBING_PITON_SET = table.freeze({id="CLIMBING_PITON_SET",name="등반 피톤 세트",familyRootId="UTILITY_CLIMB",family="PROP",subfamily="UTILITY_GADGET",itemRole="UTILITY",inventoryCategory="UTILITY",stackProfile="STACKABLE_SMALL",rarityBand="COMMON_TO_RARE",interactionFamily="CLIMB_ANCHOR",silhouette="METAL_PITONS_RING",cameraRole="HANDHELD_SMALL",palette=table.freeze({metal=c(118,124,127),edge=c(183,190,192),ring=c(90,94,96),strap=c(102,71,49),dark=c(57,61,63)})}),
	FISHING_ROD = table.freeze({id="FISHING_ROD",name="낚싯대",familyRootId="UTILITY_FISHING",family="PROP",subfamily="UTILITY_TOOL",itemRole="UTILITY",inventoryCategory="UTILITY",stackProfile="UNIQUE",rarityBand="COMMON_TO_RARE",interactionFamily="FISHING",silhouette="LONG_ROD_REEL_LINE",cameraRole="HANDHELD_MEDIUM",palette=table.freeze({rod=c(97,68,47),light=c(154,111,70),metal=c(111,117,120),line=c(211,207,188),accent=c(155,112,58)})}),
	SHOVEL_TOOL = table.freeze({id="SHOVEL_TOOL",name="삽",familyRootId="UTILITY_SHOVEL",family="PROP",subfamily="UTILITY_TOOL",itemRole="UTILITY",inventoryCategory="UTILITY",stackProfile="UNIQUE",rarityBand="COMMON_TO_RARE",interactionFamily="DIG",silhouette="LONG_HANDLE_SHOVEL_BLADE",cameraRole="HANDHELD_MEDIUM",palette=table.freeze({shaft=c(101,70,47),light=c(153,110,69),metal=c(111,118,121),edge=c(179,186,188),dark=c(58,61,62)})}),
	WATERING_CAN = table.freeze({id="WATERING_CAN",name="물뿌리개",familyRootId="UTILITY_WATERING",family="PROP",subfamily="UTILITY_TOOL",itemRole="UTILITY",inventoryCategory="UTILITY",stackProfile="UNIQUE",rarityBand="COMMON_TO_RARE",interactionFamily="WATER_PLANTS",silhouette="CAN_HANDLE_LONG_SPOUT",cameraRole="HANDHELD_MEDIUM",palette=table.freeze({metal=c(105,120,126),edge=c(164,180,184),dark=c(56,66,70),accent=c(86,151,179),handle=c(90,96,96)})}),
	FIELD_CAMERA = table.freeze({id="FIELD_CAMERA",name="휴대 카메라",familyRootId="UTILITY_CAMERA",family="PROP",subfamily="UTILITY_GADGET",itemRole="UTILITY",inventoryCategory="UTILITY",stackProfile="UNIQUE",rarityBand="UNCOMMON_TO_RARE",interactionFamily="PHOTO_RECORD",silhouette="BOX_CAMERA_LENS_GRIP",cameraRole="HANDHELD_SMALL",palette=table.freeze({body=c(54,58,61),edge=c(105,112,116),glass=c(80,125,145),dark=c(29,31,33),accent=c(164,123,62)})}),
	SIGNAL_MIRROR = table.freeze({id="SIGNAL_MIRROR",name="신호 거울",familyRootId="UTILITY_SIGNAL_MIRROR",family="PROP",subfamily="UTILITY_GADGET",itemRole="UTILITY",inventoryCategory="UTILITY",stackProfile="UNIQUE",rarityBand="COMMON_TO_RARE",interactionFamily="SIGNAL_REFLECT",silhouette="ROUND_MIRROR_HANDLE",cameraRole="HANDHELD_SMALL",palette=table.freeze({metal=c(125,133,136),edge=c(205,214,216),mirror=c(209,229,235),grip=c(91,66,48),dark=c(57,61,62)})}),
	ROPE_COIL = table.freeze({id="ROPE_COIL",name="로프 묶음",familyRootId="UTILITY_ROPE",family="PROP",subfamily="UTILITY_MATERIAL",itemRole="UTILITY",inventoryCategory="UTILITY",stackProfile="STACKABLE_SMALL",rarityBand="COMMON_TO_RARE",interactionFamily="ROPE_ATTACH",silhouette="COILED_ROPE_BIND",cameraRole="HANDHELD_SMALL",palette=table.freeze({rope=c(142,111,74),light=c(191,157,111),dark=c(87,67,50),band=c(76,59,47)})}),
	REPAIR_MULTITOOL = table.freeze({id="REPAIR_MULTITOOL",name="수리 멀티툴",familyRootId="UTILITY_REPAIR",family="PROP",subfamily="UTILITY_GADGET",itemRole="UTILITY",inventoryCategory="UTILITY",stackProfile="UNIQUE",rarityBand="UNCOMMON_TO_EPIC",interactionFamily="REPAIR",silhouette="FOLDING_MULTITOOL_HANDLE",cameraRole="HANDHELD_SMALL",palette=table.freeze({metal=c(118,125,128),edge=c(186,193,195),grip=c(73,80,82),accent=c(190,126,54),dark=c(48,52,54)})}),
	PORTABLE_BEACON = table.freeze({id="PORTABLE_BEACON",name="휴대 비콘",familyRootId="UTILITY_BEACON",family="PROP",subfamily="UTILITY_GADGET",itemRole="UTILITY",inventoryCategory="UTILITY",stackProfile="UNIQUE",rarityBand="UNCOMMON_TO_EPIC",interactionFamily="WAYPOINT_SIGNAL",silhouette="TRIPOD_BEACON_LIGHT",cameraRole="HANDHELD_MEDIUM",palette=table.freeze({body=c(67,75,80),edge=c(132,145,151),glow=c(95,204,237),dark=c(34,39,42),accent=c(196,142,61)})}),
	SPECIMEN_JAR = table.freeze({id="SPECIMEN_JAR",name="표본병",familyRootId="UTILITY_SPECIMEN",family="PROP",subfamily="UTILITY_GADGET",itemRole="UTILITY",inventoryCategory="UTILITY",stackProfile="STACKABLE_SMALL",rarityBand="COMMON_TO_RARE",interactionFamily="SPECIMEN_COLLECT",silhouette="GLASS_JAR_LID_LABEL",cameraRole="HANDHELD_SMALL",palette=table.freeze({glass=c(195,220,222),lid=c(95,101,102),label=c(219,209,179),accent=c(109,160,118),dark=c(51,56,57)})}),
	CAMP_KIT = table.freeze({id="CAMP_KIT",name="휴대 캠프 키트",familyRootId="UTILITY_CAMP",family="PROP",subfamily="UTILITY_GADGET",itemRole="UTILITY",inventoryCategory="UTILITY",stackProfile="UNIQUE",rarityBand="UNCOMMON_TO_RARE",interactionFamily="CAMP_DEPLOY",silhouette="ROLLED_BEDROLL_PACK_STRAPS",cameraRole="HANDHELD_MEDIUM",palette=table.freeze({cloth=c(106,91,72),light=c(157,137,105),strap=c(78,58,46),metal=c(110,113,109),accent=c(123,141,86)})}),
})

local function makePart(name, size, color, material, shape)
	local part = Instance.new("Part")
	part.Name = name
	part.Size = size
	part.Color = color
	part.Material = material or Enum.Material.SmoothPlastic
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	part.CanCollide = false
	part.CanTouch = false
	part.CanQuery = false
	part.CastShadow = true
	part.Massless = true
	if shape == "BALL" then
		part.Shape = Enum.PartType.Ball
	elseif shape == "CYLINDER" then
		part.Shape = Enum.PartType.Cylinder
	end
	return part
end

local function makeWedge(name, size, color, material)
	local part = Instance.new("WedgePart")
	part.Name = name
	part.Size = size
	part.Color = color
	part.Material = material or Enum.Material.SmoothPlastic
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	part.CanCollide = false
	part.CanTouch = false
	part.CanQuery = false
	part.CastShadow = true
	part.Massless = true
	return part
end

local function weld(root, part, localCFrame)
	part.CFrame = root.CFrame * localCFrame
	part.Parent = root.Parent
	local joint = Instance.new("WeldConstraint")
	joint.Name = part.Name .. "_Weld"
	joint.Part0 = root
	joint.Part1 = part
	joint.Parent = part
	return part
end

local function rootFor(id)
	local model = Instance.new("Model")
	model.Name = "CommonItem_" .. id
	model:SetAttribute("StudioAssetId", id)
	model:SetAttribute("StudioAssetPack", "roblox-common-items-v1")
	model:SetAttribute("StudioAssetFamily", "PROP")
	model:SetAttribute("CompanyCommonBase", true)
	model:SetAttribute("CompatibleGameScope", "ALL_ROBLOX_GAMES_WHEN_ROLE_STYLE_AND_PLATFORM_MATCH")
	model:SetAttribute("ThemeAdaptationRequiredPerGame", true)
	model:SetAttribute("SourceAssetLibrary", "company-asset-library.json")
	model:SetAttribute("ProductionVerified", false)
	model:SetAttribute("GameplayAuthority", false)

	local root = makePart("VisualRoot", Vector3.new(0.45, 0.45, 0.45), c(255, 255, 255), Enum.Material.SmoothPlastic)
	root.Transparency = 1
	root.CastShadow = false
	root.Massless = false
	root.Parent = model
	model.PrimaryPart = root
	return model, root
end

local function detail(level, needed)
	return level >= needed
end

local function rowWithPalette(row, override)
	if type(override) ~= "table" then
		return row
	end
	local palette = {}
	for key, value in pairs(row.palette or {}) do
		palette[key] = value
	end
	for key, value in pairs(override) do
		if palette[key] ~= nil and typeof(value) == "Color3" then
			palette[key] = value
		end
	end
	local clone = {}
	for key, value in pairs(row) do
		clone[key] = value
	end
	clone.palette = table.freeze(palette)
	return table.freeze(clone)
end

local function addBottle(model, root, row, level)
	local p = row.palette
	local liquid = weld(root, makePart("Liquid", Vector3.new(1.34, 1.55, 1.34), p.liquid, Enum.Material.Neon, "BALL"), CFrame.new(0, 0.70, 0))
	liquid.Transparency = 0.12

	local glass = weld(root, makePart("GlassBody", Vector3.new(1.55, 1.82, 1.55), p.glass, Enum.Material.Glass, "BALL"), CFrame.new(0, 0.74, 0))
	glass.Transparency = 0.45

	weld(root, makePart("BottleNeck", Vector3.new(0.67, 0.82, 0.67), p.glass, Enum.Material.Glass, "CYLINDER"), CFrame.new(0, 1.75, 0))
	weld(root, makePart("Cork", Vector3.new(0.70, 0.52, 0.70), p.dark, Enum.Material.Wood, "CYLINDER"), CFrame.new(0, 2.22, 0))
	weld(root, makePart("NeckBand", Vector3.new(0.86, 0.16, 0.86), p.accent, Enum.Material.Metal, "CYLINDER"), CFrame.new(0, 1.95, 0))

	if detail(level, 2) then
		weld(root, makePart("FrontLabel", Vector3.new(0.82, 0.58, 0.10), p.label, Enum.Material.Fabric), CFrame.new(0, 0.76, -0.75))
		weld(root, makePart("LabelMark", Vector3.new(0.36, 0.36, 0.06), p.liquid, Enum.Material.SmoothPlastic, "BALL"), CFrame.new(0, 0.76, -0.82))
	end
	if detail(level, 3) then
		for side = -1, 1, 2 do
			weld(root, makePart("ShoulderRing" .. side, Vector3.new(0.10, 0.54, 0.10), p.accent, Enum.Material.Metal, "CYLINDER"), CFrame.new(side * 0.55, 1.35, 0) * CFrame.Angles(0, 0, math.rad(18 * side)))
		end
	end
end

local function addCrystal(model, root, row, level)
	local p = row.palette
	weld(root, makePart("StoneBase", Vector3.new(1.65, 0.48, 1.28), p.base, Enum.Material.Slate), CFrame.new(0, 0.12, 0))
	local shards = {
		{0, 1.08, 0, 0.46, 2.10, 0.50, 0, 0, 8},
		{-0.50, 0.78, 0.12, 0.34, 1.42, 0.38, -8, 0, -18},
		{0.48, 0.72, -0.10, 0.30, 1.30, 0.34, 8, 0, 20},
	}
	for i, data in ipairs(shards) do
		local shard = makeWedge("CrystalShard" .. i, Vector3.new(data[4], data[5], data[6]), i == 1 and p.core or p.mid, Enum.Material.Neon)
		weld(root, shard, CFrame.new(data[1], data[2], data[3]) * CFrame.Angles(math.rad(data[7]), math.rad(data[8]), math.rad(data[9])))
	end
	if detail(level, 2) then
		for i, pos in ipairs({Vector3.new(-0.72, 0.40, -0.22), Vector3.new(0.68, 0.36, 0.24)}) do
			weld(root, makePart("CrystalChip" .. i, Vector3.new(0.30, 0.58, 0.30), p.glow, Enum.Material.Neon), CFrame.new(pos) * CFrame.Angles(0, 0, math.rad(i == 1 and -28 or 24)))
		end
	end
end

local function addIngot(model, root, row, level)
	local p = row.palette
	local base = weld(root, makePart("IngotBody", Vector3.new(2.15, 0.58, 1.18), p.metal, Enum.Material.Metal), CFrame.new(0, 0.42, 0))
	base:SetAttribute("MaterialVariantRole", "METAL_CORE")
	weld(root, makePart("IngotTop", Vector3.new(1.65, 0.16, 0.86), p.edge, Enum.Material.Metal), CFrame.new(0, 0.79, 0))
	for side = -1, 1, 2 do
		weld(root, makeWedge("IngotSlope" .. side, Vector3.new(0.46, 0.46, 1.02), p.metal, Enum.Material.Metal), CFrame.new(side * 0.84, 0.52, 0) * CFrame.Angles(0, side < 0 and math.rad(180) or 0, 0))
	end
	if detail(level, 3) then
		weld(root, makePart("StampPlate", Vector3.new(0.58, 0.06, 0.34), p.dark, Enum.Material.Metal), CFrame.new(0, 0.90, 0))
	end
end

local function addWood(model, root, row, level)
	local p = row.palette
	for i, offset in ipairs({Vector3.new(-0.48, 0.50, 0), Vector3.new(0.48, 0.50, 0), Vector3.new(0, 1.08, 0)}) do
		local log = weld(root, makePart("Log" .. i, Vector3.new(0.72, 2.65, 0.72), p.bark, Enum.Material.Wood, "CYLINDER"), CFrame.new(offset) * CFrame.Angles(0, 0, math.rad(90)))
		log:SetAttribute("EndGrainColor", tostring(p.cut))
		if detail(level, 2) then
			weld(root, makePart("CutFace" .. i, Vector3.new(0.76, 0.08, 0.76), p.cut, Enum.Material.Wood, "CYLINDER"), CFrame.new(offset + Vector3.new(-1.34, 0, 0)) * CFrame.Angles(0, 0, math.rad(90)))
		end
	end
	for _, x in ipairs({-0.68, 0.68}) do
		weld(root, makePart("Binding" .. tostring(x), Vector3.new(0.12, 2.45, 1.72), p.band, Enum.Material.Fabric), CFrame.new(x, 0.76, 0))
	end
end

local function addStone(model, root, row, level)
	local p = row.palette
	local rocks = {
		{Vector3.new(-0.40, 0.54, 0.05), Vector3.new(1.18, 0.92, 1.02), -8, 16, 8, p.stone},
		{Vector3.new(0.43, 0.62, -0.10), Vector3.new(1.06, 1.12, 0.92), 10, -18, -6, p.mid},
		{Vector3.new(0.00, 1.06, 0.28), Vector3.new(0.80, 0.86, 0.72), -14, 7, 18, p.dark},
	}
	for i, data in ipairs(rocks) do
		local rock = makePart("Rock" .. i, data[2], data[6], Enum.Material.Slate)
		weld(root, rock, CFrame.new(data[1]) * CFrame.Angles(math.rad(data[3]), math.rad(data[4]), math.rad(data[5])))
	end
	if detail(level, 3) then
		weld(root, makePart("MossPatch", Vector3.new(0.68, 0.10, 0.46), p.moss, Enum.Material.Grass), CFrame.new(-0.18, 1.52, 0.18) * CFrame.Angles(math.rad(8), 0, math.rad(-12)))
	end
end

local function addKey(model, root, row, level)
	local p = row.palette
	weld(root, makePart("Shaft", Vector3.new(0.20, 2.45, 0.20), p.metal, Enum.Material.Metal, "CYLINDER"), CFrame.new(0, 0.95, 0))
	weld(root, makePart("Collar", Vector3.new(0.42, 0.24, 0.42), p.edge, Enum.Material.Metal, "CYLINDER"), CFrame.new(0, 0.02, 0))
	for i = 0, 7 do
		local a = math.rad(i * 45)
		local ring = makePart("RingSegment" .. i, Vector3.new(0.15, 0.62, 0.15), p.edge, Enum.Material.Metal, "CYLINDER")
		weld(root, ring, CFrame.new(math.cos(a) * 0.64, 2.05 + math.sin(a) * 0.64, 0) * CFrame.Angles(0, 0, a + math.rad(90)))
	end
	weld(root, makePart("BitStem", Vector3.new(0.20, 0.68, 0.20), p.metal, Enum.Material.Metal), CFrame.new(0.26, -0.24, 0))
	weld(root, makePart("BitA", Vector3.new(0.58, 0.18, 0.28), p.edge, Enum.Material.Metal), CFrame.new(0.43, -0.55, 0))
	weld(root, makePart("BitB", Vector3.new(0.34, 0.18, 0.48), p.edge, Enum.Material.Metal), CFrame.new(0.26, -0.82, 0))
	if detail(level, 2) then
		local gem = weld(root, makePart("Gem", Vector3.new(0.34, 0.34, 0.34), p.gem, Enum.Material.Neon, "BALL"), CFrame.new(0, 2.05, -0.12))
		gem.Transparency = 0.08
	end
end

local function addLantern(model, root, row, level)
	local p = row.palette
	weld(root, makePart("Base", Vector3.new(1.42, 0.30, 1.42), p.metal, Enum.Material.Metal), CFrame.new(0, 0.15, 0))
	weld(root, makePart("Glass", Vector3.new(1.15, 1.58, 1.15), p.glass, Enum.Material.Glass), CFrame.new(0, 1.08, 0))
	weld(root, makePart("GlowCore", Vector3.new(0.56, 0.92, 0.56), p.glow, Enum.Material.Neon), CFrame.new(0, 1.04, 0))
	weld(root, makePart("Top", Vector3.new(1.36, 0.28, 1.36), p.metal, Enum.Material.Metal), CFrame.new(0, 1.94, 0))
	for sx = -1, 1, 2 do
		for sz = -1, 1, 2 do
			weld(root, makePart("Cage" .. sx .. "_" .. sz, Vector3.new(0.12, 1.72, 0.12), p.edge, Enum.Material.Metal), CFrame.new(sx * 0.55, 1.08, sz * 0.55))
		end
	end
	for i = 0, 6 do
		local a = math.pi * i / 6
		local segment = makePart("Handle" .. i, Vector3.new(0.12, 0.72, 0.12), p.dark, Enum.Material.Metal, "CYLINDER")
		weld(root, segment, CFrame.new(math.cos(a) * 0.72, 2.42 + math.sin(a) * 0.72, 0) * CFrame.Angles(0, 0, a + math.rad(90)))
	end
	if detail(level, 3) then
		weld(root, makePart("VentCap", Vector3.new(0.72, 0.32, 0.72), p.edge, Enum.Material.Metal, "CYLINDER"), CFrame.new(0, 2.14, 0))
	end
end


local function addRoll(model, root, row, level)
	local p=row.palette
	local body=weld(root,makePart("Roll",Vector3.new(1.25,2.15,1.25),p.cloth,Enum.Material.Fabric,"CYLINDER"),CFrame.Angles(0,0,math.rad(90)))
	weld(root,makePart("Band",Vector3.new(1.38,0.25,1.38),p.band,Enum.Material.Fabric,"CYLINDER"),CFrame.Angles(0,0,math.rad(90)))
	if detail(level,2) then weld(root,makePart("Inner",Vector3.new(0.70,2.18,0.70),p.light,Enum.Material.Fabric,"CYLINDER"),CFrame.Angles(0,0,math.rad(90))) end
end

local function addHerb(model, root, row, level)
	local p=row.palette
	for i=-2,2 do
		local stem=weld(root,makePart("Stem"..i,Vector3.new(0.10,1.90,0.10),p.stem,Enum.Material.Grass,"CYLINDER"),CFrame.new(i*0.18,0.15,0)*CFrame.Angles(0,0,math.rad(i*6)))
		if detail(level,2) then
			weld(root,makePart("Leaf"..i,Vector3.new(0.48,0.18,0.72),i%2==0 and p.light or p.leaf,Enum.Material.Grass),CFrame.new(i*0.18,0.50,-0.18)*CFrame.Angles(0,math.rad(i*18),math.rad(25)))
		end
	end
	weld(root,makePart("Tie",Vector3.new(1.10,0.22,0.55),p.band,Enum.Material.Fabric),CFrame.new(0,-0.45,0))
end

local function addFood(model, root, row, level)
	local p=row.palette
	weld(root,makePart("Meat",Vector3.new(1.65,0.95,1.10),p.meat,Enum.Material.SmoothPlastic,"BALL"),CFrame.new(0,0.10,0))
	weld(root,makePart("Bone",Vector3.new(0.32,1.85,0.32),p.bone,Enum.Material.SmoothPlastic,"CYLINDER"),CFrame.new(0.80,-0.10,0)*CFrame.Angles(0,0,math.rad(70)))
	if detail(level,2) then weld(root,makePart("Crust",Vector3.new(1.35,0.18,0.86),p.crust,Enum.Material.SmoothPlastic),CFrame.new(-0.10,-0.35,-0.32)) end
	if detail(level,3) then weld(root,makePart("Fat",Vector3.new(0.62,0.18,0.42),p.fat,Enum.Material.SmoothPlastic),CFrame.new(-0.25,0.48,-0.18)) end
end

local function addScroll(model, root, row, level)
	local p=row.palette
	weld(root,makePart("Paper",Vector3.new(2.15,0.72,1.02),p.paper,Enum.Material.SmoothPlastic,"CYLINDER"),CFrame.Angles(0,0,math.rad(90)))
	for _,x in ipairs({-0.86,0.86}) do weld(root,makePart("Edge"..x,Vector3.new(0.18,0.92,1.12),p.edge,Enum.Material.Wood,"CYLINDER"),CFrame.new(x,0,0)*CFrame.Angles(0,0,math.rad(90))) end
	weld(root,makePart("Cord",Vector3.new(0.22,0.92,1.14),p.cord,Enum.Material.Fabric,"CYLINDER"),CFrame.Angles(0,0,math.rad(90)))
	if detail(level,2) then weld(root,makePart("Seal",Vector3.new(0.42,0.18,0.42),p.seal,Enum.Material.SmoothPlastic,"CYLINDER"),CFrame.new(0,-0.52,0)*CFrame.Angles(math.rad(90),0,0)) end
end

local function addBook(model, root, row, level)
	local p=row.palette
	weld(root,makePart("Pages",Vector3.new(1.75,0.48,2.35),p.page,Enum.Material.SmoothPlastic),CFrame.new(0,0,0))
	weld(root,makePart("CoverTop",Vector3.new(1.95,0.16,2.55),p.cover,Enum.Material.Fabric),CFrame.new(0,0.34,0))
	weld(root,makePart("CoverBottom",Vector3.new(1.95,0.16,2.55),p.cover,Enum.Material.Fabric),CFrame.new(0,-0.34,0))
	weld(root,makePart("Spine",Vector3.new(0.22,0.82,2.58),p.spine,Enum.Material.Fabric),CFrame.new(-0.96,0,0))
	if detail(level,2) then weld(root,makePart("Clasp",Vector3.new(0.30,0.20,0.82),p.clasp,Enum.Material.Metal),CFrame.new(0.98,0,-0.25)) end
end

local function addPouch(model, root, row, level)
	local p=row.palette
	weld(root,makePart("Bag",Vector3.new(1.55,1.35,1.20),p.cloth,Enum.Material.Fabric,"BALL"),CFrame.new(0,-0.05,0))
	weld(root,makePart("Neck",Vector3.new(0.85,0.45,0.85),p.light,Enum.Material.Fabric,"CYLINDER"),CFrame.new(0,0.72,0))
	weld(root,makePart("Cord",Vector3.new(1.02,0.16,1.02),p.cord,Enum.Material.Fabric,"CYLINDER"),CFrame.new(0,0.64,0))
	if detail(level,2) then
		for i=-1,1 do weld(root,makePart("Coin"..i,Vector3.new(0.34,0.12,0.34),p.coin,Enum.Material.Metal,"CYLINDER"),CFrame.new(i*0.30,0.96,0)*CFrame.Angles(math.rad(90),0,0)) end
	end
end

local function addAmmo(model, root, row, level)
	local p=row.palette
	for i=-2,2 do
		local x=i*0.20
		weld(root,makePart("Shaft"..i,Vector3.new(0.10,2.70,0.10),p.shaft,Enum.Material.Wood,"CYLINDER"),CFrame.new(x,0,0))
		weld(root,makePart("Head"..i,Vector3.new(0.20,0.38,0.20),p.metal,Enum.Material.Metal),CFrame.new(x,1.54,0))
		if detail(level,2) then weld(root,makePart("Fletch"..i,Vector3.new(0.30,0.42,0.08),p.feather,Enum.Material.Fabric),CFrame.new(x,-1.40,0)) end
	end
	weld(root,makePart("Band",Vector3.new(1.25,0.22,0.55),p.band,Enum.Material.Fabric),CFrame.new(0,-0.35,0))
end

local function addBomb(model, root, row, level)
	local p=row.palette
	weld(root,makePart("Shell",Vector3.new(1.55,1.55,1.55),p.shell,Enum.Material.Metal,"BALL"),CFrame.new(0,0,0))
	weld(root,makePart("Collar",Vector3.new(0.62,0.30,0.62),p.edge,Enum.Material.Metal,"CYLINDER"),CFrame.new(0,0.78,0))
	weld(root,makePart("Fuse",Vector3.new(0.14,1.10,0.14),p.fuse,Enum.Material.Fabric,"CYLINDER"),CFrame.new(0.18,1.25,0)*CFrame.Angles(0,0,math.rad(-18)))
	if detail(level,2) then weld(root,makePart("WarningBand",Vector3.new(1.62,0.20,1.62),p.accent,Enum.Material.SmoothPlastic,"CYLINDER"),CFrame.new(0,0.12,0)) end
end


local function addUtilityGadget(model,root,row,level)
	local p=row.palette
	local id=row.id
	if id=="GRAPPLING_KIT" then
		weld(root,makePart("Reel",Vector3.new(1.55,0.72,1.55),p.dark,Enum.Material.Metal,"CYLINDER"),CFrame.new(0,0,0)*CFrame.Angles(0,0,math.rad(90)))
		weld(root,makePart("Rope",Vector3.new(1.15,0.52,1.15),p.rope,Enum.Material.Fabric,"CYLINDER"),CFrame.new(0,0,0)*CFrame.Angles(0,0,math.rad(90)))
		for _,x in ipairs({-0.48,0.48}) do weld(root,wedge("Hook"..x,Vector3.new(0.35,0.85,0.22),p.metal,Enum.Material.Metal),CFrame.new(x,0.82,0)*CFrame.Angles(0,0,math.rad(x<0 and -35 or 35))) end
	elseif id=="FIELD_SCANNER" then
		weld(root,makePart("Body",Vector3.new(1.55,2.15,0.55),p.body,Enum.Material.SmoothPlastic),CFrame.new())
		weld(root,makePart("Screen",Vector3.new(1.18,0.78,0.08),p.screen,Enum.Material.Neon),CFrame.new(0,0.28,-0.32))
		weld(root,makePart("Sensor",Vector3.new(0.40,0.40,0.28),p.accent,Enum.Material.Neon,"BALL"),CFrame.new(0,1.24,0))
	elseif id=="BINOCULARS" then
		for _,x in ipairs({-0.48,0.48}) do
			weld(root,makePart("Barrel"..x,Vector3.new(0.62,1.75,0.62),p.body,Enum.Material.SmoothPlastic,"CYLINDER"),CFrame.new(x,0,0)*CFrame.Angles(math.rad(90),0,0))
			weld(root,makePart("Lens"..x,Vector3.new(0.48,0.12,0.48),p.glass,Enum.Material.Glass,"CYLINDER"),CFrame.new(x,0,-0.92)*CFrame.Angles(math.rad(90),0,0))
		end
		weld(root,makePart("Bridge",Vector3.new(0.62,0.32,0.42),p.edge,Enum.Material.Metal),CFrame.new())
	elseif id=="COMPASS_TOOL" then
		weld(root,makePart("Case",Vector3.new(1.75,0.32,1.75),p.metal,Enum.Material.Metal,"CYLINDER"),CFrame.new()*CFrame.Angles(math.rad(90),0,0))
		weld(root,makePart("Face",Vector3.new(1.42,0.08,1.42),p.face,Enum.Material.Glass,"CYLINDER"),CFrame.new(0,0.18,0)*CFrame.Angles(math.rad(90),0,0))
		weld(root,makePart("Needle",Vector3.new(0.12,0.08,1.05),p.accent,Enum.Material.Neon),CFrame.new(0,0.25,0))
	elseif id=="CHALK_MARKER_KIT" then
		weld(root,makePart("Pouch",Vector3.new(1.55,1.20,0.85),p.cloth,Enum.Material.Fabric),CFrame.new(0,-0.1,0))
		for i=-1,1 do weld(root,makePart("Chalk"..i,Vector3.new(0.24,1.15,0.24),i==0 and p.accent or p.chalk,Enum.Material.SmoothPlastic,"CYLINDER"),CFrame.new(i*0.38,0.65,-0.20)) end
	elseif id=="CLIMBING_PITON_SET" then
		for i=-1,1 do weld(root,wedge("Piton"..i,Vector3.new(0.28,1.55,0.22),p.metal,Enum.Material.Metal),CFrame.new(i*0.42,0,0)) end
		weld(root,makePart("Ring",Vector3.new(1.35,0.16,1.35),p.ring,Enum.Material.Metal,"CYLINDER"),CFrame.new(0,-0.55,0))
	elseif id=="FISHING_ROD" then
		weld(root,makePart("Rod",Vector3.new(0.20,5.2,0.20),p.rod,Enum.Material.Wood,"CYLINDER"),CFrame.new(0,0,0)*CFrame.Angles(0,0,math.rad(-6)))
		weld(root,makePart("Reel",Vector3.new(0.72,0.46,0.72),p.metal,Enum.Material.Metal,"CYLINDER"),CFrame.new(0.32,-1.4,0)*CFrame.Angles(0,0,math.rad(90)))
		weld(root,makePart("Line",Vector3.new(0.04,3.5,0.04),p.line,Enum.Material.Fabric,"CYLINDER"),CFrame.new(0.30,1.9,0))
	elseif id=="SHOVEL_TOOL" then
		weld(root,makePart("Shaft",Vector3.new(0.28,4.6,0.28),p.shaft,Enum.Material.Wood,"CYLINDER"),CFrame.new(0,0,0))
		weld(root,wedge("Blade",Vector3.new(1.35,1.55,0.32),p.metal,Enum.Material.Metal),CFrame.new(0,-2.85,0)*CFrame.Angles(math.rad(180),0,0))
	elseif id=="WATERING_CAN" then
		weld(root,makePart("Can",Vector3.new(1.75,1.35,1.45),p.metal,Enum.Material.Metal),CFrame.new())
		weld(root,makePart("Spout",Vector3.new(0.28,2.8,0.28),p.edge,Enum.Material.Metal,"CYLINDER"),CFrame.new(1.55,0.15,0)*CFrame.Angles(0,0,math.rad(62)))
		weld(root,makePart("Rose",Vector3.new(0.72,0.22,0.72),p.accent,Enum.Material.Metal,"CYLINDER"),CFrame.new(2.75,0.75,0)*CFrame.Angles(0,0,math.rad(90)))
	elseif id=="FIELD_CAMERA" then
		weld(root,makePart("Body",Vector3.new(1.85,1.30,0.85),p.body,Enum.Material.SmoothPlastic),CFrame.new())
		weld(root,makePart("Lens",Vector3.new(0.88,0.62,0.88),p.edge,Enum.Material.Metal,"CYLINDER"),CFrame.new(0,0,-0.65)*CFrame.Angles(math.rad(90),0,0))
		weld(root,makePart("Glass",Vector3.new(0.62,0.12,0.62),p.glass,Enum.Material.Glass,"CYLINDER"),CFrame.new(0,0,-1.00)*CFrame.Angles(math.rad(90),0,0))
	elseif id=="SIGNAL_MIRROR" then
		weld(root,makePart("Mirror",Vector3.new(1.55,0.14,1.55),p.mirror,Enum.Material.Glass,"CYLINDER"),CFrame.new()*CFrame.Angles(math.rad(90),0,0))
		weld(root,makePart("Rim",Vector3.new(1.78,0.18,1.78),p.metal,Enum.Material.Metal,"CYLINDER"),CFrame.new(0,-0.03,0)*CFrame.Angles(math.rad(90),0,0))
		weld(root,makePart("Grip",Vector3.new(0.30,1.35,0.30),p.grip,Enum.Material.Wood,"CYLINDER"),CFrame.new(0,-1.2,0))
	elseif id=="ROPE_COIL" then
		for i=1,3 do weld(root,makePart("Coil"..i,Vector3.new(1.55+i*0.08,0.20,1.55+i*0.08),i==2 and p.light or p.rope,Enum.Material.Fabric,"CYLINDER"),CFrame.new(0,(i-2)*0.22,0)) end
		weld(root,makePart("Band",Vector3.new(0.32,0.88,1.85),p.band,Enum.Material.Fabric),CFrame.new())
	elseif id=="REPAIR_MULTITOOL" then
		weld(root,makePart("Handle",Vector3.new(0.62,2.05,0.52),p.grip,Enum.Material.SmoothPlastic),CFrame.new())
		for _,x in ipairs({-0.42,0.42}) do weld(root,wedge("Tool"..x,Vector3.new(0.25,1.25,0.18),p.metal,Enum.Material.Metal),CFrame.new(x,0.85,0)*CFrame.Angles(0,0,math.rad(x<0 and -28 or 28))) end
	elseif id=="PORTABLE_BEACON" then
		weld(root,makePart("Body",Vector3.new(1.15,1.75,1.15),p.body,Enum.Material.Metal),CFrame.new(0,0.65,0))
		local glow=weld(root,makePart("Beacon",Vector3.new(0.72,0.72,0.72),p.glow,Enum.Material.Neon,"BALL"),CFrame.new(0,1.85,0));glow.Transparency=0.08
		for _,x in ipairs({-0.72,0.72}) do weld(root,makePart("Leg"..x,Vector3.new(0.16,1.35,0.16),p.edge,Enum.Material.Metal,"CYLINDER"),CFrame.new(x,-0.45,0)*CFrame.Angles(0,0,math.rad(x<0 and -18 or 18))) end
	elseif id=="SPECIMEN_JAR" then
		local glass=weld(root,makePart("Jar",Vector3.new(1.25,1.70,1.25),p.glass,Enum.Material.Glass,"CYLINDER"),CFrame.new());glass.Transparency=0.38
		weld(root,makePart("Lid",Vector3.new(1.32,0.24,1.32),p.lid,Enum.Material.Metal,"CYLINDER"),CFrame.new(0,0.92,0))
		weld(root,makePart("Label",Vector3.new(0.78,0.48,0.06),p.label,Enum.Material.SmoothPlastic),CFrame.new(0,0,-0.66))
	elseif id=="CAMP_KIT" then
		weld(root,makePart("Roll",Vector3.new(1.45,2.65,1.45),p.cloth,Enum.Material.Fabric,"CYLINDER"),CFrame.new()*CFrame.Angles(0,0,math.rad(90)))
		for _,x in ipairs({-0.48,0.48}) do weld(root,makePart("Strap"..x,Vector3.new(0.22,1.55,1.62),p.strap,Enum.Material.Fabric),CFrame.new(x,0,0)) end
		if detail(level,2) then weld(root,makePart("Pack",Vector3.new(1.65,1.25,0.75),p.light,Enum.Material.Fabric),CFrame.new(0,-0.95,0)) end
	end
end

local BUILDERS = table.freeze({
	HEALING_POTION = addBottle,
	MANA_CRYSTAL = addCrystal,
	IRON_INGOT = addIngot,
	GOLD_INGOT = addIngot,
	WOOD_BUNDLE = addWood,
	STONE_CHUNK = addStone,
	RELIC_KEY = addKey,
	LANTERN = addLantern,
	MANA_POTION = addBottle,
	ANTIDOTE = addBottle,
	STAMINA_TONIC = addBottle,
	UPGRADE_SHARD = addCrystal,
	TREASURE_GEM = addCrystal,
	SILVER_INGOT = addIngot,
	CLOTH_ROLL = addRoll,
	HERB_BUNDLE = addHerb,
	COOKED_MEAT = addFood,
	QUEST_SCROLL = addScroll,
	LORE_BOOK = addBook,
	COIN_POUCH = addPouch,
	ARROW_BUNDLE = addAmmo,
	THROWING_BOMB = addBomb,
	LOCKPICK_SET = addKey,
	SIGNAL_LANTERN = addLantern,
	GRAPPLING_KIT = addUtilityGadget,
	FIELD_SCANNER = addUtilityGadget,
	BINOCULARS = addUtilityGadget,
	COMPASS_TOOL = addUtilityGadget,
	CHALK_MARKER_KIT = addUtilityGadget,
	CLIMBING_PITON_SET = addUtilityGadget,
	FISHING_ROD = addUtilityGadget,
	SHOVEL_TOOL = addUtilityGadget,
	WATERING_CAN = addUtilityGadget,
	FIELD_CAMERA = addUtilityGadget,
	SIGNAL_MIRROR = addUtilityGadget,
	ROPE_COIL = addUtilityGadget,
	REPAIR_MULTITOOL = addUtilityGadget,
	PORTABLE_BEACON = addUtilityGadget,
	SPECIMEN_JAR = addUtilityGadget,
	CAMP_KIT = addUtilityGadget,
})

local function applyModelMetadata(model, row, quality)
	model:SetAttribute("StudioAssetFamilyRootId", row.familyRootId)
	model:SetAttribute("StudioAssetSubfamily", row.subfamily)
	model:SetAttribute("StudioAssetItemRole", row.itemRole)
	model:SetAttribute("StudioAssetSilhouette", row.silhouette)
	model:SetAttribute("StudioAssetCameraRole", row.cameraRole)
	model:SetAttribute("InventoryCategory", row.inventoryCategory or row.itemRole)
	model:SetAttribute("StackProfile", row.stackProfile or "GAME_DEFINED")
	model:SetAttribute("RarityBand", row.rarityBand or "GAME_DEFINED")
	model:SetAttribute("InteractionFamily", row.interactionFamily or "NONE")
	model:SetAttribute("OwnsTraversalAuthority", false)
	model:SetAttribute("OwnsScanningAuthority", false)
	model:SetAttribute("OwnsNavigationAuthority", false)
	model:SetAttribute("OwnsFarmingAuthority", false)
	model:SetAttribute("OwnsFishingAuthority", false)
	model:SetAttribute("StudioAssetQualityLevel", quality)
	model:SetAttribute("StudioAssetQualityTarget", 120)
	model:SetAttribute("RuntimeVerificationState", "PENDING_STUDIO")
end

function RobloxCommonItems.List()
	local result = {}
	for id, row in pairs(Catalog) do
		table.insert(result, table.freeze({
			id = id,
			name = row.name,
			familyRootId = row.familyRootId,
			family = row.family,
			subfamily = row.subfamily,
			itemRole = row.itemRole,
			inventoryCategory = row.inventoryCategory or row.itemRole,
			stackProfile = row.stackProfile or "GAME_DEFINED",
			rarityBand = row.rarityBand or "GAME_DEFINED",
			silhouette = row.silhouette,
			productionVerified = false,
		}))
	end
	table.sort(result, function(a, b)
		return a.id < b.id
	end)
	return table.freeze(result)
end

function RobloxCommonItems.Describe(id)
	local row = Catalog[string.upper(tostring(id or ""))]
	assert(row, "UNKNOWN_COMMON_ITEM: " .. tostring(id))
	return row
end

function RobloxCommonItems.Create(id, options)
	options = options or {}
	local key = string.upper(tostring(id or ""))
	local row = Catalog[key]
	local builder = BUILDERS[key]
	assert(row and builder, "UNKNOWN_COMMON_ITEM: " .. tostring(id))

	local quality = string.lower(tostring(options.quality or "mid"))
	local level = QUALITY_LEVEL[quality]
	assert(level, "INVALID_COMMON_ITEM_QUALITY: " .. tostring(quality))

	local styledRow = rowWithPalette(row, options.palette)
	local model, root = rootFor(key)
	builder(model, root, styledRow, level)
	applyModelMetadata(model, styledRow, quality)
	model:SetAttribute("PaletteAdapted", type(options.palette) == "table")

	local scale = math.clamp(tonumber(options.scale) or 1, 0.25, 4)
	if scale ~= 1 then
		model:ScaleTo(scale)
	end

	local anchored = options.anchored ~= false
	for _, descendant in ipairs(model:GetDescendants()) do
		if descendant:IsA("BasePart") then
			descendant.Anchored = anchored
			descendant.CanCollide = false
			descendant.CanTouch = false
			descendant.CanQuery = false
		end
	end

	model.Parent = options.parent
	local pivot = options.pivot
	if typeof(pivot) == "CFrame" then
		model:PivotTo(pivot)
	end
	return model
end

function RobloxCommonItems.CreateViewport(id, options)
	options = options or {}
	local frame = Instance.new("ViewportFrame")
	frame.Name = "CommonItemViewport_" .. string.upper(tostring(id or ""))
	frame.BackgroundTransparency = options.backgroundTransparency == nil and 1 or options.backgroundTransparency
	frame.Ambient = options.ambient or c(110, 118, 128)
	frame.LightColor = options.lightColor or c(255, 238, 214)
	frame.LightDirection = options.lightDirection or Vector3.new(-1, -1, -1)
	frame.Size = options.size or UDim2.fromScale(1, 1)

	local world = Instance.new("WorldModel")
	world.Name = "CommonItemWorld"
	world.Parent = frame

	local model = RobloxCommonItems.Create(id, {
		quality = options.quality or "near",
		palette = options.palette,
		anchored = true,
		parent = world,
	})

	local camera = Instance.new("Camera")
	camera.Name = "StudioItemCamera"
	camera.FieldOfView = tonumber(options.fieldOfView) or 34
	camera.Parent = frame
	frame.CurrentCamera = camera

	local boxCf, boxSize = model:GetBoundingBox()
	local maxSize = math.max(boxSize.X, boxSize.Y, boxSize.Z)
	local distance = math.max(3.2, maxSize * 2.35)
	local target = boxCf.Position + Vector3.new(0, boxSize.Y * 0.04, 0)
	local direction = (options.cameraDirection or Vector3.new(1.25, 0.75, 1.6)).Unit
	camera.CFrame = CFrame.lookAt(target + direction * distance, target)

	frame:SetAttribute("StudioAssetId", string.upper(tostring(id or "")))
	frame:SetAttribute("StudioAssetFamilyRootId", model:GetAttribute("StudioAssetFamilyRootId"))
	frame:SetAttribute("ProductionVerified", false)
	return frame, model
end

function RobloxCommonItems.Audit()
	local rows = RobloxCommonItems.List()
	local missing = {}
	for _, row in ipairs(rows) do
		if not BUILDERS[row.id] then
			table.insert(missing, row.id .. ":BUILDER")
		end
		if row.family ~= "PROP" then
			table.insert(missing, row.id .. ":FAMILY")
		end
		if not row.familyRootId or row.familyRootId == "" then
			table.insert(missing, row.id .. ":FAMILY_ROOT")
		end
	end
	return table.freeze({
		version = 3,
		packId = "roblox-common-items-v1",
		itemCount = #rows,
		expectedItemCount = 40,
		pass = #rows == 40 and #missing == 0,
		missing = table.freeze(missing),
		companyCommonBase = true,
		compatibleGameScope = "ALL_ROBLOX_GAMES_WHEN_ROLE_STYLE_AND_PLATFORM_MATCH",
		themeAdaptationRequiredPerGame = true,
		productionVerified = false,
		runtimeVerificationRequired = true,
		gameplayAuthority = false,
	})
end

return table.freeze(RobloxCommonItems)
