import Phaser from "phaser";
import { ALL_ASSETS } from "../config/assets";
import { Theme } from "../config/theme";
import { AccountForm, getSavedUsername } from "../ui/AccountForm";

/**
 * BootScene
 * ─────────
 * First scene to run. Responsibilities:
 *  1. Display a loading bar while preloading all assets via the Assets map.
 *  2. Check localStorage for a saved username.
 *  3. If no username → show AccountForm overlay.
 *  4. Transition to LobbyScene once a username is confirmed.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    this._buildLoadingBar();

    // Load every asset via the centralised Assets map
    for (const asset of ALL_ASSETS) {
      this.load.image(asset.key, asset.url);
    }
  }

  create() {
    const saved = getSavedUsername();

    if (saved) {
      // Username already set — go straight to lobby
      this.scene.start("LobbyScene", { username: saved });
    } else {
      // Show account form overlay; on submit, transition to LobbyScene
      const form = new AccountForm((username) => {
        this.scene.start("LobbyScene", { username });
      });
      form.mount();
    }
  }

  private _buildLoadingBar(): void {
    const { colors } = Theme;
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor(colors.background);

    const barWidth = width * 0.5;
    const barHeight = 12;
    const barX = (width - barWidth) / 2;
    const barY = height / 2 - barHeight / 2;

    // Track background
    this.add.rectangle(barX + barWidth / 2, barY + barHeight / 2, barWidth, barHeight, 0x2a2a4a);

    // Loading fill
    const fill = this.add.rectangle(barX, barY + barHeight / 2, 0, barHeight, 0xe94560).setOrigin(0, 0.5);

    const label = this.add
      .text(width / 2, barY - 24, "Loading…", {
        fontFamily: Theme.font.family,
        fontSize: Theme.font.sizeSm,
        color: Theme.colors.textMuted,
      })
      .setOrigin(0.5);

    this.load.on("progress", (value: number) => {
      fill.width = barWidth * value;
      label.setText(`Loading… ${Math.round(value * 100)}%`);
    });

    this.load.on("complete", () => {
      label.setText("Ready!");
    });
  }
}
