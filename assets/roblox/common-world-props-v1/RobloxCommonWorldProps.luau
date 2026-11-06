-- 파일명: assets/roblox/common-world-props-v1/RobloxCommonWorldProps.luau
-- 역할: 여러 Roblox 게임에서 재사용할 수 있는 회사 공용 월드·주거·정착지 소품 38종 생성
-- 원칙: 순수 표현 자산만 제공한다. 밸런스/경제/세이브/네트워크 권한은 소유하지 않는다.

local RobloxCommonWorldProps = {}

local QUALITY_LEVEL = table.freeze({
	far = 1,
	mid = 2,
	near = 3,
})

local function c(r, g, b)
	return Color3.fromRGB(r, g, b)
end

local Catalog = table.freeze({
	SIGNPOST = table.freeze({
		id = "SIGNPOST",
		name = "표지판",
		familyRootId = "WORLD_SIGN",
		family = "PROP",
		subfamily = "SIGNPOST",
		worldRole = "WAYFINDING",
		silhouette = "TALL_POST_WIDE_BOARD",
		palette = table.freeze({
			wood = c(101, 73, 49),
			woodLight = c(167, 123, 77),
			metal = c(73, 77, 74),
			mark = c(224, 205, 160),
		}),
	}),
	WOOD_FENCE = table.freeze({
		id = "WOOD_FENCE",
		name = "나무 울타리",
		familyRootId = "WORLD_FENCE",
		family = "PROP",
		subfamily = "FENCE",
		worldRole = "BOUNDARY",
		silhouette = "THREE_POST_TWO_RAIL",
		palette = table.freeze({
			wood = c(103, 75, 51),
			woodLight = c(154, 111, 70),
			metal = c(80, 82, 78),
		}),
	}),
	WALL_TORCH = table.freeze({
		id = "WALL_TORCH",
		name = "벽 횃불",
		familyRootId = "WORLD_LIGHT",
		family = "PROP",
		subfamily = "TORCH",
		worldRole = "LIGHTING_PROP",
		silhouette = "WALL_BRACKET_TORCH_FLAME",
		palette = table.freeze({
			wood = c(82, 58, 39),
			metal = c(68, 70, 70),
			flame = c(255, 174, 67),
			flameCore = c(255, 232, 144),
		}),
	}),
	WOOD_BARREL = table.freeze({
		id = "WOOD_BARREL",
		name = "나무통",
		familyRootId = "WORLD_CONTAINER",
		family = "PROP",
		subfamily = "BARREL",
		worldRole = "SET_DRESSING",
		silhouette = "ROUND_STAVE_BARREL_BANDS",
		palette = table.freeze({
			wood = c(112, 77, 47),
			woodLight = c(151, 105, 64),
			metal = c(64, 67, 67),
		}),
	}),
	BENCH = table.freeze({
		id = "BENCH",
		name = "벤치",
		familyRootId = "WORLD_FURNITURE",
		family = "PROP",
		subfamily = "BENCH",
		worldRole = "SEATING_PROP",
		silhouette = "SLATTED_SEAT_BACK_LEGS",
		palette = table.freeze({
			wood = c(120, 82, 52),
			woodLight = c(169, 119, 73),
			metal = c(72, 75, 75),
		}),
	}),
	TABLE = table.freeze({
		id = "TABLE",
		name = "테이블",
		familyRootId = "WORLD_FURNITURE",
		family = "PROP",
		subfamily = "TABLE",
		worldRole = "SURFACE_PROP",
		silhouette = "RECT_TOP_FOUR_LEGS_BRACES",
		palette = table.freeze({
			wood = c(111, 75, 48),
			woodLight = c(164, 115, 71),
			dark = c(70, 51, 38),
		}),
	}),
	MARKET_STALL = table.freeze({
		id = "MARKET_STALL",
		name = "시장 가판대",
		familyRootId = "WORLD_STALL",
		family = "PROP",
		subfamily = "MARKET_STALL",
		worldRole = "VENDOR_PROP",
		silhouette = "FOUR_POST_CANOPY_COUNTER",
		palette = table.freeze({
			wood = c(105, 71, 45),
			woodLight = c(163, 112, 67),
			cloth = c(179, 71, 65),
			clothLight = c(235, 192, 134),
			metal = c(72, 74, 73),
		}),
	}),
	STONE_WELL = table.freeze({
		id = "STONE_WELL",
		name = "돌우물",
		familyRootId = "WORLD_WELL",
		family = "PROP",
		subfamily = "WELL",
		worldRole = "LANDMARK_PROP",
		silhouette = "STONE_RING_POSTS_ROOF_BUCKET",
		palette = table.freeze({
			stone = c(105, 109, 107),
			stoneLight = c(139, 143, 139),
			wood = c(91, 65, 45),
			roof = c(112, 74, 51),
			rope = c(171, 145, 99),
			water = c(69, 139, 171),
		}),
	}),

	BED_SINGLE = table.freeze({
		id="BED_SINGLE",name="침대",familyRootId="WORLD_FURNITURE",family="PROP",subfamily="BED",worldRole="HOUSING_BED",propKind="BED",
		silhouette="BED_FRAME_MATTRESS_PILLOW",palette=table.freeze({wood=c(93,66,47),woodLight=c(139,101,67),cloth=c(154,139,120),clothLight=c(218,207,185),metal=c(115,113,106),accent=c(103,118,132)}),
	}),
	WARDROBE = table.freeze({
		id="WARDROBE",name="옷장",familyRootId="WORLD_FURNITURE",family="PROP",subfamily="WARDROBE",worldRole="HOUSING_STORAGE",propKind="WARDROBE",
		silhouette="TALL_DOUBLE_DOOR_CABINET",palette=table.freeze({wood=c(94,67,47),woodLight=c(135,96,62),cloth=c(126,112,91),clothLight=c(190,173,143),metal=c(148,119,68),accent=c(73,58,49)}),
	}),
	SHELF = table.freeze({
		id="SHELF",name="선반",familyRootId="WORLD_FURNITURE",family="PROP",subfamily="SHELF",worldRole="DISPLAY_STORAGE",propKind="SHELF",
		silhouette="OPEN_THREE_TIER_SHELF",palette=table.freeze({wood=c(101,72,49),woodLight=c(148,107,67),cloth=c(120,111,92),clothLight=c(185,169,139),metal=c(115,111,103),accent=c(77,60,48)}),
	}),
	WORKBENCH = table.freeze({
		id="WORKBENCH",name="작업대",familyRootId="WORLD_CRAFT_STATION",family="PROP",subfamily="WORKBENCH",worldRole="CRAFT_STATION",propKind="WORKBENCH",
		silhouette="HEAVY_BENCH_TOOL_BACKBOARD",palette=table.freeze({wood=c(101,70,46),woodLight=c(153,111,69),cloth=c(128,116,95),clothLight=c(191,175,144),metal=c(101,106,108),accent=c(169,126,62)}),
	}),
	CRAFT_TABLE = table.freeze({
		id="CRAFT_TABLE",name="제작 테이블",familyRootId="WORLD_CRAFT_STATION",family="PROP",subfamily="CRAFT_STATION",worldRole="CRAFT_STATION",propKind="CRAFT_TABLE",
		silhouette="CRAFT_SURFACE_TOOL_RACK",palette=table.freeze({wood=c(106,74,48),woodLight=c(158,115,73),cloth=c(131,117,93),clothLight=c(193,176,144),metal=c(109,114,115),accent=c(175,131,65)}),
	}),
	COOKING_HEARTH = table.freeze({
		id="COOKING_HEARTH",name="화덕",familyRootId="WORLD_COOKING",family="PROP",subfamily="COOKING",worldRole="COOKING_STATION",propKind="HEARTH",
		silhouette="STONE_HEARTH_POT_FIRE",palette=table.freeze({wood=c(91,66,48),woodLight=c(132,95,63),cloth=c(127,111,91),clothLight=c(188,170,139),metal=c(89,93,95),accent=c(234,129,55)}),
	}),
	STORAGE_CABINET = table.freeze({
		id="STORAGE_CABINET",name="수납장",familyRootId="WORLD_STORAGE",family="PROP",subfamily="STORAGE",worldRole="STORAGE",propKind="CABINET",
		silhouette="LOW_DOUBLE_DOOR_STORAGE",palette=table.freeze({wood=c(97,70,49),woodLight=c(146,103,67),cloth=c(121,108,88),clothLight=c(185,166,134),metal=c(140,115,68),accent=c(75,59,48)}),
	}),
	PLANTER_BOX = table.freeze({
		id="PLANTER_BOX",name="화분 상자",familyRootId="WORLD_GARDEN",family="PROP",subfamily="PLANTER",worldRole="FARMING_DECOR",propKind="PLANTER",
		silhouette="RECT_PLANTER_SOIL_PLANTS",palette=table.freeze({wood=c(99,71,48),woodLight=c(145,104,66),cloth=c(94,84,67),clothLight=c(158,142,109),metal=c(92,94,91),accent=c(82,133,69)}),
	}),
	CROP_PLOT = table.freeze({
		id="CROP_PLOT",name="재배 구획",familyRootId="WORLD_GARDEN",family="PROP",subfamily="CROP_PLOT",worldRole="FARMING_PLOT_VISUAL",propKind="CROP_PLOT",
		silhouette="RAISED_SOIL_PLOT_BORDER",palette=table.freeze({wood=c(92,66,46),woodLight=c(137,98,62),cloth=c(92,74,58),clothLight=c(146,118,88),metal=c(92,91,84),accent=c(77,123,64)}),
	}),
	ANIMAL_TROUGH = table.freeze({
		id="ANIMAL_TROUGH",name="먹이통",familyRootId="WORLD_ANIMAL_HOME",family="PROP",subfamily="ANIMAL_TROUGH",worldRole="ANIMAL_HOUSING_VISUAL",propKind="TROUGH",
		silhouette="LONG_TROUGH_LEGS",palette=table.freeze({wood=c(95,69,49),woodLight=c(144,105,68),cloth=c(119,107,88),clothLight=c(176,158,127),metal=c(104,105,101),accent=c(129,106,72)}),
	}),
	FLOOR_LAMP = table.freeze({
		id="FLOOR_LAMP",name="스탠드 조명",familyRootId="WORLD_LIGHT",family="PROP",subfamily="LIGHT_SOURCE",worldRole="HOUSING_LIGHT",propKind="FLOOR_LAMP",
		silhouette="TALL_STAND_LANTERN",palette=table.freeze({wood=c(87,64,48),woodLight=c(128,94,61),cloth=c(136,121,100),clothLight=c(205,190,158),metal=c(75,78,79),accent=c(255,194,96)}),
	}),
	WALL_SWITCH = table.freeze({
		id="WALL_SWITCH",name="벽 스위치",familyRootId="WORLD_CONTROL",family="PROP",subfamily="INTERACTIVE_SWITCH",worldRole="INTERACTION_CONTROL_VISUAL",propKind="SWITCH",
		silhouette="PLATE_LEVER_SWITCH",palette=table.freeze({wood=c(84,69,56),woodLight=c(126,104,80),cloth=c(112,102,88),clothLight=c(167,151,126),metal=c(109,113,114),accent=c(184,137,64)}),
	}),
	LEVER_CONTROL = table.freeze({
		id="LEVER_CONTROL",name="레버",familyRootId="WORLD_CONTROL",family="PROP",subfamily="DOOR_CONTROL",worldRole="INTERACTION_CONTROL_VISUAL",propKind="LEVER",
		silhouette="BASE_LONG_LEVER_GRIP",palette=table.freeze({wood=c(90,65,47),woodLight=c(135,98,64),cloth=c(117,104,87),clothLight=c(176,158,128),metal=c(98,104,106),accent=c(171,126,62)}),
	}),
	NOTICE_BOARD = table.freeze({
		id="NOTICE_BOARD",name="게시판",familyRootId="WORLD_QUEST_PROP",family="PROP",subfamily="QUEST_PROP",worldRole="QUEST_DISPLAY",propKind="NOTICE",
		silhouette="BOARD_POST_NOTICES",palette=table.freeze({wood=c(101,72,48),woodLight=c(149,107,67),cloth=c(207,192,157),clothLight=c(233,221,190),metal=c(111,109,101),accent=c(147,57,55)}),
	}),
	RUG = table.freeze({
		id="RUG",name="러그",familyRootId="WORLD_DECOR",family="PROP",subfamily="DECORATION",worldRole="HOUSING_DECOR",propKind="RUG",
		silhouette="FLAT_PATTERNED_RUG",palette=table.freeze({wood=c(91,68,54),woodLight=c(132,99,75),cloth=c(112,70,67),clothLight=c(174,118,101),metal=c(108,101,92),accent=c(201,160,92)}),
	}),
	DECOR_STATUE = table.freeze({
		id="DECOR_STATUE",name="장식 조각상",familyRootId="WORLD_DECOR",family="PROP",subfamily="DECORATION",worldRole="HOUSING_DECOR",propKind="STATUE",
		silhouette="PEDESTAL_ABSTRACT_STATUE",palette=table.freeze({wood=c(101,97,88),woodLight=c(146,141,128),cloth=c(118,111,97),clothLight=c(178,168,146),metal=c(101,105,106),accent=c(167,135,76)}),
	}),
	WOOD_CART = table.freeze({
		id="WOOD_CART",name="나무 수레",familyRootId="WORLD_SETTLEMENT_PROP",family="PROP",subfamily="CART",worldRole="SETTLEMENT_TRANSPORT_VISUAL",propKind="CART",interactionRole="PUSH_OR_INSPECT",
		silhouette="TWO_WHEEL_CART",palette=table.freeze({wood=c(96,69,48),woodLight=c(148,107,69),cloth=c(137,112,88),clothLight=c(205,181,143),metal=c(91,96,98),accent=c(191,137,67)}),
	}),
	WOOD_CRATE = table.freeze({
		id="WOOD_CRATE",name="나무 상자",familyRootId="WORLD_CONTAINER",family="PROP",subfamily="CRATE",worldRole="CONTAINER_VISUAL",propKind="CRATE",interactionRole="OPEN_OR_CARRY",
		silhouette="REINFORCED_CRATE",palette=table.freeze({wood=c(96,69,48),woodLight=c(148,107,69),cloth=c(137,112,88),clothLight=c(205,181,143),metal=c(91,96,98),accent=c(191,137,67)}),
	}),
	TREASURE_CHEST = table.freeze({
		id="TREASURE_CHEST",name="보관 상자",familyRootId="WORLD_CONTAINER",family="PROP",subfamily="CHEST",worldRole="CONTAINER_VISUAL",propKind="CHEST",interactionRole="OPEN_OR_INSPECT",
		silhouette="LIDDED_CHEST",palette=table.freeze({wood=c(96,69,48),woodLight=c(148,107,69),cloth=c(137,112,88),clothLight=c(205,181,143),metal=c(91,96,98),accent=c(191,137,67)}),
	}),
	STREET_LANTERN = table.freeze({
		id="STREET_LANTERN",name="거리 조명",familyRootId="WORLD_LIGHT",family="PROP",subfamily="LIGHT_SOURCE",worldRole="SETTLEMENT_LIGHTING",propKind="STREET_LANTERN",interactionRole="TOGGLE_OR_INSPECT",
		silhouette="POST_LANTERN",palette=table.freeze({wood=c(96,69,48),woodLight=c(148,107,69),cloth=c(137,112,88),clothLight=c(205,181,143),metal=c(91,96,98),accent=c(191,137,67)}),
	}),
	LAUNDRY_LINE = table.freeze({
		id="LAUNDRY_LINE",name="빨랫줄",familyRootId="WORLD_SETTLEMENT_PROP",family="PROP",subfamily="LIFE_PROP",worldRole="SETTLEMENT_LIFE",propKind="LAUNDRY",interactionRole="INSPECT",
		silhouette="TWO_POST_LAUNDRY",palette=table.freeze({wood=c(96,69,48),woodLight=c(148,107,69),cloth=c(137,112,88),clothLight=c(205,181,143),metal=c(91,96,98),accent=c(191,137,67)}),
	}),
	SETTLEMENT_FLAG = table.freeze({
		id="SETTLEMENT_FLAG",name="정착지 깃발",familyRootId="WORLD_SETTLEMENT_PROP",family="PROP",subfamily="FLAG",worldRole="SETTLEMENT_IDENTITY",propKind="FLAG",interactionRole="INSPECT",
		silhouette="TALL_FLAG_POLE",palette=table.freeze({wood=c(96,69,48),woodLight=c(148,107,69),cloth=c(137,112,88),clothLight=c(205,181,143),metal=c(91,96,98),accent=c(191,137,67)}),
	}),
	CANVAS_TENT = table.freeze({
		id="CANVAS_TENT",name="천막",familyRootId="WORLD_SETTLEMENT_PROP",family="PROP",subfamily="TENT",worldRole="SHELTER_VISUAL",propKind="TENT",interactionRole="ENTER_OR_INSPECT",
		silhouette="RIDGE_TENT",palette=table.freeze({wood=c(96,69,48),woodLight=c(148,107,69),cloth=c(137,112,88),clothLight=c(205,181,143),metal=c(91,96,98),accent=c(191,137,67)}),
	}),
	FIREWOOD_STACK = table.freeze({
		id="FIREWOOD_STACK",name="장작 더미",familyRootId="WORLD_SETTLEMENT_PROP",family="PROP",subfamily="FIREWOOD",worldRole="LIFE_RESOURCE_DRESSING",propKind="FIREWOOD",interactionRole="GATHER_OR_INSPECT",
		silhouette="STACKED_LOGS",palette=table.freeze({wood=c(96,69,48),woodLight=c(148,107,69),cloth=c(137,112,88),clothLight=c(205,181,143),metal=c(91,96,98),accent=c(191,137,67)}),
	}),
	FARM_TOOL_RACK = table.freeze({
		id="FARM_TOOL_RACK",name="농기구 걸이",familyRootId="WORLD_FARM_PROP",family="PROP",subfamily="FARM_TOOL",worldRole="FARMING_DECOR",propKind="FARM_TOOL_RACK",interactionRole="USE_OR_INSPECT",
		silhouette="RACK_LONG_TOOLS",palette=table.freeze({wood=c(96,69,48),woodLight=c(148,107,69),cloth=c(137,112,88),clothLight=c(205,181,143),metal=c(91,96,98),accent=c(191,137,67)}),
	}),
	RUIN_DEBRIS = table.freeze({
		id="RUIN_DEBRIS",name="폐허 잔해",familyRootId="WORLD_RUIN_PROP",family="PROP",subfamily="RUIN_DEBRIS",worldRole="RUIN_DRESSING",propKind="RUIN_DEBRIS",interactionRole="INSPECT_OR_CLIMB",
		silhouette="BROKEN_STONE_CLUSTER",palette=table.freeze({wood=c(96,69,48),woodLight=c(148,107,69),cloth=c(137,112,88),clothLight=c(205,181,143),metal=c(91,96,98),accent=c(191,137,67)}),
	}),
	CONSTRUCTION_SCAFFOLD = table.freeze({
		id="CONSTRUCTION_SCAFFOLD",name="건축 발판",familyRootId="WORLD_BUILD_PROP",family="PROP",subfamily="CONSTRUCTION_TRACE",worldRole="BUILD_DRESSING",propKind="SCAFFOLD",interactionRole="CLIMB_OR_INSPECT",
		silhouette="TIMBER_SCAFFOLD",palette=table.freeze({wood=c(96,69,48),woodLight=c(148,107,69),cloth=c(137,112,88),clothLight=c(205,181,143),metal=c(91,96,98),accent=c(191,137,67)}),
	}),
	LORE_STONE = table.freeze({
		id="LORE_STONE",name="기록 석판",familyRootId="WORLD_LORE_PROP",family="PROP",subfamily="LORE_COLLECTIBLE",worldRole="LORE_PROP",propKind="LORE_STONE",interactionRole="READ_OR_INSPECT",
		silhouette="CARVED_STONE_SLAB",palette=table.freeze({wood=c(96,69,48),woodLight=c(148,107,69),cloth=c(137,112,88),clothLight=c(205,181,143),metal=c(91,96,98),accent=c(191,137,67)}),
	}),
	RESOURCE_ROCK_NODE = table.freeze({
		id="RESOURCE_ROCK_NODE",name="암석 자원 표현",familyRootId="WORLD_RESOURCE_PROP",family="PROP",subfamily="RESOURCE_NODE",worldRole="RESOURCE_VISUAL",propKind="RESOURCE_ROCK",interactionRole="HARVEST_OR_INSPECT",
		silhouette="ROCK_NODE_CLUSTER",palette=table.freeze({wood=c(96,69,48),woodLight=c(148,107,69),cloth=c(137,112,88),clothLight=c(205,181,143),metal=c(91,96,98),accent=c(191,137,67)}),
	}),
	RESOURCE_WOOD_NODE = table.freeze({
		id="RESOURCE_WOOD_NODE",name="목재 자원 표현",familyRootId="WORLD_RESOURCE_PROP",family="PROP",subfamily="RESOURCE_NODE",worldRole="RESOURCE_VISUAL",propKind="RESOURCE_WOOD",interactionRole="HARVEST_OR_INSPECT",
		silhouette="STUMP_LOG_NODE",palette=table.freeze({wood=c(96,69,48),woodLight=c(148,107,69),cloth=c(137,112,88),clothLight=c(205,181,143),metal=c(91,96,98),accent=c(191,137,67)}),
	}),
})

local INTERACTION_ROLE_BY_ID = table.freeze({
	SIGNPOST="READ",
	WOOD_FENCE="INSPECT_OR_VAULT",
	WALL_TORCH="TOGGLE_LIGHT",
	WOOD_BARREL="OPEN_OR_INSPECT",
	BENCH="SIT",
	TABLE="INSPECT_OR_PLACE",
	MARKET_STALL="SHOP_OR_INSPECT",
	STONE_WELL="DRAW_WATER_OR_INSPECT",
	BED_SINGLE="SLEEP_OR_BIND_RESPAWN",
	WARDROBE="OPEN_STORAGE_OR_OUTFIT",
	SHELF="OPEN_STORAGE_OR_INSPECT",
	WORKBENCH="CRAFT",
	CRAFT_TABLE="CRAFT",
	COOKING_HEARTH="COOK",
	STORAGE_CABINET="OPEN_STORAGE",
	PLANTER_BOX="PLANT_OR_INSPECT",
	CROP_PLOT="PLANT_OR_HARVEST",
	ANIMAL_TROUGH="FEED",
	FLOOR_LAMP="TOGGLE_LIGHT",
	WALL_SWITCH="TOGGLE",
	LEVER_CONTROL="USE_CONTROL",
	NOTICE_BOARD="READ",
	RUG="INSPECT",
	DECOR_STATUE="INSPECT",
	WOOD_CART="PUSH_OR_INSPECT",
	WOOD_CRATE="OPEN_OR_CARRY",
	TREASURE_CHEST="OPEN_OR_INSPECT",
	STREET_LANTERN="TOGGLE_OR_INSPECT",
	LAUNDRY_LINE="INSPECT",
	SETTLEMENT_FLAG="INSPECT",
	CANVAS_TENT="ENTER_OR_INSPECT",
	FIREWOOD_STACK="GATHER_OR_INSPECT",
	FARM_TOOL_RACK="USE_OR_INSPECT",
	RUIN_DEBRIS="INSPECT_OR_CLIMB",
	CONSTRUCTION_SCAFFOLD="CLIMB_OR_INSPECT",
	LORE_STONE="READ_OR_INSPECT",
	RESOURCE_ROCK_NODE="HARVEST_OR_INSPECT",
	RESOURCE_WOOD_NODE="HARVEST_OR_INSPECT",
})

local SOUND_ROLE_BY_ID = table.freeze({
	SIGNPOST="SIGN_RATTLE",
	WOOD_FENCE="WOOD_CREAK",
	WALL_TORCH="TORCH_BURN",
	WOOD_BARREL="WOOD_CONTAINER",
	BENCH="WOOD_CREAK",
	TABLE="WOOD_TAP",
	MARKET_STALL="CLOTH_FLAP_MARKET",
	STONE_WELL="ROPE_BUCKET",
	BED_SINGLE="FABRIC_BED",
	WARDROBE="WOOD_DOOR",
	SHELF="WOOD_STORAGE",
	WORKBENCH="TOOL_WORK",
	CRAFT_TABLE="TOOL_WORK",
	COOKING_HEARTH="FIRE_COOK",
	STORAGE_CABINET="WOOD_DOOR",
	PLANTER_BOX="SOIL_PLANT",
	CROP_PLOT="SOIL_FARM",
	ANIMAL_TROUGH="ANIMAL_YARD",
	FLOOR_LAMP="LAMP_HUM_OR_FLAME",
	WALL_SWITCH="SWITCH_CLICK",
	LEVER_CONTROL="LEVER_CLUNK",
	NOTICE_BOARD="PAPER_FLUTTER",
	RUG="FABRIC_STEP",
	DECOR_STATUE="STONE_TOUCH",
	WOOD_CART="CART_WHEEL",
	WOOD_CRATE="WOOD_CONTAINER",
	TREASURE_CHEST="WOOD_CONTAINER",
	STREET_LANTERN="LAMP_HUM_OR_FLAME",
	LAUNDRY_LINE="CLOTH_FLAP",
	SETTLEMENT_FLAG="CLOTH_FLAP",
	CANVAS_TENT="CLOTH_FLAP",
	FIREWOOD_STACK="WOOD_STACK",
	FARM_TOOL_RACK="TOOL_RATTLE",
	RUIN_DEBRIS="STONE_RATTLE",
	CONSTRUCTION_SCAFFOLD="WOOD_CREAK",
	LORE_STONE="STONE_TOUCH",
	RESOURCE_ROCK_NODE="ROCK_HIT",
	RESOURCE_WOOD_NODE="WOOD_HIT",
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
	model.Name = "CommonWorldProp_" .. id
	model:SetAttribute("StudioAssetId", id)
	model:SetAttribute("StudioAssetPack", "roblox-common-world-props-v1")
	model:SetAttribute("StudioAssetFamily", "PROP")
	model:SetAttribute("CompanyCommonBase", true)
	model:SetAttribute("CompatibleGameScope", "ALL_ROBLOX_GAMES_WHEN_ROLE_STYLE_AND_PLATFORM_MATCH")
	model:SetAttribute("ThemeAdaptationRequiredPerGame", true)
	model:SetAttribute("SourceAssetLibrary", "company-asset-library.json")
	model:SetAttribute("ProductionVerified", false)
	model:SetAttribute("GameplayAuthority", false)

	local root = makePart("VisualRoot", Vector3.new(0.4, 0.4, 0.4), c(255, 255, 255), Enum.Material.SmoothPlastic)
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

local function addSignpost(model, root, row, level)
	local p = row.palette
	weld(root, makePart("Post", Vector3.new(0.32, 3.5, 0.32), p.wood, Enum.Material.WoodPlanks), CFrame.new(0, 1.75, 0))
	weld(root, makePart("Board", Vector3.new(2.7, 0.92, 0.20), p.woodLight, Enum.Material.WoodPlanks), CFrame.new(0.42, 2.72, 0))
	weld(root, makePart("CrossBrace", Vector3.new(1.0, 0.18, 0.18), p.metal, Enum.Material.Metal), CFrame.new(-0.38, 2.72, -0.14))
	if detail(level, 2) then
		weld(root, makePart("BoardInset", Vector3.new(2.18, 0.54, 0.06), p.mark, Enum.Material.SmoothPlastic), CFrame.new(0.42, 2.72, -0.13))
	end
	if detail(level, 3) then
		weld(root, makePart("PostCap", Vector3.new(0.46, 0.18, 0.46), p.metal, Enum.Material.Metal), CFrame.new(0, 3.55, 0))
	end
end

local function addFence(model, root, row, level)
	local p = row.palette
	for _, x in ipairs({-2, 0, 2}) do
		weld(root, makePart("Post" .. tostring(x), Vector3.new(0.34, 2.4, 0.34), p.wood, Enum.Material.WoodPlanks), CFrame.new(x, 1.2, 0))
		if detail(level, 3) then
			weld(root, makePart("PostCap" .. tostring(x), Vector3.new(0.46, 0.18, 0.46), p.metal, Enum.Material.Metal), CFrame.new(x, 2.46, 0))
		end
	end
	for i, y in ipairs({0.85, 1.65}) do
		weld(root, makePart("Rail" .. i, Vector3.new(4.35, 0.26, 0.28), i == 1 and p.wood or p.woodLight, Enum.Material.WoodPlanks), CFrame.new(0, y, 0))
	end
end

local function addTorch(model, root, row, level)
	local p = row.palette
	weld(root, makePart("WallPlate", Vector3.new(0.82, 0.82, 0.16), p.metal, Enum.Material.Metal), CFrame.new(0, 1.35, 0.3))
	weld(root, makePart("Bracket", Vector3.new(0.18, 0.18, 0.9), p.metal, Enum.Material.Metal), CFrame.new(0, 1.35, -0.10))
	weld(root, makePart("Handle", Vector3.new(0.30, 1.45, 0.30), p.wood, Enum.Material.WoodPlanks), CFrame.new(0, 1.42, -0.68) * CFrame.Angles(math.rad(-16), 0, 0))
	local flame = weld(root, makePart("Flame", Vector3.new(0.72, 1.12, 0.72), p.flame, Enum.Material.Neon, "BALL"), CFrame.new(0, 2.35, -0.95))
	flame.Transparency = 0.08
	if detail(level, 2) then
		local core = weld(root, makePart("FlameCore", Vector3.new(0.38, 0.72, 0.38), p.flameCore, Enum.Material.Neon, "BALL"), CFrame.new(0, 2.33, -1.01))
		local light = Instance.new("PointLight")
		light.Name = "VisualGlow"
		light.Color = p.flameCore
		light.Brightness = 1.2
		light.Range = 10
		light.Shadows = false
		light.Parent = core
	end
end

local function addBarrel(model, root, row, level)
	local p = row.palette
	local body = weld(root, makePart("BarrelBody", Vector3.new(2.1, 2.35, 2.1), p.wood, Enum.Material.WoodPlanks, "CYLINDER"), CFrame.new(0, 1.18, 0) * CFrame.Angles(0, 0, math.rad(90)))
	body:SetAttribute("MaterialVariantRole", "WOOD_STAVE")
	for i, y in ipairs({0.40, 1.18, 1.96}) do
		weld(root, makePart("Band" .. i, Vector3.new(2.20, 0.14, 2.20), p.metal, Enum.Material.Metal, "CYLINDER"), CFrame.new(0, y, 0) * CFrame.Angles(0, 0, math.rad(90)))
	end
	if detail(level, 2) then
		for i, z in ipairs({-0.55, 0, 0.55}) do
			weld(root, makePart("StaveAccent" .. i, Vector3.new(0.12, 2.02, 0.16), p.woodLight, Enum.Material.WoodPlanks), CFrame.new(0.96, 1.18, z))
		end
	end
end

local function addBench(model, root, row, level)
	local p = row.palette
	weld(root, makePart("Seat", Vector3.new(3.4, 0.30, 1.08), p.woodLight, Enum.Material.WoodPlanks), CFrame.new(0, 1.08, 0))
	weld(root, makePart("Back", Vector3.new(3.4, 1.05, 0.24), p.wood, Enum.Material.WoodPlanks), CFrame.new(0, 1.78, 0.43) * CFrame.Angles(math.rad(-8), 0, 0))
	for _, x in ipairs({-1.28, 1.28}) do
		weld(root, makePart("Leg" .. tostring(x), Vector3.new(0.26, 1.0, 0.82), p.metal, Enum.Material.Metal), CFrame.new(x, 0.52, 0))
	end
	if detail(level, 3) then
		for _, x in ipairs({-1.65, 1.65}) do
			weld(root, makePart("Arm" .. tostring(x), Vector3.new(0.18, 0.18, 1.10), p.metal, Enum.Material.Metal), CFrame.new(x, 1.45, 0))
		end
	end
end

local function addTable(model, root, row, level)
	local p = row.palette
	weld(root, makePart("Top", Vector3.new(3.5, 0.32, 2.2), p.woodLight, Enum.Material.WoodPlanks), CFrame.new(0, 2.0, 0))
	for _, pos in ipairs({
		Vector3.new(-1.35, 0.95, -0.72),
		Vector3.new(1.35, 0.95, -0.72),
		Vector3.new(-1.35, 0.95, 0.72),
		Vector3.new(1.35, 0.95, 0.72),
	}) do
		weld(root, makePart("Leg", Vector3.new(0.30, 1.9, 0.30), p.wood, Enum.Material.WoodPlanks), CFrame.new(pos))
	end
	if detail(level, 2) then
		weld(root, makePart("LongBrace", Vector3.new(2.8, 0.18, 0.18), p.dark, Enum.Material.WoodPlanks), CFrame.new(0, 0.75, 0))
	end
end

local function addMarketStall(model, root, row, level)
	local p = row.palette
	for _, pos in ipairs({
		Vector3.new(-1.7, 1.8, -0.9),
		Vector3.new(1.7, 1.8, -0.9),
		Vector3.new(-1.7, 1.8, 0.9),
		Vector3.new(1.7, 1.8, 0.9),
	}) do
		weld(root, makePart("FramePost", Vector3.new(0.24, 3.6, 0.24), p.wood, Enum.Material.WoodPlanks), CFrame.new(pos))
	end
	weld(root, makePart("Counter", Vector3.new(3.7, 0.34, 1.05), p.woodLight, Enum.Material.WoodPlanks), CFrame.new(0, 1.35, -0.88))
	weld(root, makePart("Canopy", Vector3.new(4.25, 0.20, 2.6), p.cloth, Enum.Material.Fabric), CFrame.new(0, 3.56, 0) * CFrame.Angles(0, 0, math.rad(4)))
	if detail(level, 2) then
		for i, x in ipairs({-1.6, -0.55, 0.55, 1.6}) do
			weld(root, makePart("CanopyStripe" .. i, Vector3.new(0.52, 0.08, 2.48), p.clothLight, Enum.Material.Fabric), CFrame.new(x, 3.68, 0))
		end
	end
	if detail(level, 3) then
		weld(root, makePart("HangingSign", Vector3.new(1.65, 0.58, 0.12), p.woodLight, Enum.Material.WoodPlanks), CFrame.new(0, 2.82, -1.22))
		weld(root, makePart("SignBracket", Vector3.new(1.9, 0.12, 0.12), p.metal, Enum.Material.Metal), CFrame.new(0, 3.10, -1.20))
	end
end

local function addStoneWell(model, root, row, level)
	local p = row.palette
	for i = 0, 11 do
		local a = math.rad(i * 30)
		local x = math.cos(a) * 1.25
		local z = math.sin(a) * 1.25
		weld(root, makePart("Stone" .. i, Vector3.new(0.72, 0.55, 0.52), i % 2 == 0 and p.stone or p.stoneLight, Enum.Material.Slate), CFrame.new(x, 0.58, z) * CFrame.Angles(0, -a, 0))
	end
	weld(root, makePart("Water", Vector3.new(2.15, 0.12, 2.15), p.water, Enum.Material.Glass, "CYLINDER"), CFrame.new(0, 0.58, 0) * CFrame.Angles(0, 0, math.rad(90))).Transparency = 0.28
	for _, x in ipairs({-1.55, 1.55}) do
		weld(root, makePart("RoofPost" .. tostring(x), Vector3.new(0.28, 3.5, 0.28), p.wood, Enum.Material.WoodPlanks), CFrame.new(x, 2.1, 0))
	end
	weld(root, makePart("Roof", Vector3.new(3.8, 0.24, 2.8), p.roof, Enum.Material.WoodPlanks), CFrame.new(0, 3.78, 0) * CFrame.Angles(0, 0, math.rad(6)))
	if detail(level, 2) then
		weld(root, makePart("Rope", Vector3.new(0.10, 1.72, 0.10), p.rope, Enum.Material.Fabric, "CYLINDER"), CFrame.new(0, 2.20, 0))
		weld(root, makePart("Bucket", Vector3.new(0.72, 0.62, 0.72), p.wood, Enum.Material.WoodPlanks, "CYLINDER"), CFrame.new(0, 1.25, 0) * CFrame.Angles(0, 0, math.rad(90)))
	end
end


local function addHousingProp(model,root,row,level)
	local p=row.palette
	local kind=row.propKind
	if kind=="BED" then
		weld(root,makePart("Frame",Vector3.new(3.0,0.46,5.4),p.wood,Enum.Material.WoodPlanks),CFrame.new(0,0.55,0))
		weld(root,makePart("Mattress",Vector3.new(2.72,0.55,4.85),p.cloth,Enum.Material.Fabric),CFrame.new(0,1.02,0))
		weld(root,makePart("Pillow",Vector3.new(2.10,0.42,1.00),p.clothLight,Enum.Material.Fabric),CFrame.new(0,1.40,1.65))
		if detail(level,2) then weld(root,makePart("Headboard",Vector3.new(3.0,2.2,0.34),p.woodLight,Enum.Material.WoodPlanks),CFrame.new(0,1.55,2.55)) end
	elseif kind=="WARDROBE" or kind=="CABINET" then
		local tall=kind=="WARDROBE"
		local h=tall and 5.0 or 3.0
		weld(root,makePart("Body",Vector3.new(3.4,h,1.65),p.wood,Enum.Material.WoodPlanks),CFrame.new(0,h/2,0))
		for _,x in ipairs({-0.82,0.82}) do
			weld(root,makePart("Door"..x,Vector3.new(1.48,h-0.36,0.16),p.woodLight,Enum.Material.WoodPlanks),CFrame.new(x,h/2,-0.90))
			if detail(level,2) then weld(root,makePart("Handle"..x,Vector3.new(0.18,0.34,0.18),p.metal,Enum.Material.Metal,"BALL"),CFrame.new(x+(x<0 and 0.55 or -0.55),h/2,-1.05)) end
		end
	elseif kind=="SHELF" then
		for _,y in ipairs({0.35,1.85,3.35}) do weld(root,makePart("Shelf"..y,Vector3.new(3.5,0.25,1.2),p.woodLight,Enum.Material.WoodPlanks),CFrame.new(0,y,0)) end
		for _,x in ipairs({-1.55,1.55}) do weld(root,makePart("Post"..x,Vector3.new(0.24,3.75,1.05),p.wood,Enum.Material.WoodPlanks),CFrame.new(x,1.85,0)) end
	elseif kind=="WORKBENCH" or kind=="CRAFT_TABLE" then
		weld(root,makePart("Top",Vector3.new(4.2,0.38,2.2),p.woodLight,Enum.Material.WoodPlanks),CFrame.new(0,2.05,0))
		for _,x in ipairs({-1.65,1.65}) do weld(root,makePart("Leg"..x,Vector3.new(0.38,2.0,1.55),p.wood,Enum.Material.WoodPlanks),CFrame.new(x,1.0,0)) end
		if detail(level,2) then
			weld(root,makePart("ToolRack",Vector3.new(3.4,1.55,0.18),p.wood,Enum.Material.WoodPlanks),CFrame.new(0,3.15,0.88))
			for i=-1,1 do weld(root,makePart("Tool"..i,Vector3.new(0.16,0.95,0.14),p.metal,Enum.Material.Metal),CFrame.new(i*0.75,3.15,0.72)*CFrame.Angles(0,0,math.rad(i*12))) end
		end
	elseif kind=="HEARTH" then
		for i=0,7 do
			local a=math.rad(i*45)
			weld(root,makePart("Stone"..i,Vector3.new(0.82,0.54,0.58),i%2==0 and p.metal or p.cloth,Enum.Material.Slate),CFrame.new(math.cos(a)*1.25,0.35,math.sin(a)*1.25)*CFrame.Angles(0,-a,0))
		end
		local fire=weld(root,makePart("Fire",Vector3.new(1.25,1.05,1.25),p.accent,Enum.Material.Neon,"BALL"),CFrame.new(0,0.88,0));fire.Transparency=0.08
		if detail(level,2) then weld(root,makePart("Pot",Vector3.new(1.45,1.05,1.45),p.metal,Enum.Material.Metal,"CYLINDER"),CFrame.new(0,1.75,0)*CFrame.Angles(0,0,math.rad(90))) end
	elseif kind=="PLANTER" or kind=="CROP_PLOT" then
		local size=kind=="CROP_PLOT" and Vector3.new(5.2,0.65,4.0) or Vector3.new(3.4,1.0,1.6)
		weld(root,makePart("Box",size,p.wood,Enum.Material.WoodPlanks),CFrame.new(0,size.Y/2,0))
		weld(root,makePart("Soil",Vector3.new(size.X-0.35,0.18,size.Z-0.35),p.cloth,Enum.Material.Ground),CFrame.new(0,size.Y+0.03,0))
		if detail(level,2) then
			for i=-2,2 do
				weld(root,makePart("Plant"..i,Vector3.new(0.22,0.75,0.22),p.accent,Enum.Material.Grass,"CYLINDER"),CFrame.new(i*(size.X-1)/5,size.Y+0.45,0))
			end
		end
	elseif kind=="TROUGH" then
		weld(root,makePart("Basin",Vector3.new(4.1,1.15,1.55),p.wood,Enum.Material.WoodPlanks),CFrame.new(0,1.0,0))
		weld(root,makePart("Inset",Vector3.new(3.65,0.55,1.1),p.cloth,Enum.Material.Ground),CFrame.new(0,1.45,0))
		for _,x in ipairs({-1.55,1.55}) do weld(root,makePart("Leg"..x,Vector3.new(0.35,0.85,1.25),p.woodLight,Enum.Material.WoodPlanks),CFrame.new(x,0.42,0)) end
	elseif kind=="FLOOR_LAMP" then
		weld(root,makePart("Base",Vector3.new(1.0,0.22,1.0),p.metal,Enum.Material.Metal,"CYLINDER"),CFrame.new(0,0.11,0))
		weld(root,makePart("Stand",Vector3.new(0.18,3.9,0.18),p.metal,Enum.Material.Metal,"CYLINDER"),CFrame.new(0,2.0,0))
		local glow=weld(root,makePart("Glow",Vector3.new(1.15,1.35,1.15),p.accent,Enum.Material.Neon,"BALL"),CFrame.new(0,4.15,0));glow.Transparency=0.12
		if detail(level,2) then
			local light=Instance.new("PointLight");light.Name="VisualGlow";light.Color=p.accent;light.Brightness=1.0;light.Range=9;light.Shadows=false;light.Parent=glow
		end
	elseif kind=="SWITCH" or kind=="LEVER" then
		weld(root,makePart("Plate",Vector3.new(1.35,1.65,0.24),p.metal,Enum.Material.Metal),CFrame.new(0,0.82,0))
		local h=kind=="LEVER" and 1.55 or 0.85
		weld(root,makePart("Handle",Vector3.new(0.20,h,0.20),p.accent,Enum.Material.Metal,"CYLINDER"),CFrame.new(0,0.95,-0.28)*CFrame.Angles(math.rad(-28),0,0))
		if detail(level,2) then weld(root,makePart("Grip",Vector3.new(0.38,0.38,0.38),p.woodLight,Enum.Material.Wood,"BALL"),CFrame.new(0,1.48,-0.62)) end
	elseif kind=="NOTICE" then
		for _,x in ipairs({-1.85,1.85}) do weld(root,makePart("Post"..x,Vector3.new(0.26,3.8,0.26),p.wood,Enum.Material.WoodPlanks),CFrame.new(x,1.9,0)) end
		weld(root,makePart("Board",Vector3.new(4.2,2.6,0.28),p.woodLight,Enum.Material.WoodPlanks),CFrame.new(0,3.15,0))
		if detail(level,2) then
			for i=-1,1 do weld(root,makePart("Notice"..i,Vector3.new(0.95,0.72,0.05),p.cloth,Enum.Material.SmoothPlastic),CFrame.new(i*1.15,3.2,-0.18)*CFrame.Angles(0,0,math.rad(i*4))) end
		end
	elseif kind=="RUG" then
		weld(root,makePart("Rug",Vector3.new(4.6,0.12,3.1),p.cloth,Enum.Material.Fabric),CFrame.new(0,0.06,0))
		if detail(level,2) then
			weld(root,makePart("PatternA",Vector3.new(3.7,0.04,0.22),p.accent,Enum.Material.Fabric),CFrame.new(0,0.13,0))
			weld(root,makePart("PatternB",Vector3.new(0.22,0.04,2.5),p.clothLight,Enum.Material.Fabric),CFrame.new(0,0.13,0))
		end
	elseif kind=="STATUE" then
		weld(root,makePart("Pedestal",Vector3.new(1.65,1.15,1.65),p.wood,Enum.Material.Slate),CFrame.new(0,0.58,0))
		weld(root,makePart("Body",Vector3.new(1.05,2.4,0.95),p.woodLight,Enum.Material.Slate),CFrame.new(0,2.15,0))
		weld(root,makePart("Head",Vector3.new(0.85,0.85,0.85),p.accent,Enum.Material.Slate,"BALL"),CFrame.new(0,3.65,0))
	end
end


local function addSettlementProp(model,root,row,level)
	local p=row.palette
	local kind=row.propKind
	if kind=="CART" then
		weld(root,makePart("Bed",Vector3.new(4.2,0.55,2.3),p.woodLight,Enum.Material.WoodPlanks),CFrame.new(0,1.45,0))
		for _,x in ipairs({-1.65,1.65}) do weld(root,makePart("Side"..x,Vector3.new(0.24,1.45,2.25),p.wood,Enum.Material.WoodPlanks),CFrame.new(x,2.05,0)) end
		for _,z in ipairs({-1.25,1.25}) do weld(root,makePart("Wheel"..z,Vector3.new(1.55,0.34,1.55),p.metal,Enum.Material.Metal,"CYLINDER"),CFrame.new(0,0.85,z)*CFrame.Angles(0,0,math.rad(90))) end
		weld(root,makePart("Handle",Vector3.new(0.34,0.34,4.2),p.wood,Enum.Material.WoodPlanks),CFrame.new(0,1.25,-3.15)*CFrame.Angles(math.rad(-8),0,0))
	elseif kind=="CRATE" or kind=="CHEST" then
		local h=kind=="CHEST" and 1.65 or 1.8
		weld(root,makePart("Body",Vector3.new(2.8,h,2.35),p.wood,Enum.Material.WoodPlanks),CFrame.new(0,h/2,0))
		weld(root,makePart("Lid",Vector3.new(2.95,0.32,2.5),p.woodLight,Enum.Material.WoodPlanks),CFrame.new(0,h+0.16,0))
		for _,x in ipairs({-1.18,1.18}) do weld(root,makePart("Band"..x,Vector3.new(0.16,h+0.35,2.46),p.metal,Enum.Material.Metal),CFrame.new(x,(h+0.35)/2,0)) end
		if kind=="CHEST" then weld(root,makePart("Latch",Vector3.new(0.42,0.62,0.18),p.accent,Enum.Material.Metal),CFrame.new(0,h*0.72,-1.28)) end
	elseif kind=="STREET_LANTERN" then
		weld(root,makePart("Base",Vector3.new(1.05,0.25,1.05),p.metal,Enum.Material.Metal),CFrame.new(0,0.13,0))
		weld(root,makePart("Post",Vector3.new(0.24,5.2,0.24),p.metal,Enum.Material.Metal),CFrame.new(0,2.7,0))
		local glow=weld(root,makePart("Lantern",Vector3.new(1.1,1.35,1.1),p.accent,Enum.Material.Neon),CFrame.new(0,5.3,0));glow.Transparency=0.12
		if detail(level,2) then local light=Instance.new("PointLight");light.Name="VisualGlow";light.Color=p.accent;light.Brightness=1.0;light.Range=11;light.Shadows=false;light.Parent=glow end
	elseif kind=="LAUNDRY" then
		for _,x in ipairs({-2.3,2.3}) do weld(root,makePart("Post"..x,Vector3.new(0.24,3.6,0.24),p.wood,Enum.Material.WoodPlanks),CFrame.new(x,1.8,0)) end
		weld(root,makePart("Line",Vector3.new(4.8,0.08,0.08),p.metal,Enum.Material.Metal),CFrame.new(0,3.25,0))
		for i=-1,1 do weld(root,makePart("Cloth"..i,Vector3.new(1.15,1.45,0.08),i%2==0 and p.clothLight or p.cloth,Enum.Material.Fabric),CFrame.new(i*1.45,2.55,0)) end
	elseif kind=="FLAG" then
		weld(root,makePart("Pole",Vector3.new(0.22,6.2,0.22),p.metal,Enum.Material.Metal),CFrame.new(0,3.1,0))
		weld(root,makePart("Flag",Vector3.new(2.8,1.65,0.12),p.cloth,Enum.Material.Fabric),CFrame.new(1.5,5.3,0))
		if detail(level,2) then weld(root,makePart("Mark",Vector3.new(0.7,0.7,0.05),p.accent,Enum.Material.SmoothPlastic),CFrame.new(1.4,5.3,-0.08)) end
	elseif kind=="TENT" then
		weld(root,makePart("GroundCloth",Vector3.new(4.5,0.12,5.2),p.cloth,Enum.Material.Fabric),CFrame.new(0,0.06,0))
		weld(root,makePart("RoofL",Vector3.new(2.8,0.16,5.0),p.clothLight,Enum.Material.Fabric),CFrame.new(-1.15,1.65,0)*CFrame.Angles(0,0,math.rad(-38)))
		weld(root,makePart("RoofR",Vector3.new(2.8,0.16,5.0),p.cloth,Enum.Material.Fabric),CFrame.new(1.15,1.65,0)*CFrame.Angles(0,0,math.rad(38)))
		weld(root,makePart("Ridge",Vector3.new(0.18,0.18,5.1),p.wood,Enum.Material.WoodPlanks),CFrame.new(0,2.7,0))
	elseif kind=="FIREWOOD" then
		for i=0,7 do
			local x=((i%4)-1.5)*0.72
			local y=0.38+math.floor(i/4)*0.62
			weld(root,makePart("Log"..i,Vector3.new(1.65,0.48,0.48),i%2==0 and p.wood or p.woodLight,Enum.Material.WoodPlanks,"CYLINDER"),CFrame.new(x,y,0)*CFrame.Angles(0,0,math.rad(90)))
		end
	elseif kind=="FARM_TOOL_RACK" then
		weld(root,makePart("Rack",Vector3.new(4.0,2.5,0.28),p.wood,Enum.Material.WoodPlanks),CFrame.new(0,1.55,0))
		for i=-2,2 do
			weld(root,makePart("Handle"..i,Vector3.new(0.16,2.7,0.16),p.woodLight,Enum.Material.WoodPlanks),CFrame.new(i*0.72,1.35,-0.32)*CFrame.Angles(0,0,math.rad(i*4)))
			weld(root,makePart("Head"..i,Vector3.new(0.62,0.20,0.26),p.metal,Enum.Material.Metal),CFrame.new(i*0.72,2.62,-0.32))
		end
	elseif kind=="RUIN_DEBRIS" then
		for i=1,8 do
			local x=((i%4)-1.5)*1.0
			local z=(math.floor((i-1)/4)-0.5)*1.25
			weld(root,makePart("Debris"..i,Vector3.new(0.8+(i%3)*0.35,0.55+(i%2)*0.45,0.9),i%2==0 and p.woodLight or p.metal,Enum.Material.Slate),CFrame.new(x,0.35+(i%2)*0.2,z)*CFrame.Angles(math.rad((i%3)*7),math.rad(i*19),math.rad((i%2)*9)))
		end
	elseif kind=="SCAFFOLD" then
		for _,x in ipairs({-1.8,1.8}) do for _,z in ipairs({-1.0,1.0}) do weld(root,makePart("Post"..x..z,Vector3.new(0.22,4.8,0.22),p.wood,Enum.Material.WoodPlanks),CFrame.new(x,2.4,z)) end end
		for _,y in ipairs({1.3,3.1}) do weld(root,makePart("Platform"..y,Vector3.new(4.1,0.20,2.4),p.woodLight,Enum.Material.WoodPlanks),CFrame.new(0,y,0)) end
		weld(root,makePart("CrossA",Vector3.new(4.4,0.16,0.16),p.metal,Enum.Material.Metal),CFrame.new(0,2.4,-1.08)*CFrame.Angles(0,0,math.rad(28)))
	elseif kind=="LORE_STONE" then
		weld(root,makePart("Slab",Vector3.new(2.7,4.0,0.72),p.metal,Enum.Material.Slate),CFrame.new(0,2.0,0))
		if detail(level,2) then for i=-2,2 do weld(root,makePart("Glyph"..i,Vector3.new(1.55,0.12,0.05),p.accent,Enum.Material.Neon),CFrame.new(0,2.0+i*0.48,-0.39)) end end
	elseif kind=="RESOURCE_ROCK" then
		for i=1,5 do weld(root,makePart("Rock"..i,Vector3.new(1.3+(i%2)*0.6,1.1+(i%3)*0.35,1.25),i%2==0 and p.woodLight or p.metal,Enum.Material.Rock,"BALL"),CFrame.new((i-3)*0.72,0.62+(i%2)*0.25,(i%2)*0.7)) end
	elseif kind=="RESOURCE_WOOD" then
		weld(root,makePart("Stump",Vector3.new(1.7,1.2,1.7),p.wood,Enum.Material.Wood,"CYLINDER"),CFrame.new(-0.8,0.6,0)*CFrame.Angles(0,0,math.rad(90)))
		weld(root,makePart("Log",Vector3.new(3.8,0.95,0.95),p.woodLight,Enum.Material.Wood,"CYLINDER"),CFrame.new(1.0,0.62,0.35)*CFrame.Angles(0,0,math.rad(90)))
	end
end

local BUILDERS = table.freeze({
	SIGNPOST = addSignpost,
	WOOD_FENCE = addFence,
	WALL_TORCH = addTorch,
	WOOD_BARREL = addBarrel,
	BENCH = addBench,
	TABLE = addTable,
	MARKET_STALL = addMarketStall,
	STONE_WELL = addStoneWell,
	BED_SINGLE = addHousingProp,
	WARDROBE = addHousingProp,
	SHELF = addHousingProp,
	WORKBENCH = addHousingProp,
	CRAFT_TABLE = addHousingProp,
	COOKING_HEARTH = addHousingProp,
	STORAGE_CABINET = addHousingProp,
	PLANTER_BOX = addHousingProp,
	CROP_PLOT = addHousingProp,
	ANIMAL_TROUGH = addHousingProp,
	FLOOR_LAMP = addHousingProp,
	WALL_SWITCH = addHousingProp,
	LEVER_CONTROL = addHousingProp,
	NOTICE_BOARD = addHousingProp,
	RUG = addHousingProp,
	DECOR_STATUE = addHousingProp,
	WOOD_CART = addSettlementProp,
	WOOD_CRATE = addSettlementProp,
	TREASURE_CHEST = addSettlementProp,
	STREET_LANTERN = addSettlementProp,
	LAUNDRY_LINE = addSettlementProp,
	SETTLEMENT_FLAG = addSettlementProp,
	CANVAS_TENT = addSettlementProp,
	FIREWOOD_STACK = addSettlementProp,
	FARM_TOOL_RACK = addSettlementProp,
	RUIN_DEBRIS = addSettlementProp,
	CONSTRUCTION_SCAFFOLD = addSettlementProp,
	LORE_STONE = addSettlementProp,
	RESOURCE_ROCK_NODE = addSettlementProp,
	RESOURCE_WOOD_NODE = addSettlementProp,
})

local function applyModelMetadata(model, row, quality)
	model:SetAttribute("StudioAssetFamilyRootId", row.familyRootId)
	model:SetAttribute("StudioAssetSubfamily", row.subfamily)
	model:SetAttribute("StudioAssetWorldRole", row.worldRole)
	model:SetAttribute("StudioAssetSilhouette", row.silhouette)
	model:SetAttribute("InteractionPresentationRole", row.interactionRole or INTERACTION_ROLE_BY_ID[row.id] or "INSPECT")
	model:SetAttribute("InteractionSoundRole", row.interactionSoundRole or SOUND_ROLE_BY_ID[row.id] or "PROP_INTERACTION_GENERIC")
	model:SetAttribute("OwnsAudioPlaybackAuthority", false)
	model:SetAttribute("OwnsInteractionAuthority", false)
	model:SetAttribute("OwnsStorageAuthority", false)
	model:SetAttribute("OwnsCraftingAuthority", false)
	model:SetAttribute("OwnsRespawnAuthority", false)
	model:SetAttribute("HousingOrSettlementRole", row.worldRole or "SET_DRESSING")
	model:SetAttribute("HousingPropKind", row.propKind or "GENERAL")
	model:SetAttribute("StudioAssetQualityLevel", quality)
	model:SetAttribute("StudioAssetQualityTarget", 100)
	model:SetAttribute("RuntimeVerificationState", "PENDING_STUDIO")
end

function RobloxCommonWorldProps.List()
	local result = {}
	for id, row in pairs(Catalog) do
		table.insert(result, table.freeze({
			id = id,
			name = row.name,
			familyRootId = row.familyRootId,
			family = row.family,
			subfamily = row.subfamily,
			worldRole = row.worldRole,
			silhouette = row.silhouette,
			productionVerified = false,
		}))
	end
	table.sort(result, function(a, b)
		return a.id < b.id
	end)
	return table.freeze(result)
end

function RobloxCommonWorldProps.Describe(id)
	local row = Catalog[string.upper(tostring(id or ""))]
	assert(row, "UNKNOWN_COMMON_WORLD_PROP: " .. tostring(id))
	return row
end

function RobloxCommonWorldProps.Create(id, options)
	options = options or {}
	local key = string.upper(tostring(id or ""))
	local row = Catalog[key]
	local builder = BUILDERS[key]
	assert(row and builder, "UNKNOWN_COMMON_WORLD_PROP: " .. tostring(id))

	local quality = string.lower(tostring(options.quality or "mid"))
	local level = QUALITY_LEVEL[quality]
	assert(level, "INVALID_COMMON_WORLD_PROP_QUALITY: " .. tostring(quality))

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
	if typeof(options.pivot) == "CFrame" then
		model:PivotTo(options.pivot)
	end
	return model
end

function RobloxCommonWorldProps.CreateViewport(id, options)
	options = options or {}
	local frame = Instance.new("ViewportFrame")
	frame.Name = "CommonWorldPropViewport_" .. string.upper(tostring(id or ""))
	frame.BackgroundTransparency = options.backgroundTransparency == nil and 1 or options.backgroundTransparency
	frame.Ambient = options.ambient or c(106, 111, 115)
	frame.LightColor = options.lightColor or c(255, 238, 214)
	frame.LightDirection = options.lightDirection or Vector3.new(-1, -1, -1)
	frame.Size = options.size or UDim2.fromScale(1, 1)

	local world = Instance.new("WorldModel")
	world.Name = "CommonWorldPropWorld"
	world.Parent = frame

	local model = RobloxCommonWorldProps.Create(id, {
		quality = options.quality or "near",
		palette = options.palette,
		anchored = true,
		parent = world,
	})

	local camera = Instance.new("Camera")
	camera.Name = "CommonWorldPropCamera"
	camera.FieldOfView = tonumber(options.fieldOfView) or 36
	camera.Parent = frame
	frame.CurrentCamera = camera

	local boxCf, boxSize = model:GetBoundingBox()
	local radius = math.max(boxSize.X, boxSize.Y, boxSize.Z)
	local distance = math.max(5, radius * 1.65)
	camera.CFrame = CFrame.new(boxCf.Position + Vector3.new(distance * 0.72, distance * 0.48, distance), boxCf.Position)

	frame.Parent = options.parent
	return frame
end

return table.freeze(RobloxCommonWorldProps)
