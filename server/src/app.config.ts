import { defineServer, defineRoom, matchMaker, monitor, playground } from "colyseus";
import { LobbyRoom } from "./rooms/LobbyRoom";
import { GameRoom } from "./rooms/GameRoom";
import { aiDirectorService } from "./services/flight-director/AiDirectorService";

// ── CORS helper ──────────────────────────────────────────────────────────────
// In production, set ALLOWED_ORIGINS to your Cloudflare Pages domain(s).
// Multiple origins can be comma-separated: "https://a.pages.dev,https://custom.com"
// Falls back to "*" in development.
function getCorsOrigin(reqOrigin?: string): string {
  const allowed = process.env.ALLOWED_ORIGINS;
  if (!allowed || allowed === "*") return "*";

  const origins = allowed.split(",").map((o) => o.trim());
  if (reqOrigin && origins.includes(reqOrigin)) return reqOrigin;
  return origins[0]; // fallback to first allowed origin
}

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
    app.get("/rooms", async (req, res) => {
      try {
        const rooms = await matchMaker.query({ name: "lobby" });
        const origin = getCorsOrigin(req.headers?.origin as string);
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.end(JSON.stringify(rooms ?? []));
      } catch (e) {
        console.error("[/rooms] query error:", e);
        res.statusCode = 500;
        res.end(JSON.stringify([]));
      }
    });

    app.options("/rooms", (req, res) => {
      const origin = getCorsOrigin(req.headers?.origin as string);
      res.setHeader("Access-Control-Allow-Origin", origin);
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
