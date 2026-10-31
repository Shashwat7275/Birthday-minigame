# 🌟 A Little Universe Made for You — Personalized Birthday Adventure Game

A complete, mobile-first 2D anime-storybook birthday adventure game with a full-featured **Creator Studio (Admin Panel)** built for your sister's birthday surprise.

---

## 📁 1. Project Structure (`E:\birthday-adventure`)

```text
E:\birthday-adventure\
├── index.html          # Main playable 2D Birthday Adventure Game
├── admin.html          # Creator Studio (Admin Panel) for no-code customization
├── verify.html         # Automated 28-point end-to-end verification test suite
├── server.py           # Zero-dependency local Python server + direct config saver
├── css/
│   ├── style.css       # Mobile-first responsive game UI, virtual joystick & modals
│   └── admin.css       # Responsive Creator Studio stylesheet
└── js/
    ├── defaultConfig.js# Centralized personalized content, story, quests, puzzles & photos
    ├── storage.js      # LocalStorage persistence, backup/restore, validation & JSON export
    ├── audio.js        # Web Audio API music-box synthesizer & custom audio engine
    ├── sprites.js      # Multi-frame animated anime characters, cottages, trees & portals
    ├── input.js        # Multi-touch virtual joystick, action button & desktop keyboard
    ├── world.js        # 4 playable areas, obstacles, hazards & interactive landmarks
    ├── engine.js       # 60 FPS game loop, camera, collisions, quests & puzzle modals
    └── admin.js        # Full Admin Panel logic, photo uploader/resizer & live preview
```

---

## 🚀 2. How to Run the Game Locally

Because modern browsers apply strict security rules when loading modules and saving assets, run the included lightweight Python server:

1. Open a terminal or PowerShell window in `E:\birthday-adventure`:
   ```powershell
   python E:\birthday-adventure\server.py 8080
   ```
2. Open your browser to:
   - **Play the Game:** `http://127.0.0.1:8080/index.html`
   - **Open the Admin Panel:** `http://127.0.0.1:8080/admin.html`
   - **Run Automated Tests:** `http://127.0.0.1:8080/verify.html`

*(Note: `index.html` and `admin.html` also work when opened directly or hosted on any static web host.)*

---

## 🔐 3. How to Open & Use the Admin Panel (Creator Studio)

1. Click the discreet **⚙️ Creator Studio (Admin)** link at the bottom of the Title Screen (or inside the Pause menu), or navigate directly to `/admin.html`.
2. Enter the default passphrase: **`starlight`**
   - You can change this passphrase in **Tab A. General & Identity**.
   - *Security Note:* Because this is a static browser game with no paid backend required, the client-side passphrase is a convenience barrier to prevent your sister from accidentally opening the editor during gameplay.

### Customizing Names, Messages, Photos & Puzzles
- **Tab A (General & Identity):** Edit the game title, subtitle, your sister's name, nickname, age, your sender signature, player character name, and text size.
- **Tab B (Story, Letter & Dialogue):** Edit the opening/closing narration, the full **Final Sanctuary Birthday Letter**, her **Favorite Things**, **Inside Jokes**, and every **NPC's dialogue**.
- **Tab C (Photos & Audio Assets):** Upload personal photographs for the **Memory Pedestals & Final Gallery** (automatically resized and compressed on upload so phone browsers stay fast), write captions, reorder photos, or upload a custom background music track.
- **Tab D (Quests & Collectibles):** Customize quest titles, descriptions, rewards, and collectible pickup messages.
- **Tab E (Puzzle Editor):** Customize puzzle instructions, clues, hints, and solutions (e.g., the 3-Lantern Clocktower Dial or 4-Crystal Echo Shrine). Built-in validation ensures you cannot accidentally save an unsolvable puzzle.
- **Tab F (World & Level Editor):** Edit area names, subtitles, and chapter opening banners.
- **Tab H (Live Preview Mode):** Preview your changes in the Title Screen, any of the 4 Areas, or the Final Birthday Surprise without touching player save progress.

---

## 💾 4. Saving, Exporting & Packaging for Your Sister

- **While Testing on Your PC:** Clicking **💾 Save All Changes** stores your customizations in your browser's `localStorage` (`birthday_adventure_config_v1`), completely separate from gameplay progress (`birthday_adventure_save_v1`).
- **Before Publishing Online for Your Sister's Phone:**
  Because browser `localStorage` does not sync across different devices, bake your finalized customizations into `js/defaultConfig.js` using **Tab G (Save, Export & Package)**:
  - **Option 1 (Automatic with `server.py`):** Click **⚡ Write Directly to `E:\birthday-adventure\js\defaultConfig.js`**.
  - **Option 2 (Browser Download):** Click **📦 Download Personalized `defaultConfig.js`** and replace `E:\birthday-adventure\js\defaultConfig.js` with the downloaded file.
  - You can also export/import portable `.json` backup files at any time.

---

## 🌐 5. How to Publish Online & Get a Shareable Link

Once you have updated `js/defaultConfig.js` with your personalizations, the entire `E:\birthday-adventure` folder is a **100% self-contained static web app** (no Node.js, database, or paid API required):

1. **Netlify Drop (Fastest — 30 seconds):**
   - Visit [app.netlify.com/drop](https://app.netlify.com/drop) and drag-and-drop the `E:\birthday-adventure` folder (or `E:\birthday-adventure.zip`). Netlify immediately gives you a shareable HTTPS link to send to your sister!
2. **GitHub Pages / Cloudflare Pages / Vercel:**
   - Push the contents of `E:\birthday-adventure` to a repository and enable static Pages hosting with root directory `/`.

---

## 🎮 6. Walkthrough & Puzzle Solutions Reference

- **Area 1 — The Whispering Garden:**
  - Collect the **3 Starlight Petals** (Northwest trees, Northeast willow, Southern pond).
  - *Optional Secret:* Examine the northwest Moon-Bench and pick up the **Secret Clover Bookmark** (`🍀`) in the southwest corner.
  - Activate the **Sunbeam Pedestal** in the east by tapping all 3 petal sockets to unlock the **Sunbeam Gate**.
- **Area 2 — The Memory Village:**
  - Pick up **Pip's Silver Whisk** (`🥄`) near the southern market and return it to **Pip the Baker** (`1st Clue: SUN ☀️`).
  - Speak to **Archivist Lyra** (`2nd Clue: MOON 🌙`) and **Lamplighter Orion** (`3rd Clue: STAR ⭐`).
  - *Optional Secret:* Collect **Whiskers' Astral Bell** (`🔔`) in the northeast alley.
  - Activate the **Clocktower Dial** in the north square and set the 3 dials to **`SUN` → `MOON` → `STAR`** to summon the **Astral Bridge**.
- **Area 3 — The Starfall Forest:**
  - Read the **Mossy Rune Tablet** near the river bend.
  - Cross the **Mist Brook** using the glowing stepping-stone pads (stepping into dark water safely teleports you back to the dry bank) and collect all **3 Astral Dewdrops** (`💧`).
  - *Optional Secret:* Collect the **Star-Weaver's Compass** (`🧭`) in the southeast alcove.
  - At the northwest **Echo Crystal Shrine**, play the 4-note melody: **`TEAL` → `VIOLET` → `GOLD` → `ROSE`**.
  - At the eastern **Constellation Gate**, light the **4 Corner Stars + Center Star** (forming an `X` of 5 stars) to open the **Sanctuary Portal**.
- **Final Area — The Birthday Sanctuary:**
  - Walk up to and ignite all **4 Memory Pedestals** around the pavilion to view the 4 memory photos & captions.
  - Approach the **Grand Starlight Birthday Cake** in the center and tap all **4 Birthday Candles** to launch the fireworks, personal Birthday Letter, and Photo Gallery!
