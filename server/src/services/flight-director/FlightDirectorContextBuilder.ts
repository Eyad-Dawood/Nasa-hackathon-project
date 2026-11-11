import type { GameState } from "../../models/GameState";
import {
  ALL_ROLE_IDS,
  GameCatalog,
  ROLE_LABELS,
  RoleId,
  STATIONS_META,
} from "./data/GameCatalog";
import { runDeterministicAudit } from "./data/DeterministicAudit";
import type {
  CrewMemberSummary,
  DynamicGameContext,
  ShipManifestItem,
} from "./types/ContextTypes";

function sanitizeDisplayLabel(raw: unknown, fallback: string): string {
  const cleaned = String(raw ?? "")
    .replace(/[\r\n\t\x00-\x1f\x7f]/g, " ")
    .replace(/[<>`]/g, "")
    .trim()
    .slice(0, 32);
  return cleaned || fallback;
}

export class FlightDirectorContextBuilder {
  buildFromGameState(params: {
    state: GameState;
    gameRoomId: string;
    requestingSessionId: string;
    localHeldItemId?: string | null;
  }): DynamicGameContext {
    const { state, gameRoomId, requestingSessionId, localHeldItemId } = params;

    const mission = state.selectedObjectiveId
      ? (GameCatalog.getMissionById(state.selectedObjectiveId) ?? null)
      : null;

    const crew: CrewMemberSummary[] = [];
    const coveredRoles = new Set<RoleId>();

    state.players.forEach((player, sessionId) => {
      const roles: RoleId[] = [];
      for (const r of Array.from(player.roles)) {
        if (GameCatalog.isValidRoleId(r)) {
          roles.push(r);
          coveredRoles.add(r);
        }
      }

      crew.push({
        sessionId,
        username: sanitizeDisplayLabel(player.username, "Engineer"),
        roles,
        isHost: sessionId === state.hostId,
        isRequestingPlayer: sessionId === requestingSessionId,
      });
    });

    const requestingPlayer: CrewMemberSummary = crew.find(
      (c) => c.sessionId === requestingSessionId,
    ) ?? {
      sessionId: requestingSessionId,
      username: "Engineer",
      roles: [],
      isHost: requestingSessionId === state.hostId,
      isRequestingPlayer: true,
    };

    const shipManifest: ShipManifestItem[] = [];
    const itemIds: string[] = [];

    state.shipItems.forEach((entry, key) => {
      const comp = GameCatalog.getComponentById(entry.itemId);
      if (!comp) return;
      itemIds.push(comp.id);
      shipManifest.push({
        instanceId: entry.instanceId || key,
        itemId: comp.id,
        name: comp.name,
        roleId: comp.roleId,
        category: comp.category,
        addedBy: entry.addedBy,
        cost: comp.cost,
        mass: comp.mass,
        size: comp.size,
      });
    });

    const validHeldComp = localHeldItemId
      ? GameCatalog.getComponentById(localHeldItemId.trim())
      : undefined;

    const unassignedRoles = ALL_ROLE_IDS.filter((r) => !coveredRoles.has(r));
    const audit = runDeterministicAudit(itemIds, mission);

    return {
      gameRoomId,
      requestingPlayer,
      crew,
      mission,
      stations: STATIONS_META,
      localHeldItemId: validHeldComp?.id ?? null,
      localHeldItemName: validHeldComp?.name ?? null,
      shipManifest,
      audit,
      unassignedRoles,
      capturedAtIso: new Date().toISOString(),
    };
  }

  formatContextBlock(ctx: DynamicGameContext, memorySummary?: string): string {
    const req = ctx.requestingPlayer;
    const reqRoleLabels =
      req.roles.map((r) => `${ROLE_LABELS[r]} (${r})`).join(", ") || "None assigned";

    const lines: string[] = [
      "## AUTHORITATIVE LIVE TELEMETRY SNAPSHOT (SERVER-VERIFIED)",
      `- Game Room: ${ctx.gameRoomId}`,
      `- Requesting Engineer: "${req.username}" | Host: ${req.isHost ? "Yes" : "No"} | Roles: [${reqRoleLabels}]`,
      `- Currently Held Component (in player's hands): ${
        ctx.localHeldItemId
          ? `${ctx.localHeldItemName} (${ctx.localHeldItemId})`
          : "None"
      }`,
      `- Crew Roster (${ctx.crew.length} player(s)): ${
        ctx.crew
          .map(
            (c) =>
              `"${c.username}"${c.isRequestingPlayer ? " [YOU]" : ""}${c.isHost ? " [HOST]" : ""} -> [${c.roles.map((r) => ROLE_LABELS[r]).join("/") || "No roles"}]`,
          )
          .join("; ") || "Empty"
      }`,
      `- Unassigned Roles across Crew: ${
        ctx.unassignedRoles.length > 0
          ? ctx.unassignedRoles.map((r) => ROLE_LABELS[r]).join(", ")
          : "None (all 4 departments covered)"
      }`,
    ];

    if (ctx.mission) {
      const m = ctx.mission;
      lines.push(
        `- Active Mission: ${m.id} — ${m.name} -> Destination: ${m.destination} (${m.difficulty}, ${m.distanceKm})`,
        `  Mission Constraints: Sunlight=${m.sunlightPct}%, NightNeed=${m.nightNeed}, HeatDanger=${m.heatDanger}, Radiation=${m.radiation}, LaunchPull=${m.launchPull}, SignalNeed=${m.signalNeed}, NavBrain=${m.navigationBrain}, ScienceGoal=${m.scienceGoal}, Budget=${m.budget} cr, StarInstrument=${m.starInstrumentId} (${m.starInstrument})`,
      );
    } else {
      lines.push("- Active Mission: NONE SELECTED YET (Crew must pick M01–M06; only Host can lock mission).");
    }

    if (ctx.shipManifest.length === 0) {
      lines.push("- Installed Spacecraft Manifest (0 modules): Empty assembly pad.");
    } else {
      const grouped = new Map<string, number>();
      for (const item of ctx.shipManifest) {
        grouped.set(item.itemId, (grouped.get(item.itemId) ?? 0) + 1);
      }
      const summaryParts = [...grouped.entries()].map(([id, qty]) => {
        const comp = GameCatalog.getComponentById(id)!;
        return `${qty}x ${comp.name} (${id})`;
      });
      lines.push(`- Installed Spacecraft Manifest (${ctx.shipManifest.length} modules): ${summaryParts.join(", ")}`);
    }

    if (ctx.audit) {
      const a = ctx.audit;
      lines.push(
        `- Deterministic Audit Snapshot: ${a.passCount}/12 checks passing | launchReady=${a.launchReady} | Cost=${a.metrics.totalCost}/${ctx.mission?.budget ?? "—"} cr | Mass=${a.metrics.totalMass} kg | Space=${a.metrics.usedSpace}/${a.metrics.availableSpace}`,
        `- Failing Rules Right Now: ${a.failingRuleIds.length > 0 ? a.failingRuleIds.join(", ") : "None"}`,
      );
    }

    if (memorySummary && memorySummary.trim().length > 0) {
      lines.push("", "## PRIOR CONVERSATION SUMMARY (THIS SESSION ONLY)", memorySummary.trim());
    }

    return lines.join("\n");
  }
}

export const flightDirectorContextBuilder = new FlightDirectorContextBuilder();
