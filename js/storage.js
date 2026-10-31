/**
 * Storage, Persistence & Configuration Validation System
 *
 * Strictly separates:
 *  1. Admin Configuration (`birthday_adventure_config_v1` + backup `birthday_adventure_config_backup_v1`)
 *  2. Player Save Progress (`birthday_adventure_save_v1`)
 *  3. Preview Mode Session (`birthday_adventure_preview_v1` in sessionStorage)
 *
 * Editing personalized text, photos, or puzzles in the Admin Panel NEVER erases
 * the player's save progress, and invalid/malformed JSON imports are caught safely.
 */
(function (global) {
  const CONFIG_KEY = "birthday_adventure_config_v1";
  const CONFIG_BACKUP_KEY = "birthday_adventure_config_backup_v1";
  const SAVE_KEY = "birthday_adventure_save_v1";
  const PREVIEW_KEY = "birthday_adventure_preview_v1";

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Replace dynamic token placeholders like [Sister's Name ...] when recipientName has been customized,
  // or keep the readable placeholder if it hasn't been changed yet.
  function formatText(text, config) {
    if (typeof text !== "string") return "";
    const cfg = config || StorageManager.getConfig();
    const id = (cfg && cfg.identity) || {};
    const pers = (cfg && cfg.personalization) || {};
    let out = text;

    if (id.recipientName) {
      out = out.replace(/\[Sister's Name — e\.g\. Maya\]/g, id.recipientName);
      out = out.replace(/\{\{recipientName\}\}/g, id.recipientName);
    }
    if (id.recipientNickname) {
      out = out.replace(/\[Nickname — e\.g\. Starlight\]/g, id.recipientNickname);
      out = out.replace(/\{\{recipientNickname\}\}/g, id.recipientNickname);
    }
    if (id.senderName) {
      out = out.replace(/\[Your Name \/ Sibling\]/g, id.senderName);
      out = out.replace(/\{\{senderName\}\}/g, id.senderName);
    }
    if (Array.isArray(pers.favoriteThings)) {
      pers.favoriteThings.forEach((fav, idx) => {
        const pattern = new RegExp(`\\[Placeholder Favorite #${idx + 1}:[^\\]]*\\]`, "g");
        out = out.replace(pattern, fav);
      });
    }
    if (Array.isArray(pers.insideJokes)) {
      pers.insideJokes.forEach((joke, idx) => {
        const pattern = new RegExp(`\\[Placeholder Inside Joke #${idx + 1}:[^\\]]*\\]`, "g");
        out = out.replace(pattern, joke);
      });
    }
    return out;
  }

  // Merge user config on top of DEFAULT_GAME_CONFIG so newly added fields or missing arrays never break gameplay
  function normalizeConfig(rawConfig) {
    const base = deepClone(global.DEFAULT_GAME_CONFIG);
    if (!rawConfig || typeof rawConfig !== "object") {
      return base;
    }

    const merged = {
      ...base,
      version: rawConfig.version || base.version,
      lastModified: rawConfig.lastModified || new Date().toISOString(),
      admin: { ...base.admin, ...(rawConfig.admin || {}) },
      identity: { ...base.identity, ...(rawConfig.identity || {}) },
      personalization: {
        ...base.personalization,
        ...(rawConfig.personalization || {}),
        birthdayLetterBody: Array.isArray(rawConfig.personalization?.birthdayLetterBody)
          ? rawConfig.personalization.birthdayLetterBody
          : base.personalization.birthdayLetterBody,
        favoriteThings: Array.isArray(rawConfig.personalization?.favoriteThings)
          ? rawConfig.personalization.favoriteThings
          : base.personalization.favoriteThings,
        insideJokes: Array.isArray(rawConfig.personalization?.insideJokes)
          ? rawConfig.personalization.insideJokes
          : base.personalization.insideJokes,
        personalQuotes: Array.isArray(rawConfig.personalization?.personalQuotes)
          ? rawConfig.personalization.personalQuotes
          : base.personalization.personalQuotes
      },
      audio: { ...base.audio, ...(rawConfig.audio || {}) },
      areas: Array.isArray(rawConfig.areas) && rawConfig.areas.length === 4 ? rawConfig.areas : base.areas,
      npcs: Array.isArray(rawConfig.npcs) && rawConfig.npcs.length > 0 ? rawConfig.npcs : base.npcs,
      collectibles:
        Array.isArray(rawConfig.collectibles) && rawConfig.collectibles.length > 0
          ? rawConfig.collectibles
          : base.collectibles,
      quests: Array.isArray(rawConfig.quests) && rawConfig.quests.length > 0 ? rawConfig.quests : base.quests,
      puzzles: Array.isArray(rawConfig.puzzles) && rawConfig.puzzles.length > 0 ? rawConfig.puzzles : base.puzzles,
      memories: Array.isArray(rawConfig.memories) && rawConfig.memories.length > 0 ? rawConfig.memories : base.memories
    };

    return merged;
  }

  // Validate a configuration object and return { valid: boolean, errors: string[], warnings: string[] }
  function validateConfig(cfg) {
    const errors = [];
    const warnings = [];

    if (!cfg || typeof cfg !== "object") {
      return { valid: false, errors: ["Configuration must be a valid JSON object."], warnings };
    }

    if (!cfg.identity || typeof cfg.identity.gameTitle !== "string" || !cfg.identity.gameTitle.trim()) {
      errors.push("Game Title in General Settings cannot be empty.");
    }

    if (!Array.isArray(cfg.areas) || cfg.areas.length < 4) {
      errors.push("Configuration must include all 4 playable areas (garden, village, forest, sanctuary).");
    }

    if (!Array.isArray(cfg.puzzles) || cfg.puzzles.length < 5) {
      errors.push("Configuration must include the 5 core puzzles.");
    } else {
      // Check puzzle solvability so an edit doesn't make a level impossible to finish
      const dialPuzzle = cfg.puzzles.find((p) => p.id === "puzzle_village_dial");
      if (dialPuzzle) {
        const validSymbols = ["SUN", "MOON", "STAR", "COMET"];
        if (
          !Array.isArray(dialPuzzle.solution) ||
          dialPuzzle.solution.length !== 3 ||
          dialPuzzle.solution.some((s) => !validSymbols.includes(String(s).toUpperCase()))
        ) {
          errors.push(
            "Clocktower Dial Puzzle solution must be a 3-symbol sequence using only SUN, MOON, STAR, or COMET."
          );
        }
      }

      const echoPuzzle = cfg.puzzles.find((p) => p.id === "puzzle_forest_echo");
      if (echoPuzzle) {
        const validNotes = ["TEAL", "VIOLET", "GOLD", "ROSE"];
        if (
          !Array.isArray(echoPuzzle.solution) ||
          echoPuzzle.solution.length < 3 ||
          echoPuzzle.solution.length > 6 ||
          echoPuzzle.solution.some((n) => !validNotes.includes(String(n).toUpperCase()))
        ) {
          errors.push(
            "Echo Crystal Shrine solution must contain 3 to 6 crystal notes using TEAL, VIOLET, GOLD, or ROSE."
          );
        }
      }

      const gridPuzzle = cfg.puzzles.find((p) => p.id === "puzzle_forest_constellation");
      if (gridPuzzle) {
        if (
          !Array.isArray(gridPuzzle.solution) ||
          gridPuzzle.solution.length === 0 ||
          gridPuzzle.solution.some((idx) => typeof idx !== "number" || idx < 0 || idx > 8)
        ) {
          errors.push(
            "Constellation Gate Puzzle must have at least 1 active star index between 0 and 8 on the 3×3 grid."
          );
        }
      }
    }

    // Check remaining placeholders to inform the admin user
    const rawStr = JSON.stringify(cfg);
    if (rawStr.includes("[Sister's Name") || rawStr.includes("[Placeholder")) {
      warnings.push("Some placeholder text (e.g., [Sister's Name] or [Placeholder...]) is still present.");
    }
    if (Array.isArray(cfg.memories) && cfg.memories.some((m) => (m.imageUrl || "").startsWith("data:image/svg+xml"))) {
      warnings.push("One or more Memory Photos are still using illustrated placeholder art.");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  function createDefaultSaveState() {
    return {
      version: "1.0.0",
      hasStarted: false,
      lastSavedAt: null,
      currentAreaId: "garden",
      playerX: 160,
      playerY: 420,
      facing: "right",
      unlockedAreas: ["garden"],
      collectedItems: [], // array of collectible IDs
      talkedToNpcs: [], // array of NPC IDs
      solvedPuzzles: [], // array of puzzle IDs
      completedQuests: [], // array of quest IDs
      litPedestals: [], // array of memory IDs lit in the final sanctuary ("mem_1".."mem_4")
      examinedObjects: [], // array of scenery/clue IDs examined
      endingSeen: false,
      tutorialDismissed: false
    };
  }

  // Reconcile save state with current config so that if an admin edits config while a player
  // has an existing save, progress is preserved and any newly met quest conditions update cleanly.
  function reconcileSaveWithConfig(save, config) {
    const cleanSave = { ...createDefaultSaveState(), ...(save || {}) };
    const cfg = config || StorageManager.getConfig();

    const validAreaIds = cfg.areas.map((a) => a.id);
    if (!validAreaIds.includes(cleanSave.currentAreaId)) {
      cleanSave.currentAreaId = "garden";
    }

    if (!Array.isArray(cleanSave.unlockedAreas) || cleanSave.unlockedAreas.length === 0) {
      cleanSave.unlockedAreas = ["garden"];
    }

    // Ensure unlocked areas match solved puzzles / completed quests
    if (
      cleanSave.solvedPuzzles.includes("puzzle_garden_pedestal") ||
      cleanSave.completedQuests.includes("quest_garden_intro")
    ) {
      if (!cleanSave.unlockedAreas.includes("village")) cleanSave.unlockedAreas.push("village");
    }
    if (
      cleanSave.solvedPuzzles.includes("puzzle_village_dial") ||
      cleanSave.completedQuests.includes("quest_village_clocktower")
    ) {
      if (!cleanSave.unlockedAreas.includes("forest")) cleanSave.unlockedAreas.push("forest");
    }
    if (
      cleanSave.solvedPuzzles.includes("puzzle_forest_constellation") ||
      cleanSave.completedQuests.includes("quest_forest_sanctuary")
    ) {
      if (!cleanSave.unlockedAreas.includes("sanctuary")) cleanSave.unlockedAreas.push("sanctuary");
    }

    return cleanSave;
  }

  const StorageManager = {
    CONFIG_KEY,
    SAVE_KEY,

    getConfig() {
      // Check if we are in a temporary non-destructive Preview Mode session
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("preview") === "1") {
          const previewRaw = sessionStorage.getItem(PREVIEW_KEY);
          if (previewRaw) {
            return normalizeConfig(JSON.parse(previewRaw));
          }
        }
      } catch (e) {
        console.warn("Preview config read warning:", e);
      }

      try {
        const stored = localStorage.getItem(CONFIG_KEY);
        if (stored) {
          return normalizeConfig(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Failed to read stored config, falling back to default:", e);
      }
      return normalizeConfig(global.DEFAULT_GAME_CONFIG);
    },

    saveConfig(newConfig) {
      const normalized = normalizeConfig(newConfig);
      const validation = validateConfig(normalized);
      if (!validation.valid) {
        return { ok: false, errors: validation.errors, warnings: validation.warnings };
      }

      try {
        // Save current config as backup before overwriting
        const existing = localStorage.getItem(CONFIG_KEY);
        if (existing) {
          localStorage.setItem(CONFIG_BACKUP_KEY, existing);
        }
        normalized.lastModified = new Date().toISOString();
        localStorage.setItem(CONFIG_KEY, JSON.stringify(normalized));
        return { ok: true, config: normalized, errors: [], warnings: validation.warnings };
      } catch (e) {
        return {
          ok: false,
          errors: [
            "Browser storage quota exceeded or unavailable. Try using smaller/compressed photos or exporting as JSON: " +
              e.message
          ],
          warnings: validation.warnings
        };
      }
    },

    hasBackupConfig() {
      try {
        return Boolean(localStorage.getItem(CONFIG_BACKUP_KEY));
      } catch (e) {
        return false;
      }
    },

    restoreBackupConfig() {
      try {
        const backup = localStorage.getItem(CONFIG_BACKUP_KEY);
        if (!backup) {
          return { ok: false, error: "No previous configuration backup found in browser storage." };
        }
        const parsed = normalizeConfig(JSON.parse(backup));
        localStorage.setItem(CONFIG_KEY, JSON.stringify(parsed));
        return { ok: true, config: parsed };
      } catch (e) {
        return { ok: false, error: "Could not restore backup: " + e.message };
      }
    },

    resetConfigToDefault() {
      try {
        const existing = localStorage.getItem(CONFIG_KEY);
        if (existing) {
          localStorage.setItem(CONFIG_BACKUP_KEY, existing);
        }
        localStorage.removeItem(CONFIG_KEY);
        return { ok: true, config: normalizeConfig(global.DEFAULT_GAME_CONFIG) };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },

    setPreviewConfig(previewConfig) {
      try {
        const normalized = normalizeConfig(previewConfig);
        sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(normalized));
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },

    getSaveState() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return createDefaultSaveState();
        const parsed = JSON.parse(raw);
        return reconcileSaveWithConfig(parsed, this.getConfig());
      } catch (e) {
        console.warn("Could not read save state, returning fresh state:", e);
        return createDefaultSaveState();
      }
    },

    hasSavedGame() {
      const state = this.getSaveState();
      return Boolean(state && state.hasStarted);
    },

    saveGameState(state) {
      try {
        // Do not overwrite real player progress when running in Admin Preview Mode
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("preview") === "1") {
          return { ok: true, previewOnly: true };
        }
        const toSave = {
          ...state,
          hasStarted: true,
          lastSavedAt: new Date().toISOString()
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(toSave));
        return { ok: true, state: toSave };
      } catch (e) {
        console.error("Failed to save game progress:", e);
        return { ok: false, error: e.message };
      }
    },

    resetSaveState() {
      try {
        localStorage.removeItem(SAVE_KEY);
        return createDefaultSaveState();
      } catch (e) {
        return createDefaultSaveState();
      }
    },

    validateConfig,
    normalizeConfig,
    formatText,

    // Generate a standalone `defaultConfig.js` script string so the user can bundle their
    // personalized configuration directly into the distributable project folder for static hosting.
    generateBundledConfigJs(configObj) {
      const normalized = normalizeConfig(configObj || this.getConfig());
      return (
        "/**\n" +
        " * Personalized Configuration Bundle - Generated by Admin Panel\n" +
        " * Replace js/defaultConfig.js with this file before deploying to share your customizations with everyone!\n" +
        " */\n" +
        "(function (global) {\n" +
        "  global.DEFAULT_GAME_CONFIG = " +
        JSON.stringify(normalized, null, 2) +
        ";\n" +
        "})(window);\n"
      );
    }
  };

  global.StorageManager = StorageManager;
})(window);
