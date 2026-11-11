import assert from "assert";
import type { ColyseusTestServer } from "@colyseus/testing";
import { getSharedColyseusServer } from "./helpers/colyseusHarness";
import { GameState } from "../src/models/GameState";
import { aiDirectorService } from "../src/services/flight-director/AiDirectorService";
import type {
  AiChunkEvent,
  AiDoneEvent,
  AiErrorEvent,
  AiStatusEvent,
} from "../src/services/flight-director/types/AiTypes";

describe("Space Benders — Colyseus AI Streaming Integration Tests", function () {
  this.timeout(60000);
  let colyseus: ColyseusTestServer;

  before(async () => {
    colyseus = await getSharedColyseusServer();
  });

  beforeEach(async () => {
    await colyseus.cleanup();
  });

  it("streams ai:status, ai:chunk, and ai:done to requesting client only and preserves GameState immutability", async () => {
    const room = await colyseus.createRoom<GameState>("game", {
      selectedObjectiveId: "M03",
    });

    const alex = await colyseus.connectTo(room, {
      username: "Alex",
      roles: ["powerAndThermal", "structureAndComputing"],
      isHost: true,
    });
    const sam = await colyseus.connectTo(room, {
      username: "Sam",
      roles: ["Communications", "Science"],
      isHost: false,
    });

    alex.send("addItemToShip", { itemId: "SC03", roleId: "structureAndComputing" });
    alex.send("addItemToShip", { itemId: "PT01", roleId: "powerAndThermal" });
    sam.send("addItemToShip", { itemId: "CM01", roleId: "Communications" });
    await room.waitForNextPatch();

    const itemCountBefore = room.state.shipItems.size;
    assert.strictEqual(itemCountBefore, 3);

    const statuses: AiStatusEvent[] = [];
    const chunks: AiChunkEvent[] = [];
    let samStrayEvents = 0;

    sam.onMessage("ai:status", () => { samStrayEvents += 1; });
    sam.onMessage("ai:chunk", () => { samStrayEvents += 1; });
    sam.onMessage("ai:done", () => { samStrayEvents += 1; });

    const donePromise = new Promise<AiDoneEvent>((resolve, reject) => {
      alex.onMessage("ai:status", (ev) => statuses.push(ev));
      alex.onMessage("ai:chunk", (ev) => chunks.push(ev));
      alex.onMessage("ai:done", (ev) => resolve(ev));
      alex.onMessage("ai:error", (ev: AiErrorEvent) =>
        reject(new Error(`Unexpected AI error: ${ev.code} - ${ev.message}`)),
      );
    });

    alex.send("ai:ask", {
      requestId: "int_req_1",
      message: "Can we launch now and how can we pass all 12 rules within budget?",
      localHeldItemId: "PT23",
    });

    const done = await donePromise;
    assert.strictEqual(done.requestId, "int_req_1");
    assert.ok(statuses.length >= 2);
    assert.ok(chunks.length >= 1);
    assert.strictEqual(done.metadata.missionId, "M03");
    assert.strictEqual(done.metadata.launchReady, false);
    assert.ok(done.metadata.passCount !== null && done.metadata.passCount < 12);
    assert.ok(done.metadata.toolsCalled.includes("run_launch_audit"));
    assert.strictEqual(done.metadata.provider, aiDirectorService.config.provider);

    // Teammate must NOT receive Alex's private streaming events
    assert.strictEqual(samStrayEvents, 0);

    // Authoritative Colyseus GameState must remain 100% unmodified
    assert.strictEqual(room.state.shipItems.size, itemCountBefore);
    assert.strictEqual(room.state.selectedObjectiveId, "M03");
  });

  it("handles Arabic RTL queries over Colyseus and cancels gracefully on ai:cancel", async () => {
    const room = await colyseus.createRoom<GameState>("game", {
      selectedObjectiveId: "M06",
    });

    const player = await colyseus.connectTo(room, {
      username: "Nadia",
      roles: ["powerAndThermal", "Science"],
      isHost: true,
    });

    const arDonePromise = new Promise<AiDoneEvent>((resolve, reject) => {
      player.onMessage("ai:status", () => {});
      player.onMessage("ai:chunk", () => {});
      player.onMessage("ai:done", (ev) => resolve(ev));
      player.onMessage("ai:error", (ev: AiErrorEvent) => reject(new Error(ev.message)));
    });

    player.send("ai:ask", {
      requestId: "ar_req_1",
      message: "إيه المشاكل اللي مانعة المركبة من الإطلاق؟",
    });

    const arDone = await arDonePromise;
    assert.strictEqual(arDone.metadata.language, "ar");
    assert.strictEqual(arDone.metadata.missionId, "M06");
    assert.ok(/[\u0600-\u06FF]/.test(arDone.fullText));

    // Verify cancel protocol emits clean ABORTED or cleans active state without throwing
    const cancelResultPromise = new Promise<string>((resolve) => {
      player.onMessage("ai:status", () => {});
      player.onMessage("ai:chunk", () => {});
      player.onMessage("ai:error", (ev: AiErrorEvent) => resolve(ev.code));
      player.onMessage("ai:done", () => resolve("DONE_BEFORE_CANCEL"));
    });
    player.send("ai:ask", {
      requestId: "cancel_req_1",
      message: "Explain why nuclear power helps Titan missions.",
    });
    player.send("ai:cancel", { requestId: "cancel_req_1" });

    const outcome = await cancelResultPromise;
    assert.ok(outcome === "ABORTED" || outcome === "DONE_BEFORE_CANCEL");
    assert.strictEqual(aiDirectorService.getActiveRequestCount(), 0);
  });
});
