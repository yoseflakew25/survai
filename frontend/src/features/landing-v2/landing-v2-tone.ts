/** Halftone canvas engine ported from the static landing template. */

type ToneItem = {
  c: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  dirty: boolean;
  w: number;
  h: number;
  img: ImageData;
  buf: Uint32Array;
  mask: Uint8Array;
  ox: number;
  oy: number;
};

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
  (v) => (v + 0.5) / 16
);
const PX = 2;

let pal: { bg: number[]; dot: number[]; shape: number[]; fade: number[] } = {
  bg: [255, 255, 255],
  dot: [35, 35, 35],
  shape: [214, 214, 214],
  fade: [223, 223, 223]
};

function hex(h: string): number[] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function pack(c: number[]): number {
  return (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
}

function lerp(a: number[], b: number[], t: number): number[] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}

function inRR(
  x: number,
  y: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  r: number
): boolean {
  if (x < rx || y < ry || x > rx + rw || y > ry + rh) return false;
  const cx = Math.min(Math.max(x, rx + r), rx + rw - r);
  const cy = Math.min(Math.max(y, ry + r), ry + rh - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function segD(x: number, y: number, a: number[], b: number[]): number {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const wx = x - a[0];
  const wy = y - a[1];
  const denom = vx * vx + vy * vy;
  const t = denom === 0 ? 0 : Math.max(0, Math.min(1, (wx * vx + wy * vy) / denom));
  const px = a[0] + t * vx - x;
  const py = a[1] + t * vy - y;
  return Math.sqrt(px * px + py * py);
}

function sceneMark(x: number, y: number, W: number, H: number, big: boolean): boolean {
  const u = big ? Math.min(W, H * 1.25) : W;
  const bw = u * 0.13;
  const gap = u * 0.045;
  const rad = u * 0.025;
  const base = big ? H * 0.86 : H * 0.6;
  const x0 = W / 2 - (bw * 1.5 + gap);
  const hs = [0.3, 0.5, 0.72];
  for (let i = 0; i < 3; i++) {
    const h = hs[i] * u;
    if (inRR(x, y, x0 + i * (bw + gap), base - h, bw, h, rad)) return true;
  }
  return false;
}

function localShape(kind: string, x: number, y: number, w: number, h: number): boolean {
  const cx = w / 2;
  const cy = h / 2;
  const m = Math.min(w, h);
  const dx = x - cx;
  const dy = y - cy;
  const d = Math.sqrt(dx * dx + dy * dy);
  switch (kind) {
    case 'circle':
      return d < m * 0.34 && d > m * 0.2;
    case 'bars': {
      const bw = m * 0.16;
      const g = m * 0.06;
      const x0 = cx - (bw * 1.5 + g);
      const base = cy + m * 0.32;
      const hs = [0.3, 0.46, 0.64];
      for (let i = 0; i < 3; i++) {
        if (inRR(x, y, x0 + i * (bw + g), base - hs[i] * m, bw, hs[i] * m, m * 0.03))
          return true;
      }
      return false;
    }
    case 'doc': {
      if (!inRR(x, y, cx - m * 0.26, cy - m * 0.36, m * 0.52, m * 0.72, m * 0.03))
        return false;
      const ly = (y - (cy - m * 0.24)) / (m * 0.1);
      const inner =
        x > cx - m * 0.17 &&
        x < cx + m * 0.17 &&
        ly > 0 &&
        ly < 5 &&
        ly % 1 < 0.35;
      return !inner;
    }
    case 'wave': {
      const yy = cy + Math.sin((x / w) * Math.PI * 3) * m * 0.18;
      return Math.abs(y - yy) < m * 0.07;
    }
    case 'grid': {
      const s = m * 0.16;
      const gx = Math.floor((x - cx) / s + 2);
      const gy = Math.floor((y - cy) / s + 2);
      return gx >= 0 && gx < 4 && gy >= 0 && gy < 4 && (gx + gy) % 2 === 0;
    }
    case 'check': {
      if (d < m * 0.36 && d > m * 0.3) return true;
      const p1 = [cx - m * 0.16, cy];
      const p2 = [cx - m * 0.04, cy + m * 0.13];
      const p3 = [cx + m * 0.18, cy - m * 0.13];
      return segD(x, y, p1, p2) < m * 0.045 || segD(x, y, p2, p3) < m * 0.045;
    }
    default:
      return false;
  }
}

export function createLandingTone(root: HTMLElement, reduceMotion: boolean) {
  const items: ToneItem[] = [];
  const visible = new Set<ToneItem>();

  function applyTheme() {
    const dark = root.dataset.theme === 'dark';
    pal = dark
      ? {
          bg: hex('#232323'),
          dot: hex('#ffffff'),
          shape: hex('#3a3a3a'),
          fade: hex('#333333')
        }
      : {
          bg: hex('#ffffff'),
          dot: hex('#232323'),
          shape: hex('#d6d6d6'),
          fade: hex('#dfdfdf')
        };
    items.forEach((it) => {
      it.dirty = true;
    });
  }

  function setup(it: ToneItem) {
    const r = it.c.getBoundingClientRect();
    const w = Math.max(1, Math.ceil(r.width / PX));
    const h = Math.max(1, Math.ceil(r.height / PX));
    it.c.width = w;
    it.c.height = h;
    it.w = w;
    it.h = h;
    it.img = it.ctx.createImageData(w, h);
    it.buf = new Uint32Array(it.img.data.buffer);
    it.mask = new Uint8Array(w * h);
    const scene = it.c.dataset.tone === 'scene';
    const sec = scene ? it.c.closest('[data-scene]') : null;
    const sr = sec ? sec.getBoundingClientRect() : r;
    it.ox = r.left - sr.left;
    it.oy = r.top - sr.top;
    const big = it.c.dataset.big === '1';
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const X = x * PX;
        const Y = y * PX;
        it.mask[y * w + x] = scene
          ? sceneMark(X + it.ox, Y + it.oy, sr.width, sr.height, big)
            ? 1
            : 0
          : localShape(it.c.dataset.shape ?? '', X, Y, r.width, r.height)
            ? 1
            : 0;
      }
    }
    it.dirty = true;
  }

  function amountFor(it: ToneItem): number {
    if (it.c.dataset.solid === '1') return 0;
    if (it.c.dataset.tone !== 'scene') return 1;
    const r = it.c.getBoundingClientRect();
    const vh = window.innerHeight;
    if (it.c.dataset.big === '1') return 1;
    const mid = r.top + r.height * 0.5;
    return Math.max(0, Math.min(1, (mid - 60) / (vh * 0.45)));
  }

  function draw(it: ToneItem, t: number) {
    const a = amountFor(it);
    const w = it.w;
    const h = it.h;
    const buf = it.buf;
    const mask = it.mask;
    const bgc = pack(lerp(pal.fade, pal.bg, a));
    const dot = pack(pal.dot);
    const sh = pack(pal.shape);
    const big = it.c.dataset.big === '1';
    const ox = it.ox / PX;
    const oy = it.oy / PX;
    const H = h;
    for (let y = 0; y < h; y++) {
      const Y = y + oy;
      let fadeRow = 1;
      if (big) {
        fadeRow = Math.max(0, Math.min(1, (0.78 - y / H) / 0.12));
      }
      const bgRow = big ? pack(lerp(pal.fade, pal.bg, fadeRow)) : bgc;
      const cy1 = Math.cos(Y * 0.021 - t * 0.35);
      const sy2 = Y * 0.009;
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (mask[i]) {
          buf[i] = sh;
          continue;
        }
        const X = x + ox;
        let v =
          0.5 +
          0.32 * Math.sin(X * 0.017 + t * 0.4) * cy1 +
          0.22 * Math.sin(X * 0.006 + sy2 + t * 0.22) +
          0.1 * Math.sin(X * 0.05 - Y * 0.04 + t);
        v = (v < 0.1 ? 0.1 : v > 0.9 ? 0.9 : v) * a * fadeRow;
        buf[i] = BAYER[((y & 3) << 2) | (x & 3)] < v ? dot : bgRow;
      }
    }
    it.ctx.putImageData(it.img, 0, 0);
  }

  let raf = 0;
  let vio: IntersectionObserver | null = null;
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;

  function init() {
    applyTheme();
    const canvases = root.querySelectorAll<HTMLCanvasElement>('canvas.tone');
    canvases.forEach((c) => {
      const ctx = c.getContext('2d');
      if (!ctx) return;
      const it: ToneItem = { c, ctx, dirty: true, w: 0, h: 0, img: ctx.createImageData(1, 1), buf: new Uint32Array(0), mask: new Uint8Array(0), ox: 0, oy: 0 };
      (c as HTMLCanvasElement & { __tone?: ToneItem }).__tone = it;
      items.push(it);
      setup(it);
    });

    if ('IntersectionObserver' in window) {
      vio = new IntersectionObserver(
        (es) => {
          es.forEach((e) => {
            const it = (e.target as HTMLCanvasElement & { __tone?: ToneItem }).__tone;
            if (!it) return;
            if (e.isIntersecting) visible.add(it);
            else visible.delete(it);
          });
        },
        { rootMargin: '100px' }
      );
      items.forEach((it) => vio!.observe(it.c));
    } else {
      items.forEach((it) => visible.add(it));
    }

    const t0 = performance.now();
    let last = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - last < 40) return;
      last = now;
      const t = reduceMotion ? 0 : (now - t0) / 1000;
      visible.forEach((it) => draw(it, t));
    };
    raf = requestAnimationFrame(frame);

    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => items.forEach(setup), 150);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      vio?.disconnect();
      window.removeEventListener('resize', onResize);
      clearTimeout(resizeTimer);
      items.length = 0;
      visible.clear();
    };
  }

  function refresh(c: HTMLCanvasElement) {
    const it = (c as HTMLCanvasElement & { __tone?: ToneItem }).__tone;
    if (it) setup(it);
  }

  function refreshAll() {
    root.querySelectorAll<HTMLCanvasElement>('canvas.tone').forEach(refresh);
  }

  return {
    init,
    theme: applyTheme,
    refresh,
    refreshAll
  };
}