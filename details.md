# Space Benders — NASA Deep Space Co-op: Project Overview & AI Integration Guide

> Comprehensive technical documentation of what this project is, how every system works today, important inconsistencies to resolve, and step-by-step blueprints for integrating real AI.

---

## 1. What Is This Project?

**Space Benders (NASA Deep Space Co-op)** is a **1–4 player real-time cooperative spacecraft-design game** built for a NASA Hackathon (targeted at ages 7–14, per `game_data.json` v0.2).

Originally bootstrapped from the Colyseus + Phaser 3 multiplayer tutorial (`README.md`), the project has been built out into a full interactive cleanroom game where a crew of engineers collaborates in real time to assemble a spacecraft that satisfies **12 aerospace engineering rules** (space, thrust, fuel, power, night batteries, heat, radiation, computing brain, data rate, signal range, science points, and budget) before launching through a WebGL2 hyperspace sequence.

### Core Tech Stack

| Layer | Technology | Location |
|---|---|---|
| **Game Engine** | Phaser 3 (`3.55.2`), Arcade Physics, `640×480` pixel-art canvas (`FIT`) | `client/src/scenes/`, `client/src/game/` |
| **Client Build & UI** | TypeScript (`5.9.3`), Vite (`6.0.0`, port `1234`), DOM "Liquid Glass" overlays, `lucide` SVG icons | `client/src/ui/`, `client/vite.config.ts` |
| **Markdown / AI Rendering** | `marked` (`18.1.3`) + `dompurify` (`3.4.17`) already installed on the client | `client/src/ui/MissionAiTerminal.ts` |
| **Custom Shaders** | WebGL Earth horizon (`EarthBlazeBackground.ts`) & WebGL2 warp tunnel (`HyperspaceLaunchOverlay.ts`) | `client/src/ui/` |
| **Multiplayer Backend** | Colyseus (`0.17.0`), Express (`5.2.1`), Node.js + `tsx` (port `2567`) | `server/src/` |
| **Game Design Dataset** | 6 missions (`M01`–`M06`), 84 spacecraft components (`PT`, `SC`, `CM`, `SI`), 12 validation rules | `game_data.json` |

---

## 2. Project Structure

```text
Nasa-hackathon-project/
├── game_data.json                  # Master design data: 6 missions, 84 parts, 12 rules
├── README.md                       # Original Colyseus+Phaser setup instructions
├── server/
│   ├── package.json                # Colyseus 0.17, Express 5, tsx, TypeScript
│   ├── .env.development            # NODE_ENV=development (tracked in git!)
│   ├── .env.production             # NODE_ENV=production
│   └── src/
│       ├── index.ts                # Boots Colyseus server on port 2567
│       ├── app.config.ts           # Registers "lobby" & "game" rooms + GET /rooms + /monitor
│       ├── models/
│       │   ├── LobbyState.ts       # LobbyRoom schema (players, hostId, gameStarted)
│       │   ├── PlayerSchema.ts     # Lobby player schema (id, username, roles[], ready)
│       │   └── GameState.ts        # GameRoom schema (players, hostId, selectedObjectiveId, shipItems)
│       └── rooms/
│           ├── LobbyRoom.ts        # Room creation, role claiming, host start validation
│           └── GameRoom.ts         # Objective sync, 20Hz position sync, ship inventory sync
└── client/
    ├── package.json                # Phaser 3, @colyseus/sdk, marked, dompurify, lucide, vite
    ├── index.html                  # Fonts (Inter, JetBrains Mono), #game-container, cursor CSS
    ├── public/assets/              # Pixel spritesheets, icons, cleanroom props, earth_blue_marble.jpg
    └── src/
        ├── index.ts                # Initializes EarthBlazeBackground + Phaser.Game
        ├── config/
        │   ├── assets.ts           # Centralized asset keys & URLs
        │   └── theme.ts            # Colors, fonts, spacing, and the 4 Role definitions
        ├── network/
        │   └── ColyseusService.ts  # Singleton Colyseus client wrapper (ws://localhost:2567)
        ├── scenes/
        │   ├── BootScene.ts        # Preloads assets, registers anims, shows AccountForm
        │   ├── LobbyScene.ts       # Lobby browser + crew role assignment
        │   ├── ObjectiveScene.ts   # Mission picker scene (currently bypassed)
        │   └── GameScene.ts        # Cleanroom world, multiplayer sync, HUD, AI terminal, launch
        ├── game/
        │   ├── data/
        │   │   ├── AnimationKeys.ts # Idle & 4-dir walk animation registry
        │   │   ├── ItemData.ts      # 84 components typed as GameItem[]
        │   │   ├── LaunchSystem.ts  # Pure 12-rule spacecraft validation engine
        │   │   ├── MapData.ts       # 20×15 tile grid (32px tiles) + spawn coords
        │   │   ├── NpcData.ts       # Static NPC definitions ("Control Droid")
        │   │   ├── ObjectiveData.ts # Mission registry (see Section 4 on schema mismatch!)
        │   │   └── StationData.ts   # 4 corner station coordinates + center ship coords
        │   ├── entities/
        │   │   ├── StationEntity.ts # Role-locked corner station interactable
        │   │   └── ShipEntity.ts    # Central Artemis Assembly Bay interactable
        │   ├── interfaces/
        │   │   └── IInteractable.ts # Common interface for NPCs, stations, ship
        │   ├── systems/
        │   │   ├── PlayerController.ts       # Local WASD/Arrows movement + input lock toggle
        │   │   ├── RemotePlayerController.ts # Smooth LERP interpolation for teammates
        │   │   ├── CarrySystem.ts            # Single-item carry indicator (local-only)
        │   │   ├── InteractionSystem.ts      # 64px proximity detection + "E" key trigger
        │   │   └── NpcController.ts          # NPC sprite + screen-space dialogue box
        │   └── ui/
        │       └── GameHUD.ts       # Top-left operator/directive/role badge HUD + controls hint
        └── ui/
            ├── AccountForm.ts             # Astronaut callsign sign-in overlay
            ├── EarthBlazeBackground.ts    # Interactive WebGL Earth & nebula background
            ├── LobbyList.ts               # Polls GET /rooms every 3s, create/join lobbies
            ├── LobbyRoomPanel.ts          # Crew manifest, RolePicker, host "Authorize" button
            ├── RolePicker.ts              # 4 role cards (supports multi-role for <4 players)
            ├── ObjectivePicker.ts         # Mission selection modal
            ├── StationMenuUI.ts           # Component catalog for a corner station
            ├── ItemDetailUI.ts            # Spec sheet side panel for any component
            ├── ShipMenuUI.ts              # Ship manifest, stats strip, audit & launch buttons
            ├── LaunchResultUI.ts          # 12-rule pass/fail report modal
            ├── MissionAiTerminal.ts       # Tab-toggled AI Flight Director chat (currently mocked)
            ├── HyperspaceLaunchOverlay.ts # WebGL2 warp-drive launch cutscene
            └── MissionVictoryUI.ts        # Mission debrief + next mission loop
```

---

## 3. How the Game Works End-to-End

### Phase 1: Boot & Authentication
1. `client/src/index.ts` mounts the interactive WebGL `EarthBlazeBackground` and starts Phaser with scenes `[BootScene, LobbyScene, ObjectiveScene, GameScene]`.
2. `BootScene` preloads all images/spritesheets from `assets.ts`, generates the procedural `item_placeholder` texture, registers animations (`AnimationKeys.ts`), and checks `localStorage.getItem("username")`.
3. If no username is saved, `AccountForm` prompts for a callsign before entering `LobbyScene`.

### Phase 2: Lobby & Role Assignment (`LobbyRoom`)
1. `LobbyList` polls `GET http://localhost:2567/rooms` (exposed via `matchMaker.query({ name: "lobby" })` in `server/src/app.config.ts`) every 3 seconds.
2. Players create or join a `LobbyRoom` (`maxClients = 4`).
3. Inside `LobbyRoomPanel`, players claim one or more of the **4 engineering roles** via `RolePicker` (`"setRole"` message):
   - `powerAndThermal` — Power & Thermal Engineer (24 items: solar, nuclear, batteries, power managers, insulation, fuel tanks, engines)
   - `structureAndComputing` — Structure & Computing Engineer (20 items: frames, shields, computers, cargo/nose-cone/brain addons)
   - `Communications` — Communications Engineer (20 items: radios, boosters, pointer motors, compressors)
   - `Science` — Science Engineer (20 items: cameras, sensors, analyzers, radar, mini rover)
4. Fewer than 4 players can play because one player can hold multiple roles. `LobbyRoom.validateRoleDistribution()` ensures every player has at least 1 role, no role is duplicated across players, and all 4 roles are covered.
5. When the host clicks **Authorize Mission Launch** (`"startGame"`), `LobbyRoom` creates a `GameRoom` via `matchMaker.createRoom("game", { hostId })` and broadcasts `"game-started"` with `{ gameRoomId, hostId }`.

### Phase 3: Cleanroom Assembly & Multiplayer Sync (`GameRoom`)
1. *(Note: `LobbyScene._onGameStarted()` currently skips `ObjectiveScene` and starts `GameScene` directly with `"artemis_lunar_relay"`.)*
2. `GameScene` connects to `GameRoom` via `ColyseusService.joinGame()`, builds the `20×15` tilemap (`MapData.ts`), and spawns:
   - The local `PlayerController` (WASD / Arrow keys, `100 px/s`, role-tinted pixel sprite).
   - 4 corner `StationEntity` consoles (`StationData.ts`). Players can only open stations matching their assigned `roles[]`.
   - The central `ShipEntity` ("Artemis Assembly Bay") at tile `(10, 7)`.
   - The `Control Droid` NPC (`NpcController`) at tile `(5, 4)` with 4 static dialogue lines.
3. **Gameplay loop**:
   - Local position is sent every `50ms` (`"move"`), and remote players are smoothed via `RemotePlayerController` (`LERP = 0.18`).
   - Players walk to their station(s), press `E`, inspect components (`ItemDetailUI`), and click **Carry** (`CarrySystem` — 1 item at a time, local-only).
   - Players walk to the center ship, press `E` to open `ShipMenuUI`, and click **Install on Ship** (`"addItemToShip"` → `GameState.shipItems` synced to all teammates). Players can also pull items back out if they own that item's role (`"removeItemFromShip"`).
4. **Launch Audit & Cutscene**:
   - In `ShipMenuUI`, players can open the **Telemetry Console** (`MissionAiTerminal`, also toggled via `TAB`), click **Run Launch Audit (12 Rules)** (`LaunchSystem.runLaunchChecks()` → `LaunchResultUI`), or click **Initiate Launch Sequence** (`_handleLaunchSequence()` → camera shake + rocket tween → `HyperspaceLaunchOverlay` → `MissionVictoryUI`).

---

## 4. Current State of AI & Important Bugs/Mismatches to Fix First

Before wiring up a real LLM/AI, be aware of **five concrete issues** currently in the repository:

### 4.1 `MissionAiTerminal.ts` Is Currently a Local Mock (No Real AI Yet)
`client/src/ui/MissionAiTerminal.ts` already has a polished chat UI, `TAB` shortcut, `player.setInputEnabled(!isFocused)` input locking (`GameScene.ts:146-148`), `marked` + `DOMPurify` markdown rendering, and a simulated word-by-word typewriter animation (`_streamAiResponse`).
However, **there is no AI API or backend integration yet**:
- `_evaluateManifest()`, `_checkPowerSubsystem()`, `_suggestNextPart()`, and `_handleCustomPrompt()` all run hardcoded `if/else` string templates.
- `_handleCustomPrompt()` only checks 3 keyword groups (`weight`/`mass`/`وزن`, `mission`/`هدف`/`مهمة`, `role`/`دور`) and falls back to a generic static string for anything else.

### 4.2 Data Schema Mismatch (`ObjectiveData.ts` vs `LaunchSystem.ts` & `ShipMenuUI.ts`)
Commit `fa81b52` implemented the full `game_data.json` dataset (`M01`–`M06` missions + `LaunchSystem.ts` 12-rule checks). A later UI commit (`faf2ec8`) accidentally replaced `client/src/game/data/ObjectiveData.ts` with a 3-mission mock (`artemis_lunar_relay`, `europa_clipper_probe`, `mars_sample_return`) using `{ target, maxWeight, criticalItemIds, requiredRoles }`.
Because of this mismatch:
- `LaunchSystem.ts` reads `obj.launchPull`, `obj.distanceRating`, `obj.sunlightPct`, `obj.nightNeed`, `obj.heatDanger`, `obj.radiation`, `obj.navigationBrain`, `obj.signalNeed`, `obj.scienceGoal`, `obj.starInstrumentId`, `obj.budget` — all of which are currently `undefined` on `Objective` at runtime.
- `ShipMenuUI.ts` (line 185) displays `Budget: $${this._objective.budget}M · Goal: ${this._objective.scienceGoal} pts`, which renders `undefined` unless `ObjectiveData.ts` is reconciled with `game_data.json`.
- Note: `ObjectiveData.ts` also triggers TypeScript property mismatches if `strict` is enabled, though `tsconfig.json` currently has `"strict": false`.

### 4.3 Stale Item IDs and `.weight` vs `.mass` Bugs
- `ItemData.ts` uses `mass` (not `weight`) and component IDs `PT01`–`PT24`, `SC01`–`SC20`, `CM01`–`CM20`, `SI01`–`SI20` (84 items total).
- `MissionAiTerminal.ts` still references `itemDef.weight` (lines 131, 312 — evaluates to `undefined` → `NaN`) and checks legacy IDs `"engine_core"`, `"nav_system"`, `"hull_plate"`, `"shield_gen"`, `"laser_cannon"`, `"targeting_sys"` (lines 377–391) that do not exist in `ItemData.ts`.
- `GameScene.ts` (line 284) also uses `def?.weight ?? 0` instead of `def?.mass ?? 0`.

### 4.4 `ObjectiveScene` Bypass & Missing `ColyseusService.selectObjective()`
- `LobbyScene.ts` (lines 169–176) skips `ObjectiveScene` and hardcodes `"artemis_lunar_relay"`.
- `GameRoom.ts` (line 44) hardcodes `state.selectedObjectiveId = "artemis_lunar_relay"` instead of `""`.
- `ObjectivePicker.ts` (line 277) calls `ColyseusService.selectObjective(obj.id)`, which is not implemented on `ColyseusService.ts` yet (needs `this.send("selectObjective", { objectiveId })`).

### 4.5 Other Technical Notes
- **Ship duplicate parts**: `GameState.shipItems` in `server/src/models/GameState.ts` uses `itemId` as the `MapSchema` key, so at most 1 copy of each item can be added, even though `game_data.json` specifies `max_per_ship: 2 | 3 | 4 | null` (e.g., multiple solar panels, fuel tanks, or engines). Switching the map key to an instance ID (e.g. `crypto.randomUUID()`) + enforcing `max_per_ship` will unlock full spacecraft design builds.
- **Gitignore & Secrets**: Neither `.gitignore` nor `server/.gitignore` ignores `.env` files! **Add `.env*` / `.env.local` to `.gitignore` before putting any AI API keys in `.env` files.**
- **Client dependencies**: `client/node_modules/` is not installed yet (`cd client && npm install` is required before running the client).

---

## 5. How to Enter (Integrate) Real AI Into This Project

### Golden Rule: Keep AI Calls on the Server, Never in the Client Bundle
Do **not** call Gemini / OpenAI / Anthropic directly from `client/src/` with `VITE_*` keys — Vite bundles those into browser JS where anyone can extract your API key.

Instead, put the AI logic inside `server/` (Node.js + Colyseus + Express), which already:
1. Runs safely on a backend server with `process.env`.
2. Holds the **authoritative multiplayer state** (`GameState.players`, `GameState.shipItems`, `GameState.selectedObjectiveId`).
3. Supports both **WebSockets** (via `GameRoom`) and **HTTP/SSE** (via Express in `server/src/app.config.ts`).

---

### Architecture Choice: Colyseus Room Messages vs. Express HTTP Endpoint

| Approach | How It Works | Best For |
|---|---|---|
| **Option A: Colyseus `GameRoom` WebSocket** *(Recommended)* | Client calls `ColyseusService.send("ai:ask", payload)`. `GameRoom` reads `this.state` directly, streams chunks back via `client.send("ai:chunk", ...)` or broadcasts team alerts via `this.broadcast("ai:broadcast", ...)`. | Co-op gameplay, zero CORS/auth friction, automatic awareness of all 4 players, roles, and live ship parts. |
| **Option B: Express SSE Endpoint (`POST /api/ai/chat`)** | `app.config.ts` registers an Express route using `text/event-stream`. Client calls `fetch()` with `ReadableStream`. | Standard HTTP streaming, easy `curl` testing, usable outside `GameRoom` (e.g. during mission selection). |

You can also combine both: put the core AI logic in a shared `server/src/services/AiDirectorService.ts` and invoke it from `GameRoom` (and/or an Express route).

---

### What Context Makes the AI Actually Accurate (No Hallucinations)

An LLM on its own does not know the 84 components or 12 physics rules of this game. Always compute deterministic math in code first, then pass structured context to the AI:

1. **Deterministic 12-Rule Audit (`LaunchSystem.runLaunchChecks`)**:
   - Run `runLaunchChecks(shipItems, activeObjective)` in TypeScript *before* calling the LLM.
   - Pass the exact 12 `CheckResult` rows (`pass`, `actual`, `required`, `note`) into the prompt so the AI **never** miscalculates thrust, fuel, power, or budget.
2. **Active Mission Constraints (`Objective`)**:
   - Destination, `sunlightPct`, `nightNeed`, `heatDanger`, `radiation`, `launchPull`, `distanceRating`, `signalNeed`, `navigationBrain`, `scienceGoal`, `starInstrument`, `budget`.
3. **Current Ship Manifest + Asking Player's Context**:
   - Which items are installed (`id`, `name`, `roleId`, counts vs. `max_per_ship`).
   - Asking player's `username`, `roles[]` (so the AI tells *them* which corner station they personally can access, and which teammate to coordinate with for locked stations!), and currently held item (`heldItemId`).
4. **The 84-Part Catalog (`game_data.json`)**:
   - Format the 84 components into a compact plain-text / JSON table (~2,500–3,000 tokens total — fits effortlessly inside any modern LLM context window and caches cheaply), **or** give the model function-calling tools:
     - `get_parts_for_role(roleId)`
     - `run_launch_audit(proposedItemIds[])` ("what-if" simulator before the player walks across the map!)
5. **Persona & Audience Rules**:
   - Target age **7–14** (simple, encouraging NASA Flight Director tone; explain *why* solar panels lose power at Europa's `10%` sunlight or Titan's `1%` sunlight).
   - Support **English and Arabic** seamlessly (matching the bilingual hints already in `MissionAiTerminal.ts`).

---

### Four Concrete Places to Plug AI Into This Codebase

#### Integration 1 (Primary): Real Streaming AI in `MissionAiTerminal.ts`
Replace the mocked keyword responders in `client/src/ui/MissionAiTerminal.ts` with real streamed responses:
- Maintain a `conversationHistory` array (`{ role: "user" | "assistant"; content: string }[]`) in `MissionAiTerminal` (or per room/player on the server).
- Rewire the 3 quick-action chips (`Evaluate`, `Power`, `Next Step`) to send rich structured intents (e.g., *"Run a full 12-rule diagnostic on our ship and tell me the top 2 fixes for my role"*).
- Replace the `20ms` fake-word loop in `_streamAiResponse()` with an incremental stream updater that renders incoming `"ai:chunk"` tokens using the existing `DOMPurify.sanitize(marked.parse(accumulated))` pipeline.
- **Note on `Tab` shortcut**: In `MissionAiTerminal.ts:751-759`, `window.addEventListener("keydown")` should be cleaned up in `destroy()` so re-entering `GameScene` doesn't attach duplicate listeners.

#### Integration 2: Smart "Control Droid" NPC (`NpcController.ts`)
Currently `NpcData.ts` gives `Control Droid` 4 static lines. You can enhance `NpcController`:
- Option 2A: Pressing `E` near the Control Droid opens `MissionAiTerminal` pre-prompted with a role-specific onboarding tip for that player.
- Option 2B: Add an optional "Ask Droid" prompt or dynamic hint generator that updates `NpcDefinition.dialogue` dynamically whenever `shipItems` changes.

#### Integration 3: AI Failure Coach in `LaunchResultUI.ts` & Victory Debrief in `MissionVictoryUI.ts`
- **`LaunchResultUI.ts`**: When `result.success === false`, add an **"Ask AI Flight Director How to Fix"** button that closes the audit modal, opens `MissionAiTerminal`, and automatically sends the failing `CheckResult[]` so the AI recommends exact part IDs (`PT23`, `SC08`, etc.) to pass all 12 rules.
- **`MissionVictoryUI.ts`**: Replace the static debrief string (`lines 148–156`) with a real server-generated debrief praising the specific parts the crew built, noting budget remaining, and sharing a real NASA engineering connection to the destination.

#### Integration 4 (Hackathon Bonus): Co-op Team Alerts & AI Mission Generator
- **Proactive Co-op Broadcasts**: In `GameRoom.ts` `"addItemToShip"`, if a player installs an item that breaks a rule (e.g., exceeds `budget`, exceeds `frameSpace`, or adds an `Ion Engine PT23` that needs `15 Power`), trigger a short server AI advisory broadcast to all 4 players (`this.broadcast("ai:alert", ...)`).
- **Dynamic Mission Generator**: Add an AI endpoint that generates new missions (`M07+`) conforming to `game_data.json`'s schema and verifies via `runLaunchChecks()` that at least one valid build exists under the generated `budget`.

---

## 6. Step-by-Step Implementation Blueprint (Code Guide)

### Step 0: Preparation & Fixes
1. **Update `.gitignore`** at the repository root (`Nasa-hackathon-project/.gitignore`):
   ```gitignore
   .env
   .env.*
   !.env.production
   ```
2. **Install dependencies**:
   ```powershell
   cd client && npm install
   cd ../server && npm install @google/genai dotenv   # or openai / @anthropic-ai/sdk
   ```
   *(If you prefer a free/local model with zero external API keys, `fetch("http://localhost:11434/api/chat", ...)` works out of the box with Ollama in Node 18+ with no extra SDK.)*
3. **Reconcile `ObjectiveData.ts` & `.mass`**:
   - Restore the `M01`–`M06` missions from `game_data.json` (or merge `target`/`maxWeight` if needed) so `LaunchSystem.ts` has all required numeric fields.
   - Replace `itemDef.weight` with `itemDef.mass` in `GameScene.ts:284` and `MissionAiTerminal.ts:131,312`.
   - Ensure `server/` can read `game_data.json` directly (e.g. `import gameData from "../../../game_data.json"`) so the server is the single source of truth for both parts and 12-rule checks.

---

### Step 1: Add Your API Key Safely on the Server

Create `server/.env.local` (gitignored):
```env
GEMINI_API_KEY=your_api_key_here
AI_MODEL=gemini-2.5-flash
```

Load env vars at the top of `server/src/index.ts`:
```ts
import "dotenv/config"; // or dotenv.config({ path: ".env.local" })
import { listen } from "@colyseus/tools";
import appConfig from "./app.config";

listen(appConfig);
```

---

### Step 2: Create `server/src/services/AiDirectorService.ts`

Keep all prompt construction, deterministic rule verification, and LLM streaming in one dedicated service:

```ts
// Example structure (works with Gemini @google/genai, OpenAI, or Ollama)
import { GoogleGenAI } from "@google/genai";
import gameData from "../../../game_data.json" assert { type: "json" };

export interface AiRequestContext {
  prompt: string;
  username: string;
  playerRoles: string[];
  objectiveId: string;
  heldItemId?: string | null;
  shipItemIds: string[];
  history?: Array<{ role: "user" | "model"; text: string }>;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function buildSystemPrompt(ctx: AiRequestContext, auditSummary: string): string {
  const mission = gameData.missions.find((m) => m.id === ctx.objectiveId) ?? gameData.missions[0];
  const catalogSummary = gameData.components
    .map((c: any) => `${c.id}|${c.name}|dept=${c.department}|cat=${c.category}|mass=${c.mass}|size=${c.size}|cost=${c.cost}|good=${c.good}`)
    .join("\n");

  return `
You are MCC-HOUSTON, an encouraging NASA Flight Director guiding young engineers (ages 7-14) in a cooperative spacecraft design game.
Respond concisely in Markdown. Match the user's language (English or Arabic).
Never invent part IDs or stats — only recommend components from the CATALOG below.

ACTIVE PLAYER:
- Callsign: ${ctx.username}
- Owned Stations/Roles: ${ctx.playerRoles.join(", ")} (they can ONLY pick up parts from these stations; tell them which teammate to ask for other departments!)
- Currently Carrying: ${ctx.heldItemId ?? "nothing"}

ACTIVE MISSION (${mission.id} - ${mission.name}):
${JSON.stringify(mission)}

CURRENT SHIP PARTS INSTALLED:
${ctx.shipItemIds.length ? ctx.shipItemIds.join(", ") : "NONE (empty ship)"}

DETERMINISTIC 12-RULE AUDIT (ALREADY COMPUTED — TRUST THESE NUMBERS):
${auditSummary}

AVAILABLE 84-PART CATALOG:
${catalogSummary}
`.trim();
}

export async function streamFlightDirectorReply(
  ctx: AiRequestContext,
  auditSummary: string,
  onChunk: (textDelta: string) => void,
): Promise<void> {
  const systemInstruction = buildSystemPrompt(ctx, auditSummary);

  const responseStream = await ai.models.generateContentStream({
    model: process.env.AI_MODEL || "gemini-2.5-flash",
    config: { systemInstruction, temperature: 0.4 },
    contents: [
      ...(ctx.history ?? []).map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
      { role: "user", parts: [{ text: ctx.prompt }] },
    ],
  });

  for await (const chunk of responseStream) {
    if (chunk.text) onChunk(chunk.text);
  }
}
```

> **Tip:** Extract `LaunchSystem.ts` into a shared folder (or copy its pure functions into `server/src/services/LaunchAudit.ts`) so the server runs the exact same 12-rule checks to build `auditSummary` directly from `this.state.shipItems`!

---

### Step 3: Wire Colyseus `GameRoom.ts` to Stream AI Responses

In `server/src/rooms/GameRoom.ts`, inside `onCreate()`:

```ts
this.onMessage("ai:ask", async (client, payload: {
  requestId: string;
  prompt: string;
  heldItemId?: string | null;
  history?: Array<{ role: "user" | "model"; text: string }>;
}) => {
  const player = this.state.players.get(client.sessionId);
  if (!player) return;

  const shipItemIds = Array.from(this.state.shipItems.values()).map((s) => s.itemId);
  const playerRoles = Array.from(player.roles);
  const auditSummary = computeServerLaunchAuditText(shipItemIds, this.state.selectedObjectiveId);

  try {
    await streamFlightDirectorReply(
      {
        prompt: String(payload.prompt ?? "").slice(0, 1000),
        username: player.username,
        playerRoles,
        objectiveId: this.state.selectedObjectiveId,
        heldItemId: payload.heldItemId ?? null,
        shipItemIds,
        history: payload.history?.slice(-8), // keep last 8 turns to bound tokens
      },
      auditSummary,
      (delta) => {
        client.send("ai:chunk", { requestId: payload.requestId, delta });
      },
    );
    client.send("ai:done", { requestId: payload.requestId });
  } catch (err) {
    console.error("[GameRoom ai:ask error]", err);
    client.send("ai:error", {
      requestId: payload.requestId,
      message: "Telemetry link interrupted. Unable to reach Mission Control AI.",
    });
  }
});
```

*(Note: If testing `GameScene` in offline/solo mode without joining a `GameRoom`, also consider exposing an HTTP fallback `POST /api/ai/chat` in `server/src/app.config.ts` with CORS enabled.)*

---

### Step 4: Expose Messaging in `ColyseusService.ts` & Connect `MissionAiTerminal.ts`

1. In `client/src/network/ColyseusService.ts`:
   ```ts
   sendAiPrompt(payload: {
     requestId: string;
     prompt: string;
     heldItemId?: string | null;
     history?: Array<{ role: "user" | "model"; text: string }>;
   }): void {
     this.send("ai:ask", payload);
   }
   ```
   *(And add `selectObjective(objectiveId: string)` while in this file so `ObjectivePicker.ts` works too.)*

2. In `client/src/ui/MissionAiTerminal.ts`:
   - Pass `getHeldItemId?: () => string | null` from `GameScene` (`() => this.carry.heldItem?.id ?? null`).
   - Subscribe to `ColyseusService.on("ai:chunk", ...)`, `ColyseusService.on("ai:done", ...)`, and `ColyseusService.on("ai:error", ...)` in `mount()`, and clean up the unsubscribe callbacks in `destroy()`.
   - When the user clicks a chip or hits `Enter`:
     1. Append the user message bubble immediately.
     2. Create a single streaming assistant bubble with the blinking `.ai-cursor`.
     3. Send `ColyseusService.sendAiPrompt({ requestId, prompt, heldItemId, history })`.
     4. On each `ai:chunk` matching `requestId`, append `delta` to `accumulated` and update `contentEl.innerHTML = DOMPurify.sanitize(marked.parse(accumulated) as string)`.
     5. On `ai:done`, remove `.ai-cursor`, push `{ role: "user", text: prompt }` and `{ role: "model", text: accumulated }` into `this._history`, and unlock input.

---

## 7. Quick Verification Checklist After Adding AI

1. **Dependencies**: Run `npm install` in both `client/` and `server/`.
2. **Security**: Confirm `git status` does **not** track `.env.local` or any file containing API keys.
3. **Offline/Error Resilience**: Stop the server or revoke the key temporarily to verify `ai:error` gracefully unlocks `MissionAiTerminal` instead of freezing `_isTyping = true`.
4. **Input Lock**: Confirm pressing `W`, `A`, `S`, `D`, or `E` while typing inside `MissionAiTerminal` does not move the player or open adjacent station menus (`PlayerController.setInputEnabled(false)`).
5. **Deterministic Accuracy**: Ask the AI *"Can we launch right now?"* on an empty ship and on a valid ship — verify its answer matches `LaunchSystem.runLaunchChecks()` 100%.
6. **Multi-language & Role Awareness**: Test asking in English and Arabic, and verify the AI directs players only to stations in their `playerRoles[]` while suggesting teammate collaboration for other stations.

