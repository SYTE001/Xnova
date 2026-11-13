/**
 * Black Hole Intro Overlay ("Event Horizon") & Singularity Crossing Transition
 * Preserves all WebGL Schwarzschild raymarching optimizations, DPR cap (1.5),
 * adaptive resolution, visibility pause, Canvas 2D fallback, and reduced-motion.
 */

const CONFIG = {
  // Timeline (seconds)
  STAR_FADE_START: 0.15,
  STAR_FADE_END: 1.25,
  PUSH_START: 1.2,
  PUSH_END: 4.5,
  TEXT_REVEAL_TIME: 3.0,
  AUTO_ENTER_TIME: 4.8,
  SETTLE_TIME: 9.0,

  // Black hole & accretion disk
  LENSING_STRENGTH: 1.0,
  DISK_BRIGHTNESS: 1.35,
  DISK_INNER_RADIUS: 2.15,
  DISK_OUTER_RADIUS: 8.8,
  DISK_ROTATION_SPEED: 0.42,
  DOPPLER_STRENGTH: 0.72,
  PHOTON_RING_INTENSITY: 0.95,

  // Starfield & atmosphere
  STAR_DENSITY: 1.0,
  DUST_BAND_INTENSITY: 0.11,
  GRAIN_INTENSITY: 0.030,
  VIGNETTE_STRENGTH: 0.42,

  // Camera & parallax
  CAM_DIST_START: 22.0,
  CAM_DIST_END: 8.4,
  CAM_DIST_PLUNGE: 1.1,
  CAM_INCLINATION: 0.18,
  PARALLAX_DEGREES: 4.5,
  PARALLAX_LERP: 0.055,

  // Performance & adaptive resolution
  MAX_DPR: 1.5,
  FRAME_TIME_BUDGET_MS: 20.0,
  MIN_RENDER_SCALE: 0.5,
  RENDER_SCALE_STEP: 0.1,
  FPS_SAMPLE_COUNT: 10,

  // Singularity Crossing transition timings (ms)
  PLUNGE_DURATION_MS: 450,
  WIPE_START_MS: 400,
  STAGE1_MS: 800,
  STAGE2_MS: 880,
  STAGE3_MS: 960,
  CLEANUP_MS: 1380,
};

const VERT_SRC = `
  attribute vec2 aPos;
  void main() {
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

const FRAG_SRC = `
  #ifdef GL_ES
  precision highp float;
  #endif

  uniform vec2 uRes;
  uniform float uTime;
  uniform float uStarFade;
  uniform float uHoleReveal;
  uniform float uLensing;
  uniform float uCamDist;
  uniform float uCamInc;
  uniform vec2 uParallax;

  uniform float uDiskBrightness;
  uniform float uDiskInner;
  uniform float uDiskOuter;
  uniform float uDiskRotSpeed;
  uniform float uDoppler;
  uniform float uPhotonRing;
  uniform float uStarDensity;
  uniform float uDustIntensity;
  uniform float uGrainIntensity;
  uniform float uVignette;

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  vec3 hash33(vec3 p3) {
    p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yxz + 33.33);
    return fract((p3.xxy + p3.yxx) * p3.zyx);
  }

  float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm3(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
    for (int i = 0; i < 3; i++) {
      v += a * noise2D(p);
      p = rot * p * 2.07 + vec2(17.1, 31.7);
      a *= 0.5;
    }
    return v;
  }

  vec3 sampleBackground(vec3 dir, float starFade) {
    vec3 col = vec3(0.0117, 0.0117, 0.0157);

    vec3 bandNormal = normalize(vec3(0.28, 0.91, -0.30));
    float lat = dot(dir, bandNormal);
    float bandMask = exp(-lat * lat * 18.0);
    if (bandMask > 0.02 && starFade > 0.01) {
      vec2 bandUV = vec2(atan(dir.z, dir.x) * 2.2, lat * 6.0);
      float dustNoise = noise2D(bandUV * 2.6) * 0.65 + noise2D(bandUV * 6.2) * 0.35;
      float dust = bandMask * smoothstep(0.28, 0.85, dustNoise) * uDustIntensity * starFade;
      col += vec3(0.56, 0.54, 0.52) * dust;
    }

    if (starFade <= 0.005) return col;

    vec3 p1 = dir * 78.0;
    vec3 f1 = fract(p1) - 0.5;
    vec3 rnd1 = hash33(floor(p1));
    if (rnd1.x > 0.935 - 0.03 * uStarDensity) {
      float d = length(f1 - (rnd1 - 0.5) * 0.55);
      float appear = smoothstep(rnd1.y * 0.82, rnd1.y * 0.82 + 0.18, starFade);
      float twinkle = 0.88 + 0.12 * sin(uTime * (1.2 + rnd1.z * 2.4) + rnd1.y * 40.0);
      float br = exp(-d * d * 95.0) * (0.45 + 0.55 * rnd1.z) * appear * twinkle;
      vec3 tint = mix(vec3(0.95, 0.89, 0.82), vec3(0.84, 0.90, 1.0), rnd1.y);
      col += tint * br * 1.15;
    }

    vec3 p2 = dir * 152.0;
    vec3 f2 = fract(p2) - 0.5;
    vec3 rnd2 = hash33(floor(p2) + 19.7);
    if (rnd2.x > 0.90 - 0.04 * uStarDensity) {
      float d = length(f2 - (rnd2 - 0.5) * 0.6);
      float appear = smoothstep(rnd2.y * 0.85, rnd2.y * 0.85 + 0.15, starFade);
      float br = exp(-d * d * 110.0) * (0.2 + 0.45 * rnd2.z) * appear;
      col += vec3(0.90, 0.88, 0.86) * br * 0.65;
    }

    vec3 p3 = dir * 245.0;
    vec3 f3 = fract(p3) - 0.5;
    vec3 rnd3 = hash33(floor(p3) + 73.1);
    if (rnd3.x > 0.86 - 0.04 * uStarDensity) {
      float d = length(f3 - (rnd3 - 0.5) * 0.6);
      float appear = smoothstep(rnd3.y * 0.88, rnd3.y * 0.88 + 0.12, starFade);
      float br = exp(-d * d * 125.0) * (0.1 + 0.25 * rnd3.z) * appear;
      col += vec3(0.82, 0.82, 0.84) * br * 0.35;
    }

    return col;
  }

  vec4 sampleDisk(vec3 pHit, vec3 rayDir, float reveal) {
    float r2 = dot(pHit.xz, pHit.xz);
    if (r2 < uDiskInner * uDiskInner || r2 > uDiskOuter * uDiskOuter) return vec4(0.0);

    float r = sqrt(r2);
    float radialT = (r - uDiskInner) / (uDiskOuter - uDiskInner);
    float innerFade = smoothstep(uDiskInner, uDiskInner + 0.38, r);
    float outerFade = 1.0 - smoothstep(uDiskOuter - 2.2, uDiskOuter, r);
    float edgeMask = innerFade * outerFade;

    float angle = atan(pHit.z, pHit.x);
    float rSafe = max(r, 1.0);
    float omega = uDiskRotSpeed * (4.2 / (rSafe * sqrt(rSafe)));
    float rotAngle = angle + uTime * omega;

    float logR = log(r) * 3.4;
    vec2 uv1 = vec2(logR * 1.6 - rotAngle * 0.45, rotAngle * 2.0 + logR * 0.8);
    float n1 = fbm3(uv1);
    float n2 = noise2D(vec2(r * 1.9, rotAngle * 4.5 - uTime * 0.18));
    float rings = 0.55 + 0.45 * sin(r * 5.2 + n1 * 4.5);
    float density = edgeMask * mix(0.35, 1.0, n1 * 0.72 + n2 * 0.28) * mix(0.65, 1.15, rings);

    float invT = clamp(1.0 - radialT, 0.0, 1.0);
    float heat = invT * sqrt(invT);

    vec3 tangentVel = vec3(-pHit.z, 0.0, pHit.x) / r;
    float approach = clamp(-dot(tangentVel, rayDir), -1.0, 1.0);
    float orbitalSpeed = clamp(0.45 / sqrt(max(r * 0.5, 0.5)), 0.12, 0.68);
    float dopplerFactor = max(1.0 + approach * orbitalSpeed * uDoppler * 1.65, 0.25);
    float beaming = dopplerFactor * dopplerFactor * sqrt(dopplerFactor);

    vec3 deepEmber = vec3(0.42, 0.10, 0.02);
    vec3 emberOrange = vec3(0.88, 0.34, 0.08);
    vec3 paleGold = vec3(0.97, 0.78, 0.49);
    vec3 coolWhite = vec3(0.93, 0.96, 1.00);

    vec3 baseCol = mix(deepEmber, emberOrange, smoothstep(0.0, 0.45, heat));
    baseCol = mix(baseCol, paleGold, smoothstep(0.42, 0.92, heat));

    float whiteShift = smoothstep(0.18, 0.92, approach) * smoothstep(0.35, 0.95, heat);
    baseCol = mix(baseCol, coolWhite, whiteShift * 0.55);

    float recedeShift = smoothstep(0.1, 0.85, -approach);
    baseCol = mix(baseCol, deepEmber * 1.15, recedeShift * 0.38);

    vec3 finalCol = baseCol * beaming * (0.45 + 1.35 * heat) * uDiskBrightness * reveal;
    float alpha = clamp(density * (0.55 + 0.45 * heat) * reveal, 0.0, 0.96);

    return vec4(finalCol, alpha);
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);

    float yaw = uParallax.x * 0.085 + sin(uTime * 0.13) * 0.014;
    float pitch = uCamInc + uParallax.y * 0.055 + cos(uTime * 0.11) * 0.009;

    float cosP = cos(pitch);
    vec3 camPos = vec3(
      sin(yaw) * cosP * uCamDist,
      sin(pitch) * uCamDist,
      cos(yaw) * cosP * uCamDist
    );

    vec3 forward = normalize(-camPos);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);

    vec3 rayDir = normalize(forward * 1.45 + right * uv.x + up * uv.y);

    const float RS = 1.0;
    const float R_BOUND = 10.8;

    float tClosest = -dot(camPos, rayDir);
    vec3 pClosest = camPos + rayDir * tClosest;
    float b = length(pClosest);

    vec3 color = vec3(0.0);

    if (b > 10.5) {
      vec3 dir = rayDir;
      if (tClosest > 0.0) {
        dir = normalize(rayDir - (pClosest / b) * (2.0 * RS * uLensing / b));
      }
      color = sampleBackground(dir, uStarFade);
    } else {
      vec3 pos = camPos;
      vec3 dir = rayDir;
      float camR2 = dot(camPos, camPos);
      if (camR2 > R_BOUND * R_BOUND) {
        float hb = dot(camPos, rayDir);
        float disc = hb * hb - (camR2 - R_BOUND * R_BOUND);
        if (disc > 0.0) {
          float tEntry = max(0.0, -hb - sqrt(disc));
          pos = camPos + rayDir * tEntry;
        }
      }

      vec3 angMom = cross(pos, dir);
      float L2 = dot(angMom, angMom);

      vec3 accumDisk = vec3(0.0);
      float accumAlpha = 0.0;
      bool captured = false;
      float minR = 100.0;

      for (int i = 0; i < 48; i++) {
        float r2 = dot(pos, pos);
        float r = sqrt(r2);
        minR = min(minR, r);

        if (r < RS * 1.01) {
          captured = true;
          break;
        }

        if (r > 11.5 && dot(pos, dir) > 0.0) {
          break;
        }

        float h = clamp((r - 0.85 * RS) * 0.13, 0.042, 0.85);
        float r5 = r2 * r2 * r;
        vec3 accel = (-1.5 * RS * uLensing * L2 / max(r5, 0.0001)) * pos;

        vec3 nextDir = normalize(dir + accel * h);
        vec3 nextPos = pos + (dir + nextDir) * 0.5 * h;

        if ((pos.y > 0.0 && nextPos.y <= 0.0) || (pos.y < 0.0 && nextPos.y >= 0.0)) {
          if (accumAlpha < 0.94) {
            float tCross = abs(pos.y) / (abs(pos.y) + abs(nextPos.y) + 1e-6);
            vec3 pHit = mix(pos, nextPos, tCross);
            vec4 diskSample = sampleDisk(pHit, dir, uHoleReveal);
            if (diskSample.a > 0.002) {
              accumDisk += (1.0 - accumAlpha) * diskSample.rgb * diskSample.a;
              accumAlpha += (1.0 - accumAlpha) * diskSample.a;
            }
          }
        }

        pos = nextPos;
        dir = nextDir;
      }

      if (captured) {
        color = vec3(0.006, 0.006, 0.008) * (1.0 - accumAlpha) + accumDisk;
      } else {
        vec3 bg = sampleBackground(dir, uStarFade);
        color = bg * (1.0 - accumAlpha) + accumDisk;

        float ringDist = max(minR - 1.50 * RS, 0.0);
        float ring = exp(-ringDist * 26.0) * 0.75 + exp(-ringDist * 8.0) * 0.18;
        vec3 ringCol = mix(vec3(0.95, 0.58, 0.25), vec3(1.0, 0.90, 0.74), exp(-ringDist * 22.0));
        color += ringCol * ring * uPhotonRing * uHoleReveal * (1.0 - accumAlpha * 0.65);
      }
    }

    color = color / (1.0 + color * 0.38);

    vec2 vUV = gl_FragCoord.xy / uRes - 0.5;
    float vig = 1.0 - dot(vUV, vUV) * uVignette * 1.45;
    color *= clamp(vig, 0.0, 1.0);

    float grain = (hash12(gl_FragCoord.xy + fract(uTime * 17.3) * 100.0) - 0.5) * uGrainIntensity;
    color = max(color + grain, vec3(0.008, 0.008, 0.011));

    gl_FragColor = vec4(color, 1.0);
  }
`;

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeInCubic(t) {
  return t * t * t;
}

function formatTimecode(sec) {
  const total = Math.max(0, Math.floor(sec));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `T+ ${h}:${m}:${s}`;
}

function createOverlayElement() {
  const el = document.createElement('div');
  el.id = 'bh-intro';
  el.className = 'bh-intro';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Event Horizon Intro');
  el.innerHTML = `
    <canvas id="bh-gl-canvas" class="bh-canvas" aria-label="Interactive Schwarzschild black hole visualization"></canvas>
    <div class="bh-hud" id="bh-hud">
      <div class="bh-telemetry" aria-live="off">
        <div class="mask-clip">
          <div class="mask-line">
            <div class="bh-telemetry-row">
              <span class="bh-telemetry-label">DIST</span>
              <span id="bh-meta-dist">R = 42.7 Rs</span>
            </div>
            <div class="bh-telemetry-row">
              <span class="bh-telemetry-label">ELAPSED</span>
              <span id="bh-meta-time">T+ 00:00:00</span>
            </div>
          </div>
        </div>
      </div>

      <div class="bh-hero-block">
        <h2 class="bh-title">
          <span class="mask-clip"><span class="mask-line">Alif</span></span>
          <span class="mask-clip"><span class="mask-line">Bayu</span></span>
        </h2>
        <div class="bh-tagline-wrap">
          <span class="mask-clip">
            <span class="mask-line bh-tagline">Nothing returns from here.</span>
          </span>
        </div>
      </div>

      <div class="bh-enter-wrap">
        <span class="mask-clip">
          <span class="mask-line">
            <button class="bh-enter-btn" id="bh-enter-btn" type="button" aria-label="Enter portfolio">
              <span class="bh-enter-label">Enter</span>
              <span class="bh-enter-track" aria-hidden="true">
                <span class="bh-enter-fill"></span>
              </span>
            </button>
          </span>
        </span>
      </div>
    </div>
    <div class="bh-wipe" id="bh-wipe" aria-hidden="true"></div>
    <div class="bh-wipe-ring" id="bh-wipe-ring" aria-hidden="true"></div>
  `;
  return el;
}

export function mountBlackHoleIntro(callbacks = {}) {
  const existing = document.getElementById('bh-intro');
  if (existing) existing.remove();

  document.documentElement.classList.add('intro-locked');
  document.body.classList.add('intro-locked');

  const overlay = createOverlayElement();
  document.body.appendChild(overlay);

  const canvas = overlay.querySelector('#bh-gl-canvas');
  const hud = overlay.querySelector('#bh-hud');
  const metaDist = overlay.querySelector('#bh-meta-dist');
  const metaTime = overlay.querySelector('#bh-meta-time');
  const enterBtn = overlay.querySelector('#bh-enter-btn');

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let prefersReducedMotion = reducedMotionQuery.matches;

  let introElapsed = prefersReducedMotion ? CONFIG.SETTLE_TIME : 0;
  let skipTarget = null;
  let textRevealed = prefersReducedMotion;
  let isTabHidden = document.hidden;
  let lastTimestamp = performance.now();
  let rafId = null;
  let destroyed = false;

  // Singularity Crossing transition state
  let isExiting = false;
  let plungeStartTime = 0;
  let plungeStartCamDist = CONFIG.CAM_DIST_END;
  let plungeStartDisplayDist = CONFIG.CAM_DIST_END;
  let currentCamDist = CONFIG.CAM_DIST_START;
  let currentDisplayDist = 42.7;
  const timers = [];

  // Parallax state (-1 .. 1)
  let targetParallaxX = 0;
  let targetParallaxY = 0;
  let currentParallaxX = 0;
  let currentParallaxY = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragBaseX = 0;
  let dragBaseY = 0;

  // Adaptive resolution state
  let renderScale = 1.0;
  const frameTimes = [];
  let lastTelemetryUpdate = 0;

  if (prefersReducedMotion) {
    hud.classList.add('instant', 'revealed');
  }

  function updateTelemetry(t) {
    const pushProgress = clamp(
      (t - CONFIG.PUSH_START) / (CONFIG.PUSH_END - CONFIG.PUSH_START),
      0,
      1
    );
    const eased = easeInOutCubic(pushProgress);
    const baseDist = 42.7 + (CONFIG.CAM_DIST_END - 42.7) * eased;
    const idleDrift = t > CONFIG.PUSH_END
      ? Math.sin((t - CONFIG.PUSH_END) * 0.25) * 0.08
      : 0;
    currentDisplayDist = baseDist + idleDrift;
    metaDist.textContent = `R = ${currentDisplayDist.toFixed(1)} Rs`;
    metaTime.textContent = formatTimecode(t);
  }

  function jumpToFinalState() {
    if (isExiting || introElapsed >= CONFIG.SETTLE_TIME) return;
    skipTarget = CONFIG.SETTLE_TIME;
  }

  /* =========================================================================
   * WEBGL RENDERER (Optimized Schwarzschild Geodesic Raymarcher)
   * ========================================================================= */
  let mode = 'webgl';
  let gl = null;
  let program = null;
  const uniforms = {};
  let ctx2d = null;
  let stars2d = [];

  function compileShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function initWebGL() {
    try {
      gl = canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'high-performance',
      }) || canvas.getContext('experimental-webgl');

      if (!gl) return false;

      const vs = compileShader(gl.VERTEX_SHADER, VERT_SRC);
      const fs = compileShader(gl.FRAGMENT_SHADER, FRAG_SRC);
      if (!vs || !fs) return false;

      program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;

      gl.useProgram(program);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );

      const aPos = gl.getAttribLocation(program, 'aPos');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      const names = [
        'uRes', 'uTime', 'uStarFade', 'uHoleReveal', 'uLensing',
        'uCamDist', 'uCamInc', 'uParallax', 'uDiskBrightness',
        'uDiskInner', 'uDiskOuter', 'uDiskRotSpeed', 'uDoppler',
        'uPhotonRing', 'uStarDensity', 'uDustIntensity',
        'uGrainIntensity', 'uVignette',
      ];
      for (const n of names) {
        uniforms[n] = gl.getUniformLocation(program, n);
      }

      return true;
    } catch {
      return false;
    }
  }

  function initCanvas2D() {
    mode = '2d';
    ctx2d = canvas.getContext('2d', { alpha: false });
    stars2d = Array.from({ length: 220 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.4 + 0.3,
      a: Math.random() * 0.7 + 0.2,
      delay: Math.random() * 0.85,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  if (!initWebGL()) {
    initCanvas2D();
  }

  /* =========================================================================
   * RESIZE & ADAPTIVE RESOLUTION
   * ========================================================================= */
  function resizeCanvas() {
    if (destroyed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.MAX_DPR);
    const w = Math.max(1, Math.floor(window.innerWidth * dpr * renderScale));
    const h = Math.max(1, Math.floor(window.innerHeight * dpr * renderScale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      if (mode === 'webgl' && gl) {
        gl.viewport(0, 0, w, h);
      }
    }
  }

  resizeCanvas();

  function updateAdaptiveResolution(dtMs) {
    if (mode !== 'webgl' || isExiting) return;
    frameTimes.push(dtMs);
    if (frameTimes.length < CONFIG.FPS_SAMPLE_COUNT) return;

    let sum = 0;
    for (let i = 0; i < frameTimes.length; i++) sum += frameTimes[i];
    const avg = sum / frameTimes.length;
    frameTimes.length = 0;

    if (avg > CONFIG.FRAME_TIME_BUDGET_MS && renderScale > CONFIG.MIN_RENDER_SCALE) {
      renderScale = Math.max(
        CONFIG.MIN_RENDER_SCALE,
        Number((renderScale - CONFIG.RENDER_SCALE_STEP).toFixed(2))
      );
      resizeCanvas();
    }
  }

  /* =========================================================================
   * CANVAS 2D FALLBACK RENDERER
   * ========================================================================= */
  function render2D(t, starFade, holeReveal, camDist) {
    const w = canvas.width;
    const h = canvas.height;
    const cx = w * 0.5 - currentParallaxX * w * 0.03;
    const cy = h * 0.5 - currentParallaxY * h * 0.03;
    const minDim = Math.min(w, h);

    ctx2d.fillStyle = '#030304';
    ctx2d.fillRect(0, 0, w, h);

    for (let i = 0; i < stars2d.length; i++) {
      const s = stars2d[i];
      const appear = clamp((starFade - s.delay) / 0.25, 0, 1);
      if (appear <= 0) continue;
      const twinkle = 0.85 + 0.15 * Math.sin(t * 1.8 + s.phase);
      ctx2d.fillStyle = `rgba(237, 232, 223, ${(s.a * appear * twinkle).toFixed(3)})`;
      ctx2d.beginPath();
      ctx2d.arc(s.x * w, s.y * h, s.r * (w / 1200 + 0.5), 0, Math.PI * 2);
      ctx2d.fill();
    }

    if (holeReveal <= 0.001) return;

    const scaleFactor = 8.4 / camDist;
    const shadowR = minDim * 0.115 * scaleFactor * (0.4 + 0.6 * holeReveal);

    ctx2d.save();
    ctx2d.globalAlpha = holeReveal;

    for (const sign of [-1, 1]) {
      ctx2d.save();
      ctx2d.translate(cx, cy + sign * shadowR * 0.28);
      ctx2d.scale(1.0, 0.52);
      const grad = ctx2d.createRadialGradient(0, 0, shadowR * 0.9, 0, 0, shadowR * 2.15);
      grad.addColorStop(0, 'rgba(245, 201, 139, 0.75)');
      grad.addColorStop(0.45, 'rgba(232, 106, 36, 0.35)');
      grad.addColorStop(1, 'rgba(3, 3, 4, 0)');
      ctx2d.fillStyle = grad;
      ctx2d.beginPath();
      ctx2d.arc(0, 0, shadowR * 2.15, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.restore();
    }

    ctx2d.save();
    ctx2d.translate(cx, cy);
    ctx2d.scale(1.0, 0.22);
    const diskGrad = ctx2d.createLinearGradient(-shadowR * 3.4, 0, shadowR * 3.4, 0);
    diskGrad.addColorStop(0, 'rgba(140, 48, 12, 0)');
    diskGrad.addColorStop(0.25, 'rgba(245, 225, 200, 0.9)');
    diskGrad.addColorStop(0.5, 'rgba(232, 106, 36, 0.65)');
    diskGrad.addColorStop(0.75, 'rgba(165, 55, 14, 0.45)');
    diskGrad.addColorStop(1, 'rgba(100, 30, 8, 0)');
    ctx2d.fillStyle = diskGrad;
    ctx2d.beginPath();
    ctx2d.arc(0, 0, shadowR * 3.4, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.restore();

    ctx2d.fillStyle = '#030304';
    ctx2d.beginPath();
    ctx2d.arc(cx, cy, shadowR, 0, Math.PI * 2);
    ctx2d.fill();

    ctx2d.strokeStyle = 'rgba(255, 224, 178, 0.65)';
    ctx2d.lineWidth = Math.max(1, minDim * 0.0022);
    ctx2d.beginPath();
    ctx2d.arc(cx, cy, shadowR * 1.03, 0, Math.PI * 2);
    ctx2d.stroke();

    ctx2d.restore();
  }

  /* =========================================================================
   * CLEANUP & UNMOUNT
   * ========================================================================= */
  function cleanup() {
    if (destroyed) return;
    destroyed = true;

    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    timers.forEach((id) => window.clearTimeout(id));
    timers.length = 0;

    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    window.removeEventListener('resize', resizeCanvas);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    reducedMotionQuery.removeEventListener('change', onReducedMotionChange);

    if (gl) {
      const loseCtx = gl.getExtension('WEBGL_lose_context');
      if (loseCtx) loseCtx.loseContext();
      gl = null;
    }

    document.documentElement.classList.remove('intro-locked');
    document.body.classList.remove('intro-locked');
    overlay.remove();
  }

  /* =========================================================================
   * SINGULARITY CROSSING TRANSITION
   * ========================================================================= */
  function startSingularityCrossing() {
    if (isExiting || destroyed) return;
    isExiting = true;

    enterBtn.classList.add('entered');
    enterBtn.disabled = true;

    plungeStartTime = performance.now();
    plungeStartCamDist = currentCamDist;
    plungeStartDisplayDist = currentDisplayDist;

    // Phase 1 (0–450ms): HUD mask slide-down + WebGL camera plunge to 1.1 Rs
    hud.classList.remove('instant', 'revealed');
    hud.classList.add('exiting');

    window.dispatchEvent(new CustomEvent('intro:complete'));

    // Phase 2 (400–950ms): Blueprint paper circular wipe (#E2E4E4) + #E88A46 ring
    timers.push(window.setTimeout(() => {
      if (destroyed) return;
      overlay.classList.add('is-wiping');
    }, CONFIG.WIPE_START_MS));

    // Phase 3 (800–1350ms): Unlock scroll & staggered Hero handover
    timers.push(window.setTimeout(() => {
      if (destroyed) return;
      document.documentElement.classList.remove('intro-locked');
      document.body.classList.remove('intro-locked');
      overlay.classList.add('is-handover');
      if (callbacks.onStage1) callbacks.onStage1();
    }, CONFIG.STAGE1_MS));

    timers.push(window.setTimeout(() => {
      if (destroyed) return;
      if (callbacks.onStage2) callbacks.onStage2();
    }, CONFIG.STAGE2_MS));

    timers.push(window.setTimeout(() => {
      if (destroyed) return;
      if (callbacks.onStage3) callbacks.onStage3();
    }, CONFIG.STAGE3_MS));

    timers.push(window.setTimeout(() => {
      cleanup();
      if (callbacks.onComplete) callbacks.onComplete();
    }, CONFIG.CLEANUP_MS));
  }

  /* =========================================================================
   * INPUT HANDLERS
   * ========================================================================= */
  function onKeyDown(e) {
    if (e.target === enterBtn && (e.key === 'Enter' || e.key === ' ')) return;
    jumpToFinalState();
  }

  function onPointerDown(e) {
    if (e.target.closest('#bh-enter-btn')) return;
    if (introElapsed < CONFIG.SETTLE_TIME) {
      jumpToFinalState();
    }
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragBaseX = targetParallaxX;
      dragBaseY = targetParallaxY;
    }
  }

  function onPointerMove(e) {
    if (e.pointerType === 'mouse') {
      targetParallaxX = clamp((e.clientX / window.innerWidth) * 2 - 1, -1, 1);
      targetParallaxY = clamp((e.clientY / window.innerHeight) * 2 - 1, -1, 1);
    } else if (isDragging) {
      const dx = (e.clientX - dragStartX) / (window.innerWidth * 0.45);
      const dy = (e.clientY - dragStartY) / (window.innerHeight * 0.45);
      targetParallaxX = clamp(dragBaseX + dx, -1, 1);
      targetParallaxY = clamp(dragBaseY + dy, -1, 1);
    }
  }

  function onPointerUp() {
    isDragging = false;
  }

  function onReducedMotionChange(e) {
    prefersReducedMotion = e.matches;
    if (prefersReducedMotion) {
      introElapsed = CONFIG.SETTLE_TIME;
      textRevealed = true;
      hud.classList.add('instant', 'revealed');
    }
  }

  function onVisibilityChange() {
    if (destroyed) return;
    isTabHidden = document.hidden;
    if (isTabHidden) {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    } else {
      lastTimestamp = performance.now();
      if (rafId === null) {
        rafId = requestAnimationFrame(tick);
      }
    }
  }

  enterBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startSingularityCrossing();
  });

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('resize', resizeCanvas);
  document.addEventListener('visibilitychange', onVisibilityChange);
  reducedMotionQuery.addEventListener('change', onReducedMotionChange);

  /* =========================================================================
   * MAIN LOOP
   * ========================================================================= */
  function tick(now) {
    if (destroyed || isTabHidden) return;

    const rawDtMs = now - lastTimestamp;
    lastTimestamp = now;
    const dt = Math.min(rawDtMs * 0.001, 0.1);

    updateAdaptiveResolution(rawDtMs);

    if (skipTarget !== null) {
      const diff = skipTarget - introElapsed;
      if (diff <= 0.02) {
        introElapsed = skipTarget;
        skipTarget = null;
      } else {
        introElapsed += diff * Math.min(1, dt * 8.5);
      }
    } else if (!prefersReducedMotion) {
      introElapsed += dt;
    } else {
      introElapsed += dt * 0.15;
    }

    currentParallaxX += (targetParallaxX - currentParallaxX) * CONFIG.PARALLAX_LERP;
    currentParallaxY += (targetParallaxY - currentParallaxY) * CONFIG.PARALLAX_LERP;

    const starFade = prefersReducedMotion
      ? 1.0
      : clamp(
          (introElapsed - CONFIG.STAR_FADE_START) /
          (CONFIG.STAR_FADE_END - CONFIG.STAR_FADE_START),
          0,
          1
        );

    const pushT = prefersReducedMotion
      ? 1.0
      : easeInOutCubic(
          clamp(
            (introElapsed - CONFIG.PUSH_START) /
            (CONFIG.PUSH_END - CONFIG.PUSH_START),
            0,
            1
          )
        );

    let camDist = CONFIG.CAM_DIST_START + (CONFIG.CAM_DIST_END - CONFIG.CAM_DIST_START) * pushT;
    const holeReveal = prefersReducedMotion ? 1.0 : easeInOutCubic(clamp(pushT * 1.15, 0, 1));
    const lensing = CONFIG.LENSING_STRENGTH * (0.28 + 0.72 * pushT);

    if (isExiting) {
      const plungeT = clamp((now - plungeStartTime) / CONFIG.PLUNGE_DURATION_MS, 0, 1);
      const plungeEase = easeInCubic(plungeT);
      camDist = plungeStartCamDist + (CONFIG.CAM_DIST_PLUNGE - plungeStartCamDist) * plungeEase;
      const distReadout = Math.max(0, plungeStartDisplayDist * (1 - plungeEase));
      metaDist.textContent = `R = ${distReadout.toFixed(1)} Rs`;
    } else {
      if (!textRevealed && introElapsed >= CONFIG.TEXT_REVEAL_TIME) {
        textRevealed = true;
        hud.classList.add('revealed');
      }

      if (!prefersReducedMotion && introElapsed >= CONFIG.AUTO_ENTER_TIME) {
        startSingularityCrossing();
      }

      if (now - lastTelemetryUpdate > 60) {
        updateTelemetry(introElapsed);
        lastTelemetryUpdate = now;
      }
    }

    currentCamDist = camDist;

    if (mode === 'webgl' && gl) {
      gl.uniform2f(uniforms.uRes, canvas.width, canvas.height);
      gl.uniform1f(uniforms.uTime, introElapsed);
      gl.uniform1f(uniforms.uStarFade, starFade);
      gl.uniform1f(uniforms.uHoleReveal, holeReveal);
      gl.uniform1f(uniforms.uLensing, lensing);
      gl.uniform1f(uniforms.uCamDist, camDist);
      gl.uniform1f(uniforms.uCamInc, CONFIG.CAM_INCLINATION);
      gl.uniform2f(uniforms.uParallax, currentParallaxX, currentParallaxY);

      gl.uniform1f(uniforms.uDiskBrightness, CONFIG.DISK_BRIGHTNESS);
      gl.uniform1f(uniforms.uDiskInner, CONFIG.DISK_INNER_RADIUS);
      gl.uniform1f(uniforms.uDiskOuter, CONFIG.DISK_OUTER_RADIUS);
      gl.uniform1f(
        uniforms.uDiskRotSpeed,
        prefersReducedMotion ? CONFIG.DISK_ROTATION_SPEED * 0.25 : CONFIG.DISK_ROTATION_SPEED
      );
      gl.uniform1f(uniforms.uDoppler, CONFIG.DOPPLER_STRENGTH);
      gl.uniform1f(uniforms.uPhotonRing, CONFIG.PHOTON_RING_INTENSITY);
      gl.uniform1f(uniforms.uStarDensity, CONFIG.STAR_DENSITY);
      gl.uniform1f(uniforms.uDustIntensity, CONFIG.DUST_BAND_INTENSITY);
      gl.uniform1f(uniforms.uGrainIntensity, CONFIG.GRAIN_INTENSITY);
      gl.uniform1f(uniforms.uVignette, CONFIG.VIGNETTE_STRENGTH);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    } else if (ctx2d) {
      render2D(introElapsed, starFade, holeReveal, camDist);
    }

    rafId = requestAnimationFrame(tick);
  }

  updateTelemetry(introElapsed);
  rafId = requestAnimationFrame(tick);

  return { cleanup };
}
