import Phaser from "phaser";
import { Theme } from "../config/theme";

/**
 * GameScene
 * ─────────
 * Placeholder for the actual top-down pixel art gameplay.
 *
 * Currently displays the connected players and their role assignments.
 * Full gameplay (movement, items, role abilities) will be implemented here.
 *
 * Data passed via scene.start("GameScene", { username, players, roomId }):
 *   - username: the local player's username
 *   Future: players map, room reference, etc.
 */
export class GameScene extends Phaser.Scene {
  private username: string = "";

  constructor() {
    super({ key: "GameScene" });
  }

  init(data: { username?: string }) {
    this.username = data?.username ?? "Player";
  }

  create() {
    const { colors, font } = Theme;
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor(colors.background);

    // ── Placeholder content ──────────────────────────────────────────────

    this.add
      .text(width / 2, height / 2 - 40, "GAME STARTED", {
        fontFamily: font.family,
        fontSize: font.sizeTitle,
        color: colors.accent,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 10, `Playing as: ${this.username}`, {
        fontFamily: font.family,
        fontSize: font.sizeMd,
        color: colors.textMuted,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 50, "Gameplay coming soon…", {
        fontFamily: font.family,
        fontSize: font.sizeSm,
        color: colors.textMuted,
      })
      .setOrigin(0.5);

    // Back button (dev convenience)
    const backText = this.add
      .text(width / 2, height - 40, "← Back to Lobby", {
        fontFamily: font.family,
        fontSize: font.sizeSm,
        color: colors.textMuted,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    backText.on("pointerover", () => { backText.setColor(colors.textPrimary); });
    backText.on("pointerout", () => { backText.setColor(colors.textMuted); });
    backText.on("pointerdown", () => {
      this.scene.start("LobbyScene", { username: this.username });
    });
  }
}
