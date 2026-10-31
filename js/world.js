/**
 * World & Level Architecture ("A Little Universe Made for You")
 *
 * Defines the 4 playable areas (1200x840 world units each) with:
 *  - Parallax starry sky & distant mountain silhouettes
 *  - Winding paths, gardens, cottages, ponds, stepping-stone rivers, and ancient ruins
 *  - Solid collision boundaries & obstacle bounding boxes
 *  - Interactive objects (Pedestals, Clocktower Dial, Echo Shrine, Constellation Gate,
 *    Signposts, Secret Benches, Memory Pedestals, Grand Birthday Cake, and Area Portals)
 *  - Environmental hazards (Mist Brook water in Area 3 with safe stepping stones and checkpoint recovery)
 */
(function (global) {
  const WORLD_WIDTH = 1200;
  const WORLD_HEIGHT = 840;

  function buildAreaDefinitions(config, saveState) {
    const fmt = (str) => global.StorageManager.formatText(str, config);

    const areas = {
      // =====================================================================
      // AREA 1: THE WHISPERING GARDEN
      // =====================================================================
      garden: {
        id: "garden",
        width: WORLD_WIDTH,
        height: WORLD_HEIGHT,
        spawn: { x: 160, y: 430 },
        fromRightSpawn: { x: 1020, y: 430 },

        // Solid obstacles the player cannot walk through: { x, y, w, h }
        obstacles: [
          // Outer forest walls
          { x: 0, y: 0, w: 1200, h: 110 },
          { x: 0, y: 740, w: 1200, h: 100 },
          { x: 0, y: 0, w: 70, h: 840 },
          { x: 1130, y: 0, w: 70, h: 350 },
          { x: 1130, y: 510, w: 70, h: 330 },
          // Southern Pond (solid water edge)
          { x: 430, y: 560, w: 210, h: 130 },
          // Decorative stone flowerbeds
          { x: 260, y: 270, w: 90, h: 60 },
          { x: 640, y: 260, w: 95, h: 60 }
        ],

        // Decorative trees & props
        trees: [
          { x: 130, y: 160, scale: 1.15, canopy: "#225752", glow: "#72efdd" },
          { x: 340, y: 150, scale: 1.0, canopy: "#2b6761", glow: "#ff9ebb" },
          { x: 560, y: 145, scale: 1.2, canopy: "#225752", glow: "#72efdd" },
          { x: 820, y: 165, scale: 1.15, canopy: "#2d6a64", glow: "#ffd166" },
          { x: 1010, y: 180, scale: 1.05, canopy: "#225752", glow: "#72efdd" },
          { x: 120, y: 710, scale: 1.1, canopy: "#1e4d48", glow: "#80ed99" },
          { x: 330, y: 700, scale: 1.0, canopy: "#265c56", glow: "#ff9ebb" },
          { x: 860, y: 690, scale: 1.15, canopy: "#225752", glow: "#ffd166" },
          { x: 1030, y: 680, scale: 1.05, canopy: "#2a6f68", glow: "#72efdd" }
        ],

        lanterns: [
          { x: 230, y: 390, color: "#72efdd" },
          { x: 520, y: 390, color: "#ffd166" },
          { x: 860, y: 390, color: "#ff9ebb" }
        ],

        interactables: [
          {
            id: "obj_garden_sign",
            x: 220,
            y: 470,
            radius: 58,
            actionLabel: "Read",
            title: "Garden Welcome Plaque",
            type: "examine",
            dialogue: [
              fmt(
                "\"Welcome to the Whispering Garden, crafted in honor of [Sister's Name — e.g. Maya]!\""
              ),
              "\"Gather the 3 glowing Starlight Petals around the paths, speak with Elder Rowan, and awaken the Sunbeam Pedestal in the East.\""
            ]
          },
          {
            id: "obj_garden_bench",
            x: 155,
            y: 555,
            radius: 60,
            actionLabel: "Examine",
            title: "Secret Moon-Bench",
            type: "examine",
            dialogue: [
              fmt(
                "A cozy stone bench overlooking the fireflies. An engraving on the armrest reads: \"Favorite Vibe: [Placeholder Favorite #1: Iced Matcha & Cozy Rainy Evenings]\""
              ),
              "Look closely in the grass just south of this bench for a hidden four-leaf keepsake!"
            ]
          },
          {
            id: "obj_garden_pedestal",
            x: 940,
            y: 420,
            radius: 68,
            actionLabel: "Activate",
            title: "Sunbeam Pedestal",
            type: "puzzle",
            puzzleId: "puzzle_garden_pedestal"
          },
          {
            id: "portal_garden_to_village",
            x: 1120,
            y: 430,
            radius: 72,
            actionLabel: "Enter",
            title: "Sunbeam Gate (To Memory Village)",
            type: "portal",
            targetAreaId: "village",
            unlockQuestId: "quest_garden_intro",
            lockedMessage:
              "The Sunbeam Gate is still slumbering. Collect all 3 Starlight Petals and activate the Sunbeam Pedestal just to the left!"
          }
        ]
      },

      // =====================================================================
      // AREA 2: THE MEMORY VILLAGE
      // =====================================================================
      village: {
        id: "village",
        width: WORLD_WIDTH,
        height: WORLD_HEIGHT,
        spawn: { x: 140, y: 440 },
        fromRightSpawn: { x: 1030, y: 440 },

        obstacles: [
          { x: 0, y: 0, w: 1200, h: 100 },
          { x: 0, y: 745, w: 1200, h: 95 },
          { x: 0, y: 0, w: 60, h: 350 },
          { x: 0, y: 520, w: 60, h: 320 },
          { x: 1135, y: 0, w: 65, h: 350 },
          { x: 1135, y: 520, w: 65, h: 320 },
          // Pip's Cozy Bakery Cottage (North-West)
          { x: 200, y: 170, w: 190, h: 130 },
          // Lyra's Starlight Archive Cottage (North-East)
          { x: 700, y: 155, w: 200, h: 130 },
          // Central Village Fountain
          { x: 505, y: 405, w: 110, h: 85 }
        ],

        cottages: [
          {
            x: 295,
            y: 230,
            w: 180,
            h: 130,
            roof: "#e07a5f",
            wall: "#f4f1de",
            label: "Pip's Starlight Bakery"
          },
          {
            x: 800,
            y: 215,
            w: 190,
            h: 130,
            roof: "#6d597a",
            wall: "#f2e9e4",
            label: "Hall of Memories"
          }
        ],

        trees: [
          { x: 130, y: 165, scale: 1.0, canopy: "#3d405b", glow: "#ffb86c" },
          { x: 540, y: 145, scale: 1.05, canopy: "#4a4e69", glow: "#ffd166" },
          { x: 1050, y: 140, scale: 1.0, canopy: "#3d405b", glow: "#ff9ebb" },
          { x: 150, y: 690, scale: 1.1, canopy: "#3d405b", glow: "#ffb86c" },
          { x: 960, y: 690, scale: 1.1, canopy: "#4a4e69", glow: "#ffd166" }
        ],

        lanterns: [
          { x: 210, y: 400, color: "#ffb86c" },
          { x: 450, y: 380, color: "#ffd166" },
          { x: 670, y: 380, color: "#ffd166" },
          { x: 920, y: 400, color: "#ffb86c" }
        ],

        interactables: [
          {
            id: "portal_village_to_garden",
            x: 75,
            y: 440,
            radius: 65,
            actionLabel: "Enter",
            title: "West Gate (Back to Whispering Garden)",
            type: "portal",
            targetAreaId: "garden",
            unlockQuestId: "none"
          },
          {
            id: "obj_village_fountain",
            x: 560,
            y: 450,
            radius: 75,
            actionLabel: "Examine",
            title: "Wishing Fountain",
            type: "examine",
            dialogue: [
              fmt(
                "Golden coins shimmer beneath the water. A plaque reads: \"In celebration of [Sister's Name — e.g. Maya] — [Placeholder Quote: 'You carry your own sunshine wherever you go.']\""
              ),
              "Hint: Talk to Pip (west), Lyra (northeast), and Orion (south) to learn the 3 symbols for the Clocktower Dial just north of this fountain!"
            ]
          },
          {
            id: "obj_village_clocktower",
            x: 560,
            y: 330,
            radius: 68,
            actionLabel: "Activate",
            title: "Clocktower Three-Lantern Dial",
            type: "puzzle",
            puzzleId: "puzzle_village_dial"
          },
          {
            id: "obj_village_joke_board",
            x: 890,
            y: 490,
            radius: 60,
            actionLabel: "Read",
            title: "Village Noticeboard",
            type: "examine",
            dialogue: [
              fmt("Today's Featured Memory Note: \"[Placeholder Inside Joke #2: The legendary midnight kitchen experiment we promised never to speak of]\""),
              fmt("Also pinned: \"[Sister's Name — e.g. Maya]'s Favorite Comforts: [Placeholder Favorite #4: Unstoppable Laughs & Big Dreams]\"")
            ]
          },
          {
            id: "portal_village_to_forest",
            x: 1120,
            y: 440,
            radius: 72,
            actionLabel: "Enter",
            title: "Astral Bridge (To Starfall Forest)",
            type: "portal",
            targetAreaId: "forest",
            unlockQuestId: "quest_village_clocktower",
            lockedMessage:
              "The Astral Bridge hasn't materialized yet. Gather the 3 symbol clues from Pip, Lyra, and Orion, then solve the Clocktower Dial in the north square!"
          }
        ]
      },

      // =====================================================================
      // AREA 3: THE STARFALL FOREST
      // =====================================================================
      forest: {
        id: "forest",
        width: WORLD_WIDTH,
        height: WORLD_HEIGHT,
        spawn: { x: 140, y: 450 },
        fromRightSpawn: { x: 600, y: 210 },

        obstacles: [
          { x: 0, y: 0, w: 480, h: 105 },
          { x: 720, y: 0, w: 480, h: 105 },
          { x: 0, y: 745, w: 1200, h: 95 },
          { x: 0, y: 0, w: 60, h: 360 },
          { x: 0, y: 530, w: 60, h: 310 },
          { x: 1135, y: 0, w: 65, h: 840 }
        ],

        // Mist Brook hazard zone (if player steps in water outside safe bridge/stone rectangles,
        // they splash safely back to the dry checkpoint bank at x: 430, y: 450)
        hazardRiver: {
          x: 500,
          y: 160,
          w: 160,
          h: 580,
          checkpoint: { x: 430, y: 450 },
          safePads: [
            // Main central stone bridge + stepping stones for the north/south dewdrops
            { x: 485, y: 390, w: 190, h: 115, label: "Moss Bridge" },
            { x: 515, y: 220, w: 130, h: 175, label: "North Stepping Stones" },
            { x: 525, y: 500, w: 145, h: 110, label: "South Stepping Stones" }
          ]
        },

        trees: [
          { x: 160, y: 170, scale: 1.2, canopy: "#241e4e", glow: "#9b87ff" },
          { x: 380, y: 155, scale: 1.1, canopy: "#1b264f", glow: "#64dfdf" },
          { x: 840, y: 170, scale: 1.2, canopy: "#241e4e", glow: "#c77dff" },
          { x: 1040, y: 190, scale: 1.15, canopy: "#1b264f", glow: "#72efdd" },
          { x: 160, y: 690, scale: 1.15, canopy: "#241e4e", glow: "#9b87ff" },
          { x: 380, y: 700, scale: 1.05, canopy: "#1b264f", glow: "#64dfdf" },
          { x: 780, y: 700, scale: 1.15, canopy: "#241e4e", glow: "#c77dff" }
        ],

        lanterns: [
          { x: 240, y: 380, color: "#9b87ff" },
          { x: 450, y: 380, color: "#64dfdf" },
          { x: 720, y: 380, color: "#c77dff" },
          { x: 940, y: 380, color: "#ffd166" }
        ],

        interactables: [
          {
            id: "portal_forest_to_village",
            x: 75,
            y: 450,
            radius: 65,
            actionLabel: "Enter",
            title: "Astral Bridge (Back to Memory Village)",
            type: "portal",
            targetAreaId: "village",
            unlockQuestId: "none"
          },
          {
            id: "obj_forest_tablet",
            x: 420,
            y: 330,
            radius: 62,
            actionLabel: "Read",
            title: "Mossy Rune Tablet",
            type: "examine",
            dialogue: [
              "An ancient stone tablet carved with musical star-runes:",
              "\"To awaken the Echo Crystal Shrine in the northwest grove, strike the four crystals in this exact order:\"",
              "\"1st: TEAL (Brook) → 2nd: VIOLET (Twilight) → 3rd: GOLD (Lantern) → 4th: ROSE (Blossom).\"",
              "\"And at the eastern Constellation Gate, light the 4 Corner Stars and the Center Star (forming an X of 5 stars)!\""
            ]
          },
          {
            id: "obj_forest_echo_shrine",
            x: 260,
            y: 250,
            radius: 68,
            actionLabel: "Activate",
            title: "Echo Crystal Shrine",
            type: "puzzle",
            puzzleId: "puzzle_forest_echo"
          },
          {
            id: "obj_forest_constellation_gate",
            x: 910,
            y: 420,
            radius: 72,
            actionLabel: "Activate",
            title: "Ancient Constellation Gate",
            type: "puzzle",
            puzzleId: "puzzle_forest_constellation"
          },
          {
            id: "portal_forest_to_sanctuary",
            x: 600,
            y: 125,
            radius: 78,
            actionLabel: "Enter",
            title: "Sanctuary Portal (To Birthday Sanctuary)",
            type: "portal",
            targetAreaId: "sanctuary",
            unlockQuestId: "quest_forest_sanctuary",
            lockedMessage:
              "The Sanctuary Portal is sealed. Collect the 3 Astral Dewdrops, harmonize the Echo Crystal Shrine (northwest), and align the Constellation Gate (east)!"
          }
        ]
      },

      // =====================================================================
      // AREA 4: THE BIRTHDAY SANCTUARY (FINAL AREA)
      // =====================================================================
      sanctuary: {
        id: "sanctuary",
        width: WORLD_WIDTH,
        height: WORLD_HEIGHT,
        spawn: { x: 600, y: 700 },
        fromRightSpawn: { x: 600, y: 700 },

        obstacles: [
          { x: 0, y: 0, w: 1200, h: 95 },
          { x: 0, y: 760, w: 1200, h: 80 },
          { x: 0, y: 0, w: 75, h: 840 },
          { x: 1125, y: 0, w: 75, h: 840 }
        ],

        trees: [
          { x: 170, y: 180, scale: 1.15, canopy: "#4a1942", glow: "#ff7eb6" },
          { x: 1030, y: 180, scale: 1.15, canopy: "#4a1942", glow: "#ffd166" },
          { x: 170, y: 660, scale: 1.1, canopy: "#3c1642", glow: "#72efdd" },
          { x: 1030, y: 660, scale: 1.1, canopy: "#3c1642", glow: "#ff7eb6" }
        ],

        lanterns: [
          { x: 350, y: 240, color: "#ff7eb6" },
          { x: 850, y: 240, color: "#ffd166" },
          { x: 350, y: 560, color: "#72efdd" },
          { x: 850, y: 560, color: "#c77dff" }
        ],

        interactables: [
          {
            id: "portal_sanctuary_to_forest",
            x: 600,
            y: 745,
            radius: 65,
            actionLabel: "Enter",
            title: "Southern Gate (Return to Starfall Forest)",
            type: "portal",
            targetAreaId: "forest",
            unlockQuestId: "none"
          },
          {
            id: "pedestal_mem_1",
            x: 330,
            y: 310,
            radius: 66,
            actionLabel: "Activate",
            title: "Memory Pedestal I",
            type: "memory_pedestal",
            memoryId: "mem_1"
          },
          {
            id: "pedestal_mem_2",
            x: 870,
            y: 310,
            radius: 66,
            actionLabel: "Activate",
            title: "Memory Pedestal II",
            type: "memory_pedestal",
            memoryId: "mem_2"
          },
          {
            id: "pedestal_mem_3",
            x: 330,
            y: 510,
            radius: 66,
            actionLabel: "Activate",
            title: "Memory Pedestal III",
            type: "memory_pedestal",
            memoryId: "mem_3"
          },
          {
            id: "pedestal_mem_4",
            x: 870,
            y: 510,
            radius: 66,
            actionLabel: "Activate",
            title: "Memory Pedestal IV",
            type: "memory_pedestal",
            memoryId: "mem_4"
          },
          {
            id: "obj_sanctuary_cake",
            x: 600,
            y: 360,
            radius: 78,
            actionLabel: "Celebrate",
            title: "Grand Starlight Birthday Cake",
            type: "puzzle",
            puzzleId: "puzzle_sanctuary_wish"
          }
        ]
      }
    };

    return areas;
  }

  global.WorldBuilder = {
    WORLD_WIDTH,
    WORLD_HEIGHT,
    buildAreaDefinitions
  };
})(window);
