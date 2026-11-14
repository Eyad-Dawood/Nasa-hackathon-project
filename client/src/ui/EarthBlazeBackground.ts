/**
 * EarthBlazeBackground.ts
 * ────────────────────────
 * NASA Blue Marble interactive WebGL background.
 * Renders Earth horizon at dusk, atmospheric rim scattering, procedural star field,
 * dynamic FBM nebula dust, and interactive solar/auroral pulse effects.
 *
 * Integrated as a seamless background for the Lobby and Sign-in phases.
 */

import { assetUrl } from "../config/basePath";

const EARTH_TEXTURE_LOCAL = assetUrl("/assets/earth_blue_marble.jpg");
const EARTH_TEXTURE_FALLBACK = "https://cdn.21st.dev/assets/mirror/97/9743175942473681d78838ca1042553dab4779cf957fb6d8f22a81fb796f7797.jpg";

export interface EarthBlazeOptions {
  starCount?: number;
  galaxyBrightness?: number;
  surfaceBrightness?: number;
  auroraColor?: string;
  backgroundColor?: string;
  illumination?: number;
  auroraPreview?: boolean;
  auroraEnabled?: boolean;
  interactive?: boolean;
  textureUrl?: string;
  reducedMotion?: boolean;
}

type Color = [number, number, number, number];
type Uniforms = Record<string, WebGLUniformLocation | null>;
type Geometry = { center: [number, number]; radius: number; low: number; high: number; rest: number };

type ResolvedOptions = {
  starCount: number;
  galaxyBrightness: number;
  surfaceBrightness: number;
  illumination: number;
  auroraColor: Color;
  backgroundColor: Color;
  auroraPreview: boolean;
  auroraEnabled: boolean;
  interactive: boolean;
  textureUrl: string;
  reducedMotion?: boolean;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const finite = (n: number, fallback: number, max: number) => clamp(Number.isFinite(n) ? n : fallback, 0, max);

function parseColor(value?: string): Color {
  if (!value || !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value)) return [0, 0, 0, 0];
  const hex = value.length === 4 ? value.slice(1).split("").map(c => c + c).join("") : value.slice(1);
  return [parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255, 1];
}

const vertexShaderSource = `
  attribute vec2 position;
  void main() { gl_Position = vec4(position, 0., 1.); }
`;

const fragmentShaderSource = `
  precision highp float;
  uniform vec2 resolution;
  uniform vec2 center;
  uniform float radius;
  uniform float angle;
  uniform float reveal;
  uniform float galaxyBrightness;
  uniform float surfaceBrightness;
  uniform vec4 auroraColor;
  uniform vec4 backgroundColor;
  uniform float illumination;
  uniform float auroraPreview;
  uniform float viewAngle;
  uniform float clock;
  uniform float charge;
  uniform float pulse;
  uniform float pulseAngle;
  uniform float still;
  uniform vec2 drift;
  uniform sampler2D earth;
  uniform sampler2D cosmos;
  const float PI = 3.141592653589793;

  float gauss(float x, float width) { return exp(-x * x / (width * width)); }
  float grain(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(.06711056, .00583715)))); }
  mat2 rotate(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }

  vec3 orientGlobe(vec2 xy) {
    vec3 n = vec3(xy.x, -xy.y, sqrt(max(0., 1. - dot(xy, xy))));
    n.xy = rotate(-2.30267 - viewAngle) * n.xy;
    n.xz = rotate(2.70) * n.xz;
    n.xy = rotate(-.08) * n.xy;
    return n;
  }
  vec2 geography(vec3 n) {
    return vec2(atan(-n.z, n.x), asin(clamp(n.y, -1., 1.)));
  }
  vec3 recolor(vec3 source, vec4 tint) {
    return mix(source, tint.rgb * max(source.r, max(source.g, source.b)), tint.a);
  }
  void main() {
    vec2 p = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y) / resolution.y;
    vec2 q = p - center;
    float distanceToCenter = length(q);
    float d = distanceToCenter - radius;
    float pixel = 1. / resolution.y;
    vec2 radial = vec2(cos(angle), sin(angle));
    vec2 tangent = vec2(-radial.y, radial.x);
    vec2 sun = center + radial * (radius - .007);
    vec2 delta = p - sun;
    float along = dot(delta, tangent);
    float across = dot(delta, radial);
    float angleDistance = acos(clamp(dot(q / max(distanceToCenter, .0001), radial), -1., 1.)) * radius;
    float space = smoothstep(-pixel, pixel, d);
    float inside = 1. - space;
    float verticalFade = smoothstep(.005, .13, p.y) * (1. - smoothstep(.86, 1.02, p.y));
    float rimLocal = gauss(angleDistance, .34);

    float event = max(pulse, 0.);
    float bloom = smoothstep(0., .32, event) * (1. - smoothstep(1.4, 4.8, event)) * step(0., pulse);
    bloom = max(max(bloom, charge * still * .65), auroraPreview * .75);
    vec2 sky = p - drift * .007;
    vec2 lens = sky - sun;
    float bend = charge * exp(-dot(lens, lens) / .32) * (1. - still);
    sky = sun + rotate(-bend * .46) * lens / (1. - bend * .20);
    vec2 skyUV = vec2(sky.x / (resolution.x / resolution.y), 1. - sky.y);
    vec3 color = recolor(texture2D(cosmos, skyUV).rgb, backgroundColor) * galaxyBrightness * space * (1. + charge * .45 + bloom * .5);

    vec3 halo = vec3(.105, .026, .065) * gauss(along, .23) * gauss(across, .11);
    halo += vec3(.21, .066, .072) * gauss(along, .12) * gauss(across, .061);
    halo += vec3(.29, .16, .125) * gauss(along, .057) * gauss(across, .033);
    halo += vec3(.57, .48, .40) * gauss(along, .025) * gauss(across, .020);
    color += halo * illumination * space * (1. + charge * 1.4 + bloom * .65);

    float line = gauss(d, max(.00042, pixel * .66));
    vec3 rim = mix(vec3(.105, .135, .18), vec3(.85, .64, .48), rimLocal);
    color += rim * illumination * line * verticalFade;
    color += vec3(.20, .078, .06) * illumination * gauss(d, .003) * rimLocal * verticalFade;
    color += vec3(.034, .057, .092) * illumination * exp(-max(d, 0.) / .007) * space * verticalFade * (.2 + .8 * rimLocal);

    vec2 eventRadial = vec2(cos(pulseAngle), sin(pulseAngle));
    float eventDistance = acos(clamp(dot(q / max(distanceToCenter, .0001), eventRadial), -1., 1.)) * radius;
    float sweep = gauss(eventDistance - event * .31, .14);
    sweep = max(sweep, auroraPreview * .8);
    float curtainPhase = atan(q.y, q.x);
    float pleats = .5 + .5 * sin(curtainPhase * 185. + 3. * sin(curtainPhase * 37.) + clock * .23);
    float ceiling = .021 + .020 * sin(curtainPhase * 23. + clock * .11);
    float curtain = exp(-abs(d - ceiling) / .025) * (.25 + .75 * pleats);
    vec3 aurora = mix(vec3(.065, .54, .40), vec3(.36, .13, .59), .5 + .5 * sin(curtainPhase * 12.));
    color += recolor(aurora, auroraColor) * curtain * bloom * (.20 + sweep * .70) * verticalFade;
    color += recolor(vec3(.22, .55, .63), auroraColor) * gauss(d, .0025) * sweep * bloom * verticalFade;

    float waveRadius = .025 + event * .32;
    float wave = gauss(length(p - (center + eventRadial * (radius - .007))) - waveRadius, .010 + event * .004);
    color += recolor(mix(vec3(.20, .36, .57), vec3(.36, .16, .33), .5 + .5 * sin(atan(delta.y, delta.x) * 3.)), auroraColor) * wave * bloom * .25 * space * (1. - still);

    if (d < 0.) {
      vec3 normal = orientGlobe(q / radius);
      vec2 geo = geography(normal);
      vec2 uv = vec2(.5) + geo / vec2(2. * PI, PI);
      vec3 tex = texture2D(earth, uv).rgb;
      float depth = -d;
      float grazing = smoothstep(.002, .033, depth) * exp(-depth / .19);
      float pool = max(gauss(angleDistance, .37), bloom * gauss(eventDistance, .65)) * grazing;
      vec3 surface = mix(tex, vec3(dot(tex, vec3(.2126, .7152, .0722))), .32);
      surface *= vec3(.61, .74, 1.);
      color += surface * pool * (.045 + reveal * .24 + bloom * .20 + charge * .045) * inside * surfaceBrightness * illumination;
      color += vec3(.010, .018, .032) * pool * (reveal + bloom) * inside * surfaceBrightness * illumination;
    }

    float light = max(color.r, max(color.g, color.b));
    color += (grain(gl_FragCoord.xy) - .5) / 255. * smoothstep(.001, .015, light);
    gl_FragColor = vec4(clamp(color, 0., 1.), 1.);
  }
`;

const nebulaFragmentSource = `
  precision highp float;
  uniform vec2 resolution;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float f = 0., a = .5;
    for (int i = 0; i < 6; i++) { f += a * noise(p); p = mat2(.8, -.6, .6, .8) * p * 2.07 + 17.3; a *= .5; }
    return f;
  }
  void main() {
    vec2 uv = vec2(gl_FragCoord.x / resolution.x, 1. - gl_FragCoord.y / resolution.y);
    vec2 p = uv * vec2(2.1, 1.);
    vec2 warp = vec2(fbm(p * 3.1), fbm(p * 3.1 + 9.7));
    float gas = fbm(p * 7. + warp * 4.);
    float lace = fbm(p * 23. + warp * 7.);
    float rift = abs(uv.y - (.58 - uv.x * .65 + .065 * sin(uv.x * 7.)) + (gas - .5) * .19);
    float band = exp(-pow(rift / .15, 2.));
    float dust = smoothstep(.28, .68, fbm(p * 11. + warp * 5. + 30.));
    float clouds = pow(gas, 2.3) * (.28 + lace * 1.1) * band;
    vec3 cold = mix(vec3(.018, .13, .26), vec3(.28, .045, .16), smoothstep(.14, .80, warp.x));
    cold = mix(cold, vec3(.022, .22, .18), smoothstep(.47, .66, warp.y) * .65);
    vec3 col = cold * clouds * (1. - dust * .82) * 2.4;
    col += vec3(.08, .10, .15) * pow(lace, 4.) * band * .50;
    col += vec3(.005, .007, .014) * pow(fbm(p * 4. + 80.), 2.);
    float speck = pow(hash(gl_FragCoord.xy), 34.) * band * .029;
    col += vec3(.7, .8, 1.) * speck;
    gl_FragColor = vec4(col, 1.);
  }
`;

const starVertexSource = `
  precision highp float;
  attribute vec4 star;
  attribute float tail;
  uniform vec2 resolution;
  uniform vec2 center;
  uniform vec2 drift;
  uniform float radius;
  uniform float angle;
  uniform float charge;
  uniform float clock;
  uniform float pulse;
  uniform float pulseAngle;
  uniform float still;
  varying vec3 tint;
  varying float alpha;
  varying float sharp;
  varying vec2 location;
  mat2 rotate(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }
  void main() {
    vec2 p = star.xy * vec2(resolution.x / resolution.y, 1.);
    p += drift * (.003 + star.w * .009) * (1. - still);
    vec2 sun = center + vec2(cos(angle), sin(angle)) * (radius - .007);
    vec2 delta = p - sun;
    float attraction = exp(-dot(delta, delta) / .40);
    float c = max(0., charge - tail * .026) * (1. - still);
    p = sun + rotate(c * .46 * attraction) * delta * (1. - c * .20 * attraction);
    float e = max(pulse, 0.);
    vec2 eventDelta = p - (center + vec2(cos(pulseAngle), sin(pulseAngle)) * (radius - .007));
    float impulse = exp(-pow((length(eventDelta) - e * .32) / .07, 2.)) * (1. - smoothstep(2., 4.8, e)) * step(0., pulse) * (1. - still);
    p += (eventDelta / max(length(eventDelta), .0001)) * impulse * .004;
    location = p;
    gl_Position = vec4(p.x / (resolution.x / resolution.y) * 2. - 1., 1. - p.y * 2., 0., 1.);
    sharp = step(.988, star.w);
    gl_PointSize = mix(star.z, 20. + star.w * 8., sharp) * max(1., resolution.y / 900.);
    float twinkle = .82 + .18 * sin(clock * (.45 + star.w) + star.w * 123.);
    alpha = (.24 + star.w * .58 + sharp * .55) * twinkle;
    alpha *= tail < .5 ? 1. : charge * (1. - tail / 7.) * .19 * (1. - still);
    alpha *= 1. + impulse * .8;
    tint = mix(vec3(.49, .70, 1.), vec3(1., .69, .49), smoothstep(.32, .90, fract(star.w * 13.7)));
    tint = mix(tint, vec3(.93, .77, 1.), step(.87, fract(star.w * 7.)));
  }
`;

const starFragmentSource = `
  precision highp float;
  uniform vec2 center;
  uniform float radius;
  varying vec3 tint;
  varying float alpha;
  varying float sharp;
  varying vec2 location;
  void main() {
    float sky = smoothstep(.001, .004, length(location - center) - radius);
    vec2 p = gl_PointCoord - .5;
    float r = length(p);
    float ordinary = exp(-r * r * 23.);
    float core = exp(-r * r * 2100.);
    float rays = exp(-abs(p.x) * 260. - abs(p.y) * 13.) + exp(-abs(p.y) * 260. - abs(p.x) * 13.);
    float jewel = core * 2. + rays * .65 + exp(-r * r * 55.) * .035;
    gl_FragColor = vec4(tint * mix(ordinary, jewel, sharp), alpha * sky);
  }
`;

function createRenderer(canvas: HTMLCanvasElement, fallback: HTMLDivElement, initial: ResolvedOptions) {
  const context = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, powerPreference: "low-power" });
  if (!context) {
    canvas.hidden = true;
    canvas.style.visibility = "hidden";
    fallback.hidden = false;
    return { update: (_: ResolvedOptions) => {}, dispose: () => {}, pause: () => {}, resume: () => {} };
  }
  const gl = context;
  let options = initial;
  const media = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false } as MediaQueryList;
  const still = () => options.reducedMotion ?? media.matches;
  const resources: Array<() => void> = [];
  const subscriptions: Array<() => void> = [];
  let disposed = false, visible = true, paused = false, image: HTMLImageElement | null = null;
  let geometry: Geometry | undefined;
  let program: WebGLProgram, stars: WebGLProgram, buffer: WebGLBuffer, starBuffer: WebGLBuffer;
  let texture: WebGLTexture, cosmos: WebGLTexture, uniforms: Uniforms, starUniforms: Uniforms;
  let position = 0, starPosition = 0, starTail = 0;
  const state = {
    angle: 0, target: 0, reveal: 0, targetReveal: 0, charge: 0, holding: false,
    pulse: -1, pulseAngle: 0, clock: 0, drift: [0, 0] as [number, number], targetDrift: [0, 0] as [number, number],
    ready: false, frame: 0, last: 0, lost: false,
  };

  let userActiveUntil = 0;

  function listen(target: EventTarget, type: string, callback: (event: Event) => void) {
    target.addEventListener(type, callback);
    subscriptions.push(() => target.removeEventListener(type, callback));
  }
  function required<T>(resource: T | null): T {
    if (!resource) throw new Error("WebGL allocation failed");
    return resource;
  }
  function compile(type: number, source: string) {
    const shader = required(gl.createShader(type));
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      throw new Error("Shader compilation failed: " + gl.getShaderInfoLog(shader));
    }
    return shader;
  }
  function link(v: string, f: string) {
    const shaders: WebGLShader[] = [];
    const result = required(gl.createProgram());
    resources.push(() => gl.deleteProgram(result));
    try {
      shaders.push(compile(gl.VERTEX_SHADER, v));
      shaders.push(compile(gl.FRAGMENT_SHADER, f));
      for (const shader of shaders) gl.attachShader(result, shader);
      gl.linkProgram(result);
      if (!gl.getProgramParameter(result, gl.LINK_STATUS)) {
        throw new Error("Shader linking failed: " + gl.getProgramInfoLog(result));
      }
      return result;
    } finally {
      shaders.forEach(shader => gl.deleteShader(shader));
    }
  }
  function makeBuffer() {
    const b = required(gl.createBuffer());
    resources.push(() => gl.deleteBuffer(b));
    return b;
  }
  function makeTexture() {
    const t = required(gl.createTexture());
    resources.push(() => gl.deleteTexture(t));
    return t;
  }
  function locations(p: WebGLProgram, names: string[]): Uniforms {
    return Object.fromEntries(names.map(k => [k, gl.getUniformLocation(p, k)]));
  }
  function textureOptions() {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  function quad(p: WebGLProgram, at: number) {
    gl.useProgram(p);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
  }
  function clearResources() {
    while (resources.length) resources.pop()!();
  }
  function resetTexture() {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([5, 9, 16]));
    textureOptions();
  }
  function setup() {
    clearResources();
    state.ready = false;
    program = link(vertexShaderSource, fragmentShaderSource);
    position = gl.getAttribLocation(program, "position");
    uniforms = locations(program, [
      "resolution", "center", "radius", "angle", "reveal", "viewAngle", "earth", "cosmos",
      "clock", "charge", "pulse", "pulseAngle", "still", "drift", "galaxyBrightness",
      "surfaceBrightness", "auroraColor", "backgroundColor", "illumination", "auroraPreview",
    ]);
    buffer = makeBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const nebula = link(vertexShaderSource, nebulaFragmentSource);
    cosmos = makeTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, cosmos);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1536, 1024, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    textureOptions();
    const framebuffer = required(gl.createFramebuffer());
    try {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, cosmos, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("Incomplete framebuffer");
      quad(nebula, gl.getAttribLocation(nebula, "position"));
      gl.viewport(0, 0, 1536, 1024);
      gl.uniform2f(gl.getUniformLocation(nebula, "resolution"), 1536, 1024);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } finally {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.deleteFramebuffer(framebuffer);
    }
    texture = makeTexture();
    resetTexture();

    stars = link(starVertexSource, starFragmentSource);
    starPosition = gl.getAttribLocation(stars, "star");
    starTail = gl.getAttribLocation(stars, "tail");
    starUniforms = locations(stars, ["resolution", "center", "radius", "angle", "clock", "charge", "pulse", "pulseAngle", "still", "drift"]);
    starBuffer = makeBuffer();
    updateStars();
    state.ready = true;
    canvas.hidden = false;
    canvas.style.visibility = "visible";
    if (image?.complete && image.naturalWidth) uploadTexture(image);
  }
  function updateStars() {
    let seed = 428731;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const data = new Float32Array(options.starCount * 35);
    let at = 0;
    for (let i = 0; i < options.starCount; i++) {
      const x = random(), y = random(), size = 1 + Math.pow(random(), 2.4) * 2.6, identity = random();
      for (let tail = 0; tail < 7; tail++) { data.set([x, y, size, identity, tail], at); at += 5; }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, starBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  }
  function uploadTexture(earthImage: HTMLImageElement) {
    try {
      let source: TexImageSource = earthImage;
      const limit = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), 4096);
      if (Math.max(earthImage.width, earthImage.height) > limit) {
        const small = document.createElement("canvas");
        const ratio = limit / Math.max(earthImage.width, earthImage.height);
        small.width = Math.max(1, Math.round(earthImage.width * ratio));
        small.height = Math.max(1, Math.round(earthImage.height * ratio));
        required(small.getContext("2d")).drawImage(earthImage, 0, 0, small.width, small.height);
        source = small;
      }
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
      canvas.dataset.texture = "ready";
    } catch {
      resetTexture();
      canvas.dataset.texture = "unavailable";
    }
    requestFrame();
  }
  function loadTexture() {
    if (image) { image.onload = null; image.onerror = null; }
    image = null;
    if (state.ready && !state.lost) resetTexture();
    canvas.dataset.texture = "loading";
    if (!options.textureUrl) { canvas.dataset.texture = "unavailable"; return; }
    const pending = new Image();
    image = pending;
    pending.crossOrigin = "anonymous";
    pending.onload = () => {
      if (!disposed && image === pending && state.ready && !state.lost) uploadTexture(pending);
    };
    pending.onerror = () => {
      // Fallback to CDN if local URL failed
      if (pending.src !== EARTH_TEXTURE_FALLBACK) {
        pending.src = EARTH_TEXTURE_FALLBACK;
      } else if (!disposed && image === pending) {
        canvas.dataset.texture = "unavailable";
      }
    };
    pending.src = options.textureUrl;
  }
  function resize() {
    if (state.lost || disposed) return;
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) { stop(); return; }
    const aspect = box.width / box.height;
    const maxSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(3000000 / (box.width * box.height)), maxSize / box.width, maxSize / box.height);
    canvas.width = Math.max(1, Math.round(box.width * dpr));
    canvas.height = Math.max(1, Math.round(box.height * dpr));
    const p = [.15 * aspect, .91], q = [.88 * aspect, .015];
    const vx = q[0] - p[0], vy = q[1] - p[1], length = Math.hypot(vx, vy);
    const radius = Math.max(1.4, aspect), offset = Math.sqrt(radius * radius - length * length / 4);
    const center: [number, number] = [(p[0] + q[0]) / 2 - vy / length * offset, (p[1] + q[1]) / 2 + vx / length * offset];
    const low = Math.atan2(p[1] - center[1], p[0] - center[0]) + .035;
    const high = Math.atan2(q[1] - center[1], q[0] - center[0]) - .035;
    const restingY = .4 - center[1];
    const rest = Math.atan2(restingY, -Math.sqrt(radius * radius - restingY * restingY));
    if (geometry) { state.angle += rest - geometry.rest; state.target += rest - geometry.rest; }
    else state.angle = state.target = rest;
    geometry = { center, radius, low, high, rest };
    state.angle = clamp(state.angle, low, high);
    state.target = clamp(state.target, low, high);
    requestFrame();
  }
  function stop() {
    cancelAnimationFrame(state.frame);
    state.frame = 0;
    state.last = 0;
  }
  function requestFrame() {
    if (!state.frame && !disposed && !paused && visible && !document.hidden && !state.lost && state.ready && geometry) {
      state.frame = requestAnimationFrame(draw);
    }
  }
  function common(u: Uniforms) {
    const g = geometry!;
    gl.uniform2f(u.resolution, canvas.width, canvas.height);
    gl.uniform2f(u.center, g.center[0], g.center[1]);
    gl.uniform1f(u.radius, g.radius);
    gl.uniform1f(u.angle, state.angle);
    gl.uniform1f(u.clock, still() ? 0 : state.clock);
    gl.uniform1f(u.charge, state.charge);
    gl.uniform1f(u.pulse, still() ? -1 : state.pulse);
    gl.uniform1f(u.still, still() ? 1 : 0);
    gl.uniform1f(u.pulseAngle, state.pulseAngle);
    gl.uniform2f(u.drift, still() ? 0 : state.drift[0], still() ? 0 : state.drift[1]);
  }
  function draw(now: number) {
    state.frame = 0;
    if (disposed || paused || state.lost || !visible || document.hidden || !geometry) return;

    const dt = Math.min((now - (state.last || now - 16)) / 1000, .05);
    state.last = now;
    state.clock += dt;

    // Autonomous orbital motion across the limb when user is not manually interacting
    if (now > userActiveUntil && !state.holding) {
      const orbitTime = state.clock * 0.12;
      const span = (geometry.high - geometry.low) * 0.45;
      const mid = (geometry.low + geometry.high) * 0.5;
      state.target = mid + Math.sin(orbitTime) * span;
      state.targetReveal = 0.28 + 0.16 * Math.cos(orbitTime * 0.7);
      state.targetDrift = [
        Math.sin(orbitTime * 0.5) * 0.05,
        Math.cos(orbitTime * 0.35) * 0.03,
      ];
    }

    const movement = still() ? 1 : 1 - Math.exp(-dt / .35);
    const exposure = still() ? 1 : 1 - Math.exp(-dt / (state.targetReveal > state.reveal ? .8 : .48));
    state.angle += (state.target - state.angle) * movement;
    state.reveal += (state.targetReveal - state.reveal) * exposure;
    state.charge += ((state.holding ? 1 : 0) - state.charge) * (still() ? 1 : 1 - Math.exp(-dt / (state.holding ? .68 : .5)));
    state.drift = [
      state.drift[0] + (state.targetDrift[0] - state.drift[0]) * movement * .5,
      state.drift[1] + (state.targetDrift[1] - state.drift[1]) * movement * .5,
    ];
    if (state.pulse >= 0) {
      state.pulse += dt;
      if (state.pulse > 5) state.pulse = -1;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.disable(gl.BLEND);
    gl.disableVertexAttribArray(starTail);
    quad(program, position);
    common(uniforms);
    gl.uniform1f(uniforms.reveal, state.reveal);
    gl.uniform1f(uniforms.viewAngle, geometry.rest);
    gl.uniform1f(uniforms.galaxyBrightness, options.galaxyBrightness);
    gl.uniform1f(uniforms.surfaceBrightness, options.surfaceBrightness);
    gl.uniform4f(uniforms.auroraColor, options.auroraColor[0], options.auroraColor[1], options.auroraColor[2], options.auroraColor[3]);
    gl.uniform4f(uniforms.backgroundColor, options.backgroundColor[0], options.backgroundColor[1], options.backgroundColor[2], options.backgroundColor[3]);
    gl.uniform1f(uniforms.illumination, options.illumination);
    gl.uniform1f(uniforms.auroraPreview, options.auroraPreview && options.auroraEnabled ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uniforms.earth, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, cosmos);
    gl.uniform1i(uniforms.cosmos, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.useProgram(stars);
    common(starUniforms);
    gl.bindBuffer(gl.ARRAY_BUFFER, starBuffer);
    gl.enableVertexAttribArray(starPosition);
    gl.enableVertexAttribArray(starTail);
    gl.vertexAttribPointer(starPosition, 4, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(starTail, 1, gl.FLOAT, false, 20, 16);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.drawArrays(gl.POINTS, 0, options.starCount * 7);
    gl.disable(gl.BLEND);

    canvas.dataset.status = "ready";
    fallback.hidden = true;
    if (!still()) requestFrame();
  }
  function point(event: PointerEvent) {
    userActiveUntil = performance.now() + 4000;
    if (!geometry) return;
    const box = canvas.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.height - geometry.center[0];
    const y = (event.clientY - box.top) / box.height - geometry.center[1];
    let angle = Math.atan2(y, x);
    if (angle > 0) angle -= Math.PI * 2;
    state.target = clamp(angle, geometry.low, geometry.high);
    const distance = Math.hypot(x, y) - geometry.radius;
    state.targetReveal = Math.exp(-Math.pow((angle - geometry.rest) / .15, 2)) * Math.exp(-Math.pow((distance + .015) / .12, 2));
    state.targetDrift = [(event.clientX - box.left) / box.width - .5, (event.clientY - box.top) / box.height - .5];
    requestFrame();
  }
  function release(celebrate = true) {
    if (state.holding && state.charge > .42 && celebrate && !still() && options.auroraEnabled) {
      state.pulse = 0;
      state.pulseAngle = state.angle;
    }
    state.holding = false;
    requestFrame();
  }
  function rest() {
    release(false);
    state.target = geometry?.rest ?? 0;
    state.targetReveal = 0;
    state.targetDrift = [0, 0];
    requestFrame();
  }
  function pointer(type: string, fn: (event: PointerEvent) => void) {
    listen(canvas, type, event => { if (options.interactive && geometry) fn(event as PointerEvent); });
  }
  pointer("pointermove", e => { if (e.isPrimary) point(e); });
  pointer("pointerdown", e => {
    if (!e.isPrimary || e.button !== 0) return;
    canvas.setPointerCapture(e.pointerId);
    canvas.focus({ preventScroll: true });
    state.holding = options.auroraEnabled;
    point(e);
    state.pulseAngle = state.target;
  });
  pointer("pointerup", e => {
    if (!e.isPrimary) return;
    release();
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    if (e.pointerType !== "mouse") state.targetReveal = 0;
  });
  pointer("pointercancel", rest);
  pointer("lostpointercapture", () => release(false));
  pointer("pointerleave", e => { if (e.pointerType !== "touch" && !canvas.hasPointerCapture(e.pointerId)) rest(); });

  listen(canvas, "keydown", event => {
    const e = event as KeyboardEvent;
    if (!options.interactive || !geometry || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Enter", "Escape", "Home"].includes(e.key)) return;
    e.preventDefault();
    if (e.key === "ArrowRight" || e.key === "ArrowUp") state.target = clamp(state.target + .022, geometry.low, geometry.high);
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") state.target = clamp(state.target - .022, geometry.low, geometry.high);
    if (e.key === " ") state.targetReveal = 1;
    if (e.key === "Enter" && options.auroraEnabled) { state.holding = true; state.pulseAngle = state.angle; }
    if (e.key === "Escape" || e.key === "Home") { state.pulse = -1; rest(); }
    requestFrame();
  });
  listen(canvas, "keyup", event => {
    const e = event as KeyboardEvent;
    if (e.key === "Enter") release();
    if (e.key === " ") { state.targetReveal = 0; requestFrame(); }
  });
  listen(canvas, "blur", rest);
  listen(window, "blur", rest);
  if (media && "addEventListener" in media) {
    listen(media, "change", () => { state.pulse = -1; state.last = 0; requestFrame(); });
  }
  listen(document, "visibilitychange", () => {
    if (document.hidden) { state.holding = false; stop(); }
    else requestFrame();
  });
  function fail() {
    state.ready = false;
    stop();
    canvas.hidden = true;
    canvas.style.visibility = "hidden";
    fallback.hidden = false;
    canvas.dataset.status = "fallback";
    clearResources();
  }
  listen(canvas, "webglcontextlost", event => {
    event.preventDefault();
    state.lost = true;
    state.ready = false;
    state.holding = false;
    state.charge = 0;
    state.pulse = -1;
    stop();
    resources.length = 0;
    canvas.hidden = true;
    canvas.style.visibility = "hidden";
    fallback.hidden = false;
  });
  listen(canvas, "webglcontextrestored", () => {
    state.lost = false;
    try { setup(); resize(); } catch { fail(); }
  });
  const resizeObserver = new ResizeObserver(resize);
  const intersection = new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? false;
    if (visible && !paused) { state.last = 0; requestFrame(); }
    else { state.holding = false; stop(); }
  });
  resizeObserver.observe(canvas);
  intersection.observe(canvas);
  listen(window, "resize", resize);

  try { setup(); resize(); loadTexture(); } catch { fail(); }

  return {
    update(next: ResolvedOptions) {
      const previous = options;
      options = next;
      if (!options.interactive || !options.auroraEnabled) { state.holding = false; state.charge = 0; state.pulse = -1; }
      if (!options.interactive) rest();
      if (previous.reducedMotion !== options.reducedMotion) state.pulse = -1;
      if (previous.starCount !== options.starCount && state.ready && !state.lost) updateStars();
      if (previous.textureUrl !== options.textureUrl) loadTexture();
      state.last = 0;
      requestFrame();
    },
    pause() {
      paused = true;
      stop();
    },
    resume() {
      if (!paused) return;
      paused = false;
      state.last = 0;
      requestFrame();
    },
    dispose() {
      disposed = true;
      stop();
      resizeObserver.disconnect();
      intersection.disconnect();
      subscriptions.forEach(unsubscribe => unsubscribe());
      if (image) { image.onload = null; image.onerror = null; image = null; }
      clearResources();
    },
  };
}

/**
 * Singleton manager for the full-screen Earth Blaze WebGL background.
 */
export class EarthBlazeBackground {
  private static instance: EarthBlazeBackground | null = null;
  private container: HTMLDivElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private fallback: HTMLDivElement | null = null;
  private renderer: ReturnType<typeof createRenderer> | null = null;
  private isVisible: boolean = false;

  private constructor() {}

  public static get(): EarthBlazeBackground {
    if (!EarthBlazeBackground.instance) {
      EarthBlazeBackground.instance = new EarthBlazeBackground();
    }
    return EarthBlazeBackground.instance;
  }

  public init(_customOptions: EarthBlazeOptions = {}): void {
    if (this.container) return; // already initialized

    // Main background container — 100% lightweight static high-performance wallpaper
    this.container = document.createElement("div");
    this.container.id = "earth-blaze-bg";
    Object.assign(this.container.style, {
      position: "fixed",
      inset: "0",
      width: "100vw",
      height: "100vh",
      overflow: "hidden",
      backgroundColor: "#020308",
      backgroundImage: `url('${assetUrl("/assets/landing_space_earth_bg.jpg")}')`,
      backgroundSize: "cover",
      backgroundPosition: "center top",
      backgroundRepeat: "no-repeat",
      zIndex: "0",
      isolation: "isolate",
      opacity: "1",
      transition: "opacity 0.5s ease",
    });

    // Space Benders Brand Logo (Top-Left corner)
    const logo = document.createElement("img");
    logo.id = "space-benders-logo";
    logo.src = assetUrl("/assets/space_benders_logo.png");
    logo.alt = "Space Benders Logo";
    Object.assign(logo.style, {
      position: "absolute",
      top: "min(4vh, 32px)",
      left: "min(4vw, 40px)",
      width: "190px",
      maxWidth: "28vw",
      height: "auto",
      objectFit: "contain",
      pointerEvents: "none",
      zIndex: "2",
      userSelect: "none",
      filter: "drop-shadow(0 4px 20px rgba(0, 0, 0, 0.75))",
      transition: "opacity 0.4s ease",
    });
    this.container.appendChild(logo);

    // Prepend to body so it sits behind everything else
    document.body.prepend(this.container);

    this.isVisible = true;
  }

  public show(): void {
    if (!this.container) return;
    this.container.style.opacity = "1";
    this.container.style.pointerEvents = "auto";
    this.isVisible = true;
  }

  public hide(): void {
    if (!this.container) return;
    this.container.style.opacity = "0";
    this.container.style.pointerEvents = "none";
    this.isVisible = false;
  }

  public destroy(): void {
    this.container?.remove();
    this.container = null;
    this.canvas = null;
    this.fallback = null;
    this.isVisible = false;
    EarthBlazeBackground.instance = null;
  }
}
