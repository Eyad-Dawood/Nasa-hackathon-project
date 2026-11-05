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
    // Generate all placeholder textures BEFORE transitioning
    this._generatePlaceholderTextures();

    // Register all sprite animations (centralized in AnimationKeys.ts)
    registerAnimations(this);

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
    // REMOVED: player now uses real spritesheets (player_idle, player_walk).
    // See AnimationKeys.ts for animation definitions.
    // See assets.ts playerIdle / playerWalk entries.

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

    // ── station ─────────────────────────────────────────────────────────
    // A crate/locker shape — tinted at runtime with the role colour.
    // White base so setTint() works correctly.
    g.fillStyle(0xffffff, 1);
    g.fillRect(1, 2, 14, 13); // body
    g.fillStyle(0xdddddd, 1);
    g.fillRect(1, 2, 14, 3); // lid strip
    g.fillStyle(0xaaaaaa, 1);
    g.fillRect(6, 4, 4, 2); // latch
    g.lineStyle(1, 0x888888, 0.6);
    g.strokeRect(1, 2, 14, 13);
    g.generateTexture("station", 16, 16);
    g.clear();

    // ── ship ─────────────────────────────────────────────────────────────
    // Simple rocket silhouette — 32×24 procedural.
    g.fillStyle(0xaaddff, 1);
    // Body
    g.fillRect(10, 6, 12, 14);
    // Nose cone
    g.fillTriangle(10, 6, 22, 6, 16, 0);
    // Left fin
    g.fillTriangle(10, 14, 6, 20, 10, 20);
    // Right fin
    g.fillTriangle(22, 14, 26, 20, 22, 20);
    // Engine glow
    g.fillStyle(0xff9944, 1);
    g.fillRect(12, 20, 8, 3);
    // Cockpit window
    g.fillStyle(0x224466, 1);
    g.fillCircle(16, 9, 3);
    // Outline
    g.lineStyle(1, 0x446688, 0.8);
    g.strokeRect(10, 6, 12, 14);
    g.generateTexture("ship", 32, 24);
    g.clear();

    // ── item_placeholder ─────────────────────────────────────────────────
    // Tiny glowing dot — appears above the player when carrying an item.
    // Tinted at runtime with the item's role colour.
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    // Bright core
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(4, 4, 2);
    g.generateTexture("item_placeholder", 8, 8);
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
    this.add.rectangle(
      barX + barWidth / 2,
      barY + barHeight / 2,
      barWidth,
      barHeight,
      0x2a2a4a,
    );

    // Loading fill
    const fill = this.add
      .rectangle(barX, barY + barHeight / 2, 0, barHeight, 0xe94560)
      .setOrigin(0, 0.5);

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
