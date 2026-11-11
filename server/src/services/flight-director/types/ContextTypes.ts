import type { MissionSpec, RoleId, StationMeta } from "../data/GameCatalog";
import type { DeterministicAuditReport } from "./FlightPlanTypes";

export interface CrewMemberSummary {
  sessionId: string;
  username: string;
  roles: RoleId[];
  isHost: boolean;
  isRequestingPlayer: boolean;
}

export interface ShipManifestItem {
  instanceId: string;
  itemId: string;
  name: string;
  roleId: RoleId;
  category: string;
  addedBy: string;
  cost: number;
  mass: number;
  size: number;
}

export interface DynamicGameContext {
  gameRoomId: string;
  requestingPlayer: CrewMemberSummary;
  crew: CrewMemberSummary[];
  mission: MissionSpec | null;
  stations: readonly StationMeta[];
  localHeldItemId: string | null;
  localHeldItemName: string | null;
  shipManifest: ShipManifestItem[];
  audit: DeterministicAuditReport | null;
  unassignedRoles: RoleId[];
  capturedAtIso: string;
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  intents?: string[];
  missionId?: string | null;
}

export interface ConversationMemoryState {
  key: string;
  missionId: string | null;
  rollingSummary: string;
  turns: ConversationTurn[];
  updatedAt: number;
}

