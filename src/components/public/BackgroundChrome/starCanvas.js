function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-5) break;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    return sy(t);
  };
}

const easeInOut = cubicBezier(0.42, 0, 0.58, 1);

const LAYERS = [
  { cls: "star-small", size: 1, opacity: 0.9, dur: 32000, alternate: true, dx: -14.375, dy: 8.125 },
  { cls: "star-mid", size: 2, opacity: 0.75, dur: 42000, alternate: true, dx: 11.875, dy: 5.625 },
  {
    cls: "star-big",
    size: 2,
    opacity: 0.6,
    dur: 58000,
    alternate: false,
    dx: -8.75,
    dy: 4.375,
    twinkle: { dur: 4200, from: 0.3, to: 0.75 }
  }
];

const SHADOW_RE = /rgba?\([^)]*\)\s+(-?[\d.]+)px\s+(-?[\d.]+)px/g;

function parseShadows(value) {
  const out = [];
  if (!value || value === "none") return out;
  SHADOW_RE.lastIndex = 0;
  let m = SHADOW_RE.exec(value);
  while (m) {
    out.push(parseFloat(m[1]), parseFloat(m[2]));
    m = SHADOW_RE.exec(value);
  }
  return out;
}

function progress(t, dur, alternate) {
  const phase = t / dur;
  if (alternate) {
    const p = phase % 2;
    return p < 1 ? p : 2 - p;
  }
  return phase % 1;
}

export function createStarRenderer(starfield) {
  const canvas = document.createElement("canvas");
  canvas.className = "star-canvas";
  canvas.setAttribute("aria-hidden", "true");
  starfield.appendChild(canvas);
  starfield.classList.add("has-canvas");

  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let rem = 16;
  let layers = [];

  function measure() {
    const root = document.documentElement;
    rem = parseFloat(getComputedStyle(root).fontSize) || 16;
    width = starfield.clientWidth || window.innerWidth;
    height = starfield.clientHeight || window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    layers = LAYERS.map((def) => {
      const el = starfield.querySelector(`.${def.cls}`);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const marginLeft = parseFloat(cs.marginLeft) || 0;
      return {
        def,
        originX: width / 2 + marginLeft,
        points: parseShadows(cs.boxShadow)
      };
    }).filter(Boolean);
  }

  function draw(t) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#fff";
    for (let li = 0; li < layers.length; li += 1) {
      const { def, originX, points } = layers[li];
      const p = progress(t, def.dur, def.alternate);
      const tx = def.dx * rem * p;
      const ty = def.dy * rem * p;
      let alpha = def.opacity;
      if (def.twinkle) {
        const tw = progress(t, def.twinkle.dur, true);
        alpha = def.twinkle.from + (def.twinkle.to - def.twinkle.from) * easeInOut(tw);
      }
      ctx.globalAlpha = alpha;
      const r = def.size / 2;
      ctx.beginPath();
      for (let i = 0; i < points.length; i += 2) {
        const x = originX + points[i] + tx + r;
        const y = points[i + 1] + ty + r;
        if (x < -2 || x > width + 2 || y < -2 || y > height + 2) continue;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function destroy() {
    canvas.remove();
    starfield.classList.remove("has-canvas");
  }

  measure();

  return { draw, measure, destroy };
}

export function startStarCanvas(starfield) {
  if (!starfield || typeof window === "undefined") return () => {};
  const renderer = createStarRenderer(starfield);
  const t0 = performance.now();
  let raf = 0;

  function frame(now) {
    renderer.draw(now - t0);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  let resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => renderer.measure(), 120);
  }
  window.addEventListener("resize", onResize);

  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(resizeTimer);
    window.removeEventListener("resize", onResize);
    renderer.destroy();
  };
}
