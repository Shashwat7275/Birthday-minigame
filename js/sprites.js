/**
 * Original Anime-Storybook 2D Character & Environment Renderer
 *
 * Renders multi-frame animated characters (Player + NPCs) with recognizable
 * silhouettes, flowing capes, expressive eyes, hair ribbons, and distinct
 * animation states (idle, walk, interact, collect, celebrate), plus detailed
 * hand-painted style environment props (trees, lanterns, cottages, portals,
 * glowing flowers, crystal chimes, and birthday cake).
 */
(function (global) {
  const SpriteRenderer = {
    /**
     * Draw an anime-inspired character (Player or NPC) at world (x, y)
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} opts
     */
    drawCharacter(ctx, opts) {
      const {
        x,
        y,
        facing = "down",
        state = "idle", // "idle" | "walk" | "interact" | "collect" | "celebrate"
        time = 0,
        cloakColor = "#ff7eb6",
        trimColor = "#ffd166",
        hairColor = "#3c2a4d",
        skinColor = "#ffe5d9",
        isPlayer = false,
        label = "",
        hasQuestMarker = false,
        questMarkerType = "!" // "!" or "?" or "★"
      } = opts;

      ctx.save();
      ctx.translate(x, y);

      // Compute animation offsets
      let bobY = Math.sin(time * 4.2) * 2.2;
      let legSwing = 0;
      let armRaise = 0;
      let tilt = 0;

      if (state === "walk") {
        bobY = Math.abs(Math.sin(time * 11)) * -4.5;
        legSwing = Math.sin(time * 11) * 6;
        tilt = facing === "left" ? -0.05 : facing === "right" ? 0.05 : 0;
      } else if (state === "collect" || state === "celebrate") {
        bobY = -Math.abs(Math.sin(time * 9)) * 9;
        armRaise = 1;
      } else if (state === "interact") {
        bobY = Math.sin(time * 8) * 3;
        armRaise = 0.5;
      }

      // Ground shadow
      ctx.fillStyle = "rgba(8, 10, 24, 0.42)";
      ctx.beginPath();
      ctx.ellipse(0, 18, 15 - bobY * 0.3, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Player subtle starlight aura on ground
      if (isPlayer) {
        const auraGrad = ctx.createRadialGradient(0, 14, 2, 0, 14, 26);
        auraGrad.addColorStop(0, "rgba(255, 209, 102, 0.35)");
        auraGrad.addColorStop(1, "rgba(255, 209, 102, 0)");
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.ellipse(0, 14, 26, 11, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.translate(0, bobY);
      ctx.rotate(tilt);

      // Boots / Legs
      ctx.fillStyle = "#2b2340";
      ctx.beginPath();
      ctx.roundRect(-8 + legSwing * 0.4, 6, 6, 11, 3);
      ctx.roundRect(2 - legSwing * 0.4, 6, 6, 11, 3);
      ctx.fill();

      // Flowing Traveler Cloak / Dress
      const cloakGrad = ctx.createLinearGradient(0, -14, 0, 12);
      cloakGrad.addColorStop(0, cloakColor);
      cloakGrad.addColorStop(1, "#2a1b4e");
      ctx.fillStyle = cloakGrad;
      ctx.beginPath();
      ctx.moveTo(-11, -10);
      ctx.quadraticCurveTo(-16, 4, -13, 10);
      ctx.lineTo(13, 10);
      ctx.quadraticCurveTo(16, 4, 11, -10);
      ctx.closePath();
      ctx.fill();

      // Golden cloak trim & star clasp
      ctx.strokeStyle = trimColor;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-12, 9);
      ctx.lineTo(12, 9);
      ctx.stroke();

      // Scarf / Collar
      ctx.fillStyle = trimColor;
      ctx.beginPath();
      ctx.ellipse(0, -9, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Flowing scarf ribbon tail for player silhouette
      if (isPlayer) {
        const scarfWave = Math.sin(time * 6) * 4;
        ctx.fillStyle = "#ffd166";
        ctx.beginPath();
        const dir = facing === "left" ? 1 : -1;
        ctx.moveTo(dir * 6, -8);
        ctx.quadraticCurveTo(dir * 18, -5 + scarfWave, dir * 21, 2 + scarfWave);
        ctx.quadraticCurveTo(dir * 14, 4 + scarfWave, dir * 5, -5);
        ctx.fill();
      }

      // Arms
      ctx.strokeStyle = cloakColor;
      ctx.lineWidth = 4.5;
      ctx.lineCap = "round";
      if (armRaise > 0) {
        ctx.beginPath();
        ctx.moveTo(-9, -6);
        ctx.lineTo(-15, -16 * armRaise);
        ctx.moveTo(9, -6);
        ctx.lineTo(15, -16 * armRaise);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(-9, -6);
        ctx.lineTo(-12, 2 - legSwing * 0.3);
        ctx.moveTo(9, -6);
        ctx.lineTo(12, 2 + legSwing * 0.3);
        ctx.stroke();
      }

      // Back Hair
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.arc(0, -21, 13.5, 0, Math.PI * 2);
      ctx.fill();

      // Head / Face
      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.arc(0, -20, 11, 0, Math.PI * 2);
      ctx.fill();

      // Eyes & Blush (unless facing up)
      if (facing !== "up") {
        const eyeOffsetX = facing === "left" ? -3 : facing === "right" ? 3 : 0;

        // Soft cheek blush
        ctx.fillStyle = "rgba(255, 115, 155, 0.45)";
        ctx.beginPath();
        ctx.ellipse(-5.5 + eyeOffsetX * 0.6, -18, 2.5, 1.4, 0, 0, Math.PI * 2);
        ctx.ellipse(5.5 + eyeOffsetX * 0.6, -18, 2.5, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Blinking or happy eyes
        const isBlink = Math.sin(time * 2.1) > 0.97;
        ctx.fillStyle = "#1f1932";
        if (state === "celebrate" || state === "collect" || isBlink) {
          ctx.strokeStyle = "#1f1932";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(-4 + eyeOffsetX * 0.7, -20.5, 2.2, Math.PI, 0);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(4 + eyeOffsetX * 0.7, -20.5, 2.2, Math.PI, 0);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.ellipse(-4 + eyeOffsetX * 0.7, -20.5, 1.9, 2.6, 0, 0, Math.PI * 2);
          ctx.ellipse(4 + eyeOffsetX * 0.7, -20.5, 1.9, 2.6, 0, 0, Math.PI * 2);
          ctx.fill();

          // Eye catchlights
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(-4.5 + eyeOffsetX * 0.7, -21.5, 0.8, 0, Math.PI * 2);
          ctx.arc(3.5 + eyeOffsetX * 0.7, -21.5, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Front Hair Bangs
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.arc(0, -24, 11.8, Math.PI * 0.95, Math.PI * 2.05);
      ctx.quadraticCurveTo(6, -19, 3, -23);
      ctx.quadraticCurveTo(0, -18, -3, -23);
      ctx.quadraticCurveTo(-7, -19, -11.5, -23);
      ctx.fill();

      // Player Star Hairpin / Accessory
      if (isPlayer) {
        this.drawStarShape(ctx, 8, -28, 5, 5, 2.3, "#ffd166");
      }

      // Celebrating / Collecting floating sparkle above head
      if (state === "celebrate" || state === "collect") {
        this.drawStarShape(ctx, 0, -42, 5, 8, 3.5, "#ffe66d");
      }

      // Quest Marker above NPCs
      if (hasQuestMarker) {
        const markerY = -44 + Math.sin(time * 5) * 3;
        ctx.fillStyle = questMarkerType === "!" ? "#ffd166" : "#72efdd";
        ctx.beginPath();
        ctx.arc(0, markerY, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#19132c";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(questMarkerType, 0, markerY + 0.5);
      }

      // Nameplate
      if (label) {
        ctx.font = "600 11px 'Segoe UI', system-ui, sans-serif";
        const w = ctx.measureText(label).width + 12;
        ctx.fillStyle = "rgba(15, 19, 38, 0.72)";
        ctx.beginPath();
        ctx.roundRect(-w / 2, 21, w, 16, 8);
        ctx.fill();
        ctx.fillStyle = isPlayer ? "#ffd166" : "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, 0, 29);
      }

      ctx.restore();
    },

    drawStarShape(ctx, cx, cy, spikes, outerR, innerR, color) {
      ctx.save();
      ctx.beginPath();
      let rot = (Math.PI / 2) * 3;
      const step = Math.PI / spikes;
      ctx.moveTo(cx, cy - outerR);
      for (let i = 0; i < spikes; i++) {
        ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
        rot += step;
        ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerR);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    },

    drawTree(ctx, x, y, scale = 1, canopyColor = "#2a6f68", glowColor = "#72efdd", time = 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      const sway = Math.sin(time * 1.6 + x * 0.02) * 2.5;

      // Shadow
      ctx.fillStyle = "rgba(8, 12, 26, 0.38)";
      ctx.beginPath();
      ctx.ellipse(0, 24, 34, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Trunk
      ctx.fillStyle = "#3d2c3e";
      ctx.beginPath();
      ctx.moveTo(-7, 24);
      ctx.quadraticCurveTo(-5, 0, -4 + sway * 0.3, -18);
      ctx.lineTo(4 + sway * 0.3, -18);
      ctx.quadraticCurveTo(5, 0, 8, 24);
      ctx.closePath();
      ctx.fill();

      // Layered anime foliage puffs
      ctx.fillStyle = canopyColor;
      ctx.beginPath();
      ctx.arc(-18 + sway, -22, 22, 0, Math.PI * 2);
      ctx.arc(18 + sway, -22, 22, 0, Math.PI * 2);
      ctx.arc(0 + sway, -38, 26, 0, Math.PI * 2);
      ctx.fill();

      // Soft highlight
      ctx.fillStyle = glowColor;
      ctx.globalAlpha = 0.22 + Math.sin(time * 2 + x) * 0.06;
      ctx.beginPath();
      ctx.arc(-10 + sway, -28, 14, 0, Math.PI * 2);
      ctx.arc(10 + sway, -32, 13, 0, Math.PI * 2);
      ctx.arc(0 + sway, -44, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Glowing blossoms on canopy
      const spots = [
        [-14, -26],
        [12, -20],
        [-4, -42],
        [15, -36]
      ];
      ctx.fillStyle = glowColor;
      spots.forEach(([sx, sy], idx) => {
        const r = 2.5 + Math.sin(time * 3 + idx) * 0.8;
        ctx.beginPath();
        ctx.arc(sx + sway, sy, r, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    },

    drawCottage(ctx, x, y, width, height, roofColor = "#b56576", wallColor = "#f4e8c1", label = "", time = 0) {
      ctx.save();
      ctx.translate(x, y);

      // Shadow
      ctx.fillStyle = "rgba(8, 10, 24, 0.42)";
      ctx.beginPath();
      ctx.roundRect(-width / 2 - 6, -height / 2 + 12, width + 12, height, 12);
      ctx.fill();

      // Cottage body
      ctx.fillStyle = wallColor;
      ctx.beginPath();
      ctx.roundRect(-width / 2, -height / 2 + 20, width, height - 20, 6);
      ctx.fill();

      // Timber beams
      ctx.strokeStyle = "#5c4742";
      ctx.lineWidth = 3;
      ctx.strokeRect(-width / 2 + 2, -height / 2 + 20, width - 4, height - 22);

      // Warm glowing windows
      const winGlow = 0.82 + Math.sin(time * 3) * 0.12;
      ctx.fillStyle = `rgba(255, 209, 102, ${winGlow})`;
      ctx.beginPath();
      ctx.roundRect(-width / 2 + 16, -height / 2 + 38, 24, 24, 4);
      ctx.roundRect(width / 2 - 40, -height / 2 + 38, 24, 24, 4);
      ctx.fill();

      // Door
      ctx.fillStyle = "#6d4c41";
      ctx.beginPath();
      ctx.roundRect(-14, height / 2 - 36, 28, 36, [12, 12, 0, 0]);
      ctx.fill();

      // Pitched storybook roof
      ctx.fillStyle = roofColor;
      ctx.beginPath();
      ctx.moveTo(-width / 2 - 12, -height / 2 + 26);
      ctx.lineTo(0, -height / 2 - 22);
      ctx.lineTo(width / 2 + 12, -height / 2 + 26);
      ctx.closePath();
      ctx.fill();

      if (label) {
        ctx.fillStyle = "rgba(22, 18, 38, 0.85)";
        ctx.beginPath();
        ctx.roundRect(-58, -height / 2 + 6, 116, 18, 6);
        ctx.fill();
        ctx.fillStyle = "#ffd166";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, 0, -height / 2 + 15);
      }

      ctx.restore();
    },

    drawLanternPost(ctx, x, y, color = "#ffd166", isLit = true, time = 0) {
      ctx.save();
      ctx.translate(x, y);

      if (isLit) {
        const pulse = 26 + Math.sin(time * 4 + x) * 4;
        const grad = ctx.createRadialGradient(0, -28, 2, 0, -28, pulse);
        grad.addColorStop(0, color);
        grad.addColorStop(1, "rgba(255, 209, 102, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, -28, pulse, 0, Math.PI * 2);
        ctx.fill();
      }

      // Post
      ctx.strokeStyle = "#3d3552";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 12);
      ctx.lineTo(0, -32);
      ctx.lineTo(8, -32);
      ctx.stroke();

      // Lantern housing
      ctx.fillStyle = isLit ? color : "#4a4e69";
      ctx.beginPath();
      ctx.roundRect(3, -30, 10, 13, 3);
      ctx.fill();

      ctx.restore();
    },

    drawPortalGate(ctx, x, y, isUnlocked, color = "#72efdd", label = "", time = 0) {
      ctx.save();
      ctx.translate(x, y);

      // Stone archway pillars
      ctx.fillStyle = "#3c415c";
      ctx.beginPath();
      ctx.roundRect(-38, -42, 14, 68, 4);
      ctx.roundRect(24, -42, 14, 68, 4);
      ctx.roundRect(-44, -50, 88, 14, 6);
      ctx.fill();

      if (isUnlocked) {
        // Swirling energy vortex
        const grad = ctx.createRadialGradient(0, -8, 4, 0, -8, 36);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.5, color);
        grad.addColorStop(1, "rgba(114, 239, 221, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, -8, 24, 32, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rotating runes
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, -8, 16 + Math.sin(time * 5) * 3, time * 2, time * 2 + Math.PI * 1.3);
        ctx.stroke();
      } else {
        // Locked barrier bars
        ctx.strokeStyle = "rgba(255, 110, 140, 0.65)";
        ctx.lineWidth = 2.5;
        for (let bx = -16; bx <= 16; bx += 16) {
          ctx.beginPath();
          ctx.moveTo(bx, -36);
          ctx.lineTo(bx, 24);
          ctx.stroke();
        }
        ctx.fillStyle = "#ff758f";
        ctx.font = "15px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🔒", 0, -6);
      }

      if (label) {
        ctx.fillStyle = "rgba(14, 17, 34, 0.82)";
        const w = ctx.measureText(label).width + 16;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -70, w, 18, 8);
        ctx.fill();
        ctx.fillStyle = isUnlocked ? color : "#cbd5e1";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, 0, -61);
      }

      ctx.restore();
    },

    drawBirthdayCakeCenterpiece(ctx, x, y, isLit, time = 0) {
      ctx.save();
      ctx.translate(x, y);

      // Pedestal aura
      const auraR = isLit ? 65 + Math.sin(time * 4) * 6 : 45;
      const grad = ctx.createRadialGradient(0, 0, 6, 0, 0, auraR);
      grad.addColorStop(0, isLit ? "rgba(255, 209, 102, 0.55)" : "rgba(255, 126, 182, 0.25)");
      grad.addColorStop(1, "rgba(255, 126, 182, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, auraR, 0, Math.PI * 2);
      ctx.fill();

      // Marble cake stand
      ctx.fillStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.ellipse(0, 16, 36, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bottom tier
      ctx.fillStyle = "#ff9ebb";
      ctx.beginPath();
      ctx.roundRect(-28, -6, 56, 22, 6);
      ctx.fill();

      // Vanilla frosting drips
      ctx.fillStyle = "#fff8f0";
      ctx.beginPath();
      ctx.roundRect(-28, -8, 56, 8, 4);
      ctx.fill();

      // Top tier
      ctx.fillStyle = "#c77dff";
      ctx.beginPath();
      ctx.roundRect(-20, -24, 40, 18, 5);
      ctx.fill();

      ctx.fillStyle = "#fff8f0";
      ctx.beginPath();
      ctx.roundRect(-20, -26, 40, 7, 4);
      ctx.fill();

      // 4 Candles
      const candleX = [-12, -4, 4, 12];
      candleX.forEach((cx, i) => {
        ctx.fillStyle = "#ffd166";
        ctx.fillRect(cx - 1.5, -36, 3, 10);
        if (isLit) {
          const flicker = Math.sin(time * 10 + i) * 1.5;
          ctx.fillStyle = "#ffbe0b";
          ctx.beginPath();
          ctx.arc(cx + flicker * 0.3, -40, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.restore();
    }
  };

  global.SpriteRenderer = SpriteRenderer;
})(window);
