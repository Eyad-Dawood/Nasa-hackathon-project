import assert from "assert";
import type { ColyseusTestServer } from "@colyseus/testing";
import { getSharedColyseusServer } from "./helpers/colyseusHarness";
import { LobbyState } from "../src/models/LobbyState";
import { GameState } from "../src/models/GameState";
import { GameCatalog } from "../src/services/flight-director/data/GameCatalog";

describe("Space Benders — Phase 1 Room & Catalog Tests", () => {
  let colyseus: ColyseusTestServer;

  before(async () => {
    colyseus = await getSharedColyseusServer();
  });

  beforeEach(async () => {
    await colyseus.cleanup();
  });

  it("loads canonical game_data.json (6 missions M01–M06, 84 components PT01–SI20)", () => {
    assert.strictEqual(GameCatalog.getAllMissions().length, 6);
    assert.strictEqual(GameCatalog.getAllComponents().length, 84);
    assert.ok(GameCatalog.getMissionById("M01"));
    assert.ok(GameCatalog.getMissionById("M06"));
    assert.strictEqual(GameCatalog.getMissionById("artemis_lunar_relay"), undefined);
    assert.strictEqual(GameCatalog.getComponentById("PT01")?.roleId, "powerAndThermal");
    assert.strictEqual(GameCatalog.getComponentById("SC01")?.maxPerShip, 1);
    assert.strictEqual(GameCatalog.getComponentById("SC20")?.maxPerShip, 3);
    assert.strictEqual(GameCatalog.getComponentById("PT01")?.maxPerShip, null);
  });

  it("supports lobby role assignment and host game start -> creates GameRoom", async () => {
    const lobby = await colyseus.createRoom<LobbyState>("lobby", { username: "Commander" });
    const hostClient = await colyseus.connectTo(lobby, { username: "Commander" });
    const guestClient = await colyseus.connectTo(lobby, { username: "Scientist" });

    hostClient.send("setRole", { role: "powerAndThermal", claim: true });
    hostClient.send("setRole", { role: "structureAndComputing", claim: true });
    guestClient.send("setRole", { role: "Communications", claim: true });
    guestClient.send("setRole", { role: "Science", claim: true });

    await lobby.waitForNextPatch();
    assert.strictEqual(lobby.state.hostId, hostClient.sessionId);

    const startedPromise = new Promise<{ gameRoomId: string; hostId: string }>((resolve) => {
      hostClient.onMessage("game-started", (payload) => resolve(payload));
    });

    hostClient.send("startGame");
    const started = await startedPromise;
    assert.ok(started.gameRoomId);
    assert.strictEqual(started.hostId, hostClient.sessionId);
  });

  it("starts GameRoom with empty selectedObjectiveId and validates host mission selection (M01–M06)", async () => {
    const room = await colyseus.createRoom<GameState>("game", { highestUnlockedLevel: 1 });
    const hostClient = await colyseus.connectTo(room, {
      username: "Alex",
      roles: ["powerAndThermal", "structureAndComputing"],
      isHost: true,
    });
    const crewClient = await colyseus.connectTo(room, {
      username: "Sam",
      roles: ["Communications", "Science"],
      isHost: false,
    });

    await room.waitForNextPatch();
    assert.strictEqual(room.state.selectedObjectiveId, "");

    // Non-host cannot select mission
    const errPromise = new Promise<{ message: string }>((resolve) => {
      crewClient.onMessage("objectiveError", (p) => resolve(p));
    });
    crewClient.send("selectObjective", { objectiveId: "M03" });
    const err = await errPromise;
    assert.ok(err.message.includes("Only the host"));
    assert.strictEqual(room.state.selectedObjectiveId, "");

    // Host cannot select fake mission
    const invalidPromise = new Promise<{ message: string }>((resolve) => {
      hostClient.onMessage("objectiveError", (p) => resolve(p));
    });
    hostClient.send("selectObjective", { objectiveId: "artemis_lunar_relay" });
    await invalidPromise;
    assert.strictEqual(room.state.selectedObjectiveId, "");

    // Host cannot jump to locked Level 4 (M03) while on Level 1
    const lockedPromise = new Promise<{ message: string }>((resolve) => {
      hostClient.onMessage("objectiveError", (p) => resolve(p));
    });
    hostClient.send("selectObjective", { objectiveId: "M03" });
    const lockedErr = await lockedPromise;
    assert.ok(lockedErr.message.includes("locked"));
    assert.strictEqual(room.state.selectedObjectiveId, "");

    // Host selects Level 1 (M04: Earth Watcher)
    hostClient.send("selectObjective", { objectiveId: "M04" });
    await room.waitForNextPatch();
    assert.strictEqual(room.state.selectedObjectiveId, "M04");
    assert.strictEqual(room.state.highestUnlockedLevel, 1);

    // Host advances to Level 2 (M01: Moon Explorer) via nextMission
    hostClient.send("nextMission", { objectiveId: "M01", resetShip: true });
    await room.waitForNextPatch();
    assert.strictEqual(room.state.selectedObjectiveId, "M01");
    assert.strictEqual(room.state.highestUnlockedLevel, 2);
  });

  it("allows duplicate ship items via instanceId, enforces maxPerShip and role authorization", async () => {
    const room = await colyseus.createRoom<GameState>("game", {
      selectedObjectiveId: "M01",
    });

    const powerEngineer = await colyseus.connectTo(room, {
      username: "PowerEng",
      roles: ["powerAndThermal"],
      isHost: true,
    });
    const structEngineer = await colyseus.connectTo(room, {
      username: "StructEng",
      roles: ["structureAndComputing"],
      isHost: false,
    });

    await room.waitForNextPatch();

    // 1. Multiple unlimited solar panels (PT01, maxPerShip=null) should all persist with unique instanceIds
    powerEngineer.send("addItemToShip", { itemId: "PT01", roleId: "powerAndThermal" });
    powerEngineer.send("addItemToShip", { itemId: "PT01", roleId: "powerAndThermal" });
    await room.waitForNextPatch();

    const solarInstances = [...room.state.shipItems.entries()].filter(
      ([, v]) => v.itemId === "PT01",
    );
    assert.strictEqual(solarInstances.length, 2);
    assert.notStrictEqual(solarInstances[0][0], solarInstances[1][0]);

    // 2. Enforce maxPerShip=1 on SC01 (Cube Frame)
    structEngineer.send("addItemToShip", { itemId: "SC01", roleId: "structureAndComputing" });
    await room.waitForNextPatch();

    const limitErrPromise = new Promise<{ message: string }>((resolve) => {
      structEngineer.onMessage("shipError", (p) => resolve(p));
    });
    structEngineer.send("addItemToShip", { itemId: "SC01", roleId: "structureAndComputing" });
    const limitErr = await limitErrPromise;
    assert.ok(limitErr.message.includes("Limit reached"));

    // 3. Enforce role authorization (powerEngineer cannot install Science item SI01)
    const authErrPromise = new Promise<{ message: string }>((resolve) => {
      powerEngineer.onMessage("shipError", (p) => resolve(p));
    });
    powerEngineer.send("addItemToShip", { itemId: "SI01", roleId: "Science" });
    const authErr = await authErrPromise;
    assert.ok(authErr.message.includes("Role authorization"));

    // 4. Removing one duplicate solar panel by instanceId leaves the second intact
    const firstInstanceId = solarInstances[0][0];
    powerEngineer.send("removeItemFromShip", { instanceId: firstInstanceId });
    await room.waitForNextPatch();

    const remainingSolar = [...room.state.shipItems.entries()].filter(
      ([, v]) => v.itemId === "PT01",
    );
    assert.strictEqual(remainingSolar.length, 1);
    assert.strictEqual(remainingSolar[0][0], solarInstances[1][0]);
  });

  it("prevents guest-joins-first race from stealing hostId when lobby created GameRoom with preset hostId", async () => {
    const room = await colyseus.createRoom<GameState>("game", {
      hostId: "lobby_host_session",
    });

    const guestFirst = await colyseus.connectTo(room, {
      username: "EarlyGuest",
      roles: ["Science"],
      isHost: false,
    });
    await room.waitForNextPatch();
    assert.notStrictEqual(room.state.hostId, guestFirst.sessionId);

    const rejectPromise = new Promise<{ message: string }>((resolve) => {
      guestFirst.onMessage("objectiveError", (p) => resolve(p));
    });
    guestFirst.send("selectObjective", { objectiveId: "M01" });
    const rejected = await rejectPromise;
    assert.ok(rejected.message.includes("Only the host"));

    const realHost = await colyseus.connectTo(room, {
      username: "RealHost",
      roles: ["powerAndThermal", "structureAndComputing", "Communications"],
      isHost: true,
    });
    await room.waitForNextPatch();
    assert.strictEqual(room.state.hostId, realHost.sessionId);

    realHost.send("selectObjective", { objectiveId: "M04" });
    await room.waitForNextPatch();
    assert.strictEqual(room.state.selectedObjectiveId, "M04");
  });
});

