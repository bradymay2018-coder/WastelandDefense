
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

    document.getElementById("survivorDetailsPanel").style.display = "none";

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
const horizontalEnemyLaneVisualOffset = -7;

let currentLevel = 1;
let gameMode = "campaign";
let activeCampaignRunId = null;
let activeEndlessRunId = null;
let pendingEndlessScore = null;
let returnEndlessScoreSubmission = null;
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
const enemyDamage = 12;

const enemyProfiles = {
    spider: {
        image: spiderImage,
        baseHealth: 100,
        speed: 69,
        size: 22,
        spriteWidth: 44,
        spriteHeight: 44,
        leakDamage: enemyDamage
    },
    skitter: {
        image: skitterImage,
        baseHealth: 72,
        speed: 100,
        size: 22,
        spriteWidth: 44,
        spriteHeight: 44,
        leakDamage: 8
    },
    hollow: {
        image: hollowImage,
        baseHealth: 220,
        speed: 50,
        size: 32,
        spriteWidth: 32,
        spriteHeight: 64,
        leakDamage: 25,
        isBoss: true
    },
    fogkeeper: {
        image: fogkeeperImage,
        baseHealth: 185,
        speed: 54,
        size: 28,
        spriteWidth: 32,
        spriteHeight: 64,
        leakDamage: 18,
        isHeavy: true
    },
    heavymutant: {
        image: heavyMutantImage,
        baseHealth: 205,
        speed: 48,
        size: 28,
        spriteWidth: 32,
        spriteHeight: 64,
        leakDamage: 20,
        isHeavy: true
    },
    wastelandcow: {
        image: wastelandCowImage,
        baseHealth: 100,
        speed: 69,
        size: 22,
        spriteWidth: 44,
        spriteHeight: 44,
        leakDamage: enemyDamage
    },
    mutantman: {
        image: mutantManImage,
        baseHealth: 100,
        speed: 69,
        size: 22,
        spriteWidth: 44,
        spriteHeight: 44,
        leakDamage: enemyDamage
    },
    mutantsnake: {
        image: mutantSnakeImage,
        baseHealth: 125,
        speed: 100,
        size: 23,
        spriteWidth: 44,
        spriteHeight: 44,
        leakDamage: 10
    }
};

const enemyLabels = {
    spider: "SPIDER",
    skitter: "SKITTER",
    hollow: "THE HOLLOW",
    fogkeeper: "FOGKEEPER",
    heavymutant: "HEAVY MUTANT",
    wastelandcow: "WASTELAND COW",
    mutantman: "MUTANT MAN",
    mutantsnake: "MUTANT SNAKE"
};

function getEnemyProfile(type) {
    return enemyProfiles[type] || enemyProfiles.spider;
}

function interleaveEnemyTypes(typeCounts) {
    const remaining = Object.entries(typeCounts)
        .filter(([, count]) => count > 0)
        .map(([type, count]) => ({ type, count, spawned: 0 }));
    const sequence = [];

    while (sequence.length < remaining.reduce((total, entry) => total + entry.count, 0)) {
        for (const entry of remaining) {
            if (entry.spawned >= entry.count) continue;
            sequence.push(entry.type);
            entry.spawned++;
        }
    }

    return sequence;
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

function spawnEnemy(type = "spider", specialRole = "normal") {
    const profile = getEnemyProfile(type);
    const endlessDifficultyTier = gameMode === "endless" && currentWave >= 10
        ? Math.floor((currentWave - 10) / 5) + 1
        : 0;
    // Endless enemies gain durability faster so a fully upgraded squad cannot
    // flatten later waves at the same pace as the campaign.
    const healthGrowthPerWave = gameMode === "endless" ? 0.065 : 0.045;
    const waveHealthScale =
        (1 + Math.max(0, currentWave - 3) * healthGrowthPerWave) *
        (1 + endlessDifficultyTier * 0.12);
    const endlessStartingHealthScale = gameMode === "endless" ? 0.5 : 1;
    const specialHealthScale = specialRole === "boss"
        ? 1.5
        : specialRole === "miniBoss"
            ? 1.25
            : 1;
    const specialSpeedScale = specialRole === "boss"
        ? 0.5
        : specialRole === "miniBoss"
            ? 0.75
            : 1;
    const sizeScale = specialRole === "boss"
        ? 1.5
        : specialRole === "miniBoss"
            ? 1.25
            : 1;
    const health = Math.round(
        profile.baseHealth * waveHealthScale * endlessStartingHealthScale * specialHealthScale
    );

    enemies.push({
        type: type,
        x: roadPoints[0].x,
        y: roadPoints[0].y,
        targetPoint: 1,
        visualLaneOffsetY: roadPoints[0].y === roadPoints[1]?.y
            ? horizontalEnemyLaneVisualOffset
            : 0,
        speed: profile.speed * (1 + endlessDifficultyTier * 0.035) * specialSpeedScale,
        size: profile.size * sizeScale,
        sizeScale,
        isMiniBoss: specialRole === "miniBoss",
        isWaveBoss: specialRole === "boss",
        health: health,
        maxHealth: health
    });
}

function getWaveGroups(wave) {
    const waveGroups = {
        1: [{ type: "spider", count: 10 }],
        2: [
            { type: "skitter", count: 5 },
            { type: "spider", count: 5 }
        ],
        3: [
            { type: "skitter", count: 10 },
            { type: "spider", count: 10 }
        ],
        4: [
            { type: "skitter", count: 12 },
            { type: "spider", count: 13 }
        ],
        5: [
            { type: "skitter", count: 15 },
            { type: "hollow", count: 1 }
        ]
    };

    if (waveGroups[wave] && !(gameMode === "endless" && wave >= 5)) {
        return waveGroups[wave];
    }

    const endlessDifficultyTier = gameMode === "endless" && wave >= 10
        ? Math.floor((wave - 10) / 5) + 1
        : 0;
    const totalEnemies = gameMode === "endless" && wave >= 6
        ? 16 + Math.floor((wave - 5) * 2.5) + endlessDifficultyTier * 2
        : 5 + (wave - 1) * 2;
    const skitterRatio = gameMode === "endless"
        ? Math.min(0.42, 0.28 + Math.max(0, wave - 6) * 0.012)
        : Math.min(0.38, 0.26 + Math.max(0, wave - 6) * 0.015);
    const skitterCount = Math.floor(totalEnemies * skitterRatio);
    const snakeCount = wave >= 8
        ? Math.max(1, Math.floor(totalEnemies * 0.08))
        : 0;
    const heavyCount = gameMode !== "endless" && wave >= 10 && wave % 5 === 0
        ? Math.min(3, 1 + Math.floor((wave - 10) / 10))
        : 0;
    const standardCount = Math.max(0, totalEnemies - skitterCount - snakeCount);
    const cowCount = wave >= 6 ? Math.floor(standardCount * 0.1) : 0;
    const mutantManCount = wave >= 6 ? Math.floor(standardCount * 0.1) : 0;
    const heavyType = Math.floor(wave / 5) % 2 === 0
        ? "fogkeeper"
        : "heavymutant";
    const spiderCount = Math.max(
        0,
        standardCount - cowCount - mutantManCount - heavyCount
    );

    const standardTypes = interleaveEnemyTypes({
        spider: spiderCount,
        wastelandcow: cowCount,
        mutantman: mutantManCount,
        [heavyType]: heavyCount
    });
    const fastTypes = interleaveEnemyTypes({
        skitter: skitterCount,
        mutantsnake: snakeCount
    });
    const groups = [
        { types: standardTypes, count: standardTypes.length },
        { types: fastTypes, count: fastTypes.length }
    ].filter(group => group.count > 0);

    if (gameMode === "endless") {
        const isBossWave = wave % 10 === 0;
        const isMiniBossWave = wave % 5 === 0;

        if (isMiniBossWave) {
            const miniBossCount = isBossWave ? wave / 10 : 1;
            const miniBossTypes = [
                "spider",
                "skitter",
                "wastelandcow",
                "mutantman",
                "mutantsnake",
                "fogkeeper",
                "heavymutant",
                "hollow"
            ];
            const types = Array.from({ length: miniBossCount }, (_, index) =>
                miniBossTypes[(Math.floor(wave / 5) + index) % miniBossTypes.length]
            );
            groups.push({ types, count: miniBossCount, specialRole: "miniBoss" });
        }

        if (isBossWave) {
            const bossCount = wave > 50 ? 2 : 1;
            const types = Array.from({ length: bossCount }, (_, index) =>
                (Math.floor(wave / 10) + index) % 2 === 0 ? "fogkeeper" : "heavymutant"
            );
            groups.push({ types, count: bossCount, specialRole: "boss" });
        }
    } else {
        // Keep the campaign's existing Hollow milestone encounters.
        const hollowCount = wave === 9 || wave === 12
            ? 1
            : wave === 15
                ? 2
                : wave > 15 && wave % 5 === 0
                    ? Math.min(3, Math.floor(wave / 8))
                    : 0;
        if (hollowCount > 0) groups.push({ type: "hollow", count: hollowCount });
    }

    return groups;
}

function startWave() {
    if (!gameRunning || waveRunning) return;

    cancelAutoStartWave();
    awaitingNextWave = false;

    waveRunning = true;
    gamePaused = false;
    leakedEnemiesThisWave = 0;

    const groups = getWaveGroups(currentWave);

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
    gameMode === "endless"
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
    mason: 60,
    james: 140,
    cody: 120,
    britney: 150,
    zach: 75,
    brady: 110
};
const scrapRewardPerKill = 6;

function updateScrapDisplay() {
    document.getElementById("scrapDisplay").textContent = scrap;
    updateSurvivorUpgradeButton(inspectedSurvivor);
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

            inspectedSurvivor.x = clickX;
            inspectedSurvivor.y = clickY;

            moveMode = false;
            updateMoveButton();
            updateDeploymentMessage(
                inspectedSurvivor.name + " repositioned!"
            );
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
            showSurvivorDetails(nearestSurvivor.type);
            renderGame();
            return;
        }

        inspectedSurvivor = null;
        document.getElementById("survivorDetailsPanel").style.display = "none";
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

    survivors.push({
        x,
        y,
        type: selectedSurvivor,
        name: survivorDetails[selectedSurvivor].name,
        upgradeLevel: 0
    });

   
scrap -= cost;
updateScrapDisplay();

// Clear the selection after a successful placement.
selectedSurvivor = null;

document.getElementById("survivorDetailsPanel").style.display = "none";

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

    survivors.push({
        x,
        y,
        type: selectedSurvivor,
        upgradeLevel: 0
    });

    scrap -= cost;

    document.getElementById("deploymentScrap").textContent = scrap;
    document.getElementById("deploymentCount").textContent = survivors.length;
    document.getElementById("deploymentMessage").textContent =
        selectedSurvivor + " deployed for " + cost + " scrap.";

    renderGame();
});






function drawSurvivorLevelPips(centerX, centerY, level) {
    const pipCount = level >= 3 ? 1 : Math.min(2, Math.floor(level));
    const pipSize = 4;
    const outlineSize = 1;
    const pipBoxSize = pipSize + outlineSize * 2;
    const gap = 2;
    const totalWidth = pipCount * pipBoxSize + (pipCount - 1) * gap;
    const startX = Math.round(centerX - totalWidth / 2);
    const y = Math.round(centerY - pipBoxSize / 2);
    const accent = level >= 3 ? "#c49bea" : "#f3c45d";

    ctx.save();
    for (let index = 0; index < pipCount; index++) {
        const x = startX + index * (pipBoxSize + gap);
        ctx.fillStyle = "#09090a";
        ctx.fillRect(x, y, pipBoxSize, pipBoxSize);
        ctx.fillStyle = accent;
        ctx.fillRect(x + outlineSize, y + outlineSize, pipSize, pipSize);
    }
    ctx.restore();
}

function drawSurvivors() {
    const survivorImages = {
        mason: masonImage,
        james: jamesImage,
        cody: codyImage,
        britney: britneyImage,
        zach: zachImage,
        brady: bradyImage
    };

    for (const survivor of survivors) {
        const image = survivorImages[survivor.type];

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

// Animate recoil back toward the survivor's normal position.
const recoilReturn = Math.min(1, 12 * (1 / 60) * gameSpeed);
survivor.recoilX *= 1 - recoilReturn;
survivor.recoilY *= 1 - recoilReturn;
        ctx.save();// Soft shadow under the survivor
ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
ctx.beginPath();
ctx.ellipse(
   survivor.x + survivor.recoilX,
survivor.y + survivor.recoilY + 35,
    15,
    5,
    0,
    0,
    Math.PI * 2
);
ctx.fill();
        ctx.imageSmoothingEnabled = false;

        ctx.drawImage(
    image,
    survivor.x + survivor.recoilX - width / 2,
survivor.y + survivor.recoilY - height / 2 + bounce,
    width,
    height
);

        const upgradeLevel = getSurvivorUpgradeLevel(survivor);
        const upgradePipsY = Math.max(
            4,
            survivor.y + survivor.recoilY - height / 2 - 6 + bounce
        );
        if (upgradeLevel > 0) {
            drawSurvivorLevelPips(
                survivor.x + survivor.recoilX,
                upgradePipsY,
                upgradeLevel
            );
        }

        ctx.restore();
    }
}



const survivorStats = {
    mason: { range: 140, damage: 13, fireRate: 1.05 },
    james: { range: 120, damage: 14, fireRate: 0.8 },
    cody: { range: 140, damage: 26, fireRate: 1.6 },
    britney: { range: 230, damage: 38, fireRate: 2.1 },
    zach: { range: 108, damage: 4, fireRate: 0.275 },
    brady: { range: 142, damage: 16, fireRate: 1.1 }
};

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
    const levelTwoMasonDamage = Math.round(base.damage * 1.4);
    const levelTwoBritneyDamage = Math.round(base.damage * 1.4);
    const damage = masonHighCaliber
        ? Math.round(levelTwoMasonDamage * 2)
        : britneySemiAuto
            ? Math.round(levelTwoBritneyDamage * 0.7)
            : Math.round(base.damage * (1 + 0.2 * level));
    return {
        damage: level >= 3 ? damage * 2 : damage,
        range: Math.round(base.range * (1 + 0.1 * level)),
        fireRate: masonHighCaliber
            ? base.fireRate * (1 - 0.1 * 2) * 1.25
            : codyHighlyExplosive
                ? base.fireRate * (1 - 0.1 * 2) * 1.25
                : britneySemiAuto
                    ? base.fireRate * (1 - 0.1 * 2) / 1.8
                    : zachDualWield
                        ? base.fireRate * (1 - 0.1 * 2) / 2
                        : bradyAutoShotty
                            ? base.fireRate * (1 - 0.1 * 2) / 2
                            : base.fireRate * (1 - 0.1 * level)
    };
}

function getCodyBlastRadius(survivor) {
    const level = getSurvivorUpgradeLevel(survivor);
    const levelTwoRadius = Math.round(36 * (1 + 0.1 * 2));
    return level >= 3
        ? Math.round(levelTwoRadius * 1.5)
        : Math.round(36 * (1 + 0.1 * level));
}

function getJamesBurnStats(survivor) {
    const level = getSurvivorUpgradeLevel(survivor);
    const napalmThrower = level >= 3;
    const standardTickDamage = Math.round(6 * (1 + 0.2 * level));

    return {
        duration: napalmThrower ? 5 : 4,
        damage: napalmThrower
            ? standardTickDamage * 4
            : standardTickDamage
    };
}

function getSurvivorUpgradeCost(type, level) {
    const baseCost = survivorCosts[type];
    if (!baseCost || level < 1 || level > maxSurvivorUpgradeLevel) return 0;
    const upgradeCostMultipliers = [0, 0.75, 1.25, 3.5];
    return Math.round(baseCost * upgradeCostMultipliers[level]);
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
            ? "High Caliber is active: 4× level 2 damage with a 25% longer attack interval."
            : hasNapalmThrower
                ? "Napalm Thrower is active: level 3 damage is doubled, burning lasts 25% longer, and burn damage per tick is doubled again."
                : hasHighlyExplosive
                    ? "Highly Explosive is active: doubled level 3 damage, a larger blast, 50% splash damage, and a 25% longer attack interval."
                    : hasSemiAuto
                        ? "Semi Auto is active: about 40% more damage than level 2, firing 80% faster."
                        : hasDualWield
                            ? "Dual Wield is active: doubled level 3 damage, fires twice as fast, and hits the first two targets in range."
                            : hasAutoShotty
                                ? "Auto Shotty is active: doubled level 3 damage and fires twice as fast."
                                : "This survivor has reached the maximum upgrade level.";
        return;
    }

    const nextLevel = level + 1;
    const cost = getSurvivorUpgradeCost(survivor.type, nextLevel);
    const unlocksHighCaliber = survivor.type === "mason" && nextLevel === 3;
    const unlocksNapalmThrower = survivor.type === "james" && nextLevel === 3;
    const unlocksHighlyExplosive = survivor.type === "cody" && nextLevel === 3;
    const unlocksSemiAuto = survivor.type === "britney" && nextLevel === 3;
    const unlocksDualWield = survivor.type === "zach" && nextLevel === 3;
    const unlocksAutoShotty = survivor.type === "brady" && nextLevel === 3;
    label.textContent = unlocksHighCaliber
        ? "HIGH CALIBER"
        : unlocksNapalmThrower
            ? "NAPALM THROWER"
            : unlocksHighlyExplosive
                ? "HIGHLY EXPLOSIVE"
                    : unlocksSemiAuto
                        ? "SEMI AUTO"
                        : unlocksDualWield
                            ? "DUAL WIELD"
                            : unlocksAutoShotty ? "AUTO SHOTTY" : `UPGRADE TO LEVEL ${nextLevel}`;
    costLabel.textContent = `${cost} SCRAP`;
    button.disabled = scrap < cost;
    button.title = scrap < cost
        ? `Need ${cost - scrap} more scrap to upgrade.`
        : unlocksHighCaliber
            ? `High Caliber deals 4× Mason's level 2 damage, with a 25% longer attack interval.`
            : unlocksNapalmThrower
                ? "Napalm Thrower doubles level 3 damage, extends burning 25%, and doubles burn damage per tick again."
                : unlocksHighlyExplosive
                    ? "Highly Explosive doubles level 3 damage, increases blast size, deals 50% damage to splash targets, and fires more slowly."
                        : unlocksSemiAuto
                            ? "Semi Auto doubles its level 3 damage, then fires 80% faster than level 2."
                            : unlocksDualWield
                                ? "Dual Wield doubles level 3 damage and attack speed, and hits the first two targets in range at once."
                                : unlocksAutoShotty
                                    ? "Auto Shotty doubles level 3 damage and Brady's attack rate."
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

function showSurvivorDetails(id) {
    const person = survivorDetails[id];

    const deployedUnit = survivors.find(survivor =>
        survivor.type === id && survivor === inspectedSurvivor
    );


    const detail = getSurvivorStats(deployedUnit || id);
    if (!person || !detail) return;

    document.getElementById("survivorDetailsPanel").style.display = "block";
const portraitFiles = {
    mason: "Mason.png",
    james: "James.png",
    cody: "Cody.png",
    britney: "Britney.png",
    zach: "Zach.png",
    brady: "Brady.png"
};

const portrait = document.getElementById("survivorPortrait");
portrait.src = "Images/" + portraitFiles[id];
portrait.alt = person.name + "'s portrait";    document.getElementById("survivorDetailName").textContent = person.name;
    document.getElementById("survivorDetailRole").textContent = person.role;
    document.getElementById("survivorDetailCost").textContent =
        person.cost + " SCRAP";

    document.getElementById("survivorDetailDamage").textContent = detail.damage;
    document.getElementById("survivorDetailRange").textContent = detail.range;
    document.getElementById("survivorDamageDealt").textContent =
    deployedUnit ? Math.round(deployedUnit.damageDealt || 0) : 0;

document.getElementById("survivorKills").textContent =
    deployedUnit ? deployedUnit.kills || 0 : 0;
    document.getElementById("survivorDetailDps").textContent =
        (detail.damage / detail.fireRate).toFixed(1);

   
const deployedUpgradeLevel = getSurvivorUpgradeLevel(deployedUnit);
let detailDescription = survivorDescriptions[id];
if (deployedUnit?.type === "mason" && deployedUpgradeLevel >= 2) {
    detailDescription = deployedUpgradeLevel >= 3
        ? "High Caliber active: 4× level 2 damage, with a 25% longer attack interval."
        : "Next upgrade: High Caliber deals 4× level 2 damage, with a 25% longer attack interval.";
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
        ? "Dual Wield active: doubled level 3 damage, fires twice as fast, and hits the first two targets in range at once."
        : "Next upgrade: Dual Wield doubles level 3 damage and attack speed, and hits the first two targets in range at once.";
} else if (deployedUnit?.type === "brady" && deployedUpgradeLevel >= 2) {
    detailDescription = deployedUpgradeLevel >= 3
        ? "Auto Shotty active: doubled level 3 damage and attack rate."
        : "Next upgrade: Auto Shotty doubles level 3 damage and Brady's attack rate.";
}
document.getElementById("survivorDetailDescription").textContent = detailDescription;

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
    brady:   { wave: "sawtooth",  start: 155, end: 52,  time: 0.13,  tone: 0.085, noise: 0.07,  hiss: 0.075, cutoff: 1500 }
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

function playWeaponAttackSound(type) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const profile = weaponAudioProfiles[type];
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
    const now = audio.currentTime;
    const oscillator = audio.createOscillator();
    const toneGain = audio.createGain();
    oscillator.type = profile.wave;
    oscillator.frequency.setValueAtTime(profile.start, now);
    oscillator.frequency.exponentialRampToValueAtTime(profile.end, now + profile.time);
    toneGain.gain.setValueAtTime(0.0001, now);
    toneGain.gain.exponentialRampToValueAtTime(profile.tone, now + 0.004);
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
    noiseGain.gain.exponentialRampToValueAtTime(profile.noise, now + 0.003);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + noiseDuration);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(window.wastelandSoundGain);
    noise.start(now);
    noise.stop(now + noiseDuration + 0.005);
}

function addShotVisual(survivor, enemy, dx, dy, distance, type) {
    const unitX = dx / distance;
    const unitY = dy / distance;
    const startX = survivor.x + unitX * 18;
    const startY = survivor.y + unitY * 18;

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

    bullets.push({
        startX, startY,
        endX: enemy.x,
        endY: enemy.y,
        life: type === "james" ? 0.13 : 0.105,
        maxLife: type === "james" ? 0.13 : 0.105,
        type
    });
}

function addImpactPixels(enemy, type, dx, dy) {
    const palettes = {
        mason: ["#fff0bf", "#d99b55", "#f3c875"],
        james: ["#ffe27a", "#f18a3e", "#e85b32"],
        cody: ["#ead19b", "#c99a5c", "#fff0c8"],
        britney: ["#fff8df", "#e3d2b0", "#d9aa61"],
        zach: ["#fff0bd", "#d6a552", "#e9bd68"],
        brady: ["#ffe7a0", "#e9a34c", "#f3c875"]
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

function applySurvivorDamage(survivor, enemy, damage, isSplash = false) {
    const actualDamage = Math.min(damage, enemy.health);
    enemy.health -= actualDamage;
    enemy.lastHitBy = survivor;
    enemy.hitFlash = 0.15;
    survivor.damageDealt += actualDamage;

    floatingDamageNumbers.push({
        x: enemy.x,
        y: enemy.y - 25,
        amount: Math.round(actualDamage),
        life: 0.8,
        maxLife: 0.8,
        isSplash
    });
}

function updateSurvivorCombat(deltaTime) {
    for (const survivor of survivors) {
        if (survivor.damageDealt === undefined) survivor.damageDealt = 0;
if (survivor.kills === undefined) survivor.kills = 0;
        const stats = getSurvivorStats(survivor);
        if (!stats) continue;

        survivor.attackCooldown =
            Math.max(0, (survivor.attackCooldown || 0) - deltaTime);

        if (survivor.attackCooldown > 0) continue;

        const dualWield = survivor.type === "zach" &&
            getSurvivorUpgradeLevel(survivor) >= 3;
        const targetsPerAttack = dualWield ? 2 : 1;
        const attackTargets = [];

        for (const enemy of enemies) {
            if (enemy.finished || enemy.health <= 0) continue;

            const dx = enemy.x - survivor.x;
            const dy = enemy.y - survivor.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= stats.range) {
                attackTargets.push({ enemy, dx, dy, distance });
                if (attackTargets.length >= targetsPerAttack) break;
            }
        }

        if (attackTargets.length === 0) continue;

        for (const { enemy, dx, dy, distance } of attackTargets) {
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

                    const damage = isDirectTarget
                        ? stats.damage
                        : Math.max(1, Math.round(stats.damage * 0.5));
                    applySurvivorDamage(survivor, affectedEnemy, damage, !isDirectTarget);
                }
            } else {
                applySurvivorDamage(survivor, enemy, stats.damage);
            }

            // James ignites each target hit by the attack volley.
            if (survivor.type === "james") {
                const burnStats = getJamesBurnStats(survivor);
                enemy.burnTimer = burnStats.duration;
                enemy.burnDamage = burnStats.damage;
                if (enemy.burnTickTimer === undefined) {
                    enemy.burnTickTimer = 1;
                }
                enemy.burnSource = survivor;
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
            addShotVisual(survivor, enemy, dx, dy, distance, survivor.type);
            addImpactPixels(enemy, survivor.type, dx, dy);
            if (survivor.type === "brady") {
                knockEnemyBackAlongRoad(enemy, 8);
            }
        }

        // A dual-wield volley plays one attack sound while showing a shot for
        // each target it hits.
        playWeaponAttackSound(survivor.type);
        survivor.attackCooldown = stats.fireRate;
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].health <= 0) {
            if (enemies[i].lastHitBy) {
    enemies[i].lastHitBy.kills++;
}
            totalEnemiesDefeated++;
            enemies.splice(i, 1);
            scrap += gameMode === "endless" ? 4 : scrapRewardPerKill;
        }
    }

    updateScrapDisplay();
}

function updateDamageNumbers(deltaTime) {
    for (let i = floatingDamageNumbers.length - 1; i >= 0; i--) {
        const number = floatingDamageNumbers[i];

        number.life -= deltaTime;
        number.y -= 45 * deltaTime;
number.x += Math.sin(number.life * 8) * 5 * deltaTime;

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
    ctx.font = "bold 14px monospace";
    ctx.imageSmoothingEnabled = false;

    for (const number of floatingDamageNumbers) {
        const fade = Math.max(
            0,
            Math.min(1, number.life / number.maxLife)
        );

        // Snap positions to whole pixels for a crisper look.
        const x = Math.round(number.x);
        const y = Math.round(number.y);

        ctx.globalAlpha = fade;

        // Dark pixel-style outline.
        ctx.strokeStyle = "#20231f";
        ctx.lineWidth = 3;
        ctx.lineJoin = "miter";
        ctx.strokeText(number.amount, x, y);

        // Yellow for direct hits, orange for burn damage.
        ctx.fillStyle = number.isBurn
            ? "#ff7043"
            : number.isSplash
                ? "#e7a766"
                : "#fff1a8";

        ctx.fillText(number.amount, x, y);
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
        brady:   { trail: "#e9a34c", core: "#ffe7a0", width: 2, length: 10 }
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
        } else if (bullet.type === "brady") {
            // Individual pellets stay small so the tight spread remains clear.
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
        const damage = Math.min(enemy.health, enemy.burnDamage);

        enemy.health -= damage;
        enemy.burnFlash = 0.2;
        enemy.burnTickTimer += 1;

        if (damage > 0) {
            floatingDamageNumbers.push({
                x: enemy.x,
                y: enemy.y - 35,
                amount: Math.round(damage),
                life: 0.65,
                maxLife: 0.65,
                isBurn: true
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
        const target = roadPoints[enemy.targetPoint];

        if (!target) {
            continue;
        }

        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const movement = enemy.speed * deltaTime;

        if (distance <= movement) {
            enemy.x = target.x;
            enemy.y = target.y;
            enemy.targetPoint++;

            // Reached the end of the road
            if (enemy.targetPoint >= roadPoints.length) {
                
enemy.finished = true;
leakedEnemiesThisWave++;

const leakDamage = getEnemyProfile(enemy.type).leakDamage;
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



function drawEnemies() {
    let hollowAlive = false;

    // Draw ground shadows first so they sit beneath every enemy sprite.
    for (const enemy of enemies) {
        const profile = getEnemyProfile(enemy.type);
        const sizeScale = enemy.sizeScale || 1;
        const spriteHeight = profile.spriteHeight * sizeScale;
        const hitOffsetX = enemy.hitOffsetX || 0;
        const hitOffsetY = enemy.hitOffsetY || 0;

        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        ctx.ellipse(
            enemy.x + hitOffsetX,
            enemy.y + hitOffsetY + (enemy.visualLaneOffsetY || 0) + spriteHeight / 2 - 5,
            (profile.isHeavy || profile.isBoss ? 14 : 12) * sizeScale,
            4.5 * sizeScale,
            0,
            0,
            Math.PI * 2
        );
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

        if (isHollow && enemy.health > 0) {
            hollowAlive = true;
        }

        const bounce = gameRunning && !gamePaused
            ? Math.sin(performance.now() / 100 + enemy.x * 0.1) * 3
            : 0;
        const hitOffsetX = enemy.hitOffsetX || 0;
        const hitOffsetY = enemy.hitOffsetY || 0;
        const spriteX = enemy.x + hitOffsetX;
        const spriteY = enemy.y + hitOffsetY + bounce + (enemy.visualLaneOffsetY || 0);

        if (image.complete && image.naturalWidth > 0) {
            ctx.save();

            if (enemy.burnFlash > 0) {
                ctx.globalAlpha = 0.6;
                ctx.filter = "sepia(1) saturate(7) hue-rotate(330deg) brightness(1.3)";
            } else if (enemy.hitFlash > 0) {
                ctx.globalAlpha = 0.55;
                ctx.filter = "sepia(1) saturate(6) hue-rotate(315deg) brightness(1.2)";
            }


            ctx.drawImage(
                image,
                spriteX - spriteWidth / 2,
                spriteY - spriteHeight / 2,
                spriteWidth,
                spriteHeight
            );

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
            const barX = spriteX - barWidth / 2;
            const barY = spriteY - spriteHeight / 2 - (enemy.isWaveBoss ? 15 : 12);
            const healthPercent = Math.max(
                0,
                Math.min(1, enemy.health / enemy.maxHealth)
            );

            ctx.fillStyle = "#292b25";
            ctx.fillRect(barX, barY, barWidth, barHeight);

            ctx.fillStyle = enemy.isWaveBoss
                ? "#c77be8"
                : enemy.isMiniBoss
                    ? "#edaa4f"
                    : healthPercent > 0.6
                        ? "#43c65e"
                : healthPercent > 0.3
                    ? "#e8c840"
                    : "#e04438";

            ctx.fillRect(
                barX + 1,
                barY + 1,
                (barWidth - 2) * healthPercent,
                barHeight - 2
            );

            if (enemy.isWaveBoss || enemy.isMiniBoss) {
                ctx.strokeStyle = enemy.isWaveBoss ? "#f0c4ff" : "#ffe0a0";
                ctx.lineWidth = 1;
                ctx.strokeRect(barX, barY, barWidth, barHeight);
            }
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

    // Health bar background.
    ctx.fillStyle = "#51413b";
    ctx.fillRect(x, y + 15, barWidth, barHeight);

    // Current health.
    const healthPercent = Math.max(
        0,
        Math.min(1, hollow.health / hollow.maxHealth)
    );

    ctx.fillStyle = "#bd3c32";
    ctx.fillRect(x, y + 15, barWidth * healthPercent, barHeight);

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
    ctx.drawImage(mapCanvas, 0, 0);
    drawSurvivors();
    drawEnemies();
    drawBullets();
    drawBlastEffects();
    drawImpactPixels();
    drawDamageNumbers();
    drawSurvivorPreview();
    drawSelectedSurvivorRange();
    if (inspectedSurvivor) {
    document.getElementById("survivorDamageDealt").textContent =
        Math.round(inspectedSurvivor.damageDealt || 0);

    document.getElementById("survivorKills").textContent =
        inspectedSurvivor.kills || 0;
}
}
function drawSelectedSurvivorRange() {
    if (!inspectedSurvivor) return;
    const range = getSurvivorStats(inspectedSurvivor)?.range;
    if (!range) return;

    ctx.save();

    ctx.beginPath();
    ctx.arc(
        inspectedSurvivor.x,
        inspectedSurvivor.y,
        range,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 2;
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
const groupSpawnDelay = 5;
// Keep enemies in each wave group close enough for area attacks to catch
// nearby targets without making the opening rush feel abrupt.
const enemySpawnDelay = 0.9;
let enemyGroups = [];
let currentGroupIndex = 0;
let currentGroupSpawnIndex = 0;
let groupDelayStarted = false;
let autoStartWaves = false;
let awaitingNextWave = false;
let autoStartWaveTimer = null;
let waveCompleteToastTimer = null;
let insufficientScrapToastTimer = null;
const scrapPenaltyPerLeak = 10;
const startingWaveScrapReward = 40;
const waveScrapRewardIncrease = 10;
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

function showWaveCompleteToast(wave, reward, leaked = 0, leakPenalty = 0) {
    const toast = document.getElementById("waveCompleteToast");
    if (!toast) return;

    hideWaveCompleteToast();
    document.getElementById("waveCompleteNumber").textContent = `WAVE ${wave}`;
    document.getElementById("waveCompleteReward").textContent =
        leaked > 0
            ? `+${reward} SCRAP · ${leaked} LEAKED (-${leakPenalty})`
            : `+${reward} SCRAP EARNED · CLEAN WAVE`;
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
            spawnTimer = enemySpawnDelay;
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
        const baseWaveReward = gameMode === "endless"
            ? 25 + (completedWave - 1) * 5
            : startingWaveScrapReward + (completedWave - 1) * waveScrapRewardIncrease;
        const leakPenalty = leakedEnemiesThisWave * scrapPenaltyPerLeak;
        const waveReward = Math.max(0, baseWaveReward - leakPenalty);
        scrap += waveReward;
        updateScrapDisplay();
        showWaveCompleteToast(
            completedWave,
            waveReward,
            leakedEnemiesThisWave,
            leakPenalty
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
            const missionTitle = document.querySelector(
                `#level${currentLevel}Button strong`
            )?.textContent || `LEVEL ${String(currentLevel).padStart(2, "0")}`;
            document.getElementById("victoryMessage").textContent =
                `${missionTitle} is secure. Your squad cleared every wave.`;
            updateRunRecap(totalWaves);
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

        document.getElementById("waveDisplay").textContent =
    gameMode === "endless"
        ? "WAVE " + currentWave
        : currentWave + " / " + totalWaves;

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
const linkedCloudAccountKey = "wastelandDefense.cloudAccountId.v1";
const campaignLevelCoinReward = 100;
let supabaseClient = null;
let supabaseUser = null;
let supabaseSdkPromise = null;
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
let leaderboardReturnScreen = "menu";
const profilePortraitSources = {
    mason: "Images/Mason.png",
    james: "Images/James.png",
    cody: "Images/Cody.png",
    britney: "Images/Britney.png",
    zach: "Images/Zach.png",
    brady: "Images/Brady.png"
};
const trophyPlaceNames = { 1: "GOLD", 2: "SILVER", 3: "BRONZE" };

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
    return Object.entries(survivorDetails)
        .filter(([id, survivor]) => survivor.unlocked === true && profilePortraitSources[id]);
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
    const countsPanel = document.getElementById("profileTrophyCounts");
    if (!countsPanel) return;
    countsPanel.replaceChildren();

    [1, 2, 3].forEach(place => {
        const count = playerTrophyRecords.filter(trophy => Number(trophy.place) === place).length;
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
}

async function refreshPlayerTrophies(client = supabaseClient) {
    if (!client || !supabaseUser) {
        playerTrophyRecords = [];
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

function renderCampaignCoinReward(reward) {
    updateCoinBalanceDisplay();
    updateProfileStats();
    document.getElementById("victoryCoinsEarned").textContent =
        `+${reward} COINS`;
    document.getElementById("victoryCoinsTotal").textContent =
        playerCoinBalance.toLocaleString();
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
            submitting: false
        };
    }

    updateCompletedEndlessSubmissionUIs();
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
        await refreshPlayerTrophies(client);
    } catch (trophyError) {
        // Score verification succeeded; the trophy panel can retry on the next account sync.
        console.warn("Could not refresh the trophy collection:", trophyError.message || trophyError);
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
        if (result.data.session) await handleSupabaseSession(result.data.session);
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
    return Object.entries(survivorDetails)
        .filter(([, survivor]) => survivor.unlocked === true)
        .map(([id]) => id);
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

async function importLocalProgress(client, progress) {
    if (progress.legacy_imported_at) return progress;
    let previouslyLinkedUser = "";
    try { previouslyLinkedUser = localStorage.getItem(linkedCloudAccountKey) || ""; } catch { /* no local account link */ }
    const isSwitchingAccounts = previouslyLinkedUser && previouslyLinkedUser !== supabaseUser.id;
    const { error } = await client.rpc("import_legacy_progress", {
        p_coins: isSwitchingAccounts ? 0 : playerCoinBalance,
        p_unlocked_survivors: isSwitchingAccounts
            ? ["mason", "james", "cody", "britney", "zach", "brady"]
            : getLocalUnlockedSurvivors(),
        p_completed_campaign_levels: isSwitchingAccounts ? [] : playerProfile.campaignLevels,
        p_endless_scores: {},
        p_callsign: accountUsername(),
        p_portrait_id: isSwitchingAccounts ? "mason" : (playerProfile.portrait || "mason")
    });
    if (error) throw error;
    const { data, error: reloadError } = await client
        .from("player_progress")
        .select("coins,unlocked_survivors,completed_campaign_levels,legacy_imported_at")
        .eq("user_id", supabaseUser.id)
        .single();
    if (reloadError) throw reloadError;
    return data;
}

async function handleSupabaseSession(session) {
    const user = session?.user || null;
    const isSameUser = user?.id && user.id === supabaseUser?.id;
    supabaseUser = user;
    updateAccountUI(user);
    syncLivePlayerPresence().catch(error => {
        console.warn("Live player identity could not sync:", error.message || error);
    });
    if (!user) {
        persistPlayerProfile();
        playerTrophyRecords = [];
        updateProfileStats();
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
    let [{ data: profile, error: profileError }, { data: progress, error: progressError }] = await Promise.all([
        client.from("player_profiles").select("id,username,portrait_id").eq("id", user.id).single(),
        client.from("player_progress").select("coins,unlocked_survivors,completed_campaign_levels,legacy_imported_at").eq("user_id", user.id).single()
    ]);
    if (profileError) throw profileError;
    if (progressError) throw progressError;

    if (!progress.legacy_imported_at) {
        progress = await importLocalProgress(client, progress);
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

    const unlocked = new Set(progress.unlocked_survivors || []);
    Object.entries(survivorDetails).forEach(([id, survivor]) => {
        survivor.unlocked = unlocked.has(id);
    });
    persistUnlockedSurvivors();
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
        row.classList.toggle("is-online", isOnline);

        const identity = document.createElement("div");
        identity.className = "profile-friend-identity";
        const avatar = document.createElement("img");
        avatar.className = "profile-friend-avatar";
        avatar.src = profilePortraitSources[profile.portrait_id] || profilePortraitSources.mason;
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

function appendLeaderboardEmpty(titleText, descriptionText) {
    const row = document.createElement("tr");
    row.className = "leaderboard-empty-row";
    const cell = document.createElement("td");
    cell.colSpan = 4;
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

function renderLeaderboard() {
    const rows = document.getElementById("leaderboardRows");
    const records = readEndlessRecords();
    const bestWave = Math.max(0, Number(records[activeLeaderboardMap]) || 0);
    const mapName = leaderboardMapNames[activeLeaderboardMap];
    const notice = document.getElementById("leaderboardNotice");
    const scopeLabel = document.getElementById("leaderboardScopeLabel");

    document.getElementById("leaderboardMapTitle").textContent = mapName;
    document.getElementById("leaderboardPersonalBest").textContent =
        `YOUR BEST: ${bestWave} ${bestWave === 1 ? "WAVE" : "WAVES"}`;

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

    if (activeLeaderboardScope === "global") {
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
    gameLayout.style.display = "none";
    returnMenuConfirm.style.display = "none";
    restartConfirm.style.display = "none";
    document.getElementById("gameOverScreen").style.display = "none";
    document.getElementById("victoryScreen").style.display = "none";
    document.getElementById("leaderboardButton").style.visibility = "hidden";
    document.getElementById("profileButton").style.visibility = "hidden";
    document.getElementById("mainMenuButton").style.visibility = "hidden";
    document.getElementById("profileSaveNotice").textContent = "";
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
        pendingEndlessScore = { mapId: currentLevel, bestWave, submitted: false, submitting: false };
        awardEndlessRunCoins(bestWave, activeEndlessRunId);
        activeEndlessRunId = null;
    } else {
        pendingEndlessScore = null;
        renderEndlessCoinReward(0);
    }

    gameRunning = false;
    waveRunning = false;
    gamePaused = false;

    document.getElementById("gameLayout");
    document.querySelector(".game-layout").style.display = "none";

    document.getElementById("gameOverMessage").textContent =
        "Your defenses have fallen. The wasteland is lost.";

    document.getElementById("finalWaveDisplay").textContent =
        gameMode === "endless"
            ? `WAVE REACHED: ${currentWave}`
            : `WAVE REACHED: ${currentWave} / ${totalWaves}`;

    updateRunRecap(currentWave - 1);
    updateEndlessSubmissionUI();

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
    hideWaveCompleteToast();
    previousTime = 0;
    clearInterval(dialogueTimer);
    document.getElementById("storyDialogue").style.display = "none";
    document.getElementById("startWaveButton").disabled = false;
    document.getElementById("returnMenuConfirm").style.display = "none";
    document.getElementById("restartConfirm").style.display = "none";
    profileReturnScreen = "menu";
    pendingEndlessScore = null;
    returnEndlessScoreSubmission = null;
    document.getElementById("returnEndlessScoreSubmission").hidden = true;
    updateEndlessSubmissionUI();

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
    document.getElementById("survivorDetailsPanel").style.display = "none";

    mainMenu.style.display = "block";
    profileScreen.style.display = "none";
    leaderboardScreen.style.display = "none";
    campaignSelect.style.display = "none";
    levelSelect.style.display = "none";
    deploymentScreen.style.display = "none";
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
    document.getElementById("profileButton").style.visibility = "hidden";
    document.getElementById("mainMenuButton").style.visibility = "visible";
    gameLayout.style.display = "none";
}


const openingDialogue =
        "I heard there was a safe zone in the city. But this area is overrun with mutant spiders and who knows what else. We have to move fast!";

let dialogueIndex = 0;
let dialogueTimer = null;
let dialogueFinished = false;

function showOpeningDialogue() {
    const box = document.getElementById("storyDialogue");
    const text = document.getElementById("dialogueText");

    clearInterval(dialogueTimer);

    dialogueIndex = 0;
    dialogueFinished = false;
    text.textContent = "";
    box.style.display = "flex";
    document.getElementById("startWaveButton").disabled = true;

    dialogueTimer = setInterval(() => {
        if (dialogueIndex < openingDialogue.length) {
            text.textContent += openingDialogue[dialogueIndex];
            dialogueIndex++;
        } else {
            clearInterval(dialogueTimer);
            dialogueFinished = true;
        }
    }, 35);
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
        document.getElementById("dialogueText").textContent = openingDialogue;
        dialogueFinished = true;
        return;
    }

    document.getElementById("storyDialogue").style.display = "none";
    document.getElementById("startWaveButton").disabled = false;
});

function showDeployment(level = 1) {
    setMuteButtonVisible(false);
    currentLevel = level;
    roadPoints = campaignRoads[currentLevel];
    drawMap();
    const levelCard = document.getElementById(`level${level}Button`);
    const levelName = levelCard?.querySelector("strong")?.textContent.trim() || `LEVEL ${String(level).padStart(2, "0")}`;
    document.getElementById("deploymentLocation").textContent =
        `${gameMode === "endless" ? "ENDLESS RUN" : "CAMPAIGN"} // ${levelName}`;
    document.querySelector(".deployment-subtitle").textContent =
        `Choose up to ${getMaxRosterSize()} survivors. Tap a card to add or remove them.`;
    updateRosterSummary();

    gameRunning = false;
    previousTime = 0;

    mainMenu.style.display = "none";
    profileScreen.style.display = "none";
    leaderboardScreen.style.display = "none";
    campaignSelect.style.display = "none";
    levelSelect.style.display = "none";
    deploymentScreen.style.display = "block";
    document.getElementById("profileButton").style.visibility = "hidden";
    document.getElementById("mainMenuButton").style.visibility = "visible";

    gameLayout.style.display = "none";
}



const selectedSurvivors = new Set();

function startDefense() {
    if (selectedSurvivors.size === 0) {
        document.getElementById("deploymentMessage").textContent =
            "Select at least one survivor for your roster first.";
        return;
    }

    populateInGameRoster();
    setMuteButtonVisible(true);
    pendingEndlessScore = null;
    returnEndlessScoreSubmission = null;
    updateEndlessSubmissionUI();
    document.getElementById("endlessCoinReward").hidden = true;

    activeCampaignRunId = gameMode === "campaign" ? createRunId() : null;
    activeEndlessRunId = gameMode === "endless" ? createRunId() : null;

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
    document.getElementById("survivorDetailsPanel").style.display = "none";
    enemies.length = 0;
    bullets.length = 0;
    impactPixels.length = 0;
    blastEffects.length = 0;
    playerHealth = 100;
    totalEnemiesDefeated = 0;
    floatingDamageNumbers.length = 0;
    scrap = gameMode === "endless" ? 150 : 250;

    document.getElementById("scrapDisplay").textContent = scrap;
    updatePlayerHealthDisplay();
    document.getElementById("waveDisplay").textContent =
    gameMode === "endless" ? "WAVE 0" : "0 / " + totalWaves;

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
        if (gameMode === "campaign" && currentLevel === 1) {
    showOpeningDialogue();
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
bindUIEvent("backToLevelsButton", "click", showLevelSelect);
bindUIEvent("startDefenseButton", "click", startDefense);
bindUIEvent("restartRunButton", "click", startDefense);


bindUIEvent("startWaveButton", "click", startWave);

bindUIEvent("autoStartButton", "click", () => {
    setAutoStartWaves(!autoStartWaves);
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
    document.getElementById("restartConfirm").style.display = "flex";
    document.getElementById("cancelRestartButton").focus();
});



bindUIEvent("pauseButton", "click", () => {
    if (!waveRunning) return;

    gamePaused = !gamePaused;

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

    document.getElementById("speedButton").textContent = gameSpeed + "×";
});



bindUIEvent("endlessButton", "click", () => {
    gameMode = "endless";
    updateRosterSummary();
    showLevelSelect();
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
        cost: 60,
        unlocked: true
    },
    james: {
        name: "James",
        role: "FLAMETHROWER",
        icon: "J",
        iconClass: "pyro",
        cost: 140,
        unlocked: true
    },
    cody: {
        name: "Cody",
        role: "GRENADE LAUNCHER",
        icon: "C",
        iconClass: "demo",
        cost: 120,
        unlocked: true
    },
    britney: {
        name: "Britney",
        role: "SNIPER RIFLE",
        icon: "B",
        iconClass: "sniper",
        cost: 150,
        unlocked: true
    },
    zach: {
        name: "Zach",
        role: "SMG",
        icon: "Z",
        iconClass: "scout",
        cost: 75,
        unlocked: true
    },
    brady: {
        name: "Brady T.",
        role: "SHOTGUN",
        icon: "B",
        iconClass: "demo",
        cost: 110,
        unlocked: true
    }
};

try {
    const savedUnlocked = JSON.parse(localStorage.getItem(unlockedSurvivorsKey) || "null");
    if (Array.isArray(savedUnlocked)) {
        const unlockedIds = new Set(savedUnlocked);
        Object.entries(survivorDetails).forEach(([id, survivor]) => {
            survivor.unlocked = unlockedIds.has(id);
        });
    }
} catch {
    // Use the game's default unlock list when there is no readable local cache.
}

updateProfileIdentity();

function getMaxRosterSize() {
    return gameMode === "endless" ? 6 : 4;
}

const rosterCount = document.getElementById("rosterCount");

// Only render survivors that are available to the player. Locked cards and
// placeholders are removed instead of reserving empty roster slots.
const deploymentRoster = document.getElementById("deploymentRoster");
deploymentRoster.querySelectorAll(".locked, .locked-slot, [data-unlocked='false']")
    .forEach(slot => slot.remove());
deploymentRoster.querySelectorAll("button[data-survivor]").forEach(card => {
    const survivor = survivorDetails[card.dataset.survivor];
    if (!survivor || survivor.unlocked !== true) card.remove();
});

function updateRosterSummary() {
    rosterCount.textContent = `${selectedSurvivors.size}/${getMaxRosterSize()}`;
}

const survivorCards = document.querySelectorAll(
    "#deploymentRoster button[data-survivor]"
);

survivorCards.forEach(card => {
    card.addEventListener("click", () => {
        const survivorId = card.dataset.survivor;

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

        const card = document.createElement("div");
        card.className = "survivor-card";
        card.dataset.survivor = id;

        
const portraitFiles = {
    mason: "Mason.png",
    james: "James.png",
    cody: "Cody.png",
    britney: "Britney.png",
    zach: "Zach.png",
    brady: "Brady.png"
};

card.innerHTML = `
    <img
        class="survivor-portrait-placeholder"
        src="Images/${portraitFiles[id]}"
        alt="${person.name}"
    >
    <span class="unit-info">
        <strong>${person.name}</strong>
        <small class="unit-role">${person.role}</small>
        <strong class="unit-cost"><span>${person.cost}</span> SCRAP</strong>
    </span>
`;


        rosterList.appendChild(card);

card.addEventListener("click", () => {
    if (gameRunning && scrap < survivorCosts[id]) {
        showInsufficientScrapToast();
        return;
    }

    selectSurvivorToDeploy(id);
    showSurvivorDetails(id);
    
});
    });

    rosterCountDisplay.textContent = selectedSurvivors.size + " UNITS";
}

// On phones, press and hold a roster card briefly before dragging it onto the
// battlefield. Waiting for a hold keeps ordinary swipes available for scrolling.
const inGameSurvivorList = document.getElementById("inGameSurvivorList");
let touchSurvivorDrag = null;
let touchSurvivorDragTimer = null;
let suppressRosterClickUntil = 0;

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
        renderGame();
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

    document.getElementById("survivorDetailsPanel").style.display = "none";

    document.querySelectorAll("#inGameSurvivorList .survivor-card")
        .forEach(card => card.classList.remove("selected"));

    updateDeploymentMessage("Placement cancelled. Select a survivor to deploy.");
});


function updateWavePreview() {
    const preview = document.getElementById("wavePreview");
    if (!preview) return;

    const groups = getWaveGroups(currentWave);
    const totalEnemies = groups.reduce((total, group) => total + group.count, 0);
    const waveTypes = new Set(groups.flatMap(group =>
        group.types?.length ? group.types : [group.type]
    ));
    const hasHollow = waveTypes.has("hollow") && !groups.some(group => group.specialRole === "miniBoss");
    const hasHeavy = [...waveTypes].some(type => getEnemyProfile(type).isHeavy);
    const hasSkitter = waveTypes.has("skitter");
    const hasMutantSnake = waveTypes.has("mutantsnake");
    const isMixed = waveTypes.size > 1;
    const mainType = hasHollow
        ? "hollow"
        : hasHeavy
            ? [...waveTypes].find(type => getEnemyProfile(type).isHeavy)
            : hasMutantSnake
                ? "mutantsnake"
                : hasSkitter && !isMixed
                    ? "skitter"
                    : [...waveTypes][0] || "spider";
    const hasMiniBoss = groups.some(group => group.specialRole === "miniBoss");
    const bossCount = groups
        .filter(group => group.specialRole === "boss")
        .reduce((total, group) => total + group.count, 0);
    const miniBossCount = groups
        .filter(group => group.specialRole === "miniBoss")
        .reduce((total, group) => total + group.count, 0);
    const regularCount = totalEnemies - miniBossCount - bossCount;
    const threat = hasHollow || hasHeavy || hasMiniBoss || bossCount > 0 || totalEnemies >= 30
        ? "SEVERE"
        : totalEnemies >= 20
            ? "HIGH"
            : totalEnemies >= 12
                ? "ELEVATED"
                : "LOW";

    document.getElementById("previewWaveTitle").textContent =
        `WAVE ${currentWave} INTEL`;
    document.getElementById("previewThreat").textContent = threat;
    document.getElementById("previewEnemyImage").src = getEnemyProfile(mainType).image.src;
    document.getElementById("previewEnemyImage").alt = enemyLabels[mainType] || "HOSTILE";
    document.getElementById("previewEnemyName").textContent = isMixed
        ? "MIXED HOSTILES"
        : enemyLabels[mainType] || "HOSTILE";
    document.getElementById("previewEnemyHint").textContent =
        hasMiniBoss || bossCount > 0
            ? `${regularCount} regular · ${miniBossCount} mini-boss${miniBossCount === 1 ? "" : "es"}${bossCount > 0 ? ` · ${bossCount} boss${bossCount === 1 ? "" : "es"}` : ""}`
            : `${totalEnemies} hostile contact${totalEnemies === 1 ? "" : "s"} expected`;
    document.getElementById("previewEnemyCount").textContent = `×${totalEnemies}`;
}

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

    survivors.splice(index, 1);
    scrap += refund;
    inspectedSurvivor = null;

    document.getElementById("survivorDetailsPanel").style.display = "none";

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


