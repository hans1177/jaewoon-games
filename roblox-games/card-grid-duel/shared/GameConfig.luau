-- 파일명: roblox-games/card-grid-duel/shared/GameConfig.luau
-- 역할: 5×5 카드 전술전 공통 규칙/카드 데이터

local Config = {}

Config.GameId = "card-grid-duel"
Config.DisplayName = "카드 격자전"
Config.BoardSize = 5
Config.StartingHand = 4
Config.MaxHand = 5
Config.DeckCopiesPerCard = 2
Config.HomeRows = {
    BLUE = 5,
    RED = 1,
}

Config.SideOrder = { "BLUE", "RED" }

Config.Cards = {
    BLUE = {
        {
            Id = "SWORDSMAN",
            Name = "검사",
            Short = "검",
            MaxHp = 100,
            Damage = 30,
            Range = 1,
            Description = "기본 근접 유닛",
        },
        {
            Id = "ARCHER",
            Name = "궁수",
            Short = "궁",
            MaxHp = 70,
            Damage = 25,
            Range = 2,
            Description = "2칸 원거리 공격",
        },
        {
            Id = "GUARDIAN",
            Name = "방패병",
            Short = "방",
            MaxHp = 150,
            Damage = 18,
            Range = 1,
            DamageReduction = 0.30,
            Description = "받는 피해 30% 감소",
        },
        {
            Id = "MAGE",
            Name = "마법사",
            Short = "마",
            MaxHp = 60,
            Damage = 35,
            Range = 2,
            SplashDamage = 15,
            Description = "공격 대상 주변 1칸에 15 피해",
        },
    },
    RED = {
        {
            Id = "GOBLIN",
            Name = "고블린",
            Short = "고",
            MaxHp = 80,
            Damage = 25,
            Range = 1,
            Description = "기본 근접 적",
        },
        {
            Id = "ORC",
            Name = "오크",
            Short = "오",
            MaxHp = 140,
            Damage = 32,
            Range = 1,
            Description = "체력이 높고 공격이 강함",
        },
        {
            Id = "SKELETON_ARCHER",
            Name = "해골 궁수",
            Short = "해",
            MaxHp = 65,
            Damage = 23,
            Range = 2,
            Description = "2칸 원거리 공격",
        },
        {
            Id = "DARK_MAGE",
            Name = "흑마법사",
            Short = "흑",
            MaxHp = 75,
            Damage = 30,
            Range = 2,
            FreezeChance = 0.30,
            Description = "30% 확률로 대상 이동/공격 1턴 봉인",
        },
    },
}

local function buildCardLookup()
    local lookup = {}
    for side, cards in pairs(Config.Cards) do
        lookup[side] = {}
        for _, card in ipairs(cards) do
            lookup[side][card.Id] = card
        end
    end
    return lookup
end

Config.CardLookup = buildCardLookup()

function Config.GetCard(side, cardId)
    local sideCards = Config.CardLookup[side]
    if not sideCards then
        return nil
    end
    return sideCards[cardId]
end

function Config.OtherSide(side)
    if side == "BLUE" then
        return "RED"
    end
    return "BLUE"
end

return table.freeze(Config)
