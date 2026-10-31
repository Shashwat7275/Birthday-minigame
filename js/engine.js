/**
 * Main 2D Adventure Game Engine ("A Little Universe Made for You")
 *
 * Handles:
 *  - 60 FPS requestAnimationFrame game loop with delta-time clamping
 *  - Player movement, bounding-box obstacle collisions, & river hazard recovery
 *  - Smooth camera tracking with viewport clamping and parallax sky
 *  - Proximity detection & contextual interaction prompts (Talk, Collect, Examine, Activate, Enter)
 *  - Quest tracking, Inventory management, Collectible persistence, and Toast feedback
 *  - Touch-friendly Puzzle UI controllers (Sunbeam Pedestal, 3-Lantern Dial, Echo Crystal Shrine,
 *    Constellation 3x3 Grid, and Grand Starlight Birthday Cake Wish)
 *  - Final Birthday Sanctuary celebration sequence (Memory Photo Gallery, Animated Birthday Letter,
 *    Fireworks celebration, Replay Ending / Return to World)
 */
(function (global) {
  class BirthdayGameEngine {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.config = null;
      this.save = null;
      this.areas = null;
      this.currentArea = null;

      this.running = false;
      this.paused = false;
      this.modalOpen = false;
      this.dialogueOpen = false;

      this.time = 0;
      this.lastFrameTime = 0;
      this.stepSoundCooldown = 0;

      this.player = {
        x: 160,
        y: 430,
        radius: 16,
        speed: 225,
        facing: "right",
        state: "idle",
        stateTimer: 0
      };

      this.camera = {
        x: 0,
        y: 0,
        width: 800,
        height: 600
      };

      this.nearbyTarget = null;
      this.particles = [];
      this.fireworks = [];
      this.stars = [];

      // Active dialogue queue
      this.dialogueQueue = [];
      this.dialogueSpeaker = "";
      this.dialogueCallback = null;
    }

    init() {
      this.canvas = document.getElementById("game-canvas");
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext("2d");

      this.reloadConfigAndState();
      this.initAmbientParticles();
      this.bindUIEvents();

      global.GameInput.init();
      global.GameInput.onInteract = () => this.handlePrimaryAction();
      global.GameInput.onToggleInventory = () => this.toggleInventoryModal();
      global.GameInput.onToggleQuests = () => this.toggleQuestModal();
      global.GameInput.onTogglePause = () => this.togglePauseModal();
      global.GameInput.onCanvasWorldTap = (cx, cy) => this.handleCanvasTap(cx, cy);

      this.handleResize();
      window.addEventListener("resize", () => this.handleResize());
      window.addEventListener("orientationchange", () => setTimeout(() => this.handleResize(), 150));

      // Check URL params for direct preview mode from Admin Panel
      const params = new URLSearchParams(window.location.search);
      const previewTarget = params.get("previewScene");
      if (params.get("preview") === "1") {
        this.showBannerNotification("Admin Preview Mode Active (Player save will not be overwritten)");
        if (previewTarget === "finale") {
          this.startGame(false, "sanctuary");
          setTimeout(() => this.openFinalBirthdayShowcase(), 500);
        } else if (previewTarget && ["garden", "village", "forest", "sanctuary"].includes(previewTarget)) {
          this.startGame(false, previewTarget);
        }
      }

      this.lastFrameTime = performance.now();
      requestAnimationFrame((ts) => this.loop(ts));
    }

    reloadConfigAndState() {
      this.config = global.StorageManager.getConfig();
      this.save = global.StorageManager.getSaveState();
      this.areas = global.WorldBuilder.buildAreaDefinitions(this.config, this.save);
      global.GameAudio.applyConfig(this.config.audio);
      this.applyIdentityToDOM();
      this.evaluateQuestCompletions(true);
    }

    applyIdentityToDOM() {
      const fmt = (t) => global.StorageManager.formatText(t, this.config);
      const id = this.config.identity;

      document.title = `${fmt(id.gameTitle)} — ${fmt(id.subtitle)}`;
      document.body.setAttribute("data-text-size", id.textSize || "medium");

      const setTxt = (elId, val) => {
        const el = document.getElementById(elId);
        if (el) el.textContent = fmt(val);
      };

      setTxt("title-game-name", id.gameTitle);
      setTxt("title-game-subtitle", id.subtitle);
      setTxt("title-welcome-msg", id.welcomeMessage);
      setTxt("title-recipient-badge", `Crafted for ${fmt(id.recipientName)}`);

      // Show or hide Continue Journey button based on saved progress
      const continueBtn = document.getElementById("btn-continue-game");
      if (continueBtn) {
        if (global.StorageManager.hasSavedGame()) {
          continueBtn.classList.remove("hidden");
          const savedArea = this.config.areas.find((a) => a.id === this.save.currentAreaId);
          const areaLabel = savedArea ? savedArea.name : "The Whispering Garden";
          continueBtn.innerHTML = `<span class="btn-icon">✨</span> Continue Journey <small>(${areaLabel})</small>`;
        } else {
          continueBtn.classList.add("hidden");
        }
      }
    }

    initAmbientParticles() {
      this.stars = [];
      for (let i = 0; i < 65; i++) {
        this.stars.push({
          x: Math.random() * 1200,
          y: Math.random() * 240,
          r: 0.8 + Math.random() * 1.8,
          phase: Math.random() * Math.PI * 2
        });
      }

      this.particles = [];
      for (let i = 0; i < 38; i++) {
        this.particles.push({
          x: Math.random() * 1200,
          y: 120 + Math.random() * 680,
          vx: (Math.random() - 0.5) * 18,
          vy: -8 - Math.random() * 16,
          size: 2 + Math.random() * 3,
          alpha: 0.3 + Math.random() * 0.6,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    handleResize() {
      if (!this.canvas) return;
      const container = document.getElementById("game-viewport");
      const w = container ? container.clientWidth : window.innerWidth;
      const h = container ? container.clientHeight : window.innerHeight;
      this.canvas.width = Math.max(320, w);
      this.canvas.height = Math.max(320, h);
      this.camera.width = this.canvas.width;
      this.camera.height = this.canvas.height;
      this.updateCamera(1);
    }

    bindUIEvents() {
      const bindClick = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("click", fn);
      };

      bindClick("btn-new-game", () => {
        global.GameAudio.unlock();
        if (global.StorageManager.hasSavedGame()) {
          if (
            !window.confirm(
              "Start a New Journey from the beginning? This will replace your current saved progress (Admin customizations are kept safe)."
            )
          ) {
            return;
          }
        }
        this.save = global.StorageManager.resetSaveState();
        this.startGame(true, "garden");
      });

      bindClick("btn-continue-game", () => {
        global.GameAudio.unlock();
        this.save = global.StorageManager.getSaveState();
        this.startGame(false, this.save.currentAreaId || "garden");
      });

      bindClick("btn-open-controls", () => this.openControlsModal());
      bindClick("btn-close-controls", () => this.closeModal("modal-controls"));

      bindClick("hud-btn-inventory", () => this.toggleInventoryModal());
      bindClick("btn-close-inventory", () => this.closeModal("modal-inventory"));

      bindClick("hud-btn-quests", () => this.toggleQuestModal());
      bindClick("btn-close-quests", () => this.closeModal("modal-quests"));

      bindClick("hud-btn-pause", () => this.togglePauseModal());
      bindClick("btn-resume-game", () => this.closeModal("modal-pause"));
      bindClick("btn-pause-controls", () => {
        this.closeModal("modal-pause");
        this.openControlsModal();
      });
      bindClick("btn-return-title", () => {
        this.closeModal("modal-pause");
        this.returnToTitleScreen();
      });

      bindClick("dialogue-next-btn", () => this.advanceDialogue());
      const dlgBox = document.getElementById("dialogue-box");
      if (dlgBox) {
        dlgBox.addEventListener("click", (e) => {
          if (e.target.id !== "dialogue-next-btn") this.advanceDialogue();
        });
      }

      bindClick("btn-close-puzzle", () => this.closeModal("modal-puzzle"));
      bindClick("btn-close-finale", () => this.closeModal("modal-finale"));
      bindClick("btn-replay-finale", () => {
        global.GameAudio.playSfx("celebrate");
        this.spawnCelebrationFireworks();
      });

      // Audio toggles in pause/settings
      const musicToggle = document.getElementById("toggle-music");
      if (musicToggle) {
        musicToggle.checked = this.config.audio.musicEnabled !== false;
        musicToggle.addEventListener("change", () => {
          this.config.audio.musicEnabled = musicToggle.checked;
          global.GameAudio.applyConfig(this.config.audio);
        });
      }

      const sfxToggle = document.getElementById("toggle-sfx");
      if (sfxToggle) {
        sfxToggle.checked = this.config.audio.sfxEnabled !== false;
        sfxToggle.addEventListener("change", () => {
          this.config.audio.sfxEnabled = sfxToggle.checked;
          global.GameAudio.applyConfig(this.config.audio);
        });
      }
    }

    startGame(isNewGame, areaId) {
      const titleScreen = document.getElementById("title-screen");
      const hud = document.getElementById("game-hud");
      const touchControls = document.getElementById("touch-controls");

      if (titleScreen) titleScreen.classList.add("hidden");
      if (hud) hud.classList.remove("hidden");
      if (touchControls) touchControls.classList.remove("hidden");

      this.running = true;
      this.paused = false;

      this.loadArea(areaId || "garden", isNewGame ? "spawn" : "saved");

      if (isNewGame) {
        const openingLines = (this.config.identity.openingNarration || []).map((line) =>
          global.StorageManager.formatText(line, this.config)
        );
        if (openingLines.length > 0) {
          this.startDialogue("Storyteller", openingLines, () => {
            this.save.tutorialDismissed = true;
            this.persistProgress();
          });
        }
      }
    }

    returnToTitleScreen() {
      this.persistProgress();
      this.running = false;
      global.GameAudio.setTheme("title");
      const titleScreen = document.getElementById("title-screen");
      const hud = document.getElementById("game-hud");
      const touchControls = document.getElementById("touch-controls");
      if (titleScreen) titleScreen.classList.remove("hidden");
      if (hud) hud.classList.add("hidden");
      if (touchControls) touchControls.classList.add("hidden");
      this.applyIdentityToDOM();
    }

    loadArea(areaId, spawnMode = "spawn") {
      const areaDef = this.areas[areaId] || this.areas.garden;
      this.currentArea = areaDef;
      this.save.currentAreaId = areaDef.id;
      if (!this.save.unlockedAreas.includes(areaDef.id)) {
        this.save.unlockedAreas.push(areaDef.id);
      }

      if (spawnMode === "saved" && this.save.playerX && this.save.playerY) {
        this.player.x = this.save.playerX;
        this.player.y = this.save.playerY;
      } else if (spawnMode === "fromRight" && areaDef.fromRightSpawn) {
        this.player.x = areaDef.fromRightSpawn.x;
        this.player.y = areaDef.fromRightSpawn.y;
      } else {
        this.player.x = areaDef.spawn.x;
        this.player.y = areaDef.spawn.y;
      }

      this.updateCamera(1);
      global.GameAudio.setTheme(areaDef.id);
      this.updateHUD();
      this.persistProgress();

      const cfgArea = this.config.areas.find((a) => a.id === areaDef.id);
      if (cfgArea && cfgArea.openingBanner) {
        this.showBannerNotification(global.StorageManager.formatText(cfgArea.openingBanner, this.config));
      }
    }

    persistProgress() {
      this.save.playerX = Math.round(this.player.x);
      this.save.playerY = Math.round(this.player.y);
      this.save.facing = this.player.facing;
      global.StorageManager.saveGameState(this.save);
    }

    updateHUD() {
      if (!this.currentArea) return;
      const cfgArea = this.config.areas.find((a) => a.id === this.currentArea.id) || this.config.areas[0];
      const fmt = (s) => global.StorageManager.formatText(s, this.config);

      const areaNameEl = document.getElementById("hud-area-name");
      const areaSubEl = document.getElementById("hud-area-subtitle");
      if (areaNameEl) areaNameEl.textContent = fmt(cfgArea.name);
      if (areaSubEl) areaSubEl.textContent = fmt(cfgArea.subtitle);

      const totalCollectibles = this.config.collectibles.length;
      const collectedCount = this.save.collectedItems.length;
      const fragCountEl = document.getElementById("hud-fragment-count");
      if (fragCountEl) {
        fragCountEl.textContent = `${collectedCount} / ${totalCollectibles}`;
      }

      const activeQuest = this.getActiveMandatoryQuest();
      const trackerEl = document.getElementById("hud-quest-tracker");
      if (trackerEl) {
        if (activeQuest) {
          trackerEl.textContent = `Quest: ${fmt(activeQuest.title)}`;
        } else {
          trackerEl.textContent = "All Realm Quests Complete! ✨";
        }
      }
    }

    getActiveMandatoryQuest() {
      for (const q of this.config.quests) {
        if (q.isMandatory && !this.save.completedQuests.includes(q.id)) {
          return q;
        }
      }
      return null;
    }

    evaluateQuestCompletions(silent = false) {
      let newlyCompleted = false;

      this.config.quests.forEach((quest) => {
        if (this.save.completedQuests.includes(quest.id)) return;

        const hasItems = (quest.requiredCollectibles || []).every((itemId) =>
          this.save.collectedItems.includes(itemId)
        );
        const hasPuzzle =
          !quest.requiredPuzzleId || this.save.solvedPuzzles.includes(quest.requiredPuzzleId);

        // Special check for quest_village_whisk: must also have talked to Pip after collecting whisk
        if (quest.id === "quest_village_whisk") {
          if (hasItems && this.save.talkedToNpcs.includes("npc_pip_whisk_returned")) {
            this.completeQuest(quest, silent);
            newlyCompleted = true;
          }
          return;
        }

        if (hasItems && hasPuzzle) {
          if (
            quest.requiredCollectibles?.length > 0 ||
            quest.requiredPuzzleId
          ) {
            this.completeQuest(quest, silent);
            newlyCompleted = true;
          }
        }
      });

      if (newlyCompleted) {
        this.updateHUD();
        this.persistProgress();
      }
    }

    completeQuest(quest, silent = false) {
      if (this.save.completedQuests.includes(quest.id)) return;
      this.save.completedQuests.push(quest.id);

      // Unlock corresponding next area
      if (quest.id === "quest_garden_intro" && !this.save.unlockedAreas.includes("village")) {
        this.save.unlockedAreas.push("village");
      }
      if (quest.id === "quest_village_clocktower" && !this.save.unlockedAreas.includes("forest")) {
        this.save.unlockedAreas.push("forest");
      }
      if (quest.id === "quest_forest_sanctuary" && !this.save.unlockedAreas.includes("sanctuary")) {
        this.save.unlockedAreas.push("sanctuary");
      }

      if (!silent) {
        global.GameAudio.playSfx("quest");
        this.player.state = "celebrate";
        this.player.stateTimer = 1.4;
        const fmt = (s) => global.StorageManager.formatText(s, this.config);
        this.showToastNotification(
          `Quest Complete: ${fmt(quest.title)}`,
          fmt(quest.completionMessage || quest.rewardText),
          "quest"
        );
      }
    }

    handlePrimaryAction() {
      if (!this.running) return;
      if (this.dialogueOpen) {
        this.advanceDialogue();
        return;
      }
      if (this.modalOpen || this.paused) return;

      if (!this.nearbyTarget) return;
      this.executeTargetInteraction(this.nearbyTarget);
    }

    handleCanvasTap(canvasX, canvasY) {
      if (!this.running || this.dialogueOpen || this.modalOpen || this.paused) return;
      const worldX = canvasX + this.camera.x;
      const worldY = canvasY + this.camera.y;

      // If the player tapped directly on the currently nearby target (or within 115px of player), interact
      if (this.nearbyTarget) {
        const distToTap = Math.hypot(worldX - this.nearbyTarget.x, worldY - this.nearbyTarget.y);
        if (distToTap < 72) {
          this.executeTargetInteraction(this.nearbyTarget);
        }
      }
    }

    executeTargetInteraction(target) {
      const fmt = (s) => global.StorageManager.formatText(s, this.config);

      if (target.kind === "collectible") {
        const item = target.data;
        if (!this.save.collectedItems.includes(item.id)) {
          this.save.collectedItems.push(item.id);
          this.player.state = "collect";
          this.player.stateTimer = 0.9;
          global.GameAudio.playSfx(item.isSecret ? "secret" : "collect");

          this.spawnPickupBurst(item.x, item.y, item.color || "#ffd166");
          this.showToastNotification(
            `${item.icon || "✨"} Collected: ${fmt(item.name)}`,
            fmt(item.pickupMessage || item.description),
            item.isSecret ? "secret" : "item"
          );

          this.evaluateQuestCompletions(false);
          this.updateHUD();
          this.persistProgress();
        }
        return;
      }

      if (target.kind === "npc") {
        const npc = target.data;
        this.player.state = "interact";
        this.player.stateTimer = 0.6;
        global.GameAudio.playSfx("talk");

        if (!this.save.talkedToNpcs.includes(npc.id)) {
          this.save.talkedToNpcs.push(npc.id);
        }

        // Determine context-aware dialogue for this NPC
        let lines = [];
        if (npc.id === "npc_rowan") {
          const done = this.save.completedQuests.includes("quest_garden_intro");
          lines = done ? npc.dialogueAfterQuest : npc.dialogueBeforeQuest;
        } else if (npc.id === "npc_pip") {
          const hasWhisk = this.save.collectedItems.includes("item_silver_whisk");
          if (hasWhisk) {
            if (!this.save.talkedToNpcs.includes("npc_pip_whisk_returned")) {
              this.save.talkedToNpcs.push("npc_pip_whisk_returned");
            }
            lines = npc.dialogueAfterQuest;
          } else {
            lines = npc.dialogueBeforeQuest;
          }
        } else if (npc.id === "npc_lyra" || npc.id === "npc_orion") {
          const done = this.save.completedQuests.includes("quest_village_clocktower");
          lines = done ? npc.dialogueAfterQuest : npc.dialogueBeforeQuest;
        } else if (npc.id === "npc_sylvi") {
          const done = this.save.completedQuests.includes("quest_forest_sanctuary");
          lines = done ? npc.dialogueAfterQuest : npc.dialogueBeforeQuest;
        } else if (npc.id === "npc_celeste") {
          const allLit = (this.save.litPedestals || []).length >= 4;
          lines = allLit ? npc.dialogueAfterQuest : npc.dialogueBeforeQuest;
        } else {
          lines = npc.dialogueBeforeQuest || [npc.greeting];
        }

        const formattedLines = [fmt(npc.greeting), ...(lines || []).map((l) => fmt(l))];
        this.startDialogue(`${fmt(npc.name)} (${fmt(npc.role)})`, formattedLines, () => {
          this.evaluateQuestCompletions(false);
          this.updateHUD();
          this.persistProgress();
        });
        return;
      }

      if (target.kind === "interactable") {
        const obj = target.data;

        if (obj.type === "examine") {
          global.GameAudio.playSfx("talk");
          if (!this.save.examinedObjects.includes(obj.id)) {
            this.save.examinedObjects.push(obj.id);
            this.persistProgress();
          }
          this.startDialogue(fmt(obj.title), (obj.dialogue || []).map((d) => fmt(d)));
          return;
        }

        if (obj.type === "memory_pedestal") {
          global.GameAudio.playSfx("secret");
          if (!this.save.litPedestals.includes(obj.memoryId)) {
            this.save.litPedestals.push(obj.memoryId);
            this.spawnPickupBurst(obj.x, obj.y, "#ff7eb6");
            this.persistProgress();
          }
          this.openSingleMemoryModal(obj.memoryId);
          return;
        }

        if (obj.type === "puzzle") {
          global.GameAudio.playSfx("chime");
          this.openPuzzleModal(obj.puzzleId);
          return;
        }

        if (obj.type === "portal") {
          const isUnlocked =
            obj.unlockQuestId === "none" ||
            this.save.completedQuests.includes(obj.unlockQuestId) ||
            this.save.unlockedAreas.includes(obj.targetAreaId);

          if (!isUnlocked) {
            global.GameAudio.playSfx("error");
            this.startDialogue(fmt(obj.title), [fmt(obj.lockedMessage)]);
            return;
          }

          global.GameAudio.playSfx("chime");
          const goingBack =
            (this.currentArea.id === "village" && obj.targetAreaId === "garden") ||
            (this.currentArea.id === "forest" && obj.targetAreaId === "village") ||
            (this.currentArea.id === "sanctuary" && obj.targetAreaId === "forest");
          this.transitionToArea(obj.targetAreaId, goingBack ? "fromRight" : "spawn");
        }
      }
    }

    transitionToArea(targetAreaId, spawnMode) {
      const fader = document.getElementById("scene-fader");
      if (fader) fader.classList.add("fade-active");
      setTimeout(() => {
        this.loadArea(targetAreaId, spawnMode);
        if (fader) fader.classList.remove("fade-active");
      }, 280);
    }

    // =========================================================================
    // DIALOGUE SYSTEM
    // =========================================================================
    startDialogue(speaker, lines, onComplete = null) {
      if (!lines || lines.length === 0) return;
      this.dialogueOpen = true;
      this.dialogueSpeaker = speaker;
      this.dialogueQueue = [...lines];
      this.dialogueCallback = onComplete;

      const box = document.getElementById("dialogue-box");
      if (box) box.classList.remove("hidden");
      this.renderCurrentDialogueLine();
    }

    renderCurrentDialogueLine() {
      const speakerEl = document.getElementById("dialogue-speaker");
      const textEl = document.getElementById("dialogue-text");
      const nextBtn = document.getElementById("dialogue-next-btn");

      if (speakerEl) speakerEl.textContent = this.dialogueSpeaker;
      if (textEl) textEl.textContent = this.dialogueQueue[0] || "";
      if (nextBtn) {
        nextBtn.textContent = this.dialogueQueue.length > 1 ? "Next ▸" : "Done ✓";
      }
    }

    advanceDialogue() {
      if (!this.dialogueOpen) return;
      global.GameAudio.playSfx("talk");
      this.dialogueQueue.shift();
      if (this.dialogueQueue.length > 0) {
        this.renderCurrentDialogueLine();
      } else {
        this.dialogueOpen = false;
        const box = document.getElementById("dialogue-box");
        if (box) box.classList.add("hidden");
        if (this.dialogueCallback) {
          const cb = this.dialogueCallback;
          this.dialogueCallback = null;
          cb();
        }
      }
    }

    // =========================================================================
    // PUZZLE INTERFACES (Touch & Desktop Friendly)
    // =========================================================================
    openPuzzleModal(puzzleId) {
      const puzzle = this.config.puzzles.find((p) => p.id === puzzleId);
      if (!puzzle) return;

      const fmt = (s) => global.StorageManager.formatText(s, this.config);
      const modal = document.getElementById("modal-puzzle");
      const titleEl = document.getElementById("puzzle-title");
      const descEl = document.getElementById("puzzle-instructions");
      const bodyEl = document.getElementById("puzzle-interactive-body");
      const feedbackEl = document.getElementById("puzzle-feedback");

      if (!modal || !bodyEl) return;
      this.modalOpen = true;
      modal.classList.remove("hidden");

      const alreadySolved = this.save.solvedPuzzles.includes(puzzle.id);
      titleEl.textContent = fmt(puzzle.name);
      descEl.textContent = fmt(puzzle.instructions);
      feedbackEl.textContent = alreadySolved
        ? "✓ This mechanism is already harmonized! You can replay it or close this window."
        : fmt(puzzle.question);
      feedbackEl.className = "puzzle-feedback " + (alreadySolved ? "success" : "");
      bodyEl.innerHTML = "";

      // Hint toggle button
      const hintBar = document.createElement("div");
      hintBar.className = "puzzle-hint-bar";
      const hintBtn = document.createElement("button");
      hintBtn.type = "button";
      hintBtn.className = "btn-secondary btn-sm";
      hintBtn.textContent = "💡 Show Hint";
      const hintText = document.createElement("p");
      hintText.className = "puzzle-hint-text hidden";
      hintText.textContent = fmt(puzzle.hint);
      hintBtn.addEventListener("click", () => {
        hintText.classList.toggle("hidden");
      });
      hintBar.appendChild(hintBtn);
      hintBar.appendChild(hintText);

      // 1. Sunbeam Pedestal (Area 1: Item Infusion)
      if (puzzle.id === "puzzle_garden_pedestal") {
        const sockets = [
          { itemId: "item_petal_1", label: "Dawn Socket", icon: "🌸" },
          { itemId: "item_petal_2", label: "Twilight Socket", icon: "🌸" },
          { itemId: "item_petal_3", label: "Midnight Socket", icon: "🌸" }
        ];
        const infused = new Set(alreadySolved ? [0, 1, 2] : []);
        const row = document.createElement("div");
        row.className = "puzzle-socket-row";

        sockets.forEach((sock, idx) => {
          const hasPetal = this.save.collectedItems.includes(sock.itemId);
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "puzzle-socket-card" + (infused.has(idx) ? " active" : "");
          btn.innerHTML = `
            <div class="socket-icon">${infused.has(idx) ? "☀️" : hasPetal ? sock.icon : "🔒"}</div>
            <div class="socket-title">${sock.label}</div>
            <div class="socket-status">${
              infused.has(idx) ? "Infused!" : hasPetal ? "Tap to Infuse" : "Find Petal in Garden"
            }</div>
          `;
          btn.addEventListener("click", () => {
            if (!hasPetal) {
              global.GameAudio.playSfx("error");
              feedbackEl.textContent =
                "You haven't collected this Starlight Petal yet! Explore the Whispering Garden paths.";
              feedbackEl.className = "puzzle-feedback error";
              return;
            }
            infused.add(idx);
            btn.classList.add("active");
            btn.querySelector(".socket-icon").textContent = "☀️";
            btn.querySelector(".socket-status").textContent = "Infused!";
            global.GameAudio.playSfx("chime");

            if (infused.size === 3) {
              this.markPuzzleSolved(puzzle, feedbackEl);
            }
          });
          row.appendChild(btn);
        });
        bodyEl.appendChild(row);
      }

      // 2. Clocktower 3-Lantern Dial (Area 2: Symbol Code)
      else if (puzzle.id === "puzzle_village_dial") {
        const symbols = [
          { code: "SUN", display: "☀️ SUN" },
          { code: "MOON", display: "🌙 MOON" },
          { code: "STAR", display: "⭐ STAR" },
          { code: "COMET", display: "☄️ COMET" }
        ];
        const currentIndices = alreadySolved ? [0, 1, 2] : [3, 3, 3];
        const row = document.createElement("div");
        row.className = "puzzle-socket-row";

        const dialButtons = [];
        for (let i = 0; i < 3; i++) {
          const dialBtn = document.createElement("button");
          dialBtn.type = "button";
          dialBtn.className = "puzzle-socket-card dial-card";
          const renderDial = () => {
            const sym = symbols[currentIndices[i]];
            dialBtn.innerHTML = `
              <div class="socket-title">Lantern Dial #${i + 1}</div>
              <div class="socket-icon">${sym.display.split(" ")[0]}</div>
              <div class="socket-status">${sym.code} (Tap to Rotate)</div>
            `;
          };
          renderDial();
          dialBtn.addEventListener("click", () => {
            currentIndices[i] = (currentIndices[i] + 1) % symbols.length;
            global.GameAudio.playSfx("talk");
            renderDial();
          });
          dialButtons.push(dialBtn);
          row.appendChild(dialBtn);
        }

        const verifyBtn = document.createElement("button");
        verifyBtn.type = "button";
        verifyBtn.className = "btn-primary puzzle-submit-btn";
        verifyBtn.textContent = "✨ Align Clocktower Chimes";
        verifyBtn.addEventListener("click", () => {
          const picked = currentIndices.map((idx) => symbols[idx].code);
          const target = (puzzle.solution || ["SUN", "MOON", "STAR"]).map((s) =>
            String(s).toUpperCase()
          );
          if (picked.join(",") === target.join(",")) {
            this.markPuzzleSolved(puzzle, feedbackEl);
          } else {
            global.GameAudio.playSfx("error");
            feedbackEl.textContent = `Current alignment (${picked.join(
              " → "
            )}) didn't resonate. Check the clues from Pip, Lyra, and Orion!`;
            feedbackEl.className = "puzzle-feedback error";
          }
        });

        bodyEl.appendChild(row);
        bodyEl.appendChild(verifyBtn);
      }

      // 3. Echo Crystal Shrine (Area 3: 4-Note Sequence)
      else if (puzzle.id === "puzzle_forest_echo") {
        const crystals = [
          { code: "TEAL", label: "Teal Brook", icon: "💎", color: "#64dfdf" },
          { code: "VIOLET", label: "Violet Dusk", icon: "🔮", color: "#9b87ff" },
          { code: "GOLD", label: "Gold Lantern", icon: "🌟", color: "#ffd166" },
          { code: "ROSE", label: "Rose Dawn", icon: "🌺", color: "#ff7eb6" }
        ];
        const targetSeq = (puzzle.solution || ["TEAL", "VIOLET", "GOLD", "ROSE"]).map((s) =>
          String(s).toUpperCase()
        );
        let entered = [];

        const seqDisplay = document.createElement("div");
        seqDisplay.className = "puzzle-sequence- slots";
        const updateSeqDisplay = () => {
          seqDisplay.textContent =
            entered.length === 0
              ? "Notes Played: (Tap crystals below in order)"
              : `Notes Played: ${entered.join(" → ")}`;
        };
        updateSeqDisplay();

        const row = document.createElement("div");
        row.className = "puzzle-socket-row";
        crystals.forEach((c) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "puzzle-socket-card";
          btn.innerHTML = `
            <div class="socket-icon">${c.icon}</div>
            <div class="socket-title">${c.label}</div>
            <div class="socket-status">${c.code}</div>
          `;
          btn.addEventListener("click", () => {
            entered.push(c.code);
            global.GameAudio.playSfx("chime");
            updateSeqDisplay();

            // Check prefix
            for (let i = 0; i < entered.length; i++) {
              if (entered[i] !== targetSeq[i]) {
                global.GameAudio.playSfx("error");
                feedbackEl.textContent =
                  "That note broke the harmony! Sequence reset—check the Mossy Rune Tablet clue.";
                feedbackEl.className = "puzzle-feedback error";
                entered = [];
                setTimeout(updateSeqDisplay, 350);
                return;
              }
            }

            if (entered.length === targetSeq.length) {
              this.markPuzzleSolved(puzzle, feedbackEl);
            }
          });
          row.appendChild(btn);
        });

        bodyEl.appendChild(seqDisplay);
        bodyEl.appendChild(row);
      }

      // 4. Ancient Constellation Gate (Area 3: 3x3 Star Grid + 3 Dewdrops)
      else if (puzzle.id === "puzzle_forest_constellation") {
        const hasEcho = this.save.solvedPuzzles.includes("puzzle_forest_echo");
        const dewdropsCount = ["item_dewdrop_1", "item_dewdrop_2", "item_dewdrop_3"].filter((id) =>
          this.save.collectedItems.includes(id)
        ).length;

        const statusBanner = document.createElement("div");
        statusBanner.className = "puzzle-prereq-banner";
        statusBanner.innerHTML = `
          <span>Echo Shrine Harmonized: <strong>${hasEcho ? "✓ Yes" : "✗ Not Yet"}</strong></span>
          <span>Astral Dewdrops: <strong>${dewdropsCount} / 3</strong></span>
        `;
        bodyEl.appendChild(statusBanner);

        const targetIndices = new Set(puzzle.solution || [0, 2, 4, 6, 8]);
        const activeCells = new Set(alreadySolved ? puzzle.solution : [4]);

        const grid = document.createElement("div");
        grid.className = "constellation-grid";

        for (let idx = 0; idx < 9; idx++) {
          const cell = document.createElement("button");
          cell.type = "button";
          cell.className = "constellation-cell" + (activeCells.has(idx) ? " lit" : "");
          const renderCell = () => {
            cell.textContent = activeCells.has(idx) ? "⭐" : "☆";
            cell.classList.toggle("lit", activeCells.has(idx));
          };
          renderCell();

          cell.addEventListener("click", () => {
            if (activeCells.has(idx)) activeCells.delete(idx);
            else activeCells.add(idx);
            global.GameAudio.playSfx("talk");
            renderCell();
          });
          grid.appendChild(cell);
        }

        const verifyBtn = document.createElement("button");
        verifyBtn.type = "button";
        verifyBtn.className = "btn-primary puzzle-submit-btn";
        verifyBtn.textContent = "🌌 Channel Starlight & Unseal Sanctuary";
        verifyBtn.addEventListener("click", () => {
          if (!hasEcho) {
            global.GameAudio.playSfx("error");
            feedbackEl.textContent =
              "First harmonize the Echo Crystal Shrine in the northwest forest grove!";
            feedbackEl.className = "puzzle-feedback error";
            return;
          }
          if (dewdropsCount < 3) {
            global.GameAudio.playSfx("error");
            feedbackEl.textContent = `You need all 3 Astral Dewdrops (${dewdropsCount}/3 found) along the Mist Brook stepping stones!`;
            feedbackEl.className = "puzzle-feedback error";
            return;
          }

          const isMatch =
            activeCells.size === targetIndices.size &&
            [...targetIndices].every((i) => activeCells.has(i));

          if (isMatch) {
            this.markPuzzleSolved(puzzle, feedbackEl);
          } else {
            global.GameAudio.playSfx("error");
            feedbackEl.textContent =
              "The constellation pattern doesn't match the Five-Star Crown (light the 4 corners + center star).";
            feedbackEl.className = "puzzle-feedback error";
          }
        });

        bodyEl.appendChild(grid);
        bodyEl.appendChild(verifyBtn);
      }

      // 5. Final Birthday Cake Wish (Area 4: Sanctuary Finale)
      else if (puzzle.id === "puzzle_sanctuary_wish") {
        const litPedestalsCount = (this.save.litPedestals || []).length;
        const candles = [
          { label: "Garden Sun Candle", icon: "☀️" },
          { label: "Village Moon Candle", icon: "🌙" },
          { label: "Forest Star Candle", icon: "⭐" },
          { label: "Sanctuary Heart Candle", icon: "💖" }
        ];
        const litCandles = new Set(alreadySolved ? [0, 1, 2, 3] : []);

        const status = document.createElement("div");
        status.className = "puzzle-prereq-banner";
        status.innerHTML = `<span>Memory Pedestals Ignited: <strong>${litPedestalsCount} / 4</strong></span>`;
        bodyEl.appendChild(status);

        const row = document.createElement("div");
        row.className = "puzzle-socket-row";

        candles.forEach((c, idx) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "puzzle-socket-card" + (litCandles.has(idx) ? " active" : "");
          btn.innerHTML = `
            <div class="socket-icon">${litCandles.has(idx) ? "🕯️✨" : c.icon}</div>
            <div class="socket-title">${c.label}</div>
            <div class="socket-status">${litCandles.has(idx) ? "Glowing!" : "Tap to Light"}</div>
          `;
          btn.addEventListener("click", () => {
            if (litPedestalsCount < 4) {
              global.GameAudio.playSfx("error");
              feedbackEl.textContent = `Walk around the Sanctuary pavilion and activate all 4 Memory Pedestals first (${litPedestalsCount}/4 lit)!`;
              feedbackEl.className = "puzzle-feedback error";
              return;
            }
            litCandles.add(idx);
            btn.classList.add("active");
            btn.querySelector(".socket-icon").textContent = "🕯️✨";
            btn.querySelector(".socket-status").textContent = "Glowing!";
            global.GameAudio.playSfx("chime");

            if (litCandles.size === 4) {
              this.markPuzzleSolved(puzzle, feedbackEl);
              setTimeout(() => {
                this.closeModal("modal-puzzle");
                this.openFinalBirthdayShowcase();
              }, 850);
            }
          });
          row.appendChild(btn);
        });
        bodyEl.appendChild(row);
      }

      bodyEl.appendChild(hintBar);
    }

    markPuzzleSolved(puzzle, feedbackEl) {
      const fmt = (s) => global.StorageManager.formatText(s, this.config);
      if (!this.save.solvedPuzzles.includes(puzzle.id)) {
        this.save.solvedPuzzles.push(puzzle.id);
      }
      global.GameAudio.playSfx("quest");
      feedbackEl.textContent = `✨ ${fmt(puzzle.completionMessage)}`;
      feedbackEl.className = "puzzle-feedback success";

      this.evaluateQuestCompletions(false);
      this.updateHUD();
      this.persistProgress();
    }

    // =========================================================================
    // MEMORY PEDESTAL & FINAL BIRTHDAY SURPRISE SHOWCASE
    // =========================================================================
    openSingleMemoryModal(memoryId) {
      const mem =
        this.config.memories.find((m) => m.id === memoryId) || this.config.memories[0];
      if (!mem) return;
      const fmt = (s) => global.StorageManager.formatText(s, this.config);

      const modal = document.getElementById("modal-puzzle");
      const titleEl = document.getElementById("puzzle-title");
      const descEl = document.getElementById("puzzle-instructions");
      const bodyEl = document.getElementById("puzzle-interactive-body");
      const feedbackEl = document.getElementById("puzzle-feedback");

      this.modalOpen = true;
      modal.classList.remove("hidden");
      titleEl.textContent = `✨ ${fmt(mem.title)}`;
      descEl.textContent = `Memory Pedestal Activated (${this.save.litPedestals.length} / 4 Lit)`;
      feedbackEl.textContent = fmt(mem.caption);
      feedbackEl.className = "puzzle-feedback success";

      bodyEl.innerHTML = `
        <div class="memory-single-frame">
          <img src="${mem.imageUrl}" alt="${fmt(mem.title)}" style="object-fit: ${
        mem.displayMode || "contain"
      }" />
        </div>
      `;
    }

    openFinalBirthdayShowcase() {
      const fmt = (s) => global.StorageManager.formatText(s, this.config);
      const modal = document.getElementById("modal-finale");
      if (!modal) return;

      this.save.endingSeen = true;
      this.persistProgress();
      this.modalOpen = true;
      modal.classList.remove("hidden");
      global.GameAudio.playSfx("celebrate");
      this.spawnCelebrationFireworks();

      const bannerEl = document.getElementById("finale-banner-title");
      const subEl = document.getElementById("finale-banner-subtitle");
      const greetingEl = document.getElementById("finale-letter-greeting");
      const bodyEl = document.getElementById("finale-letter-body");
      const signoffEl = document.getElementById("finale-letter-signoff");
      const galleryEl = document.getElementById("finale-photo-gallery");
      const favListEl = document.getElementById("finale-favorites-list");

      if (bannerEl) bannerEl.textContent = fmt(this.config.personalization.finalBannerMessage);
      if (subEl) {
        subEl.textContent = (this.config.identity.closingNarration || [])
          .map((l) => fmt(l))
          .join(" ");
      }
      if (greetingEl) {
        greetingEl.textContent = fmt(this.config.personalization.birthdayLetterGreeting);
      }
      if (bodyEl) {
        bodyEl.innerHTML = "";
        (this.config.personalization.birthdayLetterBody || []).forEach((para) => {
          const p = document.createElement("p");
          p.textContent = fmt(para);
          bodyEl.appendChild(p);
        });
      }
      if (signoffEl) {
        signoffEl.textContent = fmt(this.config.personalization.birthdayLetterSignoff);
      }

      if (galleryEl) {
        galleryEl.innerHTML = "";
        const sortedMemories = [...(this.config.memories || [])].sort(
          (a, b) => (a.order || 0) - (b.order || 0)
        );
        sortedMemories.forEach((mem) => {
          const card = document.createElement("div");
          card.className = "finale-photo-card";
          card.innerHTML = `
            <div class="finale-photo-img-wrap">
              <img src="${mem.imageUrl}" alt="${fmt(mem.title)}" style="object-fit:${
            mem.displayMode || "contain"
          }" />
            </div>
            <h4>${fmt(mem.title)}</h4>
            <p>${fmt(mem.caption)}</p>
          `;
          galleryEl.appendChild(card);
        });
      }

      if (favListEl) {
        favListEl.innerHTML = "";
        const traits = [
          ...(this.config.personalization.favoriteThings || []),
          ...(this.config.personalization.insideJokes || [])
        ];
        traits.forEach((item) => {
          const badge = document.createElement("span");
          badge.className = "finale-trait-pill";
          badge.textContent = `✨ ${fmt(item)}`;
          favListEl.appendChild(badge);
        });
      }
    }

    spawnCelebrationFireworks() {
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          const fx = 250 + Math.random() * 700;
          const fy = 160 + Math.random() * 350;
          const colors = ["#ff7eb6", "#ffd166", "#72efdd", "#c77dff", "#80ed99"];
          this.spawnPickupBurst(fx, fy, colors[i % colors.length], 24);
        }, i * 240);
      }
    }

    // =========================================================================
    // INVENTORY, QUEST JOURNAL, CONTROLS & PAUSE MODALS
    // =========================================================================
    toggleInventoryModal() {
      const modal = document.getElementById("modal-inventory");
      if (!modal) return;
      if (!modal.classList.contains("hidden")) {
        this.closeModal("modal-inventory");
        return;
      }
      this.closeAllModals();
      this.modalOpen = true;
      modal.classList.remove("hidden");

      const grid = document.getElementById("inventory-list");
      if (!grid) return;
      grid.innerHTML = "";
      const fmt = (s) => global.StorageManager.formatText(s, this.config);

      const collected = this.config.collectibles.filter((c) =>
        this.save.collectedItems.includes(c.id)
      );

      if (collected.length === 0) {
        grid.innerHTML = `<p class="empty-state-msg">Your starlight satchel is currently empty. Explore the garden paths to gather glowing petals and keepsakes!</p>`;
        return;
      }

      collected.forEach((item) => {
        const card = document.createElement("div");
        card.className = "inventory-item-card";
        card.innerHTML = `
          <div class="inv-icon" style="background:${item.color || "#ffd166"}22; border-color:${
          item.color || "#ffd166"
        }">${item.icon || "✨"}</div>
          <div class="inv-details">
            <h4>${fmt(item.name)} ${item.isSecret ? '<span class="badge-secret">Secret</span>' : ""}</h4>
            <p>${fmt(item.description)}</p>
          </div>
        `;
        grid.appendChild(card);
      });
    }

    toggleQuestModal() {
      const modal = document.getElementById("modal-quests");
      if (!modal) return;
      if (!modal.classList.contains("hidden")) {
        this.closeModal("modal-quests");
        return;
      }
      this.closeAllModals();
      this.modalOpen = true;
      modal.classList.remove("hidden");

      const list = document.getElementById("quest-journal-list");
      if (!list) return;
      list.innerHTML = "";
      const fmt = (s) => global.StorageManager.formatText(s, this.config);

      this.config.quests.forEach((q) => {
        const isDone = this.save.completedQuests.includes(q.id);
        const card = document.createElement("div");
        card.className = "quest-card " + (isDone ? "completed" : "active");
        const objsHtml = (q.objectives || [])
          .map((o) => `<li>${isDone ? "✓" : "•"} ${fmt(o)}</li>`)
          .join("");
        card.innerHTML = `
          <div class="quest-header">
            <h4>${isDone ? "✓ " : "🌟 "}${fmt(q.title)}</h4>
            <span class="quest-badge">${
              isDone ? "Completed" : q.isMandatory ? "Main Quest" : "Optional Secret"
            }</span>
          </div>
          <p class="quest-desc">${fmt(q.description)}</p>
          <ul class="quest-obj-list">${objsHtml}</ul>
          <div class="quest-reward">Reward: ${fmt(q.rewardText)}</div>
        `;
        list.appendChild(card);
      });
    }

    openControlsModal() {
      this.closeAllModals();
      const modal = document.getElementById("modal-controls");
      if (modal) {
        this.modalOpen = true;
        modal.classList.remove("hidden");
      }
    }

    togglePauseModal() {
      const modal = document.getElementById("modal-pause");
      if (!modal) return;
      if (!modal.classList.contains("hidden")) {
        this.closeModal("modal-pause");
        return;
      }
      this.closeAllModals();
      this.paused = true;
      this.modalOpen = true;
      modal.classList.remove("hidden");
    }

    closeModal(modalId) {
      const el = document.getElementById(modalId);
      if (el) el.classList.add("hidden");
      this.paused = false;
      this.modalOpen = false;
    }

    closeAllModals() {
      ["modal-inventory", "modal-quests", "modal-controls", "modal-pause", "modal-puzzle", "modal-finale"].forEach(
        (id) => {
          const el = document.getElementById(id);
          if (el) el.classList.add("hidden");
        }
      );
      this.paused = false;
      this.modalOpen = false;
    }

    showToastNotification(title, message, category = "item") {
      const container = document.getElementById("toast-container");
      if (!container) return;
      const toast = document.createElement("div");
      toast.className = `game-toast toast-${category}`;
      toast.innerHTML = `<strong>${title}</strong><span>${message}</span>`;
      container.appendChild(toast);
      setTimeout(() => {
        toast.classList.add("fade-out");
        setTimeout(() => toast.remove(), 350);
      }, 3600);
    }

    showBannerNotification(text) {
      const banner = document.getElementById("area-banner");
      if (!banner) return;
      banner.textContent = text;
      banner.classList.remove("hidden");
      clearTimeout(this.bannerTimeout);
      this.bannerTimeout = setTimeout(() => {
        banner.classList.add("hidden");
      }, 4200);
    }

    spawnPickupBurst(wx, wy, color, count = 14) {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
        const speed = 35 + Math.random() * 85;
        this.fireworks.push({
          x: wx,
          y: wy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          life: 0.75 + Math.random() * 0.4
        });
      }
    }

    // =========================================================================
    // MAIN UPDATE & COLLISION LOOP
    // =========================================================================
    loop(timestamp) {
      const dt = Math.min(0.05, Math.max(0.001, (timestamp - this.lastFrameTime) / 1000));
      this.lastFrameTime = timestamp;

      if (!document.hidden) {
        this.update(dt);
        this.render();
      }

      requestAnimationFrame((ts) => this.loop(ts));
    }

    update(dt) {
      this.time += dt;

      // Update ambient floating fireflies
      this.particles.forEach((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y < 100) p.y = 780;
        if (p.x < 60) p.x = 1140;
        if (p.x > 1140) p.x = 60;
      });

      // Update burst particles
      for (let i = this.fireworks.length - 1; i >= 0; i--) {
        const f = this.fireworks[i];
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.life -= dt;
        if (f.life <= 0) this.fireworks.splice(i, 1);
      }

      if (!this.running || this.paused || this.modalOpen || this.dialogueOpen) {
        return;
      }

      if (this.player.stateTimer > 0) {
        this.player.stateTimer -= dt;
        if (this.player.stateTimer <= 0) {
          this.player.state = "idle";
        }
      }

      const vec = global.GameInput.getMovementVector();
      const isMoving = Math.hypot(vec.x, vec.y) > 0.04;

      if (isMoving) {
        const nextX = this.player.x + vec.x * this.player.speed * dt;
        const nextY = this.player.y + vec.y * this.player.speed * dt;

        // Separate X and Y collision checks for smooth wall sliding
        if (!this.collidesWithObstacles(nextX, this.player.y)) {
          this.player.x = nextX;
        }
        if (!this.collidesWithObstacles(this.player.x, nextY)) {
          this.player.y = nextY;
        }

        if (Math.abs(vec.x) > Math.abs(vec.y)) {
          this.player.facing = vec.x < 0 ? "left" : "right";
        } else {
          this.player.facing = vec.y < 0 ? "up" : "down";
        }

        if (this.player.stateTimer <= 0) {
          this.player.state = "walk";
        }

        this.stepSoundCooldown -= dt;
        if (this.stepSoundCooldown <= 0) {
          global.GameAudio.playSfx("step");
          this.stepSoundCooldown = 0.32;
        }
      } else if (this.player.stateTimer <= 0) {
        this.player.state = "idle";
      }

      this.checkRiverHazard();
      this.updateCamera(dt);
      this.detectNearbyInteractables();
    }

    collidesWithObstacles(px, py) {
      if (!this.currentArea) return false;
      const r = this.player.radius;

      // World borders
      if (px - r < 40 || px + r > this.currentArea.width - 40) return true;
      if (py - r < 85 || py + r > this.currentArea.height - 45) return true;

      for (const box of this.currentArea.obstacles || []) {
        if (
          px + r > box.x &&
          px - r < box.x + box.w &&
          py + r > box.y &&
          py - r < box.y + box.h
        ) {
          return true;
        }
      }
      return false;
    }

    checkRiverHazard() {
      if (!this.currentArea || !this.currentArea.hazardRiver) return;
      const river = this.currentArea.hazardRiver;
      const px = this.player.x;
      const py = this.player.y;

      const inRiverRect =
        px > river.x &&
        px < river.x + river.w &&
        py > river.y &&
        py < river.y + river.h;

      if (!inRiverRect) return;

      // Check if player is standing on any safe bridge / stepping-stone pad
      const onSafePad = (river.safePads || []).some(
        (pad) =>
          px >= pad.x &&
          px <= pad.x + pad.w &&
          py >= pad.y &&
          py <= pad.y + pad.h
      );

      if (!onSafePad) {
        global.GameAudio.playSfx("error");
        this.spawnPickupBurst(px, py, "#64dfdf", 10);
        this.player.x = river.checkpoint.x;
        this.player.y = river.checkpoint.y;
        this.showToastNotification(
          "💧 Mist Brook Splash!",
          "Sylvi the Star-Fox whisked you safely back to the dry bank. Step on the glowing stone pads!",
          "item"
        );
      }
    }

    updateCamera(dt) {
      if (!this.currentArea) return;
      const targetX = this.player.x - this.camera.width / 2;
      const targetY = this.player.y - this.camera.height / 2;

      const maxX = Math.max(0, this.currentArea.width - this.camera.width);
      const maxY = Math.max(0, this.currentArea.height - this.camera.height);

      const clampedX = Math.max(0, Math.min(maxX, targetX));
      const clampedY = Math.max(0, Math.min(maxY, targetY));

      // Center world if viewport is wider/taller than world
      const finalX =
        this.camera.width >= this.currentArea.width
          ? -(this.camera.width - this.currentArea.width) / 2
          : clampedX;
      const finalY =
        this.camera.height >= this.currentArea.height
          ? -(this.camera.height - this.currentArea.height) / 2
          : clampedY;

      const lerpFactor = Math.min(1, dt * 8);
      this.camera.x += (finalX - this.camera.x) * lerpFactor;
      this.camera.y += (finalY - this.camera.y) * lerpFactor;
    }

    detectNearbyInteractables() {
      if (!this.currentArea) return;
      let closest = null;
      let minDist = Infinity;

      const px = this.player.x;
      const py = this.player.y;

      // 1. Check uncollected collectibles in current area
      this.config.collectibles
        .filter(
          (c) =>
            c.areaId === this.currentArea.id && !this.save.collectedItems.includes(c.id)
        )
        .forEach((item) => {
          const d = Math.hypot(px - item.x, py - item.y);
          if (d < 62 && d < minDist) {
            minDist = d;
            closest = {
              kind: "collectible",
              x: item.x,
              y: item.y,
              actionLabel: "Collect",
              title: item.name,
              data: item
            };
          }
        });

      // 2. Check NPCs in current area
      this.config.npcs
        .filter((n) => n.areaId === this.currentArea.id)
        .forEach((npc) => {
          const d = Math.hypot(px - npc.x, py - npc.y);
          if (d < 74 && d < minDist) {
            minDist = d;
            closest = {
              kind: "npc",
              x: npc.x,
              y: npc.y,
              actionLabel: "Talk",
              title: npc.name,
              data: npc
            };
          }
        });

      // 3. Check environmental interactables (Portals, Puzzles, Plaques, Memory Pedestals)
      (this.currentArea.interactables || []).forEach((obj) => {
        const d = Math.hypot(px - obj.x, py - obj.y);
        if (d < (obj.radius || 68) && d < minDist) {
          minDist = d;
          closest = {
            kind: "interactable",
            x: obj.x,
            y: obj.y,
            actionLabel: obj.actionLabel || "Interact",
            title: obj.title,
            data: obj
          };
        }
      });

      this.nearbyTarget = closest;
      this.updateActionButtonUI();
    }

    updateActionButtonUI() {
      const btn = document.getElementById("action-btn");
      const labelEl = document.getElementById("action-btn-label");
      const promptBanner = document.getElementById("proximity-prompt");

      if (!btn || !labelEl) return;

      if (this.nearbyTarget) {
        const fmt = (s) => global.StorageManager.formatText(s, this.config);
        btn.classList.add("ready");
        labelEl.textContent = this.nearbyTarget.actionLabel;
        if (promptBanner) {
          promptBanner.textContent = `${this.nearbyTarget.actionLabel}: ${fmt(
            this.nearbyTarget.title
          )}`;
          promptBanner.classList.remove("hidden");
        }
      } else {
        btn.classList.remove("ready");
        labelEl.textContent = "Explore";
        if (promptBanner) {
          promptBanner.classList.add("hidden");
        }
      }
    }

    // =========================================================================
    // WORLD & LAYERED PARALLAX RENDERING
    // =========================================================================
    render() {
      if (!this.ctx || !this.currentArea) return;
      const ctx = this.ctx;
      const cfgArea =
        this.config.areas.find((a) => a.id === this.currentArea.id) || this.config.areas[0];
      const fmt = (s) => global.StorageManager.formatText(s, this.config);

      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Background Fill
      ctx.fillStyle = cfgArea.skyTop || "#11162d";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      ctx.save();
      ctx.translate(-this.camera.x, -this.camera.y);

      const W = this.currentArea.width;
      const H = this.currentArea.height;

      // 1. Sky Horizon Band (Top 130px of world)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 160);
      skyGrad.addColorStop(0, cfgArea.skyTop || "#131b3a");
      skyGrad.addColorStop(1, cfgArea.skyBottom || "#243b55");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, 160);

      // Twinkling stars in sky band (with subtle parallax shift)
      this.stars.forEach((st) => {
        const alpha = 0.35 + Math.sin(this.time * 2.5 + st.phase) * 0.35;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(st.x, st.y * 0.55, st.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Distant Mountain Silhouettes
      ctx.fillStyle = "rgba(16, 22, 45, 0.75)";
      ctx.beginPath();
      ctx.moveTo(0, 140);
      ctx.quadraticCurveTo(220, 65, 440, 130);
      ctx.quadraticCurveTo(700, 50, 960, 125);
      ctx.quadraticCurveTo(1100, 85, 1200, 135);
      ctx.lineTo(1200, 160);
      ctx.lineTo(0, 160);
      ctx.closePath();
      ctx.fill();

      // 2. Main Ground Meadow / Floor
      ctx.fillStyle = cfgArea.groundColor || "#1d3836";
      ctx.fillRect(0, 120, W, H - 120);

      // Soft decorative grass tufts / cobblestones
      this.renderAreaGroundDetails(ctx, this.currentArea.id, cfgArea);

      // 3. Area-specific props (Cottages, Fountain, Clocktower, River, Shrine, Cake)
      this.renderAreaLandmarks(ctx, this.currentArea, fmt);

      // 4. Lantern Posts
      (this.currentArea.lanterns || []).forEach((l) => {
        global.SpriteRenderer.drawLanternPost(ctx, l.x, l.y, l.color, true, this.time);
      });

      // 5. Collectibles in this area
      this.config.collectibles
        .filter(
          (c) =>
            c.areaId === this.currentArea.id && !this.save.collectedItems.includes(c.id)
        )
        .forEach((item) => {
          this.renderCollectibleItem(ctx, item);
        });

      // 6. Depth-sorted Entities (Trees, NPCs, Player)
      const renderables = [];

      (this.currentArea.trees || []).forEach((t) => {
        renderables.push({
          y: t.y,
          draw: () =>
            global.SpriteRenderer.drawTree(
              ctx,
              t.x,
              t.y,
              t.scale,
              t.canopy,
              t.glow,
              this.time
            )
        });
      });

      this.config.npcs
        .filter((n) => n.areaId === this.currentArea.id)
        .forEach((npc) => {
          renderables.push({
            y: npc.y,
            draw: () =>
              global.SpriteRenderer.drawCharacter(ctx, {
                x: npc.x,
                y: npc.y,
                facing: "down",
                state: "idle",
                time: this.time,
                cloakColor: npc.cloakColor,
                hairColor: npc.hairColor,
                isPlayer: false,
                label: fmt(npc.name),
                hasQuestMarker: true,
                questMarkerType: "!"
              })
          });
        });

      renderables.push({
        y: this.player.y,
        draw: () =>
          global.SpriteRenderer.drawCharacter(ctx, {
            x: this.player.x,
            y: this.player.y,
            facing: this.player.facing,
            state: this.player.state,
            time: this.time,
            cloakColor: "#ff7eb6",
            trimColor: "#ffd166",
            hairColor: "#2d1e3e",
            isPlayer: true,
            label: fmt(this.config.identity.playerCharacterName)
          })
      });

      renderables.sort((a, b) => a.y - b.y);
      renderables.forEach((r) => r.draw());

      // 7. Highlight ring on nearby interactive target
      if (this.nearbyTarget) {
        const pulse = 24 + Math.sin(this.time * 6) * 4;
        ctx.strokeStyle = "#ffd166";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(this.nearbyTarget.x, this.nearbyTarget.y, pulse, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 8. Floating Ambient Fireflies & Pickup Bursts
      this.particles.forEach((p) => {
        const glow = 0.35 + Math.sin(this.time * 3 + p.phase) * 0.25;
        ctx.fillStyle = `rgba(255, 230, 140, ${glow})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      this.fireworks.forEach((f) => {
        ctx.fillStyle = f.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
        ctx.beginPath();
        ctx.arc(f.x, f.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      ctx.restore();
    }

    renderAreaGroundDetails(ctx, areaId, cfgArea) {
      ctx.fillStyle = cfgArea.pathColor || "#465c52";

      if (areaId === "garden") {
        // Winding garden path from West spawn to East Sunbeam Gate
        ctx.beginPath();
        ctx.roundRect(100, 395, 1020, 72, 32);
        ctx.roundRect(385, 210, 75, 420, 28);
        ctx.fill();

        // Southern Pond
        const pondGrad = ctx.createRadialGradient(535, 625, 10, 535, 625, 110);
        pondGrad.addColorStop(0, "#48cae4");
        pondGrad.addColorStop(1, "#1d3557");
        ctx.fillStyle = pondGrad;
        ctx.beginPath();
        ctx.roundRect(430, 560, 210, 130, 45);
        ctx.fill();

        // Raised stone flowerbeds
        ctx.fillStyle = "#354f52";
        ctx.beginPath();
        ctx.roundRect(260, 270, 90, 60, 12);
        ctx.roundRect(640, 260, 95, 60, 12);
        ctx.fill();
      } else if (areaId === "village") {
        // Village central cobble plaza & roads
        ctx.beginPath();
        ctx.roundRect(60, 405, 1080, 78, 20);
        ctx.roundRect(390, 290, 340, 310, 36);
        ctx.fill();
      } else if (areaId === "forest") {
        // Forest paths
        ctx.beginPath();
        ctx.roundRect(60, 415, 920, 68, 28);
        ctx.roundRect(560, 120, 85, 340, 24);
        ctx.fill();

        // Mist Brook River
        const river = this.currentArea.hazardRiver;
        if (river) {
          const rivGrad = ctx.createLinearGradient(river.x, 0, river.x + river.w, 0);
          rivGrad.addColorStop(0, "#184e77");
          rivGrad.addColorStop(0.5, "#38a3a5");
          rivGrad.addColorStop(1, "#184e77");
          ctx.fillStyle = rivGrad;
          ctx.beginPath();
          ctx.roundRect(river.x, river.y, river.w, river.h, 22);
          ctx.fill();

          // Safe Stepping Stone Pads
          (river.safePads || []).forEach((pad) => {
            ctx.fillStyle = "#52796f";
            ctx.strokeStyle = "#80ffdb";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(pad.x, pad.y, pad.w, pad.h, 14);
            ctx.fill();
            ctx.stroke();
          });
        }
      } else if (areaId === "sanctuary") {
        // Celestial circular pavilion plaza
        ctx.fillStyle = "rgba(105, 72, 120, 0.55)";
        ctx.beginPath();
        ctx.arc(600, 410, 290, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#ffd166";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(600, 410, 275, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    renderAreaLandmarks(ctx, area, fmt) {
      // Render Cottages in Village
      (area.cottages || []).forEach((c) => {
        global.SpriteRenderer.drawCottage(
          ctx,
          c.x,
          c.y,
          c.w,
          c.h,
          c.roof,
          c.wall,
          c.label,
          this.time
        );
      });

      // Render Interactive Landmarks & Portals
      (area.interactables || []).forEach((obj) => {
        if (obj.type === "portal") {
          const isUnlocked =
            obj.unlockQuestId === "none" ||
            this.save.completedQuests.includes(obj.unlockQuestId) ||
            this.save.unlockedAreas.includes(obj.targetAreaId);
          global.SpriteRenderer.drawPortalGate(
            ctx,
            obj.x,
            obj.y,
            isUnlocked,
            "#72efdd",
            fmt(obj.title),
            this.time
          );
        } else if (obj.id === "obj_sanctuary_cake") {
          const isLit = this.save.solvedPuzzles.includes("puzzle_sanctuary_wish");
          global.SpriteRenderer.drawBirthdayCakeCenterpiece(
            ctx,
            obj.x,
            obj.y,
            isLit,
            this.time
          );
        } else if (obj.type === "memory_pedestal") {
          const isLit = (this.save.litPedestals || []).includes(obj.memoryId);
          ctx.save();
          ctx.translate(obj.x, obj.y);
          ctx.fillStyle = isLit ? "#ff7eb6" : "#4a4e69";
          ctx.beginPath();
          ctx.roundRect(-20, -24, 40, 38, 8);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.font = "18px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(isLit ? "🔥" : "🖼️", 0, -2);
          ctx.font = "bold 11px sans-serif";
          ctx.fillStyle = isLit ? "#ffd166" : "#cbd5e1";
          ctx.fillText(obj.title, 0, 26);
          ctx.restore();
        } else {
          // Pedestals, Signs, Benches, Fountain, Shrines
          const isSolved =
            obj.puzzleId && this.save.solvedPuzzles.includes(obj.puzzleId);
          ctx.save();
          ctx.translate(obj.x, obj.y);
          ctx.fillStyle = isSolved ? "#2ec4b6" : "#3d405b";
          ctx.strokeStyle = isSolved ? "#ffd166" : "#a8dadc";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(-24, -20, 48, 36, 8);
          ctx.fill();
          ctx.stroke();

          ctx.font = "17px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(
            obj.type === "puzzle" ? (isSolved ? "✨" : "⚙️") : "📜",
            0,
            3
          );
          ctx.font = "600 10px sans-serif";
          ctx.fillStyle = "#f1f5f9";
          ctx.fillText(fmt(obj.title), 0, 28);
          ctx.restore();
        }
      });
    }

    renderCollectibleItem(ctx, item) {
      const floatY = Math.sin(this.time * 4 + item.x) * 4;
      ctx.save();
      ctx.translate(item.x, item.y + floatY);

      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
      grad.addColorStop(0, item.color || "#ffd166");
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "20px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(item.icon || "✨", 0, 0);
      ctx.restore();
    }
  }

  global.BirthdayGameEngine = BirthdayGameEngine;

  window.addEventListener("DOMContentLoaded", () => {
    global.BirthdayGame = new BirthdayGameEngine();
    global.BirthdayGame.init();
  });
})(window);
