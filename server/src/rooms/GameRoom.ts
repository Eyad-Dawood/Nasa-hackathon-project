import { Room, Client } from "colyseus";

/**
 * GameRoom – placeholder for future gameplay logic.
 *
 * Currently accepts connections and echoes a ready confirmation.
 * Full game state (movement, items, etc.) will be implemented here later.
 */
export class GameRoom extends Room {
  maxClients = 4;

  onCreate(_options: Record<string, unknown>) {
    console.log(`GameRoom ${this.roomId} created.`);
  }

  onJoin(client: Client, _options: unknown) {
    console.log(`Client ${client.sessionId} joined GameRoom ${this.roomId}`);
    client.send("game-ready", { message: "Game room ready – awaiting implementation." });
  }

  onLeave(client: Client, _code?: number) {
    console.log(`Client ${client.sessionId} left GameRoom ${this.roomId}`);
  }

  onDispose() {
    console.log(`GameRoom ${this.roomId} disposed.`);
  }
}
