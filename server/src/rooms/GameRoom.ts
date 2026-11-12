import crypto from "crypto";
import { Room, Client } from "colyseus";
import type { RoomOptions } from "@colyseus/core";
import {
  GameState,
  GamePlayerSchema,
  ShipItemSchema,
} from "../models/GameState";
import { GameCatalog } from "../services/flight-director/data/GameCatalog";
import { aiDirectorService } from "../services/flight-director/AiDirectorService";

type GameRoomOptions = RoomOptions & { state: GameState };

/**
 * GameRoom
 * ────────
 * Handles the in-game session: mission selection, multiplayer position sync,
 * server-authoritative spacecraft manifest, and private streaming AI Flight Director requests.
 */
export class GameRoom extends Room<GameRoomOptions> {
  maxClients = 4;
  private hostClaimed = false;
  private expectHostFromLobby = false;

  onCreate(options: Record<string, unknown>) {
    console.log(`[GameRoom] Created: ${this.roomId}`);

    const state = new GameState();
    const presetHostId = String(options?.hostId ?? "").trim();
    state.hostId = presetHostId;
    this.expectHostFromLobby = presetHostId.length > 0;
    this.hostClaimed = false;

    const initialMission = typeof options?.selectedObjectiveId === "string"
      ? options.selectedObjectiveId.trim()
      : "";
    if (initialMission) {
      const m = GameCatalog.getMissionById(initialMission);
      if (m) {
        state.selectedObjectiveId = m.id;
        state.highestUnlockedLevel = Math.max(state.highestUnlockedLevel, m.level);
      }
    }
    if (typeof options?.highestUnlockedLevel === "number") {
      state.highestUnlockedLevel = options.highestUnlockedLevel;
    }

    this.setState(state);

    // ── selectObjective (host only, validated against M01..M06) ──────────
    this.onMessage(
      "selectObjective",
      (client: Client, payload: { objectiveId?: string }) => {
        if (client.sessionId !== this.state.hostId) {
          client.send("objectiveError", {
            message: "Only the host can select the mission objective.",
          });
          return;
        }

        const objectiveId = String(payload?.objectiveId ?? "").trim();
        const mission = GameCatalog.getMissionById(objectiveId);
        if (!mission) {
          client.send("objectiveError", {
            message: `Unknown mission id "${objectiveId}". Expected M01–M06.`,
          });
          return;
        }

        if (mission.level > this.state.highestUnlockedLevel) {
          client.send("objectiveError", {
            message: `Level ${mission.level} (${mission.name}) is locked. Complete Level ${this.state.highestUnlockedLevel} first!`,
          });
          return;
        }

        console.log(
          `[GameRoom] ${this.roomId} — objective selected: "${objectiveId}" (${mission.name}, Level ${mission.level}) by host ${client.sessionId}`,
        );

        this.state.selectedObjectiveId = mission.id;
      },
    );

    // ── nextMission (host advances mission after launch/victory) ──────────
    this.onMessage(
      "nextMission",
      (client: Client, payload: { objectiveId?: string; resetShip?: boolean }) => {
        if (client.sessionId !== this.state.hostId) {
          client.send("objectiveError", {
            message: "Only the host can deploy the next mission.",
          });
          return;
        }

        const objectiveId = String(payload?.objectiveId ?? "").trim();
        const mission = GameCatalog.getMissionById(objectiveId);
        if (!mission) {
          client.send("objectiveError", {
            message: `Unknown next mission id "${objectiveId}".`,
          });
          return;
        }

        // Unlock the level if advancing
        if (mission.level > this.state.highestUnlockedLevel) {
          this.state.highestUnlockedLevel = mission.level;
        }

        // Clean assembly bay when deploying next mission level (default true)
        const shouldReset = payload?.resetShip !== false;
        if (shouldReset) {
          this.state.shipItems.clear();
        }
        this.state.selectedObjectiveId = mission.id;

        console.log(
          `[GameRoom] ${this.roomId} — advanced to Level ${mission.level} ("${mission.id}" - ${mission.name}) by host ${client.sessionId}. Highest unlocked: ${this.state.highestUnlockedLevel}`,
        );
      },
    );

    // ── move ─────────────────────────────────────────────────────────────
    this.onMessage(
      "move",
      (client: Client, payload: { x?: number; y?: number }) => {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        const x = Number(payload?.x);
        const y = Number(payload?.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;

        player.x = Math.max(0, Math.min(x, 10_000));
        player.y = Math.max(0, Math.min(y, 10_000));
      },
    );

    // ── addItemToShip (server-validated catalog, role auth, maxPerShip) ───
    this.onMessage(
      "addItemToShip",
      (client: Client, payload: { itemId?: string; roleId?: string }) => {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        const itemId = String(payload?.itemId ?? "").trim();
        const component = GameCatalog.getComponentById(itemId);
        if (!component) {
          client.send("shipError", {
            message: `Unknown spacecraft component "${itemId}".`,
          });
          return;
        }

        const playerRoles = Array.from(player.roles);
        if (!playerRoles.includes(component.roleId)) {
          client.send("shipError", {
            message: `Role authorization required: "${component.name}" belongs to ${component.roleId}.`,
          });
          return;
        }

        if (payload?.roleId && String(payload.roleId).trim() !== component.roleId) {
          client.send("shipError", {
            message: `Department mismatch for "${component.name}".`,
          });
          return;
        }

        // Enforce per-component maxPerShip limit
        if (component.maxPerShip !== null) {
          let existingCount = 0;
          this.state.shipItems.forEach((installed) => {
            if (installed.itemId === component.id) {
              existingCount += 1;
            }
          });
          if (existingCount >= component.maxPerShip) {
            client.send("shipError", {
              message: `Limit reached: max ${component.maxPerShip} × ${component.name} (${component.id}) per spacecraft.`,
            });
            return;
          }
        }

        const instanceId = `${component.id}_${crypto.randomUUID().slice(0, 8)}`;
        const entry = new ShipItemSchema();
        entry.instanceId = instanceId;
        entry.itemId = component.id;
        entry.roleId = component.roleId;
        entry.addedBy = client.sessionId;
        this.state.shipItems.set(instanceId, entry);

        console.log(
          `[GameRoom] ${this.roomId} — ship +item "${component.id}" (${instanceId}) by ${client.sessionId}`,
        );
      },
    );

    // ── removeItemFromShip (by instanceId or fallback itemId, role-checked) ──
    this.onMessage(
      "removeItemFromShip",
      (client: Client, payload: { instanceId?: string; itemId?: string }) => {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        const instanceId = String(payload?.instanceId ?? "").trim();
        const itemId = String(payload?.itemId ?? "").trim();

        let targetKey: string | null = null;
        let targetEntry: ShipItemSchema | undefined;

        if (instanceId && this.state.shipItems.has(instanceId)) {
          targetKey = instanceId;
          targetEntry = this.state.shipItems.get(instanceId);
        } else if (itemId) {
          // Backwards-compatible fallback: remove first matching instance of itemId
          this.state.shipItems.forEach((entry, key) => {
            if (!targetKey && entry.itemId === itemId) {
              targetKey = key;
              targetEntry = entry;
            }
          });
        }

        if (!targetKey || !targetEntry) {
          client.send("shipError", {
            message: "Component instance is no longer on the spacecraft.",
          });
          return;
        }

        const playerRoles = Array.from(player.roles);
        if (!playerRoles.includes(targetEntry.roleId)) {
          client.send("shipError", {
            message: `Role authorization required to remove ${targetEntry.roleId} components.`,
          });
          return;
        }

        this.state.shipItems.delete(targetKey);
        console.log(
          `[GameRoom] ${this.roomId} — ship -item "${targetEntry.itemId}" (${targetKey}) by ${client.sessionId}`,
        );
      },
    );

    // ── ai:ask (private streaming AI Flight Director response) ─────────────
    this.onMessage(
      "ai:ask",
      (
        client: Client,
        payload: {
          requestId?: string;
          message?: string;
          localHeldItemId?: string | null;
          languageHint?: "en" | "ar";
        },
      ) => {
        const reqId =
          typeof payload?.requestId === "string" && payload.requestId.trim()
            ? payload.requestId.trim().slice(0, 64)
            : `ai_${crypto.randomUUID().slice(0, 8)}`;

        const languageHint =
          payload?.languageHint === "en" || payload?.languageHint === "ar"
            ? payload.languageHint
            : undefined;

        void aiDirectorService.processRequest(
          this.state,
          {
            requestId: reqId,
            gameRoomId: this.roomId,
            sessionId: client.sessionId,
            message: payload?.message,
            localHeldItemId:
              typeof payload?.localHeldItemId === "string"
                ? payload.localHeldItemId
                : null,
            languageHint,
          },
          {
            onStatus: (ev) => {
              if (this.state.players.has(client.sessionId)) {
                client.send("ai:status", ev);
              }
            },
            onChunk: (ev) => {
              if (this.state.players.has(client.sessionId)) {
                client.send("ai:chunk", ev);
              }
            },
            onDone: (ev) => {
              if (this.state.players.has(client.sessionId)) {
                client.send("ai:done", ev);
              }
            },
            onError: (ev) => {
              if (this.state.players.has(client.sessionId)) {
                client.send("ai:error", ev);
              }
            },
          },
        );
      },
    );

    // ── ai:cancel (cancel requesting player's active AI query) ────────────
    this.onMessage(
      "ai:cancel",
      (client: Client, payload?: { requestId?: string }) => {
        const reqId =
          typeof payload?.requestId === "string" && payload.requestId.trim()
            ? payload.requestId.trim().slice(0, 64)
            : undefined;
        aiDirectorService.cancelRequest(client.sessionId, reqId);
      },
    );
  }

  onJoin(client: Client, options: Record<string, unknown>) {
    const player = new GamePlayerSchema();
    player.id = client.sessionId;
    player.username = String(options?.username ?? "Player")
      .trim()
      .slice(0, 24) || "Player";

    if (Array.isArray(options?.roles)) {
      const seen = new Set<string>();
      for (const rawRole of options.roles) {
        const role = String(rawRole ?? "").trim();
        if (GameCatalog.isValidRoleId(role) && !seen.has(role)) {
          seen.add(role);
          player.roles.push(role);
        }
      }
    }

    const x = Number(options?.x ?? 0);
    const y = Number(options?.y ?? 0);
    player.x = Number.isFinite(x) ? x : 0;
    player.y = Number.isFinite(y) ? y : 0;

    this.state.players.set(client.sessionId, player);

    if (options && options.isHost === true && !this.hostClaimed) {
      this.state.hostId = client.sessionId;
      this.hostClaimed = true;
    } else if (
      !this.expectHostFromLobby &&
      !this.hostClaimed &&
      (!this.state.hostId || !this.state.players.has(this.state.hostId)) &&
      this.state.players.size === 1
    ) {
      this.state.hostId = client.sessionId;
      this.hostClaimed = true;
    }
  }

  onLeave(client: Client, _code?: number) {
    console.log(`[GameRoom] ${this.roomId} — left: ${client.sessionId}`);
    aiDirectorService.clearSession(this.roomId, client.sessionId);
    this.state.players.delete(client.sessionId);

    if (client.sessionId === this.state.hostId && this.state.players.size > 0) {
      this.state.hostId = [...this.state.players.keys()][0];
      this.hostClaimed = true;
      console.log(`[GameRoom] ${this.roomId} — new host: ${this.state.hostId}`);
    }
  }

  onDispose() {
    aiDirectorService.clearRoom(this.roomId);
    console.log(`[GameRoom] ${this.roomId} disposed.`);
  }
}
