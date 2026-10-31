/**
 * Unified Mobile-First Touch & Desktop Keyboard Input System
 *
 * Features:
 *  - Fixed, predictable bottom-left virtual analog joystick with smooth 360° vector output
 *  - Multi-touch support via Pointer Events (simultaneous movement + action button press)
 *  - Reliable release & focus-loss handling (zero stuck movement when tab blurs or touch cancels)
 *  - Context-sensitive bottom-right Action Button ("Talk", "Collect", "Examine", "Activate", "Open")
 *  - Direct tap-to-interact on nearby world objects on the canvas
 *  - Full Desktop Keyboard support (WASD / Arrow keys, E / Space, I, J, Esc)
 *  - Automatic input-method detection (switches prompts between Touch and Keyboard seamlessly)
 */
(function (global) {
  class InputController {
    constructor() {
      this.keys = new Set();
      this.joyActive = false;
      this.joyPointerId = null;
      this.joyOrigin = { x: 0, y: 0 };
      this.joyVector = { x: 0, y: 0 };
      this.maxJoyRadius = 44;

      this.inputMode = this.detectInitialMode(); // "touch" | "keyboard"
      this.lastInteractTime = 0;

      // Callbacks wired by GameEngine
      this.onInteract = null;
      this.onToggleInventory = null;
      this.onToggleQuests = null;
      this.onTogglePause = null;
      this.onCanvasWorldTap = null;
    }

    detectInitialMode() {
      const hasCoarse =
        window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      return hasCoarse || hasTouch || window.innerWidth <= 900 ? "touch" : "keyboard";
    }

    init() {
      this.setupKeyboard();
      this.setupJoystick();
      this.setupActionButtons();
      this.setupWindowLifecycle();
      this.updateControlHintsUI();
    }

    isTypingInField(target) {
      if (!target) return false;
      const tag = (target.tagName || "").toUpperCase();
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable
      );
    }

    setupKeyboard() {
      window.addEventListener("keydown", (e) => {
        if (this.isTypingInField(e.target)) return;

        const code = e.code;
        const moveCodes = [
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight"
        ];

        if (moveCodes.includes(code)) {
          e.preventDefault();
          this.keys.add(code);
          this.setInputMode("keyboard");
          if (global.GameAudio) global.GameAudio.unlock();
        } else if (code === "KeyE" || code === "Space" || code === "Enter") {
          // Avoid interfering with focused buttons unless it's the body/canvas
          if (document.activeElement && document.activeElement.tagName === "BUTTON" && code === "Enter") {
            return;
          }
          e.preventDefault();
          this.setInputMode("keyboard");
          this.triggerInteract();
        } else if (code === "KeyI") {
          e.preventDefault();
          if (this.onToggleInventory) this.onToggleInventory();
        } else if (code === "KeyJ") {
          e.preventDefault();
          if (this.onToggleQuests) this.onToggleQuests();
        } else if (code === "Escape") {
          e.preventDefault();
          if (this.onTogglePause) this.onTogglePause();
        }
      });

      window.addEventListener("keyup", (e) => {
        this.keys.delete(e.code);
      });
    }

    setupJoystick() {
      const zone = document.getElementById("joystick-zone");
      const base = document.getElementById("joystick-base");
      const stick = document.getElementById("joystick-stick");
      if (!zone || !base || !stick) return;

      const updateStickFromEvent = (clientX, clientY) => {
        const dx = clientX - this.joyOrigin.x;
        const dy = clientY - this.joyOrigin.y;
        const dist = Math.hypot(dx, dy);
        const clampedDist = Math.min(dist, this.maxJoyRadius);
        const angle = Math.atan2(dy, dx);

        const offsetX = Math.cos(angle) * clampedDist;
        const offsetY = Math.sin(angle) * clampedDist;

        stick.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;

        // Deadzone of 6px to prevent drift
        if (dist < 6) {
          this.joyVector.x = 0;
          this.joyVector.y = 0;
        } else {
          const norm = clampedDist / this.maxJoyRadius;
          this.joyVector.x = Math.cos(angle) * norm;
          this.joyVector.y = Math.sin(angle) * norm;
        }
      };

      const resetStick = () => {
        this.joyActive = false;
        this.joyPointerId = null;
        this.joyVector.x = 0;
        this.joyVector.y = 0;
        stick.style.transform = "translate(-50%, -50%)";
        base.classList.remove("active");
      };

      zone.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        if (global.GameAudio) global.GameAudio.unlock();
        this.setInputMode("touch");

        this.joyActive = true;
        this.joyPointerId = e.pointerId;
        try {
          zone.setPointerCapture(e.pointerId);
        } catch (err) {}

        const rect = base.getBoundingClientRect();
        this.joyOrigin.x = rect.left + rect.width / 2;
        this.joyOrigin.y = rect.top + rect.height / 2;
        base.classList.add("active");
        updateStickFromEvent(e.clientX, e.clientY);
      });

      zone.addEventListener("pointermove", (e) => {
        if (!this.joyActive || e.pointerId !== this.joyPointerId) return;
        e.preventDefault();
        updateStickFromEvent(e.clientX, e.clientY);
      });

      zone.addEventListener("pointerup", (e) => {
        if (e.pointerId !== this.joyPointerId) return;
        e.preventDefault();
        resetStick();
      });

      zone.addEventListener("pointercancel", (e) => {
        if (e.pointerId !== this.joyPointerId) return;
        resetStick();
      });

      zone.addEventListener("lostpointercapture", () => {
        resetStick();
      });
    }

    setupActionButtons() {
      const actionBtn = document.getElementById("action-btn");
      if (actionBtn) {
        actionBtn.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (global.GameAudio) global.GameAudio.unlock();
          this.setInputMode("touch");
          this.triggerInteract();
        });
      }

      const canvas = document.getElementById("game-canvas");
      if (canvas) {
        canvas.addEventListener("pointerdown", (e) => {
          if (global.GameAudio) global.GameAudio.unlock();
          const rect = canvas.getBoundingClientRect();
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          const canvasX = (e.clientX - rect.left) * scaleX;
          const canvasY = (e.clientY - rect.top) * scaleY;
          if (this.onCanvasWorldTap) {
            this.onCanvasWorldTap(canvasX, canvasY);
          }
        });
      }
    }

    setupWindowLifecycle() {
      const clearAll = () => {
        this.keys.clear();
        this.joyActive = false;
        this.joyPointerId = null;
        this.joyVector.x = 0;
        this.joyVector.y = 0;
        const stick = document.getElementById("joystick-stick");
        const base = document.getElementById("joystick-base");
        if (stick) stick.style.transform = "translate(-50%, -50%)";
        if (base) base.classList.remove("active");
      };

      window.addEventListener("blur", clearAll);
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) clearAll();
      });
    }

    setInputMode(mode) {
      if (this.inputMode === mode) return;
      this.inputMode = mode;
      this.updateControlHintsUI();
    }

    updateControlHintsUI() {
      const keyBadge = document.getElementById("action-key-hint");
      if (keyBadge) {
        keyBadge.textContent = this.inputMode === "keyboard" ? "[E / Space]" : "TAP";
      }
    }

    triggerInteract() {
      const now = performance.now();
      // Debounce rapid double-activations (180ms)
      if (now - this.lastInteractTime < 180) return;
      this.lastInteractTime = now;
      if (this.onInteract) this.onInteract();
    }

    // Programmatic helper for automated tests & accessibility controls
    setSimulatedVector(vx, vy) {
      this.joyVector.x = vx;
      this.joyVector.y = vy;
      this.joyActive = vx !== 0 || vy !== 0;
    }

    getMovementVector() {
      let vx = 0;
      let vy = 0;

      if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) vx -= 1;
      if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) vx += 1;
      if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) vy -= 1;
      if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) vy += 1;

      if (vx !== 0 || vy !== 0) {
        const len = Math.hypot(vx, vy);
        return { x: vx / len, y: vy / len };
      }

      if (this.joyActive || (this.joyVector.x !== 0 || this.joyVector.y !== 0)) {
        return { x: this.joyVector.x, y: this.joyVector.y };
      }

      return { x: 0, y: 0 };
    }
  }

  global.GameInput = new InputController();
})(window);
