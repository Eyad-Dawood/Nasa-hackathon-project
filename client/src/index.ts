import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { LobbyScene } from "./scenes/LobbyScene";
import { ObjectiveScene } from "./scenes/ObjectiveScene";
import { GameScene } from "./scenes/GameScene";
import { EarthBlazeBackground } from "./ui/EarthBlazeBackground";

// Initialize the photorealistic NASA Earth Blaze WebGL background
EarthBlazeBackground.get().init();

/**
 * index.ts – Phaser game entry point.
 *
 * Registers all scenes. Transparent canvas so the WebGL Earth horizon
 * shines seamlessly behind the lobby and mission terminals.
 */
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  transparent: true,
  parent: "game-container",
  pixelArt: true,
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 640,
    height: 480,
  },
  fps: {
    target: 60,
    forceSetTimeOut: true,
  },
  physics: {
    default: "arcade",
    arcade: { debug: false },
  },
  scene: [BootScene, LobbyScene, ObjectiveScene, GameScene],
};

new Phaser.Game(config);

