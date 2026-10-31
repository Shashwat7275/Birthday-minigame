/**
 * Web Audio API Music & Sound Effects Synthesizer + Custom Audio Player
 *
 * Respects browser autoplay restrictions (initializes on first user interaction),
 * requires zero external paid assets, supports custom uploaded music/SFX data URLs,
 * and allows full mute / volume controls without ever blocking gameplay.
 */
(function (global) {
  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.unlocked = false;
      this.musicEnabled = true;
      this.sfxEnabled = true;
      this.musicVolume = 0.45;
      this.sfxVolume = 0.65;
      this.currentAreaTheme = "title";
      this.musicTimer = null;
      this.noteIndex = 0;
      this.customMusicEl = null;
      this.customMusicUrl = "";
      this.customCelebrationUrl = "";
    }

    applyConfig(audioCfg) {
      if (!audioCfg) return;
      this.musicEnabled = audioCfg.musicEnabled !== false;
      this.sfxEnabled = audioCfg.sfxEnabled !== false;
      this.musicVolume = typeof audioCfg.musicVolume === "number" ? audioCfg.musicVolume : 0.45;
      this.sfxVolume = typeof audioCfg.sfxVolume === "number" ? audioCfg.sfxVolume : 0.65;

      const newMusicUrl = audioCfg.customMusicDataUrl || "";
      if (newMusicUrl !== this.customMusicUrl) {
        this.customMusicUrl = newMusicUrl;
        if (this.customMusicEl) {
          this.customMusicEl.pause();
          this.customMusicEl = null;
        }
      }
      this.customCelebrationUrl = audioCfg.customCelebrationSfxDataUrl || "";

      if (!this.musicEnabled) {
        this.stopMusic();
      } else if (this.unlocked) {
        this.startMusic(this.currentAreaTheme);
      }
    }

    unlock() {
      if (this.unlocked && this.ctx && this.ctx.state === "running") return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!this.ctx) {
          this.ctx = new AudioCtx();
        }
        if (this.ctx.state === "suspended") {
          this.ctx.resume();
        }
        this.unlocked = true;
        if (this.musicEnabled) {
          this.startMusic(this.currentAreaTheme);
        }
      } catch (e) {
        // Audio is strictly optional; never throw or block gameplay
      }
    }

    setTheme(themeName) {
      if (this.currentAreaTheme === themeName && (this.musicTimer || this.customMusicEl)) return;
      this.currentAreaTheme = themeName || "garden";
      this.noteIndex = 0;
      if (this.unlocked && this.musicEnabled) {
        this.startMusic(this.currentAreaTheme);
      }
    }

    startMusic(themeName) {
      this.stopMusic();
      if (!this.musicEnabled) return;

      // If custom music file was uploaded in Admin Panel, play that loop
      if (this.customMusicUrl) {
        try {
          this.customMusicEl = new Audio(this.customMusicUrl);
          this.customMusicEl.loop = true;
          this.customMusicEl.volume = Math.max(0, Math.min(1, this.musicVolume));
          this.customMusicEl.play().catch(() => {});
          return;
        } catch (e) {
          // Fall back to synthesized music box
        }
      }

      if (!this.ctx) return;

      // Gentle anime music-box arpeggios for each area
      const palettes = {
        title: {
          tempoMs: 520,
          notes: [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 587.33, 783.99]
        },
        garden: {
          tempoMs: 480,
          notes: [523.25, 587.33, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33]
        },
        village: {
          tempoMs: 420,
          notes: [587.33, 739.99, 880.0, 1174.66, 880.0, 739.99, 659.25, 880.0]
        },
        forest: {
          tempoMs: 540,
          notes: [440.0, 523.25, 659.25, 783.99, 659.25, 523.25, 493.88, 659.25]
        },
        sanctuary: {
          // Happy Birthday-inspired gentle music-box motif
          tempoMs: 430,
          notes: [
            523.25, 523.25, 587.33, 523.25, 698.46, 659.25, 523.25, 523.25, 587.33, 523.25, 783.99,
            698.46
          ]
        }
      };

      const palette = palettes[themeName] || palettes.garden;
      this.musicTimer = setInterval(() => {
        if (!this.musicEnabled || document.hidden) return;
        const freq = palette.notes[this.noteIndex % palette.notes.length];
        this.noteIndex++;
        this.playTone(freq, 0.38, "sine", this.musicVolume * 0.16);
      }, palette.tempoMs);
    }

    stopMusic() {
      if (this.musicTimer) {
        clearInterval(this.musicTimer);
        this.musicTimer = null;
      }
      if (this.customMusicEl) {
        try {
          this.customMusicEl.pause();
        } catch (e) {}
      }
    }

    playTone(freq, durationSec, type = "sine", gainVal = 0.15, slideToFreq = null) {
      if (!this.ctx || this.ctx.state !== "running") return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        if (slideToFreq) {
          osc.frequency.exponentialRampToValueAtTime(slideToFreq, now + durationSec);
        }

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(Math.max(0.001, gainVal), now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + durationSec + 0.02);
      } catch (e) {}
    }

    playSfx(name) {
      if (!this.sfxEnabled) return;
      this.unlock();
      if (!this.ctx) return;

      const v = Math.max(0.02, Math.min(1, this.sfxVolume)) * 0.25;

      switch (name) {
        case "step":
          this.playTone(190, 0.06, "triangle", v * 0.35, 140);
          break;
        case "talk":
          this.playTone(540 + Math.random() * 140, 0.08, "sine", v * 0.6);
          break;
        case "collect":
          this.playTone(587.33, 0.12, "sine", v * 0.9);
          setTimeout(() => this.playTone(880, 0.22, "sine", v), 90);
          break;
        case "secret":
          [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 0.2, "triangle", v), i * 80);
          });
          break;
        case "chime":
          this.playTone(783.99, 0.18, "sine", v);
          break;
        case "error":
          this.playTone(220, 0.16, "sawtooth", v * 0.6, 165);
          break;
        case "quest":
          [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 0.24, "sine", v), i * 95);
          });
          break;
        case "celebrate":
          if (this.customCelebrationUrl) {
            try {
              const a = new Audio(this.customCelebrationUrl);
              a.volume = Math.max(0, Math.min(1, this.sfxVolume));
              a.play().catch(() => {});
              return;
            } catch (e) {}
          }
          [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 0.26, "triangle", v * 1.1), i * 110);
          });
          break;
        default:
          this.playTone(660, 0.1, "sine", v * 0.5);
      }
    }
  }

  global.GameAudio = new AudioEngine();
})(window);
