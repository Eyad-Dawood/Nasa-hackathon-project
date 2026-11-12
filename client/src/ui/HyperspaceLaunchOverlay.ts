/**
 * HyperspaceLaunchOverlay.ts
 * ──────────────────────────
 * Cinematic WebGL2 LightSpeed Hyperspace Tunnel Launch Sequence.
 * Triggered when the crew initiates rocket launch from the Assembly Bay.
 *
 * Sequence:
 *   1. Screen shake & pad clearance in the cleanroom.
 *   2. Fullscreen LightSpeed hyperspace warp-drive tunnel starts.
 *   3. Artemis exploration rocket flies through the tunnel with ion engine thrusters.
 *   4. Real-time telemetry readouts (Velocity, Warp Factor, Orbital Vector).
 *   5. White warp flash transition into MissionVictoryUI.
 */

const VERT_SHADER = `#version 300 es
precision highp float;
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG_SHADER = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;

#define FC gl_FragCoord.xy
#define R  resolution
#define T  time
#define hue(a) (.6+.6*cos(6.3*(a)+vec3(0,83,21)))

float rnd(float a) {
  vec2 p = fract(a * vec2(12.9898, 78.233));
  p += dot(p, p*345.);
  return fract(p.x * p.y);
}

vec3 pattern(vec2 uv) {
  vec3 col = vec3(0.);
  for (float i=.0; i++<20.;) {
    float a = rnd(i);
    vec2 n = vec2(a, fract(a*34.56));
    vec2 p = sin(n*(T+7.) + T*.5);
    float d = dot(uv-p, uv-p);
    col += .00125/d * hue(dot(uv,uv) + i*.125 + T);
  }
  return col;
}

void main(void) {
  vec2 uv = (FC - .5 * R) / min(R.x, R.y);
  vec3 col = vec3(0.);
  float s = 2.4;
  float a = atan(uv.x, uv.y);
  float b = length(uv);
  uv = vec2(a * 5. / 6.28318, .05 / tan(b) + T);
  uv = fract(uv) - .5;
  col += pattern(uv * s);
  O = vec4(col, 1.);
}
`;

export interface LaunchSequenceOptions {
  missionLabel: string;
  totalWeight: number;
  onComplete: () => void;
}

export class HyperspaceLaunchOverlay {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private vbo: WebGLBuffer | null = null;
  private rafId: number = 0;
  private startTime: number = 0;
  private speed: number = 1.2;
  private options: LaunchSequenceOptions;
  private destroyed: boolean = false;

  constructor(options: LaunchSequenceOptions) {
    this.options = options;
    this.container = document.createElement("div");
    this.canvas = document.createElement("canvas");
    this._buildDOM();
  }

  public mount(): void {
    document.body.appendChild(this.container);
    this._initWebGL();
    this._startCinematicTimeline();
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);

    if (this.gl && this.program) {
      const p = this.program;
      const shaders = this.gl.getAttachedShaders(p) || [];
      shaders.forEach((s) => this.gl?.deleteShader(s));
      this.gl.deleteProgram(p);
    }
    if (this.gl && this.vbo) {
      this.gl.deleteBuffer(this.vbo);
    }

    this.container.remove();
  }

  private _buildDOM(): void {
    this.container.id = "hyperspace-launch-overlay";
    Object.assign(this.container.style, {
      position: "fixed",
      inset: "0",
      zIndex: "3500",
      background: "#000000",
      overflow: "hidden",
      fontFamily: "'Inter', -apple-system, sans-serif",
      opacity: "0",
      transition: "opacity 0.6s ease",
    });

    // Canvas
    Object.assign(this.canvas.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      display: "block",
    });
    this.container.appendChild(this.canvas);

    // Rocket container positioned in center
    const rocketBox = document.createElement("div");
    rocketBox.id = "warp-rocket-box";
    Object.assign(rocketBox.style, {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%) scale(1)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      zIndex: "10",
      pointerEvents: "none",
      transition: "transform 0.1s linear, opacity 0.5s ease",
    });

    const rocketImg = document.createElement("img");
    rocketImg.src = "/assets/spaceShip/artemis_flight_rocket.png";
    rocketImg.alt = "Artemis Deep-Space Rocket";
    Object.assign(rocketImg.style, {
      width: "150px",
      height: "auto",
      imageRendering: "pixelated",
    });

    rocketBox.append(rocketImg);
    this.container.appendChild(rocketBox);

    // Top Mission Telemetry Bar - Liquid Glass
    const topBar = document.createElement("div");
    Object.assign(topBar.style, {
      position: "absolute",
      top: "28px",
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      alignItems: "center",
      gap: "24px",
      background: "rgba(255, 255, 255, 0.06)",
      boxShadow: "inset 0 1px 0.5px rgba(255, 255, 255, 0.25), inset 0 0 0 0.5px rgba(255, 255, 255, 0.1), 0 16px 36px rgba(0, 0, 0, 0.5)",
      backdropFilter: "blur(16px) saturate(1.4)",
      WebkitBackdropFilter: "blur(16px) saturate(1.4)",
      borderRadius: "24px",
      padding: "8px 22px",
      zIndex: "20",
    });

    topBar.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#ffffff; box-shadow:0 0 8px #ffffff;"></span>
        <span style="font-family:'JetBrains Mono', monospace; font-size:11px; letter-spacing:1px; color:#ffffff; font-weight:600;">WARP VECTOR ENGAGED</span>
      </div>
      <span style="color:rgba(255,255,255,0.25);">|</span>
      <span style="font-size:12px; color:rgba(255,255,255,0.7);">${this.options.missionLabel}</span>
    `;
    this.container.appendChild(topBar);

    // Bottom Telemetry Strip
    const bottomStrip = document.createElement("div");
    bottomStrip.id = "warp-telemetry-strip";
    Object.assign(bottomStrip.style, {
      position: "absolute",
      bottom: "32px",
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      gap: "36px",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "11px",
      color: "rgba(255, 255, 255, 0.8)",
      zIndex: "20",
      textAlign: "center",
    });

    bottomStrip.innerHTML = `
      <div>
        <div style="font-size:9px; color:rgba(255,255,255,0.4); margin-bottom:2px;">VELOCITY</div>
        <div id="warp-velocity" style="font-weight:600; color:#ffffff;">MACH 42.8</div>
      </div>
      <div>
        <div style="font-size:9px; color:rgba(255,255,255,0.4); margin-bottom:2px;">WARP FACTOR</div>
        <div id="warp-factor" style="font-weight:600; color:#ffffff;">1.00 c</div>
      </div>
      <div>
        <div style="font-size:9px; color:rgba(255,255,255,0.4); margin-bottom:2px;">PAYLOAD INTEGRITY</div>
        <div style="font-weight:600; color:#ffffff;">100% NOMINAL (${this.options.totalWeight} KG)</div>
      </div>
    `;
    this.container.appendChild(bottomStrip);

    // Skip Button (top right)
    const skipBtn = document.createElement("button");
    skipBtn.textContent = "Skip Transit ➔";
    Object.assign(skipBtn.style, {
      position: "absolute",
      top: "28px",
      right: "32px",
      background: "rgba(255, 255, 255, 0.08)",
      boxShadow: "inset 0 1px 0.5px rgba(255, 255, 255, 0.2), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08)",
      border: "none",
      borderRadius: "16px",
      color: "rgba(255, 255, 255, 0.75)",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "11px",
      padding: "6px 14px",
      cursor: "pointer",
      zIndex: "20",
      transition: "all 0.15s ease",
    });
    skipBtn.addEventListener("mouseenter", () => (skipBtn.style.color = "#ffffff"));
    skipBtn.addEventListener("click", () => this._finishLaunch());
    this.container.appendChild(skipBtn);
  }

  private _initWebGL(): void {
    const gl = this.canvas.getContext("webgl2") as WebGL2RenderingContext | null;
    if (!gl) {
      console.warn("WebGL 2.0 not supported, fallback skipping shader.");
      return;
    }
    this.gl = gl;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT_SHADER);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG_SHADER);
    if (!vs || !fs) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return;
    }

    this.program = prog;
    gl.useProgram(prog);

    // Fullscreen quad
    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    const verts = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    const locPos = gl.getAttribLocation(prog, "position");
    gl.enableVertexAttribArray(locPos);
    gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(prog, "time");
    const resLoc = gl.getUniformLocation(prog, "resolution");

    const resize = () => {
      const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.uniform2f(resLoc, this.canvas.width, this.canvas.height);
    };

    window.addEventListener("resize", resize);
    resize();

    this.startTime = performance.now();
    const render = (now: number) => {
      if (this.destroyed) return;
      this.rafId = requestAnimationFrame(render);

      const elapsed = (now - this.startTime) * 0.001 * this.speed;
      gl.useProgram(prog);
      gl.uniform1f(timeLoc, elapsed);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    this.rafId = requestAnimationFrame(render);
  }

  private _startCinematicTimeline(): void {
    // Fade in overlay smoothly
    requestAnimationFrame(() => {
      this.container.style.opacity = "1";
    });

    const rocketBox = document.getElementById("warp-rocket-box");
    const velEl = document.getElementById("warp-velocity");
    const factorEl = document.getElementById("warp-factor");

    let progress = 0;
    const interval = setInterval(() => {
      if (this.destroyed) {
        clearInterval(interval);
        return;
      }
      progress += 0.05;

      // Accelerate shader speed smoothly
      this.speed = 1.2 + progress * 2.5;

      // Update telemetry readouts
      const warpFactor = (1.0 + progress * 2.8).toFixed(2);
      const velocity = Math.round(42000 + progress * 150000);
      if (velEl) velEl.textContent = `${velocity.toLocaleString()} KM/H`;
      if (factorEl) factorEl.textContent = `${warpFactor} c`;

      // Subtle rocket vibration
      if (rocketBox) {
        const shakeX = (Math.random() - 0.5) * 4;
        const shakeY = (Math.random() - 0.5) * 4;
        rocketBox.style.transform = `translate(calc(-50% + ${shakeX}px), calc(-50% + ${shakeY}px)) scale(${1 + progress * 0.15})`;
      }

      // At 4.5 seconds: rocket accelerates into the warp center
      if (progress >= 3.8 && rocketBox) {
        rocketBox.style.transition = "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s ease";
        rocketBox.style.transform = "translate(-50%, -50%) scale(0.1)";
        rocketBox.style.opacity = "0";
      }

      // Finish sequence after 5.2 seconds
      if (progress >= 5.0) {
        clearInterval(interval);
        this._finishLaunch();
      }
    }, 100);
  }

  private _finishLaunch(): void {
    // Flash white for hyperspace exit
    const flash = document.createElement("div");
    Object.assign(flash.style, {
      position: "fixed",
      inset: "0",
      background: "#ffffff",
      opacity: "0",
      zIndex: "4000",
      pointerEvents: "none",
      transition: "opacity 0.5s ease",
    });
    document.body.appendChild(flash);

    requestAnimationFrame(() => {
      flash.style.opacity = "0.9";
      setTimeout(() => {
        this.destroy();
        flash.style.opacity = "0";
        setTimeout(() => flash.remove(), 600);
        this.options.onComplete();
      }, 500);
    });
  }
}
