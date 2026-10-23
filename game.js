
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const masonImage = new Image();
masonImage.src = "images/Masonchar.png";

const jamesImage = new Image();
jamesImage.src = "images/Jameschar.png";

const codyImage = new Image();
codyImage.src = "images/Codychar.png";

const britneyImage = new Image();
britneyImage.src = "images/Britneychar.png";

const zachImage = new Image();
zachImage.src = "images/Zachchar.png";

const bradyImage = new Image();
bradyImage.src = "images/Bradychar.png";

const spiderImage = new Image();
spiderImage.src = "images/spider.png";

const skitterImage = new Image();
skitterImage.src = "images/skitter.png";

const hollowImage = new Image();
hollowImage.src = "images/hollow.png";
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

let currentLevel = 1;

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


// Draw the map for the current level
function drawMap() {
    // Paint the ground
    ctx.fillStyle = "#555744";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the road
    ctx.strokeStyle = "#292b25";
    ctx.lineWidth = roadWidth;
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";

    ctx.beginPath();
    ctx.moveTo(roadPoints[0].x, roadPoints[0].y);

    for (let i = 1; i < roadPoints.length; i++) {
        ctx.lineTo(roadPoints[i].x, roadPoints[i].y);
    }

    ctx.stroke();

    // Add small terrain details
    const colours = ["#77785a", "#414735", "#686950", "#34392e"];

    for (let i = 0; i < 100; i++) {
        const x = seededRandom() * canvas.width;
        const y = seededRandom() * canvas.height;
        const size = seededRandom() * 5 + 2;

        if (
            isOnRoad(x + size / 2, y + size / 2) ||
            x + size > canvas.width ||
            y + size > canvas.height
        ) {
            continue;
        }

        ctx.fillStyle = colours[Math.floor(seededRandom() * colours.length)];
        ctx.fillRect(x, y, size, size);
    }

    // Draw rubble patches
    for (let i = 0; i < 15; i++) {
        const patchX = seededRandom() * (canvas.width - 40);
        const patchY = seededRandom() * (canvas.height - 40);

        for (let j = 0; j < 6; j++) {
            const rockX = patchX + seededRandom() * 30;
            const rockY = patchY + seededRandom() * 30;

            if (
                isOnRoad(rockX + 2.5, rockY + 2.5) ||
                rockX + 5 > canvas.width ||
                rockY + 5 > canvas.height
            ) {
                continue;
            }

            ctx.fillStyle = "#414735";
            ctx.fillRect(rockX, rockY, 5, 5);
        }
    }

    // Save the map so we can redraw it during gameplay
    mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
    mapCtx.drawImage(canvas, 0, 0);

    // Update the map preview for the current level
    const levelPreview = document.getElementById(
        "level" + currentLevel + "MapPreview"
    );

    if (levelPreview) {
    try {
    levelPreview.src = mapCanvas.toDataURL("image/png");
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
const floatingDamageNumbers = [];
let playerHealth = 100;
const enemyDamage = 10;

function spawnEnemy(type = "spider") {
    const isSkitter = type === "skitter";
    const isHollow = type === "hollow";

    const health = isHollow ? 150 : isSkitter ? 60 : 100;

    enemies.push({
        type: type,
        x: roadPoints[0].x,
        y: roadPoints[0].y,
        targetPoint: 1,
        speed: isHollow ? 45 : isSkitter ? 91 : 65,
        size: isHollow ? 32 : 22,
        health: health,
        maxHealth: health
    });
}

function startWave() {
    if (!gameRunning || waveRunning) return;

    waveRunning = true;
    gamePaused = false;

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

    const groups = waveGroups[currentWave] || [
        { type: "spider", count: 5 + (currentWave - 1) * 2 }
    ];

    enemyGroups = groups.map(group => ({ ...group }));
    currentGroupIndex = 0;
    groupDelayStarted = false;
    enemiesToSpawn = enemyGroups[0].count;
    spawnTimer = 0;

    document.getElementById("startWaveButton").disabled = true;
    document.getElementById("startWaveButton").style.display = "none";
    document.getElementById("pauseButton").disabled = false;

    document.getElementById("waveDisplay").textContent =
        currentWave + " / " + totalWaves;

    document.getElementById("waveStatus").textContent =
        "Wave " + currentWave + " in progress!";
            moveMode = false;
    updateMoveButton();
}

let scrap = 250;
let selectedSurvivor = null;
let moveMode = false;

const survivorCosts = {
    mason: 50,
    james: 75,
    cody: 100,
    britney: 125,
    zach: 60,
    brady: 90
};

function updateScrapDisplay() {
    document.getElementById("scrapDisplay").textContent = scrap;
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
                isOnRoad(clickX, clickY) ||
                clickX < 20 ||
                clickX > canvas.width - 20 ||
                clickY < 20 ||
                clickY > canvas.height - 20
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


        for (let i = survivors.length - 1; i >= 0; i--) {
            const survivor = survivors[i];
            const dx = clickX - survivor.x;
            const dy = clickY - survivor.y;

            if (Math.sqrt(dx * dx + dy * dy) <= 18) {
                inspectedSurvivor = survivor;
                showSurvivorDetails(survivor.type);
                renderGame();
                return;
            }
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

    if (isOnRoad(x, y)) {
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
        name: survivorDetails[selectedSurvivor].name
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

    if (isOnRoad(x, y)) {
        document.getElementById("deploymentMessage").textContent =
            "You cannot deploy on the road.";
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
        type: selectedSurvivor
    });

    scrap -= cost;

    document.getElementById("deploymentScrap").textContent = scrap;
    document.getElementById("deploymentCount").textContent = survivors.length;
    document.getElementById("deploymentMessage").textContent =
        selectedSurvivor + " deployed for " + cost + " scrap.";

    renderGame();
});






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

        ctx.restore();
    }
}



const survivorStats = {
    mason: { range: 180, damage: 15, fireRate: 1 },
    james: { range: 130, damage: 20, fireRate: 0.8 },
    cody: { range: 150, damage: 30, fireRate: 1.5 },
    britney: { range: 260, damage: 35, fireRate: 1.8 },
    zach: { range: 110, damage: 10, fireRate: 0.5 },
    brady: { range: 160, damage: 15, fireRate: 1 }
};

const survivorDescriptions = {
    mason: "Scout. A reliable all-rounder with balanced range and damage.",
    james: "Firestarter. Deals heavy damage at close range.",
    cody: "Demolitions. Delivers powerful attacks against enemies.",
    britney: "Sharpshooter. Long-range damage specialist.",
    zach: "Runner. Fast attacks, but needs enemies nearby.",
    brady: "Engineer. A balanced defender who holds the line."
};

function showSurvivorDetails(id) {
    const person = survivorDetails[id];

    const deployedUnit = survivors.find(survivor =>
        survivor.type === id && survivor === inspectedSurvivor
    );


    const stats = {
        mason: { damage: 15, range: 180, fireRate: 1 },
        james: { damage: 20, range: 130, fireRate: 0.8 },
        cody: { damage: 30, range: 150, fireRate: 1.5 },
        britney: { damage: 35, range: 260, fireRate: 1.8 },
        zach: { damage: 10, range: 110, fireRate: 0.5 },
        brady: { damage: 15, range: 160, fireRate: 1 }
    };

    const detail = stats[id];
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
portrait.src = "images/" + portraitFiles[id];
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
    document.getElementById("survivorDetailFireRate").textContent =
        (1 / detail.fireRate).toFixed(1) + " shots/s";

   
document.getElementById("survivorDetailDescription").textContent =
    survivorDescriptions[id];

updateSellButton();
updateMoveButton();
}




function drawSurvivorPreview() {
    const movingSurvivor = moveMode && inspectedSurvivor;
    const previewType = movingSurvivor
        ? inspectedSurvivor.type
        : selectedSurvivor;

    if (!previewType || !mouseOnCanvas || !gameRunning) return;

    const range = survivorStats[previewType].range;

    // Check whether the preview location is valid.
    let validPlacement =
        !isOnRoad(mouseX, mouseY) &&
        mouseX >= 20 &&
        mouseX <= canvas.width - 20 &&
        mouseY >= 20 &&
        mouseY <= canvas.height - 20;

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



function playJamesBurnSound() {
    const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    if (!window.jamesAudioContext) {
        window.jamesAudioContext = new AudioContextClass();
    }

    const audio = window.jamesAudioContext;

    if (audio.state === "suspended") {
        audio.resume();
    }

    const now = audio.currentTime;

    // Short, punchy fire-blast sound.
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(180, now);
    oscillator.frequency.exponentialRampToValueAtTime(45, now + 0.16);

    volume.gain.setValueAtTime(0.0001, now);
    volume.gain.exponentialRampToValueAtTime(0.18, now + 0.015);
    volume.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    oscillator.connect(volume);
    volume.connect(audio.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.2);
}
function updateSurvivorCombat(deltaTime) {
    const survivorStats = {
        mason: { range: 180, damage: 15, fireRate: 1 },
        james: { range: 130, damage: 20, fireRate: 0.8 },
        cody: { range: 150, damage: 30, fireRate: 1.5 },
        britney: { range: 260, damage: 35, fireRate: 1.8 },
        zach: { range: 110, damage: 10, fireRate: 0.5 },
        brady: { range: 160, damage: 15, fireRate: 1 }
    };

    for (const survivor of survivors) {
        if (survivor.damageDealt === undefined) survivor.damageDealt = 0;
if (survivor.kills === undefined) survivor.kills = 0;
        const stats = survivorStats[survivor.type];
        if (!stats) continue;

        survivor.attackCooldown =
            Math.max(0, (survivor.attackCooldown || 0) - deltaTime);

        if (survivor.attackCooldown > 0) continue;

        for (const enemy of enemies) {
            if (enemy.finished || enemy.health <= 0) continue;

            const dx = enemy.x - survivor.x;
            const dy = enemy.y - survivor.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= stats.range) {
                enemy.lastHitBy = survivor;

const actualDamage = Math.min(stats.damage, enemy.health);
enemy.health -= actualDamage;

floatingDamageNumbers.push({
    x: enemy.x,
    y: enemy.y - 25,
    amount: Math.round(actualDamage),
    life: 0.8,
    maxLife: 0.8
});
                
 // James ignites enemies for 5 seconds.


if (survivor.type === "james") {
    enemy.burnTimer = 5;
    enemy.burnDamage = 10;

    if (enemy.burnTickTimer === undefined) {
        enemy.burnTickTimer = 1;
    }

    enemy.burnSource = survivor;
    playJamesBurnSound();
} else {
    playWeaponAttackSound(survivor.type);
}




function playWeaponAttackSound(type) {
    const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    if (!window.jamesAudioContext) {
        window.jamesAudioContext = new AudioContextClass();
    }

    const audio = window.jamesAudioContext;

    if (audio.state === "suspended") {
        audio.resume();
    }

    const now = audio.currentTime;
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();

    let startFrequency;
    let endFrequency;
    let duration;
    let waveType;
    let loudness;

    switch (type) {
        case "mason":
            // Handgun: sharp, punchy crack.
            startFrequency = 260;
            endFrequency = 65;
            duration = 0.09;
            waveType = "square";
            loudness = 0.10;
            break;

        case "cody":
    // Grenade launcher: chunky mechanical launch.
    startFrequency = 160;
    endFrequency = 55;
    duration = 0.13;
    waveType = "triangle";
    loudness = 0.12;
    break;

       
case "britney":
    // Sniper rifle: deep, fast, punchy crack.
    startFrequency = 280;
    endFrequency = 45;
    duration = 0.12;
    waveType = "sawtooth";
    loudness = 0.18;
    break;


        case "zach":
            // SMG: one short pop per shot.
            startFrequency = 420;
            endFrequency = 100;
            duration = 0.055;
            waveType = "square";
            loudness = 0.075;
            break;

        case "brady":
    // Shotgun: deep, powerful boom.
    startFrequency = 130;
    endFrequency = 30;
    duration = 0.22;
    waveType = "sawtooth";
    loudness = 0.16;
    break;

        default:
            return;
    }

    oscillator.type = waveType;
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
        endFrequency,
        now + duration
    );

    volume.gain.setValueAtTime(0.0001, now);
    volume.gain.exponentialRampToValueAtTime(
        loudness,
        now + 0.008
    );
    volume.gain.exponentialRampToValueAtTime(
        0.0001,
        now + duration
    );

    oscillator.connect(volume);
    volume.connect(audio.destination);

    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
}

                // Jolt backward, away from the enemy being shot.
const recoilStrength = 7;
survivor.recoilX -= (dx / distance) * recoilStrength;
survivor.recoilY -= (dy / distance) * recoilStrength;
                enemy.hitFlash = 0.15;
                survivor.damageDealt += actualDamage;
               bullets.push({
    startX: survivor.x,
    startY: survivor.y,
    endX: enemy.x,
    endY: enemy.y,
    life: 0.14,
    maxLife: 0.14,
    type: survivor.type
});
                survivor.attackCooldown = stats.fireRate;
                break;
            }
        }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].health <= 0) {
            if (enemies[i].lastHitBy) {
    enemies[i].lastHitBy.kills++;
}
            enemies.splice(i, 1);
            scrap += 10;
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
            : "#fff1a8";

        ctx.fillText(number.amount, x, y);
    }

    ctx.restore();
}

 
function drawBullets() {
    const styles = {
        mason:   { color: "#ffb52e", core: "#fff4b0", width: 5 },
        james:   { color: "#ff542e", core: "#ffd080", width: 7 },
        cody:    { color: "#35e7ff", core: "#ffffff", width: 6 },
        britney: { color: "#424141", core: "#fff4dc", width: 5 },        
        zach:    { color: "#a6ff3d", core: "#f4ffd8", width: 4 },
        brady:   { color: "#5595ff", core: "#d9e8ff", width: 5 }
    };

    ctx.save();
    ctx.lineCap = "round";

    for (const bullet of bullets) {
        const style = styles[bullet.type] || styles.mason;
        const dx = bullet.endX - bullet.startX;
        const dy = bullet.endY - bullet.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) continue;

        const fade = Math.max(0, bullet.life / bullet.maxLife);
        const ux = dx / distance;
        const uy = dy / distance;

        // Keep the projectile trail short and punchy.
        const trailLength = Math.min(
            bullet.type === "britney" ? 30 : 20,
            distance
        );

        const startX = bullet.endX - ux * trailLength;
        const startY = bullet.endY - uy * trailLength;

        ctx.globalAlpha = fade;
        ctx.shadowColor = style.color;
        ctx.shadowBlur = bullet.type === "cody" ? 18 : 10;

        // Main colored projectile trail.
        ctx.strokeStyle = style.color;
        ctx.lineWidth = style.width;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(bullet.endX, bullet.endY);
        ctx.stroke();

        // Bright inner core.
        ctx.shadowBlur = 0;
        ctx.strokeStyle = style.core;
        ctx.lineWidth = Math.max(1, style.width * 0.35);
        ctx.beginPath();
        ctx.moveTo(
            bullet.endX - ux * trailLength * 0.65,
            bullet.endY - uy * trailLength * 0.65
        );
        ctx.lineTo(bullet.endX, bullet.endY);
        ctx.stroke();

        // Unique arcade projectile shapes.
        ctx.fillStyle = style.color;
        ctx.beginPath();

        if (bullet.type === "cody") {
            // Demolitions: diamond-shaped energy round.
            ctx.moveTo(bullet.endX + ux * 7, bullet.endY + uy * 7);
            ctx.lineTo(bullet.endX - uy * 4, bullet.endY + ux * 4);
            ctx.lineTo(bullet.endX - ux * 7, bullet.endY - uy * 7);
            ctx.lineTo(bullet.endX + uy * 4, bullet.endY - ux * 4);
        } else if (bullet.type === "james") {
            // Firestarter: hot, oversized round.
            ctx.arc(bullet.endX, bullet.endY, 4, 0, Math.PI * 2);
        } else if (bullet.type === "zach") {
            // Runner: small, fast-looking streak tip.
            ctx.arc(bullet.endX, bullet.endY, 2.5, 0, Math.PI * 2);
        } else {
            // Other survivors: bright round projectile tip.
            ctx.arc(
                bullet.endX,
                bullet.endY,
                bullet.type === "britney" ? 2 : 3,
                0,
                Math.PI * 2
            );
        }

        ctx.fill();
    }

    ctx.restore();
}


function updateEnemies(deltaTime) {
    for (const enemy of enemies) {
        // Burning deals 3 damage per second.

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

playerHealth = Math.max(0, playerHealth - enemyDamage);

document.getElementById("healthDisplay").textContent =
    playerHealth + " HP";

if (playerHealth <= 0) {
    endGame();
    break;
}

                document.getElementById("healthDisplay").textContent =
    playerHealth + " HP";
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

    for (const enemy of enemies) {
        const isHollow = enemy.type === "hollow";
        const isSkitter = enemy.type === "skitter";

        const image = isHollow
            ? hollowImage
            : isSkitter
                ? skitterImage
                : spiderImage;

        const spriteWidth = isHollow ? 32 : 44;
        const spriteHeight = isHollow ? 64 : 44;

        if (isHollow && enemy.health > 0) {
            hollowAlive = true;
        }

        const bounce = gameRunning && !gamePaused
            ? Math.sin(performance.now() / 100 + enemy.x * 0.1) * 3
            : 0;

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
                enemy.x - spriteWidth / 2,
                enemy.y - spriteHeight / 2 + bounce,
                spriteWidth,
                spriteHeight
            );

                     ctx.restore();
        }

        // Small health bars for regular enemies.
        if (!isHollow) {
            const barWidth = 30;
            const barHeight = 5;
            const barX = enemy.x - barWidth / 2;
            const barY = enemy.y - spriteHeight / 2 - 12 + bounce;
            const healthPercent = Math.max(
                0,
                Math.min(1, enemy.health / enemy.maxHealth)
            );

            ctx.fillStyle = "#292b25";
            ctx.fillRect(barX, barY, barWidth, barHeight);

            ctx.fillStyle = healthPercent > 0.6
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
    drawDamageNumbers();
    drawBullets();
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

    const stats = {
        mason: { range: 180 },
        james: { range: 130 },
        cody: { range: 150 },
        britney: { range: 260 },
        zach: { range: 110 },
        brady: { range: 160 }
    };

    const range = stats[inspectedSurvivor.type]?.range;
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
const enemySpawnDelay = 1.2;
let enemyGroups = [];
let currentGroupIndex = 0;
let groupDelayStarted = false;




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

            spawnEnemy(group.type);
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

        document.getElementById("pauseButton").disabled = true;
        document.getElementById("pauseButton").textContent = "PAUSE";

        if (currentWave >= totalWaves) {
            document.getElementById("waveStatus").textContent =
                "VICTORY! All 15 waves defeated!";
            document.getElementById("startWaveButton").style.display = "none";
            return;
        }

        currentWave++;

        const startButton = document.getElementById("startWaveButton");
        startButton.textContent = "START WAVE " + currentWave;
        startButton.style.display = "block";
        startButton.disabled = false;

        document.getElementById("waveDisplay").textContent =
            currentWave + " / " + totalWaves;

        document.getElementById("waveStatus").textContent =
            "Wave cleared! Reposition your survivors and prepare.";

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

renderGame();
    }

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);


/* MAIN MENU NAVIGATION */

/* MENU AND DEPLOYMENT NAVIGATION */

const mainMenu = document.getElementById("mainMenu");
const levelSelect = document.getElementById("levelSelect");
const campaignSelect = document.getElementById("campaignSelect");
const deploymentScreen = document.getElementById("deploymentScreen");
const gameLayout = document.querySelector(".game-layout");

function endGame() {
    if (!gameRunning) return;

    gameRunning = false;
    waveRunning = false;
    gamePaused = false;

    document.getElementById("gameLayout");
    document.querySelector(".game-layout").style.display = "none";

    document.getElementById("gameOverMessage").textContent =
        "Your defenses have fallen. The wasteland is lost.";

    document.getElementById("finalWaveDisplay").textContent =
        "WAVE REACHED: " + currentWave + " / " + totalWaves;

    document.getElementById("gameOverScreen").style.display = "flex";
}

function showMenu() {
    gameRunning = false;
    previousTime = 0;

    mainMenu.style.display = "block";
    levelSelect.style.display = "none";
    campaignSelect.style.display = "none";
    deploymentScreen.style.display = "none";
    gameLayout.style.display = "none";
    document.getElementById("gameOverScreen").style.display = "none";
}
function showCampaignSelect() {
    gameRunning = false;
    previousTime = 0;

    mainMenu.style.display = "none";
    campaignSelect.style.display = "block";
    levelSelect.style.display = "none";
    deploymentScreen.style.display = "none";
    gameLayout.style.display = "none";
}

function showLevelSelect() {
    gameRunning = false;
    previousTime = 0;

    mainMenu.style.display = "none";
    levelSelect.style.display = "block";
    deploymentScreen.style.display = "none";
    gameLayout.style.display = "none";
    campaignSelect.style.display = "none";
}


const openingDialogue =
    "I heard there was a safe zone in the city. But this area is over run with mutant spiders and who knows what else. We have to move fast!";

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

document.getElementById("dialogueContinue").addEventListener("click", () => {
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
    currentLevel = level;
    roadPoints = campaignRoads[currentLevel];
    drawMap();

    gameRunning = false;
    previousTime = 0;

    mainMenu.style.display = "none";
    levelSelect.style.display = "none";
    campaignSelect.style.display = "none";
    deploymentScreen.style.display = "block";

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

    deploymentScreen.style.display = "none";
    gameLayout.style.display = "grid";

    // Reset the battlefield.
    survivors.length = 0;
    enemies.length = 0;
    bullets.length = 0;
    playerHealth = 100;
    scrap = 250;

    document.getElementById("scrapDisplay").textContent = scrap;
    document.getElementById("healthDisplay").textContent = "100 HP";
    document.getElementById("waveDisplay").textContent = "0 / 15";

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
        if (currentLevel === 1) {
    showOpeningDialogue();
}
}

document.getElementById("campaignButton").addEventListener("click", showCampaignSelect);
document.getElementById("outskirtsCampaignButton").addEventListener("click", showLevelSelect);
document.getElementById("campaignBackButton").addEventListener("click", showMenu);
document.getElementById("backToMenuButton").addEventListener("click", showMenu);


document.getElementById("mainMenuButton").addEventListener("click", () => {
    if (!gameRunning) {
        showMenu();
        return;
    }

    document.getElementById("returnMenuConfirm").style.display = "flex";
});

document.getElementById("cancelReturnButton").addEventListener("click", () => {
    document.getElementById("returnMenuConfirm").style.display = "none";
});

document.getElementById("confirmReturnButton").addEventListener("click", () => {
    document.getElementById("returnMenuConfirm").style.display = "none";
    showMenu();
});

document.getElementById("leaderboardButton").addEventListener("click", () => {
    alert("Leaderboard coming soon!");
});

document.getElementById("level1Button").addEventListener("click", () => {
    showDeployment(1);
});
document.getElementById("level2Button").addEventListener("click", () => {
    showDeployment(2);
});

document.getElementById("level3Button").addEventListener("click", () => {
    showDeployment(3);
});

document.getElementById("level4Button").addEventListener("click", () => {
    showDeployment(4);
});

document.getElementById("level5Button").addEventListener("click", () => {
    showDeployment(5);
});

document.getElementById("level6Button").addEventListener("click", () => {
    showDeployment(6);
});
document.getElementById("backToLevelsButton").addEventListener("click", showLevelSelect);
document.getElementById("startDefenseButton").addEventListener("click", startDefense);


document.getElementById("startWaveButton").addEventListener("click", startWave);

document.getElementById("startOverButton").addEventListener("click", () => {
    const confirmed = confirm("Restart from wave 1? All progress will be lost");

    if (confirmed) {
        startDefense();
    }
});



document.getElementById("pauseButton").addEventListener("click", () => {
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

document.getElementById("speedButton").addEventListener("click", () => {
    gameSpeed++;

    if (gameSpeed > 5) {
        gameSpeed = 1;
    }

    document.getElementById("speedButton").textContent = gameSpeed + "×";
});



document.getElementById("endlessButton").addEventListener("click", () => {
    alert("Endless mode is coming soon!");
});

document.getElementById("collectionButton").addEventListener("click", () => {
    alert("Survivor Collection is coming soon!");
});

document.getElementById("returnToMenuButton").addEventListener("click", () => {
    document.getElementById("gameOverScreen").style.display = "none";
    showMenu();
});

showMenu();


showMenu();

/* SURVIVOR ROSTER SELECTION */


const survivorDetails = {
    mason: {
        name: "Mason",
        role: "SCOUT",
        icon: "M",
        iconClass: "scout",
        cost: 50
    },
    james: {
        name: "James",
        role: "FIRESTARTER",
        icon: "J",
        iconClass: "pyro",
        cost: 75
    },
    cody: {
        name: "Cody",
        role: "DEMOLITIONS",
        icon: "C",
        iconClass: "demo",
        cost: 100
    },
    britney: {
        name: "Britney",
        role: "SHARPSHOOTER",
        icon: "B",
        iconClass: "sniper",
        cost: 125
    },
    zach: {
        name: "Zach",
        role: "RUNNER",
        icon: "Z",
        iconClass: "scout",
        cost: 60
    },
    brady: {
        name: "Brady T.",
        role: "ENGINEER",
        icon: "B",
        iconClass: "demo",
        cost: 90
    }
};

const maxRosterSize = 4;

const rosterCount = document.getElementById("rosterCount");
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
        } else {
            // Don't allow more than 4 survivors.
            if (selectedSurvivors.size >= maxRosterSize) {
                document.getElementById("deploymentMessage").textContent =
                    "Your roster is full! Maximum: 4 survivors.";
                return;
            }

            selectedSurvivors.add(survivorId);
            card.classList.add("selected");
        }

        rosterCount.textContent =
            selectedSurvivors.size + "/" + maxRosterSize;

        document.getElementById("deploymentMessage").textContent =
            selectedSurvivors.size === 0
                ? "Select survivors for your roster."
                : selectedSurvivors.size + " survivor(s) selected.";
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
        src="images/${portraitFiles[id]}"
        alt="${person.name}"
    >
    <span class="unit-info">
        <strong>${person.name}</strong>
        <small>${person.role} · ${person.cost} SCRAP</small>
    </span>
`;


        rosterList.appendChild(card);

card.addEventListener("click", () => {
    selectSurvivorToDeploy(id);
    showSurvivorDetails(id);
    
});
    });

    rosterCountDisplay.textContent = selectedSurvivors.size + " UNITS";
}

document.getElementById("cancelPlacementButton").addEventListener("click", () => {
    selectedSurvivor = null;

    document.getElementById("survivorDetailsPanel").style.display = "none";

    document.querySelectorAll("#inGameSurvivorList .survivor-card")
        .forEach(card => card.classList.remove("selected"));

    updateDeploymentMessage("Placement cancelled. Select a survivor to deploy.");
});


function updateWavePreview() {
    const preview = document.getElementById("wavePreview");

    if (!preview) return;

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

    const groups = waveGroups[currentWave];

    if (!groups) {
        preview.textContent = `Wave ${currentWave}: Spiders`;
        return;
    }

    preview.textContent = `Wave ${currentWave}: ` +
        groups.map(group =>
            `${group.count} ${group.type}${group.count > 1 ? "s" : ""}`
        ).join(" → ");
}

function updateSellButton() {
    const sellButton = document.getElementById("sellSurvivorButton");

    if (!sellButton) return;

    if (!inspectedSurvivor) {
        sellButton.textContent = "SELL";
        return;
    }

    const cost = survivorCosts[inspectedSurvivor.type];
    const refund = Math.floor(cost * 0.75);

    sellButton.textContent = "SELL — " + refund + " SCRAP";
}

document.getElementById("sellSurvivorButton").addEventListener("click", () => {
    if (!inspectedSurvivor) return;

    const cost = survivorCosts[inspectedSurvivor.type];
    const refund = Math.floor(cost * 0.75);
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

document.getElementById("moveSurvivorButton").addEventListener("click", () => {
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


