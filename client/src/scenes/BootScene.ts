import Phaser from "phaser";
import { REMOTE_ASSETS } from "../config/assets";
import { Theme } from "../config/theme";
import { AccountForm, getSavedUsername } from "../ui/AccountForm";

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
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    this._buildLoadingBar();

    // Load only assets that have a real URL (non-empty url in assets.ts)
    for (const asset of REMOTE_ASSETS) {
      this.load.image(asset.key, asset.url);
    }
  }

  create() {
    // Generate all placeholder textures BEFORE transitioning
    this._generatePlaceholderTextures();

    const saved = getSavedUsername();

    if (saved) {
      this.scene.start("LobbyScene", { username: saved });
    } else {
      const form = new AccountForm((username) => {
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
    const { game } = Theme;

    // ── tile_grass ──────────────────────────────────────────────────────
    g.fillStyle(game.tileGrass, 1);
    g.fillRect(0, 0, 16, 16);
    // Subtle grid lines to give tiled feel
    g.lineStyle(0.5, game.tileGrassLine, 0.6);
    g.strokeRect(0, 0, 16, 16);
    g.generateTexture("tile_grass", 16, 16);
    g.clear();

    // ── tile_wall ───────────────────────────────────────────────────────
    g.fillStyle(game.tileWall, 1);
    g.fillRect(0, 0, 16, 16);
    // Top & left highlight (fake 3D bevel)
    g.lineStyle(1.5, game.tileWallEdge, 0.9);
    g.beginPath();
    g.moveTo(0, 15);
    g.lineTo(0, 0);
    g.lineTo(15, 0);
    g.strokePath();
    // Bottom & right shadow
    g.lineStyle(1.5, 0x1a1a2e, 0.8);
    g.beginPath();
    g.moveTo(15, 0);
    g.lineTo(15, 15);
    g.lineTo(0, 15);
    g.strokePath();
    g.generateTexture("tile_wall", 16, 16);
    g.clear();

    // ── tile_water ──────────────────────────────────────────────────────
    g.fillStyle(game.tileWater, 1);
    g.fillRect(0, 0, 16, 16);
    // Sheen stripe across the middle
    g.fillStyle(game.tileWaterSheen, 0.5);
    g.fillRect(0, 6, 16, 3);
    g.generateTexture("tile_water", 16, 16);
    g.clear();

    // ── player ──────────────────────────────────────────────────────────
    // White base — tinted at runtime with the player's role colour.
    // Body: rounded square
    g.fillStyle(0xffffff, 1);
    g.fillRect(2, 2, 12, 12);
    // Eyes / direction indicator
    g.fillStyle(game.playerDot, 1);
    g.fillCircle(8, 7, 2);
    g.generateTexture("player", 16, 16);
    g.clear();

    // ── npc ─────────────────────────────────────────────────────────────
    g.fillStyle(game.npcFill, 1);
    g.fillRect(2, 2, 12, 12);
    // Face dot
    g.fillStyle(game.npcDot, 1);
    g.fillCircle(8, 7, 2);
    // Small "!" on top to indicate interactable
    g.fillStyle(game.npcDot, 1);
    g.fillRect(7, 0, 2, 1);
    g.generateTexture("npc", 16, 16);
    g.clear();

    g.destroy();
  }

  // ── Loading Bar ──────────────────────────────────────────────────────────

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
