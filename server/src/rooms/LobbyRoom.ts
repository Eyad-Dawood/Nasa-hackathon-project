import { Room, Client, matchMaker } from "colyseus";
import type { RoomOptions } from "@colyseus/core";
import { LobbyState } from "../models/LobbyState";
import { PlayerSchema } from "../models/PlayerSchema";

/** All valid role identifiers – single source of truth on the server. */
const ALL_ROLES = ["role1", "role2", "role3", "role4"] as const;
type Role = (typeof ALL_ROLES)[number];

/** Maximum players allowed in one lobby. */
const MAX_CLIENTS = 4;

type LobbyRoomOptions = RoomOptions & { state: LobbyState };

export class LobbyRoom extends Room<LobbyRoomOptions> {
  maxClients = MAX_CLIENTS;

  onCreate(_options: Record<string, unknown>) {
    console.log(`[LobbyRoom] Created: ${this.roomId}`);
    this.setState(new LobbyState());

    // ------------------------------------------------------------------ //
    // Message handlers                                                     //
    // ------------------------------------------------------------------ //

    /**
     * setUsername – called immediately after joining.
     * Payload: { username: string }
     */
    this.onMessage("setUsername", (client: Client, payload: { username: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const username = String(payload.username ?? "").trim().slice(0, 24);
      if (!username) return;

      player.username = username;
    });

    /**
     * setRole – player requests to claim or release a role.
     * Payload: { role: string; claim: boolean }
     *   claim=true  → add role to this player
     *   claim=false → remove role from this player
     */
    this.onMessage(
      "setRole",
      (client: Client, payload: { role: string; claim: boolean }) => {
        const { role, claim } = payload;

        // Validate role string
        if (!ALL_ROLES.includes(role as Role)) {
          client.send("roleError", { message: `Unknown role: ${role}` });
          return;
        }

        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        if (claim) {
          // Ensure no other player already holds this role
          const alreadyTaken = [...this.state.players.values()].some(
            (p) => p !== player && p.roles.includes(role)
          );
          if (alreadyTaken) {
            client.send("roleError", {
              message: `Role ${role} is already taken.`,
            });
            return;
          }
          if (!player.roles.includes(role)) {
            player.roles.push(role);
          }
        } else {
          // Release role
          const idx = player.roles.indexOf(role);
          if (idx !== -1) {
            player.roles.splice(idx, 1);
          }
        }
      }
    );

    /**
     * startGame – only the host may send this.
     * Validates that all 4 roles are covered before proceeding.
     */
    this.onMessage("startGame", async (client: Client) => {
      if (client.sessionId !== this.state.hostId) {
        client.send("startError", { message: "Only the host can start the game." });
        return;
      }

      const error = this.validateRoleDistribution();
      if (error) {
        client.send("startError", { message: error });
        return;
      }

      try {
        // Create a GameRoom for this session and broadcast its ID.
        // Clients will leave the LobbyRoom and join the GameRoom.
        const gameRoomCache = await matchMaker.createRoom("game", {});
        this.state.gameStarted = true;
        this.broadcast("game-started", { gameRoomId: gameRoomCache.roomId });
      } catch (e) {
        console.error("[LobbyRoom] Failed to create GameRoom:", e);
        client.send("startError", { message: "Failed to start game. Please try again." });
      }
    });
  }

  onJoin(client: Client, options: { username?: string }) {
    console.log(`[LobbyRoom] ${this.roomId} — joined: ${client.sessionId} as "${options?.username}"`);
    const player = new PlayerSchema();
    player.id = client.sessionId;
    player.username = String(options?.username ?? "Player").trim().slice(0, 24);

    // First player becomes the host
    if (this.state.players.size === 0) {
      this.state.hostId = client.sessionId;
    }

    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client, _code?: number) {
    this.state.players.delete(client.sessionId);

    // If host left, promote the next player
    if (
      client.sessionId === this.state.hostId &&
      this.state.players.size > 0
    ) {
      this.state.hostId = [...this.state.players.keys()][0];
    }
  }

  onDispose() {
    console.log(`LobbyRoom ${this.roomId} disposed.`);
  }

  // -------------------------------------------------------------------- //
  // Private helpers                                                        //
  // -------------------------------------------------------------------- //

  /**
   * Returns an error string if the role distribution is invalid,
   * or null if everything is correct.
   *
   * Rules:
   *  - Every role in ALL_ROLES must be assigned to exactly one player.
   *  - Every player must have at least one role.
   *  - No role can appear in more than one player's list.
   */
  private validateRoleDistribution(): string | null {
    const players = [...this.state.players.values()];

    // Every player must have at least one role
    for (const p of players) {
      if (p.roles.length === 0) {
        return `Player "${p.username}" has no roles assigned.`;
      }
    }

    // Collect all assigned roles across all players
    const allAssigned: string[] = players.flatMap((p) => [...p.roles]);

    // Check for duplicates
    const seen = new Set<string>();
    for (const r of allAssigned) {
      if (seen.has(r)) return `Role "${r}" is assigned to more than one player.`;
      seen.add(r);
    }

    // All 4 roles must be covered
    for (const role of ALL_ROLES) {
      if (!seen.has(role)) {
        return `Role "${role}" has not been assigned to anyone.`;
      }
    }

    return null; // All good
  }
}
