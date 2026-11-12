/**
 * PixelFxAnimator.ts
 * ──────────────────
 * Zero-dependency procedural 2D pixel art VFX player for spritesheets
 * generated via patch-gg/pixelfx (Countdown, Confetti, Achievement, Warp-Out, etc.).
 *
 * Enforces crisp integer scaling and imageSmoothingEnabled = false.
 */

export interface PixelFxOptions {
  src: string;
  frameWidth: number;
  frameHeight: number;
  totalFrames: number;
  columns: number;
  fps?: number;
  scale?: number;
  loop?: boolean;
  style?: Partial<CSSStyleDeclaration>;
  onComplete?: () => void;
}

export class PixelFxAnimator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private image: HTMLImageElement;
  private options: Required<PixelFxOptions>;
  private isPlaying: boolean = false;
  private currentFrame: number = 0;
  private lastTimestamp: number = 0;
  private frameDurationMs: number;
  private rafId: number = 0;

  constructor(options: PixelFxOptions) {
    this.options = {
      src: options.src,
      frameWidth: options.frameWidth,
      frameHeight: options.frameHeight,
      totalFrames: options.totalFrames,
      columns: options.columns,
      fps: options.fps ?? 30,
      scale: options.scale ?? 2,
      loop: options.loop ?? false,
      style: options.style ?? {},
      onComplete: options.onComplete ?? (() => {}),
    };

    this.frameDurationMs = 1000 / this.options.fps;
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.options.frameWidth * this.options.scale;
    this.canvas.height = this.options.frameHeight * this.options.scale;

    Object.assign(this.canvas.style, {
      imageRendering: "pixelated",
      pointerEvents: "none",
      ...this.options.style,
    });

    this.ctx = this.canvas.getContext("2d");
    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = false;
    }

    this.image = new Image();
    this.image.src = this.options.src;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.currentFrame = 0;
    this.lastTimestamp = performance.now();

    const loop = (timestamp: number) => {
      if (!this.isPlaying) return;
      this.rafId = requestAnimationFrame(loop);

      const elapsed = timestamp - this.lastTimestamp;
      if (elapsed >= this.frameDurationMs) {
        this.lastTimestamp = timestamp - (elapsed % this.frameDurationMs);
        this._renderFrame();
        this.currentFrame++;

        if (this.currentFrame >= this.options.totalFrames) {
          if (this.options.loop) {
            this.currentFrame = 0;
          } else {
            this.stop();
            this.options.onComplete();
          }
        }
      }
    };

    if (this.image.complete) {
      this.rafId = requestAnimationFrame(loop);
    } else {
      this.image.onload = () => {
        if (this.isPlaying) {
          this.rafId = requestAnimationFrame(loop);
        }
      };
    }
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  public destroy(): void {
    this.stop();
    this.canvas.remove();
  }

  private _renderFrame(): void {
    if (!this.ctx || !this.image.complete) return;
    const { frameWidth, frameHeight, columns, scale } = this.options;
    const col = this.currentFrame % columns;
    const row = Math.floor(this.currentFrame / columns);

    const sx = col * frameWidth;
    const sy = row * frameHeight;
    const dw = frameWidth * scale;
    const dh = frameHeight * scale;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(
      this.image,
      sx,
      sy,
      frameWidth,
      frameHeight,
      0,
      0,
      dw,
      dh,
    );
  }
}
