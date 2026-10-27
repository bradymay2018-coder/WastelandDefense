// Shared survivor balance contract for the static game and Survivor Builder.
// custom-survivors.js stores base inputs; game.js applies the live combat
// multipliers, upgrade formulas, and mode modifiers when a run starts.
(function defineWastelandBalanceProfile() {
    window.WD_SURVIVOR_BALANCE = Object.freeze({
        version: "rarity-v2",
        rarityRules: Object.freeze({
            common: Object.freeze({ cost: [50, 120], damage: [4, 24], range: [70, 190], fireRate: [0.55, 2.8] }),
            uncommon: Object.freeze({ cost: [90, 170], damage: [5, 30], range: [70, 220], fireRate: [0.5, 2.8] }),
            rare: Object.freeze({ cost: [140, 260], damage: [6, 38], range: [70, 260], fireRate: [0.45, 3.0] }),
            legendary: Object.freeze({ cost: [190, 420], damage: [8, 48], range: [60, 280], fireRate: [0.4, 3.2] })
        })
    });
})();
