import { defineServer, defineRoom, monitor, playground } from "colyseus";
import { LobbyRoom } from "./rooms/LobbyRoom";
import { GameRoom } from "./rooms/GameRoom";

const server = defineServer({
  rooms: {
    lobby: defineRoom(LobbyRoom),
    game: defineRoom(GameRoom),
  },

  express: (app) => {
    if (process.env.NODE_ENV !== "production") {
      app.use("/", playground());
    }

    /**
     * Colyseus Monitor – useful during development to inspect rooms/state.
     * Protect with auth before going to production.
     */
    app.use("/monitor", monitor());
  },
});

export default server;
