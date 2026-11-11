import { defineServer, defineRoom, matchMaker, monitor, playground } from "colyseus";
import { LobbyRoom } from "./rooms/LobbyRoom";
import { GameRoom } from "./rooms/GameRoom";
import { aiDirectorService } from "./services/flight-director/AiDirectorService";

const server = defineServer({
  rooms: {
    lobby: defineRoom(LobbyRoom),
    game: defineRoom(GameRoom),
  },

  express: (app) => {
    const aiSummary = aiDirectorService.getStartupSummary();
    console.log(
      `[AI Flight Director] provider=${aiSummary.provider} model=${aiSummary.model} key=${aiSummary.apiKeyMasked} prompt=v${aiSummary.promptVersion}`,
    );
    if (aiSummary.warning) {
      console.warn(`[AI Flight Director] ${aiSummary.warning}`);
    }
    // ── GET /rooms ────────────────────────────────────────────────────────
    // Colyseus v0.17 has no built-in GET listing endpoint.
    // We expose one using the internal matchMaker.query().
    // The client polls this to show available lobbies.
    app.get("/rooms", async (_req, res) => {
      try {
        const rooms = await matchMaker.query({ name: "lobby" });
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.end(JSON.stringify(rooms ?? []));
      } catch (e) {
        console.error("[/rooms] query error:", e);
        res.statusCode = 500;
        res.end(JSON.stringify([]));
      }
    });

    app.options("/rooms", (_req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.end();
    });

    if (process.env.NODE_ENV !== "production") {
      app.use("/", playground());
    }

    app.use("/monitor", monitor());
  },
});

export default server;
