import Phaser from "phaser";
import { REMOTE_ASSETS, SPRITESHEET_ASSETS } from "../config/assets";
import { Theme } from "../config/theme";
import { AccountForm, getSavedUsername } from "../ui/AccountForm";
import { registerAnimations } from "../game/data/AnimationKeys";

/**
 * BootScene
 * ─────────
 * First scene to run. Responsibilities:
 *  1. Display a loading bar while preloading remote assets.
 *  2. Generate procedural placeholder textures for game-world sprites/tiles.
 *  3. Check localStorage for a saved username.
 *  4. If no username → show AccountForm overlay.
 *  5. Transition to LobbyScene once a username is confirmed.
 *
 * HOW TO REPLACE A PROCEDURAL TEXTURE WITH A REAL ASSET:
 *  1. Set the asset's `url` in assets.ts to the real file path.
 *  2. Remove its block from _generatePlaceholderTextures() below.
 *  The asset will then be loaded by Phaser's normal loader instead.
 */
export class BootScene extends Phaser.Scene {
  private loadingElements: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text)[] = [];

  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    this._buildLoadingBar();

    // Load plain image assets (non-empty url, not spritesheets)
    for (const asset of REMOTE_ASSETS) {
      this.load.image(asset.key, asset.url);
    }

    // Load spritesheet assets (need frameWidth/frameHeight for Phaser)
    for (const asset of SPRITESHEET_ASSETS) {
      this.load.spritesheet(asset.key, asset.url, {
        frameWidth: asset.frameWidth ?? 16,
        frameHeight: asset.frameHeight ?? 16,
      });
    }
  }

  create() {
    // Clean up any remaining loading bar elements
    this._cleanupLoadingBar();

    // Generate all placeholder textures BEFORE transitioning
    this._generatePlaceholderTextures();

    // Register all sprite animations (centralized in AnimationKeys.ts)
    registerAnimations(this);

    const saved = getSavedUsername();

    if (saved) {
      this.scene.start("LobbyScene", { username: saved });
    } else {
      const form = new AccountForm((username) => {
        form.destroy();
        this.scene.start("LobbyScene", { username });
      });
      form.mount();
    }
  }

  // ── Procedural Textures ─────────────────────────────────────────────────
  // All game-world sprites/tiles are drawn here using Phaser Graphics objects
  // and baked into reusable textures via generateTexture().
  //
  // When real pixel-art files are ready for an asset:
  //   1. Set its url in assets.ts (e.g. url: "/assets/grass.png").
  //   2. Delete its block below.
  //   The normal Phaser loader will handle it from that point.

  private _generatePlaceholderTextures(): void {
    const g = this.add.graphics();

    // ── item_placeholder ─────────────────────────────────────────────────
    // Tiny glowing dot — appears above the player when carrying an item.
    // Tinted at runtime with the item's role colour.
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    // Bright core
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(4, 4, 2);
    g.generateTexture("item_placeholder", 8, 8);
    g.destroy();
  }

  // ── Loading Bar ──────────────────────────────────────────────────────────

  private _cleanupLoadingBar(): void {
    for (const el of this.loadingElements) {
      if (el && el.destroy) el.destroy();
    }
    this.loadingElements = [];
  }

  private _buildLoadingBar(): void {
    const { colors } = Theme;
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("rgba(0, 0, 0, 0)");

    const barWidth = width * 0.4;
    const barHeight = 6;
    const barX = (width - barWidth) / 2;
    const barY = height / 2 - barHeight / 2;

    // Track background
    const track = this.add.rectangle(
      barX + barWidth / 2,
      barY + barHeight / 2,
      barWidth,
      barHeight,
      0x2a2a4a,
      0.6,
    );

    // Loading fill
    const fill = this.add
      .rectangle(barX, barY + barHeight / 2, 0, barHeight, 0xffffff, 0.9)
      .setOrigin(0, 0.5);

    const label = this.add
      .text(width / 2, barY - 20, "INITIALIZING SYSTEM…", {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "11px",
        color: "rgba(255, 255, 255, 0.5)",
      })
      .setOrigin(0.5);

    this.loadingElements.push(track, fill, label);

    this.load.on("progress", (value: number) => {
      fill.width = barWidth * value;
      label.setText(`INITIALIZING SYSTEM… ${Math.round(value * 100)}%`);
    });

    this.load.on("complete", () => {
      this._cleanupLoadingBar();
    });
  }
}
