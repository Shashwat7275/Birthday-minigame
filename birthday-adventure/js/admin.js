/**
 * Functional Admin Panel Controller ("Creator Studio")
 *
 * Implements:
 *  - Client-side passphrase gate with session persistence
 *  - Live Dashboard with placeholder & solvability validation
 *  - General Settings & Identity Editor
 *  - Story, Birthday Letter, Favorites, Inside Jokes & NPC Dialogue Editor
 *  - Photo & Asset Manager (with automatic HTML5 Canvas image compression/resizing,
 *    caption editing, ordering, scene assignment, and custom audio upload)
 *  - Quests & Collectibles Editor
 *  - Puzzle Editor with solvability validation
 *  - World & Level Editor
 *  - Save to Browser, Backup/Restore, JSON Export/Import, Direct Local Server Save,
 *    and Bundled `defaultConfig.js` download
 *  - Non-destructive Live Preview Mode
 */
(function (global) {
  const AUTH_SESSION_KEY = "birthday_admin_unlocked_v1";

  class AdminStudio {
    constructor() {
      this.config = global.StorageManager.getConfig();
    }

    init() {
      this.setupAuthGate();
      this.setupNavigation();
      this.populateAllForms();
      this.bindGlobalActions();
    }

    setupAuthGate() {
      const gate = document.getElementById("admin-auth-gate");
      const app = document.getElementById("admin-app");
      const form = document.getElementById("admin-login-form");
      const input = document.getElementById("admin-pass-input");
      const errEl = document.getElementById("admin-auth-error");

      const unlockApp = () => {
        sessionStorage.setItem(AUTH_SESSION_KEY, "1");
        if (gate) gate.classList.add("hidden");
        if (app) app.classList.remove("hidden");
      };

      // Allow URL query ?unlock=starlight for automated verification or session reuse
      const params = new URLSearchParams(window.location.search);
      const expectedPass = (this.config.admin && this.config.admin.passphrase) || "starlight";

      if (
        sessionStorage.getItem(AUTH_SESSION_KEY) === "1" ||
        params.get("pass") === expectedPass
      ) {
        unlockApp();
      }

      if (form) {
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const currentPass = (this.config.admin && this.config.admin.passphrase) || "starlight";
          if (input.value.trim() === currentPass) {
            errEl.classList.add("hidden");
            unlockApp();
          } else {
            errEl.textContent = `Incorrect passphrase. Hint: ${
              this.config.admin?.passphraseHint || "Default is 'starlight'"
            }`;
            errEl.classList.remove("hidden");
          }
        });
      }
    }

    setupNavigation() {
      const tabs = document.querySelectorAll(".nav-tab");
      const sections = document.querySelectorAll(".admin-section");

      tabs.forEach((btn) => {
        btn.addEventListener("click", () => {
          const targetId = btn.getAttribute("data-tab");
          tabs.forEach((t) => t.classList.remove("active"));
          sections.forEach((s) => s.classList.remove("active"));
          btn.classList.add("active");
          const sec = document.getElementById(targetId);
          if (sec) sec.classList.add("active");
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      });
    }

    populateAllForms() {
      this.renderDashboard();
      this.populateGeneralForm();
      this.populateStoryForm();
      this.renderNpcEditor();
      this.renderMemoriesEditor();
      this.populateAudioForm();
      this.renderQuestsEditor();
      this.renderCollectiblesEditor();
      this.renderPuzzlesEditor();
      this.renderAreasEditor();
    }

    renderDashboard() {
      const id = this.config.identity;
      const setTxt = (elId, val) => {
        const el = document.getElementById(elId);
        if (el) el.textContent = val;
      };

      setTxt("sidebar-game-title", id.gameTitle);
      setTxt("dash-recipient", `${id.recipientName} (${id.recipientNickname})`);
      setTxt("dash-photos-count", `${(this.config.memories || []).length} Memory Photos`);
      setTxt(
        "dash-quests-count",
        `${(this.config.quests || []).length} Quests / ${(this.config.puzzles || []).length} Puzzles`
      );
      setTxt(
        "dash-last-saved",
        this.config.lastModified
          ? new Date(this.config.lastModified).toLocaleString()
          : "Default Config"
      );

      const validation = global.StorageManager.validateConfig(this.config);
      const listEl = document.getElementById("dash-validation-list");
      const statusBanner = document.getElementById("admin-status-banner");

      if (listEl) {
        listEl.innerHTML = "";
        if (validation.errors.length === 0) {
          listEl.innerHTML += `<li style="color:#72efdd;">✓ All 4 game areas, 6 quests, and 5 puzzles pass solvability validation.</li>`;
        } else {
          validation.errors.forEach((err) => {
            listEl.innerHTML += `<li style="color:#ff6b8b;">✗ Error: ${err}</li>`;
          });
        }
        if (validation.warnings.length === 0) {
          listEl.innerHTML += `<li style="color:#72efdd;">✓ All default placeholders have been personalized!</li>`;
        } else {
          validation.warnings.forEach((w) => {
            listEl.innerHTML += `<li style="color:#ffd166;">⚠️ Note: ${w}</li>`;
          });
        }
      }

      if (statusBanner) {
        if (!validation.valid) {
          statusBanner.className = "status-pill status-warn";
          statusBanner.textContent = `⚠️ ${validation.errors.length} validation issue(s) need attention`;
        } else {
          statusBanner.className = "status-pill status-ok";
          statusBanner.textContent = "✓ Configuration valid & ready to play";
        }
      }
    }

    populateGeneralForm() {
      const id = this.config.identity;
      const setVal = (elId, val) => {
        const el = document.getElementById(elId);
        if (el) el.value = val ?? "";
      };

      setVal("cfg-game-title", id.gameTitle);
      setVal("cfg-game-subtitle", id.subtitle);
      setVal("cfg-recipient-name", id.recipientName);
      setVal("cfg-recipient-nickname", id.recipientNickname);
      setVal("cfg-birthday-age", id.birthdayAge);
      setVal("cfg-sender-name", id.senderName);
      setVal("cfg-player-name", id.playerCharacterName);
      setVal("cfg-text-size", id.textSize || "medium");
      setVal("cfg-difficulty", id.difficulty || "normal");
      setVal("cfg-admin-pass", this.config.admin?.passphrase || "starlight");
      setVal("cfg-welcome-msg", id.welcomeMessage);
    }

    populateStoryForm() {
      const id = this.config.identity;
      const pers = this.config.personalization;
      const setVal = (elId, val) => {
        const el = document.getElementById(elId);
        if (el) el.value = val ?? "";
      };

      setVal("cfg-opening-narration", (id.openingNarration || []).join("\n"));
      setVal("cfg-closing-narration", (id.closingNarration || []).join("\n"));
      setVal("cfg-finale-banner", pers.finalBannerMessage);
      setVal("cfg-letter-greeting", pers.birthdayLetterGreeting);
      setVal("cfg-letter-body", (pers.birthdayLetterBody || []).join("\n"));
      setVal("cfg-letter-signoff", pers.birthdayLetterSignoff);
      setVal("cfg-favorites", (pers.favoriteThings || []).join("\n"));
      setVal("cfg-jokes", (pers.insideJokes || []).join("\n"));
    }

    renderNpcEditor() {
      const container = document.getElementById("npc-editor-container");
      if (!container) return;
      container.innerHTML = "";

      (this.config.npcs || []).forEach((npc, idx) => {
        const card = document.createElement("div");
        card.className = "sub-item-card";
        card.innerHTML = `
          <div class="sub-item-header">
            <h4>NPC #${idx + 1}: ${npc.name} (${npc.areaId.toUpperCase()})</h4>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Character Name</label>
              <input type="text" class="npc-name-input" data-idx="${idx}" value="${this.escapeAttr(
          npc.name
        )}" />
            </div>
            <div class="form-group">
              <label>Role / Title</label>
              <input type="text" class="npc-role-input" data-idx="${idx}" value="${this.escapeAttr(
          npc.role
        )}" />
            </div>
          </div>
          <div class="form-group">
            <label>Greeting Line</label>
            <input type="text" class="npc-greeting-input" data-idx="${idx}" value="${this.escapeAttr(
          npc.greeting
        )}" />
          </div>
          <div class="form-group">
            <label>Main Quest Dialogue Lines (One line per paragraph)</label>
            <textarea class="npc-before-input" data-idx="${idx}" rows="3">${(
          npc.dialogueBeforeQuest || []
        ).join("\n")}</textarea>
          </div>
          <div class="form-group">
            <label>After Quest Completed Dialogue Lines (One line per paragraph)</label>
            <textarea class="npc-after-input" data-idx="${idx}" rows="2">${(
          npc.dialogueAfterQuest || []
        ).join("\n")}</textarea>
          </div>
        `;
        container.appendChild(card);
      });
    }

    renderMemoriesEditor() {
      const container = document.getElementById("memories-editor-container");
      if (!container) return;
      container.innerHTML = "";

      (this.config.memories || []).forEach((mem, idx) => {
        const card = document.createElement("div");
        card.className = "sub-item-card";
        card.innerHTML = `
          <div class="sub-item-header">
            <h4>Memory #${idx + 1}: ${this.escapeAttr(mem.title)}</h4>
            <div class="button-row">
              <button type="button" class="btn-secondary btn-sm btn-move-mem-up" data-idx="${idx}">↑ Up</button>
              <button type="button" class="btn-secondary btn-sm btn-move-mem-down" data-idx="${idx}">↓ Down</button>
              <button type="button" class="btn-danger btn-sm btn-remove-mem" data-idx="${idx}">🗑️ Remove</button>
            </div>
          </div>
          <div class="photo-preview-row">
            <div>
              <div class="photo-thumb-box">
                <img id="mem-preview-img-${idx}" src="${mem.imageUrl}" alt="Memory Preview" />
              </div>
              <div style="margin-top:8px;">
                <label class="btn-secondary btn-sm btn-block" style="cursor:pointer;">
                  📷 Upload / Replace Photo
                  <input type="file" class="mem-file-input" data-idx="${idx}" accept="image/*" style="display:none;" />
                </label>
              </div>
            </div>
            <div>
              <div class="form-grid-2">
                <div class="form-group">
                  <label>Memory Title</label>
                  <input type="text" class="mem-title-input" data-idx="${idx}" value="${this.escapeAttr(
          mem.title
        )}" />
                </div>
                <div class="form-group">
                  <label>Image Fit Mode</label>
                  <select class="mem-fit-input" data-idx="${idx}">
                    <option value="contain" ${mem.displayMode === "contain" ? "selected" : ""}>Contain (Show Full Photo)</option>
                    <option value="cover" ${mem.displayMode === "cover" ? "selected" : ""}>Cover (Fill Frame)</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>Caption &amp; Personal Memory Story</label>
                <textarea class="mem-caption-input" data-idx="${idx}" rows="3">${
          mem.caption || ""
        }</textarea>
              </div>
            </div>
          </div>
        `;
        container.appendChild(card);
      });

      // Bind photo upload, reorder, and delete events
      container.querySelectorAll(".mem-file-input").forEach((input) => {
        input.addEventListener("change", (e) => {
          const idx = Number(input.getAttribute("data-idx"));
          const file = e.target.files && e.target.files[0];
          if (file) this.handlePhotoUpload(idx, file);
        });
      });

      container.querySelectorAll(".btn-move-mem-up").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.collectFormValuesIntoConfig();
          const idx = Number(btn.getAttribute("data-idx"));
          if (idx > 0) {
            const temp = this.config.memories[idx - 1];
            this.config.memories[idx - 1] = this.config.memories[idx];
            this.config.memories[idx] = temp;
            this.config.memories.forEach((m, i) => (m.order = i + 1));
            this.renderMemoriesEditor();
          }
        });
      });

      container.querySelectorAll(".btn-move-mem-down").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.collectFormValuesIntoConfig();
          const idx = Number(btn.getAttribute("data-idx"));
          if (idx < this.config.memories.length - 1) {
            const temp = this.config.memories[idx + 1];
            this.config.memories[idx + 1] = this.config.memories[idx];
            this.config.memories[idx] = temp;
            this.config.memories.forEach((m, i) => (m.order = i + 1));
            this.renderMemoriesEditor();
          }
        });
      });

      container.querySelectorAll(".btn-remove-mem").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (this.config.memories.length <= 1) {
            this.showAlert("At least 1 memory entry is required for the Sanctuary gallery.", "error");
            return;
          }
          this.collectFormValuesIntoConfig();
          const idx = Number(btn.getAttribute("data-idx"));
          this.config.memories.splice(idx, 1);
          this.config.memories.forEach((m, i) => (m.order = i + 1));
          this.renderMemoriesEditor();
        });
      });
    }

    handlePhotoUpload(memIdx, file) {
      if (!file.type.startsWith("image/")) {
        this.showAlert("Unsupported file type. Please choose a PNG, JPG, WEBP, or GIF image.", "error");
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          // Compress & resize to max 900px dimension so localStorage never overflows
          const maxDim = 900;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.84);

          this.config.memories[memIdx].imageUrl = dataUrl;
          const previewEl = document.getElementById(`mem-preview-img-${memIdx}`);
          if (previewEl) previewEl.src = dataUrl;
          this.showAlert(
            `Photo uploaded and optimized (${w}×${h}px) for Memory #${memIdx + 1}. Remember to click Save Changes!`,
            "success"
          );
        };
        img.onerror = () => {
          this.showAlert("Could not decode image file. Please try another photo.", "error");
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }

    populateAudioForm() {
      const aud = this.config.audio || {};
      const musicChk = document.getElementById("cfg-audio-music");
      const sfxChk = document.getElementById("cfg-audio-sfx");
      const musicVol = document.getElementById("cfg-music-vol");
      const sfxVol = document.getElementById("cfg-sfx-vol");
      const lblMusic = document.getElementById("lbl-music-vol");
      const lblSfx = document.getElementById("lbl-sfx-vol");
      const statusEl = document.getElementById("custom-music-status");

      if (musicChk) musicChk.checked = aud.musicEnabled !== false;
      if (sfxChk) sfxChk.checked = aud.sfxEnabled !== false;
      if (musicVol) {
        musicVol.value = aud.musicVolume ?? 0.45;
        if (lblMusic) lblMusic.textContent = `${Math.round(musicVol.value * 100)}%`;
        musicVol.addEventListener("input", () => {
          if (lblMusic) lblMusic.textContent = `${Math.round(musicVol.value * 100)}%`;
        });
      }
      if (sfxVol) {
        sfxVol.value = aud.sfxVolume ?? 0.65;
        if (lblSfx) lblSfx.textContent = `${Math.round(sfxVol.value * 100)}%`;
        sfxVol.addEventListener("input", () => {
          if (lblSfx) lblSfx.textContent = `${Math.round(sfxVol.value * 100)}%`;
        });
      }
      if (statusEl) {
        statusEl.textContent = aud.customMusicDataUrl
          ? "✓ Custom background audio file loaded."
          : "Using built-in anime music-box synthesizer.";
      }
    }

    renderQuestsEditor() {
      const container = document.getElementById("quests-editor-container");
      if (!container) return;
      container.innerHTML = "";

      (this.config.quests || []).forEach((q, idx) => {
        const card = document.createElement("div");
        card.className = "sub-item-card";
        card.innerHTML = `
          <div class="sub-item-header">
            <h4>Quest #${idx + 1}: ${this.escapeAttr(q.title)} (${q.isMandatory ? "Main" : "Optional"})</h4>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Quest Title</label>
              <input type="text" class="quest-title-input" data-idx="${idx}" value="${this.escapeAttr(
          q.title
        )}" />
            </div>
            <div class="form-group">
              <label>Reward Text</label>
              <input type="text" class="quest-reward-input" data-idx="${idx}" value="${this.escapeAttr(
          q.rewardText
        )}" />
            </div>
          </div>
          <div class="form-group">
            <label>Quest Description</label>
            <textarea class="quest-desc-input" data-idx="${idx}" rows="2">${
          q.description || ""
        }</textarea>
          </div>
          <div class="form-group">
            <label>Completion Notification Message</label>
            <input type="text" class="quest-done-input" data-idx="${idx}" value="${this.escapeAttr(
          q.completionMessage
        )}" />
          </div>
        `;
        container.appendChild(card);
      });
    }

    renderCollectiblesEditor() {
      const container = document.getElementById("collectibles-editor-container");
      if (!container) return;
      container.innerHTML = "";

      (this.config.collectibles || []).forEach((item, idx) => {
        const card = document.createElement("div");
        card.className = "sub-item-card";
        card.innerHTML = `
          <div class="sub-item-header">
            <h4>${item.icon || "✨"} ${this.escapeAttr(item.name)} (${item.areaId.toUpperCase()}${
          item.isSecret ? " — SECRET" : ""
        })</h4>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Item Display Name</label>
              <input type="text" class="item-name-input" data-idx="${idx}" value="${this.escapeAttr(
          item.name
        )}" />
            </div>
            <div class="form-group">
              <label>Satchel Description</label>
              <input type="text" class="item-desc-input" data-idx="${idx}" value="${this.escapeAttr(
          item.description
        )}" />
            </div>
          </div>
          <div class="form-group">
            <label>Pickup Personal Message / Memory Toast</label>
            <input type="text" class="item-msg-input" data-idx="${idx}" value="${this.escapeAttr(
          item.pickupMessage
        )}" />
          </div>
        `;
        container.appendChild(card);
      });
    }

    renderPuzzlesEditor() {
      const container = document.getElementById("puzzles-editor-container");
      if (!container) return;
      container.innerHTML = "";

      (this.config.puzzles || []).forEach((p, idx) => {
        const isDial = p.id === "puzzle_village_dial";
        const isEcho = p.id === "puzzle_forest_echo";

        let solutionControlHtml = "";
        if (isDial) {
          solutionControlHtml = `
            <div class="form-group">
              <label>3-Lantern Dial Solution (Comma-separated using SUN, MOON, STAR, or COMET)</label>
              <input type="text" class="puzzle-sol-input" data-idx="${idx}" value="${(
            p.solution || []
          ).join(", ")}" />
            </div>
          `;
        } else if (isEcho) {
          solutionControlHtml = `
            <div class="form-group">
              <label>4-Crystal Melody Solution (Comma-separated using TEAL, VIOLET, GOLD, or ROSE)</label>
              <input type="text" class="puzzle-sol-input" data-idx="${idx}" value="${(
            p.solution || []
          ).join(", ")}" />
            </div>
          `;
        }

        const card = document.createElement("div");
        card.className = "sub-item-card";
        card.innerHTML = `
          <div class="sub-item-header">
            <h4>Puzzle #${idx + 1}: ${this.escapeAttr(p.name)} (${p.areaId.toUpperCase()})</h4>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Puzzle Title</label>
              <input type="text" class="puzzle-name-input" data-idx="${idx}" value="${this.escapeAttr(
          p.name
        )}" />
            </div>
            <div class="form-group">
              <label>Completion Message</label>
              <input type="text" class="puzzle-done-input" data-idx="${idx}" value="${this.escapeAttr(
          p.completionMessage
        )}" />
            </div>
          </div>
          <div class="form-group">
            <label>Player Instructions</label>
            <textarea class="puzzle-inst-input" data-idx="${idx}" rows="2">${
          p.instructions || ""
        }</textarea>
          </div>
          <div class="form-group">
            <label>Prompt / Clue Question</label>
            <input type="text" class="puzzle-q-input" data-idx="${idx}" value="${this.escapeAttr(
          p.question
        )}" />
          </div>
          <div class="form-group">
            <label>Optional Hint Text</label>
            <input type="text" class="puzzle-hint-input" data-idx="${idx}" value="${this.escapeAttr(
          p.hint
        )}" />
          </div>
          ${solutionControlHtml}
        `;
        container.appendChild(card);
      });
    }

    renderAreasEditor() {
      const container = document.getElementById("areas-editor-container");
      if (!container) return;
      container.innerHTML = "";

      (this.config.areas || []).forEach((area, idx) => {
        const card = document.createElement("div");
        card.className = "sub-item-card";
        card.innerHTML = `
          <div class="sub-item-header">
            <h4>Area #${idx + 1} (${area.id.toUpperCase()}): ${this.escapeAttr(area.name)}</h4>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Area Display Name</label>
              <input type="text" class="area-name-input" data-idx="${idx}" value="${this.escapeAttr(
          area.name
        )}" />
            </div>
            <div class="form-group">
              <label>Area Subtitle</label>
              <input type="text" class="area-sub-input" data-idx="${idx}" value="${this.escapeAttr(
          area.subtitle
        )}" />
            </div>
          </div>
          <div class="form-group">
            <label>Chapter Opening Banner Text</label>
            <input type="text" class="area-banner-input" data-idx="${idx}" value="${this.escapeAttr(
          area.openingBanner
        )}" />
          </div>
        `;
        container.appendChild(card);
      });
    }

    collectFormValuesIntoConfig() {
      const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value.trim() : "";
      };
      const splitLines = (id) =>
        getVal(id)
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);

      // General & Identity
      this.config.identity.gameTitle = getVal("cfg-game-title") || "A Little Universe Made for You";
      this.config.identity.subtitle = getVal("cfg-game-subtitle");
      this.config.identity.recipientName = getVal("cfg-recipient-name");
      this.config.identity.recipientNickname = getVal("cfg-recipient-nickname");
      this.config.identity.birthdayAge = getVal("cfg-birthday-age");
      this.config.identity.senderName = getVal("cfg-sender-name");
      this.config.identity.playerCharacterName = getVal("cfg-player-name") || "Traveler";
      this.config.identity.textSize = getVal("cfg-text-size") || "medium";
      this.config.identity.difficulty = getVal("cfg-difficulty") || "normal";
      this.config.identity.welcomeMessage = getVal("cfg-welcome-msg");
      this.config.admin.passphrase = getVal("cfg-admin-pass") || "starlight";

      // Story & Personalization
      this.config.identity.openingNarration = splitLines("cfg-opening-narration");
      this.config.identity.closingNarration = splitLines("cfg-closing-narration");
      this.config.personalization.finalBannerMessage = getVal("cfg-finale-banner");
      this.config.personalization.birthdayLetterGreeting = getVal("cfg-letter-greeting");
      this.config.personalization.birthdayLetterBody = splitLines("cfg-letter-body");
      this.config.personalization.birthdayLetterSignoff = getVal("cfg-letter-signoff");
      this.config.personalization.favoriteThings = splitLines("cfg-favorites");
      this.config.personalization.insideJokes = splitLines("cfg-jokes");

      // NPCs
      document.querySelectorAll(".npc-name-input").forEach((el) => {
        const i = Number(el.dataset.idx);
        if (this.config.npcs[i]) this.config.npcs[i].name = el.value.trim();
      });
      document.querySelectorAll(".npc-role-input").forEach((el) => {
        const i = Number(el.dataset.idx);
        if (this.config.npcs[i]) this.config.npcs[i].role = el.value.trim();
      });
      document.querySelectorAll(".npc-greeting-input").forEach((el) => {
        const i = Number(el.dataset.idx);
        if (this.config.npcs[i]) this.config.npcs[i].greeting = el.value.trim();
      });
      document.querySelectorAll(".npc-before-input").forEach((el) => {
        const i = Number(el.dataset.idx);
        if (this.config.npcs[i]) {
          this.config.npcs[i].dialogueBeforeQuest = el.value
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
        }
      });
      document.querySelectorAll(".npc-after-input").forEach((el) => {
        const i = Number(el.dataset.idx);
        if (this.config.npcs[i]) {
          this.config.npcs[i].dialogueAfterQuest = el.value
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
        }
      });

      // Memories
      document.querySelectorAll(".mem-title-input").forEach((el) => {
        const i = Number(el.dataset.idx);
        if (this.config.memories[i]) this.config.memories[i].title = el.value.trim();
      });
      document.querySelectorAll(".mem-fit-input").forEach((el) => {
        const i = Number(el.dataset.idx);
        if (this.config.memories[i]) this.config.memories[i].displayMode = el.value;
      });
      document.querySelectorAll(".mem-caption-input").forEach((el) => {
        const i = Number(el.dataset.idx);
        if (this.config.memories[i]) this.config.memories[i].caption = el.value.trim();
      });

      // Audio
      const musicChk = document.getElementById("cfg-audio-music");
      const sfxChk = document.getElementById("cfg-audio-sfx");
      const musicVol = document.getElementById("cfg-music-vol");
      const sfxVol = document.getElementById("cfg-sfx-vol");
      if (musicChk) this.config.audio.musicEnabled = musicChk.checked;
      if (sfxChk) this.config.audio.sfxEnabled = sfxChk.checked;
      if (musicVol) this.config.audio.musicVolume = parseFloat(musicVol.value);
      if (sfxVol) this.config.audio.sfxVolume = parseFloat(sfxVol.value);

      // Quests
      document.querySelectorAll(".quest-title-input").forEach((el) => {
        const i = Number(el.dataset.idx);
        if (this.config.quests[i]) this.config.quests[i].title = el.value.trim();
      });
      document.querySelectorAll(".quest-reward-input").forEach((el) => {
        const i = Number(el.dataset.idx);
        if (this.config.quests[i]) this.config.quests[i].rewardText = el.value.trim();
      });
      document.querySelectorAll(".quest-desc-input").forEach((el) => {
        const i = Number(el.dataset.idx);
        if (this.config.quests[i]) this.config.quests[i].description = el.value.trim();
      });
      document.querySelectorAll(".quest-done-input").forEach((el) => {
        const i = Number(el.dataset.idx);
        if (this.config.quests[i]) this.config.quests[i].completionMessage = el.value.trim();
      });

      // Collectibles
      document.querySelectorAll(".item-name-input").forEach((el) => {
        const i = Number(el.dataset.idx);
        if (this.config.collectibles[i]) this.config.collectibles[i].name = el.value.trim();
      });
      document.querySelectorAll(".item-desc-input").forEach((el) => {
        const i = Number(el.dataset.idx);
        if (this.config.collectibles[i]) this.config.collectibles[i].description = el.value.trim();
      });
      document.querySelectorAll(".item-msg-input").forEach((el) => {
        const i = Number(el.dataset.idx);
        if (this.config.collectibles[i]) this.config.collectibles[i].pickupMessage = el.value.trim();
      });

      // Puzzles
      document.querySelectorAll(".puzzle-name-input").forEach((el) => {
        const i = Number(el.dataset.idx);
        if (this.config.puzzles[i]) this.config.puzzles[i].name = el.value.trim();
      });
      document.querySelectorAll(".puzzle-done-input").forEach((el) => {
        const i = Number(el.dataset.idx);
        if (this.config.puzzles[i]) this.config.puzzles[i].completionMessage = el.value.trim();
      });
      document.querySelectorAll(".puzzle-inst-input").forEach((el) => {
        const i = Number(el.dataset.idx);
        if (this.config.puzzles[i]) this.config.puzzles[i].instructions = el.value.trim();
      });
      document.querySelectorAll(".puzzle-q-input").forEach((el) => {
        const i = Number(el.dataset.idx);
        if (this.config.puzzles[i]) this.config.puzzles[i].question = el.value.trim();
      });
      document.querySelectorAll(".puzzle-hint-input").forEach((el) => {
        const i = Number(el.dataset.idx);
        if (this.config.puzzles[i]) this.config.puzzles[i].hint = el.value.trim();
      });
      document.querySelectorAll(".puzzle-sol-input").forEach((el) => {
        const i = Number(el.dataset.idx);
        if (this.config.puzzles[i]) {
          this.config.puzzles[i].solution = el.value
            .split(",")
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean);
        }
      });

      // Areas
      document.querySelectorAll(".area-name-input").forEach((el) => {
        const i = Number(el.dataset.idx);
        if (this.config.areas[i]) this.config.areas[i].name = el.value.trim();
      });
      document.querySelectorAll(".area-sub-input").forEach((el) => {
        const i = Number(el.dataset.idx);
        if (this.config.areas[i]) this.config.areas[i].subtitle = el.value.trim();
      });
      document.querySelectorAll(".area-banner-input").forEach((el) => {
        const i = Number(el.dataset.idx);
        if (this.config.areas[i]) this.config.areas[i].openingBanner = el.value.trim();
      });
    }

    saveAll() {
      this.collectFormValuesIntoConfig();
      const res = global.StorageManager.saveConfig(this.config);
      this.renderDashboard();
      if (res.ok) {
        this.config = res.config;
        this.showAlert("✓ All customizations saved to browser storage!", "success");
      } else {
        this.showAlert("✗ Could not save: " + res.errors.join(" | "), "error");
      }
      return res.ok;
    }

    bindGlobalActions() {
      const bindClick = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("click", fn);
      };

      bindClick("btn-quick-save", () => this.saveAll());
      bindClick("btn-topbar-save", () => this.saveAll());
      bindClick("btn-save-browser", () => this.saveAll());

      bindClick("btn-topbar-preview", () => {
        this.collectFormValuesIntoConfig();
        global.StorageManager.setPreviewConfig(this.config);
        // Switch to Preview tab and load iframe
        const tabBtn = document.querySelector('[data-tab="tab-preview"]');
        if (tabBtn) tabBtn.click();
        this.launchPreviewIframe("title");
      });

      bindClick("btn-add-memory", () => {
        this.collectFormValuesIntoConfig();
        const nextNum = this.config.memories.length + 1;
        this.config.memories.push({
          id: `mem_${Date.now()}`,
          order: nextNum,
          title: `Memory #${nextNum}`,
          caption: "Add a special memory caption here!",
          sceneId: "sanctuary",
          displayMode: "contain",
          imageUrl: global.DEFAULT_GAME_CONFIG.memories[0].imageUrl
        });
        this.renderMemoriesEditor();
        this.showAlert(`Added Memory #${nextNum}. Upload a photo and click Save Changes!`, "success");
      });

      // Custom audio file upload
      const musicFileInput = document.getElementById("cfg-custom-music-file");
      if (musicFileInput) {
        musicFileInput.addEventListener("change", (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          if (!file.type.startsWith("audio/")) {
            this.showAlert("Unsupported audio format. Please select an MP3, WAV, or OGG file.", "error");
            return;
          }
          if (file.size > 3 * 1024 * 1024) {
            this.showAlert("Audio file is larger than 3MB. Please choose a shorter/compressed track so browser storage succeeds.", "error");
            return;
          }
          const reader = new FileReader();
          reader.onload = (ev) => {
            this.config.audio.customMusicDataUrl = ev.target.result;
            this.populateAudioForm();
            this.showAlert("Custom background music loaded! Click Save Changes to apply.", "success");
          };
          reader.readAsDataURL(file);
        });
      }

      bindClick("btn-clear-custom-music", () => {
        this.config.audio.customMusicDataUrl = "";
        this.populateAudioForm();
        this.showAlert("Reverted to built-in music-box synthesizer.", "success");
      });

      // Restore backup
      bindClick("btn-restore-backup", () => {
        if (!window.confirm("Restore the previous saved configuration backup?")) return;
        const res = global.StorageManager.restoreBackupConfig();
        if (res.ok) {
          this.config = res.config;
          this.populateAllForms();
          this.showAlert("✓ Restored previous configuration backup!", "success");
        } else {
          this.showAlert(res.error, "error");
        }
      });

      // Reset to factory defaults
      bindClick("btn-reset-defaults", () => {
        if (
          !window.confirm(
            "Reset all customizations back to factory defaults? (Your current config will be saved in Backup first)."
          )
        ) {
          return;
        }
        const res = global.StorageManager.resetConfigToDefault();
        if (res.ok) {
          this.config = res.config;
          this.populateAllForms();
          this.showAlert("✓ Reset configuration to factory defaults.", "success");
        }
      });

      // Reset player gameplay save only
      bindClick("btn-reset-player-save", () => {
        if (
          !window.confirm(
            "Reset the player's gameplay progress (collected items, solved puzzles) back to the start? Your Admin customizations will NOT be touched."
          )
        ) {
          return;
        }
        global.StorageManager.resetSaveState();
        this.showAlert("✓ Player gameplay save state has been reset to a fresh journey.", "success");
      });

      // Export JSON
      bindClick("btn-export-json", () => {
        this.collectFormValuesIntoConfig();
        const dataStr = JSON.stringify(this.config, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "birthday-adventure-config.json";
        a.click();
        URL.revokeObjectURL(url);
        this.showAlert("✓ Exported configuration to birthday-adventure-config.json", "success");
      });

      // Import JSON
      const importInput = document.getElementById("input-import-json");
      if (importInput) {
        importInput.addEventListener("change", (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            try {
              const parsed = JSON.parse(ev.target.result);
              const normalized = global.StorageManager.normalizeConfig(parsed);
              const check = global.StorageManager.validateConfig(normalized);
              if (!check.valid) {
                this.showAlert(
                  "Imported JSON failed validation: " + check.errors.join(" | "),
                  "error"
                );
                return;
              }
              const saveRes = global.StorageManager.saveConfig(normalized);
              if (saveRes.ok) {
                this.config = saveRes.config;
                this.populateAllForms();
                this.showAlert("✓ Imported and saved configuration JSON successfully!", "success");
              } else {
                this.showAlert(saveRes.errors.join(" | "), "error");
              }
            } catch (err) {
              this.showAlert(
                "Malformed JSON file: Could not parse configuration. Please verify the file is valid JSON.",
                "error"
              );
            }
          };
          reader.readAsText(file);
          importInput.value = "";
        });
      }

      // Download bundled defaultConfig.js
      bindClick("btn-download-bundled-js", () => {
        if (!this.saveAll()) return;
        const jsContent = global.StorageManager.generateBundledConfigJs(this.config);
        const blob = new Blob([jsContent], { type: "application/javascript" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "defaultConfig.js";
        a.click();
        URL.revokeObjectURL(url);
        this.showAlert(
          "✓ Downloaded defaultConfig.js! Place it in your js/ folder before deploying to any static host.",
          "success"
        );
      });

      // Save directly to E:\birthday-adventure\js\defaultConfig.js via local Python server endpoint
      bindClick("btn-save-to-disk-server", async () => {
        if (!this.saveAll()) return;
        try {
          const resp = await fetch("/api/save-default-config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(this.config)
          });
          if (resp.ok) {
            this.showAlert(
              "✓ Successfully wrote your personalized configuration directly to E:\\birthday-adventure\\js\\defaultConfig.js!",
              "success"
            );
          } else {
            this.showAlert(
              "Local server endpoint not active (you may be on a static host). Use 'Download Personalized defaultConfig.js' instead.",
              "error"
            );
          }
        } catch (err) {
          this.showAlert(
            "Running in static mode—use 'Download Personalized defaultConfig.js' to save the file.",
            "error"
          );
        }
      });

      // Live Preview Scene buttons
      document.querySelectorAll(".btn-preview-scene").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.collectFormValuesIntoConfig();
          global.StorageManager.setPreviewConfig(this.config);
          const scene = btn.getAttribute("data-scene");
          this.launchPreviewIframe(scene);
        });
      });
    }

    launchPreviewIframe(scene) {
      const iframe = document.getElementById("admin-preview-iframe");
      if (!iframe) return;
      const param = scene === "title" ? "" : `&previewScene=${encodeURIComponent(scene)}`;
      iframe.src = `index.html?preview=1${param}&t=${Date.now()}`;
    }

    showAlert(message, type = "success") {
      const box = document.getElementById("admin-alert-box");
      if (!box) return;
      box.textContent = message;
      box.className = `alert-box ${type}`;
      box.classList.remove("hidden");
      clearTimeout(this.alertTimeout);
      this.alertTimeout = setTimeout(() => {
        box.classList.add("hidden");
      }, 5500);
    }

    escapeAttr(str) {
      return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }
  }

  global.AdminStudio = AdminStudio;

  window.addEventListener("DOMContentLoaded", () => {
    global.AdminApp = new AdminStudio();
    global.AdminApp.init();
  });
})(window);
