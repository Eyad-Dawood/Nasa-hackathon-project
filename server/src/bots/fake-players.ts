/**
 * fake-players.ts
 * ────────────────
 * Temporary bot script for filming a demo video.
 * Spawns 3 fake players that:
 *   1. Watch for a lobby to appear, then join it after ~1s
 *   2. Each pick a unique role
 *   3. When the game starts, walk back and forth between their station and the rocket
 *
 * Usage:
 *   npx tsx server/src/bots/fake-players.ts
 *
 * DELETE THIS FILE AFTER FILMING.
 */

import { Client, Room } from "@colyseus/sdk";

// ── Config ──────────────────────────────────────────────────────────────────
const SERVER_URL = "ws://localhost:2567";
const TILE_PX = 32; // 16px * 2 scale

/** Bot definitions: name, role they will claim, station tile coords (level 1 defaults) */
const BOTS = [
  {
    username: "Astronaut_Zara",
    role: "structureAndComputing",
    stationTile: { col: 17, row: 2 },
  },
  {
    username: "Astronaut_Marcus",
    role: "Communications",
    stationTile: { col: 2, row: 12 },
  },
  {
    username: "Astronaut_Yuki",
    role: "Science",
    stationTile: { col: 17, row: 12 },
  },
];

/** Ship center tile (level 1) */
const SHIP_TILE = { col: 10, row: 7 };

/** Convert tile coords to world pixels */
function tileToWorld(tile: { col: number; row: number }) {
  return {
    x: tile.col * TILE_PX + TILE_PX / 2,
    y: tile.row * TILE_PX + TILE_PX / 2,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Polls GET /rooms until a lobby with at least 1 client appears, returns its roomId */
async function waitForLobby(): Promise<string> {
  const httpUrl = SERVER_URL.replace("ws://", "http://").replace("wss://", "https://");
  console.log("[Bots] Watching for a lobby to appear...");

  while (true) {
    try {
      const res = await fetch(`${httpUrl}/rooms`);
      if (res.ok) {
        const rooms: Array<{
          roomId: string;
          clients: number;
          maxClients: number;
          locked?: boolean;
        }> = await res.json();

        const openLobby = rooms.find(
          (r) => !r.locked && r.clients > 0 && r.clients < r.maxClients,
        );

        if (openLobby) {
          console.log(
            `[Bots] Found lobby ${openLobby.roomId} (${openLobby.clients}/${openLobby.maxClients} players)`,
          );
          return openLobby.roomId;
        }
      }
    } catch {
      // Server not up yet — keep retrying
    }
    await sleep(1500);
  }
}

// ── Bot Player Class ────────────────────────────────────────────────────────

class BotPlayer {
  private client: Client;
  private lobbyRoom: Room<any> | null = null;
  private gameRoom: Room<any> | null = null;
  private moveInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private name: string,
    private role: string,
    private stationTile: { col: number; row: number },
  ) {
    this.client = new Client(SERVER_URL);
  }

  /** Join the lobby, then poll every 2s to claim role once the host releases it */
  async joinLobby(lobbyRoomId: string): Promise<void> {
    console.log(`[${this.name}] Joining lobby ${lobbyRoomId}...`);
    this.lobbyRoom = await this.client.joinById(lobbyRoomId, {
      username: this.name,
    });

    let roleClaimed = false;
    let roleCheckInterval: ReturnType<typeof setInterval> | null = null;

    // Listen for game-started
    this.lobbyRoom.onMessage("game-started", (data: { gameRoomId: string; hostId: string }) => {
      if (roleCheckInterval) clearInterval(roleCheckInterval);
      console.log(`[${this.name}] Game started! Joining game room ${data.gameRoomId}...`);
      this._joinGameRoom(data.gameRoomId);
    });

    // Poll the lobby state every 2s — only claim our role when no other player holds it
    const tryClaimRole = () => {
      if (roleClaimed || !this.lobbyRoom) return;

      const state = this.lobbyRoom.state;
      if (!state || !state.players) return;

      // Check if another player already has our desired role
      const mySessionId = this.lobbyRoom.sessionId;
      let roleIsTaken = false;

      state.players.forEach((player: any, sessionId: string) => {
        if (sessionId === mySessionId) return; // skip self
        const roles: string[] = player.roles
          ? (typeof player.roles.toArray === "function"
              ? player.roles.toArray()
              : Array.from(player.roles as Iterable<string>))
          : [];
        if (roles.includes(this.role)) {
          roleIsTaken = true;
        }
      });

      if (!roleIsTaken) {
        console.log(`[${this.name}] Role "${this.role}" is free — claiming it!`);
        this.lobbyRoom!.send("setRole", { role: this.role, claim: true });
        roleClaimed = true;
        if (roleCheckInterval) clearInterval(roleCheckInterval);
      }
    };

    // Check immediately after a short delay, then every 2s
    await sleep(800);
    tryClaimRole();
    if (!roleClaimed) {
      console.log(`[${this.name}] Role "${this.role}" is taken — waiting for host to release it...`);
      roleCheckInterval = setInterval(tryClaimRole, 2000);
    }
  }

  /** Join the game room and start walking */
  private async _joinGameRoom(gameRoomId: string): Promise<void> {
    const stationWorld = tileToWorld(this.stationTile);

    try {
      this.gameRoom = await this.client.joinById(gameRoomId, {
        username: this.name,
        roles: [this.role],
        x: stationWorld.x,
        y: stationWorld.y,
      });

      console.log(`[${this.name}] Joined game room! Starting patrol...`);

      // Wait for objective to be selected, then start walking
      await sleep(2000);
      this._startPatrol();
    } catch (e) {
      console.error(`[${this.name}] Failed to join game room:`, e);
    }
  }

  /** Walk back and forth between station and rocket */
  private _startPatrol(): void {
    if (!this.gameRoom) return;

    const stationPos = tileToWorld(this.stationTile);
    const shipPos = tileToWorld(SHIP_TILE);

    // Movement state
    let currentX = stationPos.x;
    let currentY = stationPos.y;
    let targetX = shipPos.x;
    let targetY = shipPos.y;
    let goingToShip = true;
    const speed = 1.5; // pixels per tick (50ms interval = ~30px/s, slower for natural look)

    // Add slight randomness to each bot's speed
    const actualSpeed = speed + (Math.random() * 0.5 - 0.25);

    // Start sending position at 20Hz (every 50ms) like real players
    this.moveInterval = setInterval(() => {
      if (!this.gameRoom) {
        if (this.moveInterval) clearInterval(this.moveInterval);
        return;
      }

      // Move towards target
      const dx = targetX - currentX;
      const dy = targetY - currentY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 5) {
        // Reached target — wait a moment then swap destination
        currentX = targetX;
        currentY = targetY;

        // Pause at the destination for 1.5-3s
        if (this.moveInterval) clearInterval(this.moveInterval);

        const pauseTime = 1500 + Math.random() * 1500;
        setTimeout(() => {
          if (!this.gameRoom) return;

          if (goingToShip) {
            // Now go back to station
            targetX = stationPos.x;
            targetY = stationPos.y;
          } else {
            // Go to ship
            targetX = shipPos.x;
            targetY = shipPos.y;
          }
          goingToShip = !goingToShip;

          // Resume movement
          this._startPatrolLoop(currentX, currentY, targetX, targetY, actualSpeed, stationPos, shipPos);
        }, pauseTime);

        return;
      }

      // Move step towards target
      const nx = dx / dist;
      const ny = dy / dist;
      currentX += nx * actualSpeed;
      currentY += ny * actualSpeed;

      this.gameRoom.send("move", { x: currentX, y: currentY });
    }, 50);
  }

  /** Continues patrol loop after a pause */
  private _startPatrolLoop(
    startX: number, startY: number,
    targetX: number, targetY: number,
    speed: number,
    stationPos: { x: number; y: number },
    shipPos: { x: number; y: number },
  ): void {
    let currentX = startX;
    let currentY = startY;
    let tX = targetX;
    let tY = targetY;
    let goingToShip = (tX === shipPos.x && tY === shipPos.y);

    this.moveInterval = setInterval(() => {
      if (!this.gameRoom) {
        if (this.moveInterval) clearInterval(this.moveInterval);
        return;
      }

      const dx = tX - currentX;
      const dy = tY - currentY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 5) {
        currentX = tX;
        currentY = tY;

        if (this.moveInterval) clearInterval(this.moveInterval);

        const pauseTime = 1500 + Math.random() * 1500;
        setTimeout(() => {
          if (!this.gameRoom) return;

          if (goingToShip) {
            tX = stationPos.x;
            tY = stationPos.y;
          } else {
            tX = shipPos.x;
            tY = shipPos.y;
          }
          goingToShip = !goingToShip;

          this._startPatrolLoop(currentX, currentY, tX, tY, speed, stationPos, shipPos);
        }, pauseTime);

        return;
      }

      const nx = dx / dist;
      const ny = dy / dist;
      currentX += nx * speed;
      currentY += ny * speed;

      this.gameRoom.send("move", { x: currentX, y: currentY });
    }, 50);
  }

  /** Cleanup */
  dispose(): void {
    if (this.moveInterval) clearInterval(this.moveInterval);
    this.lobbyRoom?.leave();
    this.gameRoom?.leave();
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔════════════════════════════════════════════════╗");
  console.log("║  🤖 SPACE BENDERS — FAKE PLAYERS FOR FILMING  ║");
  console.log("║  3 bots will join your lobby automatically     ║");
  console.log("║  Press Ctrl+C to stop                          ║");
  console.log("╚════════════════════════════════════════════════╝");
  console.log();

  // Wait for a lobby to appear
  const lobbyRoomId = await waitForLobby();

  // Stagger bot joins so it looks natural on camera
  const bots: BotPlayer[] = [];

  for (let i = 0; i < BOTS.length; i++) {
    const botDef = BOTS[i];
    const bot = new BotPlayer(botDef.username, botDef.role, botDef.stationTile);
    bots.push(bot);

    // Wait 1-2 seconds between each join for a natural feel
    await sleep(1000 + Math.random() * 1000);
    await bot.joinLobby(lobbyRoomId);
  }

  console.log();
  console.log("[Bots] ✅ All 3 bots joined and picked roles!");
  console.log("[Bots] 💡 You (host) should have powerAndThermal role.");
  console.log("[Bots] 💡 Start the game whenever you're ready!");
  console.log();

  // Keep process alive
  process.on("SIGINT", () => {
    console.log("\n[Bots] Shutting down...");
    bots.forEach((b) => b.dispose());
    process.exit(0);
  });
}

main().catch((e) => {
  console.error("[Bots] Fatal error:", e);
  process.exit(1);
});
