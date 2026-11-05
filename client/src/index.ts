import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { LobbyScene } from "./scenes/LobbyScene";
import { GameScene } from "./scenes/GameScene";

/**
 * index.ts – Phaser game entry point.
 *
 * Registers all scenes. All old tutorial UI and FPS widget are removed.
 * Scene flow: BootScene → LobbyScene → GameScene
 */
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#0d0d1a",
  parent: "game-container",
  pixelArt: true,
  fps: {
    target: 60,
    forceSetTimeOut: true,
  },
  physics: {
    default: "arcade",
    arcade: { debug: false },
  },
  scene: [BootScene, LobbyScene, GameScene],
};

new Phaser.Game(config);
