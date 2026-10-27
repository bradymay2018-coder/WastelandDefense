
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let ignoreCanvasDropClick = null;

canvas.addEventListener("click", event => {
    if (!event.isTrusted || !ignoreCanvasDropClick) return;
    if (performance.now() > ignoreCanvasDropClick.until) {
        ignoreCanvasDropClick = null;
        return;
    }
    if (Math.hypot(event.clientX - ignoreCanvasDropClick.x, event.clientY - ignoreCanvasDropClick.y) <= 18) {
        event.preventDefault();
        event.stopImmediatePropagation();
        ignoreCanvasDropClick = null;
    }
}, true);

const masonImage = new Image();
masonImage.src = "Images/Masonchar.png";

const jamesImage = new Image();
jamesImage.src = "Images/Jameschar.png";

const codyImage = new Image();
codyImage.src = "Images/Codychar.png";

const britneyImage = new Image();
britneyImage.src = "Images/Britneychar.png";

const zachImage = new Image();
zachImage.src = "Images/Zachchar.png";

const bradyImage = new Image();
bradyImage.src = "Images/Bradychar.png";

const builtinSurvivorIds = new Set(["mason", "james", "cody", "britney", "zach", "brady"]);
// Custom packages contain base inputs only. This profile marker makes the
// contract explicit while keeping all live tuning centralized in this file.
const customBalanceConfig = window.WD_SURVIVOR_BALANCE || {
    version: "rarity-v2",
    rarityRules: {
        common: { cost: [50, 120], damage: [4, 24], range: [70, 190], fireRate: [0.55, 2.8] },
        uncommon: { cost: [90, 170], damage: [5, 30], range: [70, 220], fireRate: [0.5, 2.8] },
        rare: { cost: [140, 260], damage: [6, 38], range: [70, 260], fireRate: [0.45, 3.0] },
        legendary: { cost: [190, 420], damage: [8, 48], range: [60, 280], fireRate: [0.4, 3.2] }
    }
};
const customSurvivorBalanceProfile = customBalanceConfig.version;
// Keep the first mystery-box roster locked even if an older exported package
// does not yet include the builder's mysteryBoxOnly flag.
const mysteryBoxOnlySurvivorIds = new Set(["selena", "radhesh", "rork", "bas", "knox", "nathan", "gregory"]);
// Deployment costs reflect real combat value, including range and utility.
// Custom survivor files can keep their original builder values while the live
// game applies this balance layer consistently.
const survivorCostOverrides = {
    cody: 120,
    james: 150,
    britney: 160,
    rork: 115,
    knox: 115,
    // Keep the mystery recruits' deployment costs distinct from their
    // 1,000-coin shop price. These values are the first-pass balance
    // targets relative to Mason's dependable common baseline.
    selena: 190,
    radhesh: 150,
    bas: 200
};
const customRarityBalanceRules = customBalanceConfig.rarityRules;
const clampCustomStat = (value, range, fallback) =>
    Math.min(range[1], Math.max(range[0], Number(value) || fallback));
const customSurvivors = (Array.isArray(window.WD_CUSTOM_SURVIVORS) ? window.WD_CUSTOM_SURVIVORS : [])
    .filter(survivor => survivor && /^[a-z0-9_-]{2,24}$/.test(String(survivor.id || ""))
        && !builtinSurvivorIds.has(String(survivor.id).toLowerCase())
        && typeof survivor.portraitData === "string" && survivor.portraitData.startsWith("data:image/png;base64,"))
    .map(survivor => {
        const id = String(survivor.id).toLowerCase();
        const rarity = ["common", "uncommon", "rare", "legendary"].includes(survivor.rarity)
            ? survivor.rarity
            : "common";
        const balance = customRarityBalanceRules[rarity];
        const configuredCost = survivorCostOverrides[id] ?? survivor.cost;
        return {
        id,
        balanceProfile: String(survivor.balanceProfile || customSurvivorBalanceProfile),
        name: String(survivor.name || "New Survivor").slice(0, 28),
        role: String(survivor.role || "RIFLE").slice(0, 30).toUpperCase(),
        rarity,
        cost: Math.round(clampCustomStat(configuredCost, balance.cost, balance.cost[0])),
        damage: clampCustomStat(survivor.damage, balance.damage, balance.damage[0]),
        range: Math.round(clampCustomStat(survivor.range, balance.range, 100)),
        fireRate: Number(clampCustomStat(survivor.fireRate, balance.fireRate, 1).toFixed(2)),
        description: String(survivor.description || "A custom survivor ready for the wasteland.").slice(0, 120),
        portraitData: survivor.portraitData,
        modelData: typeof survivor.modelData === "string" && survivor.modelData.startsWith("data:image/png;base64,")
            ? survivor.modelData
            : "",
        mysteryBoxOnly: survivor.mysteryBoxOnly === true || mysteryBoxOnlySurvivorIds.has(id),
        upgrades: Array.isArray(survivor.upgrades) ? survivor.upgrades.slice(0, 3).map((upgrade, index) => ({
            name: String(upgrade?.name || (index === 2 ? "SIGNATURE UPGRADE" : "")).slice(0, 28).toUpperCase(),
            description: String(upgrade?.description || "Improves this survivor's combat performance.").slice(0, 120)
        })) : []
        };
    });

const customSurvivorImages = Object.fromEntries(customSurvivors.map(survivor => {
    const image = new Image();
    image.src = survivor.modelData || survivor.portraitData;
    return [survivor.id, image];
}));

const spiderImage = new Image();
spiderImage.src = "Images/spider.png";

const skitterImage = new Image();
skitterImage.src = "Images/Skitter.png";

const hollowImage = new Image();
hollowImage.src = "Images/Hollow.png";

const fogkeeperImage = new Image();
fogkeeperImage.src = "Images/Fogkeeper.png";

const heavyMutantImage = new Image();
heavyMutantImage.src = "Images/Heavymutant.png";

const wastelandCowImage = new Image();
wastelandCowImage.src = "Images/Wastelandcow.png";

const mutantManImage = new Image();
mutantManImage.src = "Images/Mutantman.png";

const mutantSnakeImage = new Image();
mutantSnakeImage.src = "Images/MutantSnake.png";

canvas.addEventListener("contextmenu", function(event) {
    event.preventDefault();
});
canvas.addEventListener("mousedown", function(event) {
    if (event.button !== 2) return;
    if (!selectedSurvivor) return;

    event.preventDefault();

    selectedSurvivor = null;

    hideSurvivorDetails();

    document.querySelectorAll("#inGameSurvivorList .survivor-card")
        .forEach(card => card.classList.remove("selected"));

    updateDeploymentMessage("Placement cancelled. Select another survivor.");
    renderGame();
});
let mouseX = 0;
let mouseY = 0;
let mouseOnCanvas = false;

canvas.addEventListener("mousemove", function(event) {
    const rect = canvas.getBoundingClientRect();

    mouseX = (event.clientX - rect.left) * canvas.width / rect.width;
    mouseY = (event.clientY - rect.top) * canvas.height / rect.height;

    mouseOnCanvas = true;
});

canvas.addEventListener("mouseleave", function() {
    mouseOnCanvas = false;
});


 // Repeatable random numbers for the map
let randomSeed = 12345;

function seededRandom() {
    randomSeed = (randomSeed * 16807) % 2147483647;
    return (randomSeed - 1) / 2147483646;
}
// Campaign road settings
const roadWidth = 42;
const roadBuffer = roadWidth / 2 + 8;
const survivorPlacementHalfWidth = 15;
const survivorPlacementHalfHeight = 27;
const survivorPlacementRoadBuffer = roadWidth / 2 + 2;
// Enemy coordinates are road centerline anchors.  Sprite-specific transparent
// padding is corrected at draw time, so no extra horizontal-lane nudge is
// needed here.
const horizontalEnemyLaneVisualOffset = 0;

let currentLevel = 1;
let gameMode = "campaign";

// The first campaign operations are guided introductions with intentionally
// fixed squads. Campaign uses the starter roster only; shop recruits remain
// a separate reward for the other modes.
const campaignTutorialSquads = {
    1: ["james", "mason", "cody"],
    2: ["james", "mason", "britney", "cody"]
};
// Campaign operations are designed around the six starter survivors. Shop
// recruits remain special rewards for Endless, Daily Challenge, and Sandbox;
// they never appear as campaign deployment options.
const campaignStarterSurvivorIds = ["mason", "james", "cody", "britney", "zach", "brady"];

// Campaign operations after the two fixed-squad introductions use the same
// six starter survivors.  Shop recruits are intentionally excluded so the
// campaign remains a fair, readable progression for every new account.
const campaignStartingScrap = {
    1: 400,
    2: 550,
    3: 500,
    4: 550,
    5: 600,
    6: 650
};
function getCampaignSquadIds(level = currentLevel) {
    return (campaignTutorialSquads[level] || []).filter(id =>
        typeof survivorDetails === "undefined" || survivorDetails[id]
    );
}
function getCampaignOpeningSquadIds() {
    return getCampaignSquadIds(1);
}
function getCampaignLevelTwoSquadIds() {
    return getCampaignSquadIds(2);
}
function isOpeningCampaignOperation() {
    return gameMode === "campaign" && currentLevel === 1;
}
function isSecondCampaignOperation() {
    return gameMode === "campaign" && currentLevel === 2;
}
function isGuidedCampaignOperation() {
    return gameMode === "campaign" && Boolean(campaignTutorialSquads[currentLevel]);
}

// Sandbox deliberately shares Endless's wave, enemy, and economy rules, but
// never writes records, awards leaderboard coins, or exposes score submission.
function isEndlessStyleMode() {
    return gameMode === "endless" || gameMode === "sandbox";
}

let currentDailyChallenge = null;
let activeDailyChallenge = null;
let pendingDailyScore = null;
let returnDailyScoreSubmission = null;
let restartDailyScoreSubmission = null;
let dailyLastCompletedAt = null;
let activeCampaignRunId = null;
let activeEndlessRunId = null;
let pendingEndlessScore = null;
let returnEndlessScoreSubmission = null;
// Endless telemetry is kept in memory during a run and only uploaded after
// the player explicitly submits an Endless score.  It contains aggregate
// gameplay facts (waves, enemy groups, leaks, economy, roster levels, and
// per-survivor performance/action summaries),
// never chat, account credentials, or device identifiers.
let activeEndlessTelemetry = null;
let completedEndlessTelemetry = null;
const ENDLESS_TELEMETRY_VERSION = "0.90";
const ENDLESS_TELEMETRY_SCHEMA_VERSION = 2;
let profileReturnScreen = "menu";

const campaignRoads = {
    // LEVEL 1 — THE OUTSKIRTS
    1: [
        { x: 0, y: 100 },
        { x: 300, y: 100 },
        { x: 300, y: 260 },
        { x: 600, y: 260 },
        { x: 600, y: 400 },
        { x: 960, y: 400 }
    ],

    // LEVEL 2 — ABANDONED HIGHWAY
    2: [
        { x: 0, y: 100 },
        { x: 220, y: 100 },
        { x: 220, y: 250 },
        { x: 450, y: 250 },
        { x: 450, y: 100 },
        { x: 700, y: 100 },
        { x: 700, y: 350 },
        { x: 500, y: 350 },
        { x: 500, y: 500 },
        { x: 960, y: 500 }
    ],

    // LEVEL 3 — INDUSTRIAL DISTRICT
    3: [
        { x: 0, y: 450 },
        { x: 180, y: 450 },
        { x: 180, y: 300 },
        { x: 380, y: 300 },
        { x: 380, y: 120 },
        { x: 600, y: 120 },
        { x: 600, y: 280 },
        { x: 800, y: 280 },
        { x: 800, y: 450 },
        { x: 960, y: 450 }
    ],

    // LEVEL 4 — OVERGROWN SUBURB
    4: [
        { x: 0, y: 180 },
        { x: 160, y: 180 },
        { x: 160, y: 380 },
        { x: 350, y: 380 },
        { x: 350, y: 220 },
        { x: 550, y: 220 },
        { x: 550, y: 450 },
        { x: 760, y: 450 },
        { x: 760, y: 150 },
        { x: 960, y: 150 }
    ],

    // LEVEL 5 — RUINED DOWNTOWN
    5: [
        { x: 0, y: 80 },
        { x: 250, y: 80 },
        { x: 250, y: 200 },
        { x: 500, y: 200 },
        { x: 500, y: 450 },
        { x: 300, y: 450 },
        { x: 300, y: 320 },
        { x: 700, y: 320 },
        { x: 700, y: 120 },
        { x: 960, y: 120 }
    ],

    // LEVEL 6 — THE SAFE ZONE
    6: [
        { x: 0, y: 500 },
        { x: 180, y: 500 },
        { x: 180, y: 350 },
        { x: 400, y: 350 },
        { x: 400, y: 150 },
        { x: 620, y: 150 },
        { x: 620, y: 400 },
        { x: 820, y: 400 },
        { x: 820, y: 250 },
        { x: 960, y: 250 }
    ]
};

let roadPoints = campaignRoads[currentLevel];

// Check whether a position is close to the road
function isOnRoad(x, y) {
    for (let i = 0; i < roadPoints.length - 1; i++) {
        const a = roadPoints[i];
        const b = roadPoints[i + 1];

        if (a.y === b.y) {
            // Horizontal road section
            if (
                x >= Math.min(a.x, b.x) - roadBuffer &&
                x <= Math.max(a.x, b.x) + roadBuffer &&
                Math.abs(y - a.y) < roadBuffer
            ) {
                return true;
            }
        } else if (a.x === b.x) {
            // Vertical road section
            if (
                y >= Math.min(a.y, b.y) - roadBuffer &&
                y <= Math.max(a.y, b.y) + roadBuffer &&
                Math.abs(x - a.x) < roadBuffer
            ) {
                return true;
            }
        }
    }

    return false;
}

// Placement uses the survivor's full sprite footprint, not just its center.
// Road segments are axis-aligned, so expanding each segment's bounds by the
// rendered road edge gives the same clearance at straightaways and turns.
function isSurvivorFootprintOnRoad(x, y) {
    const left = x - survivorPlacementHalfWidth;
    const right = x + survivorPlacementHalfWidth;
    const top = y - survivorPlacementHalfHeight;
    const bottom = y + survivorPlacementHalfHeight;

    for (let i = 0; i < roadPoints.length - 1; i++) {
        const a = roadPoints[i];
        const b = roadPoints[i + 1];
        const roadLeft = Math.min(a.x, b.x) - survivorPlacementRoadBuffer;
        const roadRight = Math.max(a.x, b.x) + survivorPlacementRoadBuffer;
        const roadTop = Math.min(a.y, b.y) - survivorPlacementRoadBuffer;
        const roadBottom = Math.max(a.y, b.y) + survivorPlacementRoadBuffer;

        if (
            right >= roadLeft && left <= roadRight &&
            bottom >= roadTop && top <= roadBottom
        ) {
            return true;
        }
    }

    return false;
}

function isOutsideSurvivorPlacementBounds(x, y) {
    return x < survivorPlacementHalfWidth ||
        x > canvas.width - survivorPlacementHalfWidth ||
        y < survivorPlacementHalfHeight ||
        y > canvas.height - survivorPlacementHalfHeight;
}


const mapThemes = {
    1: {
        ground: ["#5f5c49", "#414035"], grain: ["#827655", "#716b4d", "#50503f", "#94845e"],
        roadEdge: "#292b27", roadShoulder: "#5b5648", road: "#817258", roadWear: "#938064",
        structure: "#555044", roof: "#70644d", accent: "#bc9560", foliage: ["#383c31", "#4f513c", "#696347"],
        propTypes: ["building", "tree", "wreck", "debris"]
    },
    2: {
        ground: ["#515356", "#35383a"], grain: ["#716e68", "#5d6062", "#45484a", "#817a70"],
        roadEdge: "#1d2022", roadShoulder: "#393d3f", road: "#292d30", roadWear: "#383c3e",
        structure: "#414347", roof: "#595b5c", accent: "#d0ac68", foliage: ["#343a34", "#4a5044", "#5b5945"],
        centerStripe: "#c7a966", propTypes: ["wreck", "barrier", "debris", "building"]
    },
    3: {
        ground: ["#5d574d", "#3b3b36"], grain: ["#817362", "#655f52", "#515149", "#8a806d"],
        roadEdge: "#242624", roadShoulder: "#4b4942", road: "#393a36", roadWear: "#575248",
        structure: "#4d4942", roof: "#61564b", accent: "#a98b63", foliage: ["#353d37", "#465247", "#59604b"],
        propTypes: ["building", "hazard", "debris", "tank"]
    },
    4: {
        ground: ["#566048", "#384234"], grain: ["#778257", "#626f4c", "#46513e", "#8a815c"],
        roadEdge: "#242924", roadShoulder: "#4c5042", road: "#625d50", roadWear: "#77705c",
        structure: "#4a493e", roof: "#625b47", accent: "#b69a64", foliage: ["#2f4032", "#40543b", "#607047"],
        propTypes: ["building", "tree", "wreck", "debris"]
    },
    5: {
        ground: ["#535455", "#36383a"], grain: ["#746c62", "#606264", "#45484a", "#82796c"],
        roadEdge: "#202224", roadShoulder: "#414343", road: "#565653", roadWear: "#696456",
        structure: "#414447", roof: "#5b5b57", accent: "#d0a35c", foliage: ["#333c36", "#475044", "#5c5944"],
        centerStripe: "#c69d58", propTypes: ["building", "tank", "barrier", "debris"]
    },
    6: {
        ground: ["#5d574a", "#3c3b34"], grain: ["#837557", "#6d6653", "#4d4e41", "#938367"],
        roadEdge: "#242622", roadShoulder: "#575347", road: "#79715e", roadWear: "#91836a",
        structure: "#555247", roof: "#77705c", accent: "#c49b62", foliage: ["#354034", "#4b543b", "#686549"],
        propTypes: ["building", "barrier", "tree", "debris"]
    }
};

const mapLandmarks = {
    1: [
        { type: "building", x: 128, y: 344, w: 96, h: 60 }, { type: "tree", x: 452, y: 48, size: 40 },
        { type: "wreck", x: 764, y: 304, w: 58, h: 30, angle: 0 }, { type: "debris", x: 76, y: 464, size: 40 },
        { type: "tree", x: 862, y: 222, size: 46 }, { type: "building", x: 434, y: 466, w: 74, h: 48 },
        { type: "tree", x: 104, y: 232, size: 34 }, { type: "wreck", x: 820, y: 56, w: 48, h: 26, angle: 0 },
        { type: "building", x: 860, y: 478, w: 66, h: 42 }
    ],
    2: [
        { type: "wreck", x: 102, y: 347, w: 64, h: 32, angle: 0 }, { type: "building", x: 340, y: 166, w: 82, h: 48 },
        { type: "barrier", x: 825, y: 74, w: 68, h: 24, angle: 0 }, { type: "building", x: 808, y: 410, w: 94, h: 58 },
        { type: "tree", x: 94, y: 224, size: 38 }, { type: "debris", x: 322, y: 428, size: 44 },
        { type: "tree", x: 92, y: 432, size: 38 }, { type: "barrier", x: 340, y: 426, w: 62, h: 22, angle: 0 },
        { type: "wreck", x: 828, y: 414, w: 56, h: 30, angle: 0 }, { type: "building", x: 858, y: 202, w: 62, h: 42 }
    ],
    3: [
        { type: "building", x: 92, y: 176, w: 98, h: 62 }, { type: "hazard", x: 716, y: 78, size: 48 },
        { type: "tank", x: 878, y: 178, size: 48 }, { type: "debris", x: 256, y: 462, size: 48 },
        { type: "building", x: 88, y: 86, w: 60, h: 44 }, { type: "hazard", x: 692, y: 488, size: 38 },
        { type: "tree", x: 92, y: 370, size: 38 }, { type: "building", x: 276, y: 196, w: 70, h: 48 },
        { type: "tank", x: 716, y: 370, size: 40 }, { type: "debris", x: 882, y: 360, size: 36 }
    ],
    4: [
        { type: "building", x: 78, y: 64, w: 86, h: 54 }, { type: "building", x: 260, y: 142, w: 76, h: 48 },
        { type: "tree", x: 654, y: 340, size: 52 }, { type: "wreck", x: 650, y: 84, w: 62, h: 30, angle: 0 },
        { type: "tree", x: 872, y: 500, size: 46 }, { type: "debris", x: 432, y: 490, size: 40 },
        { type: "building", x: 86, y: 490, w: 72, h: 46 }, { type: "tree", x: 468, y: 74, size: 40 },
        { type: "wreck", x: 674, y: 505, w: 56, h: 30, angle: Math.PI / 2 }, { type: "building", x: 876, y: 82, w: 68, h: 44 }
    ],
    5: [
        { type: "building", x: 112, y: 186, w: 90, h: 58 }, { type: "tank", x: 558, y: 500, size: 48 },
        { type: "wreck", x: 852, y: 258, w: 66, h: 34, angle: 0 }, { type: "building", x: 164, y: 390, w: 74, h: 48 },
        { type: "tank", x: 850, y: 404, size: 40 }, { type: "debris", x: 574, y: 174, size: 40 },
        { type: "tree", x: 104, y: 312, size: 40 }, { type: "barrier", x: 844, y: 450, w: 68, h: 22, angle: 0 },
        { type: "building", x: 600, y: 72, w: 72, h: 44 }, { type: "debris", x: 880, y: 206, size: 42 }
    ],
    6: [
        { type: "building", x: 80, y: 244, w: 94, h: 60 }, { type: "tree", x: 282, y: 214, size: 42 },
        { type: "wreck", x: 510, y: 274, w: 58, h: 30, angle: 0 }, { type: "barrier", x: 726, y: 240, w: 74, h: 26, angle: 0 },
        { type: "building", x: 890, y: 80, w: 78, h: 48 }, { type: "debris", x: 78, y: 160, size: 42 },
        { type: "tree", x: 100, y: 82, size: 38 }, { type: "building", x: 300, y: 78, w: 70, h: 42 },
        { type: "barrier", x: 712, y: 116, w: 68, h: 22, angle: 0 }, { type: "wreck", x: 902, y: 474, w: 56, h: 30, angle: Math.PI / 2 }
    ]
};

function traceMapRoad() {
    ctx.beginPath();
    ctx.moveTo(roadPoints[0].x, roadPoints[0].y);
    for (let i = 1; i < roadPoints.length; i++) {
        ctx.lineTo(roadPoints[i].x, roadPoints[i].y);
    }
}

function isMapAreaClearOfRoad(x, y, width, height) {
    const left = x - width / 2;
    const top = y - height / 2;
    const columns = Math.max(2, Math.ceil(width / 12));
    const rows = Math.max(2, Math.ceil(height / 12));

    if (left < 8 || top < 8 || left + width > canvas.width - 8 || top + height > canvas.height - 8) return false;

    for (let row = 0; row <= rows; row++) {
        for (let column = 0; column <= columns; column++) {
            if (isOnRoad(left + width * column / columns, top + height * row / rows)) return false;
        }
    }
    return true;
}

function drawMapGround(theme) {
    ctx.fillStyle = theme.ground[1];
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Broad, stepped color patches keep the ground textured without losing the pixel-art look.
    for (let i = 0; i < 112; i++) {
        const size = 16 + Math.floor(seededRandom() * 6) * 6;
        const x = Math.floor(seededRandom() * (canvas.width - size) / 2) * 2;
        const y = Math.floor(seededRandom() * (canvas.height - size) / 2) * 2;
        if (isOnRoad(x + size / 2, y + size / 2)) continue;
        ctx.globalAlpha = 0.09 + seededRandom() * 0.08;
        ctx.fillStyle = i % 4 === 0
            ? theme.ground[0]
            : theme.grain[Math.floor(seededRandom() * theme.grain.length)];
        ctx.fillRect(x, y, size, Math.floor(size * (0.35 + seededRandom() * 0.65) / 2) * 2);
    }

    for (let i = 0; i < 46; i++) {
        const clusterX = Math.floor(seededRandom() * canvas.width / 2) * 2;
        const clusterY = Math.floor(seededRandom() * canvas.height / 2) * 2;
        for (let j = 0; j < 7; j++) {
            const size = 2 + Math.floor(seededRandom() * 4) * 2;
            const x = Math.max(0, Math.min(canvas.width - size,
                Math.floor((clusterX + (seededRandom() - 0.5) * 30) / 2) * 2));
            const y = Math.max(0, Math.min(canvas.height - size,
                Math.floor((clusterY + (seededRandom() - 0.5) * 24) / 2) * 2));
            if (isOnRoad(x + size / 2, y + size / 2)) continue;
            ctx.globalAlpha = 0.22 + seededRandom() * 0.2;
            ctx.fillStyle = theme.grain[Math.floor(seededRandom() * theme.grain.length)];
            ctx.fillRect(x, y, size, size);
        }
    }

    for (let i = 0; i < 460; i++) {
        const size = 2 + Math.floor(seededRandom() * 4) * 2;
        const x = Math.floor(seededRandom() * (canvas.width - size) / 2) * 2;
        const y = Math.floor(seededRandom() * (canvas.height - size) / 2) * 2;
        if (isOnRoad(x + size / 2, y + size / 2)) continue;
        ctx.globalAlpha = 0.12 + seededRandom() * 0.18;
        ctx.fillStyle = theme.grain[Math.floor(seededRandom() * theme.grain.length)];
        ctx.fillRect(x, y, size, size);
    }
    ctx.globalAlpha = 1;
}

// A quiet lighting pass gives the flat ground a little more volume while
// preserving the stepped, pixel-art palette. It is baked into mapCanvas so
// previews and the live battlefield share the same finish.
function drawMapGroundDepth(theme) {
    ctx.save();

    const light = ctx.createRadialGradient(
        canvas.width * 0.28,
        canvas.height * 0.18,
        20,
        canvas.width * 0.28,
        canvas.height * 0.18,
        canvas.width * 0.82
    );
    light.addColorStop(0, "rgba(255, 236, 177, 0.09)");
    light.addColorStop(0.48, "rgba(210, 220, 157, 0.025)");
    light.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const lowerShade = ctx.createLinearGradient(0, canvas.height * 0.42, 0, canvas.height);
    lowerShade.addColorStop(0, "rgba(7, 10, 10, 0)");
    lowerShade.addColorStop(1, "rgba(7, 10, 10, 0.16)");
    ctx.fillStyle = lowerShade;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // A few broad pixel blocks make large empty areas read as terrain rather
    // than a single flat color. Keep them very subtle so units remain the
    // visual focus.
    ctx.globalAlpha = 0.055;
    ctx.fillStyle = theme.ground[0];
    for (let i = 0; i < 8; i++) {
        const width = 56 + (i % 3) * 24;
        const height = 18 + (i % 2) * 12;
        const x = Math.round(((i * 137 + currentLevel * 41) % (canvas.width - width)) / 4) * 4;
        const y = Math.round(((i * 83 + currentLevel * 29) % (canvas.height - height)) / 4) * 4;
        if (!isOnRoad(x + width / 2, y + height / 2)) {
            ctx.fillRect(x, y, width, height);
        }
    }

    ctx.restore();
}

function drawMapRoad(theme) {
    ctx.save();
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";

    traceMapRoad();
    ctx.strokeStyle = theme.roadEdge;
    ctx.lineWidth = roadWidth + 14;
    ctx.stroke();

    traceMapRoad();
    ctx.strokeStyle = theme.roadShoulder;
    ctx.lineWidth = roadWidth + 6;
    ctx.stroke();

    traceMapRoad();
    ctx.strokeStyle = theme.road;
    ctx.lineWidth = roadWidth;
    ctx.stroke();

    traceMapRoad();
    ctx.strokeStyle = theme.roadWear;
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 24]);
    ctx.stroke();
    ctx.setLineDash([]);

    if (theme.centerStripe) {
        traceMapRoad();
        ctx.strokeStyle = theme.centerStripe;
        ctx.globalAlpha = 0.78;
        ctx.lineWidth = 2;
        ctx.setLineDash([18, 20]);
        ctx.stroke();
    }

    // A restrained inner highlight separates the drivable lane from its
    // shoulder and gives turns a little material depth without changing the
    // collision path or road width.
    traceMapRoad();
    ctx.strokeStyle = "rgba(255, 239, 183, 0.075)";
    ctx.globalAlpha = 1;
    ctx.lineWidth = Math.max(2, roadWidth - 12);
    ctx.setLineDash([]);
    ctx.stroke();

    traceMapRoad();
    ctx.strokeStyle = "rgba(26, 25, 21, 0.18)";
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 36]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
}

function drawMapBuilding(item, theme) {
    const { x, y, w, h } = item;
    const left = Math.round(x - w / 2);
    const top = Math.round(y - h / 2);
    ctx.save();
    const buildingWidth = Math.round(w);
    const buildingHeight = Math.round(h);
    ctx.fillStyle = "#171916";
    ctx.fillRect(left + 8, top + 8, buildingWidth, buildingHeight);
    ctx.fillStyle = "#222523";
    ctx.fillRect(left - 4, top - 4, buildingWidth + 8, buildingHeight + 8);
    ctx.fillStyle = theme.structure;
    ctx.fillRect(left, top, buildingWidth, buildingHeight);
    ctx.fillStyle = "#333631";
    ctx.fillRect(left + 4, top + 4, buildingWidth - 8, buildingHeight - 8);
    ctx.fillStyle = theme.roof;
    ctx.fillRect(left + 8, top + 8, buildingWidth - 16, buildingHeight - 16);

    // Broken roof slabs, exposed rooms and a stepped-in missing corner read as a ruin.
    ctx.fillStyle = "#343632";
    ctx.fillRect(left + 12, top + 12, Math.round(buildingWidth * 0.34), Math.round(buildingHeight * 0.28));
    ctx.fillRect(left + Math.round(buildingWidth * 0.58), top + Math.round(buildingHeight * 0.49), Math.round(buildingWidth * 0.24), Math.round(buildingHeight * 0.27));
    ctx.fillStyle = "#252a28";
    ctx.fillRect(left + Math.round(buildingWidth * 0.4), top + 12, Math.round(buildingWidth * 0.24), Math.round(buildingHeight * 0.42));
    ctx.fillRect(left + Math.round(buildingWidth * 0.4), top + Math.round(buildingHeight * 0.36), Math.round(buildingWidth * 0.38), 5);
    ctx.fillStyle = "#1b1d1c";
    ctx.fillRect(left + Math.round(buildingWidth * 0.74), top + 8, Math.round(buildingWidth * 0.26), Math.round(buildingHeight * 0.2));
    ctx.fillStyle = theme.accent;
    ctx.globalAlpha = 0.72;
    ctx.fillRect(left + 10, top + 6, Math.max(8, Math.round(buildingWidth * 0.2)), 3);
    ctx.fillRect(left + Math.round(buildingWidth * 0.52), top + buildingHeight - 7, Math.max(8, Math.round(buildingWidth * 0.18)), 3);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#282b29";
    ctx.fillRect(left + Math.round(buildingWidth * 0.43), top + buildingHeight - 11, 8, 11);
    ctx.fillStyle = "#77705c";
    ctx.fillRect(left - 7, top + buildingHeight - 10, 7, 5);
    ctx.fillRect(left + buildingWidth - 2, top + 13, 6, 6);
    ctx.fillRect(left + buildingWidth - 12, top + buildingHeight - 1, 8, 5);
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = theme.accent;
    ctx.fillRect(left + buildingWidth - 7, top + buildingHeight - 7, 3, 3);
    ctx.restore();
}

function drawMapTree(item, theme) {
    const { x, y, size } = item;
    const colors = theme.foliage;
    const px = Math.round(x / 2) * 2;
    const py = Math.round(y / 2) * 2;
    const s = Math.round(size / 2) * 2;
    ctx.save();
    const left = px - s / 2;
    const top = py - s / 2;
    ctx.fillStyle = "#22251e";
    ctx.fillRect(left + 6, top + 8, s - 8, s - 8);
    ctx.fillStyle = "#403a2d";
    ctx.fillRect(px - 3, py - 2, 6, Math.round(s * 0.34));

    // Layered square leaf clusters create a stepped canopy rather than a smooth circle.
    ctx.fillStyle = colors[0];
    ctx.fillRect(left + 8, top + 6, s - 16, s - 14);
    ctx.fillRect(left + 2, top + 12, s - 4, s - 24);
    ctx.fillRect(left + 12, top + 2, s - 24, s - 4);
    ctx.fillStyle = colors[1];
    ctx.fillRect(left + 8, top + 8, Math.round(s * 0.36), Math.round(s * 0.26));
    ctx.fillRect(left + Math.round(s * 0.52), top + Math.round(s * 0.42), Math.round(s * 0.32), Math.round(s * 0.24));
    ctx.fillStyle = colors[2];
    ctx.fillRect(left + Math.round(s * 0.34), top + 5, 6, 6);
    ctx.fillRect(left + Math.round(s * 0.18), top + Math.round(s * 0.58), 4, 4);
    ctx.restore();
}

function drawMapWreck(item, theme) {
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.angle || 0);
    const pixel = value => Math.round(value / 2) * 2;
    const w = Math.round(item.w);
    const h = Math.round(item.h);
    ctx.fillStyle = "#20211e";
    ctx.fillRect(pixel(-w / 2 + 4), pixel(-h / 2 + 6), w, h);
    ctx.fillStyle = "#161819";
    ctx.fillRect(pixel(-w * 0.4), pixel(-h * 0.5), pixel(w * 0.17), pixel(h * 0.25));
    ctx.fillRect(pixel(w * 0.23), pixel(-h * 0.5), pixel(w * 0.17), pixel(h * 0.25));
    ctx.fillRect(pixel(-w * 0.4), pixel(h * 0.25), pixel(w * 0.17), pixel(h * 0.25));
    ctx.fillRect(pixel(w * 0.23), pixel(h * 0.25), pixel(w * 0.17), pixel(h * 0.25));

    // A clipped, stepped body and separated cab make the wreck read as a vehicle at game scale.
    ctx.fillStyle = theme.structure;
    ctx.beginPath();
    ctx.moveTo(pixel(-w * 0.3), pixel(-h * 0.5));
    ctx.lineTo(pixel(w * 0.28), pixel(-h * 0.5));
    ctx.lineTo(pixel(w * 0.42), pixel(-h * 0.28));
    ctx.lineTo(pixel(w * 0.42), pixel(h * 0.28));
    ctx.lineTo(pixel(w * 0.28), pixel(h * 0.5));
    ctx.lineTo(pixel(-w * 0.3), pixel(h * 0.5));
    ctx.lineTo(pixel(-w * 0.44), pixel(h * 0.28));
    ctx.lineTo(pixel(-w * 0.44), pixel(-h * 0.25));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#263033";
    ctx.fillRect(pixel(-w * 0.12), pixel(-h * 0.34), pixel(w * 0.32), pixel(h * 0.68));
    ctx.fillStyle = theme.roof;
    ctx.fillRect(pixel(-w * 0.08), pixel(-h * 0.23), pixel(w * 0.24), pixel(h * 0.46));
    ctx.fillStyle = "#839092";
    ctx.globalAlpha = 0.7;
    ctx.fillRect(pixel(-w * 0.06), pixel(-h * 0.3), pixel(w * 0.2), pixel(h * 0.12));
    ctx.fillRect(pixel(-w * 0.06), pixel(h * 0.18), pixel(w * 0.2), pixel(h * 0.1));
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.accent;
    ctx.fillRect(pixel(w * 0.3), pixel(-h * 0.3), 4, 4);
    ctx.fillStyle = "#9b4637";
    ctx.fillRect(pixel(-w * 0.36), pixel(h * 0.28), 4, 4);
    ctx.restore();
}

function drawMapTank(item, theme) {
    const size = item.size;
    const x = Math.round(item.x / 2) * 2;
    const y = Math.round(item.y / 2) * 2;
    const radius = Math.round(size / 4) * 2;
    const drawDisk = (centerX, centerY, diskRadius, color) => {
        ctx.fillStyle = color;
        for (let row = -diskRadius; row <= diskRadius; row += 4) {
            const span = Math.floor(Math.sqrt(Math.max(0, diskRadius * diskRadius - row * row)) / 4) * 4;
            ctx.fillRect(centerX - span, centerY + row, span * 2, 4);
        }
    };

    ctx.save();
    drawDisk(x + 4, y + 6, radius, "#1f211f");
    drawDisk(x, y, radius, "#252827");
    drawDisk(x, y, radius - 4, theme.structure);
    ctx.globalAlpha = 0.72;
    for (let row = -radius + 4; row <= radius - 4; row += 4) {
        const outer = Math.floor(Math.sqrt(Math.max(0, (radius - 4) ** 2 - row ** 2)) / 4) * 4;
        const inner = Math.floor(Math.sqrt(Math.max(0, (radius - 10) ** 2 - row ** 2)) / 4) * 4;
        if (outer > inner) {
            ctx.fillStyle = theme.accent;
            ctx.fillRect(x - outer, y + row, outer - inner, 4);
            ctx.fillRect(x + inner, y + row, outer - inner, 4);
        }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.roof;
    ctx.fillRect(x - 4, y - 4, 8, 8);
    ctx.fillStyle = "#242827";
    ctx.fillRect(x - 2, y - 2, 4, 4);
    ctx.restore();
}

function drawMapBarrier(item, theme) {
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.angle || 0);
    const count = 3;
    const segment = Math.floor(item.w / count / 2) * 2;
    for (let i = 0; i < count; i++) {
        const x = -Math.floor(item.w / 2) + i * segment;
        ctx.fillStyle = "#11131588";
        ctx.fillRect(x + 4, -Math.floor(item.h / 2) + 5, segment - 4, item.h);
        ctx.fillStyle = i % 2 ? theme.roof : theme.structure;
        ctx.fillRect(x, -Math.floor(item.h / 2), segment - 2, item.h);
        ctx.fillStyle = theme.accent;
        ctx.globalAlpha = 0.45;
        ctx.fillRect(x + 4, -Math.floor(item.h / 2) + 4, segment - 8, 4);
        ctx.globalAlpha = 1;
    }
    ctx.restore();
}

function drawMapHazard(item, theme) {
    const size = Math.round(item.size / 4) * 4;
    const x = Math.round(item.x / 2) * 2;
    const y = Math.round(item.y / 2) * 2;
    ctx.save();
    for (let row = -size / 3; row <= size / 3; row += 4) {
        const inset = Math.abs(row) < size / 8 ? 0 : 6;
        const width = Math.floor((size * 0.55 - inset) / 4) * 4;
        ctx.fillStyle = "#343c38";
        ctx.fillRect(x - width, y + row, width * 2, 4);
        if (row < 0) {
            ctx.fillStyle = "#777665";
            ctx.globalAlpha = 0.7;
            ctx.fillRect(x - width + 8, y + row, Math.max(4, width - 16), 4);
            ctx.globalAlpha = 1;
        }
    }
    ctx.fillStyle = theme.accent;
    ctx.fillRect(x + 10, y - 4, 8, 4);
    ctx.fillStyle = "#282d2a";
    ctx.fillRect(x - 13, y + 8, 8, 4);
    ctx.restore();
}

function drawMapDebris(item, theme) {
    const size = Math.round(item.size / 2) * 2;
    const xCenter = Math.round(item.x / 2) * 2;
    const yCenter = Math.round(item.y / 2) * 2;
    ctx.save();
    ctx.fillStyle = "#11131566";
    ctx.fillRect(Math.round((xCenter - size * 0.46 + 4) / 2) * 2,
        Math.round((yCenter - size * 0.28 + 6) / 2) * 2,
        Math.round(size * 0.92 / 2) * 2,
        Math.round(size * 0.56 / 2) * 2);
    for (let i = 0; i < 12; i++) {
        const piece = 4 + Math.floor(seededRandom() * 4) * 2;
        const x = Math.round((xCenter + (seededRandom() - 0.5) * size * 0.9) / 2) * 2;
        const y = Math.round((yCenter + (seededRandom() - 0.5) * size * 0.65) / 2) * 2;
        ctx.fillStyle = i % 5 === 0 ? theme.accent : theme.grain[i % theme.grain.length];
        ctx.globalAlpha = i % 5 === 0 ? 0.65 : 0.88;
        ctx.fillRect(x, y, piece, piece);
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = "#202321";
        ctx.fillRect(x + piece - 2, y + piece - 2, 2, 2);
    }
    ctx.restore();
}

function drawMapLandmarks(theme) {
    for (const item of mapLandmarks[currentLevel] || []) {
        const width = item.w || item.size || 36;
        const height = item.h || item.size || 36;
        if (!isMapAreaClearOfRoad(item.x, item.y, width, height)) continue;

        if (item.type === "building") drawMapBuilding(item, theme);
        else if (item.type === "tree") drawMapTree(item, theme);
        else if (item.type === "wreck") drawMapWreck(item, theme);
        else if (item.type === "tank") drawMapTank(item, theme);
        else if (item.type === "barrier") drawMapBarrier(item, theme);
        else if (item.type === "hazard") drawMapHazard(item, theme);
        else if (item.type === "debris") drawMapDebris(item, theme);
    }
}

// Draw visual scenery only. The campaign road points and movement rules stay unchanged.
function drawMap() {
    randomSeed = 12345 + currentLevel * 7919;
    const theme = mapThemes[currentLevel] || mapThemes[1];

    drawMapGround(theme);
    drawMapGroundDepth(theme);
    drawMapRoad(theme);
    drawMapLandmarks(theme);

    mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
    mapCtx.drawImage(canvas, 0, 0);

    const levelPreview = document.getElementById("level" + currentLevel + "MapPreview");
    if (levelPreview) {
        try {
            const previewImage = mapCanvas.toDataURL("image/png");
            levelPreview.src = previewImage;
            if (currentLevel === 1) {
                const campaignPreview = document.getElementById("campaignRoutePreview");
                if (campaignPreview) campaignPreview.src = previewImage;
            }
        } catch (error) {
            console.error("Could not export level map preview:", error);
        }
    }
}

// Create the saved map canvas
const mapCanvas = document.createElement("canvas");
mapCanvas.width = canvas.width;
mapCanvas.height = canvas.height;

const mapCtx = mapCanvas.getContext("2d");

// Draw the first map
drawMap();
function generateLevelPreviews() {
    const savedLevel = currentLevel;
    const savedRoadPoints = roadPoints;
    const savedRandomSeed = randomSeed;

    for (let level = 1; level <= 6; level++) {
        currentLevel = level;
        roadPoints = campaignRoads[level];
        randomSeed = 12345;

        drawMap();
    }

    currentLevel = savedLevel;
    roadPoints = savedRoadPoints;
    randomSeed = savedRandomSeed;

    drawMap();
}
generateLevelPreviews();

 // Survivors placed by the player
const survivors = [];
let inspectedSurvivor = null;

 // Enemies currently on the battlefield
const enemies = [];
const bullets = [];
const impactPixels = [];
const blastEffects = [];
const floatingDamageNumbers = [];
let playerHealth = 100;
let totalEnemiesDefeated = 0;
// A leak should hurt, but one mistake should not erase an otherwise good run.
// Damage rises gently with Endless milestones in spawnEnemy below.
const enemyDamage = 7;

const enemyProfiles = {
    spider: {
        image: spiderImage,
        baseHealth: 32,
        speed: 69,
        size: 22,
        spriteWidth: 44,
        spriteHeight: 44,
        // The PNGs have transparent padding.  Keep the lowest opaque pixel
        // on the road centerline instead of centering the full canvas.
        spriteBottomRatio: 24 / 32,
        leakDamage: enemyDamage
    },
    // Spider variants keep late waves from feeling like a single repeated
    // enemy while making the differences readable at a glance: runners are
    // fragile but urgent, brutes are durable but give the defense more time.
    spiderRunner: {
        image: spiderImage,
        baseHealth: 18,
        speed: 106,
        size: 17,
        spriteWidth: 36,
        spriteHeight: 36,
        spriteBottomRatio: 24 / 32,
        leakDamage: 6,
        variantRole: "runner",
        weaknesses: { shotgun: 1.2 }
    },
    spiderBrute: {
        image: spiderImage,
        baseHealth: 68,
        speed: 43,
        size: 28,
        spriteWidth: 54,
        spriteHeight: 54,
        spriteBottomRatio: 24 / 32,
        leakDamage: 9,
        variantRole: "brute",
        resistances: { ballistic: 0.92 }
    },
    skitter: {
        image: skitterImage,
        baseHealth: 20,
        speed: 110,
        size: 22,
        spriteWidth: 44,
        spriteHeight: 44,
        spriteBottomRatio: 27 / 32,
        leakDamage: 5,
        weaknesses: { shotgun: 1.2 }
    },
    hollow: {
        image: hollowImage,
        baseHealth: 140,
        speed: 75,
        size: 32,
        spriteWidth: 32,
        spriteHeight: 64,
        spriteBottomRatio: 58 / 64,
        leakDamage: 16,
        isMedic: true,
        healRadius: 132,
        healAmount: 10,
        weaknesses: { precision: 1.2 }
    },
    fogkeeper: {
        image: fogkeeperImage,
        baseHealth: 300,
        speed: 40,
        size: 28,
        spriteWidth: 32,
        spriteHeight: 64,
        spriteBottomRatio: 62 / 64,
        leakDamage: 12,
        isHeavy: true,
        weaknesses: { explosive: 1.15 }
    },
    heavymutant: {
        image: heavyMutantImage,
        baseHealth: 380,
        speed: 35,
        size: 28,
        spriteWidth: 32,
        spriteHeight: 64,
        spriteBottomRatio: 62 / 64,
        leakDamage: 14,
        isHeavy: true,
        weaknesses: { explosive: 1.15 }
    },
    wastelandcow: {
        image: wastelandCowImage,
        baseHealth: 140,
        // Armored cows should create pressure through durability, not by
        // sprinting past the defense.  Their slower pace leaves time to
        // reposition or bring an explosive/blunt counter online.
        speed: 40,
        size: 22,
        spriteWidth: 44,
        spriteHeight: 44,
        spriteBottomRatio: 30 / 32,
        leakDamage: enemyDamage,
        isArmored: true,
        // Armor should reward bringing a counter, not make ordinary weapons
        // feel completely useless.  The resistance and armor stack below
        // still make ballistic fire a poor choice, but leave room for skill.
        armorMultiplier: 0.72,
        // Explosives should be a clear answer to armor. Cody's armor-piercing
        // launcher still applies a small armor factor, so this multiplier
        // makes the matchup feel meaningfully better without deleting cows.
        weaknesses: { explosive: 1.45, blunt: 1.1 },
        resistances: { ballistic: 0.8 }
    },
    mutantman: {
        image: mutantManImage,
        baseHealth: 110,
        speed: 60,
        size: 22,
        spriteWidth: 44,
        spriteHeight: 44,
        spriteBottomRatio: 32 / 32,
        leakDamage: enemyDamage
    },
    mutantsnake: {
        image: mutantSnakeImage,
        baseHealth: 125,
        speed: 100,
        size: 23,
        spriteWidth: 44,
        spriteHeight: 44,
        spriteBottomRatio: 27 / 32,
        leakDamage: 6,
        isSplitter: true,
        weaknesses: { fire: 1.35 },
        resistances: { ballistic: 0.9 }
    },
    mutantsnakered: {
        image: mutantSnakeImage,
        baseHealth: 205,
        speed: 78,
        size: 26,
        spriteWidth: 48,
        spriteHeight: 48,
        spriteBottomRatio: 27 / 32,
        leakDamage: 8,
        isSplitter: true,
        isFireImmune: true,
        variantRole: "fireproof splitter",
        // A zero multiplier is intentional: both James's direct hit and his
        // burn ticks are fire damage, so this late-game variant ignores both.
        resistances: { fire: 0, ballistic: 0.9 }
    }
};

const enemyLabels = {
    spider: "SPIDER",
    spiderRunner: "RUNNER SPIDER",
    spiderBrute: "BRUTE SPIDER",
    skitter: "SKITTER",
    hollow: "THE HOLLOW",
    fogkeeper: "FOGKEEPER",
    heavymutant: "HEAVY MUTANT",
    wastelandcow: "WASTELAND COW",
    mutantman: "MUTANT MAN",
    mutantsnake: "MUTANT SNAKE",
    mutantsnakered: "RED MUTANT SNAKE"
};

const enemyDescriptions = {
    spider: "A steady baseline hostile with balanced speed and health.",
    spiderRunner: "A smaller, fragile spider that races toward the exit.",
    spiderBrute: "A larger, tougher spider that moves slowly but soaks up damage.",
    skitter: "A fast runner that is especially vulnerable to shotgun damage.",
    hollow: "A field medic that periodically heals nearby hostiles.",
    fogkeeper: "A slow heavy hostile with high health and an explosive weakness.",
    heavymutant: "A very durable heavy hostile with an explosive weakness.",
    wastelandcow: "Armored contact: resists ballistic fire but is weak to explosives and blunt hits.",
    mutantman: "A standard hostile with steady speed and health.",
    mutantsnake: "A fire-vulnerable splitter that releases two skitters when defeated.",
    mutantsnakered: "A hardened splitter that ignores fire and releases two skitters when defeated."
};

function getEnemyProfile(type) {
    return enemyProfiles[type] || enemyProfiles.spider;
}

// Damage families keep matchups readable without tying an effect to one
// particular survivor.  Custom recruits fall back to a dependable projectile
// profile unless their weapon role is recognized here.
const survivorDamageTypes = {
    mason: "ballistic",
    james: "fire",
    cody: "explosive",
    britney: "precision",
    zach: "ballistic",
    brady: "shotgun",
    selena: "melee",
    radhesh: "blunt",
    bas: "piercing",
    rork: "ballistic",
    knox: "ballistic",
    william: "fire",
    // Noah is a support-only survivor and never deals attack damage.
    noah: "blunt"
};

const damageTypeLabels = {
    ballistic: "bullet damage",
    fire: "fire damage",
    explosive: "explosive damage",
    precision: "precision damage",
    shotgun: "shotgun damage",
    melee: "melee damage",
    blunt: "blunt damage",
    piercing: "piercing damage"
};

function getSurvivorDamageType(survivor) {
    return survivorDamageTypes[survivor?.type] || "ballistic";
}

function getEnemyDamageMultiplier(enemy, damageType) {
    const profile = getEnemyProfile(enemy?.type);
    const weaknessMultiplier = Number(profile.weaknesses?.[damageType]);
    if (Number.isFinite(weaknessMultiplier)) return weaknessMultiplier;

    const resistanceMultiplier = Number(profile.resistances?.[damageType]);
    return Number.isFinite(resistanceMultiplier) ? resistanceMultiplier : 1;
}

function getEnemyWeaknessHint(type) {
    const profile = getEnemyProfile(type);
    const weaknesses = Object.entries(profile.weaknesses || {});
    const resistances = Object.entries(profile.resistances || {});
    if (!weaknesses.length && !resistances.length) return "Hostile contact";

    const weaknessText = weaknesses.slice(0, 2).map(([damageType, multiplier]) => {
        const label = damageTypeLabels[damageType] || `${damageType} damage`;
        return `WEAK ${label} +${Math.round((multiplier - 1) * 100)}%`;
    });
    const resistanceText = resistances.slice(0, 2).map(([damageType, multiplier]) => {
        const label = damageTypeLabels[damageType] || `${damageType} damage`;
        if (multiplier <= 0) return `IMMUNE TO ${label}`;
        return `RESISTS ${label} ${Math.round((multiplier - 1) * 100)}%`;
    });
    return [...weaknessText, ...resistanceText].join(" · ");
}

function groupEnemyTypes(typeCounts) {
    return Object.entries(typeCounts)
        .filter(([, count]) => count > 0)
        .flatMap(([type, count]) => Array(count).fill(type));
}

function updatePlayerHealthDisplay() {
    const health = Math.max(0, Math.min(100, playerHealth));
    const track = document.querySelector(".health-track");
    const fill = document.querySelector(".health-fill");

    document.getElementById("healthDisplay").textContent = `${health} HP`;
    document.querySelector(".health-row span").textContent = `${health}%`;
    track.setAttribute("aria-valuenow", String(health));
    fill.style.width = `${health}%`;
    fill.style.backgroundColor = health <= 25
        ? "#d95343"
        : health <= 55
            ? "#d8a15d"
            : "#b8bac1";
}

// Endless difficulty is intentionally centralized here so the late-game
// curve can be tuned without touching campaign, daily challenges, or survivor
// stats.  The first 100 waves retain the established curve; veteran pressure
// begins at wave 101 in five-wave steps.
function getEndlessDifficultyProfile(wave = currentWave) {
    const waveNumber = Math.max(1, Math.floor(Number(wave) || 1));
    const veteranWaves = Math.max(0, waveNumber - 100);
    const veteranTier = Math.floor(veteranWaves / 5);

    return {
        veteranTier,
        healthMultiplier: 1 + veteranTier * 0.06,
        speedMultiplier: 1 + Math.min(0.12, veteranTier * 0.009),
        leakDamageMultiplier: 1 + Math.min(0.35, veteranTier * 0.027),
        miniBossHealthMultiplier: 1 + veteranTier * 0.08,
        bossHealthMultiplier: 1 + veteranTier * 0.12,
        armorMultiplier: Math.max(0.6, 1 - veteranTier * 0.01),
        medicHealMultiplier: 1 + Math.min(0.5, veteranTier * 0.035),
        medicRadiusMultiplier: 1 + Math.min(0.2, veteranTier * 0.012),
        // Kills remain useful income, but late waves cannot create an
        // unlimited wallet from a capped enemy stream.
        killScrapChance: waveNumber <= 50
            ? 0.5
            : waveNumber <= 100
                ? 0.42
                : 0.34
    };
}

function getEnemyHealthForWave(type, specialRole = "normal", wave = currentWave, healthScale = 1) {
    const profile = getEnemyProfile(type);
    const waveIndex = Math.max(0, wave - 1);
    const endlessDifficulty = isEndlessStyleMode()
        ? getEndlessDifficultyProfile(wave)
        : null;
    let waveHealthScale;
    if (isEndlessStyleMode()) {
        // Endless should grow steadily instead of dropping abrupt health walls
        // at every milestone. The old additive jumps made wave 10 and wave 50
        // feel like difficulty cliffs rather than earned build checks.
        const tenWaveTier = Math.floor(waveIndex / 10);
        const twentyFiveWaveTier = Math.floor(waveIndex / 25);
        const fiftyWaveTier = Math.floor(waveIndex / 50);
        const lateEndlessRamp = Math.max(0, waveIndex - 49) * 0.004;
        waveHealthScale = 1
            + waveIndex * 0.035
            + tenWaveTier * 0.08
            + twentyFiveWaveTier * 0.12
            + fiftyWaveTier * 0.2
            + lateEndlessRamp;
    } else if (gameMode === "daily") {
        waveHealthScale = 1 + waveIndex * 0.012;
    } else {
        waveHealthScale = 1 + waveIndex * 0.035;
    }
    const bossMilestone = isEndlessStyleMode()
        ? Math.max(0, Math.floor(wave / 10) - 1)
        : 0;
    const specialHealthScale = specialRole === "boss"
        ? (1.35 + Math.min(0.6, bossMilestone * 0.08))
            * (endlessDifficulty?.bossHealthMultiplier || 1)
        : specialRole === "miniBoss"
            ? (1.25 + Math.min(0.2, Math.floor(wave / 25) * 0.04))
                * (endlessDifficulty?.miniBossHealthMultiplier || 1)
            : 1;
    const lateQualityTier = isEndlessStyleMode()
        ? Math.max(0, Math.floor((wave - 50) / 10))
        : 0;
    const lateQualityBonus = lateQualityTier > 0
        ? 1 + lateQualityTier * (
            profile.isHeavy
                ? 0.04
                : profile.isMedic
                    ? 0.03
                    : profile.isArmored
                        ? 0.025
                        : 0.01
        )
        : 1;
    const dailyHealthScale = gameMode === "daily"
        ? getDailyModifierValue("enemyHealthScale", 1)
        : 1;
    return Math.round(
        profile.baseHealth
        * waveHealthScale
        * specialHealthScale
        * healthScale
        * lateQualityBonus
        * (endlessDifficulty?.healthMultiplier || 1)
        * dailyHealthScale
    );
}

function spawnEnemy(type = "spider", specialRole = "normal", spawnOptions = {}) {
    const profile = getEnemyProfile(type);
    const waveIndex = Math.max(0, currentWave - 1);
    const endlessDifficulty = isEndlessStyleMode()
        ? getEndlessDifficultyProfile(currentWave)
        : null;
    let waveSpeedScale;
    if (isEndlessStyleMode()) {
        waveSpeedScale = (1 + Math.min(0.3, waveIndex * 0.003))
            * (endlessDifficulty?.speedMultiplier || 1);
    } else if (gameMode === "daily") {
        waveSpeedScale = 1 + Math.min(0.08, waveIndex * 0.002);
    } else {
        waveSpeedScale = 1;
    }
    const specialSpeedScale = specialRole === "boss"
        ? 0.58
        : specialRole === "miniBoss"
            ? 0.8
            : 1;
    const sizeScale = specialRole === "boss"
        ? 1.5
        : specialRole === "miniBoss"
            ? 1.25
            : 1;
    const healthScale = Number.isFinite(Number(spawnOptions.healthScale))
        ? Math.max(0.1, Number(spawnOptions.healthScale))
        : 1;
    const health = getEnemyHealthForWave(type, specialRole, currentWave, healthScale);
    const lateQualityTier = isEndlessStyleMode()
        ? Math.max(0, Math.floor((currentWave - 50) / 10))
        : 0;
    const leakScale = isEndlessStyleMode()
        ? 1 + Math.min(1.35, waveIndex * 0.012)
        : 1;
    const specialLeakScale = specialRole === "boss"
        ? 1.25
        : specialRole === "miniBoss"
            ? 1.1
            : 1;
    const lateQualityLeakBonus = lateQualityTier > 0
        ? 1 + lateQualityTier * (
            profile.isHeavy
                ? 0.02
                : profile.isMedic
                    ? 0.015
                    : profile.isArmored
                        ? 0.012
                        : 0.006
        )
        : 1;

    const dailySpeedScale = gameMode === "daily"
        ? getDailyModifierValue("enemySpeedScale", 1)
        : 1;
    const spawnedEnemy = {
        type: type,
        x: Number.isFinite(Number(spawnOptions.x)) ? Number(spawnOptions.x) : roadPoints[0].x,
        y: Number.isFinite(Number(spawnOptions.y)) ? Number(spawnOptions.y) : roadPoints[0].y,
        targetPoint: Number.isFinite(Number(spawnOptions.targetPoint))
            ? Math.max(1, Number(spawnOptions.targetPoint))
            : 1,
        visualLaneOffsetY: Number.isFinite(Number(spawnOptions.visualLaneOffsetY))
            ? Number(spawnOptions.visualLaneOffsetY)
            : roadPoints[0].y === roadPoints[1]?.y
            ? horizontalEnemyLaneVisualOffset
            : 0,
        speed: profile.speed * waveSpeedScale * specialSpeedScale * dailySpeedScale,
        size: profile.size * sizeScale,
        sizeScale,
        isMiniBoss: specialRole === "miniBoss",
        isWaveBoss: specialRole === "boss",
        isSplitChild: spawnOptions.isSplitChild === true,
        shotgunKnockbackHits: 0,
        isArmored: profile.isArmored === true,
        armorMultiplier: profile.isArmored
            ? Math.max(
                0.55,
                (profile.armorMultiplier || 1) * (endlessDifficulty?.armorMultiplier || 1)
            )
            : (profile.armorMultiplier || 1),
        isFireImmune: profile.isFireImmune === true,
        isMedic: profile.isMedic === true,
        medicHealRadius: profile.isMedic
            ? (profile.healRadius || 132) * (endlessDifficulty?.medicRadiusMultiplier || 1)
            : 0,
        medicHealAmount: profile.isMedic
            ? (profile.healAmount || 10) * (endlessDifficulty?.medicHealMultiplier || 1)
            : 0,
        medicPulseTimer: profile.isMedic ? 1.2 : 0,
        burnTimer: Number.isFinite(Number(spawnOptions.burnTimer))
            ? Math.max(0, Number(spawnOptions.burnTimer))
            : 0,
        burnTickTimer: Number.isFinite(Number(spawnOptions.burnTickTimer))
            ? Math.max(0, Number(spawnOptions.burnTickTimer))
            : 1,
        burnDamage: Number.isFinite(Number(spawnOptions.burnDamage))
            ? Math.max(0, Number(spawnOptions.burnDamage))
            : 0,
        burnSource: spawnOptions.burnSource || null,
        burnFlash: Number(spawnOptions.burnTimer) > 0 ? 0.2 : 0,
        health: health,
        maxHealth: health,
        healthTrail: health,
        leakDamage: Math.min(
            specialRole === "boss" ? 45 : specialRole === "miniBoss" ? 28 : 20,
            Math.max(1, Math.round(
                profile.leakDamage
                * leakScale
                * specialLeakScale
                * lateQualityLeakBonus
                * (endlessDifficulty?.leakDamageMultiplier || 1)
            ))
        )
    };

    enemies.push(spawnedEnemy);
    recordEndlessTelemetrySpawn(spawnedEnemy);
}

function spawnSplitterChildren(parent) {
    if (!parent || parent.isSplitChild || !getEnemyProfile(parent.type).isSplitter) return;

    const inheritedBurnTimer = Number(parent.burnTimer) > 0
        && Number(parent.burnDamage) > 0
        ? Number(parent.burnTimer)
        : 0;
    const childOffsets = [-12, 12];
    childOffsets.forEach(offset => {
        spawnEnemy("skitter", "normal", {
            x: parent.x,
            y: parent.y + offset,
            targetPoint: parent.targetPoint,
            visualLaneOffsetY: parent.visualLaneOffsetY,
            healthScale: 0.72,
            isSplitChild: true,
            // Fire carries through a split: the spawned skitters inherit the
            // snake's remaining burn duration and damage, preserving the
            // payoff for setting a splitter alight before it dies.
            burnTimer: inheritedBurnTimer,
            burnTickTimer: parent.burnTickTimer,
            burnDamage: inheritedBurnTimer > 0 ? parent.burnDamage : 0,
            burnSource: inheritedBurnTimer > 0 ? parent.burnSource : null
        });
    });

    addBlastEffect(parent.x, parent.y, 20);
}

function applyMedicPulse(medic) {
    const profile = getEnemyProfile(medic.type);
    const radius = Number.isFinite(Number(medic.medicHealRadius))
        ? Number(medic.medicHealRadius)
        : (profile.healRadius || 132);
    const healAmount = Number.isFinite(Number(medic.medicHealAmount))
        ? Number(medic.medicHealAmount)
        : (profile.healAmount || 10);
    let healedAny = false;

    for (const target of enemies) {
        if (target === medic || target.finished || target.health <= 0) continue;

        const dx = target.x - medic.x;
        const dy = target.y - medic.y;
        if (dx * dx + dy * dy > radius * radius) continue;

        const healed = Math.min(target.maxHealth, target.health + healAmount) - target.health;
        if (healed <= 0) continue;

        target.health += healed;
        target.healthTrail = Math.max(target.healthTrail ?? target.health, target.health);
        target.healFlash = 0.35;
        healedAny = true;
    }

    if (healedAny) {
        medic.healFlash = 0.35;
        blastEffects.push({
            kind: "heal",
            x: medic.x,
            y: medic.y,
            radius,
            life: 0.45,
            maxLife: 0.45
        });
    }
}

function getEndlessWaveGroups(wave) {
    // After wave 50, pressure shifts into stronger compositions instead of
    // filling the entire battlefield with disposable bodies.  Splitters and
    // milestone enemies still create urgency without turning the run into a
    // wall of overlapping sprites.
    const preFiftyWave = Math.min(wave - 1, 49);
    const lateWave = Math.max(0, wave - 50);
    const preFiftyCount = 6
        + Math.floor(preFiftyWave * 0.62)
        + Math.floor(preFiftyWave / 10) * 2
        + Math.floor(preFiftyWave / 25) * 2;
    const lateQualityCount = Math.floor(lateWave * 0.12)
        + Math.floor(lateWave / 25);
    // The opening build should need its first adjustment before wave 10.
    // Add pressure through composition and volume, never by weakening the
    // survivors the player already deployed.
    const earlyPressureBonus = wave >= 6 && wave <= 9 ? 2 : 0;
    const totalEnemies = wave === 1
        ? 6
        : Math.min(62, preFiftyCount + lateQualityCount + earlyPressureBonus);
    // Introduce counterplay before a single common weapon can carry the run
    // on its own. These are composition changes only; survivor stats stay at
    // full strength when players deploy duplicates.
    const earlyPressureWave = wave >= 6 && wave <= 12;
    const skitterRatio = Math.min(
        earlyPressureWave ? 0.3 : 0.28,
        (earlyPressureWave ? 0.19 : 0.14) + wave * 0.0016
    );
    // Rotate the specialist threats instead of presenting cows and snakes in
    // every consecutive wave. Their milestone/mini-boss appearances are still
    // allowed; this cadence controls the regular enemy groups.
    const regularCowWave = wave >= 6 && (wave - 6) % 4 === 0;
    const regularSnakeWave = wave >= 9 && (wave - 9) % 5 === 0;
    const snakeRatio = regularSnakeWave
        ? Math.min(earlyPressureWave ? 0.12 : 0.1,
            (earlyPressureWave ? 0.05 : 0.025) + (wave - 9) * 0.001)
        : 0;
    const skitterCount = wave >= 2 ? Math.max(1, Math.floor(totalEnemies * skitterRatio)) : 0;
    const snakeCount = snakeRatio > 0 ? Math.max(1, Math.floor(totalEnemies * snakeRatio)) : 0;
    // Red splitters arrive only after the early game and only on alternating
    // regular snake waves. They are fire-immune, so the late-game counterplay
    // cannot be solved by stacking James alone.
    const redSnakeWave = regularSnakeWave && wave >= 29 && (wave - 29) % 10 === 0;
    const redSnakeCount = redSnakeWave ? 1 : 0;
    const standardCount = Math.max(1, totalEnemies - skitterCount - snakeCount - redSnakeCount);
    const lateQualityTier = Math.max(0, Math.floor((wave - 50) / 10));
    // Hold the first armored contacts until wave 6 so the opening build has
    // enough time to establish a damage baseline before cow armor appears.
    const cowCount = regularCowWave
        ? Math.max(
            earlyPressureWave ? 2 : 1,
            Math.floor(standardCount * (wave >= 50 ? 0.16 : earlyPressureWave ? 0.22 : 0.14))
        )
        : 0;
    const mutantManCount = wave >= 6
        ? Math.max(1, Math.floor(standardCount * (wave >= 50 ? 0.14 : 0.12)))
        : 0;
    const hollowCount = (wave >= 10 && (wave % 5 === 0 || wave === 12)) || wave === 8
        ? 1
        : wave >= 30
            ? Math.min(wave >= 50 ? 2 : 1, Math.floor(standardCount * (wave >= 50 ? 0.028 : 0.016)))
            : 0;
    const heavyCount = wave >= 50
        ? Math.min(3, Math.max(1, Math.floor(standardCount * (0.02 + lateQualityTier * 0.003))))
        : 0;
    const fogkeeperCount = Math.ceil(heavyCount / 2);
    const heavyMutantCount = Math.floor(heavyCount / 2);
    const spiderCount = Math.max(
        1,
        standardCount - cowCount - mutantManCount - hollowCount - heavyCount
    );
    const runnerSpiderWave = wave >= 4 && wave % 3 === 1;
    const bruteSpiderWave = wave >= 8 && wave % 5 === 0;
    const runnerSpiderCount = runnerSpiderWave
        ? Math.max(1, Math.floor(spiderCount * (wave >= 50 ? 0.32 : 0.24)))
        : 0;
    const bruteSpiderCount = bruteSpiderWave
        ? Math.max(1, Math.floor(spiderCount * (wave >= 50 ? 0.24 : 0.18)))
        : 0;
    // From wave 101 onward, replace a growing slice of disposable spiders
    // with a rotating specialist batch. This raises enemy quality without
    // increasing the battlefield population beyond the existing cap.
    const veteranTier = Math.max(0, Math.floor((wave - 100) / 5));
    const lateQualitySwapCount = wave >= 101
        ? Math.min(
            Math.max(0, spiderCount - 1),
            Math.floor(spiderCount * Math.min(0.32, 0.05 + veteranTier * 0.015))
        )
        : 0;
    const qualitySpiderCount = Math.max(0, spiderCount - lateQualitySwapCount);
    const qualityRunnerCount = lateQualitySwapCount === 0
        ? runnerSpiderCount
        : runnerSpiderWave
            ? Math.min(runnerSpiderCount, Math.max(0, Math.floor(qualitySpiderCount * 0.32)))
            : 0;
    const qualityBruteCount = lateQualitySwapCount === 0
        ? bruteSpiderCount
        : bruteSpiderWave
            ? Math.min(bruteSpiderCount, Math.max(0, Math.floor(qualitySpiderCount * 0.24)))
            : 0;
    const qualityBaselineCount = Math.max(0, qualitySpiderCount - qualityRunnerCount - qualityBruteCount);
    const qualityCycle = Math.floor(wave / 5) % 4;
    const lateQualityType = wave >= 101
        ? (qualityCycle === 0
            ? "wastelandcow"
            : qualityCycle === 1
                ? "hollow"
                : qualityCycle === 2
                    ? "mutantsnake"
                    : (wave >= 130 ? "mutantsnakered" : "spiderBrute"))
        : null;
    const groups = [];
    const addGroup = (type, count, specialRole = "normal") => {
        if (count > 0) groups.push({ type, count, ...(specialRole === "normal" ? {} : { specialRole }) });
    };

    // One enemy type per batch keeps the battlefield readable and makes Cody's
    // area damage and Radhesh's sweep feel intentional.
    addGroup("spider", qualityBaselineCount);
    addGroup("spiderRunner", qualityRunnerCount);
    addGroup("spiderBrute", qualityBruteCount);
    addGroup(lateQualityType, lateQualitySwapCount);
    addGroup("wastelandcow", cowCount);
    addGroup("mutantman", mutantManCount);
    addGroup("hollow", hollowCount);
    addGroup("fogkeeper", fogkeeperCount);
    addGroup("heavymutant", heavyMutantCount);
    addGroup("skitter", skitterCount);
    addGroup("mutantsnake", snakeCount);
    addGroup("mutantsnakered", redSnakeCount);

    if (wave % 5 === 0) {
        const miniBossTypes = [
            "spider", "skitter", "wastelandcow", "mutantman",
            "mutantsnake", "mutantsnakered", "hollow", "fogkeeper", "heavymutant"
        ];
        const miniBossCount = Math.min(3, 1 + (wave >= 50 ? Math.floor((wave - 50) / 25) + 1 : 0));
        const types = Array.from({ length: miniBossCount }, (_, index) =>
            miniBossTypes[(Math.floor(wave / 5) + index) % miniBossTypes.length]
        );
        groups.push({ types, count: types.length, specialRole: "miniBoss" });
    }

    if (wave % 10 === 0) {
        const bossCount = wave >= 50 ? 2 : 1;
        const types = Array.from({ length: bossCount }, (_, index) =>
            (Math.floor(wave / 10) + index) % 2 === 0 ? "fogkeeper" : "heavymutant"
        );
        groups.push({ types, count: types.length, specialRole: "boss" });
    }

    return groups;
}

function getWaveGroups(wave) {
    if (gameMode === "daily" && activeDailyChallenge) {
        const [firstType, secondType, heavyType] = activeDailyChallenge.enemyTypes;
        const dailyEnemyCountScale = getDailyModifierValue("enemyCountScale", 1);
        const totalRegularEnemies = Math.max(
            1,
            Math.ceil((4 + Math.floor(wave * 0.75)) * dailyEnemyCountScale)
        );
        const firstBatch = Math.ceil(totalRegularEnemies * 0.55);
        const groups = [
            { type: firstType, count: firstBatch },
            { type: secondType, count: totalRegularEnemies - firstBatch }
        ].filter(group => group.count > 0);
        if (wave % 5 === 0) groups.push({ type: heavyType, count: 1 });
        return groups;
    }

    if (isEndlessStyleMode()) return getEndlessWaveGroups(wave);

    // Operation 01 is a deliberately readable tutorial arc. The first four
    // waves teach the player the basic spider/skitter rhythm, then introduce
    // armored cows after James explains their explosive weakness. Cows are
    // always the final group on their mini-boss/boss waves so the player can
    // read the threat before it reaches the safe zone.
    if (isOpeningCampaignOperation()) {
        const openingWaves = {
            1: [{ type: "spider", count: 6 }],
            2: [{ type: "spider", count: 6 }, { type: "skitter", count: 2 }],
            3: [{ type: "spider", count: 7 }, { type: "skitter", count: 3 }],
            4: [{ type: "spider", count: 8 }, { type: "skitter", count: 4 }],
            5: [{ type: "spider", count: 8 }, { type: "skitter", count: 4 }, { type: "wastelandcow", count: 1 }],
            6: [{ type: "spider", count: 8 }, { type: "skitter", count: 5 }, { type: "wastelandcow", count: 2 }],
            7: [{ type: "spider", count: 9 }, { type: "skitter", count: 5 }, { type: "wastelandcow", count: 2 }],
            8: [{ type: "spider", count: 9 }, { type: "skitter", count: 6 }, { type: "wastelandcow", count: 2 }],
            9: [{ type: "spider", count: 10 }, { type: "skitter", count: 6 }, { type: "wastelandcow", count: 2 }],
            10: [
                { type: "spider", count: 10 },
                { type: "skitter", count: 6 },
                { type: "wastelandcow", count: 2 },
                { type: "wastelandcow", count: 1, specialRole: "miniBoss" }
            ],
            11: [{ type: "spider", count: 11 }, { type: "skitter", count: 6 }, { type: "wastelandcow", count: 3 }],
            12: [{ type: "spider", count: 12 }, { type: "skitter", count: 7 }, { type: "wastelandcow", count: 3 }],
            13: [{ type: "spider", count: 12 }, { type: "skitter", count: 7 }, { type: "wastelandcow", count: 4 }],
            14: [{ type: "spider", count: 13 }, { type: "skitter", count: 8 }, { type: "wastelandcow", count: 4 }],
            15: [
                { type: "spider", count: 13 },
                { type: "skitter", count: 8 },
                { type: "wastelandcow", count: 4 },
                { type: "wastelandcow", count: 1, specialRole: "boss" }
            ]
        };
        return openingWaves[wave] || openingWaves[15];
    }

    // Operation 02 introduces mutant snakes in small, readable batches. The
    // first three waves remain familiar, then the splitter appears alone
    // before joining the later cow and medic pressure.
    if (isSecondCampaignOperation()) {
        const snakeIntroWaves = {
            1: [{ type: "spider", count: 6 }],
            2: [{ type: "spider", count: 6 }, { type: "skitter", count: 2 }],
            3: [{ type: "spider", count: 7 }, { type: "skitter", count: 3 }],
            4: [{ type: "spider", count: 7 }, { type: "skitter", count: 3 }, { type: "mutantsnake", count: 1 }],
            5: [{ type: "spider", count: 8 }, { type: "skitter", count: 4 }, { type: "mutantsnake", count: 1 }],
            6: [{ type: "spider", count: 8 }, { type: "skitter", count: 4 }, { type: "mutantsnake", count: 2 }, { type: "wastelandcow", count: 1 }],
            7: [{ type: "spider", count: 9 }, { type: "skitter", count: 5 }, { type: "mutantsnake", count: 2 }, { type: "wastelandcow", count: 1 }],
            8: [{ type: "spider", count: 9 }, { type: "skitter", count: 5 }, { type: "mutantsnake", count: 2 }, { type: "wastelandcow", count: 1 }, { type: "hollow", count: 1 }],
            9: [{ type: "spider", count: 10 }, { type: "skitter", count: 6 }, { type: "mutantsnake", count: 3 }, { type: "wastelandcow", count: 2 }],
            10: [
                { type: "spider", count: 10 },
                { type: "skitter", count: 6 },
                { type: "mutantsnake", count: 2 },
                { type: "wastelandcow", count: 2 },
                { type: "mutantsnake", count: 1, specialRole: "miniBoss" }
            ],
            11: [{ type: "spider", count: 11 }, { type: "skitter", count: 6 }, { type: "mutantsnake", count: 3 }, { type: "wastelandcow", count: 2 }, { type: "hollow", count: 1 }],
            12: [{ type: "spider", count: 12 }, { type: "skitter", count: 7 }, { type: "mutantsnake", count: 4 }, { type: "wastelandcow", count: 3 }],
            13: [{ type: "spider", count: 12 }, { type: "skitter", count: 7 }, { type: "mutantsnake", count: 4 }, { type: "wastelandcow", count: 3 }, { type: "mutantman", count: 1 }],
            14: [{ type: "spider", count: 13 }, { type: "skitter", count: 8 }, { type: "mutantsnake", count: 5 }, { type: "wastelandcow", count: 3 }, { type: "hollow", count: 1 }],
            15: [
                { type: "spider", count: 13 },
                { type: "skitter", count: 8 },
                { type: "mutantsnake", count: 4 },
                { type: "wastelandcow", count: 4 },
                { type: "mutantsnake", count: 1, specialRole: "boss" }
            ]
        };
        return snakeIntroWaves[wave] || snakeIntroWaves[15];
    }

    // Operations 03–06 continue the campaign tutorial with the starter
    // roster only. Each chapter adds one readable threat or system before
    // combining it with earlier lessons; counts stay intentionally modest so
    // players have time to reposition and buy upgrades between waves.
    const campaignWaveSets = {
        3: {
            1: [{ type: "spider", count: 6 }],
            2: [{ type: "spider", count: 6 }, { type: "skitter", count: 2 }],
            3: [{ type: "spider", count: 7 }, { type: "skitter", count: 2 }],
            4: [{ type: "spider", count: 7 }, { type: "skitter", count: 3 }, { type: "mutantman", count: 1 }],
            5: [{ type: "spider", count: 7 }, { type: "skitter", count: 3 }, { type: "mutantman", count: 1 }],
            6: [{ type: "spider", count: 8 }, { type: "skitter", count: 3 }, { type: "mutantman", count: 1 }],
            7: [{ type: "spider", count: 8 }, { type: "skitter", count: 4 }, { type: "mutantman", count: 1 }, { type: "hollow", count: 1 }],
            8: [{ type: "spider", count: 8 }, { type: "skitter", count: 4 }, { type: "mutantman", count: 2 }, { type: "hollow", count: 1 }],
            9: [{ type: "spider", count: 9 }, { type: "skitter", count: 4 }, { type: "mutantman", count: 2 }, { type: "hollow", count: 1 }],
            10: [{ type: "spider", count: 9 }, { type: "skitter", count: 4 }, { type: "mutantman", count: 2 }, { type: "hollow", count: 1 }, { type: "mutantman", count: 1, specialRole: "miniBoss" }],
            11: [{ type: "spider", count: 10 }, { type: "skitter", count: 5 }, { type: "mutantman", count: 2 }, { type: "hollow", count: 1 }],
            12: [{ type: "spider", count: 10 }, { type: "skitter", count: 5 }, { type: "mutantman", count: 3 }, { type: "hollow", count: 1 }],
            13: [{ type: "spider", count: 10 }, { type: "skitter", count: 5 }, { type: "mutantman", count: 3 }, { type: "hollow", count: 2 }],
            14: [{ type: "spider", count: 11 }, { type: "skitter", count: 5 }, { type: "mutantman", count: 3 }, { type: "hollow", count: 2 }],
            15: [{ type: "spider", count: 11 }, { type: "skitter", count: 6 }, { type: "mutantman", count: 3 }, { type: "hollow", count: 2 }, { type: "mutantman", count: 1, specialRole: "boss" }]
        },
        4: {
            1: [{ type: "spider", count: 6 }],
            2: [{ type: "spider", count: 6 }, { type: "skitter", count: 2 }],
            3: [{ type: "spider", count: 7 }, { type: "skitter", count: 2 }],
            4: [{ type: "spider", count: 7 }, { type: "skitter", count: 3 }, { type: "spiderRunner", count: 1 }],
            5: [{ type: "spider", count: 7 }, { type: "skitter", count: 3 }, { type: "spiderRunner", count: 1 }, { type: "wastelandcow", count: 1 }],
            6: [{ type: "spider", count: 8 }, { type: "skitter", count: 3 }, { type: "spiderRunner", count: 1 }, { type: "wastelandcow", count: 1 }, { type: "mutantsnake", count: 1 }],
            7: [{ type: "spider", count: 8 }, { type: "skitter", count: 4 }, { type: "spiderRunner", count: 1 }, { type: "wastelandcow", count: 1 }, { type: "mutantsnake", count: 1 }],
            8: [{ type: "spider", count: 8 }, { type: "skitter", count: 4 }, { type: "wastelandcow", count: 2 }, { type: "mutantsnake", count: 1 }, { type: "mutantman", count: 1 }],
            9: [{ type: "spider", count: 9 }, { type: "skitter", count: 4 }, { type: "wastelandcow", count: 2 }, { type: "mutantsnake", count: 2 }],
            10: [{ type: "spider", count: 9 }, { type: "skitter", count: 5 }, { type: "wastelandcow", count: 2 }, { type: "mutantsnake", count: 2 }, { type: "spiderBrute", count: 1 }, { type: "wastelandcow", count: 1, specialRole: "miniBoss" }],
            11: [{ type: "spider", count: 10 }, { type: "skitter", count: 5 }, { type: "wastelandcow", count: 2 }, { type: "mutantsnake", count: 2 }, { type: "mutantman", count: 1 }],
            12: [{ type: "spider", count: 10 }, { type: "skitter", count: 6 }, { type: "wastelandcow", count: 3 }, { type: "mutantsnake", count: 2 }, { type: "hollow", count: 1 }],
            13: [{ type: "spider", count: 10 }, { type: "skitter", count: 6 }, { type: "wastelandcow", count: 3 }, { type: "mutantsnake", count: 3 }, { type: "mutantman", count: 1 }],
            14: [{ type: "spider", count: 11 }, { type: "skitter", count: 6 }, { type: "wastelandcow", count: 3 }, { type: "mutantsnake", count: 3 }, { type: "hollow", count: 1 }],
            15: [{ type: "spider", count: 11 }, { type: "skitter", count: 7 }, { type: "wastelandcow", count: 3 }, { type: "mutantsnake", count: 3 }, { type: "spiderBrute", count: 1 }, { type: "wastelandcow", count: 1, specialRole: "boss" }]
        },
        5: {
            1: [{ type: "spider", count: 7 }],
            2: [{ type: "spider", count: 7 }, { type: "skitter", count: 2 }],
            3: [{ type: "spider", count: 8 }, { type: "skitter", count: 3 }, { type: "mutantman", count: 1 }],
            4: [{ type: "spider", count: 8 }, { type: "skitter", count: 3 }, { type: "wastelandcow", count: 1 }, { type: "mutantsnake", count: 1 }],
            5: [{ type: "spider", count: 8 }, { type: "skitter", count: 3 }, { type: "wastelandcow", count: 1 }, { type: "mutantsnake", count: 1 }, { type: "hollow", count: 1 }],
            6: [{ type: "spider", count: 8 }, { type: "skitter", count: 4 }, { type: "wastelandcow", count: 2 }, { type: "mutantsnake", count: 1 }, { type: "mutantman", count: 1 }],
            7: [{ type: "spider", count: 9 }, { type: "skitter", count: 4 }, { type: "wastelandcow", count: 2 }, { type: "mutantsnake", count: 2 }, { type: "mutantman", count: 1 }],
            8: [{ type: "spider", count: 9 }, { type: "skitter", count: 5 }, { type: "wastelandcow", count: 2 }, { type: "mutantsnake", count: 2 }, { type: "hollow", count: 1 }],
            9: [{ type: "spider", count: 9 }, { type: "skitter", count: 5 }, { type: "wastelandcow", count: 2 }, { type: "mutantsnake", count: 2 }, { type: "fogkeeper", count: 1 }],
            10: [{ type: "spider", count: 10 }, { type: "skitter", count: 5 }, { type: "wastelandcow", count: 2 }, { type: "mutantsnake", count: 2 }, { type: "hollow", count: 1 }, { type: "fogkeeper", count: 1, specialRole: "miniBoss" }],
            11: [{ type: "spider", count: 10 }, { type: "skitter", count: 6 }, { type: "wastelandcow", count: 3 }, { type: "mutantsnake", count: 2 }, { type: "mutantsnakered", count: 1 }, { type: "mutantman", count: 1 }],
            12: [{ type: "spider", count: 10 }, { type: "skitter", count: 6 }, { type: "wastelandcow", count: 3 }, { type: "mutantsnake", count: 3 }, { type: "fogkeeper", count: 1 }],
            13: [{ type: "spider", count: 11 }, { type: "skitter", count: 6 }, { type: "wastelandcow", count: 3 }, { type: "mutantsnake", count: 3 }, { type: "mutantsnakered", count: 1 }, { type: "hollow", count: 1 }],
            14: [{ type: "spider", count: 11 }, { type: "skitter", count: 7 }, { type: "wastelandcow", count: 3 }, { type: "mutantsnake", count: 3 }, { type: "fogkeeper", count: 1 }, { type: "heavymutant", count: 1 }],
            15: [{ type: "spider", count: 12 }, { type: "skitter", count: 7 }, { type: "wastelandcow", count: 3 }, { type: "mutantsnake", count: 3 }, { type: "mutantsnakered", count: 1 }, { type: "hollow", count: 1 }, { type: "heavymutant", count: 1, specialRole: "boss" }]
        },
        6: {
            1: [{ type: "spider", count: 7 }, { type: "skitter", count: 2 }],
            2: [{ type: "spider", count: 8 }, { type: "skitter", count: 3 }, { type: "mutantman", count: 1 }],
            3: [{ type: "spider", count: 8 }, { type: "skitter", count: 3 }, { type: "mutantsnake", count: 1 }, { type: "wastelandcow", count: 1 }],
            4: [{ type: "spider", count: 9 }, { type: "skitter", count: 4 }, { type: "mutantsnake", count: 1 }, { type: "wastelandcow", count: 1 }, { type: "hollow", count: 1 }],
            5: [{ type: "spider", count: 9 }, { type: "skitter", count: 4 }, { type: "mutantsnake", count: 2 }, { type: "wastelandcow", count: 2 }, { type: "mutantman", count: 1 }],
            6: [{ type: "spider", count: 9 }, { type: "skitter", count: 4 }, { type: "mutantsnake", count: 2 }, { type: "wastelandcow", count: 2 }, { type: "mutantman", count: 1 }],
            7: [{ type: "spider", count: 9 }, { type: "skitter", count: 5 }, { type: "mutantsnake", count: 2 }, { type: "wastelandcow", count: 2 }, { type: "hollow", count: 1 }],
            8: [{ type: "spider", count: 10 }, { type: "skitter", count: 5 }, { type: "mutantsnake", count: 2 }, { type: "mutantsnakered", count: 1 }, { type: "wastelandcow", count: 2 }, { type: "fogkeeper", count: 1 }],
            9: [{ type: "spider", count: 10 }, { type: "skitter", count: 6 }, { type: "mutantsnake", count: 3 }, { type: "mutantsnakered", count: 1 }, { type: "wastelandcow", count: 2 }, { type: "mutantman", count: 1 }],
            10: [{ type: "spider", count: 10 }, { type: "skitter", count: 6 }, { type: "mutantsnake", count: 3 }, { type: "mutantsnakered", count: 1 }, { type: "wastelandcow", count: 3 }, { type: "hollow", count: 1 }, { type: "fogkeeper", count: 1, specialRole: "miniBoss" }],
            11: [{ type: "spider", count: 11 }, { type: "skitter", count: 6 }, { type: "mutantsnake", count: 3 }, { type: "mutantsnakered", count: 1 }, { type: "wastelandcow", count: 3 }, { type: "mutantman", count: 2 }],
            12: [{ type: "spider", count: 11 }, { type: "skitter", count: 7 }, { type: "mutantsnake", count: 4 }, { type: "mutantsnakered", count: 1 }, { type: "wastelandcow", count: 3 }, { type: "hollow", count: 1 }, { type: "fogkeeper", count: 1 }],
            13: [{ type: "spider", count: 12 }, { type: "skitter", count: 7 }, { type: "mutantsnake", count: 4 }, { type: "mutantsnakered", count: 2 }, { type: "wastelandcow", count: 3 }, { type: "mutantman", count: 2 }],
            14: [{ type: "spider", count: 12 }, { type: "skitter", count: 8 }, { type: "mutantsnake", count: 4 }, { type: "mutantsnakered", count: 2 }, { type: "wastelandcow", count: 4 }, { type: "hollow", count: 2 }, { type: "heavymutant", count: 1 }],
            15: [{ type: "spider", count: 13 }, { type: "skitter", count: 8 }, { type: "mutantsnake", count: 4 }, { type: "mutantsnakered", count: 2 }, { type: "wastelandcow", count: 4 }, { type: "hollow", count: 2 }, { type: "heavymutant", count: 1 }, { type: "heavymutant", count: 1, specialRole: "boss" }]
        }
    };
    if (gameMode === "campaign" && campaignWaveSets[currentLevel]) {
        const campaignWaves = campaignWaveSets[currentLevel];
        return campaignWaves[wave] || campaignWaves[15];
    }

    const waveGroups = {
        1: [{ type: "spider", count: 8 }],
        2: [
            { type: "skitter", count: 4 },
            { type: "spider", count: 6 }
        ],
        3: [
            { type: "skitter", count: 6 },
            { type: "spider", count: 8 }
        ],
        4: [
            { type: "skitter", count: 7 },
            { type: "spider", count: 9 }
        ],
        5: [
            { type: "skitter", count: 9 },
            { type: "hollow", count: 1 }
        ]
    };

    if (waveGroups[wave]) return waveGroups[wave];

    const totalEnemies = 6 + (wave - 1) * 2;
    const skitterCount = Math.floor(totalEnemies * Math.min(0.38, 0.24 + Math.max(0, wave - 6) * 0.012));
    const regularCowWave = wave >= 6 && (wave - 6) % 4 === 0;
    const regularSnakeWave = wave >= 8 && (wave - 8) % 5 === 0;
    const snakeCount = regularSnakeWave ? Math.max(1, Math.floor(totalEnemies * 0.06)) : 0;
    const redSnakeWave = regularSnakeWave && wave >= 28 && (wave - 28) % 10 === 0;
    const redSnakeCount = redSnakeWave ? 1 : 0;
    const standardCount = Math.max(0, totalEnemies - skitterCount - snakeCount - redSnakeCount);
    const cowCount = regularCowWave ? Math.floor(standardCount * 0.1) : 0;
    const mutantManCount = wave >= 6 ? Math.floor(standardCount * 0.1) : 0;
    const spiderCount = Math.max(0, standardCount - cowCount - mutantManCount);
    const runnerSpiderWave = wave >= 4 && wave % 3 === 1;
    const bruteSpiderWave = wave >= 8 && wave % 5 === 0;
    const runnerSpiderCount = runnerSpiderWave
        ? Math.max(1, Math.floor(spiderCount * 0.22))
        : 0;
    const bruteSpiderCount = bruteSpiderWave
        ? Math.max(1, Math.floor(spiderCount * 0.16))
        : 0;
    const baselineSpiderCount = Math.max(0, spiderCount - runnerSpiderCount - bruteSpiderCount);
    const groups = [
        { type: "spider", count: baselineSpiderCount },
        { type: "spiderRunner", count: runnerSpiderCount },
        { type: "spiderBrute", count: bruteSpiderCount },
        { type: "wastelandcow", count: cowCount },
        { type: "mutantman", count: mutantManCount },
        { type: "skitter", count: skitterCount },
        { type: "mutantsnake", count: snakeCount },
        { type: "mutantsnakered", count: redSnakeCount }
    ].filter(group => group.count > 0);

    const hollowCount = wave === 9 || wave === 12
        ? 1
        : wave === 15
            ? 2
            : wave > 15 && wave % 5 === 0
                ? Math.min(3, Math.floor(wave / 8))
                : 0;
    if (hollowCount > 0) groups.push({ type: "hollow", count: hollowCount });
    return groups;
}

function sanitizeEndlessTelemetryGroups(groups) {
    return (Array.isArray(groups) ? groups : []).map(group => ({
        type: String(group?.type || "unknown").slice(0, 32),
        count: Math.max(0, Math.floor(Number(group?.count) || 0)),
        specialRole: String(group?.specialRole || "normal").slice(0, 16),
        types: Array.isArray(group?.types)
            ? group.types.map(type => String(type).slice(0, 32)).slice(0, 8)
            : undefined
    }));
}

function getEndlessTelemetrySurvivorId(survivor) {
    if (!survivor) return "unknown";
    if (!survivor.telemetryId) survivor.telemetryId = createRunId();
    return String(survivor.telemetryId).slice(0, 64);
}

function getEndlessTelemetryRoster(baselineRoster = []) {
    const baselineById = new Map(
        (Array.isArray(baselineRoster) ? baselineRoster : [])
            .map(entry => [entry.telemetryId, entry.stats || {}])
    );

    return survivors.map(survivor => {
        const telemetryId = getEndlessTelemetrySurvivorId(survivor);
        const stats = {
            damageDealt: Math.round(Number(survivor?.damageDealt) || 0),
            kills: Math.max(0, Math.floor(Number(survivor?.kills) || 0)),
            attacks: Math.max(0, Math.floor(Number(survivor?.telemetryAttacks) || 0)),
            hits: Math.max(0, Math.floor(Number(survivor?.telemetryHits) || 0)),
            activeSeconds: Number((Number(survivor?.telemetryActiveSeconds) || 0).toFixed(1))
        };
        const baseline = baselineById.get(telemetryId) || {};

        return {
            id: String(survivor?.type || "unknown").slice(0, 32),
            telemetryId,
            level: Math.max(0, Math.min(3, Math.floor(Number(getSurvivorUpgradeLevel(survivor)) || 0))),
            x: Math.round(Number(survivor?.x) || 0),
            y: Math.round(Number(survivor?.y) || 0),
            targetingPriority: Object.prototype.hasOwnProperty.call(
                TARGETING_PRIORITY_LABELS,
                survivor?.targetingPriority
            ) ? survivor.targetingPriority : "first",
            stats,
            performance: {
                damageDealt: Math.max(0, stats.damageDealt - (Number(baseline.damageDealt) || 0)),
                kills: Math.max(0, stats.kills - (Number(baseline.kills) || 0)),
                attacks: Math.max(0, stats.attacks - (Number(baseline.attacks) || 0)),
                hits: Math.max(0, stats.hits - (Number(baseline.hits) || 0)),
                activeSeconds: Number(Math.max(
                    0,
                    stats.activeSeconds - (Number(baseline.activeSeconds) || 0)
                ).toFixed(1))
            }
        };
    });
}

function recordEndlessTelemetryEvent(event) {
    if (gameMode !== "endless" || !activeEndlessTelemetry || !event) return;

    const events = activeEndlessTelemetry.events || (activeEndlessTelemetry.events = []);
    if (events.length >= 5000) return;

    const waveStart = activeEndlessTelemetry.waveStart;
    events.push({
        ...event,
        wave: Math.max(0, Math.floor(Number(currentWave) || 0)),
        phase: waveStart ? "wave" : "setup",
        elapsedSeconds: Number(Math.max(
            0,
            (Date.now() - (waveStart?.startedAt || Date.now())) / 1000
        ).toFixed(1))
    });
}

function recordEndlessTelemetrySpawn(enemy) {
    const waveStart = activeEndlessTelemetry?.waveStart;
    if (gameMode !== "endless" || !waveStart || !enemy) return;

    waveStart.spawnedByType[enemy.type] = (waveStart.spawnedByType[enemy.type] || 0) + 1;
}

function recordEndlessTelemetryDefeat(enemy) {
    const waveStart = activeEndlessTelemetry?.waveStart;
    if (gameMode !== "endless" || !waveStart || !enemy) return;

    waveStart.defeatedByType[enemy.type] = (waveStart.defeatedByType[enemy.type] || 0) + 1;
}

function recordEndlessTelemetryLeak(enemy) {
    const waveStart = activeEndlessTelemetry?.waveStart;
    if (gameMode !== "endless" || !waveStart || !enemy) return;

    waveStart.leakedByType[enemy.type] = (waveStart.leakedByType[enemy.type] || 0) + 1;
    if (waveStart.leaks.length >= 256) return;

    const maxHealth = Math.max(1, Number(enemy.maxHealth) || 1);
    waveStart.leaks.push({
        type: String(enemy.type || "unknown").slice(0, 32),
        role: enemy.isWaveBoss ? "boss" : enemy.isMiniBoss ? "miniBoss" : "normal",
        remainingHealth: Math.max(0, Math.round(Number(enemy.health) || 0)),
        maxHealth: Math.round(maxHealth),
        healthPercent: Number(Math.max(0, Math.min(1, (Number(enemy.health) || 0) / maxHealth)).toFixed(3)),
        leakDamage: Math.max(0, Math.round(Number(enemy.leakDamage) || 0)),
        isSplitChild: Boolean(enemy.isSplitChild)
    });
}

function getEndlessTelemetryActiveWave() {
    const source = activeEndlessTelemetry;
    const waveStart = source?.waveStart;
    if (gameMode !== "endless" || !source || !waveStart) return null;

    const roster = getEndlessTelemetryRoster(waveStart.roster);
    return {
        wave: waveStart.wave,
        partial: true,
        groups: waveStart.groups,
        autoStart: waveStart.autoStart,
        durationSeconds: Math.max(0, Math.round((Date.now() - waveStart.startedAt) / 1000)),
        startingHealth: waveStart.startingHealth,
        endingHealth: Math.max(0, Math.round(playerHealth)),
        startingScrap: waveStart.startingScrap,
        endingScrap: Math.max(0, Math.round(scrap)),
        enemiesDefeated: Math.max(0, Math.floor(Number(totalEnemiesDefeated) || 0) - waveStart.startingEnemiesDefeated),
        leaks: Math.max(0, Math.floor(Number(leakedEnemiesThisWave) || 0)),
        spawnedByType: waveStart.spawnedByType,
        defeatedByType: waveStart.defeatedByType,
        leakedByType: waveStart.leakedByType,
        leakDetails: waveStart.leaks,
        targetingPriority: waveStart.targetingPriority || "first",
        roster,
        survivorPerformance: roster.map(entry => ({
            id: entry.id,
            telemetryId: entry.telemetryId,
            level: entry.level,
            performance: entry.performance
        }))
    };
}

function beginEndlessTelemetryWave(groups) {
    if (gameMode !== "endless" || !activeEndlessTelemetry) return;
    activeEndlessTelemetry.waveStart = {
        wave: Math.max(1, Math.floor(Number(currentWave) || 1)),
        startedAt: Date.now(),
        startingHealth: Math.max(0, Math.round(playerHealth)),
        startingScrap: Math.max(0, Math.round(scrap)),
        startingEnemiesDefeated: Math.max(0, Math.floor(Number(totalEnemiesDefeated) || 0)),
        groups: sanitizeEndlessTelemetryGroups(groups),
        autoStart: Boolean(autoStartWaves),
        targetingPriority,
        roster: getEndlessTelemetryRoster(),
        spawnedByType: {},
        defeatedByType: {},
        leakedByType: {},
        leaks: []
    };
}

function recordEndlessTelemetryWave(completedWave, reward, leakPenalty, upkeep) {
    if (gameMode !== "endless" || !activeEndlessTelemetry) return;
    const waveStart = activeEndlessTelemetry.waveStart;
    if (!waveStart || waveStart.wave !== completedWave) return;

    const waves = activeEndlessTelemetry.waves || (activeEndlessTelemetry.waves = []);
    const roster = getEndlessTelemetryRoster(waveStart.roster);
    waves.push({
        wave: completedWave,
        groups: waveStart.groups,
        autoStart: waveStart.autoStart,
        durationSeconds: Math.max(0, Math.round((Date.now() - waveStart.startedAt) / 1000)),
        startingHealth: waveStart.startingHealth,
        endingHealth: Math.max(0, Math.round(playerHealth)),
        startingScrap: waveStart.startingScrap,
        endingScrap: Math.max(0, Math.round(scrap)),
        enemiesDefeated: Math.max(0, Math.floor(Number(totalEnemiesDefeated) || 0) - waveStart.startingEnemiesDefeated),
        leaks: Math.max(0, Math.floor(Number(leakedEnemiesThisWave) || 0)),
        reward: Math.max(0, Math.floor(Number(reward) || 0)),
        leakPenalty: Math.max(0, Math.floor(Number(leakPenalty) || 0)),
        upkeep: Math.max(0, Math.floor(Number(upkeep) || 0)),
        spawnedByType: waveStart.spawnedByType,
        defeatedByType: waveStart.defeatedByType,
        leakedByType: waveStart.leakedByType,
        leakDetails: waveStart.leaks,
        targetingPriority: waveStart.targetingPriority || "first",
        roster,
        survivorPerformance: roster.map(entry => ({
            id: entry.id,
            telemetryId: entry.telemetryId,
            level: entry.level,
            performance: entry.performance
        })),
        events: (activeEndlessTelemetry.events || [])
            .filter(event => event.wave === completedWave)
    });
    activeEndlessTelemetry.waveStart = null;
}

function getEndlessTelemetrySnapshot(finalWave, outcome = "defeat") {
    const source = activeEndlessTelemetry || completedEndlessTelemetry;
    if (!source) return null;
    const waveLimit = Math.max(0, Math.floor(Number(finalWave) || 0));
    return {
        runId: source.runId,
        mapId: source.mapId,
        gameVersion: ENDLESS_TELEMETRY_VERSION,
        telemetrySchema: ENDLESS_TELEMETRY_SCHEMA_VERSION,
        startedAt: source.startedAt,
        outcome: String(outcome || "defeat").slice(0, 16),
        submittedWave: waveLimit,
        finalHealth: Math.max(0, Math.round(playerHealth)),
        finalScrap: Math.max(0, Math.round(scrap)),
        totalEnemiesDefeated: Math.max(0, Math.floor(Number(totalEnemiesDefeated) || 0)),
        survivorsRemaining: survivors.length,
        waves: (source.waves || []).filter(wave => wave.wave <= waveLimit).slice(-250),
        activeWave: source === activeEndlessTelemetry ? getEndlessTelemetryActiveWave() : null,
        events: (source.events || []).slice(-5000)
    };
}

function startWave() {
    if (!gameRunning || waveRunning) return;

    if (isOpeningCampaignOperation() && currentWave === 5 && !campaignCowWarningShown) {
        cancelAutoStartWave();
        showCampaignCowWarningDialogue();
        return;
    }

    // Campaign chapters pause once before their first new threat, giving the
    // player a clear explanation without consuming a wave. Upgrades remain
    // available before and after every briefing.
    const campaignBriefing = campaignBriefings[currentLevel];
    const briefingWave = campaignBriefing?.wave || 5;
    const briefingKind = `wave${briefingWave}`;
    if (gameMode === "campaign" && currentLevel >= 2 && currentWave === briefingWave) {
        const briefingKey = `${currentLevel}:${briefingWave}`;
        if (!campaignDialogueShown.has(briefingKey) && campaignBriefing?.[briefingKind]) {
            campaignDialogueShown.add(briefingKey);
            cancelAutoStartWave();
            showCampaignBriefing(currentLevel, briefingKind, () => startWave());
            return;
        }
    }

    cancelAutoStartWave();
    awaitingNextWave = false;

    waveRunning = true;
    gamePaused = false;
    leakedEnemiesThisWave = 0;
    const groups = getWaveGroups(currentWave);
    beginEndlessTelemetryWave(groups);

    enemyGroups = groups.map(group => ({ ...group }));
    currentGroupIndex = 0;
    currentGroupSpawnIndex = 0;
    groupDelayStarted = false;
    enemiesToSpawn = enemyGroups[0].count;
    spawnTimer = 0;

    document.getElementById("startWaveButton").disabled = true;
    document.getElementById("startWaveButton").style.display = "none";
    document.getElementById("pauseButton").disabled = false;

    document.getElementById("waveDisplay").textContent =
    isEndlessStyleMode()
        ? "WAVE " + currentWave
        : currentWave + " / " + totalWaves;

    document.getElementById("waveStatus").textContent =
        "Wave " + currentWave + " in progress!";
            moveMode = false;
    updateMoveButton();
}

let scrap = 250;
let selectedSurvivor = null;
let moveMode = false;

const survivorCosts = {
    // Common recruits should stay available after a few imperfect waves.
    // Their lower entry costs preserve a meaningful early-game decision
    // without flattening the rarity curve above them.
    mason: 55,
    zach: 65,
    brady: 100,
    cody: 120,
    james: 150,
    britney: 160
};
const deploymentCostFloors = {
    common: 50,
    uncommon: 90,
    rare: 140,
    legendary: 190
};
customSurvivors.forEach(survivor => {
    survivorCosts[survivor.id] = Math.max(
        deploymentCostFloors[survivor.rarity] || deploymentCostFloors.common,
        survivor.cost
    );
});
const scrapRewardPerKill = 5;
// Endless runs get a small combat income from kills. Each original hostile
// has a 50% payout chance; split children remain free so snake splits cannot
// be farmed for money.
const endlessKillScrapPerKill = 1;
const killScrapChance = 0.5;

function updateScrapDisplay() {
    document.getElementById("scrapDisplay").textContent = scrap;
    updateSurvivorUpgradeButton(inspectedSurvivor);
    updateInGameRosterAffordability();
}

// Keep the roster honest at a glance. Cards remain clickable so the existing
// insufficient-scrap toast still explains why deployment is blocked, but an
// unaffordable card is visibly muted and marked as disabled for assistive tech.
function updateInGameRosterAffordability() {
    document.querySelectorAll("#inGameSurvivorList .survivor-card").forEach(card => {
        const id = card.dataset.survivor;
        const cost = Number(survivorCosts[id] ?? 0);
        const unaffordable = scrap < cost;
        card.classList.toggle("is-unaffordable", unaffordable);
        card.setAttribute("aria-disabled", String(unaffordable));
        card.title = unaffordable
            ? `Need ${cost - scrap} more scrap to deploy ${survivorDetails[id]?.name || id}.`
            : `Deploy ${survivorDetails[id]?.name || id} for ${cost} scrap.`;
    });
}

function updateDeploymentMessage(message) {
    const messageElement = document.getElementById("deploymentMessage");
    if (messageElement) {
        messageElement.textContent = message;
    }
}

// Select a survivor from the in-game roster.
function selectSurvivorToDeploy(id) {
    if (!selectedSurvivors.has(id)) return;

    selectedSurvivor = id;

    document.querySelectorAll("#inGameSurvivorList .survivor-card")
        .forEach(card => {
            card.classList.toggle(
                "selected",
                card.dataset.survivor === id
            );
        });

    const person = survivorDetails[id];
    updateDeploymentMessage(
        person.name + " selected. Cost: " +
        survivorCosts[id] + " scrap. Click the battlefield to deploy."
    );
}

// Handle clicks on the battlefield.
canvas.addEventListener("click", function(event) {
        if (gameRunning) {
        // Clicking back on the battlefield dismisses an expanded next-wave
        // intel card so it never stays in the way while deploying or moving.
        if (expandedWavePreviewKey !== null || wavePreviewExpanded) {
            expandedWavePreviewKey = null;
            wavePreviewExpanded = false;
            updateWavePreview();
        }

        const rect = canvas.getBoundingClientRect();
        const clickX = (event.clientX - rect.left) * canvas.width / rect.width;
        const clickY = (event.clientY - rect.top) * canvas.height / rect.height;

        // Move an existing survivor during preparation.
        if (moveMode && inspectedSurvivor) {
            if (waveRunning) {
                moveMode = false;
                updateMoveButton();
                return;
            }

            if (
                isSurvivorFootprintOnRoad(clickX, clickY) ||
                isOutsideSurvivorPlacementBounds(clickX, clickY)
            ) {
                updateDeploymentMessage("Choose a clear spot off the road.");
                return;
            }

            for (const survivor of survivors) {
                if (survivor === inspectedSurvivor) continue;

                const dx = survivor.x - clickX;
                const dy = survivor.y - clickY;

                if (Math.sqrt(dx * dx + dy * dy) < 45) {
                    updateDeploymentMessage(
                        "That spot is too close to another survivor."
                    );
                    return;
                }
            }

            const previousX = inspectedSurvivor.x;
            const previousY = inspectedSurvivor.y;
            inspectedSurvivor.x = clickX;
            inspectedSurvivor.y = clickY;
            triggerSurvivorPlacementFeedback(inspectedSurvivor, "move");
            recordEndlessTelemetryEvent({
                kind: "move",
                survivorId: getEndlessTelemetrySurvivorId(inspectedSurvivor),
                survivor: inspectedSurvivor.type,
                fromX: Math.round(Number(previousX) || 0),
                fromY: Math.round(Number(previousY) || 0),
                toX: Math.round(clickX),
                toY: Math.round(clickY),
                level: getSurvivorUpgradeLevel(inspectedSurvivor)
            });

            moveMode = false;
            updateMoveButton();
            updateDeploymentMessage(
                inspectedSurvivor.name + " repositioned!"
            );
            syncMobileSelectionRangeOverlay();
            renderGame();
            return;
        }


        let nearestSurvivor = null;
        let nearestSurvivorDistance = Infinity;
        for (const survivor of survivors) {
            const dx = clickX - (survivor.x + (survivor.recoilX || 0));
            const dy = clickY - (survivor.y + (survivor.recoilY || 0));

            // Fit the hit target around the character silhouette, not the full
            // transparent sprite canvas, while leaving a small click cushion.
            const hitX = dx / 23;
            const hitY = dy / 27;
            if (hitX * hitX + hitY * hitY <= 1) {
                const distance = dx * dx + dy * dy;
                if (distance < nearestSurvivorDistance) {
                    nearestSurvivor = survivor;
                    nearestSurvivorDistance = distance;
                }
            }
        }

        if (nearestSurvivor) {
            inspectedSurvivor = nearestSurvivor;
            triggerSurvivorSelectionFeedback(nearestSurvivor);
            showSurvivorDetails(nearestSurvivor.type);
            renderGame();
            return;
        }

        inspectedSurvivor = null;
        hideSurvivorDetails();
    }
    if (!gameRunning || !selectedSurvivor) return;

    const cost = survivorCosts[selectedSurvivor];

    if (scrap < cost) {
        updateDeploymentMessage("Not enough scrap!");
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * canvas.width / rect.width;
    const y = (event.clientY - rect.top) * canvas.height / rect.height;

    if (
        isSurvivorFootprintOnRoad(x, y) ||
        isOutsideSurvivorPlacementBounds(x, y)
    ) {
        return;
    }

    const minimumDistance = 45;

    for (const survivor of survivors) {
        const dx = survivor.x - x;
        const dy = survivor.y - y;

        if (Math.sqrt(dx * dx + dy * dy) < minimumDistance) {
            return;
        }
    }

    const deployedSurvivor = {
        x,
        y,
        type: selectedSurvivor,
        name: survivorDetails[selectedSurvivor].name,
        upgradeLevel: 0,
        targetingPriority: targetingPriority,
        telemetryId: createRunId(),
        telemetryAttacks: 0,
        telemetryHits: 0,
        telemetryActiveSeconds: 0
    };
    survivors.push(deployedSurvivor);
    triggerSurvivorPlacementFeedback(deployedSurvivor, "deploy");
    recordCloudSurvivorUsage(deployedSurvivor.type);
    recordEndlessTelemetryEvent({
        kind: "deploy",
        survivorId: deployedSurvivor.telemetryId,
        survivor: deployedSurvivor.type,
        cost,
        x: Math.round(x),
        y: Math.round(y),
        level: 0
    });

   
scrap -= cost;
updateScrapDisplay();

// Clear the selection after a successful placement.
selectedSurvivor = null;

hideSurvivorDetails();

document.querySelectorAll("#inGameSurvivorList .survivor-card")
    .forEach(card => card.classList.remove("selected"));

updateDeploymentMessage("Survivor deployed! Select another unit to continue.");

renderGame();

});


canvas.addEventListener("click", function(event) {
    // Only allow placement during deployment.
    if (gameRunning) return;

    const deploymentScreen = document.getElementById("deploymentScreen");
    if (deploymentScreen.style.display === "none") return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * canvas.width / rect.width;
    const y = (event.clientY - rect.top) * canvas.height / rect.height;

    if (
        isSurvivorFootprintOnRoad(x, y) ||
        isOutsideSurvivorPlacementBounds(x, y)
    ) {
        document.getElementById("deploymentMessage").textContent =
            "Choose a clear spot off the road.";
        return;
    }

    const cost = survivorCosts[selectedSurvivor];

    if (scrap < cost) {
        document.getElementById("deploymentMessage").textContent =
            "Not enough scrap for " + selectedSurvivor + ".";
        return;
    }

    for (const survivor of survivors) {
        const dx = survivor.x - x;
        const dy = survivor.y - y;

        if (Math.sqrt(dx * dx + dy * dy) < 45) {
            document.getElementById("deploymentMessage").textContent =
                "That spot is too close to another survivor.";
            return;
        }
    }

    const deployedSurvivor = {
        x,
        y,
        type: selectedSurvivor,
        upgradeLevel: 0,
        targetingPriority: targetingPriority,
        telemetryId: createRunId(),
        telemetryAttacks: 0,
        telemetryHits: 0,
        telemetryActiveSeconds: 0
    };
    survivors.push(deployedSurvivor);
    triggerSurvivorPlacementFeedback(deployedSurvivor, "deploy");
    recordCloudSurvivorUsage(deployedSurvivor.type);
    recordEndlessTelemetryEvent({
        kind: "deploy",
        survivorId: deployedSurvivor.telemetryId,
        survivor: deployedSurvivor.type,
        cost,
        x: Math.round(x),
        y: Math.round(y),
        level: 0
    });

    scrap -= cost;

    document.getElementById("deploymentScrap").textContent = scrap;
    document.getElementById("deploymentCount").textContent = survivors.length;
    document.getElementById("deploymentMessage").textContent =
        selectedSurvivor + " deployed for " + cost + " scrap.";

    renderGame();
});






function drawSurvivorLevelPips(centerX, centerY, level) {
    // Keep the rank marker as a deliberately simple pixel badge. A tiny
    // outlined block stays crisp when the battlefield canvas is scaled down.
    const pipCount = level >= 3 ? 1 : Math.min(2, Math.floor(level));
    if (pipCount <= 0) return;

    const blockSize = 7;
    const gap = 3;
    const totalWidth = pipCount * blockSize + (pipCount - 1) * gap;
    const startX = Math.round(centerX - totalWidth / 2);
    const y = Math.round(centerY - blockSize / 2);
    const accent = level >= 3 ? "#b995e9" : "#efbd4d";
    const highlight = level >= 3 ? "#eadbff" : "#fff0a3";

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let index = 0; index < pipCount; index++) {
        const x = startX + index * (blockSize + gap);
        ctx.fillStyle = "#08090a";
        ctx.fillRect(x, y, blockSize, blockSize);
        ctx.fillStyle = accent;
        ctx.fillRect(x + 1, y + 1, blockSize - 2, blockSize - 2);
        ctx.fillStyle = highlight;
        ctx.fillRect(x + 2, y + 2, blockSize - 3, 1);
        ctx.fillStyle = "#6f5429";
        if (level < 3) ctx.fillRect(x + 2, y + blockSize - 2, blockSize - 3, 1);
    }
    ctx.restore();
}

const survivorSelectionPulseDuration = 260;
const survivorPlacementFeedbackDuration = 420;
const survivorUpgradeFeedbackDuration = 820;

function triggerSurvivorSelectionFeedback(survivor) {
    if (!survivor || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    survivor.selectionPulseUntil = performance.now() + survivorSelectionPulseDuration;
}

function getSurvivorSelectionPulse(survivor, now = performance.now()) {
    const until = Number(survivor?.selectionPulseUntil) || 0;
    if (!until || until <= now) {
        if (survivor && until) survivor.selectionPulseUntil = 0;
        return 0;
    }

    const progress = 1 - (until - now) / survivorSelectionPulseDuration;
    return Math.sin(Math.max(0, Math.min(1, progress)) * Math.PI);
}

// A newly deployed or repositioned survivor gets a short arrival bounce. It
// is deliberately separate from selection feedback so clicking a unit does
// not make it jump every time the dossier is inspected.
function triggerSurvivorPlacementFeedback(survivor, kind = "deploy") {
    if (!survivor || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    survivor.placementFeedbackUntil = performance.now() + survivorPlacementFeedbackDuration;
    survivor.placementFeedbackKind = kind;
}

function getSurvivorPlacementPulse(survivor, now = performance.now()) {
    const until = Number(survivor?.placementFeedbackUntil) || 0;
    if (!until || until <= now) {
        if (survivor && until) survivor.placementFeedbackUntil = 0;
        return 0;
    }

    const progress = 1 - (until - now) / survivorPlacementFeedbackDuration;
    return Math.sin(Math.max(0, Math.min(1, progress)) * Math.PI);
}

function triggerSurvivorUpgradeFeedback(survivor, level) {
    if (!survivor) return;

    const now = performance.now();
    survivor.upgradeFeedbackStartedAt = now;
    survivor.upgradeFeedbackUntil = now + survivorUpgradeFeedbackDuration;
    survivor.upgradeFeedbackLevel = Math.max(1, Math.min(3, Number(level) || 1));
}

function getSurvivorUpgradePulse(survivor, now = performance.now()) {
    const until = Number(survivor?.upgradeFeedbackUntil) || 0;
    if (!until || until <= now) {
        if (survivor && until) survivor.upgradeFeedbackUntil = 0;
        return 0;
    }

    const progress = 1 - (until - now) / survivorUpgradeFeedbackDuration;
    return Math.sin(Math.max(0, Math.min(1, progress)) * Math.PI);
}

function drawSurvivors(onlySurvivor = null) {
    const mobileViewport = isMobileGameplayViewport();
    const survivorImages = {
        mason: masonImage,
        james: jamesImage,
        cody: codyImage,
        britney: britneyImage,
        zach: zachImage,
        brady: bradyImage
    };

    for (const survivor of survivors) {
        if (onlySurvivor && survivor !== onlySurvivor) continue;
        const image = survivorImages[survivor.type] || customSurvivorImages[survivor.type];

        if (!image || !image.complete || image.naturalWidth === 0) {
            continue;
        }
if (survivor.recoilX === undefined) survivor.recoilX = 0;
if (survivor.recoilY === undefined) survivor.recoilY = 0;
        const width = 64;
        const height = 64;
       
        const bounce = gamePaused || !waveRunning
    ? 0
    : Math.sin(
        performance.now() / 250 * gameSpeed + survivor.x * 0.1
    ) * 2;
const selectionPulse = getSurvivorSelectionPulse(survivor);
const selectionNudge = selectionPulse * 3;
const placementPulse = getSurvivorPlacementPulse(survivor);
const placementNudge = placementPulse * 7;
const upgradePulse = getSurvivorUpgradePulse(survivor);
// A short celebratory hop makes a successful upgrade feel physical without
// obscuring the model or changing its actual battlefield position.
const upgradeNudge = upgradePulse * 8;

// Animate recoil back toward the survivor's normal position.
const recoilReturn = Math.min(1, 12 * (1 / 60) * gameSpeed);
survivor.recoilX *= 1 - recoilReturn;
survivor.recoilY *= 1 - recoilReturn;
        ctx.save();
        // Layered contact shadows make the models feel planted on the map.
        // The soft outer pass gives depth; the small inner pass keeps a crisp
        // pixel-art contact point beneath the feet.
        const shadowX = survivor.x + survivor.recoilX;
        const shadowY = survivor.y + survivor.recoilY + 35
            + bounce - selectionNudge * 0.35 - placementNudge * 0.22 - upgradeNudge * 0.28;
        const shadowSquash = 1 - placementPulse * 0.18 - upgradePulse * 0.12;
        if (mobileViewport) {
            // A crisp two-pass ellipse is considerably cheaper than creating
            // a radial gradient for every survivor on every mobile frame.
            ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
            ctx.beginPath();
            ctx.ellipse(shadowX, shadowY, 15 * shadowSquash, 5 * shadowSquash, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            const shadow = ctx.createRadialGradient(
                shadowX,
                shadowY,
                1,
                shadowX,
                shadowY,
                20
            );
            shadow.addColorStop(0, "rgba(0, 0, 0, 0.42)");
            shadow.addColorStop(0.55, "rgba(0, 0, 0, 0.24)");
            shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
            ctx.fillStyle = shadow;
            ctx.beginPath();
            ctx.ellipse(shadowX, shadowY, 20 * shadowSquash, 7 * shadowSquash, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
        ctx.beginPath();
        ctx.ellipse(shadowX, shadowY, 11 * shadowSquash, 3.5 * shadowSquash, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(250, 220, 150, 0.09)";
        ctx.fillRect(Math.round(shadowX - 6), Math.round(shadowY - 1), 12, 1);
        ctx.imageSmoothingEnabled = false;

        ctx.drawImage(
    image,
    survivor.x + survivor.recoilX - width / 2,
    // A small arrival bounce gives deployment and repositioning a tactile
    // response while preserving the crisp pixel-art silhouette.
    survivor.y + survivor.recoilY - height / 2 + bounce - selectionNudge - placementNudge - upgradeNudge,
    width,
    height
);

        ctx.restore();
    }
}

function drawSurvivorSelectionFeedback() {
    const now = performance.now();

    for (const survivor of survivors) {
        const pulse = getSurvivorSelectionPulse(survivor, now);
        if (pulse <= 0) continue;

        const x = survivor.x + (survivor.recoilX || 0);
        const y = survivor.y + (survivor.recoilY || 0) + 27;
        const radius = 17 + pulse * 5;

        ctx.save();
        ctx.globalAlpha = 0.16 + pulse * 0.48;
        ctx.strokeStyle = "#f3c86e";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }
}

function drawSurvivorPlacementFeedback() {
    const now = performance.now();

    for (const survivor of survivors) {
        const until = Number(survivor?.placementFeedbackUntil) || 0;
        const pulse = getSurvivorPlacementPulse(survivor, now);
        if (pulse <= 0 || !until) continue;

        const progress = 1 - Math.max(0, until - now) / survivorPlacementFeedbackDuration;
        const x = survivor.x + (survivor.recoilX || 0);
        const y = survivor.y + (survivor.recoilY || 0) + 29;
        const radius = 13 + Math.max(0, Math.min(1, progress)) * 14;

        ctx.save();
        ctx.globalAlpha = (1 - Math.max(0, Math.min(1, progress))) * 0.42;
        ctx.strokeStyle = survivor.placementFeedbackKind === "move"
            ? "#8ed7ff"
            : "#f3c86e";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }
}

function drawSurvivorUpgradeFeedback() {
    const now = performance.now();

    for (const survivor of survivors) {
        const until = Number(survivor?.upgradeFeedbackUntil) || 0;
        const pulse = getSurvivorUpgradePulse(survivor, now);
        if (pulse <= 0 || !until) continue;

        const progress = Math.max(
            0,
            Math.min(1, 1 - (until - now) / survivorUpgradeFeedbackDuration)
        );
        const x = Math.round(survivor.x + (survivor.recoilX || 0));
        const y = Math.round(
            survivor.y + (survivor.recoilY || 0) - 36 - pulse * 8
        );
        const accent = Number(survivor.upgradeFeedbackLevel) >= 3
            ? "#c49bea"
            : "#f3c45d";

        ctx.save();
        ctx.globalAlpha = (1 - progress) * 0.75;
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 8 + pulse * 10, 0, Math.PI * 2);
        ctx.stroke();

        // Four compact pixel sparks rise out of the badge. They are drawn on
        // whole pixels so the effect stays sharp at high-DPI browser scales.
        ctx.fillStyle = accent;
        const sparks = [
            [-12, -2, 2],
            [10, -5, 2],
            [-5, -14, 1],
            [5, -16, 2]
        ];
        for (const [offsetX, offsetY, size] of sparks) {
            const drift = Math.round(progress * (offsetY < -10 ? 7 : 4));
            ctx.fillRect(
                x + offsetX,
                y + offsetY - drift,
                size,
                size
            );
        }
        ctx.restore();
    }
}

// Level markers are a foreground layer. Drawing them after every sprite has
// been rendered keeps one survivor's upgrade indicator visible when units
// overlap in a crowded deployment area.
function drawSurvivorLevelMarkers() {
    const width = 64;
    const height = 64;

    for (const survivor of survivors) {
        const upgradeLevel = getSurvivorUpgradeLevel(survivor);
        if (upgradeLevel <= 0) continue;

        const bounce = gamePaused || !waveRunning
            ? 0
            : Math.sin(
                performance.now() / 250 * gameSpeed + survivor.x * 0.1
            ) * 2;
        const selectionNudge = getSurvivorSelectionPulse(survivor) * 3;
        const placementNudge = getSurvivorPlacementPulse(survivor) * 7;
        const upgradeNudge = getSurvivorUpgradePulse(survivor) * 8;
        const upgradePipsY = Math.max(
            4,
            survivor.y + (survivor.recoilY || 0) - height / 2 - 6 + bounce - selectionNudge - placementNudge - upgradeNudge
        );

        drawSurvivorLevelPips(
            survivor.x + (survivor.recoilX || 0),
            upgradePipsY,
            upgradeLevel
        );
    }
}

// A tiny gold badge makes Noah's active aura readable without adding another
// large status panel over the battlefield. It is drawn after all sprites so
// the buff state remains visible when survivors overlap.
function drawNoahBuffIndicators() {
    const now = performance.now();
    const height = 64;
    for (const survivor of survivors) {
        if (!(Number(survivor.noahDamageMultiplier) > 1)) continue;

        // Keep the badge locked to the same animated model origin as the
        // sprite itself. This prevents it from floating when the survivor
        // bounces, recoils, is selected, is moved, or finishes an upgrade.
        const bounce = gamePaused || !waveRunning
            ? 0
            : Math.sin(
                now / 250 * gameSpeed + survivor.x * 0.1
            ) * 2;
        const selectionNudge = getSurvivorSelectionPulse(survivor) * 3;
        const placementNudge = getSurvivorPlacementPulse(survivor) * 7;
        const upgradeNudge = getSurvivorUpgradePulse(survivor) * 8;
        const modelTop = survivor.y + (survivor.recoilY || 0) - height / 2
            + bounce - selectionNudge - placementNudge - upgradeNudge;
        const x = Math.round(survivor.x + (survivor.recoilX || 0) + 11);
        const y = Math.round(modelTop - 4);
        const pulse = 0.78 + Math.sin(now / 260 + survivor.x * 0.02) * 0.14;

        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = "#101217";
        ctx.fillRect(x - 5, y - 5, 11, 11);
        ctx.fillStyle = "#f6c65c";
        ctx.fillRect(x - 1, y - 4, 3, 8);
        ctx.fillRect(x - 4, y - 1, 9, 3);
        ctx.restore();
    }
}



// Combat tuning is intentionally centralized here.  Rarity now changes the
// power budget in a visible way while each weapon keeps its own job:
// common = reliable, uncommon = stronger generalists, rare = high-impact
// specialists, legendary = exceptional ceiling with a sharper tradeoff.
const survivorStats = {
    mason: { range: 135, damage: 14, fireRate: 1.05 },
    james: { range: 115, damage: 16, fireRate: 1.1 },
    cody: { range: 140, damage: 24, fireRate: 1.75 },
    // Britney is the rare single-target specialist.  Give her enough
    // impact to justify the long firing interval without making her a
    // general-purpose replacement for the crowd-control survivors.
    // A small damage lift keeps the rare sniper's long firing interval
    // rewarding without turning her into a general-purpose crowd clearer.
    britney: { range: 225, damage: 64, fireRate: 2.4 },
    // Zach should stay the lower-damage fast-fire common, but not collapse
    // when tested as an opening pick on his own.
    // Zach's common SMG should be dependable from the opening wave.  His
    // signature dual-wield upgrade is tuned separately below so this early
    // buff does not compound his level-3 ceiling.
    zach: { range: 115, damage: 6, fireRate: 0.34 },
    brady: { range: 135, damage: 27, fireRate: 1.55 }
};

const survivorRarities = {
    mason: "common",
    zach: "common",
    brady: "uncommon",
    cody: "uncommon",
    james: "rare",
    britney: "rare"
};

const rarityPowerMultipliers = {
    common: 1,
    uncommon: 1.14,
    rare: 1.32,
    legendary: 1.55
};

// Higher rarities hit harder, but their weapons are more demanding to use.
// This keeps the power jump noticeable without making a legendary recruit a
// flat upgrade in every situation.
const rarityFireRateMultipliers = {
    common: 1,
    uncommon: 1,
    rare: 1.12,
    legendary: 1.2
};

// Upgrades should compete with a fresh deployment for the player's next
// scrap investment.  The first two levels provide a visible combat jump and
// a little more reach; level 3 remains the expensive signature ceiling.
// Level 1 aims for roughly 1.8x a unit's base output: clearly stronger than
// one survivor, but still just below the combined output of two base copies.
const upgradeDamageMultipliers = [1, 1.65, 1.8, 2.1];
const upgradeFireRateMultipliers = [1, 0.92, 0.84, 0.78];

function getSurvivorRarity(type) {
    if (survivorRarities[type]) return survivorRarities[type];
    return customSurvivors.find(survivor => survivor.id === type)?.rarity || "common";
}

function getRarityPowerMultiplier(type) {
    return rarityPowerMultipliers[getSurvivorRarity(type)] || 1;
}

customSurvivors.forEach(survivor => {
    const customDamageTuning = {
        selena: 1,
        radhesh: 1.1,
        rork: 1.25,
        bas: 1.1,
        // Knox's three-round burst was underperforming for an uncommon
        // recruit. Give each burst a stronger, slightly faster pulse.
        knox: 1.15
    };
    // Radhesh's sweep was consistently deleting targets before downstream
    // survivors could engage.  A small cadence reduction preserves his
    // crowd-control identity while giving the rest of the roster more work.
    const customFireRateTuning = {
        knox: 0.85,
        radhesh: 1.1
    };
    survivorStats[survivor.id] = {
        range: survivor.range,
        // Give custom weapons a little role headroom while still respecting
        // the builder's values and the rarity multiplier below.
        damage: survivor.damage * (customDamageTuning[survivor.id] || 1),
        fireRate: survivor.fireRate * (customFireRateTuning[survivor.id] || 1)
    };
});

const customAttackProfiles = {
    selena: { kind: "dagger", repeat: level => level >= 3 ? 3 : 2 },
    radhesh: { kind: "bat", area: true },
    // Bas's syringe sprays every enemy inside his range, applying the slow
    // to the whole group rather than only the selected target.
    bas: { kind: "syringe", area: true, slow: true },
    rork: { kind: "assault" },
    knox: { kind: "burst", repeat: () => 3 },
    nathan: { kind: "handcannon" },
    gregory: { kind: "slingshot", stun: true },
    // William's flamethrower saturates his whole range.
    william: { kind: "fireswarmer", area: true, fireAoe: true },
    // Noah is a pure support unit; his combat loop is skipped below.
    noah: { kind: "support" }
};

function getCustomAttackProfile(survivor) {
    return customAttackProfiles[survivor?.type] || null;
}

// Each survivor can receive Noah's aura from one Noah only. The closest Noah
// wins, with a stable tie-breaker so overlapping auras never stack.
// Noah's aura is useful immediately, then grows at each upgrade tier.  The
// ownership logic below still assigns at most one aura to each survivor.
const noahDamageMultipliers = [1.12, 1.2, 1.3, 1.42];

function getNoahDamageBuffPercent(survivor) {
    const level = getSurvivorUpgradeLevel(survivor);
    return Math.round(((noahDamageMultipliers[level] || 1) - 1) * 100);
}

function updateNoahSupportBuffs() {
    const activeNoahs = survivors.filter(survivor =>
        survivor.type === "noah" &&
        Number.isFinite(Number(survivor.x)) &&
        Number.isFinite(Number(survivor.y))
    );

    for (const target of survivors) {
        target.noahBuffedBy = null;
        target.noahDamageMultiplier = 1;

        if (target.type === "noah" ||
            !Number.isFinite(Number(target.x)) ||
            !Number.isFinite(Number(target.y))) {
            continue;
        }

        const candidates = activeNoahs
            .map(noah => {
                const noahStats = getSurvivorStats(noah);
                const dx = Number(target.x) - Number(noah.x);
                const dy = Number(target.y) - Number(noah.y);
                return {
                    noah,
                    distance: Math.hypot(dx, dy),
                    range: Number(noahStats?.range) || 0
                };
            })
            .filter(candidate => candidate.distance <= candidate.range)
            .sort((first, second) => {
                if (first.distance !== second.distance) {
                    return first.distance - second.distance;
                }
                return String(first.noah.telemetryId || first.noah.type)
                    .localeCompare(String(second.noah.telemetryId || second.noah.type));
            });

        const chosenNoah = candidates[0]?.noah;
        if (!chosenNoah) continue;

        const level = getSurvivorUpgradeLevel(chosenNoah);
        target.noahBuffedBy = chosenNoah.telemetryId || chosenNoah.type;
        target.noahDamageMultiplier = noahDamageMultipliers[level] || 1;
    }
}

const maxSurvivorUpgradeLevel = 3;

function getSurvivorUpgradeLevel(survivor) {
    const level = Math.floor(Number(survivor?.upgradeLevel) || 0);
    return Math.max(0, Math.min(maxSurvivorUpgradeLevel, level));
}

function getSurvivorStats(survivorOrType) {
    const isSurvivor = typeof survivorOrType === "object" && survivorOrType !== null;
    const type = isSurvivor ? survivorOrType.type : survivorOrType;
    const base = survivorStats[type];
    if (!base) return null;

    const level = isSurvivor ? getSurvivorUpgradeLevel(survivorOrType) : 0;
    const masonHighCaliber = isSurvivor && type === "mason" && level >= 3;
    const codyHighlyExplosive = isSurvivor && type === "cody" && level >= 3;
    const britneySemiAuto = isSurvivor && type === "britney" && level >= 3;
    const zachDualWield = isSurvivor && type === "zach" && level >= 3;
    const bradyAutoShotty = isSurvivor && type === "brady" && level >= 3;
    const rarityMultiplier = getRarityPowerMultiplier(type);
    let damage = base.damage * rarityMultiplier * upgradeDamageMultipliers[level];
    const rarityFireRateMultiplier = rarityFireRateMultipliers[getSurvivorRarity(type)] || 1;
    let fireRate = base.fireRate * upgradeFireRateMultipliers[level] * rarityFireRateMultiplier;

    // Signature upgrades are power-defining choices, not just another flat
    // 20% level.  Their tradeoffs keep the roster from collapsing into one
    // best pick while still making level 3 feel exciting.
    if (masonHighCaliber) {
        damage = base.damage * rarityMultiplier * 2.65;
        fireRate = base.fireRate * 1.2 * rarityFireRateMultiplier;
    } else if (codyHighlyExplosive) {
        damage = base.damage * rarityMultiplier * 2.65;
        fireRate = base.fireRate * 1.22 * rarityFireRateMultiplier;
    } else if (britneySemiAuto) {
        damage = base.damage * rarityMultiplier * 1.3;
        fireRate = base.fireRate * 0.58 * rarityFireRateMultiplier;
    } else if (zachDualWield) {
        // Keep the already-tested level-3 dual-wield ceiling stable after the
        // opening-level damage buff above.
        damage = base.damage * rarityMultiplier * 0.56;
        fireRate = base.fireRate * 0.5 * rarityFireRateMultiplier;
    } else if (bradyAutoShotty) {
        damage = base.damage * rarityMultiplier * 1.55;
        fireRate = base.fireRate * 0.5 * rarityFireRateMultiplier;
    }

    // Noah's role is entirely supportive. Keep his combat stats available for
    // range/aura calculations, but expose zero attack damage to the game and UI.
    if (type === "noah") {
        damage = 0;
    }

    const dailyRangeScale = isSurvivor && gameMode === "daily"
        ? getDailyModifierValue("survivorRangeScale", 1)
        : 1;
    const dailyFireRateScale = isSurvivor && gameMode === "daily"
        ? getDailyModifierValue("survivorFireRateScale", 1)
        : 1;
    const williamRangeMultiplier = type === "william"
        ? getWilliamBurnStats(survivorOrType).rangeMultiplier
        : 1;

    return {
        damage: Number(damage.toFixed(2)),
        range: Math.round(base.range * (1 + 0.06 * level) * williamRangeMultiplier * dailyRangeScale),
        fireRate: fireRate * dailyFireRateScale
    };
}

function getSurvivorDps(survivorOrType) {
    const type = typeof survivorOrType === "object" && survivorOrType !== null
        ? survivorOrType.type
        : survivorOrType;
    if (type === "noah") return 0;

    const stats = getSurvivorStats(survivorOrType);
    if (!stats || !stats.fireRate) return 0;
    const level = getSurvivorUpgradeLevel(survivorOrType);
    const attackProfile = getCustomAttackProfile({ type });
    const hitsPerAttack = attackProfile?.repeat
        ? attackProfile.repeat(level)
        : 1;
    const targetMultiplier = type === "zach" && level >= 3
        ? 2
        : type === "radhesh" || type === "cody" || type === "bas"
            ? 1.5
            : 1;
    let estimatedDps = (stats.damage * hitsPerAttack * targetMultiplier) / stats.fireRate;

    // These are conservative estimates: one nearby splash target for area
    // attacks and one active burn target. The detail panel now reflects the
    // tools players actually see on the battlefield instead of hiding them.
    if (type === "james") {
        const burnStats = getJamesBurnStats(survivorOrType);
        estimatedDps += burnStats.damage;
    }

    return Number(estimatedDps.toFixed(1));
}

function getCodyBlastRadius(survivor) {
    const level = getSurvivorUpgradeLevel(survivor);
    const baseRadius = 68;
    const levelTwoRadius = Math.round(baseRadius * 1.18);
    return level >= 3
        ? Math.round(levelTwoRadius * 1.45)
        : Math.round(baseRadius * (1 + 0.09 * level));
}

function getJamesBurnStats(survivor) {
    const level = getSurvivorUpgradeLevel(survivor);
    const napalmThrower = level >= 3;
    const standardTickDamage = 5 * getRarityPowerMultiplier("james") * upgradeDamageMultipliers[level];

    return {
        duration: napalmThrower ? 5 : 4,
        damage: Number((standardTickDamage * (napalmThrower ? 2 : 1)).toFixed(2))
    };
}

function getWilliamBurnStats(survivor) {
    const level = getSurvivorUpgradeLevel(survivor);
    const fuelFlow = level >= 1;
    const wideNozzle = level >= 2;
    const inferno = level >= 3;
    const standardTickDamage = 4 * getRarityPowerMultiplier("william") * upgradeDamageMultipliers[level];

    return {
        duration: fuelFlow ? (inferno ? 5.5 : 4.5) : 4,
        damage: Number((standardTickDamage * (inferno ? 1.35 : 1)).toFixed(2)),
        rangeMultiplier: wideNozzle ? (inferno ? 1.2 : 1.15) : 1
    };
}

function getGregoryStunStats(survivor) {
    const level = getSurvivorUpgradeLevel(survivor);
    const tiers = [
        { chance: 0.10, duration: 0.35 },
        { chance: 0.15, duration: 0.50 },
        { chance: 0.19, duration: 0.65 },
        { chance: 0.22, duration: 0.75 }
    ];
    return tiers[level] || tiers[0];
}

function getSurvivorUpgradeCost(type, level) {
    const baseCost = survivorCosts[type];
    if (!baseCost || level < 1 || level > maxSurvivorUpgradeLevel) return 0;
    // Level 1 is intentionally just below a fresh deployment of the same
    // survivor. Higher levels are larger investments and retain the rarity
    // premium because they unlock a stronger long-term ceiling.
    const upgradeCostMultipliers = [0, 0.85, 1.25, 2.25];
    const rarityCostMultiplier = level === 1
        ? 1
        : ({
            common: 1,
            uncommon: 1.15,
            rare: 1.35,
            legendary: 1.6
        }[getSurvivorRarity(type)] || 1);
    return Math.round(baseCost * upgradeCostMultipliers[level] * rarityCostMultiplier);
}

function getSurvivorTotalInvestment(survivor) {
    let investment = survivorCosts[survivor.type] || 0;
    const level = getSurvivorUpgradeLevel(survivor);

    for (let upgradeLevel = 1; upgradeLevel <= level; upgradeLevel++) {
        investment += getSurvivorUpgradeCost(survivor.type, upgradeLevel);
    }

    return investment;
}

function updateSurvivorUpgradeButton(survivor) {
    const control = document.getElementById("survivorUpgradeControl");
    const button = document.getElementById("upgradeSurvivorButton");
    const label = document.getElementById("survivorUpgradeLabel");
    const costLabel = document.getElementById("survivorUpgradeCost");
    const levelLabel = document.getElementById("survivorUpgradeLevel");
    if (!control || !button || !label || !costLabel || !levelLabel) return;

    if (!survivor || !survivors.includes(survivor) || selectedSurvivor || !gameRunning) {
        control.style.display = "none";
        return;
    }

    control.style.display = "block";
    const level = getSurvivorUpgradeLevel(survivor);
    button.classList.toggle("level-three-upgrade", level >= 2);
    levelLabel.textContent = `LEVEL ${level} / ${maxSurvivorUpgradeLevel}`;

    if (level >= maxSurvivorUpgradeLevel) {
        const customDetails = survivorDetails[survivor.type]?.custom ? survivorDetails[survivor.type] : null;
        if (customDetails) {
            const upgrade = customDetails.upgrades?.[2];
            label.textContent = upgrade?.name || "MAX LEVEL REACHED";
            costLabel.textContent = "FULLY UPGRADED";
            button.disabled = true;
            button.title = upgrade?.description || "This custom survivor has reached the maximum upgrade level.";
            return;
        }
        const hasHighCaliber = survivor.type === "mason" && level >= 3;
        const hasNapalmThrower = survivor.type === "james" && level >= 3;
        const hasHighlyExplosive = survivor.type === "cody" && level >= 3;
        const hasSemiAuto = survivor.type === "britney" && level >= 3;
        const hasDualWield = survivor.type === "zach" && level >= 3;
        const hasAutoShotty = survivor.type === "brady" && level >= 3;
        label.textContent = hasHighCaliber
            ? "HIGH CALIBER"
            : hasNapalmThrower
                ? "NAPALM THROWER"
                : hasHighlyExplosive
                    ? "HIGHLY EXPLOSIVE"
                    : hasSemiAuto
                        ? "SEMI AUTO"
                        : hasDualWield
                            ? "DUAL WIELD"
                            : hasAutoShotty ? "AUTO SHOTTY" : "MAX LEVEL REACHED";
        costLabel.textContent = "FULLY UPGRADED";
        button.disabled = true;
        button.title = hasHighCaliber
            ? "High Caliber is active: 2× level 2 damage with a 25% longer attack interval."
            : hasNapalmThrower
                ? "Napalm Thrower is active: level 3 damage is doubled, burning lasts 25% longer, and burn damage per tick is doubled again."
                : hasHighlyExplosive
                    ? "Highly Explosive is active: doubled level 3 damage, a larger blast, 50% splash damage, and a 25% longer attack interval."
                    : hasSemiAuto
                        ? "Semi Auto is active: about 40% more damage than level 2, firing 80% faster."
                        : hasDualWield
                            ? "Dual Wield is active: half damage per target, fires twice as fast, and hits the first two targets in range."
                            : hasAutoShotty
                                ? "Auto Shotty is active: increased shot damage and fires twice as fast."
                                : "This survivor has reached the maximum upgrade level.";
        return;
    }

    const nextLevel = level + 1;
    const cost = getSurvivorUpgradeCost(survivor.type, nextLevel);
    const customDetails = survivorDetails[survivor.type]?.custom ? survivorDetails[survivor.type] : null;
    if (customDetails) {
        const upgrade = customDetails.upgrades?.[nextLevel - 1];
        label.textContent = "UPGRADE";
        costLabel.textContent = `${cost} SCRAP`;
        button.disabled = scrap < cost;
        button.title = scrap < cost
            ? `Need ${cost - scrap} more scrap to upgrade.`
            : upgrade?.description || `Upgrade this survivor for ${cost} scrap.`;
        return;
    }
    const unlocksHighCaliber = survivor.type === "mason" && nextLevel === 3;
    const unlocksNapalmThrower = survivor.type === "james" && nextLevel === 3;
    const unlocksHighlyExplosive = survivor.type === "cody" && nextLevel === 3;
    const unlocksSemiAuto = survivor.type === "britney" && nextLevel === 3;
    const unlocksDualWield = survivor.type === "zach" && nextLevel === 3;
    const unlocksAutoShotty = survivor.type === "brady" && nextLevel === 3;
    label.textContent = "UPGRADE";
    costLabel.textContent = `${cost} SCRAP`;
    button.disabled = scrap < cost;
    button.title = scrap < cost
        ? `Need ${cost - scrap} more scrap to upgrade.`
        : unlocksHighCaliber
            ? "High Caliber deals 2× Mason's level 2 damage, with a 25% longer attack interval."
            : unlocksNapalmThrower
                ? "Napalm Thrower doubles level 3 damage, extends burning 25%, and doubles burn damage per tick again."
                : unlocksHighlyExplosive
                    ? "Highly Explosive doubles level 3 damage, increases blast size, deals 50% damage to splash targets, and fires more slowly."
                        : unlocksSemiAuto
                            ? "Semi Auto doubles its level 3 damage, then fires 80% faster than level 2."
                            : unlocksDualWield
                                ? "Dual Wield fires twice as fast and hits two targets at once, dealing half damage to each target."
                                : unlocksAutoShotty
                                    ? "Auto Shotty increases shot damage and doubles Brady's attack rate."
                                    : `Upgrade this survivor for ${cost} scrap.`;
}

const survivorDescriptions = {
    mason: "Handgun. A dependable sidearm with balanced range and damage.",
    james: "Flamethrower. A close-range stream that ignites its target.",
    cody: "Grenade launcher. Explosive rounds blast nearby enemies.",
    britney: "Sniper rifle. Precise, long-range shots with high damage.",
    zach: "SMG. A rapid burst of light rounds at close range.",
    brady: "Shotgun. A tight pellet spread knocks enemies back."
};
const survivorAbilityTags = {
    mason: "STEADY",
    james: "BURN",
    cody: "AREA DAMAGE",
    britney: "LONG RANGE",
    zach: "FAST FIRE",
    brady: "KNOCKBACK",
    selena: "DOUBLE HIT",
    radhesh: "SWEEP",
    bas: "AREA SLOW",
    rork: "ASSAULT",
    knox: "3-ROUND BURST",
    william: "AREA BURN",
    noah: "DAMAGE AURA"
};
customSurvivors.forEach(survivor => {
    survivorDescriptions[survivor.id] = survivor.description;
});

// On touch devices the canvas is already doing a lot of work to animate the
// battlefield. Drawing an animated range arc into that canvas makes every
// frame pay the cost of the full scene. A small compositor-owned ring keeps
// the selection feedback smooth without changing the desktop presentation.
let mobileSelectionRangeRing = null;

function isMobileGameplayViewport() {
    return Boolean(window.matchMedia?.("(max-width: 900px)").matches);
}

function getMobileSelectionRangeRing() {
    if (mobileSelectionRangeRing) return mobileSelectionRangeRing;

    const battlefield = canvas?.closest(".battlefield");
    if (!battlefield) return null;

    mobileSelectionRangeRing = document.createElement("div");
    mobileSelectionRangeRing.className = "mobile-selection-range-ring";
    mobileSelectionRangeRing.setAttribute("aria-hidden", "true");
    battlefield.appendChild(mobileSelectionRangeRing);
    return mobileSelectionRangeRing;
}

function hideMobileSelectionRangeOverlay() {
    if (mobileSelectionRangeRing) {
        mobileSelectionRangeRing.hidden = true;
    }
}

function syncMobileSelectionRangeOverlay() {
    const ring = getMobileSelectionRangeRing();
    if (!ring || !isMobileGameplayViewport() || !inspectedSurvivor) {
        hideMobileSelectionRangeOverlay();
        return;
    }

    const range = Number(getSurvivorStats(inspectedSurvivor)?.range) || 0;
    if (range <= 0) {
        hideMobileSelectionRangeOverlay();
        return;
    }

    const battlefield = canvas.closest(".battlefield");
    const canvasRect = canvas.getBoundingClientRect();
    const battlefieldRect = battlefield.getBoundingClientRect();
    const scaleX = canvasRect.width / canvas.width;
    const scaleY = canvasRect.height / canvas.height;
    const diameterX = range * 2 * scaleX;
    const diameterY = range * 2 * scaleY;
    const centerX = canvasRect.left - battlefieldRect.left + inspectedSurvivor.x * scaleX;
    const centerY = canvasRect.top - battlefieldRect.top + inspectedSurvivor.y * scaleY;

    ring.style.width = `${diameterX}px`;
    ring.style.height = `${diameterY}px`;
    ring.style.left = `${centerX - diameterX / 2}px`;
    ring.style.top = `${centerY - diameterY / 2}px`;
    ring.classList.toggle("noah-range", inspectedSurvivor.type === "noah");
    ring.hidden = false;
}

window.addEventListener("resize", () => {
    if (!mobileSelectionRangeRing?.hidden) {
        window.requestAnimationFrame(syncMobileSelectionRangeOverlay);
    }
}, { passive: true });
window.addEventListener("orientationchange", () => {
    window.requestAnimationFrame(syncMobileSelectionRangeOverlay);
}, { passive: true });

function hideSurvivorDetails() {
    const detailsPanel = document.getElementById("survivorDetailsPanel");
    if (!detailsPanel) return;

    // The mobile range ring lives outside the canvas so its animation can be
    // handled by the browser compositor instead of forcing a full battlefield
    // repaint every frame. Keep it in lockstep with the selected dossier.
    hideMobileSelectionRangeOverlay();

    detailsPanel.classList.remove(
        "is-visible",
        "rarity-common",
        "rarity-uncommon",
        "rarity-rare",
        "rarity-legendary"
    );
    detailsPanel.hidden = true;
    detailsPanel.style.display = "none";
    detailsPanel.style.removeProperty("height");
    detailsPanel.style.removeProperty("max-height");
    detailsPanel.style.removeProperty("overflow");
    detailsPanel.removeAttribute("aria-expanded");
    detailsPanel.setAttribute("aria-hidden", "true");
}

function getSurvivorNoahDamageMultiplier(survivor) {
    if (!survivor || survivor.type === "noah") return 1;
    const multiplier = Number(survivor.noahDamageMultiplier);
    return Number.isFinite(multiplier) && multiplier > 1 ? multiplier : 1;
}

function updateInspectedSurvivorCardStats() {
    const survivor = inspectedSurvivor;
    if (!survivor) return;

    const stats = getSurvivorStats(survivor);
    if (!stats) return;

    const isNoah = survivor.type === "noah";
    const multiplier = getSurvivorNoahDamageMultiplier(survivor);
    const displayedDamage = Number((stats.damage * multiplier).toFixed(2));
    const displayedDps = (getSurvivorDps(survivor) * multiplier).toFixed(1);
    const damageNode = document.getElementById("survivorDetailDamage");
    const damageTile = document.getElementById("survivorDetailDamageTile");
    const combatStats = document.getElementById("survivorDetailCombatStats");
    const targetingControl = document.getElementById("survivorTargetingControl");
    const dpsNode = document.getElementById("survivorDetailDps");
    const roleNode = document.getElementById("survivorDetailRole");
    const buffNode = document.getElementById("survivorDetailBuff");
    const costNode = document.getElementById("survivorDetailCost");

    if (damageTile) {
        const label = damageTile.querySelector("span");
        if (label) label.textContent = isNoah ? "DAMAGE BUFF" : "DAMAGE";
    }
    if (damageNode) {
        damageNode.textContent = isNoah
            ? `+${getNoahDamageBuffPercent(survivor)}%`
            : String(displayedDamage);
    }
    if (dpsNode) dpsNode.textContent = displayedDps;
    if (combatStats) combatStats.hidden = isNoah;
    if (targetingControl) targetingControl.hidden = isNoah || targetingControl.hidden;
    if (costNode) costNode.hidden = survivors.includes(survivor);

    if (roleNode) {
        roleNode.dataset.noahBuffed = !isNoah && multiplier > 1 ? "true" : "false";
    }

    if (buffNode) {
        if (!isNoah && multiplier > 1) {
            const bonus = Math.round((multiplier - 1) * 100);
            buffNode.hidden = false;
            buffNode.textContent = `NOAH'S WISDOM · +${bonus}% DAMAGE`;
            buffNode.title = `Damage and estimated DPS are boosted by Noah's Wisdom (+${bonus}%).`;
        } else {
            buffNode.hidden = true;
            buffNode.textContent = "";
            buffNode.removeAttribute("title");
        }
    }
}

function showSurvivorDetails(id) {
    updateNoahSupportBuffs();
    const person = survivorDetails[id];

    const deployedUnit = survivors.find(survivor =>
        survivor.type === id && survivor === inspectedSurvivor
    );


    const detail = getSurvivorStats(deployedUnit || id);
    if (!person || !detail) return;

    const detailsPanel = document.getElementById("survivorDetailsPanel");
    const detailRarity = person.rarity || getSurvivorRarity(id) || "common";
    detailsPanel.classList.remove(
        "rarity-common",
        "rarity-uncommon",
        "rarity-rare",
        "rarity-legendary"
    );
    detailsPanel.classList.add(`rarity-${detailRarity}`, "is-visible");
    detailsPanel.hidden = false;
    detailsPanel.style.display = "block";
    // The command panel is a flex column.  Keep the open dossier as a real
    // flow item instead of allowing the panel's compact sizing rules to
    // shrink it down to a border-only sliver on phones.
    detailsPanel.style.setProperty("flex", "0 0 auto", "important");
    detailsPanel.style.setProperty("min-height", "0", "important");
    detailsPanel.style.removeProperty("height");
    detailsPanel.style.removeProperty("max-height");
    detailsPanel.style.removeProperty("overflow");
    detailsPanel.setAttribute("aria-expanded", "true");
    detailsPanel.setAttribute("aria-hidden", "false");

    syncMobileSelectionRangeOverlay();

    const commandPanel = detailsPanel.closest(".control-panel");
    const isMobileLayout = window.matchMedia?.("(max-width: 900px)").matches;
    if (commandPanel && isMobileLayout) {
        commandPanel.style.setProperty("height", "auto", "important");
        commandPanel.style.setProperty("max-height", "none", "important");
        commandPanel.style.setProperty("overflow", "visible", "important");
        commandPanel.style.setProperty("overflow-y", "visible", "important");
        detailsPanel.style.setProperty("min-height", "220px", "important");
    }
const portraitFiles = {
    mason: "model-portraits/Mason.png",
    james: "model-portraits/James.png",
    cody: "model-portraits/Cody.png",
    britney: "model-portraits/Britney.png",
    zach: "model-portraits/Zach.png",
    brady: "model-portraits/Brady.png"
};

const portrait = document.getElementById("survivorPortrait");
portrait.src = person.portraitData || ("Images/" + (portraitFiles[id] || "Mason.png"));
portrait.dataset.portraitId = id;
portrait.alt = person.name + "'s portrait";    document.getElementById("survivorDetailName").textContent = person.name;
    document.getElementById("survivorDetailRole").textContent = survivorAbilityTags[id]
        ? `${person.role} · ${survivorAbilityTags[id]}`
        : person.role;
    const costNode = document.getElementById("survivorDetailCost");
    costNode.textContent = person.cost + " SCRAP";
    costNode.hidden = Boolean(deployedUnit);

    const isNoah = id === "noah" || deployedUnit?.type === "noah";
    const noahMultiplier = getSurvivorNoahDamageMultiplier(deployedUnit);
    const damageTile = document.getElementById("survivorDetailDamageTile");
    const combatStats = document.getElementById("survivorDetailCombatStats");
    const targetingControl = document.getElementById("survivorTargetingControl");
    if (damageTile) {
        const label = damageTile.querySelector("span");
        if (label) label.textContent = isNoah ? "DAMAGE BUFF" : "DAMAGE";
    }
    if (combatStats) combatStats.hidden = isNoah;
    if (targetingControl) targetingControl.hidden = isNoah;
    document.getElementById("survivorDetailDamage").textContent = isNoah
        ? `+${getNoahDamageBuffPercent(deployedUnit || { type: "noah" })}%`
        : String(Number((detail.damage * noahMultiplier).toFixed(2)));
    document.getElementById("survivorDetailRange").textContent = detail.range;
    document.getElementById("survivorDamageDealt").textContent =
    deployedUnit ? Math.round(deployedUnit.damageDealt || 0) : 0;

document.getElementById("survivorKills").textContent =
    deployedUnit ? deployedUnit.kills || 0 : 0;
    document.getElementById("survivorDetailDps").textContent =
        (getSurvivorDps(deployedUnit || id) * noahMultiplier).toFixed(1);
    document.getElementById("survivorDetailDps").title =
        "Estimated DPS includes a conservative nearby target for area attacks and active burn damage.";
    const buffNode = document.getElementById("survivorDetailBuff");
    if (buffNode) {
        if (!isNoah && noahMultiplier > 1) {
            const bonus = Math.round((noahMultiplier - 1) * 100);
            buffNode.hidden = false;
            buffNode.textContent = `NOAH'S WISDOM · +${bonus}% DAMAGE`;
            buffNode.title = `Damage and estimated DPS are boosted by Noah's Wisdom (+${bonus}%).`;
        } else {
            buffNode.hidden = true;
            buffNode.textContent = "";
            buffNode.removeAttribute("title");
        }
    }
    document.getElementById("survivorDetailRole").dataset.noahBuffed =
        !isNoah && noahMultiplier > 1 ? "true" : "false";

   
const deployedUpgradeLevel = getSurvivorUpgradeLevel(deployedUnit);
let detailDescription = survivorDescriptions[id];
if (person.custom && deployedUpgradeLevel > 0) {
    const upgrade = person.upgrades?.[Math.min(deployedUpgradeLevel, 3) - 1];
    detailDescription = upgrade?.description || detailDescription;
} else if (deployedUnit?.type === "mason" && deployedUpgradeLevel >= 2) {
    detailDescription = deployedUpgradeLevel >= 3
        ? "High Caliber active: 2× level 2 damage, with a 25% longer attack interval."
        : "Next upgrade: High Caliber deals 2× level 2 damage, with a 25% longer attack interval.";
} else if (deployedUnit?.type === "james" && deployedUpgradeLevel >= 2) {
    detailDescription = deployedUpgradeLevel >= 3
        ? "Napalm Thrower active: level 3 damage is doubled, burning lasts 25% longer, and burn damage per tick doubles again."
        : "Next upgrade: Napalm Thrower doubles level 3 damage, extends burning 25%, and doubles burn damage per tick again.";
} else if (deployedUnit?.type === "cody" && deployedUpgradeLevel >= 2) {
    detailDescription = deployedUpgradeLevel >= 3
        ? "Highly Explosive active: doubled level 3 damage, a larger blast, 50% damage to nearby targets, and a 25% longer attack interval."
        : "Next upgrade: Highly Explosive doubles level 3 damage, adds a larger blast, deals 50% damage to nearby targets, and fires more slowly.";
} else if (deployedUnit?.type === "britney" && deployedUpgradeLevel >= 2) {
    detailDescription = deployedUpgradeLevel >= 3
        ? "Semi Auto active: about 40% more damage than level 2, firing 80% faster."
        : "Next upgrade: Semi Auto doubles its level 3 damage, then fires 80% faster than level 2.";
} else if (deployedUnit?.type === "zach" && deployedUpgradeLevel >= 2) {
    detailDescription = deployedUpgradeLevel >= 3
        ? "Dual Wield active: fires twice as fast, hits two targets at once, and deals half damage to each target."
        : "Next upgrade: Dual Wield fires twice as fast, hits two targets at once, and deals half damage to each target.";
} else if (deployedUnit?.type === "brady" && deployedUpgradeLevel >= 2) {
    detailDescription = deployedUpgradeLevel >= 3
        ? "Auto Shotty active: increased shot damage and doubles Brady's attack rate."
        : "Next upgrade: Auto Shotty increases shot damage and doubles Brady's attack rate.";
}
document.getElementById("survivorDetailDescription").textContent = detailDescription;

    if (isNoah) {
        // Noah is a pure aura support unit and has no attack target to set.
        if (targetingControl) targetingControl.hidden = true;
    } else {
        updateSurvivorTargetingControl(deployedUnit || null);
    }
updateSurvivorUpgradeButton(deployedUnit || null);
updateSellButton();
updateMoveButton();
}




function knockEnemyBackAlongRoad(enemy, distance) {
    let remaining = distance;

    while (remaining > 0.01 && enemy.targetPoint > 0) {
        const segmentStart = roadPoints[enemy.targetPoint - 1];
        const segmentEnd = roadPoints[enemy.targetPoint];
        if (!segmentStart || !segmentEnd) return;

        const segmentX = segmentEnd.x - segmentStart.x;
        const segmentY = segmentEnd.y - segmentStart.y;
        const segmentLength = Math.hypot(segmentX, segmentY);
        if (segmentLength <= 0) {
            if (enemy.targetPoint <= 1) break;
            enemy.targetPoint--;
            continue;
        }

        const directionX = segmentX / segmentLength;
        const directionY = segmentY / segmentLength;
        const offsetX = enemy.x - segmentStart.x;
        const offsetY = enemy.y - segmentStart.y;
        const progress = Math.max(0, Math.min(
            segmentLength,
            offsetX * directionX + offsetY * directionY
        ));
        const step = Math.min(progress, remaining);

        enemy.x -= directionX * step;
        enemy.y -= directionY * step;
        remaining -= step;

        if (remaining > 0.01) {
            enemy.x = segmentStart.x;
            enemy.y = segmentStart.y;
            if (enemy.targetPoint <= 1) break;
            enemy.targetPoint--;
        }
    }
}

// Return a monotonic distance along the current road.  Array order is spawn
// order, not threat order: a fast skitter or a splitter child can overtake an
// older enemy and must become the next target immediately.
function getEnemyPathProgress(enemy) {
    if (!enemy || enemy.finished) return Number.POSITIVE_INFINITY;

    const lastSegment = Math.max(1, roadPoints.length - 1);
    const targetPoint = Math.max(1, Math.min(lastSegment, Math.floor(Number(enemy.targetPoint) || 1)));
    let progress = 0;

    for (let index = 0; index < targetPoint - 1; index++) {
        const start = roadPoints[index];
        const end = roadPoints[index + 1];
        if (start && end) progress += Math.hypot(end.x - start.x, end.y - start.y);
    }

    const segmentStart = roadPoints[targetPoint - 1];
    const segmentEnd = roadPoints[targetPoint];
    if (!segmentStart || !segmentEnd) return progress;

    const segmentX = segmentEnd.x - segmentStart.x;
    const segmentY = segmentEnd.y - segmentStart.y;
    const segmentLength = Math.hypot(segmentX, segmentY);
    if (segmentLength <= 0) return progress;

    const projection = (
        (enemy.x - segmentStart.x) * segmentX
        + (enemy.y - segmentStart.y) * segmentY
    ) / segmentLength;
    return progress + Math.max(0, Math.min(segmentLength, projection));
}

function drawSurvivorPreview() {
    const movingSurvivor = moveMode && inspectedSurvivor;
    const previewType = movingSurvivor
        ? inspectedSurvivor.type
        : selectedSurvivor;

    if (!previewType || !mouseOnCanvas || !gameRunning) return;

    const range = getSurvivorStats(previewType).range;

    // Check whether the preview location is valid.
    let validPlacement =
        !isSurvivorFootprintOnRoad(mouseX, mouseY) &&
        !isOutsideSurvivorPlacementBounds(mouseX, mouseY);

    for (const survivor of survivors) {
        // Ignore the survivor being moved.
        if (movingSurvivor && survivor === inspectedSurvivor) {
            continue;
        }

        const dx = survivor.x - mouseX;
        const dy = survivor.y - mouseY;

        if (Math.sqrt(dx * dx + dy * dy) < 45) {
            validPlacement = false;
            break;
        }
    }

    // Only normal deployment requires scrap.
    if (!movingSurvivor && scrap < survivorCosts[previewType]) {
        validPlacement = false;
    }

    ctx.save();

    // Draw the attack range preview.
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, range, 0, Math.PI * 2);

    ctx.fillStyle = validPlacement
        ? "rgba(80, 220, 100, 0.12)"
        : "rgba(230, 60, 50, 0.12)";
    ctx.fill();

    ctx.strokeStyle = validPlacement
        ? "rgba(80, 220, 100, 0.8)"
        : "rgba(230, 60, 50, 0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw a colored marker under the preview.
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = validPlacement ? "#50dc64" : "#e63c32";
    ctx.fillRect(mouseX - 12, mouseY - 12, 24, 24);

    ctx.restore();

    // Draw the actual survivor sprite at the preview location.
    const originalSurvivors = survivors.length;

    survivors.push({
        x: mouseX,
        y: mouseY,
        type: previewType
    });

    ctx.save();
    ctx.globalAlpha = 0.65;
    drawSurvivors();
    ctx.restore();

    survivors.splice(originalSurvivors, 1);
}



const weaponAudioProfiles = {
    mason:   { wave: "square",    start: 520, end: 125, time: 0.065, tone: 0.055, noise: 0.055, hiss: 0.025, cutoff: 2200 },
    james:   { wave: "sawtooth",  start: 210, end: 82,  time: 0.12,  tone: 0.035, noise: 0.035, hiss: 0.095, cutoff: 1050 },
    cody:    { wave: "triangle",  start: 155, end: 72,  time: 0.078, tone: 0.072, noise: 0.032, hiss: 0.032, cutoff: 900 },
    britney: { wave: "triangle",  start: 760, end: 105, time: 0.09,  tone: 0.075, noise: 0.06,  hiss: 0.035, cutoff: 3000 },
    zach:    { wave: "square",    start: 600, end: 170, time: 0.042, tone: 0.042, noise: 0.032, hiss: 0.018, cutoff: 1900 },
    brady:   { wave: "sawtooth",  start: 155, end: 52,  time: 0.13,  tone: 0.085, noise: 0.07,  hiss: 0.075, cutoff: 1500 },
    selena:  { wave: "triangle",  start: 920, end: 280, time: 0.055, tone: 0.045, noise: 0.018, hiss: 0.018, cutoff: 3800 },
    radhesh: { wave: "sawtooth",  start: 220, end: 68,  time: 0.16,  tone: 0.08,  noise: 0.09,  hiss: 0.07,  cutoff: 1200 },
    bas:     { wave: "triangle",  start: 740, end: 310, time: 0.09,  tone: 0.05,  noise: 0.02, hiss: 0.025, cutoff: 3300 },
    rork:    { wave: "square",    start: 560, end: 110, time: 0.06,  tone: 0.05,  noise: 0.06, hiss: 0.028, cutoff: 2300 },
    knox:    { wave: "square",    start: 610, end: 150, time: 0.045, tone: 0.045, noise: 0.05, hiss: 0.022, cutoff: 2500 },
    nathan:  { wave: "sawtooth",  start: 190, end: 48,  time: 0.16,  tone: 0.105, noise: 0.09,  hiss: 0.09,  cutoff: 1100 },
    gregory: { wave: "triangle",  start: 880, end: 360, time: 0.10,  tone: 0.055, noise: 0.012, hiss: 0.025, cutoff: 3000 },
    william: { wave: "sawtooth",  start: 180, end: 62,  time: 0.15,  tone: 0.09,  noise: 0.08, hiss: 0.09, cutoff: 1250 }
};

const audioMuteKey = "wastelandDefense.audioMuted.v1";
let gameAudioMuted = false;
try {
    gameAudioMuted = localStorage.getItem(audioMuteKey) === "true";
} catch {
    // Keep audio enabled by default when browser storage is unavailable.
}

function updateAudioMuteButton() {
    const button = document.getElementById("muteButton");
    if (!button) return;

    const state = document.getElementById("muteButtonState");
    const mark = document.getElementById("muteButtonMark");
    button.setAttribute("aria-pressed", String(gameAudioMuted));
    button.setAttribute("aria-label", gameAudioMuted ? "Unmute sound" : "Mute sound");
    button.title = gameAudioMuted ? "Unmute sound" : "Mute sound";
    button.classList.toggle("is-muted", gameAudioMuted);
    if (state) state.textContent = gameAudioMuted ? "OFF" : "ON";
    if (mark) mark.textContent = gameAudioMuted ? "×" : "♫";
}

function setMuteButtonVisible(visible) {
    const button = document.getElementById("muteButton");
    if (button) button.hidden = !visible;
}

function setGameAudioMuted(muted) {
    gameAudioMuted = Boolean(muted);
    try {
        localStorage.setItem(audioMuteKey, String(gameAudioMuted));
    } catch {
        // The sound toggle still works until the page is closed.
    }

    const audio = window.jamesAudioContext;
    const masterGain = window.wastelandSoundGain;
    if (audio && masterGain) {
        masterGain.gain.cancelScheduledValues(audio.currentTime);
        masterGain.gain.setTargetAtTime(gameAudioMuted ? 0 : 1, audio.currentTime, 0.012);
    }
    updateAudioMuteButton();
}

updateAudioMuteButton();

function playWeaponAttackSound(type, delay = 0, intensity = 1) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const profile = weaponAudioProfiles[type] || weaponAudioProfiles.mason;
    const soundIntensity = Math.max(0.5, Math.min(2, Number(intensity) || 1));
    if (gameAudioMuted || !AudioContextClass || !profile) return;

    if (!window.jamesAudioContext) {
        window.jamesAudioContext = new AudioContextClass();
    }

    const audio = window.jamesAudioContext;
    if (!window.wastelandSoundGain) {
        window.wastelandSoundGain = audio.createGain();
        window.wastelandSoundGain.gain.value = gameAudioMuted ? 0 : 1;
        window.wastelandSoundGain.connect(audio.destination);
    }
    if (audio.state === "suspended") audio.resume();

    // Every layer begins on this shot; Cody has a compact launch thump only.
    const now = audio.currentTime + Math.max(0, delay);
    const oscillator = audio.createOscillator();
    const toneGain = audio.createGain();
    oscillator.type = profile.wave;
    oscillator.frequency.setValueAtTime(profile.start, now);
    oscillator.frequency.exponentialRampToValueAtTime(profile.end, now + profile.time);
    toneGain.gain.setValueAtTime(0.0001, now);
    toneGain.gain.exponentialRampToValueAtTime(profile.tone * soundIntensity, now + 0.004);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, now + profile.time);
    oscillator.connect(toneGain);
    toneGain.connect(window.wastelandSoundGain);
    oscillator.start(now);
    oscillator.stop(now + profile.time + 0.005);

    if (!audio.weaponNoiseBuffer) {
        const sampleCount = Math.ceil(audio.sampleRate * 0.12);
        const buffer = audio.createBuffer(1, sampleCount, audio.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < sampleCount; i++) {
            samples[i] = Math.random() * 2 - 1;
        }
        audio.weaponNoiseBuffer = buffer;
    }

    const noise = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const noiseGain = audio.createGain();
    const noiseDuration = profile.hiss;
    noise.buffer = audio.weaponNoiseBuffer;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(profile.cutoff, now);
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(profile.noise * soundIntensity, now + 0.003);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + noiseDuration);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(window.wastelandSoundGain);
    noise.start(now);
    noise.stop(now + noiseDuration + 0.005);
}

function playSurvivorUpgradeSound(level = 1) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (gameAudioMuted || !AudioContextClass) return;

    if (!window.jamesAudioContext) {
        window.jamesAudioContext = new AudioContextClass();
    }

    const audio = window.jamesAudioContext;
    if (!window.wastelandSoundGain) {
        window.wastelandSoundGain = audio.createGain();
        window.wastelandSoundGain.gain.value = gameAudioMuted ? 0 : 1;
        window.wastelandSoundGain.connect(audio.destination);
    }
    if (audio.state === "suspended") audio.resume();

    // A short rising arpeggio reads as a reward without becoming a menu
    // jingle. Level three gets a slightly brighter final note.
    const now = audio.currentTime;
    const notes = level >= 3
        ? [523.25, 659.25, 783.99, 1046.5]
        : [523.25, 659.25, 783.99];
    const master = audio.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.11, now + 0.018);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
    master.connect(window.wastelandSoundGain);

    notes.forEach((frequency, index) => {
        const oscillator = audio.createOscillator();
        const noteGain = audio.createGain();
        const start = now + index * 0.075;
        oscillator.type = index === notes.length - 1 ? "sine" : "triangle";
        oscillator.frequency.setValueAtTime(frequency, start);
        noteGain.gain.setValueAtTime(0.0001, start);
        noteGain.gain.exponentialRampToValueAtTime(0.72, start + 0.012);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
        oscillator.connect(noteGain);
        noteGain.connect(master);
        oscillator.start(start);
        oscillator.stop(start + 0.18);
    });
}

function addShotVisual(survivor, enemy, dx, dy, distance, type, shotIndex = 0, shotCount = 1) {
    const upgradeLevel = getSurvivorUpgradeLevel(survivor);
    const unitX = dx / distance;
    const unitY = dy / distance;
    const volleyOffset = (type === "selena" || type === "knox")
        ? (shotIndex % 2 === 0 ? -4 : 4)
        : 0;
    const startX = survivor.x + unitX * 18 - unitY * volleyOffset;
    const startY = survivor.y + unitY * 18 + unitX * volleyOffset;

    if (type === "brady") {
        // Three close pellet traces read as a shotgun spread, but damage is
        // still applied only once to the selected enemy in the combat loop.
        const angle = Math.atan2(dy, dx);
        const spreadX = -Math.sin(angle);
        const spreadY = Math.cos(angle);
        for (const offset of [-6, 0, 6]) {
            const endX = enemy.x + spreadX * offset;
            const endY = enemy.y + spreadY * offset;
            bullets.push({
                startX, startY, endX, endY,
                life: 0.105, maxLife: 0.105, type
            });
        }
        return;
    }

    if (type === "radhesh") {
        blastEffects.push({
            kind: "bat",
            x: survivor.x,
            y: survivor.y,
            targetX: enemy.x,
            targetY: enemy.y,
            radius: 24,
            life: 0.2,
            maxLife: 0.2
        });
        return;
    }

    bullets.push({
        startX, startY,
        endX: enemy.x,
        endY: enemy.y,
        life: type === "james" ? 0.13 : 0.105,
        maxLife: type === "james" ? 0.13 : 0.105,
        type,
        shotIndex,
        shotCount,
        projectileScale: type === "nathan"
            ? (upgradeLevel >= 3 ? 1.65 : 1.15)
            : type === "gregory" ? 1.1 : 1
    });
}

function addImpactPixels(enemy, type, dx, dy) {
    const palettes = {
        mason: ["#fff0bf", "#d99b55", "#f3c875"],
        james: ["#ffe27a", "#f18a3e", "#e85b32"],
        cody: ["#ead19b", "#c99a5c", "#fff0c8"],
        britney: ["#fff8df", "#e3d2b0", "#d9aa61"],
        zach: ["#fff0bd", "#d6a552", "#e9bd68"],
        brady: ["#ffe7a0", "#e9a34c", "#f3c875"],
        selena: ["#d8f4ff", "#81d8ed", "#ffffff"],
        radhesh: ["#f4d08d", "#c0844d", "#fff0b4"],
        bas: ["#b9f3ff", "#5fc6d8", "#e8ffff"],
        rork: ["#d9e7b5", "#9ab36e", "#f4ffd7"],
        knox: ["#fff0bd", "#d3b35a", "#fff8d0"],
        nathan: ["#fff0b5", "#d5a65b", "#f4ca73"],
        gregory: ["#ffe2ad", "#a97c57", "#d6b28a"]
    };
    const colors = palettes[type] || palettes.mason;
    const angleToTarget = Math.atan2(dy, dx);
    const phase = ((Math.round(enemy.x + enemy.y) % 11) / 11) * Math.PI * 2;
    const isLauncher = type === "cody";
    const count = isLauncher ? 2 : 4;

    for (let i = 0; i < count; i++) {
        // Cody's launcher gets a tiny, forward-flying contact fleck rather
        // than a radial burst, keeping its direct-hit behavior clear.
        const angle = isLauncher
            ? angleToTarget + (i === 0 ? -0.35 : 0.35)
            : phase + i * Math.PI / 2;
        const speed = isLauncher ? 18 + i * 4 : 34 + (i % 2) * 15;
        const life = isLauncher ? 0.075 : 0.12 + (i % 2) * 0.035;

        impactPixels.push({
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life,
            maxLife: life,
            size: isLauncher ? 2 : 2 + (i % 2),
            color: colors[i % colors.length]
        });
    }
}

function addBlastEffect(x, y, radius) {
    blastEffects.push({ x, y, radius, life: 0.28, maxLife: 0.28 });
}

function applySurvivorDamage(survivor, enemy, damage, isSplash = false, hitIndex = 0) {
    enemy.healthTrail = Math.max(
        Number.isFinite(enemy.healthTrail) ? enemy.healthTrail : enemy.health,
        enemy.health
    );
    const damageType = getSurvivorDamageType(survivor);
    const damageTypeMultiplier = getEnemyDamageMultiplier(enemy, damageType);
    // Fire-immune enemies take no direct fire damage. This check must happen
    // before the normal minimum-damage floor so immunity is absolute.
    if (damageTypeMultiplier <= 0) return;
    const armorPiercing = ["mason", "cody", "brady"].includes(survivor.type)
        || (survivor.type === "james" && getSurvivorUpgradeLevel(survivor) >= 3);
    const armorMultiplier = enemy.isArmored
        ? (armorPiercing ? 0.86 : (enemy.armorMultiplier || 0.58))
        : 1;
    const actualDamage = Math.min(
        enemy.health,
        Math.max(1, damage * armorMultiplier * damageTypeMultiplier)
    );
    enemy.health -= actualDamage;
    enemy.lastHitBy = survivor;
    survivor.telemetryHits = (survivor.telemetryHits || 0) + 1;
    enemy.hitFlash = 0.15;
    survivor.damageDealt += actualDamage;

    floatingDamageNumbers.push({
        x: enemy.x + (hitIndex % 2 === 0 ? -5 : 5),
        y: enemy.y - 25 - hitIndex * 4,
        driftX: hitIndex % 2 === 0 ? -2.5 : 2.5,
        amount: Math.round(actualDamage),
        life: 0.8,
        maxLife: 0.8,
        spawnedAt: performance.now(),
        isSplash,
        damageType,
        isWeakness: damageTypeMultiplier > 1.01,
        isResistance: damageTypeMultiplier < 0.99
    });
}

function compareAttackTargets(first, second, priority = targetingPriority) {
    const firstEnemy = first.enemy;
    const secondEnemy = second.enemy;

    // Stable tie-breakers keep the order readable and prevent targets from
    // flickering when two enemies have the same primary stat.
    const progressDifference = second.pathProgress - first.pathProgress;
    const speedDifference = (secondEnemy.speed || 0) - (firstEnemy.speed || 0);
    const healthDifference = (secondEnemy.health || 0) - (firstEnemy.health || 0);
    const maxHealthDifference = (secondEnemy.maxHealth || 0) - (firstEnemy.maxHealth || 0);

    if (priority === "closest") {
        if (Math.abs(first.distance - second.distance) > 0.01) {
            return first.distance - second.distance;
        }
    } else if (priority === "strongest") {
        if (Math.abs(maxHealthDifference) > 0.01) return maxHealthDifference;
        if (Math.abs(healthDifference) > 0.01) return healthDifference;
    } else if (priority === "fastest") {
        if (Math.abs(speedDifference) > 0.01) return speedDifference;
    } else if (Math.abs(progressDifference) > 0.01) {
        // Default: prioritize the hostile furthest along the road.
        return progressDifference;
    }

    if (Math.abs(progressDifference) > 0.01) return progressDifference;
    if (Math.abs(speedDifference) > 0.01) return speedDifference;
    if (Math.abs(healthDifference) > 0.01) return healthDifference;
    return (secondEnemy.leakDamage || 0) - (firstEnemy.leakDamage || 0);
}

function updateSurvivorTargetingControl(survivor) {
    const control = document.getElementById("survivorTargetingControl");
    const select = document.getElementById("survivorTargetPrioritySelect");
    if (!control || !select) return;

    const isFieldedSurvivor = Boolean(survivor && survivors.includes(survivor));
    const isNoah = survivor?.type === "noah";
    control.hidden = !isFieldedSurvivor || isNoah;
    if (!isFieldedSurvivor || isNoah) return;

    const priority = Object.prototype.hasOwnProperty.call(
        TARGETING_PRIORITY_LABELS,
        survivor.targetingPriority
    ) ? survivor.targetingPriority : "first";
    survivor.targetingPriority = priority;
    select.value = priority;
    select.setAttribute(
        "aria-label",
        `${survivor.name || "Survivor"} targeting priority: ${TARGETING_PRIORITY_LABELS[priority]}`
    );
}

function updateSurvivorCombat(deltaTime) {
    // Recompute support ownership every frame so moving, placing, or selling
    // Noah immediately updates the one-aura-per-survivor rule.
    updateNoahSupportBuffs();

    for (const survivor of survivors) {
        if (survivor.damageDealt === undefined) survivor.damageDealt = 0;
        if (survivor.kills === undefined) survivor.kills = 0;
        if (waveRunning) {
            survivor.telemetryActiveSeconds =
                (survivor.telemetryActiveSeconds || 0) + deltaTime;
        }
        const stats = getSurvivorStats(survivor);
        if (!stats) continue;

        // Noah contributes through his aura only; he never acquires targets,
        // fires, plays weapon sounds, or increments attack telemetry.
        if (survivor.type === "noah") {
            survivor.attackCooldown = 0;
            continue;
        }

        survivor.attackCooldown =
            Math.max(0, (survivor.attackCooldown || 0) - deltaTime);

        if (survivor.attackCooldown > 0) continue;

        const dualWield = survivor.type === "zach" &&
            getSurvivorUpgradeLevel(survivor) >= 3;
        const customAttack = getCustomAttackProfile(survivor);
        const targetsPerAttack = customAttack?.area ? Number.POSITIVE_INFINITY : (dualWield ? 2 : 1);
        const attackTargets = [];

        for (const enemy of enemies) {
            if (enemy.finished || enemy.health <= 0) continue;

            const dx = enemy.x - survivor.x;
            const dy = enemy.y - survivor.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= stats.range) {
                attackTargets.push({
                    enemy,
                    dx,
                    dy,
                    distance,
                    pathProgress: getEnemyPathProgress(enemy)
                });
            }
        }

        attackTargets.sort((first, second) => compareAttackTargets(
            first,
            second,
            survivor.targetingPriority || targetingPriority
        ));
        if (Number.isFinite(targetsPerAttack)) {
            attackTargets.splice(targetsPerAttack);
        }

        if (attackTargets.length === 0) continue;

        survivor.telemetryAttacks = (survivor.telemetryAttacks || 0) + 1;

        for (const { enemy, dx, dy, distance } of attackTargets) {
            const repeatCount = customAttack?.repeat
                ? customAttack.repeat(getSurvivorUpgradeLevel(survivor))
                : 1;
            for (let hitIndex = 0; hitIndex < repeatCount; hitIndex++) {
                if (enemy.health <= 0) break;

                if (survivor.type === "cody") {
                    const blastRadius = getCodyBlastRadius(survivor);
                    const blastRadiusSquared = blastRadius * blastRadius;
                    addBlastEffect(enemy.x, enemy.y, blastRadius);

                    for (const affectedEnemy of enemies) {
                        if (affectedEnemy.finished || affectedEnemy.health <= 0) continue;

                        const isDirectTarget = affectedEnemy === enemy;
                        const blastDx = affectedEnemy.x - enemy.x;
                        const blastDy = affectedEnemy.y - enemy.y;
                        if (!isDirectTarget &&
                            blastDx * blastDx + blastDy * blastDy > blastRadiusSquared) {
                            continue;
                        }

                        const supportMultiplier = Number(survivor.noahDamageMultiplier) || 1;
                        const damage = isDirectTarget
                            ? stats.damage * supportMultiplier
                            : Math.max(1, Math.round(stats.damage * supportMultiplier * 0.5));
                        applySurvivorDamage(survivor, affectedEnemy, damage, !isDirectTarget, hitIndex);
                    }
                } else {
                    const supportMultiplier = Number(survivor.noahDamageMultiplier) || 1;
                    applySurvivorDamage(survivor, enemy, stats.damage * supportMultiplier, false, hitIndex);
                }

                // Flame weapons ignite every target hit by the volley. William
                // uses an area profile, so one attack can ignite his whole aura.
                if (survivor.type === "james" || survivor.type === "william") {
                    const burnStats = survivor.type === "william"
                        ? getWilliamBurnStats(survivor)
                        : getJamesBurnStats(survivor);
                    enemy.burnTimer = burnStats.duration;
                    const supportMultiplier = Number(survivor.noahDamageMultiplier) || 1;
                    enemy.burnDamage = Math.max(
                        Number(enemy.burnDamage) || 0,
                        burnStats.damage * supportMultiplier
                    );
                    if (enemy.burnTickTimer === undefined) {
                        enemy.burnTickTimer = 1;
                    }
                    enemy.burnSource = survivor;
                }

                if (customAttack?.slow) {
                    enemy.slowTimer = 5;
                    enemy.slowMultiplier = 0.5;
                    enemy.slowFlash = 0.35;
                }

                if (customAttack?.stun && enemy.health > 0) {
                    const stunStats = getGregoryStunStats(survivor);
                    if (Math.random() < stunStats.chance) {
                        const bossReduction = enemy.isWaveBoss || enemy.isMiniBoss ? 0.45 : 1;
                        enemy.stunTimer = Math.max(
                            enemy.stunTimer || 0,
                            stunStats.duration * bossReduction
                        );
                        enemy.stunFlash = 0.45;
                        blastEffects.push({
                            kind: "stun",
                            x: enemy.x,
                            y: enemy.y,
                            radius: 9,
                            life: 0.24,
                            maxLife: 0.24
                        });
                    }
                }

                // Survivors recoil from each target. Brady's shotgun also pushes
                // the target back along the road without knocking it off course.
                const recoilStrength = 7;
                survivor.recoilX -= (dx / distance) * recoilStrength;
                survivor.recoilY -= (dy / distance) * recoilStrength;
                enemy.hitOffsetX = Math.max(-5, Math.min(5,
                    (enemy.hitOffsetX || 0) + (dx / distance) * 3));
                enemy.hitOffsetY = Math.max(-5, Math.min(5,
                    (enemy.hitOffsetY || 0) + (dy / distance) * 3));
                addShotVisual(survivor, enemy, dx, dy, distance, survivor.type, hitIndex, repeatCount);
                addImpactPixels(enemy, survivor.type, dx, dy);
                if (survivor.type === "brady") {
                    // Shotgun knockback has diminishing returns per target.
                    // The opening blast creates space, but repeated hits cannot
                    // permanently pin one enemy at the same road corner.
                    const knockbackHits = Math.max(0, enemy.shotgunKnockbackHits || 0);
                    const knockbackStrength = Math.max(1.25, 8 * Math.pow(0.52, knockbackHits));
                    knockEnemyBackAlongRoad(enemy, knockbackStrength);
                    enemy.shotgunKnockbackHits = knockbackHits + 1;
                }
            }
        }

        // Multi-hit weapons get a short, readable audio cadence rather than
        // collapsing into one indistinct sound.
        const soundCount = customAttack?.repeat
            ? customAttack.repeat(getSurvivorUpgradeLevel(survivor))
            : 1;
        const attackLevel = getSurvivorUpgradeLevel(survivor);
        const soundIntensity = survivor.type === "nathan" && attackLevel >= 3 ? 1.45 : 1;
        for (let soundIndex = 0; soundIndex < soundCount; soundIndex++) {
            playWeaponAttackSound(survivor.type, soundIndex * 0.055, soundIntensity);
        }
        survivor.attackCooldown = stats.fireRate;
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].health <= 0) {
            if (enemies[i].lastHitBy) {
                enemies[i].lastHitBy.kills++;
            }
            const defeatedEnemy = enemies[i];
            recordEndlessTelemetryDefeat(defeatedEnemy);
            if (getEnemyProfile(defeatedEnemy.type).isSplitter) {
                spawnSplitterChildren(defeatedEnemy);
            }
            totalEnemiesDefeated++;
            enemies.splice(i, 1);
            const currentKillScrapChance = isEndlessStyleMode()
                ? getEndlessDifficultyProfile(currentWave).killScrapChance
                : killScrapChance;
            const earnsScrap = !defeatedEnemy.isSplitChild
                && Math.random() < currentKillScrapChance;
            const killReward = earnsScrap
                ? (isEndlessStyleMode()
                    ? endlessKillScrapPerKill
                    : scrapRewardPerKill + (gameMode === "daily"
                        ? getDailyModifierBonus("killScrapBonus", 0)
                        : 0))
                : 0;
            scrap += killReward;
        }
    }

    updateScrapDisplay();
}

function updateDamageNumbers(deltaTime) {
    for (let i = floatingDamageNumbers.length - 1; i >= 0; i--) {
        const number = floatingDamageNumbers[i];

        number.life -= deltaTime;
        number.y -= 45 * deltaTime;
        number.x += (Number(number.driftX) || 0) * deltaTime;

        if (number.life <= 0) {
            floatingDamageNumbers.splice(i, 1);
        }
    }
}

function updateBullets(deltaTime) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].life -= deltaTime;

        if (bullets[i].life <= 0) {
            bullets.splice(i, 1);
        }
    }
}

function updateImpactPixels(deltaTime) {
    for (let i = impactPixels.length - 1; i >= 0; i--) {
        const pixel = impactPixels[i];
        pixel.life -= deltaTime;
        pixel.x += pixel.vx * deltaTime;
        pixel.y += pixel.vy * deltaTime;
        pixel.vy += 30 * deltaTime;

        if (pixel.life <= 0) {
            impactPixels.splice(i, 1);
        }
    }
}

function updateBlastEffects(deltaTime) {
    for (let i = blastEffects.length - 1; i >= 0; i--) {
        blastEffects[i].life -= deltaTime;
        if (blastEffects[i].life <= 0) blastEffects.splice(i, 1);
    }
}

  

function drawDamageNumbers() {
    ctx.save();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.imageSmoothingEnabled = false;

    for (const number of floatingDamageNumbers) {
        const progress = 1 - Math.max(0, Math.min(1, number.life / number.maxLife));
        // Hold the hit at full brightness briefly, then ease it out near the
        // end of its travel so damage remains readable during busy volleys.
        const fade = Math.max(0, Math.min(1, (1 - progress) / 0.28));
        const amount = Math.round(number.amount);
        const fontSize = amount >= 100 ? 18 : amount >= 40 ? 17 : 16;
        const pop = Math.sin(Math.min(1, progress / 0.16) * Math.PI);

        // Keep the text on whole pixels so the bold outline stays sharp.
        const x = Math.round(number.x);
        const y = Math.round(number.y);

        ctx.font = `bold ${fontSize}px monospace`;
        ctx.globalAlpha = fade;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1 + pop * 0.12, 1 + pop * 0.12);

        // A two-pass edge keeps the numbers readable over sprites and gives
        // hits a polished stamped look without soft blur.
        ctx.strokeStyle = "#080b10";
        ctx.lineWidth = 5.5;
        ctx.lineJoin = "miter";
        ctx.strokeText(amount, 0, 0);

        // Bright, separated colors distinguish direct, splash, and burn hits.
        ctx.fillStyle = number.isWeakness
            ? "#9dffbf"
            : number.isResistance
                ? "#c3c7d3"
                : number.isBurn
                    ? "#ff8a66"
                    : number.isSplash
                        ? "#ffc768"
                        : "#fff2a0";

        ctx.fillText(amount, 0, 0);

        ctx.globalAlpha = fade * 0.55;
        ctx.fillStyle = "#fffce6";
        ctx.fillText(amount, 0, -1);

        if (number.isWeakness || number.isResistance) {
            ctx.font = "bold 9px monospace";
            ctx.fillStyle = number.isWeakness ? "#9dffbf" : "#c3c7d3";
            ctx.globalAlpha = fade;
            ctx.fillText(number.isWeakness ? "WEAK" : "RESIST", 0, -fontSize - 2);
        }
        ctx.restore();
    }

    ctx.restore();
}

 
function drawBullets() {
    const styles = {
        mason:   { trail: "#d99b55", core: "#fff0bf", width: 3, length: 16 },
        james:   { trail: "#e85b32", core: "#ffd06a", width: 6, length: 25 },
        cody:    { trail: "#9b7450", core: "#ead19b", width: 3, length: 13 },
        britney: { trail: "#e3d2b0", core: "#fff8df", width: 2, length: 48 },
        zach:    { trail: "#d6a552", core: "#fff0bd", width: 2, length: 13 },
        brady:   { trail: "#e9a34c", core: "#ffe7a0", width: 2, length: 10 },
        selena:  { trail: "#8fe4ef", core: "#f1ffff", width: 2, length: 9 },
        bas:     { trail: "#63d6e5", core: "#eaffff", width: 3, length: 13 },
        rork:    { trail: "#a9c86e", core: "#efffc8", width: 2, length: 20 },
        knox:    { trail: "#d4b759", core: "#fff5c2", width: 2, length: 16 },
        nathan:  { trail: "#d3a34f", core: "#fff3bb", width: 3, length: 26 },
        gregory: { trail: "#9b704d", core: "#ffe0a5", width: 2, length: 15 }
    };

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.lineCap = "square";
    ctx.lineJoin = "miter";

    for (const bullet of bullets) {
        const style = styles[bullet.type] || styles.mason;
        const dx = bullet.endX - bullet.startX;
        const dy = bullet.endY - bullet.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) continue;

        const fade = Math.max(0, Math.min(1, bullet.life / bullet.maxLife));
        const ux = dx / distance;
        const uy = dy / distance;
        const tailLength = Math.min(style.length, distance);
        const tailX = Math.round(bullet.endX - ux * tailLength);
        const tailY = Math.round(bullet.endY - uy * tailLength);
        const endX = Math.round(bullet.endX);
        const endY = Math.round(bullet.endY);

        ctx.globalAlpha = fade;
        // A colored blocky trail with a small highlight keeps the effects
        // readable at game scale without losing the pixel-art look.
        ctx.strokeStyle = style.trail;
        ctx.lineWidth = style.width;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        ctx.strokeStyle = style.core;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.round(bullet.endX - ux * tailLength * 0.62),
            Math.round(bullet.endY - uy * tailLength * 0.62));
        ctx.lineTo(endX, endY);
        ctx.stroke();

        if (bullet.type === "cody") {
            // The brass-cased shell vanishes on impact; the blast ring marks
            // the splash radius around the hit target.
            const px = -uy;
            const py = ux;
            const noseX = endX + ux * 4;
            const noseY = endY + uy * 4;
            const tailX2 = endX - ux * 6;
            const tailY2 = endY - uy * 6;
            ctx.fillStyle = "#786044";
            ctx.beginPath();
            ctx.moveTo(noseX, noseY);
            ctx.lineTo(tailX2 + px * 3, tailY2 + py * 3);
            ctx.lineTo(tailX2 - px * 3, tailY2 - py * 3);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = style.core;
            ctx.fillRect(Math.round(endX + ux * 1.5) - 1,
                Math.round(endY + uy * 1.5) - 1, 2, 2);
        } else if (bullet.type === "james") {
            // Ember blocks sit along a short flame jet instead of reading as
            // a conventional bullet.
            const px = -uy;
            const py = ux;
            for (let i = 0; i < 3; i++) {
                const along = 0.28 + i * 0.25;
                const side = ((i + Math.floor(bullet.life * 70)) % 2 ? 1 : -1) * 2;
                const emberX = Math.round(bullet.endX - ux * tailLength * along + px * side);
                const emberY = Math.round(bullet.endY - uy * tailLength * along + py * side);
                ctx.fillStyle = i === 1 ? "#ffe39a" : "#f18a3e";
                ctx.fillRect(emberX - 1, emberY - 1, 3, 3);
            }
            ctx.fillStyle = style.core;
            ctx.fillRect(endX - 1, endY - 1, 3, 3);
        } else if (bullet.type === "britney") {
            // The sniper gets a long, hairline tracer and a precise glint.
            ctx.fillStyle = style.core;
            ctx.fillRect(endX - 1, endY - 1, 2, 2);
        } else if (bullet.type === "selena") {
            // Twin dagger flashes are short, bright slashes at the target.
            const px = -uy;
            const py = ux;
            const slashOffset = bullet.shotIndex % 2 === 0 ? 2 : -2;
            ctx.strokeStyle = style.core;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(endX - ux * 5 + px * slashOffset, endY - uy * 5 + py * slashOffset);
            ctx.lineTo(endX + ux * 3 - px * slashOffset, endY + uy * 3 - py * slashOffset);
            ctx.stroke();
        } else if (bullet.type === "bas") {
            // A syringe jab reads as a thin cyan needle with a tiny glint.
            ctx.fillStyle = style.core;
            ctx.fillRect(endX - 1, endY - 1, 3, 3);
            ctx.fillStyle = "#7de7f3";
            ctx.fillRect(Math.round(endX - ux * 5) - 1, Math.round(endY - uy * 5) - 1, 2, 2);
        } else if (bullet.type === "knox") {
            // Three separated muzzle flashes make the burst cadence readable.
            ctx.fillStyle = style.core;
            const flash = 2 + (bullet.shotIndex % 2);
            ctx.fillRect(endX - flash / 2, endY - flash / 2, flash, flash);
        } else if (bullet.type === "rork") {
            ctx.fillStyle = style.core;
            ctx.fillRect(endX - 1, endY - 1, 3, 2);
        } else if (bullet.type === "brady") {
            // Individual pellets stay small so the tight spread remains clear.
            ctx.fillStyle = style.core;
            ctx.fillRect(endX - 1, endY - 1, 2, 2);
        } else if (bullet.type === "nathan") {
            // Nathan's .50 caliber hand cannon gets a heavy, oversized round.
            const scale = bullet.projectileScale || 1;
            const size = Math.max(2, Math.round(3 * scale));
            ctx.fillStyle = "#8f663c";
            ctx.fillRect(
                endX - Math.round(size * 1.5),
                endY - Math.round(size * 0.5),
                Math.round(size * 2),
                Math.max(2, size)
            );
            ctx.fillStyle = style.core;
            ctx.fillRect(
                endX - Math.max(1, Math.round(size * 0.5)),
                endY - Math.max(1, Math.round(size * 0.5)),
                size,
                size
            );
        } else if (bullet.type === "gregory") {
            // Gregory's slingshot stone is small, earthy, and easy to read.
            const size = Math.max(2, Math.round(2 * (bullet.projectileScale || 1)));
            ctx.fillStyle = "#6d4c36";
            ctx.fillRect(endX - size, endY - size, size * 2, size * 2);
            ctx.fillStyle = style.core;
            ctx.fillRect(endX - 1, endY - 1, 2, 2);
        } else {
            // Compact, squared-off bullet tips for the handgun and SMG.
            ctx.fillStyle = style.core;
            ctx.fillRect(endX - 1, endY - 1, 3, 2);
        }
    }

    ctx.restore();
}

function drawImpactPixels() {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (const pixel of impactPixels) {
        ctx.globalAlpha = Math.max(0, pixel.life / pixel.maxLife);
        ctx.fillStyle = pixel.color;
        ctx.fillRect(
            Math.round(pixel.x),
            Math.round(pixel.y),
            pixel.size,
            pixel.size
        );
    }

    ctx.restore();
}

function drawBlastEffects() {
    ctx.save();
    ctx.lineCap = "square";

    for (const effect of blastEffects) {
        const progress = 1 - effect.life / effect.maxLife;
        if (effect.kind === "heal") {
            ctx.globalAlpha = Math.max(0, effect.life / effect.maxLife) * 0.8;
            ctx.strokeStyle = "#8ef0b0";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(
                Math.round(effect.x),
                Math.round(effect.y),
                Math.round(effect.radius * Math.min(1, progress * 1.2)),
                0,
                Math.PI * 2
            );
            ctx.stroke();
            ctx.fillStyle = "#b8ffd0";
            ctx.fillRect(Math.round(effect.x) - 2, Math.round(effect.y) - 7, 4, 14);
            ctx.fillRect(Math.round(effect.x) - 7, Math.round(effect.y) - 2, 14, 4);
            continue;
        }
        if (effect.kind === "bat") {
            const dx = effect.targetX - effect.x;
            const dy = effect.targetY - effect.y;
            const angle = Math.atan2(dy, dx);
            ctx.globalAlpha = Math.max(0, effect.life / effect.maxLife) * 0.9;
            ctx.strokeStyle = "#f8d58c";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(
                Math.round(effect.x),
                Math.round(effect.y),
                Math.round(effect.radius + progress * 8),
                angle - 0.85,
                angle + 0.85
            );
            ctx.stroke();
            ctx.strokeStyle = "#fff3c1";
            ctx.lineWidth = 1;
            ctx.stroke();
            continue;
        }
        if (effect.kind === "stun") {
            ctx.globalAlpha = Math.max(0, effect.life / effect.maxLife) * 0.9;
            ctx.strokeStyle = "#b7efff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(
                Math.round(effect.x),
                Math.round(effect.y),
                Math.round(effect.radius + progress * 6),
                0,
                Math.PI * 2
            );
            ctx.stroke();
            ctx.fillStyle = "#e7fbff";
            ctx.fillRect(Math.round(effect.x) - 1, Math.round(effect.y) - 5, 2, 10);
            ctx.fillRect(Math.round(effect.x) - 5, Math.round(effect.y) - 1, 10, 2);
            continue;
        }
        const radius = Math.max(4, effect.radius * progress);
        ctx.globalAlpha = Math.max(0, effect.life / effect.maxLife) * 0.85;
        ctx.strokeStyle = "#f0b65e";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(Math.round(effect.x), Math.round(effect.y), Math.round(radius), 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#fff0bd";
        ctx.fillRect(Math.round(effect.x) - 2, Math.round(effect.y) - 2, 4, 4);
    }

    ctx.restore();
}


function updateEnemies(deltaTime) {
    for (const enemy of enemies) {
        const profile = getEnemyProfile(enemy.type);
        const healthTrail = Number.isFinite(enemy.healthTrail)
            ? enemy.healthTrail
            : enemy.health;
        enemy.healthTrail = Math.max(
            enemy.health,
            healthTrail - enemy.maxHealth * 1.1 * deltaTime
        );

        if (enemy.isMedic && enemy.health > 0) {
            enemy.medicPulseTimer = (enemy.medicPulseTimer ?? 1.2) - deltaTime;
            if (enemy.medicPulseTimer <= 0) {
                applyMedicPulse(enemy);
                enemy.medicPulseTimer = 2.8;
            }
        }

        const segmentStart = roadPoints[Math.max(0, enemy.targetPoint - 1)];
        const segmentEnd = roadPoints[enemy.targetPoint];
        const targetLaneOffsetY = segmentStart && segmentEnd && segmentStart.y === segmentEnd.y
            ? horizontalEnemyLaneVisualOffset
            : 0;
        const currentLaneOffsetY = enemy.visualLaneOffsetY ?? targetLaneOffsetY;
        enemy.visualLaneOffsetY = currentLaneOffsetY +
            (targetLaneOffsetY - currentLaneOffsetY) * Math.min(1, deltaTime * 12);

        // Burning deals its assigned damage once per second.

if (enemy.burnTimer > 0 && enemy.health > 0) {
    enemy.burnTickTimer =
        (enemy.burnTickTimer ?? 1) - deltaTime;

    enemy.burnTimer -= deltaTime;

    if (enemy.burnTickTimer <= 0) {
        const burnMultiplier = getEnemyDamageMultiplier(enemy, "fire");
        const damage = Math.min(enemy.health, enemy.burnDamage * burnMultiplier);

        enemy.healthTrail = Math.max(
            Number.isFinite(enemy.healthTrail) ? enemy.healthTrail : enemy.health,
            enemy.health
        );
        enemy.health -= damage;
        enemy.burnFlash = 0.2;
        enemy.burnTickTimer += 1;

        if (damage > 0) {
            floatingDamageNumbers.push({
                x: enemy.x,
                y: enemy.y - 35,
                driftX: 0,
                amount: Math.round(damage),
                life: 0.65,
                maxLife: 0.65,
                spawnedAt: performance.now(),
                isBurn: true,
                isWeakness: burnMultiplier > 1.01,
                isResistance: burnMultiplier < 0.99
            });
        }

        if (enemy.burnSource) {
            enemy.burnSource.damageDealt =
                (enemy.burnSource.damageDealt || 0) + damage;

            enemy.lastHitBy = enemy.burnSource;
        }
    }
}

        enemy.hitFlash = Math.max(0, (enemy.hitFlash || 0) - deltaTime);
        const hitOffsetFade = Math.max(0, 1 - deltaTime * 18);
        enemy.hitOffsetX = (enemy.hitOffsetX || 0) * hitOffsetFade;
        enemy.hitOffsetY = (enemy.hitOffsetY || 0) * hitOffsetFade;
        enemy.burnFlash = Math.max(
    0,
    (enemy.burnFlash || 0) - deltaTime
);
        enemy.slowTimer = Math.max(0, (enemy.slowTimer || 0) - deltaTime);
        enemy.slowFlash = Math.max(0, (enemy.slowFlash || 0) - deltaTime);
        enemy.stunTimer = Math.max(0, (enemy.stunTimer || 0) - deltaTime);
        enemy.stunFlash = Math.max(0, (enemy.stunFlash || 0) - deltaTime);
        enemy.healFlash = Math.max(0, (enemy.healFlash || 0) - deltaTime);
        const target = roadPoints[enemy.targetPoint];

        if (!target) {
            continue;
        }

        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
            const movement = enemy.stunTimer > 0
                ? 0
                : enemy.speed * (enemy.slowTimer > 0 ? (enemy.slowMultiplier || 0.5) : 1) * deltaTime;

        if (distance <= movement) {
            enemy.x = target.x;
            enemy.y = target.y;
            enemy.targetPoint++;

            // Reached the end of the road
            if (enemy.targetPoint >= roadPoints.length) {
                
enemy.finished = true;
leakedEnemiesThisWave++;
recordEndlessTelemetryLeak(enemy);

const leakDamage = enemy.leakDamage ?? getEnemyProfile(enemy.type).leakDamage;
playerHealth = Math.max(0, playerHealth - leakDamage);
updatePlayerHealthDisplay();

if (playerHealth <= 0) {
    endGame();
    break;
}

                updatePlayerHealthDisplay();
            }
        } else {
            enemy.x += (dx / distance) * movement;
            enemy.y += (dy / distance) * movement;
        }
    }

    // Remove enemies that have reached the exit
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].finished) {
            enemies.splice(i, 1);
        }
    }
}



function traceRoundedRectPath(x, y, width, height, radius) {
    const corner = Math.max(0, Math.min(radius, width / 2, height / 2));
    ctx.beginPath();
    ctx.moveTo(x + corner, y);
    ctx.lineTo(x + width - corner, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + corner);
    ctx.lineTo(x + width, y + height - corner);
    ctx.quadraticCurveTo(x + width, y + height, x + width - corner, y + height);
    ctx.lineTo(x + corner, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - corner);
    ctx.lineTo(x, y + corner);
    ctx.quadraticCurveTo(x, y, x + corner, y);
    ctx.closePath();
}

function drawAnimatedHealthBar(x, y, width, height, healthRatio, trailRatio, fillColor, borderColor) {
    const health = Math.max(0, Math.min(1, healthRatio));
    const trail = Math.max(health, Math.min(1, trailRatio));
    const outerRadius = Math.min(height / 2, width / 2);
    const inset = Math.min(1, height / 4);
    const innerX = x + inset;
    const innerY = y + inset;
    const innerWidth = Math.max(0, width - inset * 2);
    const innerHeight = Math.max(0, height - inset * 2);
    const innerRadius = Math.max(0, outerRadius - inset);

    ctx.save();
    traceRoundedRectPath(x, y, width, height, outerRadius);
    ctx.fillStyle = "#080b10";
    ctx.fill();

    traceRoundedRectPath(innerX, innerY, innerWidth, innerHeight, innerRadius);
    ctx.clip();
    ctx.fillStyle = "#34404a";
    ctx.fillRect(innerX, innerY, innerWidth, innerHeight);

    const currentWidth = Math.round(innerWidth * health);
    const trailWidth = Math.max(currentWidth, Math.round(innerWidth * trail));
    if (trailWidth > currentWidth) {
        ctx.fillStyle = "#ff3d50";
        ctx.fillRect(innerX + currentWidth, innerY, trailWidth - currentWidth, innerHeight);
    }

    ctx.fillStyle = fillColor;
    ctx.fillRect(innerX, innerY, currentWidth, innerHeight);
    if (currentWidth > 2 && innerHeight > 1) {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(innerX + 1, innerY, Math.max(0, currentWidth - 2), 1);
    }
    ctx.restore();

    ctx.save();
    traceRoundedRectPath(x, y, width, height, outerRadius);
    ctx.strokeStyle = borderColor || "#080b10";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
}

function drawEnemies() {
    let hollowAlive = false;

    // Draw ground shadows first so they sit beneath every enemy sprite.
    for (const enemy of enemies) {
        const profile = getEnemyProfile(enemy.type);
        const sizeScale = enemy.sizeScale || 1;
        const hitOffsetX = enemy.hitOffsetX || 0;
        const hitOffsetY = enemy.hitOffsetY || 0;
        const laneOffsetY = enemy.visualLaneOffsetY || 0;

        ctx.save();
        const shadowX = enemy.x + hitOffsetX;
        // enemy.x/y is the road anchor. The shadow stays at that anchor,
        // which is also where the sprite's lowest opaque pixel lands.
        const shadowY = enemy.y + hitOffsetY + laneOffsetY + 2;
        const shadowWidth = (profile.isHeavy || profile.isBoss ? 16 : 14) * sizeScale;
        // Keep this pass deliberately gradient-free: late Endless waves can
        // contain dozens of enemies, and crisp layered shapes are cheaper
        // while still reading as a soft contact shadow at game scale.
        ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
        ctx.beginPath();
        ctx.ellipse(shadowX, shadowY, shadowWidth, 6 * sizeScale, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.beginPath();
        ctx.ellipse(shadowX, shadowY, shadowWidth * 0.66, 3 * sizeScale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    for (const enemy of enemies) {
        const profile = getEnemyProfile(enemy.type);
        const isHollow = profile.isBoss === true && !enemy.isMiniBoss && !enemy.isWaveBoss;
        const image = profile.image;
        const sizeScale = enemy.sizeScale || 1;
        const spriteWidth = profile.spriteWidth * sizeScale;
        const spriteHeight = profile.spriteHeight * sizeScale;
        const spriteBottomRatio = Number.isFinite(profile.spriteBottomRatio)
            ? profile.spriteBottomRatio
            : 1;
        // Align the lowest opaque pixel of the transparent PNG to the road
        // anchor.  This keeps short, tall, and differently-padded enemies
        // standing on the same road centerline.
        const spriteGroundOffsetY = spriteHeight * (0.5 - spriteBottomRatio);

        if (isHollow && enemy.health > 0) {
            hollowAlive = true;
        }

        const bounce = gameRunning && !gamePaused
            ? Math.sin(performance.now() / 100 + enemy.x * 0.1) * 3
            : 0;
        const hitOffsetX = enemy.hitOffsetX || 0;
        const hitOffsetY = enemy.hitOffsetY || 0;
        const spriteX = enemy.x + hitOffsetX;
        const spriteY = enemy.y + hitOffsetY + bounce
            + (enemy.visualLaneOffsetY || 0)
            + spriteGroundOffsetY;

        if (image.complete && image.naturalWidth > 0) {
            ctx.save();

            if (enemy.isFireImmune) {
                // Red splitters are visually distinct without requiring a
                // second sprite sheet. Their tint also communicates that
                // fire is not the answer for this variant.
                ctx.filter = "sepia(1) saturate(5) hue-rotate(300deg) brightness(0.9)";
            }

            if (enemy.burnFlash > 0 && !enemy.isFireImmune) {
                ctx.globalAlpha = 0.6;
                ctx.filter = "sepia(1) saturate(7) hue-rotate(330deg) brightness(1.3)";
            } else if (enemy.hitFlash > 0) {
                ctx.globalAlpha = 0.55;
                if (!enemy.isFireImmune) {
                    ctx.filter = "sepia(1) saturate(6) hue-rotate(315deg) brightness(1.2)";
                }
            }


            ctx.drawImage(
                image,
                spriteX - spriteWidth / 2,
                spriteY - spriteHeight / 2,
                spriteWidth,
                spriteHeight
            );

            if (enemy.slowTimer > 0) {
                // Draw a filtered copy of the transparent sprite so the slow
                // effect colors the enemy itself instead of drawing a box.
                ctx.save();
                ctx.globalAlpha = 0.42 + Math.sin(performance.now() / 90) * 0.06;
                ctx.filter = "hue-rotate(145deg) saturate(2.4) brightness(1.3)";
                ctx.drawImage(
                    image,
                    spriteX - spriteWidth / 2,
                    spriteY - spriteHeight / 2,
                    spriteWidth,
                    spriteHeight
                );
                ctx.restore();
            }

            if (enemy.healFlash > 0) {
                ctx.save();
                ctx.globalAlpha = Math.max(0, enemy.healFlash / 0.35) * 0.38;
                ctx.filter = "hue-rotate(75deg) saturate(2.2) brightness(1.25)";
                ctx.drawImage(
                    image,
                    spriteX - spriteWidth / 2,
                    spriteY - spriteHeight / 2,
                    spriteWidth,
                    spriteHeight
                );
                ctx.restore();
            }

            if (enemy.stunTimer > 0) {
                // Stunned enemies keep their sprite silhouette but flash with
                // a cool electric tint so the status is readable at a glance.
                ctx.save();
                ctx.globalAlpha = 0.38 + Math.sin(performance.now() / 75 + enemy.x) * 0.06;
                ctx.filter = "hue-rotate(165deg) saturate(2.8) brightness(1.35)";
                ctx.drawImage(
                    image,
                    spriteX - spriteWidth / 2,
                    spriteY - spriteHeight / 2,
                    spriteWidth,
                    spriteHeight
                );
                ctx.restore();
            }

                     ctx.restore();
        }

        if (enemy.isArmored && enemy.health > 0) {
            ctx.save();
            ctx.globalAlpha = 0.72;
            ctx.strokeStyle = "#e8c66c";
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(Math.round(spriteX), Math.round(spriteY), Math.max(13, spriteWidth * 0.52), 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        if (enemy.isMedic && enemy.health > 0) {
            ctx.save();
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = "#9af0b8";
            ctx.fillRect(Math.round(spriteX) - 2, Math.round(spriteY - spriteHeight / 2 - 13), 4, 10);
            ctx.fillRect(Math.round(spriteX) - 5, Math.round(spriteY - spriteHeight / 2 - 10), 10, 4);
            ctx.restore();
        }

        if (enemy.stunTimer > 0 && enemy.health > 0) {
            const pulse = 1 + Math.sin(performance.now() / 80 + enemy.x) * 0.15;
            ctx.save();
            ctx.globalAlpha = 0.9;
            ctx.strokeStyle = "#b7efff";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(
                Math.round(spriteX),
                Math.round(spriteY - spriteHeight / 2 - 7),
                5 * pulse,
                0,
                Math.PI * 2
            );
            ctx.stroke();
            ctx.fillStyle = "#e7fbff";
            ctx.fillRect(Math.round(spriteX) - 1, Math.round(spriteY - spriteHeight / 2 - 10), 2, 2);
            ctx.restore();
        }

        // Larger, warmer health bars make mini-bosses and wave bosses easy to spot.
        if (!isHollow) {
            const baseBarWidth = profile.isHeavy ? 36 : 30;
            const barWidth = enemy.isWaveBoss
                ? 52
                : enemy.isMiniBoss
                    ? Math.round(baseBarWidth * 1.25)
                    : baseBarWidth;
            const barHeight = enemy.isWaveBoss ? 7 : enemy.isMiniBoss ? 6 : 5;
            const barX = Math.round(spriteX - barWidth / 2);
            const barY = Math.round(spriteY - spriteHeight / 2 - (enemy.isWaveBoss ? 15 : 12));
            const healthPercent = Math.max(
                0,
                Math.min(1, enemy.health / enemy.maxHealth)
            );
            const healthTrailPercent = Math.max(
                healthPercent,
                Math.min(1, (enemy.healthTrail ?? enemy.health) / enemy.maxHealth)
            );
            const healthBarColor = enemy.isWaveBoss
                ? "#db83ff"
                : enemy.isMiniBoss
                    ? "#ffc24e"
                    : healthPercent > 0.6
                        ? "#46f477"
                        : healthPercent > 0.3
                            ? "#ffe044"
                            : "#ff7953";
            const healthBarBorder = enemy.isWaveBoss
                ? "#f1c8ff"
                : enemy.isMiniBoss
                    ? "#ffe0a0"
                    : "#0b1115";
            drawAnimatedHealthBar(
                barX,
                barY,
                barWidth,
                barHeight,
                healthPercent,
                healthTrailPercent,
                healthBarColor,
                healthBarBorder
            );
        }
    }

    drawHollowBossBar(hollowAlive);
}

function drawHollowBossBar(hollowAlive) {
    if (!hollowAlive) return;

    const hollow = enemies.find(
        enemy => enemy.type === "hollow" && enemy.health > 0
    );

    if (!hollow) return;

    const barWidth = 360;
    const barHeight = 18;
    const x = (canvas.width - barWidth) / 2;
    const y = 18;

    // Dark panel.
    ctx.fillStyle = "#20231f";
    ctx.fillRect(x - 14, y - 12, barWidth + 28, 66);

    // Boss name.
    ctx.fillStyle = "#e8e0d0";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("THE HOLLOW", canvas.width / 2, y);

    const healthPercent = Math.max(
        0,
        Math.min(1, hollow.health / hollow.maxHealth)
    );
    const healthTrailPercent = Math.max(
        healthPercent,
        Math.min(1, (hollow.healthTrail ?? hollow.health) / hollow.maxHealth)
    );
    drawAnimatedHealthBar(
        x,
        y + 15,
        barWidth,
        barHeight,
        healthPercent,
        healthTrailPercent,
        "#cf78f5",
        "#f1c8ff"
    );

    // Live health numbers.
    ctx.fillStyle = "#e8e0d0";
    ctx.font = "14px monospace";
    ctx.fillText(
        Math.ceil(Math.max(0, hollow.health)) + " / " + hollow.maxHealth,
        canvas.width / 2,
        y + 44
    );

    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
}



function renderGame() {
    updateNoahSupportBuffs();
    ctx.drawImage(mapCanvas, 0, 0);
    drawBattlefieldAtmosphere();
    drawSurvivors();
    drawEnemies();
    drawBullets();
    drawBlastEffects();
    drawImpactPixels();
    drawDamageNumbers();
    drawSurvivorPreview();
    drawSelectedSurvivorRange();
    // Repaint only the inspected model after its range so the selected
    // survivor remains the visual focal point instead of being washed out by
    // the translucent circle.
    if (inspectedSurvivor) drawSurvivors(inspectedSurvivor);
    drawSurvivorLevelMarkers();
    drawNoahBuffIndicators();
    drawSurvivorSelectionFeedback();
    drawSurvivorPlacementFeedback();
    drawSurvivorUpgradeFeedback();
    if (inspectedSurvivor) {
    updateInspectedSurvivorCardStats();
    document.getElementById("survivorDamageDealt").textContent =
        Math.round(inspectedSurvivor.damageDealt || 0);

    document.getElementById("survivorKills").textContent =
        inspectedSurvivor.kills || 0;
}
}

let battlefieldAtmosphereGradientCache = null;

// A restrained animated pass over the static map gives the battlefield some
// depth without softening the pixel art. The moving road glint makes the lane
// readable during busy waves, while the vignette keeps attention on combat.
function drawBattlefieldAtmosphere() {
    const time = performance.now();
    const mobileViewport = isMobileGameplayViewport();

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (Array.isArray(roadPoints) && roadPoints.length > 1) {
        ctx.save();
        ctx.globalAlpha = 0.11;
        ctx.strokeStyle = "#f6d88b";
        ctx.lineWidth = 2;
        ctx.lineCap = "butt";
        ctx.setLineDash([5, 52]);
        ctx.lineDashOffset = -(time / 110);
        traceMapRoad();
        ctx.stroke();
        ctx.restore();
    }

    if (!battlefieldAtmosphereGradientCache ||
        battlefieldAtmosphereGradientCache.width !== canvas.width ||
        battlefieldAtmosphereGradientCache.height !== canvas.height) {
        const topGlow = ctx.createLinearGradient(0, 0, 0, 190);
        topGlow.addColorStop(0, "rgba(255, 255, 255, 0.045)");
        topGlow.addColorStop(1, "rgba(255, 255, 255, 0)");

        const vignette = ctx.createRadialGradient(
            canvas.width / 2,
            canvas.height / 2,
            170,
            canvas.width / 2,
            canvas.height / 2,
            600
        );
        vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
        vignette.addColorStop(0.72, "rgba(0, 0, 0, 0.025)");
        vignette.addColorStop(1, "rgba(3, 5, 7, 0.24)");
        battlefieldAtmosphereGradientCache = {
            width: canvas.width,
            height: canvas.height,
            topGlow,
            vignette
        };
    }

    const topGlow = battlefieldAtmosphereGradientCache.topGlow;
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, canvas.width, 190);

    const vignette = battlefieldAtmosphereGradientCache.vignette;
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dust motes add life to otherwise quiet sections of the map. They drift
    // from continuous positions (rather than jumping on a timer), which keeps
    // the motion smooth even at higher game speeds. Positions are seeded so
    // the atmosphere feels consistent whenever a map is revisited.
    const particleSpanX = canvas.width + 48;
    const particleSpanY = canvas.height + 48;
    const particleCount = mobileViewport ? 14 : 28;
    for (let i = 0; i < particleCount; i++) {
        const speedX = 0.0048 + (i % 5) * 0.00105;
        const speedY = 0.00055 + (i % 4) * 0.00016;
        const rawX = (i * 151 + currentLevel * 37 + time * speedX) % particleSpanX;
        const rawY = (i * 73 + currentLevel * 19 + time * speedY
            + Math.sin(time / (1800 + i * 90) + i) * 13) % particleSpanY;
        const x = rawX - 24;
        const y = rawY - 24;
        if (isOnRoad(x, y)) continue;

        const pulse = 0.25 + (Math.sin(time / (820 + i * 23) + i * 1.7) + 1) * 0.13;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = i % 6 === 0 ? "#bcd9bd" : "#f2d99a";
        const size = i % 7 === 0 ? 3 : i % 3 === 0 ? 2 : 1;
        ctx.fillRect(x, y, size, size);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
}

function drawSelectedSurvivorRange() {
    // Mobile uses a compositor-animated DOM ring. Skipping the canvas arc is
    // important: otherwise selecting a survivor triggers a second animated
    // layer and the entire 960x540 scene is repainted on every tick.
    if (!inspectedSurvivor || isMobileGameplayViewport()) return;
    const range = getSurvivorStats(inspectedSurvivor)?.range;
    if (!range) return;

    ctx.save();
    const now = performance.now();

    ctx.beginPath();
    ctx.arc(
        inspectedSurvivor.x,
        inspectedSurvivor.y,
        range,
        0,
        Math.PI * 2
    );

    const isNoah = inspectedSurvivor.type === "noah";
    ctx.fillStyle = isNoah
        ? "rgba(246, 198, 92, 0.12)"
        : "rgba(255, 255, 255, 0.08)";
    ctx.fill();

    const pulse = 0.72 + Math.sin(now / 180) * 0.16;
    ctx.strokeStyle = isNoah
        ? `rgba(246, 198, 92, ${pulse})`
        : `rgba(255, 255, 255, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash(isNoah ? [5, 7] : [8, 10]);
    ctx.lineDashOffset = -(now / 90);
    ctx.stroke();

    // A small reticle makes the selected unit obvious even when several
    // sprites overlap in a tight deployment area.
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(246, 216, 139, 0.95)";
    ctx.lineWidth = 1;
    const reticleSize = 8;
    const reticleGap = 4;
    const x = Math.round(inspectedSurvivor.x);
    const y = Math.round(inspectedSurvivor.y);
    ctx.beginPath();
    ctx.moveTo(x - reticleSize, y - reticleGap);
    ctx.lineTo(x - reticleGap, y - reticleGap);
    ctx.moveTo(x + reticleGap, y - reticleGap);
    ctx.lineTo(x + reticleSize, y - reticleGap);
    ctx.moveTo(x - reticleSize, y + reticleGap);
    ctx.lineTo(x - reticleGap, y + reticleGap);
    ctx.moveTo(x + reticleGap, y + reticleGap);
    ctx.lineTo(x + reticleSize, y + reticleGap);
    ctx.stroke();

    ctx.restore();
}

let previousTime = 0;
let gameRunning = false;
let waveRunning = false;
let gamePaused = false;

let currentWave = 1;
let enemiesToSpawn = 0;
let spawnTimer = 0;
const totalWaves = 15;
const groupSpawnDelay = 2.8;
// Keep enemies in each wave group close enough for area attacks to catch
// nearby targets without making the opening rush feel abrupt.
const enemySpawnDelay = 0.62;
const skitterSpawnDelay = 0.4;
let enemyGroups = [];
let currentGroupIndex = 0;
let currentGroupSpawnIndex = 0;
let groupDelayStarted = false;
let autoStartWaves = false;
let awaitingNextWave = false;
let autoStartWaveTimer = null;
let waveCompleteToastTimer = null;
let insufficientScrapToastTimer = null;
// A global targeting order keeps the default behavior predictable while
// giving players a meaningful decision when several enemies overlap in range.
// "first" means furthest along the road (closest to the exit).
let targetingPriority = "first";
const TARGETING_PRIORITY_LABELS = {
    first: "FIRST / EXIT",
    closest: "CLOSEST",
    strongest: "STRONGEST",
    fastest: "FASTEST"
};
const scrapPenaltyPerLeak = 8;
const startingWaveScrapReward = 45;
const waveScrapRewardIncrease = 8;
let leakedEnemiesThisWave = 0;

function cancelAutoStartWave() {
    if (autoStartWaveTimer !== null) {
        clearTimeout(autoStartWaveTimer);
        autoStartWaveTimer = null;
    }
}

function updateAutoStartButton() {
    const button = document.getElementById("autoStartButton");
    const state = document.getElementById("autoStartState");
    if (!button || !state) return;

    const label = autoStartWaves ? "ON" : "OFF";
    state.textContent = label;
    button.setAttribute("aria-pressed", String(autoStartWaves));
    button.setAttribute("aria-label", `Auto-start next wave: ${label.toLowerCase()}`);
    button.classList.toggle("is-enabled", autoStartWaves);
}

function scheduleAutoStartWave() {
    cancelAutoStartWave();
    if (!autoStartWaves || !gameRunning || !awaitingNextWave) return;

    // Auto-start is convenient, but a completely unattended run removes the
    // decisions that make Endless fun.  Give the player a short checkpoint at
    // each fifth cleared wave (and whenever the base is in critical health).
    // currentWave has already advanced to the next wave by the time this
    // timer is scheduled, so inspect the wave that was just cleared.
    const completedWave = Math.max(0, currentWave - 1);
    const checkpoint = gameMode === "endless"
        && completedWave > 0
        && (completedWave % 5 === 0 || playerHealth <= 30);
    if (checkpoint) {
        const status = document.getElementById("waveStatus");
        if (status) {
            status.textContent = playerHealth <= 30
                ? "CHECKPOINT: REPAIR YOUR DEFENSES BEFORE THE NEXT WAVE."
                : "CHECKPOINT: REVIEW YOUR SQUAD BEFORE THE NEXT WAVE.";
        }
        return;
    }

    startWave();
}

function hideWaveCompleteToast() {
    const toast = document.getElementById("waveCompleteToast");
    if (!toast) return;

    if (waveCompleteToastTimer !== null) {
        clearTimeout(waveCompleteToastTimer);
        waveCompleteToastTimer = null;
    }

    toast.classList.remove("is-visible");
    toast.setAttribute("aria-hidden", "true");
}

function showWaveCompleteToast(wave, reward, leaked = 0, leakPenalty = 0, upkeep = 0, checkpointBonus = 0) {
    const toast = document.getElementById("waveCompleteToast");
    if (!toast) return;

    hideWaveCompleteToast();
    document.getElementById("waveCompleteNumber").textContent = `WAVE ${wave}`;
    const checkpointText = checkpointBonus ? ` · CHECKPOINT +${checkpointBonus}` : "";
    document.getElementById("waveCompleteReward").textContent =
        leaked > 0
            ? `+${reward} SCRAP · ${leaked} LEAKED (-${leakPenalty})${upkeep ? ` · -${upkeep} UPKEEP` : ""}${checkpointText}`
            : upkeep
                ? `+${reward} SCRAP EARNED · -${upkeep} UPKEEP${checkpointText}`
                : `+${reward} SCRAP EARNED · CLEAN WAVE${checkpointText}`;
    toast.setAttribute("aria-hidden", "false");
    void toast.offsetWidth;
    toast.classList.add("is-visible");

    waveCompleteToastTimer = setTimeout(hideWaveCompleteToast, 1800);
}

function showInsufficientScrapToast() {
    const toast = document.getElementById("insufficientScrapToast");
    if (!toast) return;

    if (insufficientScrapToastTimer !== null) {
        clearTimeout(insufficientScrapToastTimer);
        insufficientScrapToastTimer = null;
    }

    // Restart the entrance animation and give the warning a fresh full second
    // even when the player clicks the unaffordable card repeatedly.
    toast.classList.remove("is-visible");
    toast.setAttribute("aria-hidden", "true");
    void toast.offsetWidth;
    toast.setAttribute("aria-hidden", "false");
    toast.classList.add("is-visible");
    insufficientScrapToastTimer = window.setTimeout(() => {
        toast.classList.remove("is-visible");
        toast.setAttribute("aria-hidden", "true");
        insufficientScrapToastTimer = null;
    }, 1000);
}

function setAutoStartWaves(enabled) {
    autoStartWaves = enabled;
    recordEndlessTelemetryEvent({
        kind: "auto_start",
        enabled: Boolean(autoStartWaves)
    });
    updateAutoStartButton();

    if (autoStartWaves && awaitingNextWave) {
        scheduleAutoStartWave();
    } else if (!autoStartWaves) {
        cancelAutoStartWave();
        if (awaitingNextWave) {
            document.getElementById("waveStatus").textContent =
                "Wave cleared! Reposition your survivors and prepare.";
        }
    }
}




function updateWaveSystem(deltaTime) {
    if (!waveRunning || gamePaused) return;

    spawnTimer -= deltaTime;

    // Spawn enemies in the current group.
    if (enemiesToSpawn > 0) {
        if (spawnTimer <= 0) {
            const group = enemyGroups[currentGroupIndex];

            if (!group) {
                console.error("No enemy group found for this wave.");
                return;
            }

            const enemyTypes = group.types?.length ? group.types : [group.type];
            const enemyType = enemyTypes[currentGroupSpawnIndex % enemyTypes.length];
            spawnEnemy(enemyType, group.specialRole || "normal");
            currentGroupSpawnIndex++;
            enemiesToSpawn--;
            spawnTimer = enemyType === "skitter"
                ? skitterSpawnDelay
                : enemySpawnDelay;
        }

        return;
    }

    // Wait five seconds before the next enemy group.
    if (currentGroupIndex < enemyGroups.length - 1) {
        if (!groupDelayStarted) {
            groupDelayStarted = true;
            spawnTimer = groupSpawnDelay;
            return;
        }

        if (spawnTimer <= 0) {
            currentGroupIndex++;
            currentGroupSpawnIndex = 0;
            enemiesToSpawn = enemyGroups[currentGroupIndex].count;
            groupDelayStarted = false;
            spawnTimer = 0;
        }

        return;
    }

    // Finish the wave after all enemies are defeated.
    if (enemies.length === 0) {
        waveRunning = false;
        gamePaused = false;

        const completedWave = currentWave;
        if (gameMode === "daily") dailyLastCompletedAt = new Date().toISOString();
        const lateEndlessIncomeBonus = isEndlessStyleMode()
            ? Math.min(14, Math.max(0, Math.floor((completedWave - 100) * 0.18)))
            : 0;
        const baseWaveReward = isEndlessStyleMode()
            // Raise the early checkpoint slightly and let it grow gradually
            // so new recruits/upgrades remain reachable without creating an
            // unlimited late-run wallet.
            ? 26
                + Math.min(38, Math.floor((completedWave - 1) * 0.5))
                + lateEndlessIncomeBonus
            : startingWaveScrapReward + (completedWave - 1) * waveScrapRewardIncrease;
        const endlessLeakPenalty = completedWave <= 15
            ? 3
            : completedWave <= 40
                ? 5
                : scrapPenaltyPerLeak;
        const cleanWaveBonus = isEndlessStyleMode() && leakedEnemiesThisWave === 0
            ? Math.min(8, 3 + Math.floor(completedWave / 25))
            : 0;
        const leakPenalty = leakedEnemiesThisWave * (
            isEndlessStyleMode() ? endlessLeakPenalty : scrapPenaltyPerLeak
        );
        const grossWaveReward = isEndlessStyleMode()
            ? Math.max(4, baseWaveReward - leakPenalty + cleanWaveBonus)
            : Math.max(0, baseWaveReward - leakPenalty);
        // Give the player a modest economy checkpoint before the next
        // difficulty tier. This helps a run recover without flattening the
        // value of leaks, upgrades, or survivor placement decisions.
        const checkpointBonus = gameMode === "endless"
            && (completedWave === 5 || completedWave === 10)
            ? 12
            : 0;
        // There is no upkeep tax. Late-game scarcity comes from stronger
        // enemy quality and a deliberately slower reward curve instead of
        // silently charging the player for every survivor on the field.
        const waveReward = Math.max(0, grossWaveReward + checkpointBonus);
        scrap += waveReward;
        updateScrapDisplay();
        // Keep the telemetry field for backwards-compatible dashboards; it is
        // always zero now that upkeep has been removed.
        recordEndlessTelemetryWave(completedWave, waveReward, leakPenalty, 0);
        showWaveCompleteToast(
            completedWave,
            waveReward,
            leakedEnemiesThisWave,
            leakPenalty,
            0,
            checkpointBonus
        );

        document.getElementById("pauseButton").disabled = true;
        document.getElementById("pauseButton").textContent = "PAUSE";

        if (gameMode === "campaign" && currentWave >= totalWaves) {
            cancelAutoStartWave();
            awaitingNextWave = false;
            gameRunning = false;
            document.querySelector(".game-layout").style.display = "none";
            recordCampaignLevelClear(currentLevel);
            awardCampaignLevelCoins();
            document.querySelector("#victoryScreen .menu-eyebrow").textContent = "OPERATION SECURED // SAFE ZONE";
            document.getElementById("victoryTitle").textContent = "OPERATION COMPLETE";
            document.querySelector("#victoryScreen .victory-coin-copy small").textContent = "CAMPAIGN LEVEL CLEAR";
            const missionTitle = document.querySelector(
                `#level${currentLevel}Button strong`
            )?.textContent || `LEVEL ${String(currentLevel).padStart(2, "0")}`;
            document.getElementById("victoryMessage").textContent =
                currentLevel === 6
                    ? "The gates are open. The safe zone is real. You made it through the worst of the wasteland—but this is only the beginning."
                    : `${missionTitle} is secure. Your squad cleared every wave.`;
            updateRunRecap(totalWaves);
            setMuteButtonVisible(false);
            document.getElementById("victoryScreen").style.display = "flex";
            return;
        }

        if (gameMode === "daily" && currentWave >= 15) {
            cancelAutoStartWave();
            awaitingNextWave = false;
            gameRunning = false;
            document.querySelector(".game-layout").style.display = "none";
            const challengeDate = activeDailyChallenge?.date || getDailyChallengeDate();
            pendingDailyScore = {
                date: challengeDate,
                bestWave: 15,
                health: Math.max(0, Math.round(playerHealth)),
                completedAt: dailyLastCompletedAt || new Date().toISOString(),
                submitted: false,
                submitting: false
            };
            document.querySelector("#victoryScreen .menu-eyebrow").textContent = "DAILY CHALLENGE // CLEARED";
            document.getElementById("victoryTitle").textContent = "CHALLENGE COMPLETE";
            document.getElementById("victoryMessage").textContent =
                "All 15 waves cleared. Your run is ready for today's daily leaderboard.";
            document.getElementById("victoryWavesCleared").textContent = "15";
            document.getElementById("victoryDailyScoreSubmission").hidden = false;
            updateRunRecap(15);
            updateDailyScoreSubmissionUI();
            awardDailyChallengeCoins(challengeDate);
            setMuteButtonVisible(false);
            document.getElementById("victoryScreen").style.display = "flex";
            return;
        }

        if (gameMode === "endless") {
            saveEndlessRecord(currentLevel, currentWave);
        }

        currentWave++;
        awaitingNextWave = true;

        const startButton = document.getElementById("startWaveButton");
        startButton.textContent = "START WAVE " + currentWave;
        startButton.style.display = "block";
        startButton.disabled = false;

        document.getElementById("waveDisplay").textContent = isEndlessStyleMode()
            ? "WAVE " + currentWave
            : `${currentWave} / ${gameMode === "daily" ? 15 : totalWaves}`;

        document.getElementById("waveStatus").textContent =
            "Wave cleared! Reposition your survivors and prepare.";

        if (autoStartWaves) {
            scheduleAutoStartWave();
        }

        updateWavePreview();
        updateMoveButton();
    }
}








function gameLoop(timestamp) {
    if (gameRunning) {
        const deltaTime = previousTime === 0
            ? 0
            : Math.min((timestamp - previousTime) / 1000, 0.05) * gameSpeed;

        previousTime = timestamp;
     if (waveRunning && !gamePaused) {
    updateWaveSystem(deltaTime);
    updateSurvivorCombat(deltaTime);
    updateEnemies(deltaTime);
    updateBullets(deltaTime);
    updateDamageNumbers(deltaTime);
}
if (!gamePaused) {
    updateImpactPixels(deltaTime);
    updateBlastEffects(deltaTime);
}

renderGame();
    } else if (survivors.some(survivor =>
        Number(survivor.placementFeedbackUntil) > timestamp
    )) {
        // Keep short placement feedback animated on the pre-wave deployment
        // screen, where combat is not yet running its normal render branch.
        renderGame();
    }

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);


/* MAIN MENU NAVIGATION */

/* MENU AND DEPLOYMENT NAVIGATION */

const mainMenu = document.getElementById("mainMenu");
const gameHeader = document.querySelector(".game-header");
const profileScreen = document.getElementById("profileScreen");
const campaignSelect = document.getElementById("campaignSelect");
const levelSelect = document.getElementById("levelSelect");
const leaderboardScreen = document.getElementById("leaderboardScreen");
const deploymentScreen = document.getElementById("deploymentScreen");
const loadoutScreen = document.getElementById("loadoutScreen");
const gameLayout = document.querySelector(".game-layout");

function syncMainMenuHeaderAlignment() {
    if (!gameHeader || !mainMenu) return;
    gameHeader.classList.toggle("is-main-menu", getComputedStyle(mainMenu).display !== "none");
}

syncMainMenuHeaderAlignment();
new MutationObserver(syncMainMenuHeaderAlignment).observe(mainMenu, {
    attributes: true,
    attributeFilter: ["style"]
});

const endlessRecordKey = "wastelandDefense.endlessRecords.v1";
const coinBalanceKey = "wastelandDefense.coins.v1";
const playerProfileKey = "wastelandDefense.profile.v1";
const unlockedSurvivorsKey = "wastelandDefense.unlockedSurvivors.v1";
const loadoutsKey = "wastelandDefense.loadouts.v1";
const linkedCloudAccountKey = "wastelandDefense.cloudAccountId.v1";
const campaignLevelCoinReward = 100;
const dailyChallengeCoinReward = 250;
const dailyChallengeRewardKey = "wastelandDefense.dailyRewards.v1";
let supabaseClient = null;
let supabaseUser = null;
let supabaseSdkPromise = null;
let newAccountCreationPending = false;
let livePresenceChannel = null;
let livePresenceSubscribed = false;
let cloudLoadGeneration = 0;
let profileFriendsRenderGeneration = 0;
let leaderboardLoadGeneration = 0;
const leaderboardMapNames = {
    1: "THE OUTSKIRTS",
    2: "ABANDONED HIGHWAY",
    3: "THE DEAD ZONE",
    4: "THE RUINS",
    5: "INDUSTRIAL DISTRICT",
    6: "THE SAFE ZONE"
};
let activeLeaderboardMap = 1;
let activeLeaderboardScope = "global";
let activeLeaderboardMode = "endless";
let activeDailyLeaderboardDate = null;
let leaderboardReturnScreen = "menu";
let rosterSortMode = "rarity-asc";
// Preserve unlock order independently from survivor object order so the
// recently-obtained roster sort remains meaningful after cloud reloads.
let unlockedSurvivorOrder = [];
let loadoutDraftIds = new Set();
let loadoutEditingId = null;
let pendingLoadoutIds = null;
let pendingLoadoutName = null;
let loadoutReturnScreen = "menu";
const profilePortraitSources = {
    mason: "Images/model-portraits/Mason.png",
    james: "Images/model-portraits/James.png",
    cody: "Images/model-portraits/Cody.png",
    britney: "Images/model-portraits/Britney.png",
    zach: "Images/model-portraits/Zach.png",
    brady: "Images/model-portraits/Brady.png"
};
customSurvivors.forEach(survivor => {
    profilePortraitSources[survivor.id] = survivor.portraitData;
});
const trophyPlaceNames = { 1: "GOLD", 2: "SILVER", 3: "BRONZE" };

// Daily modifiers are generated from the UTC date, so every player sees the
// same challenge rules without storing another piece of mutable server state.
// Each day pairs one hazard with one small compensating boon to keep the
// challenge interesting without turning it into an unwinnable dice roll.
const dailyModifierDefinitions = {
    iron_hide: {
        label: "IRON HIDE",
        description: "Hostiles have 18% more health.",
        kind: "hazard",
        enemyHealthScale: 1.18
    },
    rush_hour: {
        label: "RUSH HOUR",
        description: "Hostiles move 12% faster.",
        kind: "hazard",
        enemySpeedScale: 1.12
    },
    swarm: {
        label: "SWARM",
        description: "Each wave sends 20% more regular hostiles.",
        kind: "hazard",
        enemyCountScale: 1.2
    },
    overclock: {
        label: "OVERCLOCK",
        description: "Survivors attack 10% faster.",
        kind: "boon",
        survivorFireRateScale: 0.9
    },
    long_sight: {
        label: "LONG SIGHT",
        description: "Survivor attack ranges are 12% wider.",
        kind: "boon",
        survivorRangeScale: 1.12
    },
    bounty: {
        label: "BOUNTY",
        description: "Paid kills award 1 extra scrap.",
        kind: "boon",
        killScrapBonus: 1
    }
};

const dailyModifierHazards = ["iron_hide", "rush_hour", "swarm"];
const dailyModifierBoons = ["overclock", "long_sight", "bounty"];

function getDailyModifiers(challenge = null) {
    if (gameMode !== "daily" && !challenge) return [];
    const source = challenge || activeDailyChallenge || currentDailyChallenge;
    return (Array.isArray(source?.modifierIds) ? source.modifierIds : [])
        .map(id => dailyModifierDefinitions[id])
        .filter(Boolean);
}

function getDailyModifierValue(property, fallback = 1, challenge = null) {
    return getDailyModifiers(challenge).reduce((value, modifier) => {
        const modifierValue = Number(modifier[property]);
        return Number.isFinite(modifierValue) ? value * modifierValue : value;
    }, fallback);
}

function getDailyModifierBonus(property, fallback = 0, challenge = null) {
    return getDailyModifiers(challenge).reduce((value, modifier) => {
        const modifierValue = Number(modifier[property]);
        return Number.isFinite(modifierValue) ? value + modifierValue : value;
    }, fallback);
}

function getDailyChallengeDate(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

function createDailyChallenge(dateKey = getDailyChallengeDate()) {
    let seed = 2166136261;
    for (let index = 0; index < dateKey.length; index++) {
        seed ^= dateKey.charCodeAt(index);
        seed = Math.imul(seed, 16777619);
    }
    const random = () => {
        seed += 0x6D2B79F5;
        let value = seed;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
    const shuffled = values => {
        const result = [...values];
        for (let index = result.length - 1; index > 0; index--) {
            const swapIndex = Math.floor(random() * (index + 1));
            [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
        }
        return result;
    };
    const survivorIds = shuffled(["mason", "james", "cody", "britney", "zach", "brady"]).slice(0, 3);
    const regularTypes = shuffled(["spider", "skitter", "wastelandcow", "mutantman", "mutantsnake"]).slice(0, 2);
    const heavyType = shuffled(["hollow", "fogkeeper", "heavymutant"])[0];
    const modifierIds = [
        dailyModifierHazards[Math.floor(random() * dailyModifierHazards.length)],
        dailyModifierBoons[Math.floor(random() * dailyModifierBoons.length)]
    ];
    return {
        date: dateKey,
        mapId: 1 + Math.floor(random() * 6),
        survivorIds,
        enemyTypes: [...regularTypes, heavyType],
        modifierIds
    };
}

function getTodaysDailyChallenge() {
    const today = getDailyChallengeDate();
    if (!currentDailyChallenge || currentDailyChallenge.date !== today) {
        currentDailyChallenge = createDailyChallenge(today);
    }
    return currentDailyChallenge;
}

function createTrophyIcon(place) {
    const trophy = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    trophy.setAttribute("class", `trophy-icon trophy-icon-place-${place}`);
    trophy.setAttribute("viewBox", "0 0 24 24");
    trophy.setAttribute("aria-hidden", "true");
    const trophyShape = document.createElementNS("http://www.w3.org/2000/svg", "path");
    trophyShape.setAttribute("d", "M7 3h10v5c0 3.2-2.2 5.6-5 6.3C9.2 13.6 7 11.2 7 8V3ZM3 5h4v2H5v1c0 1.4 1 2.4 2.4 2.8l-.5 1.9C4.5 12.1 3 10.3 3 8V5Zm14 0h4v3c0 2.3-1.5 4.1-3.9 4.7l-.5-1.9C18 10.4 19 9.4 19 8V7h-2V5ZM10 14h4v4h4v3H6v-3h4v-4Z");
    trophy.append(trophyShape);
    return trophy;
}

let playerTrophyRecords = [];
let playerDailyTrophyRecords = [];

function readPlayerProfile() {
    try {
        const saved = JSON.parse(localStorage.getItem(playerProfileKey) || "{}");
        const campaignLevels = Array.isArray(saved.campaignLevels)
            ? [...new Set(saved.campaignLevels.map(Number).filter(level => level >= 1 && level <= 6))]
            : [];
        return { campaignLevels };
    } catch {
        return { campaignLevels: [] };
    }
}

let playerProfile = readPlayerProfile();

function persistPlayerProfile() {
    try {
        const saved = { campaignLevels: playerProfile.campaignLevels };
        if (supabaseUser && profilePortraitSources[playerProfile.portrait]) {
            saved.portrait = playerProfile.portrait;
        }
        localStorage.setItem(playerProfileKey, JSON.stringify(saved));
    } catch {
        // Keep the profile usable for this session if browser storage is unavailable.
    }
}

// Keep campaign completion locally, but do not retain an offline profile or portrait.
persistPlayerProfile();

function updateProfileIdentity() {
    const signedIn = Boolean(supabaseUser);
    const displayName = signedIn ? accountUsername() : "DEFENDER";
    const upperUsername = displayName.toLocaleUpperCase();
    const unlockedPortraits = getUnlockedProfilePortraits();
    if (signedIn && !unlockedPortraits.some(([id]) => id === playerProfile.portrait)) {
        playerProfile.portrait = unlockedPortraits[0]?.[0] || "mason";
    }
    const survivor = survivorDetails[playerProfile.portrait] || survivorDetails.mason;
    const portraitSource = profilePortraitSources[playerProfile.portrait] || profilePortraitSources.mason;
    const profileButton = document.getElementById("profileButton");
    const profileButtonImage = document.getElementById("profileButtonPortrait");
    profileButtonImage.dataset.portraitId = playerProfile.portrait;
    document.getElementById("profilePortraitPreview").dataset.portraitId = playerProfile.portrait;

    document.getElementById("profileButtonAction").textContent = signedIn ? "PROFILE" : "SIGN IN";
    document.getElementById("profileButtonUsername").textContent = signedIn ? upperUsername : "";
    document.getElementById("profileButtonUsername").hidden = !signedIn;
    profileButtonImage.hidden = !signedIn;
    document.getElementById("profileButtonSignInMark").hidden = signedIn;
    profileButton.setAttribute("aria-label", signedIn ? `Open ${displayName}'s player profile` : "Sign in or create a player account");
    document.getElementById("mainMenuGreeting").textContent = `HEY, ${upperUsername}!`;
    document.getElementById("profileScreen").querySelector(".profile-panel").classList.toggle("is-auth-only", !signedIn);
    document.getElementById("profileEyebrow").textContent = signedIn ? "PLAYER ACCOUNT // PROFILE" : "ACCOUNT ACCESS";
    document.getElementById("profileTitle").textContent = signedIn ? `${upperUsername} // PROFILE` : "SIGN IN OR CREATE ACCOUNT";
    if (signedIn) {
        profileButtonImage.src = portraitSource;
        document.getElementById("profilePortraitPreview").src = portraitSource;
        document.getElementById("profilePortraitLabel").textContent = survivor.name.toUpperCase();
    }
}

function getUnlockedProfilePortraits() {
    return getSortedRosterEntries()
        .filter(([id]) => profilePortraitSources[id]);
}

function renderProfilePortraitOptions() {
    const options = document.getElementById("profilePortraitOptions");
    if (!supabaseUser) {
        options.replaceChildren();
        return;
    }
    const fragment = document.createDocumentFragment();

    getUnlockedProfilePortraits().forEach(([id, survivor]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "profile-portrait-option";
        button.dataset.profilePortrait = id;
        button.setAttribute("aria-pressed", String(playerProfile.portrait === id));
        button.setAttribute("aria-label", `Use ${survivor.name}'s portrait`);

        const image = document.createElement("img");
        image.src = profilePortraitSources[id];
        image.dataset.portraitId = id;
        image.alt = "";
        image.setAttribute("aria-hidden", "true");

        const label = document.createElement("span");
        label.textContent = survivor.name;
        button.append(image, label);
        fragment.append(button);
    });

    options.replaceChildren(fragment);
}

function saveProfilePortrait(id) {
    if (!supabaseUser) return;
    const survivor = survivorDetails[id];
    if (!survivor || survivor.unlocked !== true || !profilePortraitSources[id]) return;

    playerProfile.portrait = id;
    persistPlayerProfile();
    updateProfileIdentity();
    renderProfilePortraitOptions();
    syncLivePlayerPresence().catch(error => {
        console.warn("Live player portrait could not sync:", error.message || error);
    });
    const notice = document.getElementById("profileSaveNotice");
    notice.textContent = `${survivor.name.toUpperCase()} PORTRAIT SAVED. SYNCING...`;
    syncRemoteProfile().then(error => {
        if (supabaseUser) notice.textContent = error
            ? "SAVED ON THIS DEVICE. ONLINE SYNC FAILED."
            : `${survivor.name.toUpperCase()} PORTRAIT SAVED TO YOUR ACCOUNT.`;
    });
}

function updateProfileStats() {
    const records = readEndlessRecords();
    const bestWave = Math.max(0, ...Object.values(records).map(value => Number(value) || 0));
    const mapRecordCount = Object.values(records).filter(value => Number(value) > 0).length;

    document.getElementById("profileCoinStat").textContent = playerCoinBalance.toLocaleString();
    document.getElementById("profileCampaignStat").textContent =
        `${playerProfile.campaignLevels.length} / 6`;
    document.getElementById("profileEndlessStat").textContent = String(bestWave);
    document.getElementById("profileMapRecordsStat").textContent =
        `${Math.min(6, mapRecordCount)} / 6`;
    renderProfileTrophyCounts();
}

function renderProfileTrophyCounts() {
    const renderCounts = (countsPanel, records, ariaLabel) => {
        if (!countsPanel) return;
        countsPanel.replaceChildren();
        countsPanel.setAttribute("aria-label", ariaLabel);
        [1, 2, 3].forEach(place => {
            const count = records.filter(trophy => Number(trophy.place) === place).length;
            const counter = document.createElement("div");
            counter.className = `profile-trophy-count trophy-place-${place}`;
            counter.setAttribute("aria-label", `${trophyPlaceNames[place]} trophies: ${count}`);
            counter.append(createTrophyIcon(place));

            const amount = document.createElement("strong");
            amount.textContent = `×${count}`;
            const label = document.createElement("small");
            label.textContent = trophyPlaceNames[place];
            counter.append(amount, label);
            countsPanel.append(counter);
        });
    };
    renderCounts(document.getElementById("profileTrophyCounts"), playerTrophyRecords, "Endless trophies by type");
    renderCounts(document.getElementById("profileDailyTrophyCounts"), playerDailyTrophyRecords, "Daily challenge trophies by type");
}

async function refreshPlayerTrophies(client = supabaseClient) {
    if (!client || !supabaseUser) {
        playerTrophyRecords = [];
        playerDailyTrophyRecords = [];
        updateProfileStats();
        return [];
    }
    const userId = supabaseUser.id;
    const { data, error } = await client.from("player_trophies")
        .select("map_id,place,earned_at")
        .eq("user_id", userId)
        .order("map_id", { ascending: true })
        .order("place", { ascending: true });
    if (error) throw error;
    if (supabaseUser?.id !== userId) return playerTrophyRecords;
    playerTrophyRecords = data || [];
    try {
        const { data: dailyData, error: dailyError } = await client.from("daily_challenge_trophies")
            .select("challenge_date,place,earned_at")
            .eq("user_id", userId)
            .order("challenge_date", { ascending: true })
            .order("place", { ascending: true });
        if (dailyError) throw dailyError;
        if (supabaseUser?.id === userId) playerDailyTrophyRecords = dailyData || [];
    } catch (dailyError) {
        playerDailyTrophyRecords = [];
        console.warn("Daily trophy history is unavailable. Apply the daily challenge Supabase migration to enable it:", dailyError.message || dailyError);
    }
    updateProfileStats();
    return playerTrophyRecords;
}

function recordCampaignLevelClear(level) {
    if (!playerProfile.campaignLevels.includes(level)) {
        playerProfile.campaignLevels.push(level);
        playerProfile.campaignLevels.sort((a, b) => a - b);
        persistPlayerProfile();
    }
    updateCampaignLevelCardStatuses();
}

function updateCampaignLevelCardStatuses() {
    for (let level = 1; level <= 6; level++) {
        const card = document.getElementById(`level${level}Button`);
        const status = card?.querySelector(".level-status");
        if (!card || !status) continue;

        const completed = gameMode !== "endless" && playerProfile.campaignLevels.includes(level);
        status.textContent = completed ? "COMPLETED" : "AVAILABLE";
        status.classList.toggle("is-completed", completed);
        card.classList.toggle("is-completed", completed);
    }
}

function readCoinBalance() {
    try {
        const balance = Number(localStorage.getItem(coinBalanceKey));
        return Number.isFinite(balance) ? Math.max(0, Math.floor(balance)) : 0;
    } catch {
        return 0;
    }
}

let playerCoinBalance = readCoinBalance();

function updateCoinBalanceDisplay() {
    const display = document.getElementById("coinBalanceDisplay");
    if (display) display.textContent = playerCoinBalance.toLocaleString();
}

function persistCoinBalance() {
    try {
        localStorage.setItem(coinBalanceKey, String(playerCoinBalance));
    } catch {
        // Keep the current run reward visible if browser storage is unavailable.
    }
}

// Account-owned data must not remain visible after sign-out.  Keep only the
// six built-in survivors in the signed-out UI; the next authenticated session
// loads its roster, coins, records, and trophies from Supabase.
function resetSignedOutState() {
    Object.entries(survivorDetails).forEach(([id, survivor]) => {
        survivor.unlocked = builtinSurvivorIds.has(id);
    });
    unlockedSurvivorOrder = [...builtinSurvivorIds];
    playerCoinBalance = 0;
    playerProfile = { campaignLevels: [], portrait: "mason" };
    playerTrophyRecords = [];
    playerDailyTrophyRecords = [];
    pendingEndlessScore = null;
    pendingDailyScore = null;
    try {
        localStorage.removeItem(coinBalanceKey);
        localStorage.removeItem(endlessRecordKey);
        localStorage.removeItem(dailyChallengeRewardKey);
        localStorage.removeItem(linkedCloudAccountKey);
        localStorage.removeItem(playerProfileKey);
        localStorage.removeItem(unlockedSurvivorsKey);
    } catch {
        // The signed-out UI still resets in memory when storage is unavailable.
    }
    persistCoinBalance();
    persistPlayerProfile();
    persistUnlockedSurvivors();
    updateCoinBalanceDisplay();
    updateEndlessRecordDisplays();
    renderMenuCrewRoster();
    updateProfileStats();
}

function renderCampaignCoinReward(reward) {
    updateCoinBalanceDisplay();
    updateProfileStats();
    document.getElementById("victoryCoinsEarned").textContent =
        `+${reward} COINS`;
    document.getElementById("victoryCoinsTotal").textContent =
        playerCoinBalance.toLocaleString();
    document.getElementById("victoryCoinRewardStatus").textContent = "";
}

function renderDailyCoinReward(reward = dailyChallengeCoinReward, status = "") {
    updateCoinBalanceDisplay();
    updateProfileStats();
    document.getElementById("victoryCoinsEarned").textContent = `+${reward.toLocaleString()} COINS`;
    document.getElementById("victoryCoinsTotal").textContent = playerCoinBalance.toLocaleString();
    document.querySelector("#victoryScreen .victory-coin-copy small").textContent = "DAILY CHALLENGE CLEAR";
    document.getElementById("victoryCoinRewardStatus").textContent = status;
}

function awardDailyCoinsLocally(challengeDate) {
    let rewardLedger = {};
    try {
        rewardLedger = JSON.parse(localStorage.getItem(dailyChallengeRewardKey) || "{}");
    } catch {
        rewardLedger = {};
    }
    const rewardOwner = supabaseUser?.id || "guest";
    const awardedDates = Array.isArray(rewardLedger[rewardOwner]) ? rewardLedger[rewardOwner] : [];
    if (awardedDates.includes(challengeDate)) {
        renderDailyCoinReward(0, "TODAY'S REWARD ALREADY CLAIMED");
        return 0;
    }
    playerCoinBalance += dailyChallengeCoinReward;
    rewardLedger[rewardOwner] = [...awardedDates, challengeDate].slice(-60);
    try {
        localStorage.setItem(dailyChallengeRewardKey, JSON.stringify(rewardLedger));
    } catch {
        // The current session still receives the completion reward if storage is unavailable.
    }
    persistCoinBalance();
    renderDailyCoinReward(dailyChallengeCoinReward, supabaseUser ? "SYNC UNAVAILABLE · SAVED ON THIS DEVICE" : "ADDED TO THIS DEVICE SAVE");
    return dailyChallengeCoinReward;
}

function awardDailyChallengeCoins(challengeDate) {
    if (!supabaseClient || !supabaseUser) {
        awardDailyCoinsLocally(challengeDate);
        return;
    }
    renderDailyCoinReward(dailyChallengeCoinReward, "SAVING REWARD TO YOUR ACCOUNT…");
    supabaseClient.rpc("award_daily_challenge_completion", {
        p_challenge_date: challengeDate
    }).then(({ data, error }) => {
        if (error) throw error;
        const result = Array.isArray(data) ? data[0] : data;
        playerCoinBalance = Math.max(0, Number(result?.total_coins) || 0);
        persistCoinBalance();
        const awarded = Math.max(0, Number(result?.coins_awarded) || 0);
        renderDailyCoinReward(awarded, awarded > 0 ? "REWARD SAVED TO YOUR ACCOUNT" : "TODAY'S REWARD ALREADY CLAIMED");
    }).catch(error => {
        console.warn("Daily challenge reward could not sync to Supabase:", error.message || error);
        awardDailyCoinsLocally(challengeDate);
    });
}

const endlessCoinsPerWave = 10;

function renderEndlessCoinReward(reward, status = "") {
    const panel = document.getElementById("endlessCoinReward");
    if (!panel) return;

    panel.hidden = gameMode !== "endless";
    if (panel.hidden) return;

    document.getElementById("gameOverCoinsEarned").textContent =
        `+${Math.max(0, reward).toLocaleString()} COINS`;
    document.getElementById("gameOverCoinsTotal").textContent =
        playerCoinBalance.toLocaleString();
    document.getElementById("endlessCoinRewardStatus").textContent = status;
}

function awardEndlessRunCoins(wavesCleared, runId) {
    const reward = Math.max(0, Math.floor(wavesCleared)) * endlessCoinsPerWave;
    playerCoinBalance += reward;
    persistCoinBalance();
    updateCoinBalanceDisplay();
    updateProfileStats();
    renderEndlessCoinReward(
        reward,
        reward === 0
            ? "NO CLEARED WAVES // NO COINS EARNED"
            : supabaseUser
                ? "SAVING REWARD TO YOUR ACCOUNT…"
                : "ADDED TO YOUR DEVICE SAVE"
    );

    if (reward === 0 || !supabaseClient || !supabaseUser || !runId) return;

    supabaseClient.rpc("award_endless_run", {
        p_run_id: runId,
        p_waves_cleared: Math.floor(wavesCleared)
    }).then(({ data, error }) => {
        if (error) throw error;
        const result = Array.isArray(data) ? data[0] : data;
        playerCoinBalance = Math.max(0, Number(result?.total_coins) || 0);
        persistCoinBalance();
        updateCoinBalanceDisplay();
        updateProfileStats();
        renderEndlessCoinReward(
            Math.max(0, Number(result?.coins_awarded) || 0),
            "REWARD SAVED TO YOUR ACCOUNT"
        );
    }).catch(error => {
        console.warn("Endless reward could not sync to Supabase:", error.message || error);
        renderEndlessCoinReward(reward, "SAVED ON THIS DEVICE. ACCOUNT SYNC FAILED.");
    });
}

function awardCampaignLevelCoins() {
    if (supabaseClient && supabaseUser && activeCampaignRunId) {
        const notice = document.getElementById("profileAccountNotice");
        supabaseClient.rpc("award_campaign_clear", {
            p_level_id: currentLevel,
            p_run_id: activeCampaignRunId
        }).then(({ data, error }) => {
            if (error) {
                console.warn("Campaign completion could not sync to Supabase:", error.message);
                playerCoinBalance += campaignLevelCoinReward;
                persistCoinBalance();
                renderCampaignCoinReward(campaignLevelCoinReward);
                if (notice) setAccountNotice("Campaign reward is saved on this device; cloud sync failed.", true);
                return;
            }

            const result = Array.isArray(data) ? data[0] : data;
            const awarded = Math.max(0, Number(result?.coins_awarded) || 0);
            playerCoinBalance = Math.max(0, Number(result?.total_coins) || 0);
            persistCoinBalance();
            renderCampaignCoinReward(awarded);
        }).catch(error => {
            console.warn("Campaign completion could not reach Supabase:", error.message || error);
            playerCoinBalance += campaignLevelCoinReward;
            persistCoinBalance();
            renderCampaignCoinReward(campaignLevelCoinReward);
            setAccountNotice("Campaign reward is saved on this device; cloud sync failed.", true);
        });
        return;
    }

    playerCoinBalance += campaignLevelCoinReward;
    persistCoinBalance();
    renderCampaignCoinReward(campaignLevelCoinReward);
}

function readEndlessRecords() {
    try {
        const records = JSON.parse(localStorage.getItem(endlessRecordKey) || "{}");
        return records && typeof records === "object" && !Array.isArray(records)
            ? records
            : {};
    } catch {
        return {};
    }
}

function updateEndlessRecordDisplays() {
    const records = readEndlessRecords();

    for (let level = 1; level <= 6; level++) {
        const label = document.getElementById(`endlessRecord${level}`);
        if (label) label.textContent = `BEST WAVE: ${Number(records[level]) || 0}`;
    }
}

updateCoinBalanceDisplay();

function saveEndlessRecord(level, wave) {
    const records = readEndlessRecords();
    records[level] = Math.max(Number(records[level]) || 0, wave);

    try {
        localStorage.setItem(endlessRecordKey, JSON.stringify(records));
    } catch {
        // Keep the game playable if browser storage is unavailable.
    }

    updateEndlessRecordDisplays();
}

function updateEndlessSubmissionUI(message = "", state = "") {
    const panel = document.getElementById("endlessScoreSubmission");
    const button = document.getElementById("submitEndlessScoreButton");
    const notice = document.getElementById("endlessScoreSubmissionNotice");
    panel.hidden = gameMode !== "endless" || !pendingEndlessScore;
    if (panel.hidden) return;

    const { mapId, bestWave, submitted, submitting } = pendingEndlessScore;
    button.classList.toggle("is-submitted", Boolean(submitted));
    notice.classList.toggle("is-error", state === "error");
    notice.classList.toggle("is-success", state === "success" || Boolean(submitted));
    button.textContent = submitted
        ? "SUBMITTED TO LEADERBOARD"
        : submitting
            ? "VERIFYING SUBMISSION…"
            : "SUBMIT TO LEADERBOARD";
    button.disabled = Boolean(submitted || submitting || bestWave < 1);

    if (message) {
        notice.textContent = message;
    } else if (submitting) {
        notice.textContent = `Submitting WAVE ${bestWave} on ${leaderboardMapNames[mapId]}…`;
    } else if (submitted) {
        notice.textContent = "Successfully submitted to the leaderboard.";
    } else if (bestWave < 1) {
        notice.textContent = "Clear at least one wave to submit an Endless score.";
    } else if (!supabaseUser) {
        notice.textContent = "Sign in to submit this run. You can return here after signing in.";
    } else {
        notice.textContent = `${leaderboardMapNames[mapId]} · WAVE ${bestWave} · YOUR BEST SCORE IS KEPT.`;
    }
}

function updateReturnEndlessSubmissionUI(message = "", state = "") {
    const panel = document.getElementById("returnEndlessScoreSubmission");
    const button = document.getElementById("submitCompletedEndlessScoreButton");
    const notice = document.getElementById("returnEndlessScoreSubmissionNotice");
    const score = returnEndlessScoreSubmission;
    panel.hidden = gameMode !== "endless" || !score;
    if (panel.hidden) return;

    button.disabled = Boolean(score.submitted || score.submitting || score.bestWave < 1);
    button.classList.toggle("is-submitted", Boolean(score.submitted));
    button.textContent = score.submitted
        ? "SUCCESSFULLY SUBMITTED"
        : score.submitting
            ? "VERIFYING SUBMISSION…"
            : score.bestWave > 0
                ? `SUBMIT WAVE ${score.bestWave} TO LEADERBOARD`
                : "SUBMIT LAST CLEARED WAVE";
    notice.classList.toggle("is-error", state === "error");
    notice.classList.toggle("is-success", state === "success" || Boolean(score.submitted));

    if (message) {
        notice.textContent = message;
    } else if (score.submitting) {
        notice.textContent = `Submitting WAVE ${score.bestWave} on ${leaderboardMapNames[score.mapId]}…`;
    } else if (score.submitted) {
        notice.textContent = `Wave ${score.bestWave} successfully submitted to the leaderboard.`;
    } else if (score.bestWave < 1) {
        notice.textContent = "Complete at least one wave to submit an Endless score.";
    } else if (!supabaseUser) {
        notice.textContent = "Sign in to submit your most recently completed wave.";
    } else {
        notice.textContent = `${leaderboardMapNames[score.mapId]} · WAVE ${score.bestWave}`;
    }
}

function updateRestartEndlessSubmissionUI(message = "", state = "") {
    const panel = document.getElementById("restartEndlessScoreSubmission");
    const button = document.getElementById("submitCompletedEndlessScoreFromRestartButton");
    const notice = document.getElementById("restartEndlessScoreSubmissionNotice");
    const score = returnEndlessScoreSubmission;
    panel.hidden = gameMode !== "endless" || !score;
    if (panel.hidden) return;

    button.disabled = Boolean(score.submitted || score.submitting || score.bestWave < 1);
    button.classList.toggle("is-submitted", Boolean(score.submitted));
    button.textContent = score.submitted
        ? "SUCCESSFULLY SUBMITTED"
        : score.submitting
            ? "VERIFYING SUBMISSION…"
            : "SUBMIT TO LEADERBOARD";
    notice.classList.toggle("is-error", state === "error");
    notice.classList.toggle("is-success", state === "success" || Boolean(score.submitted));

    if (message) {
        notice.textContent = message;
    } else if (score.submitting) {
        notice.textContent = `Submitting WAVE ${score.bestWave} on ${leaderboardMapNames[score.mapId]}…`;
    } else if (score.submitted) {
        notice.textContent = `Wave ${score.bestWave} successfully submitted to the leaderboard.`;
    } else if (score.bestWave < 1) {
        notice.textContent = "Complete at least one wave to submit an Endless score.";
    } else if (!supabaseUser) {
        notice.textContent = "Sign in to submit your most recently completed wave.";
    } else {
        notice.textContent = `${leaderboardMapNames[score.mapId]} · WAVE ${score.bestWave}`;
    }
}

function updateCompletedEndlessSubmissionUIs(message = "", state = "") {
    updateReturnEndlessSubmissionUI(message, state);
    updateRestartEndlessSubmissionUI(message, state);
}

function prepareReturnEndlessSubmission() {
    if (gameMode !== "endless") {
        returnEndlessScoreSubmission = null;
        updateCompletedEndlessSubmissionUIs();
        return;
    }

    const bestWave = Math.max(0, currentWave - 1);
    if (
        !returnEndlessScoreSubmission ||
        returnEndlessScoreSubmission.mapId !== currentLevel ||
        returnEndlessScoreSubmission.bestWave !== bestWave
    ) {
        returnEndlessScoreSubmission = {
            mapId: currentLevel,
            bestWave,
            submitted: false,
            submitting: false,
            telemetry: getEndlessTelemetrySnapshot(bestWave, "abandoned"),
            telemetryLogged: false
        };
    }

    updateCompletedEndlessSubmissionUIs();
}

function createDailyConfirmationScore() {
    if (gameMode !== "daily" || !activeDailyChallenge) return null;
    return {
        date: activeDailyChallenge.date,
        bestWave: Math.max(0, currentWave - 1),
        health: Math.max(0, Math.round(playerHealth)),
        completedAt: dailyLastCompletedAt || new Date().toISOString(),
        submitted: false,
        submitting: false
    };
}

function prepareDailyConfirmationSubmissions() {
    if (gameMode !== "daily") {
        returnDailyScoreSubmission = null;
        restartDailyScoreSubmission = null;
    } else {
        returnDailyScoreSubmission = createDailyConfirmationScore();
        restartDailyScoreSubmission = createDailyConfirmationScore();
    }
    updateDailyScoreSubmissionUI();
}

async function persistEndlessRunTelemetry(client, score) {
    const telemetry = score?.telemetry;
    if (!client || !supabaseUser || !telemetry || score.telemetryLogged) return;
    if (!telemetry.runId || !Number.isFinite(Number(telemetry.mapId))) return;

    const { error } = await client.from("endless_run_logs").insert({
        user_id: supabaseUser.id,
        run_id: telemetry.runId,
        map_id: Math.max(1, Math.min(6, Math.floor(Number(telemetry.mapId)))),
        submitted_wave: Math.max(0, Math.floor(Number(score.bestWave) || 0)),
        outcome: String(telemetry.outcome || "defeat").slice(0, 16),
        game_version: String(telemetry.gameVersion || ENDLESS_TELEMETRY_VERSION).slice(0, 16),
        payload: telemetry
    });

    // A retry after a successful leaderboard submission is harmless. Treat a
    // duplicate run id as already recorded so it never blocks score posting.
    if (error && error.code !== "23505") throw error;
    score.telemetryLogged = true;
}

async function persistEndlessLeaderboardScore(score) {
    const client = await ensureSupabaseClient();
    const submittedWave = Math.max(0, Math.floor(Number(score.bestWave) || 0));
    const { error } = await client.rpc("submit_endless_score", {
        p_map_id: Number(score.mapId),
        p_best_wave: submittedWave
    });
    if (error) throw error;

    const { data: savedScore, error: verificationError } = await client
        .from("endless_scores")
        .select("best_wave")
        .eq("user_id", supabaseUser.id)
        .eq("map_id", Number(score.mapId))
        .maybeSingle();
    if (verificationError) throw verificationError;
    if (!savedScore || Number(savedScore.best_wave) < submittedWave) {
        throw new Error("The leaderboard could not verify this score. Please try again.");
    }

    try {
        await persistEndlessRunTelemetry(client, score);
    } catch (telemetryError) {
        // Telemetry is best-effort. A missing migration, blocked network, or
        // transient insert error must never make a verified leaderboard score
        // look like it failed.
        console.warn("Could not upload Endless balance telemetry:", telemetryError.message || telemetryError);
    }

    try {
        await refreshPlayerTrophies(client);
    } catch (trophyError) {
        // Score verification succeeded; the trophy panel can retry on the next account sync.
        console.warn("Could not refresh the trophy collection:", trophyError.message || trophyError);
    }
}

function updateDailyScoreSubmissionUI(message = "", state = "") {
    const score = pendingDailyScore;
    const panels = [
        ["gameOverDailyScoreSubmission", "submitDailyScoreButton", "gameOverDailyScoreNotice"],
        ["victoryDailyScoreSubmission", "submitVictoryDailyScoreButton", "victoryDailyScoreNotice"],
        ["returnDailyScoreSubmission", "submitReturnDailyScoreButton", "returnDailyScoreNotice", returnDailyScoreSubmission],
        ["restartDailyScoreSubmission", "submitRestartDailyScoreButton", "restartDailyScoreNotice", restartDailyScoreSubmission]
    ];
    panels.forEach(([panelId, buttonId, noticeId, confirmationScore]) => {
        const panel = document.getElementById(panelId);
        const button = document.getElementById(buttonId);
        const notice = document.getElementById(noticeId);
        const displayedScore = confirmationScore || score;
        panel.hidden = gameMode !== "daily" || !displayedScore;
        if (panel.hidden) return;
        button.disabled = Boolean(displayedScore.submitted || displayedScore.submitting || displayedScore.bestWave < 1);
        button.classList.toggle("is-submitted", Boolean(displayedScore.submitted));
        button.textContent = displayedScore.submitted
            ? "SUCCESSFULLY SUBMITTED"
            : displayedScore.submitting
                ? "VERIFYING SUBMISSION…"
                : "SUBMIT TO DAILY LEADERBOARD";
        notice.classList.toggle("is-error", state === "error");
        notice.classList.toggle("is-success", state === "success" || Boolean(displayedScore.submitted));
        if (message) {
            notice.textContent = message;
        } else if (displayedScore.submitting) {
            notice.textContent = `Submitting ${displayedScore.bestWave} cleared wave${displayedScore.bestWave === 1 ? "" : "s"} with ${displayedScore.health} health…`;
        } else if (displayedScore.submitted) {
            notice.textContent = "Successfully submitted to today's leaderboard.";
        } else if (displayedScore.bestWave < 1) {
            notice.textContent = "Clear at least one wave to submit a Daily Challenge score.";
        } else if (!supabaseUser) {
            notice.textContent = "Sign in to submit this run. You can return here after signing in.";
        } else {
            notice.textContent = `WAVE ${displayedScore.bestWave} · ${displayedScore.health} HEALTH · UTC ${displayedScore.date}`;
        }
    });
}

async function persistDailyLeaderboardScore(score) {
    const client = await ensureSupabaseClient();
    const { error } = await client.rpc("submit_daily_challenge_score", {
        p_challenge_date: score.date,
        p_best_wave: Math.max(0, Math.floor(Number(score.bestWave) || 0)),
        p_health: Math.max(0, Math.min(100, Math.floor(Number(score.health) || 0))),
        p_completed_at: score.completedAt
    });
    if (error) throw error;

    const { data: savedScore, error: verificationError } = await client
        .from("daily_challenge_scores")
        .select("best_wave,health,completed_at")
        .eq("user_id", supabaseUser.id)
        .eq("challenge_date", score.date)
        .maybeSingle();
    if (verificationError) throw verificationError;
    const verified = savedScore && (
        Number(savedScore.best_wave) > score.bestWave ||
        (Number(savedScore.best_wave) === score.bestWave && Number(savedScore.health) >= score.health)
    );
    if (!verified) throw new Error("The leaderboard could not verify this score. Please try again.");
    try {
        await refreshPlayerTrophies(client);
    } catch (trophyError) {
        console.warn("Could not refresh the daily trophy collection:", trophyError.message || trophyError);
    }
}

async function submitDailyChallengeScore(score = pendingDailyScore) {
    if (!score || score.bestWave < 1 || score.submitted || score.submitting) return;
    if (!supabaseUser) {
        showProfile();
        setAccountNotice("SIGN IN OR CREATE AN ACCOUNT TO SUBMIT THIS DAILY CHALLENGE.");
        return;
    }
    score.submitting = true;
    updateDailyScoreSubmissionUI();
    try {
        await persistDailyLeaderboardScore(score);
        score.submitting = false;
        score.submitted = true;
        updateDailyScoreSubmissionUI();
    } catch (error) {
        console.error("Daily Challenge score submission failed:", error.message || error);
        score.submitting = false;
        updateDailyScoreSubmissionUI(
            `SUBMISSION FAILED: ${error.message || "CHECK YOUR CONNECTION AND TRY AGAIN."}`,
            "error"
        );
    }
}

async function submitEndlessRunScore() {
    if (!pendingEndlessScore || pendingEndlessScore.bestWave < 1) return;
    if (!supabaseUser) {
        showProfile();
        setAccountNotice("SIGN IN OR CREATE AN ACCOUNT TO SUBMIT THIS RUN. RETURN HERE AFTER SIGNING IN.");
        return;
    }

    const score = pendingEndlessScore;
    score.submitting = true;
    updateEndlessSubmissionUI();
    try {
        await persistEndlessLeaderboardScore(score);

        if (pendingEndlessScore !== score) return;
        saveEndlessRecord(score.mapId, score.bestWave);
        score.submitting = false;
        score.submitted = true;
        updateEndlessSubmissionUI();
    } catch (error) {
        console.error("Endless score submission failed:", error.message || error);
        if (pendingEndlessScore !== score) return;
        score.submitting = false;
        updateEndlessSubmissionUI(
            `SUBMISSION FAILED: ${error.message || "CHECK YOUR CONNECTION AND TRY AGAIN."}`,
            "error"
        );
    }
}

async function submitCompletedEndlessWaveScore() {
    const score = returnEndlessScoreSubmission;
    if (!score || score.bestWave < 1 || score.submitted || score.submitting) return;
    if (!supabaseUser) {
        updateCompletedEndlessSubmissionUIs(
            "Sign in to submit your most recently completed wave.",
            "error"
        );
        showProfile();
        setAccountNotice("SIGN IN OR CREATE AN ACCOUNT TO SUBMIT THIS ENDLESS SCORE.");
        return;
    }

    score.submitting = true;
    updateCompletedEndlessSubmissionUIs();
    try {
        await persistEndlessLeaderboardScore(score);
        if (returnEndlessScoreSubmission !== score) return;
        saveEndlessRecord(score.mapId, score.bestWave);
        score.submitting = false;
        score.submitted = true;
        updateCompletedEndlessSubmissionUIs();
    } catch (error) {
        console.error("Endless score submission failed:", error.message || error);
        if (returnEndlessScoreSubmission !== score) return;
        score.submitting = false;
        updateCompletedEndlessSubmissionUIs(
            `SUBMISSION FAILED: ${error.message || "CHECK YOUR CONNECTION AND TRY AGAIN."}`,
            "error"
        );
    }
}

function createRunId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, character => {
        const random = Math.floor(Math.random() * 16);
        return (character === "x" ? random : (random & 3) | 8).toString(16);
    });
}

function getSupabaseConfig() {
    const config = window.WD_SUPABASE_CONFIG || {};
    return {
        url: String(config.url || "").trim(),
        key: String(config.publishableKey || config.anonKey || "").trim()
    };
}

function setAccountNotice(message, isError = false, isSuccess = false) {
    const notice = document.getElementById("profileAccountNotice");
    if (!notice) return;
    notice.textContent = message;
    notice.classList.toggle("is-error", isError);
    notice.classList.toggle("is-success", isSuccess);
}

function normalizeAccountUsername(value) {
    return String(value || "").trim().toLowerCase();
}

function usernameLoginEmail(username) {
    return `${username}@accounts.wastelanddefense.invalid`;
}

function accountUsername(user = supabaseUser) {
    const metadataName = user?.user_metadata?.username;
    const emailName = user?.email?.split("@")[0]?.replace(/@accounts\.wastelanddefense\.invalid$/i, "");
    return String(metadataName || emailName || "PLAYER").toLowerCase();
}

async function ensureSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    const { url, key } = getSupabaseConfig();
    if (!url || !key) throw new Error("Supabase is not configured yet. Add the project URL and publishable key to supabase-config.js.");

    if (!window.supabase?.createClient) {
        if (!supabaseSdkPromise) {
            supabaseSdkPromise = new Promise((resolve, reject) => {
                const script = document.createElement("script");
                script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
                script.async = true;
                script.onload = () => window.supabase?.createClient
                    ? resolve()
                    : reject(new Error("Supabase's browser library did not load."));
                script.onerror = () => reject(new Error("Could not load Supabase. Check your internet connection or content blocker."));
                document.head.append(script);
            });
        }
        await supabaseSdkPromise;
    }

    if (supabaseClient) return supabaseClient;

    supabaseClient = window.supabase.createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    return supabaseClient;
}

function setLivePlayerCountOffline() {
    const badge = document.getElementById("livePlayerCount");
    const value = document.getElementById("livePlayerCountValue");
    const label = document.getElementById("livePlayerCountLabel");
    if (!badge || !value || !label) return;
    badge.dataset.status = "offline";
    value.textContent = "—";
    label.textContent = "COUNT OFFLINE";
}

function updateLivePlayerCount(status = "online") {
    const badge = document.getElementById("livePlayerCount");
    const value = document.getElementById("livePlayerCountValue");
    const label = document.getElementById("livePlayerCountLabel");
    if (!badge || !value || !label || !livePresenceChannel) return;

    const presence = livePresenceChannel.presenceState();
    const count = Object.values(presence).reduce((total, clients) =>
        total + (Array.isArray(clients) ? clients.length : 0), 0);
    badge.dataset.status = status;
    value.textContent = status === "online" ? String(count) : "—";
    label.textContent = status === "online" ? "PLAYERS ONLINE" : "COUNT OFFLINE";
}

function isPlayerOnline(userId) {
    if (!livePresenceChannel || !userId) return false;
    const presence = livePresenceChannel.presenceState();
    return Object.values(presence).some(clients =>
        Array.isArray(clients) && clients.some(client => client.user_id === userId)
    );
}

async function syncLivePlayerPresence() {
    if (!livePresenceChannel || !livePresenceSubscribed) return;

    const presence = { connected_at: new Date().toISOString() };
    if (supabaseUser?.id) {
        presence.user_id = supabaseUser.id;
        presence.username = accountUsername();
        presence.portrait_id = playerProfile.portrait || "mason";
    }

    const status = await livePresenceChannel.track(presence);
    if (status !== "ok") throw new Error("Realtime presence could not be tracked.");
}

function startLivePlayerCount(client) {
    if (livePresenceChannel || typeof client?.channel !== "function") return;

    const badge = document.getElementById("livePlayerCount");
    const value = document.getElementById("livePlayerCountValue");
    const label = document.getElementById("livePlayerCountLabel");
    if (!badge || !value || !label) return;

    badge.dataset.status = "connecting";
    value.textContent = "—";
    label.textContent = "CONNECTING";

    try {
        const channel = client.channel("wasteland-defense-live-players");
        livePresenceChannel = channel;
        channel.on("presence", { event: "sync" }, () => {
            updateLivePlayerCount();
            if (supabaseUser) {
                renderProfileFriends().catch(error => {
                    console.warn("Friend presence could not refresh:", error.message || error);
                });
            }
        });
        channel.subscribe(async status => {
            if (status === "SUBSCRIBED") {
                livePresenceSubscribed = true;
                badge.dataset.status = "online";
                label.textContent = "PLAYERS ONLINE";
                try {
                    await syncLivePlayerPresence();
                    updateLivePlayerCount();
                } catch (error) {
                    console.warn("Live player count could not publish presence:", error.message || error);
                    updateLivePlayerCount("offline");
                }
            } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
                livePresenceSubscribed = false;
                updateLivePlayerCount("offline");
            }
        });
    } catch (error) {
        livePresenceChannel = null;
        livePresenceSubscribed = false;
        badge.dataset.status = "offline";
        value.textContent = "—";
        label.textContent = "COUNT OFFLINE";
        console.warn("Live player count could not start:", error.message || error);
    }
}

function updateAccountUI(user = supabaseUser) {
    const connected = Boolean(user);
    const config = getSupabaseConfig();
    const accountFields = document.getElementById("profileAccountFields");
    const usernameLabel = document.getElementById("profileAccountUsername");
    const signOutButton = document.getElementById("accountSignOutButton");
    const accountPanel = document.querySelector(".profile-account-panel");
    const accountTitle = document.getElementById("profileAccountTitle");
    const state = document.getElementById("profileAccountState");
    const profileIntro = document.getElementById("profileIntro");
    const friendsTools = document.getElementById("profileFriendsTools");
    const storageStatus = document.getElementById("profileStorageStatus");

    accountFields.hidden = connected;
    usernameLabel.hidden = !connected;
    signOutButton.hidden = !connected;
    friendsTools.hidden = !connected;
    usernameLabel.textContent = connected ? `@${accountUsername(user)}` : "";
    accountPanel.classList.toggle("is-connected", connected);
    accountTitle.textContent = connected ? "ACCOUNT CONNECTED" : "SIGN IN OR CREATE ACCOUNT";
    profileIntro.textContent = connected
        ? "Your account keeps your username and progress synced across devices."
        : "Sign in or create an account to create a profile and sync your progress.";
    updateProfileIdentity();

    if (connected) {
        document.getElementById("accountUsernameInput").value = "";
        document.getElementById("accountPasswordInput").value = "";
        const notice = document.getElementById("profileAccountNotice");
        if (/^(USERNAME MUST BE|PASSWORD MUST BE)/.test(notice.textContent)) {
            setAccountNotice("");
        }
        state.textContent = "Your profile and progress sync across devices.";
        storageStatus.textContent = "ACCOUNT SYNC ACTIVE";
    } else if (!config.url || !config.key) {
        state.textContent = "The account service still needs its Supabase project URL and publishable key.";
        storageStatus.textContent = "LOCAL PROGRESS SAVED // SETUP REQUIRED";
    } else {
        state.textContent = "Sign in or create a username and password account to sync your save.";
        storageStatus.textContent = "LOCAL PROGRESS SAVED ON THIS DEVICE";
    }
}

async function submitAccount(action) {
    const username = normalizeAccountUsername(document.getElementById("accountUsernameInput").value);
    const password = document.getElementById("accountPasswordInput").value;
    const notice = document.getElementById("profileAccountNotice");
    const signInButton = document.getElementById("accountSignInButton");
    const createButton = document.getElementById("accountCreateButton");

    if (!/^[a-z0-9_]{3,18}$/.test(username)) {
        setAccountNotice("USERNAME MUST BE 3–18 CHARACTERS: LETTERS, NUMBERS, OR UNDERSCORES.", true);
        document.getElementById("accountUsernameInput").focus();
        return;
    }
    if (password.length < 8) {
        setAccountNotice("PASSWORD MUST BE AT LEAST 8 CHARACTERS.", true);
        document.getElementById("accountPasswordInput").focus();
        return;
    }

    signInButton.disabled = true;
    createButton.disabled = true;
    notice.textContent = action === "create" ? "CREATING YOUR ACCOUNT…" : "SIGNING IN…";
    notice.classList.remove("is-error", "is-success");

    try {
        const client = await ensureSupabaseClient();
        const email = usernameLoginEmail(username);
        const result = action === "create"
            ? await client.auth.signUp({
                email,
                password,
                options: { data: { username } }
            })
            : await client.auth.signInWithPassword({ email, password });

        if (result.error) throw result.error;
        if (action === "create" && !result.data.session) {
            setAccountNotice("ACCOUNT CREATED. TURN OFF EMAIL CONFIRMATION IN SUPABASE AUTH SETTINGS, THEN SIGN IN.", true);
            return;
        }

        document.getElementById("accountPasswordInput").value = "";
        setAccountNotice(action === "create" ? "ACCOUNT CREATED. LOADING YOUR SAVE…" : "SIGNED IN. LOADING YOUR SAVE…", false, true);
        if (result.data.session) {
            newAccountCreationPending = action === "create";
            await handleSupabaseSession(result.data.session);
        }
    } catch (error) {
        console.error("Supabase account request failed:", error.message || error);
        const message = error.code === "23505"
            ? "THAT USERNAME IS ALREADY TAKEN."
            : error.message || "ACCOUNT REQUEST FAILED. CHECK YOUR CONNECTION AND TRY AGAIN.";
        setAccountNotice(message, true);
    } finally {
        signInButton.disabled = false;
        createButton.disabled = false;
    }
}

function getLocalUnlockedSurvivors() {
    const ordered = unlockedSurvivorOrder
        .filter(id => survivorDetails[id]?.unlocked === true);
    const missing = Object.entries(survivorDetails)
        .filter(([id, survivor]) => survivor.unlocked === true && !ordered.includes(id))
        .map(([id]) => id);
    return [...ordered, ...missing];
}

function persistUnlockedSurvivors() {
    try {
        localStorage.setItem(unlockedSurvivorsKey, JSON.stringify(getLocalUnlockedSurvivors()));
    } catch {
        // Local storage is a fallback; keep the current session playable.
    }
}

function storeEndlessRecords(records) {
    try {
        localStorage.setItem(endlessRecordKey, JSON.stringify(records));
    } catch {
        // Keep the save in memory when local storage is unavailable.
    }
}

const playerProgressSelect = "coins,unlocked_survivors,completed_campaign_levels,legacy_imported_at,loadouts";

async function fetchPlayerProgress(client, userId) {
    let response = await client
        .from("player_progress")
        .select(playerProgressSelect)
        .eq("user_id", userId)
        .single();

    // Keep older deployments usable until the loadouts migration is run.
    if (response.error?.code === "42703") {
        response = await client
            .from("player_progress")
            .select("coins,unlocked_survivors,completed_campaign_levels,legacy_imported_at")
            .eq("user_id", userId)
            .single();
    }
    return response;
}

async function importLocalProgress(client, progress, freshAccount = false) {
    if (progress.legacy_imported_at) return progress;
    let previouslyLinkedUser = "";
    try { previouslyLinkedUser = localStorage.getItem(linkedCloudAccountKey) || ""; } catch { /* no local account link */ }
    const isSwitchingAccounts = previouslyLinkedUser && previouslyLinkedUser !== supabaseUser.id;
    const useCloudDefaults = freshAccount || isSwitchingAccounts;
    const { error } = await client.rpc("import_legacy_progress", {
        p_coins: useCloudDefaults ? 0 : playerCoinBalance,
        p_unlocked_survivors: useCloudDefaults
            ? Array.from(builtinSurvivorIds)
            : getLocalUnlockedSurvivors(),
        p_completed_campaign_levels: useCloudDefaults ? [] : playerProfile.campaignLevels,
        p_endless_scores: {},
        p_callsign: useCloudDefaults ? "DEFENDER" : accountUsername(),
        p_portrait_id: useCloudDefaults ? "mason" : (playerProfile.portrait || "mason")
    });
    if (error) throw error;
    const { data, error: reloadError } = await fetchPlayerProgress(client, supabaseUser.id);
    if (reloadError) throw reloadError;
    return data;
}

async function handleSupabaseSession(session) {
    const user = session?.user || null;
    const isSameUser = user?.id && user.id === supabaseUser?.id;
    supabaseUser = user;
    if (!user) resetSignedOutState();
    updateAccountUI(user);
    syncLivePlayerPresence().catch(error => {
        console.warn("Live player identity could not sync:", error.message || error);
    });
    if (!user) {
        cloudLoadGeneration++;
        renderLeaderboard();
        return;
    }

    if (isSameUser) return;
    const generation = ++cloudLoadGeneration;
    setAccountNotice("SYNCING PROFILE AND GAME PROGRESS…");
    try {
        await loadRemotePlayerData(user, generation);
        if (generation === cloudLoadGeneration) {
            setAccountNotice(`SAVE SYNCED FOR @${accountUsername(user)}.`, false, true);
        }
    } catch (error) {
        console.error("Could not load Supabase player data:", error.message || error);
        if (generation === cloudLoadGeneration) {
            setAccountNotice(`ACCOUNT CONNECTED, BUT SAVE SYNC FAILED: ${error.message || "CHECK THE DATABASE SETUP."}`, true);
        }
    }
}

async function loadRemotePlayerData(user, generation) {
    const client = await ensureSupabaseClient();
    let [{ data: profile, error: profileError }, progressResponse] = await Promise.all([
        client.from("player_profiles").select("id,username,portrait_id").eq("id", user.id).single(),
        fetchPlayerProgress(client, user.id)
    ]);
    let { data: progress, error: progressError } = progressResponse;
    if (profileError) throw profileError;
    if (progressError) throw progressError;

    if (!progress.legacy_imported_at) {
        const freshAccount = newAccountCreationPending && supabaseUser?.id === user.id;
        newAccountCreationPending = false;
        progress = await importLocalProgress(client, progress, freshAccount);
        const profileResponse = await client.from("player_profiles")
            .select("id,username,portrait_id").eq("id", user.id).single();
        if (profileResponse.error) throw profileResponse.error;
        profile = profileResponse.data;
    }
    if (generation !== cloudLoadGeneration) return;

    playerProfile = {
        portrait: profilePortraitSources[profile.portrait_id] ? profile.portrait_id : "mason",
        campaignLevels: (progress.completed_campaign_levels || []).map(Number).filter(level => level >= 1 && level <= 6)
    };
    persistPlayerProfile();

    const unlockedList = Array.isArray(progress.unlocked_survivors)
        ? progress.unlocked_survivors.filter(id => survivorDetails[id])
        : [];
    unlockedSurvivorOrder = [...unlockedList];
    const unlocked = new Set(unlockedList);
    Object.entries(survivorDetails).forEach(([id, survivor]) => {
        survivor.unlocked = survivor.mysteryBoxOnly
            ? unlocked.has(id)
            : survivor.custom === true || unlocked.has(id);
    });
    persistUnlockedSurvivors();
    // Hydrate account presets after the roster is marked unlocked so saved
    // squads keep every recruit instead of being filtered during sign-in.
    if (Array.isArray(progress.loadouts)) {
        writeSavedLoadouts(normalizeSavedLoadouts(progress.loadouts));
    }
    renderMenuCrewRoster();
    if (!getUnlockedProfilePortraits().some(([id]) => id === playerProfile.portrait)) {
        playerProfile.portrait = getUnlockedProfilePortraits()[0]?.[0] || "mason";
        persistPlayerProfile();
    }

    playerCoinBalance = Math.max(0, Number(progress.coins) || 0);
    persistCoinBalance();
    const { data: scores, error: scoresError } = await client
        .from("endless_scores")
        .select("map_id,best_wave")
        .eq("user_id", user.id);
    if (scoresError) throw scoresError;
    let linkedUserId = "";
    try { linkedUserId = localStorage.getItem(linkedCloudAccountKey) || ""; } catch { /* localStorage remains optional */ }
    const records = !linkedUserId || linkedUserId === user.id
        ? { ...readEndlessRecords() }
        : {};
    (scores || []).forEach(score => {
        records[score.map_id] = Math.max(Number(records[score.map_id]) || 0, Number(score.best_wave) || 0);
    });
    storeEndlessRecords(records);
    try { localStorage.setItem(linkedCloudAccountKey, user.id); } catch { /* localStorage remains an optional cache */ }

    await refreshPlayerTrophies(client);
    if (generation !== cloudLoadGeneration) return;

    updateProfileIdentity();
    renderProfilePortraitOptions();
    syncLivePlayerPresence().catch(error => {
        console.warn("Live player portrait could not sync:", error.message || error);
    });
    updateCoinBalanceDisplay();
    updateEndlessRecordDisplays();
    updateProfileStats();
    await renderProfileFriends();
    renderLeaderboard();
}

async function syncRemoteProfile() {
    if (!supabaseClient || !supabaseUser) return null;
    try {
        const { error } = await supabaseClient.from("player_profiles").update({
            portrait_id: playerProfile.portrait,
            updated_at: new Date().toISOString()
        }).eq("id", supabaseUser.id);
        if (error) {
            console.warn("Player profile could not sync to Supabase:", error.message);
            return error;
        }
        return null;
    } catch (error) {
        console.warn("Player profile could not reach Supabase:", error.message || error);
        return error;
    }
}

// Keep a lightweight account-level count of deployments so friend dossiers
// can show the six survivors a player actually uses most often. This is
// intentionally fire-and-forget: a telemetry/save hiccup must never block
// deployment or interrupt a run.
function recordCloudSurvivorUsage(survivorId) {
    if (!supabaseClient || !supabaseUser || !survivorId) return;
    supabaseClient.rpc("record_survivor_deployment", {
        p_survivor_id: survivorId
    }).then(({ error }) => {
        if (error) console.warn("Survivor usage could not sync:", error.message || error);
    }).catch(error => {
        console.warn("Survivor usage could not reach Supabase:", error.message || error);
    });
}

async function loadFriendProgress(client, friendId) {
    let response = await client
        .from("player_progress")
        .select("unlocked_survivors,survivor_usage")
        .eq("user_id", friendId)
        .maybeSingle();

    // Older projects may not have applied survivor_usage.sql yet. Keep the
    // dossier readable in that case and fall back to deterministic roster
    // ordering until the migration is run.
    if (response.error?.code === "42703") {
        response = await client
            .from("player_progress")
            .select("unlocked_survivors")
            .eq("user_id", friendId)
            .maybeSingle();
    }
    return response;
}

async function initializeSupabaseAccount() {
    updateAccountUI(null);
    try {
        const client = await ensureSupabaseClient();
        startLivePlayerCount(client);
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        await handleSupabaseSession(data.session);
        client.auth.onAuthStateChange((_event, session) => {
            window.setTimeout(() => { handleSupabaseSession(session); }, 0);
        });
    } catch (error) {
        console.error("Supabase initialization failed:", error.message || error);
        setLivePlayerCountOffline();
        setAccountNotice(error.message || "SUPABASE COULD NOT START.", true);
    }
}

async function signOutOfAccount() {
    if (!supabaseClient) return;
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            setAccountNotice(error.message || "SIGN OUT FAILED.", true);
            return;
        }
        setAccountNotice("SIGNED OUT. YOUR LAST SYNCED SAVE IS STILL ON THIS DEVICE.", false, true);
    } catch (error) {
        setAccountNotice(error.message || "SIGN OUT FAILED.", true);
    }
}

async function sendFriendRequest(event) {
    event.preventDefault();
    const username = normalizeAccountUsername(document.getElementById("friendUsernameInput").value);
    if (!/^[a-z0-9_]{3,18}$/.test(username)) {
        setAccountNotice("ENTER A VALID USERNAME.", true);
        return;
    }
    try {
        const { data: target, error: lookupError } = await supabaseClient
            .from("player_profiles").select("id,username").eq("username", username).maybeSingle();
        if (lookupError) throw lookupError;
        if (!target) throw new Error("NO PLAYER FOUND WITH THAT USERNAME.");
        if (target.id === supabaseUser.id) throw new Error("YOU CANNOT ADD YOUR OWN ACCOUNT.");
        const { error } = await supabaseClient.from("player_friendships").insert({
            requester_id: supabaseUser.id,
            addressee_id: target.id,
            status: "pending"
        });
        if (error) {
            if (error.code === "23505") throw new Error("A FRIEND LINK ALREADY EXISTS.");
            throw error;
        }
        document.getElementById("friendUsernameInput").value = "";
        setAccountNotice(`FRIEND REQUEST SENT TO @${target.username}.`, false, true);
        await renderProfileFriends();
    } catch (error) {
        setAccountNotice(error.message || "FRIEND REQUEST FAILED.", true);
    }
}

async function renderProfileFriends() {
    const container = document.getElementById("profileFriendsList");
    if (!container) return;
    const renderGeneration = ++profileFriendsRenderGeneration;
    const userId = supabaseUser?.id;
    container.replaceChildren();
    if (!supabaseClient || !userId) return;
    const { data: relations, error } = await supabaseClient
        .from("player_friendships")
        .select("requester_id,addressee_id,status")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    if (renderGeneration !== profileFriendsRenderGeneration || supabaseUser?.id !== userId) return;
    if (error) {
        const message = document.createElement("p");
        message.className = "profile-friends-empty";
        message.textContent = "Could not load friends. Check the Supabase schema.";
        container.append(message);
        return;
    }
    const relevant = (relations || []).filter(link => link.status !== "declined");
    const ids = [...new Set(relevant.map(link => link.requester_id === userId ? link.addressee_id : link.requester_id))];
    const profilesResponse = ids.length
        ? await supabaseClient.from("player_profiles").select("id,username,portrait_id").in("id", ids)
        : { data: [], error: null };
    if (renderGeneration !== profileFriendsRenderGeneration || supabaseUser?.id !== userId) return;
    if (profilesResponse.error) return;
    const profiles = new Map((profilesResponse.data || []).map(profile => [profile.id, profile]));

    if (!relevant.length) {
        const empty = document.createElement("p");
        empty.className = "profile-friends-empty";
        empty.textContent = "No friends connected yet. Send a request by username to compare Endless scores.";
        container.append(empty);
        return;
    }

    relevant.forEach(link => {
        const isIncoming = link.addressee_id === userId && link.status === "pending";
        const friendId = link.requester_id === userId ? link.addressee_id : link.requester_id;
        const profile = profiles.get(friendId);
        if (!profile) return;
        const isOnline = isPlayerOnline(friendId);
        const row = document.createElement("div");
        row.className = "profile-friend-row";
        row.dataset.friendId = friendId;
        row.classList.toggle("is-online", isOnline);

        const identity = document.createElement("div");
        identity.className = "profile-friend-identity";
        const avatar = document.createElement("img");
        avatar.className = "profile-friend-avatar";
        avatar.src = profilePortraitSources[profile.portrait_id] || profilePortraitSources.mason;
        avatar.dataset.portraitId = profilePortraitSources[profile.portrait_id]
            ? profile.portrait_id
            : "mason";
        avatar.alt = `${profile.username}'s profile portrait`;

        const copy = document.createElement("div");
        copy.className = "profile-friend-copy";
        const username = document.createElement("strong");
        username.textContent = `@${profile.username}`;
        const details = document.createElement("small");
        details.className = `profile-friend-status ${isOnline ? "is-online" : "is-offline"}`;
        const statusDot = document.createElement("span");
        statusDot.className = "profile-friend-status-dot";
        statusDot.setAttribute("aria-hidden", "true");
        const statusText = link.status === "accepted"
            ? (isOnline ? "ONLINE" : "OFFLINE")
            : isIncoming ? "REQUEST IN" : "REQUEST SENT";
        details.append(statusDot, document.createTextNode(statusText));
        copy.append(username, details);
        identity.append(avatar, copy);
        row.append(identity);
        if (isIncoming) {
            const actions = document.createElement("div");
            actions.className = "profile-friend-actions";
            ["accepted", "declined"].forEach(status => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "profile-friend-action";
                button.dataset.friendAction = status;
                button.dataset.friendRequester = link.requester_id;
                button.dataset.friendAddressee = link.addressee_id;
                button.textContent = status === "accepted" ? "ACCEPT" : "IGNORE";
                actions.append(button);
            });
            row.append(actions);
        }
        container.append(row);
    });
}

async function handleFriendListClick(event) {
    const friendRow = event.target.closest(".profile-friend-row[data-friend-id]");
    if (friendRow && !event.target.closest("button")) {
        await showFriendProfile(friendRow.dataset.friendId);
        return;
    }
    const button = event.target.closest("button[data-friend-action]");
    if (!button || !supabaseClient || !supabaseUser) return;
    try {
        const { error } = await supabaseClient.from("player_friendships").update({
            status: button.dataset.friendAction,
            updated_at: new Date().toISOString()
        }).eq("requester_id", button.dataset.friendRequester)
          .eq("addressee_id", button.dataset.friendAddressee)
          .eq("status", "pending");
        if (error) throw error;
        await renderProfileFriends();
    } catch (error) {
        setAccountNotice(error.message || "COULD NOT UPDATE FRIEND REQUEST.", true);
        return;
    }
}

function renderFriendTrophies(container, records) {
    container.replaceChildren();
    [1, 2, 3].forEach(place => {
        const item = document.createElement("div");
        item.className = `profile-trophy-count trophy-place-${place}`;
        item.append(createTrophyIcon(place));
        const amount = document.createElement("strong");
        amount.textContent = `×${records.filter(record => Number(record.place) === place).length}`;
        const label = document.createElement("small");
        label.textContent = trophyPlaceNames[place];
        item.append(amount, label);
        container.append(item);
    });
}

async function showFriendProfile(friendId) {
    if (!supabaseClient || !supabaseUser) return;
    const screen = document.getElementById("friendProfileScreen");
    try {
        const [profileResponse, progressResponse, scoresResponse, trophiesResponse, dailyTrophiesResponse] = await Promise.all([
            supabaseClient.from("player_profiles").select("username,portrait_id").eq("id", friendId).single(),
            loadFriendProgress(supabaseClient, friendId),
            supabaseClient.from("endless_scores").select("best_wave").eq("user_id", friendId),
            supabaseClient.from("player_trophies").select("place").eq("user_id", friendId),
            supabaseClient.from("daily_challenge_trophies").select("place").eq("user_id", friendId)
        ]);
        if (profileResponse.error) throw profileResponse.error;
        if (progressResponse.error) throw progressResponse.error;
        const profile = profileResponse.data;
        const unlockedList = Array.isArray(progressResponse.data?.unlocked_survivors)
            ? progressResponse.data.unlocked_survivors
            : [];
        const unlocked = new Set(unlockedList);
        const usage = progressResponse.data?.survivor_usage && typeof progressResponse.data.survivor_usage === "object"
            ? progressResponse.data.survivor_usage
            : {};
        const unlockedIds = Object.entries(survivorDetails)
            .filter(([id, survivor]) => !survivor.mysteryBoxOnly && unlocked.has(id))
            .map(([id]) => id);
        const rosterIds = unlockedIds
            .map((id, index) => ({
                id,
                index,
                uses: Math.max(0, Number(usage[id]) || 0)
            }))
            .sort((a, b) => b.uses - a.uses || a.index - b.index)
            .slice(0, 6)
            .map(entry => entry.id);
        const roster = document.getElementById("friendProfileRoster");
        roster.replaceChildren();
        rosterIds.forEach(id => {
            const survivor = survivorDetails[id];
            const card = document.createElement("div");
            card.className = "friend-roster-card";
            const image = document.createElement("img");
            image.src = survivor.portraitData || profilePortraitSources[id] || profilePortraitSources.mason;
            image.alt = "";
            const name = document.createElement("strong");
            name.textContent = survivor.name;
            const role = document.createElement("small");
            role.textContent = survivor.role;
            card.append(image, name, role);
            roster.append(card);
        });
        document.getElementById("friendProfileUsername").textContent = `@${profile.username}`;
        document.getElementById("friendProfileSubtitle").textContent = `BEST ENDLESS WAVE · ${Math.max(0, ...(scoresResponse.data || []).map(score => Number(score.best_wave) || 0))}`;
        document.getElementById("friendProfileRosterCount").textContent = unlockedIds.length > 6
            ? `${unlockedIds.length} UNLOCKED · TOP 6 MOST USED`
            : `${unlockedIds.length} SURVIVORS UNLOCKED`;
        document.getElementById("friendProfilePortrait").src = profilePortraitSources[profile.portrait_id] || profilePortraitSources.mason;
        renderFriendTrophies(document.getElementById("friendProfileEndlessTrophies"), trophiesResponse.data || []);
        renderFriendTrophies(document.getElementById("friendProfileDailyTrophies"), dailyTrophiesResponse.data || []);
        screen.style.display = "flex";
    } catch (error) {
        setAccountNotice(error.message || "COULD NOT LOAD FRIEND PROFILE.", true);
    }
}

function appendLeaderboardEmpty(titleText, descriptionText) {
    const row = document.createElement("tr");
    row.className = "leaderboard-empty-row";
    const cell = document.createElement("td");
    cell.colSpan = activeLeaderboardMode === "daily" ? 5 : 4;
    const empty = document.createElement("div");
    empty.className = "leaderboard-empty-state";
    const mark = document.createElement("span");
    mark.className = "leaderboard-empty-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = activeLeaderboardScope === "global" ? "#" : "◇";
    const title = document.createElement("strong");
    title.textContent = titleText;
    const description = document.createElement("span");
    description.textContent = descriptionText;
    empty.append(mark, title, description);
    cell.append(empty);
    row.append(cell);
    document.getElementById("leaderboardRows").append(row);
}

function appendCloudLeaderboardRow(score, profile, rank, isSelf = false) {
    const row = document.createElement("tr");
    row.className = "leaderboard-player-row";
    if (isSelf) row.classList.add("is-you");
    const rankCell = document.createElement("td");
    rankCell.className = "leaderboard-rank";
    const rankContent = document.createElement("span");
    rankContent.className = "leaderboard-rank-content";
    if (activeLeaderboardScope === "global" && rank <= 3) rankContent.append(createTrophyIcon(rank));
    const rankNumber = document.createElement("span");
    rankNumber.textContent = String(rank);
    rankContent.append(rankNumber);
    rankCell.append(rankContent);
    const playerCell = document.createElement("td");
    const player = document.createElement("div");
    player.className = "leaderboard-player-name";
    const avatar = document.createElement("img");
    avatar.className = "leaderboard-player-avatar";
    avatar.src = profilePortraitSources[profile.portrait_id] || profilePortraitSources.mason;
    avatar.dataset.portraitId = profilePortraitSources[profile.portrait_id]
        ? profile.portrait_id
        : "mason";
    avatar.alt = `${profile.username}'s profile portrait`;
    const nameCopy = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = profile.username;
    const username = document.createElement("small");
    username.textContent = isSelf ? `@${profile.username} · YOU` : `@${profile.username}`;
    nameCopy.append(name, username);
    player.append(avatar, nameCopy);
    playerCell.append(player);
    const scoreCell = document.createElement("td");
    scoreCell.className = "leaderboard-score";
    scoreCell.textContent = String(score.best_wave);
    const recordCell = document.createElement("td");
    const recordTag = document.createElement("span");
    recordTag.className = "leaderboard-record-tag";
    recordTag.textContent = new Date(score.updated_at).toLocaleDateString();
    recordCell.append(recordTag);
    row.append(rankCell, playerCell, scoreCell, recordCell);
    document.getElementById("leaderboardRows").append(row);
}

async function loadCloudLeaderboard() {
    const generation = ++leaderboardLoadGeneration;
    const rows = document.getElementById("leaderboardRows");
    const notice = document.getElementById("leaderboardNotice");
    rows.replaceChildren();
    notice.textContent = "CONNECTING TO THE WASTELAND RECORDS…";
    try {
        const client = await ensureSupabaseClient();
        let friendIds = null;
        if (activeLeaderboardScope === "friends") {
            if (!supabaseUser) {
                notice.textContent = "SIGN IN TO SEE YOUR FRIENDS' SCORES.";
                appendLeaderboardEmpty("SIGN IN TO OPEN YOUR FRIENDS BOARD", "Create or sign in to a player account, then add friends by username from your profile.");
                return;
            }
            const { data: links, error: linkError } = await client.from("player_friendships")
                .select("requester_id,addressee_id")
                .eq("status", "accepted")
                .or(`requester_id.eq.${supabaseUser.id},addressee_id.eq.${supabaseUser.id}`);
            if (linkError) throw linkError;
            friendIds = [...new Set([supabaseUser.id, ...(links || []).map(link =>
                link.requester_id === supabaseUser.id ? link.addressee_id : link.requester_id
            )])];
        }

        let query = client.from("endless_scores")
            .select("user_id,map_id,best_wave,updated_at")
            .eq("map_id", activeLeaderboardMap)
            .order("best_wave", { ascending: false })
            .order("updated_at", { ascending: true })
            .order("user_id", { ascending: true })
            .limit(50);
        if (friendIds) query = query.in("user_id", friendIds);
        const { data: scores, error: scoreError } = await query;
        if (scoreError) throw scoreError;
        if (generation !== leaderboardLoadGeneration) return;
        if (!scores?.length) {
            notice.textContent = activeLeaderboardScope === "global"
                ? "GLOBAL ENDLESS RANKINGS · THIS MAP HAS NO SCORES YET."
                : "FRIENDS BOARD · ADD FRIENDS BY USERNAME FROM YOUR PROFILE.";
            appendLeaderboardEmpty(
                activeLeaderboardScope === "global" ? "NO SCORES FOR THIS MAP YET" : "NO FRIEND SCORES YET",
                activeLeaderboardScope === "global"
                    ? "Complete an Endless run to add the first record."
                    : "Your accepted friends' best Endless runs will appear here."
            );
            return;
        }
        const ids = [...new Set(scores.map(score => score.user_id))];
        const { data: profiles, error: profileError } = await client.from("player_profiles")
            .select("id,username,portrait_id").in("id", ids);
        if (profileError) throw profileError;
        if (generation !== leaderboardLoadGeneration) return;
        const profileById = new Map((profiles || []).map(profile => [profile.id, profile]));
        let rank = 0;
        scores.forEach(score => {
            const profile = profileById.get(score.user_id);
            if (!profile) return;
            rank++;
            appendCloudLeaderboardRow(score, profile, rank, score.user_id === supabaseUser?.id);
        });
        notice.textContent = activeLeaderboardScope === "global"
            ? `GLOBAL ENDLESS RANKING · TOP ${rank} FOR THIS MAP.`
            : `FRIENDS BOARD · ${rank} PLAYER${rank === 1 ? "" : "S"} ON THIS MAP.`;
    } catch (error) {
        console.error("Could not load Endless leaderboard:", error.message || error);
        if (generation !== leaderboardLoadGeneration) return;
        notice.textContent = `LEADERBOARD UNAVAILABLE: ${error.message || "CHECK THE DATABASE SETUP."}`;
        appendLeaderboardEmpty("RECORDS COULD NOT LOAD", "Apply the Supabase schema and check that the project is online.");
    }
}

function appendDailyLeaderboardRow(score, profile, rank) {
    const row = document.createElement("tr");
    row.className = "leaderboard-player-row";
    if (score.user_id === supabaseUser?.id) row.classList.add("is-you");

    const rankCell = document.createElement("td");
    rankCell.className = "leaderboard-rank";
    const rankContent = document.createElement("span");
    rankContent.className = "leaderboard-rank-content";
    if (rank <= 3) rankContent.append(createTrophyIcon(rank));
    const rankNumber = document.createElement("span");
    rankNumber.textContent = String(rank);
    rankContent.append(rankNumber);
    rankCell.append(rankContent);

    const playerCell = document.createElement("td");
    const player = document.createElement("div");
    player.className = "leaderboard-player-name";
    const avatar = document.createElement("img");
    avatar.className = "leaderboard-player-avatar";
    avatar.src = profilePortraitSources[profile.portrait_id] || profilePortraitSources.mason;
    avatar.dataset.portraitId = profilePortraitSources[profile.portrait_id] ? profile.portrait_id : "mason";
    avatar.alt = `${profile.username}'s profile portrait`;
    const nameCopy = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = profile.username;
    const username = document.createElement("small");
    username.textContent = score.user_id === supabaseUser?.id ? `@${profile.username} · YOU` : `@${profile.username}`;
    nameCopy.append(name, username);
    player.append(avatar, nameCopy);
    playerCell.append(player);

    const waveCell = document.createElement("td");
    waveCell.className = "leaderboard-score";
    waveCell.textContent = String(score.best_wave);
    const healthCell = document.createElement("td");
    healthCell.className = "leaderboard-score leaderboard-health-score";
    healthCell.textContent = `${score.health} HP`;
    const completedCell = document.createElement("td");
    const completed = document.createElement("span");
    completed.className = "leaderboard-record-tag";
    completed.textContent = new Date(score.completed_at).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short"
    });
    completedCell.append(completed);
    row.append(rankCell, playerCell, waveCell, healthCell, completedCell);
    document.getElementById("leaderboardRows").append(row);
}

async function loadDailyLeaderboard() {
    const generation = ++leaderboardLoadGeneration;
    const rows = document.getElementById("leaderboardRows");
    const notice = document.getElementById("leaderboardNotice");
    const date = activeDailyLeaderboardDate || getDailyChallengeDate();
    rows.replaceChildren();
    notice.textContent = "CONNECTING TO TODAY'S CHALLENGE RECORDS…";
    try {
        const client = await ensureSupabaseClient();
        const { data: scores, error: scoreError } = await client.from("daily_challenge_scores")
            .select("user_id,best_wave,health,completed_at")
            .eq("challenge_date", date)
            .order("best_wave", { ascending: false })
            .order("health", { ascending: false })
            .order("completed_at", { ascending: true })
            .order("user_id", { ascending: true })
            .limit(50);
        if (scoreError) throw scoreError;
        if (generation !== leaderboardLoadGeneration) return;
        if (!scores?.length) {
            notice.textContent = `DAILY CHALLENGE · ${date} · NO SCORES SUBMITTED YET.`;
            document.getElementById("leaderboardPersonalBest").textContent = supabaseUser
                ? "YOUR DAILY SCORE: NOT SUBMITTED"
                : "SIGN IN TO SUBMIT A DAILY SCORE";
            appendLeaderboardEmpty("NO DAILY SCORES YET", "Complete at least one wave and submit today's challenge run to claim the first spot.");
            return;
        }
        const ids = [...new Set(scores.map(score => score.user_id))];
        const { data: profiles, error: profileError } = await client.from("player_profiles")
            .select("id,username,portrait_id").in("id", ids);
        if (profileError) throw profileError;
        if (generation !== leaderboardLoadGeneration) return;
        const profileById = new Map((profiles || []).map(profile => [profile.id, profile]));
        let rank = 0;
        let personalScore = null;
        scores.forEach(score => {
            const profile = profileById.get(score.user_id);
            if (!profile) return;
            rank++;
            appendDailyLeaderboardRow(score, profile, rank);
            if (score.user_id === supabaseUser?.id) personalScore = score;
        });
        document.getElementById("leaderboardPersonalBest").textContent = personalScore
            ? `YOUR SCORE: WAVE ${personalScore.best_wave} · ${personalScore.health} HP`
            : supabaseUser ? "YOUR DAILY SCORE: NOT SUBMITTED" : "SIGN IN TO SUBMIT A DAILY SCORE";
        notice.textContent = `DAILY CHALLENGE · ${date} · ${rank} PLAYER${rank === 1 ? "" : "S"} RANKED.`;
    } catch (error) {
        console.error("Could not load Daily Challenge leaderboard:", error.message || error);
        if (generation !== leaderboardLoadGeneration) return;
        notice.textContent = `LEADERBOARD UNAVAILABLE: ${error.message || "CHECK THE DATABASE SETUP."}`;
        document.getElementById("leaderboardPersonalBest").textContent = "DAILY SCORE UNAVAILABLE";
        appendLeaderboardEmpty("DAILY BOARD COULD NOT LOAD", "Apply the daily challenge Supabase migration and confirm the project is online.");
    }
}

function renderLeaderboard() {
    const rows = document.getElementById("leaderboardRows");
    const records = readEndlessRecords();
    const bestWave = Math.max(0, Number(records[activeLeaderboardMap]) || 0);
    const mapName = leaderboardMapNames[activeLeaderboardMap];
    const notice = document.getElementById("leaderboardNotice");
    const scopeLabel = document.getElementById("leaderboardScopeLabel");

    const isDaily = activeLeaderboardMode === "daily";
    const dailyDate = activeDailyLeaderboardDate || getDailyChallengeDate();
    document.getElementById("leaderboardTitle").textContent = isDaily ? "DAILY CHALLENGE" : "LEADERBOARDS";
    document.querySelector(".leaderboard-heading-copy .menu-eyebrow").textContent = isDaily
        ? "DAILY // SCOREBOARD"
        : "ENDLESS // SCOREBOARD";
    document.querySelector(".leaderboard-heading-copy .menu-description").textContent = isDaily
        ? "One shared challenge. Ranked by waves cleared, health left, then completion time."
        : "Hold out longer, climb the ranks, and earn your bragging rights.";
    document.getElementById("leaderboardModeTag").textContent = isDaily ? "DAILY CHALLENGE" : "ENDLESS MODE";
    document.getElementById("leaderboardOverline").textContent = isDaily ? "UTC CHALLENGE DATE" : "SELECT A MAP";
    document.getElementById("leaderboardMapTitle").textContent = isDaily
        ? new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${dailyDate}T12:00:00Z`))
        : mapName;
    document.getElementById("leaderboardPersonalBest").textContent = isDaily
        ? (supabaseUser ? "YOUR DAILY SCORE: LOADING" : "SIGN IN TO SUBMIT A DAILY SCORE")
        : `YOUR BEST: ${bestWave} ${bestWave === 1 ? "WAVE" : "WAVES"}`;
    document.getElementById("leaderboardScopeLabel").textContent = isDaily ? "GLOBAL DAILY RANKING" : "GLOBAL RANKING";
    document.querySelector(".leaderboard-scope-tabs").hidden = isDaily;
    document.querySelector(".leaderboard-map-tabs").hidden = isDaily;
    document.getElementById("dailyLeaderboardDateControl").hidden = !isDaily;
    const dateControl = document.getElementById("dailyLeaderboardDate");
    dateControl.max = getDailyChallengeDate();
    dateControl.value = dailyDate;
    document.getElementById("leaderboardMyRunsButton").hidden = isDaily;
    document.getElementById("leaderboardHealthHeader").hidden = !isDaily;
    document.getElementById("leaderboardFooter").textContent = isDaily
        ? "WASTELAND DEFENSE // DAILY RECORDS"
        : "WASTELAND DEFENSE // ENDLESS RECORDS";
    document.querySelectorAll(".leaderboard-mode-tab").forEach(button => {
        const active = button.id === (isDaily ? "dailyLeaderboardTab" : "endlessLeaderboardTab");
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", String(active));
    });

    document.querySelectorAll("[data-leaderboard-map]").forEach(button => {
        const isActive = Number(button.dataset.leaderboardMap) === activeLeaderboardMap;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", String(isActive));
    });

    document.querySelectorAll("[data-leaderboard-scope]").forEach(button => {
        const isActive = button.dataset.leaderboardScope === activeLeaderboardScope;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", String(isActive));
    });

    const myRunsButton = document.getElementById("leaderboardMyRunsButton");
    const isMyRuns = activeLeaderboardScope === "runs";
    myRunsButton.classList.toggle("is-active", isMyRuns);
    myRunsButton.setAttribute("aria-pressed", String(isMyRuns));

    if (isDaily) {
        scopeLabel.textContent = "GLOBAL DAILY RANKING";
        notice.textContent = "DAILY SCORES RANK BY WAVES, HEALTH, THEN COMPLETION TIME.";
    } else if (activeLeaderboardScope === "global") {
        scopeLabel.textContent = "GLOBAL RANKING";
        notice.textContent = "GLOBAL SCORES NEED AN ONLINE CONNECTION. YOUR LOCAL BESTS ARE AVAILABLE UNDER MY RUNS.";
    } else if (activeLeaderboardScope === "friends") {
        scopeLabel.textContent = "FRIENDS BOARD";
        notice.textContent = "FRIEND SCORES WILL APPEAR HERE WHEN PLAYER ACCOUNTS AND FRIEND LINKS ARE CONNECTED.";
    } else {
        scopeLabel.textContent = "YOUR PERSONAL BEST";
        notice.textContent = "ENDLESS RECORDS ARE SAVED ON THIS DEVICE.";
    }

    rows.replaceChildren();

    if (isDaily) {
        loadDailyLeaderboard();
        return;
    }

    if (activeLeaderboardScope !== "runs") {
        loadCloudLeaderboard();
        return;
    }

    if (bestWave === 0) {
        const row = document.createElement("tr");
        row.className = "leaderboard-empty-row";
        const cell = document.createElement("td");
        cell.colSpan = 4;

        const empty = document.createElement("div");
        empty.className = "leaderboard-empty-state";
        const mark = document.createElement("span");
        mark.className = "leaderboard-empty-mark";
        mark.setAttribute("aria-hidden", "true");
        mark.textContent = activeLeaderboardScope === "global" ? "#" : activeLeaderboardScope === "friends" ? "◇" : "—";

        const title = document.createElement("strong");
        const description = document.createElement("span");
        if (activeLeaderboardScope === "global") {
            title.textContent = "GLOBAL BOARD NOT CONNECTED";
            description.textContent = "A shared score service is needed to rank players around the world.";
        } else if (activeLeaderboardScope === "friends") {
            title.textContent = "NO FRIEND SCORES YET";
            description.textContent = "Friends need linked player accounts before their Endless records can show here.";
        } else {
            title.textContent = `NO ENDLESS RECORD FOR ${mapName}`;
            description.textContent = "Finish an Endless run on this map and your best wave will be saved here.";
        }

        empty.append(mark, title, description);
        cell.append(empty);
        row.append(cell);
        rows.append(row);
        return;
    }

    const row = document.createElement("tr");
    row.className = "leaderboard-player-row";
    const rankCell = document.createElement("td");
    rankCell.className = "leaderboard-rank";
    rankCell.textContent = "PB";

    const playerCell = document.createElement("td");
    const player = document.createElement("div");
    player.className = "leaderboard-player-name";
    const localUsername = supabaseUser ? accountUsername() : "LOCAL RECORD";
    const localName = document.createElement("strong");
    localName.textContent = localUsername;
    const localLabel = document.createElement("small");
    localLabel.textContent = supabaseUser ? "THIS DEVICE" : "UNLINKED SAVE";
    const nameCopy = document.createElement("span");
    nameCopy.append(localName, localLabel);
    if (supabaseUser) {
        const avatar = document.createElement("img");
        avatar.className = "leaderboard-player-avatar";
        avatar.src = profilePortraitSources[playerProfile.portrait] || profilePortraitSources.mason;
        avatar.dataset.portraitId = playerProfile.portrait;
        avatar.alt = `${localUsername}'s profile portrait`;
        player.append(avatar);
    }
    player.append(nameCopy);
    playerCell.append(player);

    const scoreCell = document.createElement("td");
    scoreCell.className = "leaderboard-score";
    scoreCell.textContent = String(bestWave);

    const recordCell = document.createElement("td");
    const recordTag = document.createElement("span");
    recordTag.className = "leaderboard-record-tag";
    recordTag.textContent = "PERSONAL BEST";
    recordCell.append(recordTag);

    row.append(rankCell, playerCell, scoreCell, recordCell);
    rows.append(row);
}

function showLeaderboard() {
    if (campaignSelect.style.display !== "none") {
        leaderboardReturnScreen = "campaign";
    } else if (levelSelect.style.display !== "none") {
        leaderboardReturnScreen = "levels";
    } else if (deploymentScreen.style.display !== "none") {
        leaderboardReturnScreen = "deployment";
    } else {
        leaderboardReturnScreen = "menu";
    }

    setMuteButtonVisible(false);
    gameRunning = false;
    previousTime = 0;
    mainMenu.style.display = "none";
    profileScreen.style.display = "none";
    campaignSelect.style.display = "none";
    levelSelect.style.display = "none";
    leaderboardScreen.style.display = "flex";
    deploymentScreen.style.display = "none";
    if (loadoutScreen) loadoutScreen.style.display = "none";
    gameLayout.style.display = "none";
    document.getElementById("gameOverScreen").style.display = "none";
    document.getElementById("victoryScreen").style.display = "none";
    document.getElementById("endlessCoinReward").hidden = true;
    document.getElementById("leaderboardButton").style.visibility = "hidden";
    document.getElementById("profileButton").style.visibility = "hidden";
    document.getElementById("mainMenuButton").style.visibility = "hidden";
    renderLeaderboard();
}

function showProfile() {
    const returnMenuConfirm = document.getElementById("returnMenuConfirm");
    const restartConfirm = document.getElementById("restartConfirm");
    profileReturnScreen = returnMenuConfirm.style.display !== "none"
        ? "returnconfirm"
        : restartConfirm.style.display !== "none"
            ? "restartconfirm"
            : document.getElementById("gameOverScreen").style.display !== "none"
                ? "gameover"
                : document.getElementById("victoryScreen").style.display !== "none"
                    ? "victory"
                    : "menu";
    setMuteButtonVisible(false);
    gameRunning = false;
    previousTime = 0;
    mainMenu.style.display = "none";
    profileScreen.style.display = "flex";
    leaderboardScreen.style.display = "none";
    campaignSelect.style.display = "none";
    levelSelect.style.display = "none";
    deploymentScreen.style.display = "none";
    if (loadoutScreen) loadoutScreen.style.display = "none";
    gameLayout.style.display = "none";
    returnMenuConfirm.style.display = "none";
    restartConfirm.style.display = "none";
    document.getElementById("gameOverScreen").style.display = "none";
    document.getElementById("victoryScreen").style.display = "none";
    document.getElementById("leaderboardButton").style.visibility = "hidden";
    document.getElementById("profileButton").style.visibility = "hidden";
    document.getElementById("mainMenuButton").style.visibility = "hidden";
    document.getElementById("profileSaveNotice").textContent = "";
    const profileSort = document.getElementById("profilePortraitSort");
    if (profileSort) profileSort.value = rosterSortMode;
    updateProfileIdentity();
    renderProfilePortraitOptions();
    updateProfileStats();
    updateAccountUI();
    renderProfileFriends().catch(error => {
        console.warn("Could not refresh friends list:", error.message || error);
    });
}

function closeProfile() {
    if (profileReturnScreen === "returnconfirm") {
        profileReturnScreen = "menu";
        profileScreen.style.display = "none";
        gameLayout.style.display = "grid";
        returnMenuConfirm.style.display = "flex";
        document.getElementById("leaderboardButton").style.visibility = "hidden";
        document.getElementById("profileButton").style.visibility = "hidden";
        document.getElementById("mainMenuButton").style.visibility = "visible";
        setMuteButtonVisible(true);
        gameRunning = true;
        previousTime = 0;
        updateReturnEndlessSubmissionUI();
        updateDailyScoreSubmissionUI();
        return;
    }

    if (profileReturnScreen === "restartconfirm") {
        profileReturnScreen = "menu";
        profileScreen.style.display = "none";
        gameLayout.style.display = "grid";
        document.getElementById("restartConfirm").style.display = "flex";
        document.getElementById("leaderboardButton").style.visibility = "hidden";
        document.getElementById("profileButton").style.visibility = "hidden";
        document.getElementById("mainMenuButton").style.visibility = "visible";
        setMuteButtonVisible(true);
        gameRunning = true;
        previousTime = 0;
        updateRestartEndlessSubmissionUI();
        updateDailyScoreSubmissionUI();
        return;
    }

    if (profileReturnScreen === "gameover") {
        profileReturnScreen = "menu";
        profileScreen.style.display = "none";
        document.getElementById("gameOverScreen").style.display = "flex";
        document.getElementById("leaderboardButton").style.visibility = "hidden";
        document.getElementById("profileButton").style.visibility = "hidden";
        document.getElementById("mainMenuButton").style.visibility = "visible";
        updateEndlessSubmissionUI();
        updateDailyScoreSubmissionUI();
        return;
    }

    if (profileReturnScreen === "victory") {
        profileReturnScreen = "menu";
        profileScreen.style.display = "none";
        document.getElementById("victoryScreen").style.display = "flex";
        document.getElementById("leaderboardButton").style.visibility = "hidden";
        document.getElementById("profileButton").style.visibility = "hidden";
        document.getElementById("mainMenuButton").style.visibility = "visible";
        updateDailyScoreSubmissionUI();
        return;
    }
    showMenu();
}

function closeLeaderboard() {
    document.getElementById("leaderboardButton").style.visibility = "visible";

    if (leaderboardReturnScreen === "campaign") {
        showCampaignSelect();
    } else if (leaderboardReturnScreen === "levels") {
        showLevelSelect();
    } else if (leaderboardReturnScreen === "deployment") {
        showDeployment(currentLevel);
    } else {
        showMenu();
    }
}

function updateRunRecap(wavesCleared) {
    const recap = {
        WavesCleared: Math.max(0, wavesCleared),
        EnemiesDefeated: totalEnemiesDefeated,
        SurvivorsLeft: survivors.length,
        ScrapLeft: scrap
    };

    ["gameOver", "victory"].forEach(prefix => {
        Object.entries(recap).forEach(([stat, value]) => {
            const target = document.getElementById(`${prefix}${stat}`);
            if (target) target.textContent = String(value);
        });
    });
}

function endGame() {
    if (!gameRunning) return;

    setMuteButtonVisible(false);
    cancelAutoStartWave();
    awaitingNextWave = false;
    hideWaveCompleteToast();

    if (gameMode === "endless") {
        const bestWave = Math.max(0, currentWave - 1);
        saveEndlessRecord(currentLevel, bestWave);
        completedEndlessTelemetry = getEndlessTelemetrySnapshot(bestWave, "defeat");
        pendingEndlessScore = {
            mapId: currentLevel,
            bestWave,
            submitted: false,
            submitting: false,
            telemetry: completedEndlessTelemetry,
            telemetryLogged: false
        };
        awardEndlessRunCoins(bestWave, activeEndlessRunId);
        activeEndlessRunId = null;
        activeEndlessTelemetry = null;
    } else {
        pendingEndlessScore = null;
        renderEndlessCoinReward(0);
        if (gameMode === "daily") {
            pendingDailyScore = {
                date: activeDailyChallenge?.date || getDailyChallengeDate(),
                bestWave: Math.max(0, currentWave - 1),
                health: Math.max(0, Math.round(playerHealth)),
                completedAt: dailyLastCompletedAt || new Date().toISOString(),
                submitted: false,
                submitting: false
            };
        } else {
            pendingDailyScore = null;
        }
    }

    gameRunning = false;
    waveRunning = false;
    gamePaused = false;

    document.getElementById("gameLayout");
    document.querySelector(".game-layout").style.display = "none";

    document.getElementById("gameOverMessage").textContent =
        "Your defenses have fallen. The wasteland is lost.";

    document.getElementById("finalWaveDisplay").textContent = isEndlessStyleMode()
        ? `WAVE REACHED: ${currentWave}`
        : `WAVE REACHED: ${currentWave} / ${gameMode === "daily" ? 15 : totalWaves}`;
    document.querySelector("#gameOverScreen .menu-eyebrow").textContent = gameMode === "daily"
        ? "DAILY CHALLENGE // RUN ENDED"
        : "DEFENSE FAILED // RUN ENDED";
    document.querySelector("#gameOverScreen h2").textContent = gameMode === "daily" ? "CHALLENGE OVER" : "GAME OVER";
    if (gameMode === "daily") {
        document.getElementById("gameOverMessage").textContent =
            "The challenge is over. Submit your best cleared wave and remaining health to today's leaderboard.";
    } else {
        document.getElementById("gameOverMessage").textContent = "Your defenses have fallen. The wasteland is lost.";
    }

    updateRunRecap(currentWave - 1);
    updateEndlessSubmissionUI();
    updateDailyScoreSubmissionUI();

    document.getElementById("gameOverScreen").style.display = "flex";
}

function showMenu() {
    setMuteButtonVisible(false);
    gameRunning = false;
    waveRunning = false;
    gamePaused = false;
    cancelAutoStartWave();
    awaitingNextWave = false;
    autoStartWaves = false;
    updateAutoStartButton();
    updateCoinBalanceDisplay();
    const dailyMenuSummary = document.getElementById("dailyChallengeMenuSummary");
    if (dailyMenuSummary) {
        const todayChallenge = getTodaysDailyChallenge();
        const modifierLabels = getDailyModifiers(todayChallenge)
            .map(modifier => modifier.label)
            .join(" · ");
        dailyMenuSummary.textContent = modifierLabels
            ? `One shared map, three survivors, fifteen waves, and ${modifierLabels}.`
            : "One shared map, three survivors, and fifteen waves.";
    }
    hideWaveCompleteToast();
    previousTime = 0;
    clearInterval(dialogueTimer);
    document.getElementById("storyDialogue").style.display = "none";
    document.getElementById("startWaveButton").disabled = false;
    document.getElementById("returnMenuConfirm").style.display = "none";
    document.getElementById("restartConfirm").style.display = "none";
    profileReturnScreen = "menu";
    pendingEndlessScore = null;
    pendingDailyScore = null;
    activeDailyChallenge = null;
    returnDailyScoreSubmission = null;
    restartDailyScoreSubmission = null;
    returnEndlessScoreSubmission = null;
    activeEndlessTelemetry = null;
    completedEndlessTelemetry = null;
    document.getElementById("returnEndlessScoreSubmission").hidden = true;
    updateEndlessSubmissionUI();
    updateDailyScoreSubmissionUI();

    // Reset the selected roster.
    selectedSurvivors.clear();
    updateRosterSummary();
    updateDeploymentMessage("0 survivors selected.");
    // Remove the selected visual highlight from all roster cards.
    document.querySelectorAll("#deploymentRoster button[data-survivor]")
        .forEach(card => {
            card.classList.remove("selected");
            card.setAttribute("aria-pressed", "false");
        });


    // Reset any selected in-game survivor.
    selectedSurvivor = null;
    inspectedSurvivor = null;
    moveMode = false;

    // Hide survivor details.
    hideSurvivorDetails();

    mainMenu.style.display = "block";
    profileScreen.style.display = "none";
    leaderboardScreen.style.display = "none";
    campaignSelect.style.display = "none";
    levelSelect.style.display = "none";
    deploymentScreen.style.display = "none";
    if (loadoutScreen) loadoutScreen.style.display = "none";
    document.getElementById("leaderboardButton").style.visibility = "visible";
    document.getElementById("profileButton").style.visibility = "visible";
    document.getElementById("mainMenuButton").style.visibility = "hidden";
    gameLayout.style.display = "none";
    document.getElementById("gameOverScreen").style.display = "none";
    document.getElementById("victoryScreen").style.display = "none";
    document.getElementById("endlessCoinReward").hidden = true;
}

function showCampaignSelect() {
    setMuteButtonVisible(false);
    gameRunning = false;
    previousTime = 0;
    mainMenu.style.display = "none";
    profileScreen.style.display = "none";
    leaderboardScreen.style.display = "none";
    campaignSelect.style.display = "flex";
    levelSelect.style.display = "none";
    deploymentScreen.style.display = "none";
    if (loadoutScreen) loadoutScreen.style.display = "none";
    document.getElementById("profileButton").style.visibility = "hidden";
    document.getElementById("mainMenuButton").style.visibility = "visible";
    gameLayout.style.display = "none";
    document.getElementById("gameOverScreen").style.display = "none";
    document.getElementById("victoryScreen").style.display = "none";
}

function showLevelSelect() {
    setMuteButtonVisible(false);
    gameRunning = false;
    previousTime = 0;
    updateEndlessRecordDisplays();

    const eyebrow = document.getElementById("levelSelectEyebrow");
    const title = document.getElementById("levelSelectTitle");
    const description = document.getElementById("levelSelectDescription");

    if (gameMode === "endless") {
        eyebrow.textContent = "ENDLESS // SURVIVAL RUN";
        title.textContent = "ENDLESS OPERATIONS";
        description.textContent = "Choose a map and survive as many waves as possible.";
        document.getElementById("backToMenuButton").textContent = "< MAIN MENU";

        for (let level = 1; level <= 6; level++) {
            const record = document.getElementById("endlessRecord" + level);
            if (record) {
                record.style.display = "block";
            }
        }
    } else if (gameMode === "sandbox") {
        eyebrow.textContent = "SANDBOX // PRACTICE RUN";
        title.textContent = "SANDBOX OPERATIONS";
        description.textContent = "Test every survivor with 50,000 scrap. Sandbox runs never affect leaderboards.";
        document.getElementById("backToMenuButton").textContent = "< MAIN MENU";

        for (let level = 1; level <= 6; level++) {
            const record = document.getElementById("endlessRecord" + level);
            if (record) {
                record.style.display = "none";
            }
        }
    } else {
        eyebrow.textContent = "CAMPAIGN // OPERATION BOARD";
        title.textContent = "CAMPAIGN OPERATIONS";
        description.textContent = "Select an operation and prepare your squad for deployment.";
        document.getElementById("backToMenuButton").textContent = "< CAMPAIGN SELECT";

        for (let level = 1; level <= 6; level++) {
            const record = document.getElementById("endlessRecord" + level);
            if (record) {
                record.style.display = "none";
            }
        }
    }

    updateCampaignLevelCardStatuses();

    mainMenu.style.display = "none";
    profileScreen.style.display = "none";
    leaderboardScreen.style.display = "none";
    campaignSelect.style.display = "none";
    levelSelect.style.display = "block";
    deploymentScreen.style.display = "none";
    if (loadoutScreen) loadoutScreen.style.display = "none";
    document.getElementById("profileButton").style.visibility = "hidden";
    document.getElementById("mainMenuButton").style.visibility = "visible";
    gameLayout.style.display = "none";
}


const openingDialogue =
        "I heard there was a safe zone in the city. But this area is overrun with mutant spiders and who knows what else. We have to move fast!";
const cowWarningDialogue =
        "Keep your eyes open for those pesky mutant cows. Their armor shrugs off ordinary fire, but explosives hit them hard. Bring Cody online before the herd reaches the safe zone.";
const britneyIntroductionDialogue =
        "Hey hotshot! I'm Britney, mind if me and my rifle tag along?";

// Short campaign briefings teach one new threat or decision at a time.  The
// six campaign operations deliberately use only the starter roster; these
// portraits also keep the story readable on small screens.
const campaignBriefings = {
    2: {
        wave: 4,
        wave4: {
            portrait: "britney",
            text: "Those writhing shapes are mutant snakes. Keep them under control before they split, and let Cody's explosives soften the pack."
        }
    },
    3: {
        wave: 5,
        opening: {
            portrait: "zach",
            text: "The streets are getting faster. Keep your eyes open and don't let the runners slip past."
        },
        wave5: {
            portrait: "zach",
            text: "Those dark figures are Mutant Men. They hit harder than spiders, but they are slow enough to punish with range and focused fire."
        }
    },
    4: {
        wave: 5,
        opening: {
            portrait: "brady",
            text: "This place is falling apart. We can still hold the line, but every survivor needs to pull their weight."
        },
        wave5: {
            portrait: "brady",
            text: "Cows are pushing through again. Use Cody's blasts to break the pack, and keep me where a shotgun can stall anything that gets close."
        }
    },
    5: {
        wave: 5,
        opening: {
            portrait: "britney",
            text: "The factories are still running. Whatever is coming through those gates is tougher than anything we've faced before."
        },
        wave5: {
            portrait: "britney",
            text: "Watch the armor. Some targets shrug off ordinary hits, while support creatures keep the whole wave alive. Spend your scrap with a plan."
        }
    },
    6: {
        wave: 5,
        opening: {
            portrait: "mason",
            text: "This is it. The safe zone is ahead, but the whole wasteland is moving against us. Set up carefully, watch the road, and keep everyone alive."
        },
        wave5: {
            portrait: "mason",
            text: "Everything we've learned comes down to this. Watch for armor, splitters, healers, and heavy targets—and react before the road is full."
        }
    }
};

let dialogueIndex = 0;
let dialogueTimer = null;
let dialogueFinished = false;
let activeDialogueText = "";
let activeDialogueAfterClose = null;
let campaignCowWarningShown = false;
let campaignDialogueShown = new Set();

function showStoryDialogue(dialogue, afterClose = null, portraitId = "james") {
    const box = document.getElementById("storyDialogue");
    const text = document.getElementById("dialogueText");
    const portrait = box?.querySelector(".dialogue-portrait");
    const speaker = box?.querySelector(".dialogue-speaker");

    clearInterval(dialogueTimer);

    activeDialogueText = dialogue;
    activeDialogueAfterClose = afterClose;
    dialogueIndex = 0;
    dialogueFinished = false;
    text.textContent = "";
    if (portrait) {
        const portraitSource = typeof profilePortraitSources !== "undefined"
            ? profilePortraitSources[portraitId]
            : null;
        if (portraitSource) portrait.src = portraitSource;
        portrait.alt = survivorDetails?.[portraitId]?.name || "James";
        portrait.dataset.portraitId = portraitId;
    }
    if (speaker) {
        const speakerName = survivorDetails?.[portraitId]?.name || "SURVIVOR";
        const speakerRole = portraitId === "james"
            ? "FIRESTARTER"
            : survivorDetails?.[portraitId]?.role || "SURVIVOR";
        speaker.textContent = `${speakerName.toUpperCase()} // ${speakerRole}`;
    }
    box.style.display = "flex";
    document.getElementById("startWaveButton").disabled = true;

    dialogueTimer = setInterval(() => {
        if (dialogueIndex < activeDialogueText.length) {
            text.textContent += activeDialogueText[dialogueIndex];
            dialogueIndex++;
        } else {
            clearInterval(dialogueTimer);
            dialogueFinished = true;
        }
    }, 35);
}

function showOpeningDialogue() {
    showStoryDialogue(openingDialogue);
}

function showBritneyIntroductionDialogue() {
    showStoryDialogue(britneyIntroductionDialogue, null, "britney");
}

function showCampaignBriefing(level = currentLevel, kind = "opening", afterClose = null) {
    const briefing = campaignBriefings[level]?.[kind];
    if (!briefing) return false;
    showStoryDialogue(briefing.text, afterClose, briefing.portrait);
    return true;
}

function showCampaignCowWarningDialogue() {
    campaignCowWarningShown = true;
    showStoryDialogue(cowWarningDialogue, () => {
        // Continue directly into wave 5 so the warning also works when auto
        // start is enabled and no extra button press is required.
        startWave();
    });
}

function bindUIEvent(id, eventName, handler, options) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`[Wasteland Defense] Skipping ${eventName} handler: #${id} is missing from the page.`);
        return false;
    }

    element.addEventListener(eventName, handler, options);
    return true;
}

bindUIEvent("dialogueContinue", "click", () => {
    if (!dialogueFinished) {
        clearInterval(dialogueTimer);
        document.getElementById("dialogueText").textContent = activeDialogueText;
        dialogueFinished = true;
        return;
    }

    document.getElementById("storyDialogue").style.display = "none";
    document.getElementById("startWaveButton").disabled = false;
    const afterClose = activeDialogueAfterClose;
    activeDialogueAfterClose = null;
    if (typeof afterClose === "function") afterClose();
});

function applyLoadoutToDeployment(loadout) {
    if (!loadout || gameMode === "daily") return false;

    selectedSurvivors.clear();
    loadout.ids
        .filter(id => isSurvivorAvailableForCurrentMode(id))
        .slice(0, getMaxRosterSize())
        .forEach(id => selectedSurvivors.add(id));
    pendingLoadoutIds = null;
    pendingLoadoutName = loadout.name;

    document.querySelectorAll("#deploymentRoster button[data-survivor]").forEach(card => {
        const selected = selectedSurvivors.has(card.dataset.survivor);
        card.classList.toggle("selected", selected);
        card.setAttribute("aria-pressed", String(selected));
    });
    updateRosterSummary();
    renderDeploymentLoadouts();
    updateDeploymentMessage(`${loadout.name.toUpperCase()} READY. ${selectedSurvivors.size} SURVIVORS SELECTED.`);
    return true;
}

function renderDeploymentLoadouts() {
    const bar = document.getElementById("deploymentLoadoutBar");
    const list = document.getElementById("deploymentLoadoutList");
    const status = document.getElementById("deploymentLoadoutStatus");
    if (!bar || !list || !status) return;

    const visible = gameMode !== "daily";
    bar.hidden = !visible;
    if (!visible) return;

    const saved = readSavedLoadouts();
    status.textContent = pendingLoadoutName
        ? `${pendingLoadoutName.toUpperCase()} READY — SQUAD LOCKED IN.`
        : saved.length
            ? "Choose a saved squad or build your own roster below."
            : "No saved loadouts yet. Build one in the Safehouse.";

    const fragment = document.createDocumentFragment();
    saved.forEach(loadout => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "deployment-loadout-chip";
        button.dataset.deploymentLoadoutId = loadout.id;
        button.setAttribute("role", "listitem");
        if (pendingLoadoutName === loadout.name) button.classList.add("is-active");
        const title = document.createElement("strong");
        title.textContent = loadout.name.toUpperCase();
        const summary = document.createElement("small");
        summary.textContent = loadout.ids.map(id => survivorDetails[id]?.name || id).join(" · ");
        button.append(title, summary);
        fragment.append(button);
    });
    list.replaceChildren(fragment);
}

function showDeployment(level = 1) {
    setMuteButtonVisible(false);
    currentLevel = level;
    roadPoints = campaignRoads[currentLevel];
    drawMap();
    const levelCard = document.getElementById(`level${level}Button`);
    const levelName = levelCard?.querySelector("strong")?.textContent.trim() || `LEVEL ${String(level).padStart(2, "0")}`;
    const dailyDetails = document.getElementById("dailyChallengeDetails");
    const dailyModifiers = document.getElementById("dailyChallengeModifiers");
    const dailyMapPanel = document.getElementById("dailyChallengeMapPanel");
    if (gameMode === "daily" && currentDailyChallenge) {
        const squadNames = currentDailyChallenge.survivorIds.map(id => survivorDetails[id]?.name || id).join(" · ");
        const enemyNames = currentDailyChallenge.enemyTypes.map(type => enemyLabels[type] || type.toUpperCase()).join(" · ");
        const modifierText = getDailyModifiers(currentDailyChallenge)
            .map(modifier => `${modifier.label}: ${modifier.description}`)
            .join("  //  ");
        document.getElementById("deploymentLocation").textContent =
            `DAILY CHALLENGE // ${currentDailyChallenge.date} UTC // ${levelName}`;
        document.querySelector(".deployment-subtitle").textContent =
            "Choose your squad from today's three survivors. Clear all 15 waves for 250 coins.";
        dailyDetails.textContent = `TODAY'S SQUAD: ${squadNames}  //  HOSTILES: ${enemyNames}`;
        dailyDetails.hidden = false;
        if (dailyModifiers) {
            dailyModifiers.textContent = `TODAY'S MODIFIERS: ${modifierText}`;
            dailyModifiers.hidden = false;
        }
        try {
            document.getElementById("dailyChallengeMapPreview").src = mapCanvas.toDataURL("image/png");
            document.getElementById("dailyChallengeMapName").textContent = levelName;
            dailyMapPanel.hidden = false;
        } catch (error) {
            dailyMapPanel.hidden = true;
            console.warn("Could not create the Daily Challenge map preview:", error);
        }
    } else {
        const runLabel = gameMode === "sandbox"
            ? "SANDBOX RUN"
            : gameMode === "endless"
                ? "ENDLESS RUN"
                : "CAMPAIGN";
        document.getElementById("deploymentLocation").textContent =
            `${runLabel} // ${levelName}`;
        document.querySelector(".deployment-subtitle").textContent =
            `Choose up to ${getMaxRosterSize()} survivors. Tap a card to add or remove them.`;
        dailyDetails.hidden = true;
        if (dailyModifiers) dailyModifiers.hidden = true;
        dailyMapPanel.hidden = true;
    }
    updateDeploymentRosterAvailability();
    const guidedCampaign = isGuidedCampaignOperation();
    if (guidedCampaign) {
        // The opening campaign operations are story tutorials: their squads
        // are fixed and cannot be replaced by a saved loadout or roster choice.
        const guidedSquad = isSecondCampaignOperation()
            ? getCampaignLevelTwoSquadIds()
            : getCampaignOpeningSquadIds();
        selectedSurvivors.clear();
        guidedSquad.forEach(id => selectedSurvivors.add(id));
        pendingLoadoutIds = null;
        document.querySelector(".deployment-subtitle").textContent =
            `Opening squad locked: ${guidedSquad
                .map(id => survivorDetails[id]?.name || id)
                .join(" · ")}.`;
        document.getElementById("deploymentMessage").textContent =
            "This operation begins with a fixed three-survivor squad.";
        if (isSecondCampaignOperation()) {
            document.getElementById("deploymentMessage").textContent =
                "This operation begins with a fixed four-survivor squad.";
        }
        document.querySelectorAll("#deploymentRoster button[data-survivor]").forEach(card => {
            const selected = selectedSurvivors.has(card.dataset.survivor);
            card.classList.toggle("selected", selected);
            card.setAttribute("aria-pressed", String(selected));
        });
    }
    const deploymentSort = document.getElementById("deploymentRosterSort");
    if (deploymentSort) deploymentSort.value = rosterSortMode;
    sortDeploymentRosterCards();
    if (pendingLoadoutIds && gameMode !== "daily" && !guidedCampaign) {
        selectedSurvivors.clear();
        pendingLoadoutIds
            .filter(id => isSurvivorAvailableForCurrentMode(id))
            .slice(0, getMaxRosterSize())
            .forEach(id => selectedSurvivors.add(id));
        pendingLoadoutIds = null;
        document.querySelectorAll("#deploymentRoster button[data-survivor]").forEach(card => {
            const selected = selectedSurvivors.has(card.dataset.survivor);
            card.classList.toggle("selected", selected);
            card.setAttribute("aria-pressed", String(selected));
        });
    }
    updateRosterSummary();
    renderDeploymentLoadouts();

    gameRunning = false;
    previousTime = 0;

    mainMenu.style.display = "none";
    profileScreen.style.display = "none";
    leaderboardScreen.style.display = "none";
    campaignSelect.style.display = "none";
    levelSelect.style.display = "none";
    deploymentScreen.style.display = "block";
    if (loadoutScreen) loadoutScreen.style.display = "none";
    document.getElementById("profileButton").style.visibility = "hidden";
    document.getElementById("mainMenuButton").style.visibility = "visible";

    gameLayout.style.display = "none";
}



const selectedSurvivors = new Set();

function isSurvivorAvailableForCurrentMode(id) {
    const survivor = survivorDetails[id];
    if (!survivor) return false;
    if (isGuidedCampaignOperation()) {
        const guidedSquad = isSecondCampaignOperation()
            ? getCampaignLevelTwoSquadIds()
            : getCampaignOpeningSquadIds();
        return guidedSquad.includes(id);
    }
    if (gameMode === "campaign") {
        // Campaign progression is balanced around the six starter survivors;
        // shop recruits remain a separate long-term reward for other modes.
        return campaignStarterSurvivorIds.includes(id);
    }
    if (gameMode === "sandbox") {
        // Sandbox is a testing range: every built-in and custom survivor is
        // selectable without changing the account's unlocked roster.
        return true;
    }
    if (gameMode === "daily") {
        // Daily runs use the date-seeded trial pool, not the player's account
        // roster.  Only today's three survivors may be selected, even when
        // the player owns other survivors.
        return Boolean(currentDailyChallenge?.survivorIds?.includes(id));
    }
    return survivor.unlocked === true;
}

function startDefense() {
    if (isGuidedCampaignOperation()) {
        const guidedSquad = isSecondCampaignOperation()
            ? getCampaignLevelTwoSquadIds()
            : getCampaignOpeningSquadIds();
        selectedSurvivors.clear();
        guidedSquad.forEach(id => selectedSurvivors.add(id));
    }
    const unavailableSurvivor = [...selectedSurvivors]
        .find(id => !isSurvivorAvailableForCurrentMode(id));
    if (unavailableSurvivor) {
        selectedSurvivors.delete(unavailableSurvivor);
        document.getElementById("deploymentMessage").textContent =
            "That survivor is locked. Unlock them in SHOP / RECRUIT first.";
        updateRosterSummary();
        return;
    }
    if (selectedSurvivors.size === 0) {
        document.getElementById("deploymentMessage").textContent =
            "Select at least one survivor for your roster first.";
        return;
    }

    populateInGameRoster();
    setMuteButtonVisible(true);
    pendingEndlessScore = null;
    pendingDailyScore = null;
    returnDailyScoreSubmission = null;
    restartDailyScoreSubmission = null;
    dailyLastCompletedAt = null;
    activeDailyChallenge = gameMode === "daily" ? currentDailyChallenge : null;
    returnEndlessScoreSubmission = null;
    updateEndlessSubmissionUI();
    updateDailyScoreSubmissionUI();
    document.getElementById("endlessCoinReward").hidden = true;
    campaignCowWarningShown = false;

    activeCampaignRunId = gameMode === "campaign" ? createRunId() : null;
    activeEndlessRunId = gameMode === "endless" ? createRunId() : null;
    activeEndlessTelemetry = gameMode === "endless"
        ? {
            runId: activeEndlessRunId,
            mapId: currentLevel,
            gameVersion: ENDLESS_TELEMETRY_VERSION,
            telemetrySchema: ENDLESS_TELEMETRY_SCHEMA_VERSION,
            startedAt: new Date().toISOString(),
            waves: [],
            events: [],
            waveStart: null
        }
        : null;
    completedEndlessTelemetry = null;

    cancelAutoStartWave();
    awaitingNextWave = false;
    hideWaveCompleteToast();
    updateAutoStartButton();

    deploymentScreen.style.display = "none";
    gameLayout.style.display = "grid";
    document.getElementById("gameOverScreen").style.display = "none";
    document.getElementById("victoryScreen").style.display = "none";
    profileScreen.style.display = "none";
    leaderboardScreen.style.display = "none";
    document.getElementById("leaderboardButton").style.visibility = "hidden";
    document.getElementById("profileButton").style.visibility = "hidden";
    document.getElementById("mainMenuButton").style.visibility = "visible";

    // Reset the battlefield.
    survivors.length = 0;
    selectedSurvivor = null;
    inspectedSurvivor = null;
    hideSurvivorDetails();
    enemies.length = 0;
    bullets.length = 0;
    impactPixels.length = 0;
    blastEffects.length = 0;
    playerHealth = 100;
    totalEnemiesDefeated = 0;
    floatingDamageNumbers.length = 0;
    scrap = gameMode === "sandbox"
        ? 50000
        : gameMode === "endless"
            ? 150
            : gameMode === "daily"
                ? 300
                : gameMode === "campaign"
                    ? (campaignStartingScrap[currentLevel] || 250)
                    : 250;

    updateScrapDisplay();
    updatePlayerHealthDisplay();
    document.getElementById("waveDisplay").textContent = isEndlessStyleMode()
        ? "WAVE 0"
        : gameMode === "daily"
            ? "0 / 15"
            : "0 / " + totalWaves;

    // Show the battlefield, but keep combat paused.
    gameRunning = true;
    waveRunning = false;
    currentWave = 1;
    updateWavePreview();
    previousTime = 0;

    document.getElementById("startWaveButton").textContent =
        "START WAVE 1";
document.getElementById("startWaveButton").style.display = "block";
document.getElementById("startWaveButton").disabled = false;

document.getElementById("pauseButton").textContent = "PAUSE";
document.getElementById("pauseButton").disabled = true;

gamePaused = false;
enemiesToSpawn = 0;
spawnTimer = 0;
moveMode = false;
    document.getElementById("waveStatus").textContent =
        "Prepare your defenses.";
        campaignDialogueShown = new Set();
        if (gameMode === "campaign" && currentLevel === 1) {
            showOpeningDialogue();
        } else if (isSecondCampaignOperation()) {
            showBritneyIntroductionDialogue();
        } else if (gameMode === "campaign") {
            showCampaignBriefing(currentLevel, "opening");
        }
}

bindUIEvent("campaignButton", "click", () => {
    gameMode = "campaign";
    showCampaignSelect();
});
bindUIEvent("campaignBackButton", "click", showMenu);
bindUIEvent("outskirtsCampaignButton", "click", showLevelSelect);
bindUIEvent("backToMenuButton", "click", () => {
    if (gameMode === "campaign") {
        showCampaignSelect();
    } else {
        showMenu();
    }
});


let resumeAfterReturnCancel = false;
let resumeAfterRestartCancel = false;

function resumeWaveAfterCancel(shouldResume) {
    if (!shouldResume || !gameRunning) return;

    gamePaused = false;
    document.getElementById("pauseButton").textContent = "PAUSE";
    document.getElementById("waveStatus").textContent =
        `Wave ${currentWave} in progress.`;
}

bindUIEvent("mainMenuButton", "click", () => {
    if (!gameRunning) {
        showMenu();
        return;
    }

    cancelAutoStartWave();
    hideWaveCompleteToast();

    if (waveRunning && !gamePaused) {
        gamePaused = true;
        resumeAfterReturnCancel = true;
        document.getElementById("pauseButton").textContent = "RESUME";
        document.getElementById("waveStatus").textContent = "Game paused.";
    }

    prepareReturnEndlessSubmission();
    prepareDailyConfirmationSubmissions();
    document.getElementById("returnMenuConfirm").style.display = "flex";
    document.getElementById("cancelReturnButton").focus();
});

bindUIEvent("cancelReturnButton", "click", () => {
    document.getElementById("returnMenuConfirm").style.display = "none";
    resumeWaveAfterCancel(resumeAfterReturnCancel);
    resumeAfterReturnCancel = false;
    scheduleAutoStartWave();
    document.getElementById("mainMenuButton").focus();
});

bindUIEvent("confirmReturnButton", "click", () => {
    document.getElementById("returnMenuConfirm").style.display = "none";
    resumeAfterReturnCancel = false;
    showMenu();
});

bindUIEvent("submitCompletedEndlessScoreButton", "click", submitCompletedEndlessWaveScore);
bindUIEvent("submitReturnDailyScoreButton", "click", () => submitDailyChallengeScore(returnDailyScoreSubmission));
bindUIEvent("submitRestartDailyScoreButton", "click", () => submitDailyChallengeScore(restartDailyScoreSubmission));
bindUIEvent("submitCompletedEndlessScoreFromRestartButton", "click", submitCompletedEndlessWaveScore);

bindUIEvent("cancelRestartButton", "click", () => {
    document.getElementById("restartConfirm").style.display = "none";
    resumeWaveAfterCancel(resumeAfterRestartCancel);
    resumeAfterRestartCancel = false;
    scheduleAutoStartWave();
    document.getElementById("startOverButton").focus();
});

bindUIEvent("confirmRestartButton", "click", () => {
    document.getElementById("restartConfirm").style.display = "none";
    resumeAfterRestartCancel = false;
    startDefense();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && document.getElementById("restartConfirm").style.display === "flex") {
        document.getElementById("cancelRestartButton").click();
    } else if (event.key === "Escape" && document.getElementById("returnMenuConfirm").style.display === "flex") {
        document.getElementById("cancelReturnButton").click();
    }
});

bindUIEvent("level1Button", "click", () => {
    showDeployment(1);
});
bindUIEvent("level2Button", "click", () => {
    showDeployment(2);
});

bindUIEvent("level3Button", "click", () => {
    showDeployment(3);
});

bindUIEvent("level4Button", "click", () => {
    showDeployment(4);
});

bindUIEvent("level5Button", "click", () => {
    showDeployment(5);
});

bindUIEvent("level6Button", "click", () => {
    showDeployment(6);
});
bindUIEvent("backToLevelsButton", "click", () => {
    if (gameMode === "daily") showMenu();
    else showLevelSelect();
});
bindUIEvent("startDefenseButton", "click", startDefense);
bindUIEvent("restartRunButton", "click", startDefense);


bindUIEvent("startWaveButton", "click", startWave);

bindUIEvent("autoStartButton", "click", () => {
    setAutoStartWaves(!autoStartWaves);
});
bindUIEvent("survivorTargetPrioritySelect", "change", event => {
    if (!inspectedSurvivor || !survivors.includes(inspectedSurvivor)) return;

    const nextPriority = String(event.target.value || "first");
    inspectedSurvivor.targetingPriority = Object.prototype.hasOwnProperty.call(
        TARGETING_PRIORITY_LABELS,
        nextPriority
    ) ? nextPriority : "first";
    recordEndlessTelemetryEvent({
        kind: "targeting",
        survivorId: getEndlessTelemetrySurvivorId(inspectedSurvivor),
        survivor: inspectedSurvivor.type,
        targetingPriority: inspectedSurvivor.targetingPriority
    });
    updateSurvivorTargetingControl(inspectedSurvivor);
    updateDeploymentMessage(
        `${inspectedSurvivor.name} targeting: ${TARGETING_PRIORITY_LABELS[inspectedSurvivor.targetingPriority]}.`
    );
});
bindUIEvent("startOverButton", "click", () => {
    cancelAutoStartWave();
    hideWaveCompleteToast();
    if (waveRunning && !gamePaused) {
        gamePaused = true;
        resumeAfterRestartCancel = true;
        document.getElementById("pauseButton").textContent = "RESUME";
        document.getElementById("waveStatus").textContent = "Game paused.";
    }

    prepareReturnEndlessSubmission();
    prepareDailyConfirmationSubmissions();
    document.getElementById("restartConfirm").style.display = "flex";
    document.getElementById("cancelRestartButton").focus();
});



bindUIEvent("pauseButton", "click", () => {
    if (!waveRunning) return;

    gamePaused = !gamePaused;
    recordEndlessTelemetryEvent({
        kind: "pause",
        paused: Boolean(gamePaused)
    });

    document.getElementById("pauseButton").textContent =
        gamePaused ? "RESUME" : "PAUSE";

    document.getElementById("waveStatus").textContent =
        gamePaused
            ? "Game paused."
            : "Wave " + currentWave + " in progress.";
});
let gameSpeed = 1;

bindUIEvent("speedButton", "click", () => {
    gameSpeed++;

    if (gameSpeed > 5) {
        gameSpeed = 1;
    }

    recordEndlessTelemetryEvent({
        kind: "speed",
        speed: gameSpeed
    });

    document.getElementById("speedButton").textContent = gameSpeed + "×";
});



bindUIEvent("endlessButton", "click", () => {
    gameMode = "endless";
    activeDailyChallenge = null;
    updateRosterSummary();
    showLevelSelect();
});

bindUIEvent("sandboxButton", "click", () => {
    gameMode = "sandbox";
    activeDailyChallenge = null;
    currentDailyChallenge = null;
    selectedSurvivors.clear();
    updateRosterSummary();
    showLevelSelect();
});

bindUIEvent("dailyChallengeButton", "click", () => {
    gameMode = "daily";
    currentDailyChallenge = getTodaysDailyChallenge();
    activeDailyChallenge = currentDailyChallenge;
    selectedSurvivors.clear();
    document.querySelectorAll("#deploymentRoster button[data-survivor]").forEach(card => {
        card.classList.remove("selected");
        card.setAttribute("aria-pressed", "false");
    });
    document.getElementById("deploymentMessage").textContent = "";
    showDeployment(currentDailyChallenge.mapId);
});
bindUIEvent("shopRecruitButton", "click", () => { window.location.href = "shop/"; });
bindUIEvent("openLoadoutButton", "click", showLoadout);
bindUIEvent("deploymentLoadoutList", "click", event => {
    const button = event.target.closest("button[data-deployment-loadout-id]");
    if (!button) return;
    const saved = readSavedLoadouts().find(loadout => loadout.id === button.dataset.deploymentLoadoutId);
    if (saved) applyLoadoutToDeployment(saved);
});
bindUIEvent("deploymentManageLoadoutsButton", "click", () => showLoadout("deployment"));
bindUIEvent("loadoutBackButton", "click", closeLoadout);
bindUIEvent("loadoutRosterSort", "change", event => {
    rosterSortMode = event.target.value;
    renderLoadoutRoster();
});
bindUIEvent("deploymentRosterSort", "change", event => {
    rosterSortMode = event.target.value;
    sortDeploymentRosterCards();
});
bindUIEvent("profilePortraitSort", "change", event => {
    rosterSortMode = event.target.value;
    renderProfilePortraitOptions();
});
bindUIEvent("loadoutRosterGrid", "click", event => {
    const card = event.target.closest("button[data-survivor]");
    if (!card) return;
    const id = card.dataset.survivor;
    if (loadoutDraftIds.has(id)) {
        loadoutDraftIds.delete(id);
    } else if (loadoutDraftIds.size < 6) {
        loadoutDraftIds.add(id);
    } else {
        setLoadoutNotice("A loadout can hold six survivors. Remove one before adding another.", "warning");
        return;
    }
    setLoadoutNotice("");
    renderLoadoutRoster();
});
bindUIEvent("loadoutNameInput", "input", event => {
    const title = event.target.value.trim() || "UNNAMED LOADOUT";
    document.getElementById("loadoutPreviewTitle").textContent = title.toUpperCase();
});
bindUIEvent("loadoutForm", "submit", event => {
    event.preventDefault();
    const nameInput = document.getElementById("loadoutNameInput");
    const name = nameInput.value.trim();
    if (loadoutDraftIds.size !== 6) {
        setLoadoutNotice("Select exactly six survivors before saving.", "warning");
        return;
    }
    if (!name) {
        setLoadoutNotice("Give this squad a name first.", "warning");
        nameInput.focus();
        return;
    }
    if (!supabaseUser) {
        setLoadoutNotice("SIGN IN TO SAVE LOADOUTS TO YOUR ACCOUNT.", "warning");
        return;
    }
    const saved = readSavedLoadouts();
    const next = {
        id: loadoutEditingId || (crypto.randomUUID?.() || `loadout-${Date.now()}`),
        name: name.slice(0, 24),
        ids: [...loadoutDraftIds],
        createdAt: new Date().toISOString()
    };
    const index = saved.findIndex(loadout => loadout.id === next.id);
    if (index >= 0) saved[index] = next;
    else saved.unshift(next);
    const nextSaved = saved.slice(0, 12);
    writeSavedLoadouts(nextSaved);
    loadoutEditingId = next.id;
    setLoadoutNotice("SAVING LOADOUT TO YOUR ACCOUNT…", "success");
    renderSavedLoadouts();
    syncSavedLoadouts(nextSaved).then(synced => {
        setLoadoutNotice(
            synced
                ? `${next.name.toUpperCase()} SAVED TO YOUR ACCOUNT.`
                : `${next.name.toUpperCase()} SAVED ON THIS DEVICE. RUN THE LOADOUTS SQL MIGRATION TO SYNC IT.`,
            synced ? "success" : "warning"
        );
    });
});
bindUIEvent("savedLoadoutsList", "click", event => {
    const button = event.target.closest("button[data-loadout-action]");
    if (!button) return;
    const saved = readSavedLoadouts().find(loadout => loadout.id === button.dataset.loadoutId);
    if (!saved) return;
    if (button.dataset.loadoutAction === "use") {
        pendingLoadoutIds = saved.ids.filter(id => survivorDetails[id]?.unlocked === true).slice(0, 6);
        pendingLoadoutName = saved.name;
        setLoadoutNotice(`${saved.name.toUpperCase()} WILL BE READY AT DEPLOYMENT.`, "success");
        if (loadoutReturnScreen === "deployment") {
            loadoutReturnScreen = "menu";
            showDeployment(currentLevel);
        }
        if (loadoutReturnScreen === "levels") {
            loadoutReturnScreen = "menu";
            showLevelSelect();
        }
    } else if (button.dataset.loadoutAction === "edit") {
        loadoutDraftIds = new Set(saved.ids.filter(id => survivorDetails[id]?.unlocked === true).slice(0, 6));
        loadoutEditingId = saved.id;
        document.getElementById("loadoutNameInput").value = saved.name;
        document.getElementById("loadoutPreviewTitle").textContent = saved.name.toUpperCase();
        setLoadoutNotice(`EDITING ${saved.name.toUpperCase()}.`);
        renderLoadoutRoster();
    }
});

bindUIEvent("leaderboardButton", "click", showLeaderboard);
bindUIEvent("muteButton", "click", () => setGameAudioMuted(!gameAudioMuted));
bindUIEvent("leaderboardBackButton", "click", closeLeaderboard);
bindUIEvent("profileButton", "click", showProfile);
bindUIEvent("profileBackButton", "click", closeProfile);
bindUIEvent("profilePortraitOptions", "click", event => {
    const option = event.target.closest("button[data-profile-portrait]");
    if (option) saveProfilePortrait(option.dataset.profilePortrait);
});
bindUIEvent("accountSignInButton", "click", () => submitAccount("sign-in"));
bindUIEvent("accountCreateButton", "click", () => submitAccount("create"));
bindUIEvent("accountSignOutButton", "click", signOutOfAccount);
bindUIEvent("friendRequestForm", "submit", sendFriendRequest);
bindUIEvent("profileFriendsList", "click", handleFriendListClick);
bindUIEvent("friendProfileCloseButton", "click", () => {
    document.getElementById("friendProfileScreen").style.display = "none";
});
bindUIEvent("accountPasswordInput", "keydown", event => {
    if (event.key === "Enter") {
        event.preventDefault();
        submitAccount("sign-in");
    }
});
bindUIEvent("leaderboardMyRunsButton", "click", () => {
    activeLeaderboardScope = activeLeaderboardScope === "runs" ? "global" : "runs";
    renderLeaderboard();
});

bindUIEvent("endlessLeaderboardTab", "click", () => {
    activeLeaderboardMode = "endless";
    activeLeaderboardScope = "global";
    renderLeaderboard();
});

bindUIEvent("dailyLeaderboardTab", "click", () => {
    activeLeaderboardMode = "daily";
    activeLeaderboardScope = "global";
    activeDailyLeaderboardDate = getDailyChallengeDate();
    renderLeaderboard();
});

bindUIEvent("dailyLeaderboardDate", "change", event => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) return;
    if (event.target.value > getDailyChallengeDate()) {
        event.target.value = getDailyChallengeDate();
    }
    activeDailyLeaderboardDate = event.target.value;
    renderLeaderboard();
});

bindUIEvent("submitDailyScoreButton", "click", () => submitDailyChallengeScore());
bindUIEvent("submitVictoryDailyScoreButton", "click", () => submitDailyChallengeScore());

document.querySelectorAll("[data-leaderboard-scope]").forEach(button => {
    button.addEventListener("click", () => {
        activeLeaderboardScope = button.dataset.leaderboardScope;
        renderLeaderboard();
    });
});

document.querySelectorAll("[data-leaderboard-map]").forEach(button => {
    button.addEventListener("click", () => {
        activeLeaderboardMap = Number(button.dataset.leaderboardMap);
        renderLeaderboard();
    });
});

bindUIEvent("returnToMenuButton", "click", () => {
    document.getElementById("gameOverScreen").style.display = "none";
    showMenu();
});
bindUIEvent("submitEndlessScoreButton", "click", submitEndlessRunScore);

bindUIEvent("returnFromVictoryButton", "click", showMenu);

/* SURVIVOR ROSTER SELECTION */


const survivorDetails = {
    mason: {
        name: "Mason",
        role: "HANDGUN",
        icon: "M",
        iconClass: "scout",
        cost: 55,
        rarity: "common",
        unlocked: true
    },
    james: {
        name: "James",
        role: "FLAMETHROWER",
        icon: "J",
        iconClass: "pyro",
        cost: 150,
        rarity: "rare",
        unlocked: true
    },
    cody: {
        name: "Cody",
        role: "GRENADE LAUNCHER",
        icon: "C",
        iconClass: "demo",
        cost: 120,
        rarity: "uncommon",
        unlocked: true
    },
    britney: {
        name: "Britney",
        role: "SNIPER RIFLE",
        icon: "B",
        iconClass: "sniper",
        cost: 160,
        rarity: "rare",
        unlocked: true
    },
    zach: {
        name: "Zach",
        role: "SMG",
        icon: "Z",
        iconClass: "scout",
        cost: 65,
        rarity: "common",
        unlocked: true
    },
    brady: {
        name: "Brady T.",
        role: "SHOTGUN",
        icon: "B",
        iconClass: "demo",
        cost: 100,
        rarity: "uncommon",
        unlocked: true
    }
};

customSurvivors.forEach(survivor => {
    survivorDetails[survivor.id] = {
        name: survivor.name,
        role: survivor.role,
        icon: survivor.name.slice(0, 1).toUpperCase(),
        iconClass: "scout",
        cost: survivorCosts[survivor.id] || survivor.cost,
        unlocked: !survivor.mysteryBoxOnly,
        mysteryBoxOnly: survivor.mysteryBoxOnly,
        custom: true,
        rarity: survivor.rarity,
        portraitData: survivor.portraitData,
        description: survivor.description,
        upgrades: survivor.upgrades
    };
});

try {
    const savedUnlocked = JSON.parse(localStorage.getItem(unlockedSurvivorsKey) || "null");
    if (Array.isArray(savedUnlocked)) {
        unlockedSurvivorOrder = savedUnlocked.filter(id => survivorDetails[id]);
        const unlockedIds = new Set(savedUnlocked);
        Object.entries(survivorDetails).forEach(([id, survivor]) => {
        customSurvivors
            .filter(custom => custom.mysteryBoxOnly)
            .forEach(custom => unlockedIds.delete(custom.id));
        survivor.unlocked = survivor.mysteryBoxOnly
            ? unlockedIds.has(id)
            : (survivor.custom === true || unlockedIds.has(id));
        });
    }
} catch {
    // Use the game's default unlock list when there is no readable local cache.
}

const survivorRarityOrder = {
    common: 0,
    uncommon: 1,
    rare: 2,
    legendary: 3
};

function getSurvivorPortraitSource(id) {
    const survivor = survivorDetails[id];
    return survivor?.portraitData || profilePortraitSources[id] || profilePortraitSources.mason;
}

function getSortedRosterEntries({ unlockedOnly = true, sortMode = rosterSortMode } = {}) {
    const recentOrder = new Map(
        (getLocalUnlockedSurvivors() || []).map((id, index) => [id, index])
    );
    const entries = Object.entries(survivorDetails)
        .filter(([, survivor]) => !unlockedOnly || survivor.unlocked === true);

    return entries.sort(([idA, survivorA], [idB, survivorB]) => {
        if (sortMode === "recent") {
            const recentA = recentOrder.has(idA) ? recentOrder.get(idA) : -1;
            const recentB = recentOrder.has(idB) ? recentOrder.get(idB) : -1;
            if (recentA !== recentB) return recentB - recentA;
        } else {
            const rarityA = survivorRarityOrder[survivorA.rarity] ?? 0;
            const rarityB = survivorRarityOrder[survivorB.rarity] ?? 0;
            if (rarityA !== rarityB) {
                return sortMode === "rarity-desc" ? rarityB - rarityA : rarityA - rarityB;
            }
        }
        return survivorA.name.localeCompare(survivorB.name);
    });
}

function getLoadoutStorageKey() {
    return `${loadoutsKey}.${supabaseUser?.id || "guest"}`;
}

function readSavedLoadouts() {
    try {
        const saved = JSON.parse(localStorage.getItem(getLoadoutStorageKey()) || "[]");
        return normalizeSavedLoadouts(saved);
    } catch {
        return [];
    }
}

function writeSavedLoadouts(loadouts) {
    try {
        localStorage.setItem(getLoadoutStorageKey(), JSON.stringify(loadouts));
    } catch {
        // Loadouts remain available for the current page when storage is unavailable.
    }
}

function normalizeSavedLoadouts(value) {
    if (!Array.isArray(value)) return [];
    return value
        .filter(loadout => loadout && typeof loadout === "object")
        .map((loadout, index) => ({
            id: typeof loadout.id === "string" && loadout.id ? loadout.id : `loadout-${index}`,
            name: String(loadout.name || "LOADOUT").trim().slice(0, 24),
            ids: [...new Set(Array.isArray(loadout.ids) ? loadout.ids : [])]
                .filter(id => survivorDetails[id]?.unlocked === true)
                .slice(0, 6),
            createdAt: loadout.createdAt || new Date().toISOString()
        }))
        .filter(loadout => loadout.name && loadout.ids.length === 6)
        .slice(0, 12);
}

async function syncSavedLoadouts(loadouts) {
    if (!supabaseClient || !supabaseUser) return false;
    try {
        const { error } = await supabaseClient.rpc("save_player_loadouts", {
            p_loadouts: normalizeSavedLoadouts(loadouts)
        });
        if (error) throw error;
        return true;
    } catch (error) {
        console.warn("Loadouts could not sync to the account:", error.message || error);
        return false;
    }
}

function setLoadoutNotice(message, tone = "") {
    const notice = document.getElementById("loadoutNotice");
    if (!notice) return;
    notice.textContent = message;
    notice.dataset.tone = tone;
}

function renderLoadoutSlots() {
    const slots = document.getElementById("loadoutSlots");
    if (!slots) return;
    const selected = [...loadoutDraftIds];
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < 6; index++) {
        const id = selected[index];
        const slot = document.createElement("div");
        slot.className = id ? "loadout-slot is-filled" : "loadout-slot is-empty";
        slot.setAttribute("aria-label", id ? survivorDetails[id]?.name || id : "Empty loadout slot");
        if (id && survivorDetails[id]) {
            const portrait = document.createElement("img");
            portrait.src = getSurvivorPortraitSource(id);
            portrait.alt = "";
            const label = document.createElement("span");
            label.textContent = survivorDetails[id].name;
            slot.append(portrait, label);
        } else {
            slot.innerHTML = "<span aria-hidden=\"true\">+</span><small>EMPTY</small>";
        }
        fragment.append(slot);
    }

    slots.replaceChildren(fragment);
    const count = `${selected.length} / 6`;
    const countDisplay = document.getElementById("loadoutSelectionCount");
    const status = document.getElementById("loadoutPreviewStatus");
    if (countDisplay) countDisplay.textContent = count;
    if (status) status.textContent = `${count} SELECTED`;
    const saveButton = document.getElementById("loadoutSaveButton");
    if (saveButton) saveButton.disabled = selected.length !== 6;
}

function renderLoadoutRoster() {
    const grid = document.getElementById("loadoutRosterGrid");
    if (!grid) return;
    const fragment = document.createDocumentFragment();

    getSortedRosterEntries().forEach(([id, survivor]) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = `loadout-survivor-card rarity-${survivor.rarity || "common"}`;
        card.dataset.survivor = id;
        card.setAttribute("aria-pressed", String(loadoutDraftIds.has(id)));
        if (loadoutDraftIds.has(id)) card.classList.add("selected");

        const portrait = document.createElement("img");
        portrait.src = getSurvivorPortraitSource(id);
        portrait.alt = "";
        portrait.className = "loadout-survivor-portrait";
        const copy = document.createElement("span");
        copy.className = "loadout-survivor-copy";
        const name = document.createElement("strong");
        name.textContent = survivor.name;
        const role = document.createElement("small");
        role.textContent = survivor.role;
        const rarity = document.createElement("em");
        rarity.textContent = (survivor.rarity || "common").toUpperCase();
        copy.append(name, role, rarity);
        const check = document.createElement("span");
        check.className = "loadout-survivor-check";
        check.textContent = loadoutDraftIds.has(id) ? "✓" : "+";
        check.setAttribute("aria-hidden", "true");
        card.append(portrait, copy, check);
        fragment.append(card);
    });

    grid.replaceChildren(fragment);
    const unlockedCount = getSortedRosterEntries().length;
    const totalCount = Object.keys(survivorDetails).length;
    const unlockCount = document.getElementById("loadoutUnlockCount");
    if (unlockCount) {
        unlockCount.innerHTML = `<strong>${unlockedCount}/${totalCount}</strong><span>UNLOCKED</span>`;
    }
    renderLoadoutSlots();
}

function renderSavedLoadouts() {
    const list = document.getElementById("savedLoadoutsList");
    const count = document.getElementById("savedLoadoutCount");
    if (!list) return;
    const saved = readSavedLoadouts();
    if (count) count.textContent = String(saved.length).padStart(2, "0");
    if (saved.length === 0) {
        list.innerHTML = "<p class=\"saved-loadouts-empty\">No presets saved yet. Build your first six-unit squad above.</p>";
        return;
    }

    const fragment = document.createDocumentFragment();
    saved.forEach(loadout => {
        const row = document.createElement("div");
        row.className = "saved-loadout-row";
        const copy = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = loadout.name;
        const summary = document.createElement("small");
        summary.textContent = loadout.ids.map(id => survivorDetails[id]?.name || id).join(" · ");
        copy.append(title, summary);
        const actions = document.createElement("div");
        actions.className = "saved-loadout-actions";
        const useButton = document.createElement("button");
        useButton.type = "button";
        useButton.dataset.loadoutAction = "use";
        useButton.dataset.loadoutId = loadout.id;
        useButton.textContent = "USE";
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.dataset.loadoutAction = "edit";
        editButton.dataset.loadoutId = loadout.id;
        editButton.textContent = "EDIT";
        actions.append(useButton, editButton);
        row.append(copy, actions);
        fragment.append(row);
    });
    list.replaceChildren(fragment);
}

function showLoadout(returnTo = "menu") {
    loadoutReturnScreen = returnTo;
    setMuteButtonVisible(false);
    gameRunning = false;
    previousTime = 0;
    mainMenu.style.display = "none";
    profileScreen.style.display = "none";
    leaderboardScreen.style.display = "none";
    campaignSelect.style.display = "none";
    levelSelect.style.display = "none";
    deploymentScreen.style.display = "none";
    if (loadoutScreen) loadoutScreen.style.display = "block";
    gameLayout.style.display = "none";
    document.getElementById("leaderboardButton").style.visibility = "hidden";
    document.getElementById("profileButton").style.visibility = "hidden";
    document.getElementById("mainMenuButton").style.visibility = "hidden";
    const loadoutBackButton = document.getElementById("loadoutBackButton");
    if (loadoutBackButton) {
        loadoutBackButton.textContent = returnTo === "deployment"
            ? "< BACK TO SQUAD"
            : returnTo === "levels"
                ? "< ENDLESS SELECT"
                : "< MAIN MENU";
    }
    loadoutEditingId = null;
    loadoutDraftIds = new Set();
    const loadoutSort = document.getElementById("loadoutRosterSort");
    if (loadoutSort) loadoutSort.value = rosterSortMode;
    document.getElementById("loadoutNameInput").value = "";
    document.getElementById("loadoutPreviewTitle").textContent = "UNNAMED LOADOUT";
    setLoadoutNotice("");
    renderLoadoutRoster();
    renderSavedLoadouts();
}

function closeLoadout() {
    if (loadoutReturnScreen === "deployment") {
        loadoutReturnScreen = "menu";
        showDeployment(currentLevel);
        return;
    }
    if (loadoutReturnScreen === "levels") {
        loadoutReturnScreen = "menu";
        showLevelSelect();
        return;
    }
    loadoutReturnScreen = "menu";
    showMenu();
}

function sortDeploymentRosterCards() {
    const roster = document.getElementById("deploymentRoster");
    if (!roster) return;
    const order = new Map(getSortedRosterEntries({ unlockedOnly: false }).map(([id], index) => [id, index]));
    [...roster.querySelectorAll("button[data-survivor]")]
        .sort((a, b) => (order.get(a.dataset.survivor) ?? 999) - (order.get(b.dataset.survivor) ?? 999))
        .forEach(card => roster.append(card));
}

function renderMenuCrewRoster() {
    const portraitStrip = document.querySelector(".menu-crew-portraits");
    if (!portraitStrip) return;
    const unlocked = Object.entries(survivorDetails).filter(([, survivor]) => survivor.unlocked === true);
    const fragment = document.createDocumentFragment();
    unlocked.forEach(([id, survivor]) => {
        const portrait = document.createElement("img");
        portrait.src = survivor.portraitData || profilePortraitSources[id] || profilePortraitSources.mason;
        portrait.alt = "";
        portrait.title = survivor.name;
        if (survivor.custom) portrait.dataset.rarity = survivor.rarity;
        fragment.append(portrait);
    });
    portraitStrip.replaceChildren(fragment);
    portraitStrip.setAttribute("aria-label", unlocked.map(([, survivor]) => survivor.name).join(", "));
    const count = document.querySelector(".menu-crew-count");
    if (count) {
        count.replaceChildren(document.createTextNode(String(unlocked.length).padStart(2, "0") + " "));
        const available = document.createElement("small");
        available.textContent = "AVAILABLE";
        count.append(available);
    }
}
renderMenuCrewRoster();

updateProfileIdentity();

function getMaxRosterSize() {
    return isEndlessStyleMode() ? 6 : gameMode === "daily" ? 3 : 4;
}

const rosterCount = document.getElementById("rosterCount");

// Retain the full roster so Daily Challenge can offer its date-seeded trial squad,
// including survivors a player has not unlocked in their own save.
const deploymentRoster = document.getElementById("deploymentRoster");
deploymentRoster.querySelectorAll(".locked, .locked-slot, [data-unlocked='false']")
    .forEach(slot => slot.remove());
deploymentRoster.querySelectorAll("button[data-survivor]").forEach(card => {
    const survivor = survivorDetails[card.dataset.survivor];
    if (!survivor) card.remove();
});

const customRosterFragment = document.createDocumentFragment();
customSurvivors.forEach(survivor => {
    const card = document.createElement("button");
    card.className = `deploy-card rarity-${survivor.rarity}`;
    card.dataset.survivor = survivor.id;
    card.type = "button";
    card.setAttribute("aria-pressed", "false");

    const portrait = document.createElement("img");
    portrait.className = "survivor-portrait-placeholder";
    portrait.src = survivor.portraitData;
    portrait.alt = `${survivor.name}'s portrait`;
    portrait.dataset.rarity = survivor.rarity;

    const info = document.createElement("div");
    info.className = "survivor-card-info";
    const name = document.createElement("strong");
    name.textContent = survivor.name;
    const role = document.createElement("span");
    role.textContent = survivor.role;
    const description = document.createElement("small");
    description.textContent = survivor.description;
    info.append(name, role, description);

    const rarity = document.createElement("span");
    rarity.className = `survivor-rarity rarity-${survivor.rarity}`;
    rarity.textContent = survivor.rarity.toUpperCase();
    card.append(portrait, info, rarity);
    customRosterFragment.append(card);
});
deploymentRoster.append(customRosterFragment);

function updateRosterSummary() {
    rosterCount.textContent = `${selectedSurvivors.size}/${getMaxRosterSize()}`;
}

const survivorCards = document.querySelectorAll(
    "#deploymentRoster button[data-survivor]"
);

// Keep the squad-picker badge and accent tied to the same rarity source used
// by the in-game dossier.  The six built-in cards start as static HTML, so
// normalizing them here prevents a stale label (for example COMMON) from
// disagreeing with the survivor's actual accent color.
function syncDeploymentRarityLabels() {
    const rarityLabels = {
        common: "Common",
        uncommon: "Uncommon",
        rare: "Rare",
        legendary: "Legendary"
    };

    survivorCards.forEach(card => {
        const id = card.dataset.survivor;
        if (!survivorDetails[id]) return;

        const rarity = getSurvivorRarity(id);
        card.classList.remove(
            "rarity-common",
            "rarity-uncommon",
            "rarity-rare",
            "rarity-legendary"
        );
        card.classList.add(`rarity-${rarity}`);

        const badge = card.querySelector(".survivor-rarity");
        if (!badge) return;
        badge.className = `survivor-rarity rarity-${rarity}`;
        badge.textContent = rarity.toUpperCase();
        badge.setAttribute("aria-label", `${rarityLabels[rarity] || "Common"} rarity`);
    });
}

syncDeploymentRarityLabels();
sortDeploymentRosterCards();

function updateDeploymentRosterAvailability() {
    survivorCards.forEach(card => {
        const available = isSurvivorAvailableForCurrentMode(card.dataset.survivor);
        card.hidden = !available;
        card.disabled = !available;
        if (!available) {
            selectedSurvivors.delete(card.dataset.survivor);
            card.classList.remove("selected");
            card.setAttribute("aria-pressed", "false");
        }
    });
}

survivorCards.forEach(card => {
    card.addEventListener("click", () => {
        const survivorId = card.dataset.survivor;

        if (isGuidedCampaignOperation()) {
            document.getElementById("deploymentMessage").textContent =
                "The opening squad is locked for this operation.";
            return;
        }

        if (!isSurvivorAvailableForCurrentMode(survivorId)) {
            document.getElementById("deploymentMessage").textContent =
                "That survivor is locked. Unlock them in SHOP / RECRUIT first.";
            return;
        }

        if (selectedSurvivors.has(survivorId)) {
    // Click again to remove this survivor.
    selectedSurvivors.delete(survivorId);
    card.classList.remove("selected");
            card.setAttribute("aria-pressed", "false");

    document.getElementById("deploymentMessage").textContent = "";

} else {
            const maxRosterSize = getMaxRosterSize();

if (selectedSurvivors.size >= maxRosterSize) {
    document.getElementById("deploymentMessage").textContent =
        "Your roster is full! Maximum: " +
        maxRosterSize + " survivors.";
    return;
}

            selectedSurvivors.add(survivorId);
            card.classList.add("selected");
            card.setAttribute("aria-pressed", "true");
            document.getElementById("deploymentMessage").textContent =
                `${survivorDetails[survivorId].name} added to the squad.`;
        }

        updateRosterSummary();
    });
});

function populateInGameRoster() {
    const rosterList = document.getElementById("inGameSurvivorList");
    const rosterCountDisplay = document.getElementById("inGameRosterCount");
    

    rosterList.innerHTML = "";

    selectedSurvivors.forEach(function(id) {
        const person = survivorDetails[id];

        if (!person) return;

        const rarity = person.rarity || getSurvivorRarity(id);
        const card = document.createElement("div");
        card.className = `survivor-card rarity-${rarity}`;
        card.dataset.survivor = id;
        card.dataset.rarity = rarity;

        
const portraitFiles = {
    mason: "model-portraits/Mason.png",
    james: "model-portraits/James.png",
    cody: "model-portraits/Cody.png",
    britney: "model-portraits/Britney.png",
    zach: "model-portraits/Zach.png",
    brady: "model-portraits/Brady.png"
};

const portrait = document.createElement("img");
portrait.className = "survivor-portrait-placeholder";
portrait.dataset.portraitId = id;
portrait.src = person.portraitData || `Images/${portraitFiles[id] || "Mason.png"}`;
portrait.alt = person.name;
portrait.dataset.rarity = rarity;

const unitInfo = document.createElement("span");
unitInfo.className = "unit-info";
const name = document.createElement("strong");
name.textContent = person.name;
const role = document.createElement("small");
role.className = "unit-role";
role.textContent = survivorAbilityTags[id]
    ? `${person.role} · ${survivorAbilityTags[id]}`
    : person.role;
role.title = survivorAbilityTags[id] || person.role;
const cost = document.createElement("strong");
cost.className = "unit-cost";
const costValue = document.createElement("span");
costValue.textContent = survivorCosts[id] ?? person.cost;
cost.append(costValue, document.createTextNode(" SCRAP"));
unitInfo.append(name, role, cost);
card.append(portrait, unitInfo);


        rosterList.appendChild(card);

card.addEventListener("click", () => {
    // Always open the dossier first.  An unaffordable card can still be
    // inspected; it simply cannot be selected for deployment.
    showSurvivorDetails(id);

    if (gameRunning && scrap < survivorCosts[id]) {
        selectedSurvivor = null;
        document.querySelectorAll("#inGameSurvivorList .survivor-card")
            .forEach(rosterCard => rosterCard.classList.remove("selected"));
        showInsufficientScrapToast();
        updateDeploymentMessage(
            `Need ${survivorCosts[id] - scrap} more scrap to deploy ${survivorDetails[id]?.name || id}.`
        );
        return;
    }

    selectSurvivorToDeploy(id);
    
});
    });

    rosterCountDisplay.textContent = selectedSurvivors.size + " UNITS";
    updateInGameRosterAffordability();
}

// On phones, press and hold a roster card briefly before dragging it onto the
// battlefield. Waiting for a hold keeps ordinary swipes available for scrolling.
const inGameSurvivorList = document.getElementById("inGameSurvivorList");
let touchSurvivorDrag = null;
let touchSurvivorDragTimer = null;
let suppressRosterClickUntil = 0;
let touchDragRenderQueued = false;

function clearTouchSurvivorDrag() {
    if (touchSurvivorDragTimer !== null) {
        clearTimeout(touchSurvivorDragTimer);
        touchSurvivorDragTimer = null;
    }

    if (touchSurvivorDrag?.active) {
        touchSurvivorDrag.card.classList.remove("is-drag-source");
        mouseOnCanvas = false;
    }

    document.body.classList.remove("is-survivor-dragging");
    document.querySelector(".battlefield")?.classList.remove("is-survivor-drop-target");
    touchSurvivorDrag = null;
}

// A touch drag may still produce a compatibility click on its original card.
// Suppress that click so it cannot reselect a survivor immediately after drop.
inGameSurvivorList.addEventListener("click", event => {
    if (!event.isTrusted || performance.now() > suppressRosterClickUntil) return;
    if (!event.target.closest(".survivor-card")) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    suppressRosterClickUntil = 0;
}, true);

inGameSurvivorList.addEventListener("touchstart", event => {
    const touch = event.touches[0];
    const card = event.target.closest(".survivor-card");

    if (
        !touch ||
        !card ||
        event.touches.length !== 1 ||
        !gameRunning ||
        !selectedSurvivors.has(card.dataset.survivor)
    ) return;

    clearTouchSurvivorDrag();
    const drag = {
        id: card.dataset.survivor,
        card,
        startX: touch.clientX,
        startY: touch.clientY,
        armed: false,
        active: false
    };
    touchSurvivorDrag = drag;
    touchSurvivorDragTimer = window.setTimeout(() => {
        if (touchSurvivorDrag === drag && gameRunning) {
            drag.armed = true;
        }
        touchSurvivorDragTimer = null;
    }, 180);
}, { passive: true });

document.addEventListener("touchmove", event => {
    const drag = touchSurvivorDrag;
    if (!drag || event.touches.length !== 1) return;

    const touch = event.touches[0];
    if (!drag.armed && !drag.active) {
        if (Math.hypot(touch.clientX - drag.startX, touch.clientY - drag.startY) > 10) {
            clearTouchSurvivorDrag();
        }
        return;
    }

    if (!drag.active) {
        if (Math.hypot(touch.clientX - drag.startX, touch.clientY - drag.startY) <= 8) return;
        if (scrap < survivorCosts[drag.id]) {
            event.preventDefault();
            showInsufficientScrapToast();
            clearTouchSurvivorDrag();
            return;
        }
        drag.active = true;
        selectSurvivorToDeploy(drag.id);
        drag.card.classList.add("is-drag-source");
        document.body.classList.add("is-survivor-dragging");
    }

    event.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const overCanvas =
        touch.clientX >= rect.left && touch.clientX <= rect.right &&
        touch.clientY >= rect.top && touch.clientY <= rect.bottom;
    document.querySelector(".battlefield")?.classList.toggle("is-survivor-drop-target", overCanvas);
    mouseOnCanvas = overCanvas;

    if (overCanvas) {
        mouseX = (touch.clientX - rect.left) * canvas.width / rect.width;
        mouseY = (touch.clientY - rect.top) * canvas.height / rect.height;
        // A finger can generate dozens of touchmove events per frame. Queue
        // at most one preview render so mobile drag feedback cannot starve
        // the browser's animation budget.
        if (!touchDragRenderQueued) {
            touchDragRenderQueued = true;
            window.requestAnimationFrame(() => {
                touchDragRenderQueued = false;
                if (touchSurvivorDrag?.active) renderGame();
            });
        }
    }
}, { passive: false });

document.addEventListener("touchend", event => {
    const drag = touchSurvivorDrag;
    if (!drag) return;

    const touch = event.changedTouches[0];
    if (drag.active && touch) {
        const rect = canvas.getBoundingClientRect();
        const droppedOnCanvas =
            touch.clientX >= rect.left && touch.clientX <= rect.right &&
            touch.clientY >= rect.top && touch.clientY <= rect.bottom;

        if (droppedOnCanvas) {
            ignoreCanvasDropClick = {
                until: performance.now() + 500,
                x: touch.clientX,
                y: touch.clientY
            };
            const ignoredClick = ignoreCanvasDropClick;
            canvas.dispatchEvent(new MouseEvent("click", {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: touch.clientX,
                clientY: touch.clientY
            }));
            window.setTimeout(() => {
                if (ignoreCanvasDropClick === ignoredClick) ignoreCanvasDropClick = null;
            }, 550);
        }

        // Prevent a browser-generated touch click from selecting the source card again.
        suppressRosterClickUntil = performance.now() + 650;
    }

    clearTouchSurvivorDrag();
}, { passive: true });

document.addEventListener("touchcancel", clearTouchSurvivorDrag, { passive: true });

bindUIEvent("cancelPlacementButton", "click", () => {
    selectedSurvivor = null;

    hideSurvivorDetails();

    document.querySelectorAll("#inGameSurvivorList .survivor-card")
        .forEach(card => card.classList.remove("selected"));

    updateDeploymentMessage("Placement cancelled. Select a survivor to deploy.");
});


let expandedWavePreviewKey = null;
let wavePreviewRenderWave = null;
let wavePreviewExpanded = false;

function updateWavePreview() {
    const preview = document.getElementById("wavePreview");
    if (!preview) return;

    // The HUD intentionally displays WAVE 0 while the player is preparing
    // the first wave, but the intel panel should still preview Wave 1. Using
    // a normalized value also keeps a click-to-expand refresh from rendering
    // an empty list during that preparation state.
    const previewWave = Math.max(1, Number(currentWave) || 1);

    if (wavePreviewRenderWave !== previewWave) {
        expandedWavePreviewKey = null;
        wavePreviewExpanded = false;
        wavePreviewRenderWave = previewWave;
    }

    const groups = getWaveGroups(previewWave);
    const totalEnemies = groups.reduce((total, group) => total + group.count, 0);
    const splitterChildren = groups.reduce((total, group) => {
        const types = group.types?.length ? group.types : [group.type];
        const snakeCount = group.types?.length
            ? types.filter(type => getEnemyProfile(type).isSplitter).length
            : getEnemyProfile(group.type).isSplitter ? group.count : 0;
        return total + snakeCount * 2;
    }, 0);
    const visibleEnemyTotal = totalEnemies + splitterChildren;
    const waveTypes = new Set(groups.flatMap(group =>
        group.types?.length ? group.types : [group.type]
    ));
    const hasHollow = waveTypes.has("hollow") && !groups.some(group => group.specialRole === "miniBoss");
    const hasHeavy = [...waveTypes].some(type => getEnemyProfile(type).isHeavy);
    const hasSkitter = waveTypes.has("skitter");
    const hasMiniBoss = groups.some(group => group.specialRole === "miniBoss");
    const bossCount = groups
        .filter(group => group.specialRole === "boss")
        .reduce((total, group) => total + group.count, 0);
    const miniBossCount = groups
        .filter(group => group.specialRole === "miniBoss")
        .reduce((total, group) => total + group.count, 0);
    const regularCount = totalEnemies - miniBossCount - bossCount;
    const threat = hasHollow || hasHeavy || hasMiniBoss || bossCount > 0 || visibleEnemyTotal >= 30
        ? "SEVERE"
        : visibleEnemyTotal >= 20
            ? "HIGH"
            : visibleEnemyTotal >= 12
                ? "ELEVATED"
                : "LOW";

    document.getElementById("previewWaveTitle").textContent =
        `WAVE ${previewWave} INTEL`;
    document.getElementById("previewThreat").textContent = threat;

    const enemyList = document.getElementById("previewEnemyList");
    if (!enemyList) return;

    // Keep the preview compact even when an older cached stylesheet still
    // contains the former full-width enemy-row rules.
    enemyList.style.display = "grid";
    enemyList.style.gridTemplateColumns = "repeat(auto-fill, 64px)";
    // Keep the compact tiles in fixed-size columns. The selected enemy's
    // intel is a normal full-width grid item appended after the tiles, so it
    // pushes the roster down naturally instead of floating over it.
    enemyList.style.gridAutoRows = "max-content";
    enemyList.style.alignContent = "start";
    enemyList.style.justifyContent = "start";
    enemyList.style.gap = "5px";

    const rows = [];
    const rowByKey = new Map();
    const addRow = (type, count, specialRole = "regular") => {
        if (!type || !count) return;
        const key = `${specialRole}:${type}`;
        const existing = rowByKey.get(key);
        if (existing) {
            existing.count += count;
            return;
        }
        const row = { type, count, specialRole };
        rowByKey.set(key, row);
        rows.push(row);
    };

    groups.forEach(group => {
        const types = group.types?.length ? group.types : [group.type];
        if (group.types?.length) {
            types.forEach(type => addRow(type, 1, group.specialRole || "regular"));
        } else {
            addRow(group.type, group.count, group.specialRole || "regular");
        }
    });

    const fragment = document.createDocumentFragment();
    const detailPanel = document.getElementById("previewEnemyDetail");
    const expandButton = document.getElementById("wavePreviewExpandButton");
    if (!wavePreviewExpanded) expandedWavePreviewKey = null;
    // Show one visual row in the compact state (rather than just one enemy
    // type). The calculation follows the panel width so desktop and mobile
    // keep the same tidy one-row treatment.
    const tileSize = 64;
    const tileGap = 5;
    const compactColumnCount = Math.max(
        1,
        Math.floor(((enemyList.clientWidth || 300) + tileGap) / (tileSize + tileGap))
    );
    const visibleRows = wavePreviewExpanded
        ? rows
        : rows.slice(0, compactColumnCount);
    let expandedDetail = null;
    visibleRows.forEach(({ type, count, specialRole }) => {
        const profile = getEnemyProfile(type);
        const label = enemyLabels[type] || "HOSTILE";
        const roleClass = specialRole === "boss"
            ? "boss"
            : specialRole === "miniBoss"
                ? "mini-boss"
                : "regular";
        const roleLabel = specialRole === "boss"
            ? `BOSS · ${label}`
            : specialRole === "miniBoss"
                ? `MINI-BOSS · ${label}`
                : label;
        const roleHint = specialRole === "boss"
            ? "Heavy boss contact"
            : specialRole === "miniBoss"
                ? "Empowered contact"
                : profile.variantRole === "runner"
                    ? "Fast, fragile runner"
                    : profile.variantRole === "brute"
                        ? "Slow, durable brute"
                        : profile.variantRole === "fireproof splitter"
                            ? "Fireproof splitter"
                            : profile.isSplitter
                                ? "Splits on defeat"
                                : profile.isArmored
                                    ? "Armored contact"
                                    : profile.isMedic
                                        ? "Heals nearby hostiles"
                                        : profile.isHeavy
                                            ? "Heavy hostile contact"
                                            : "Hostile contact";
        const weaknessHint = getEnemyWeaknessHint(type);
        const hint = weaknessHint === "Hostile contact"
            ? roleHint
            : `${roleHint} · ${weaknessHint}`;
        const splitChildren = profile.isSplitter ? count * 2 : 0;
        const previewKey = `${specialRole}:${type}`;
        const isExpanded = expandedWavePreviewKey === previewKey;
        const previewHealth = getEnemyHealthForWave(type, specialRole, previewWave);

        const row = document.createElement("div");
        row.className = `preview-enemy enemy-${roleClass}`;
        row.classList.toggle("is-selected", isExpanded);
        row.setAttribute("role", "button");
        row.setAttribute("aria-expanded", String(isExpanded));
        row.tabIndex = 0;
        row.title = hint;
        row.setAttribute("aria-label", `${roleLabel}: ${hint}; ${count} spawned${splitChildren ? `, plus ${splitChildren} skitters on defeat` : ""}`);
        row.style.width = "64px";
        row.style.height = "64px";
        row.style.minWidth = "64px";
        row.style.minHeight = "64px";
        row.style.flex = "0 0 64px";
        row.style.aspectRatio = "auto";
        const image = document.createElement("img");
        image.src = profile.image.src;
        image.alt = label;
        const info = document.createElement("div");
        info.className = "preview-enemy-info";
        const name = document.createElement("strong");
        name.textContent = roleLabel;
        const description = document.createElement("span");
        const firstWeakness = Object.entries(profile.weaknesses || {})[0];
        const firstResistance = Object.entries(profile.resistances || {})[0];
        const compactHint = splitChildren
            ? profile.isFireImmune ? "FIRE IMMUNE · SPLITS" : "SPLITS"
            : profile.isFireImmune
                ? "FIRE IMMUNE"
                : firstWeakness
                    ? `WEAK ${(damageTypeLabels[firstWeakness[0]] || firstWeakness[0]).replace(/ damage$/i, "").toUpperCase()}`
                    : firstResistance
                        ? `RESISTS ${(damageTypeLabels[firstResistance[0]] || firstResistance[0]).replace(/ damage$/i, "").toUpperCase()}`
                        : profile.isArmored
                            ? "ARMORED"
                            : profile.isMedic
                                ? "MEDIC"
                                : profile.isHeavy
                                    ? "HEAVY"
                                    : "HOSTILE";
        description.textContent = compactHint;
        description.style.display = "block";
        description.style.maxWidth = "100%";
        description.style.overflow = "hidden";
        description.style.textOverflow = "ellipsis";
        description.style.whiteSpace = "nowrap";
        info.append(name, description);
        const countElement = document.createElement("span");
        countElement.className = "preview-enemy-count";
        countElement.textContent = splitChildren
            ? `×${count} +${splitChildren}`
            : `×${count}`;
        const detail = document.createElement("div");
        detail.className = "preview-enemy-detail-content";
        const health = document.createElement("strong");
        health.textContent = `HEALTH ${previewHealth} HP`;
        const detailDescription = document.createElement("span");
        detailDescription.textContent = enemyDescriptions[type] || hint;
        const detailIntel = document.createElement("span");
        detailIntel.textContent = hint;
        detail.append(health, detailDescription, detailIntel);
        row.append(image, info, countElement);
        if (isExpanded) expandedDetail = detail;
        const toggleExpanded = () => {
            // A tile click is also a convenient way to inspect the intel. If
            // the panel is collapsed, reveal the full list first so the detail
            // card stays in normal document flow instead of becoming a popout.
            if (!wavePreviewExpanded) wavePreviewExpanded = true;
            expandedWavePreviewKey = isExpanded ? null : previewKey;
            updateWavePreview();
        };
        row.addEventListener("click", toggleExpanded);
        row.addEventListener("keydown", event => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            toggleExpanded();
        });
        fragment.appendChild(row);
    });
    enemyList.replaceChildren(fragment);

    // Keep expanded intel outside the tile grid. This prevents legacy grid
    // rules from turning the detail into an absolutely positioned popout.
    if (detailPanel) {
        detailPanel.replaceChildren();
        if (expandedDetail) {
            detailPanel.appendChild(expandedDetail);
            detailPanel.hidden = false;
        } else {
            detailPanel.hidden = true;
        }
    }

    if (expandButton) {
        const hasMoreRows = rows.length > compactColumnCount;
        expandButton.hidden = !hasMoreRows;
        expandButton.setAttribute("aria-expanded", String(wavePreviewExpanded));
        expandButton.textContent = wavePreviewExpanded
            ? "COLLAPSE INTEL"
            : `EXPAND INTEL · ${rows.length} TYPES`;
    }
}

bindUIEvent("wavePreviewExpandButton", "click", () => {
    wavePreviewExpanded = !wavePreviewExpanded;
    expandedWavePreviewKey = null;
    updateWavePreview();
});

function updateSellButton() {
    const sellButton = document.getElementById("sellSurvivorButton");

    if (!sellButton) return;

    if (!inspectedSurvivor) {
        sellButton.textContent = "SELL";
        return;
    }

    const refund = Math.floor(getSurvivorTotalInvestment(inspectedSurvivor) * 0.75);

    sellButton.textContent = "SELL — " + refund + " SCRAP";
}

bindUIEvent("upgradeSurvivorButton", "click", () => {
    const survivor = inspectedSurvivor;
    if (!survivor || !survivors.includes(survivor) || selectedSurvivor || !gameRunning) return;

    const currentLevel = getSurvivorUpgradeLevel(survivor);
    if (currentLevel >= maxSurvivorUpgradeLevel) return;

    const cost = getSurvivorUpgradeCost(survivor.type, currentLevel + 1);
    if (scrap < cost) {
        updateSurvivorUpgradeButton(survivor);
        return;
    }

    scrap -= cost;
    survivor.upgradeLevel = currentLevel + 1;
    triggerSurvivorUpgradeFeedback(survivor, survivor.upgradeLevel);
    playSurvivorUpgradeSound(survivor.upgradeLevel);
    recordEndlessTelemetryEvent({
        kind: "upgrade",
        survivorId: getEndlessTelemetrySurvivorId(survivor),
        survivor: survivor.type,
        fromLevel: currentLevel,
        toLevel: currentLevel + 1,
        cost,
        scrapAfter: Math.max(0, Math.round(scrap))
    });
    updateScrapDisplay();
    updateSellButton();
    showSurvivorDetails(survivor.type);
    renderGame();
});

bindUIEvent("sellSurvivorButton", "click", () => {
    if (!inspectedSurvivor) return;

    const refund = Math.floor(getSurvivorTotalInvestment(inspectedSurvivor) * 0.75);
    const index = survivors.indexOf(inspectedSurvivor);

    if (index === -1) return;

    recordEndlessTelemetryEvent({
        kind: "sell",
        survivorId: getEndlessTelemetrySurvivorId(inspectedSurvivor),
        survivor: inspectedSurvivor.type,
        level: getSurvivorUpgradeLevel(inspectedSurvivor),
        refund,
        x: Math.round(Number(inspectedSurvivor.x) || 0),
        y: Math.round(Number(inspectedSurvivor.y) || 0),
        damageDealt: Math.round(Number(inspectedSurvivor.damageDealt) || 0),
        kills: Math.max(0, Math.floor(Number(inspectedSurvivor.kills) || 0))
    });

    survivors.splice(index, 1);
    scrap += refund;
    inspectedSurvivor = null;

    hideSurvivorDetails();

    updateScrapDisplay();
    updateDeploymentMessage("Survivor sold for " + refund + " scrap!");
    updateSellButton();
    updateMoveButton();
    renderGame();
});

bindUIEvent("moveSurvivorButton", "click", () => {
    if (!inspectedSurvivor || waveRunning || !gameRunning) return;

    moveMode = true;
    updateMoveButton();

    updateDeploymentMessage(
        "Choose a new location for " + inspectedSurvivor.name + "."
    );
});


function updateMoveButton() {
    const moveButton = document.getElementById("moveSurvivorButton");

    if (!moveButton) return;

    moveButton.disabled = !inspectedSurvivor || waveRunning || !gameRunning;
    moveButton.textContent = moveMode ? "CLICK A NEW SPOT" : "MOVE";
}

initializeSupabaseAccount();


