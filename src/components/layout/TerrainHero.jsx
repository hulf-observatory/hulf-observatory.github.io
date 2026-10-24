import { useEffect, useMemo, useRef, useState } from 'react';

// Home-page terrain: east-west ridgelines over the HMDA rectangle, seen from the south.
// Lines inside the GHMC boundary are drawn darker, lakes are filled (blue inside GHMC,
// grey outside) and landmarks pop up one after another with their coordinates.
// Data: /terrain/terrain-hmda.json (not /data/: that path is the data site since 24 Oct 2026), built by observatory-work/elevation/scripts/web_terrain.py
// (see "elevation lines/README.md"). All geometry is in the file's "view units"; this
// component only frames and draws it.

const LANDMARK_MS = 3600;

function useSize(ref) {
  const [size, setSize] = useState({ w: 1440, h: 900 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width && height) setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

const pathOf = (xs, ys, a = 0, b = xs.length - 1) => {
  let d = '';
  for (let k = a; k <= b; k++) d += `${k === a ? 'M' : 'L'}${xs[k].toFixed(2)},${ys[k].toFixed(2)}`;
  return d;
};

export default function TerrainHero() {
  const [data, setData] = useState(null);
  const [active, setActive] = useState(0);
  const [probe, setProbe] = useState(null);
  const ref = useRef(null);
  const { w, h } = useSize(ref);

  useEffect(() => {
    let alive = true;
    fetch(`${import.meta.env.BASE_URL}terrain/terrain-hmda.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => alive && j && setData(j))
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // landmarks: one at a time, in order
  useEffect(() => {
    if (!data) return undefined;
    const t = setInterval(() => setActive((i) => (i + 1) % data.landmarks.length), LANDMARK_MS);
    return () => clearInterval(t);
  }, [data]);

  const drawing = useMemo(() => {
    if (!data) return null;
    const { lines, x0, dx, zmin, exag, tilt } = data;
    const st = Math.sin((tilt * Math.PI) / 180);
    const ct = Math.cos((tilt * Math.PI) / 180);
    const n = lines[0].z.length;
    const xs = Array.from({ length: n }, (_, k) => x0 + k * dx);
    const first = lines[0];
    const last = lines[lines.length - 1];
    const lift = (v) => ((v - zmin) / 1000) * exag * ct;
    const extent = {
      xMin: xs[0],
      xMax: xs[n - 1],
      yMin: -first.y * st - lift(Math.max(...first.z)),
      yMax: -last.y * st + 2,
    };
    extent.shapes = lines.map(({ y, z, city }) => {
      const base = -y * st;
      const ys = z.map((v) => base - ((v - zmin) / 1000) * exag * ct);
      const line = pathOf(xs, ys);
      // canvas-coloured area under the line hides the lines behind it
      const fill = `${line}L${xs[n - 1].toFixed(2)},${(base + 2).toFixed(2)}L${xs[0].toFixed(2)},${(base + 2).toFixed(2)}Z`;
      const inCity = city.map(([a, b]) => pathOf(xs, ys, Math.max(a - 1, 0), Math.min(b + 1, n - 1))).join('');
      return { line, fill, inCity };
    });
    return extent;
  }, [data]);

  // frame: landscape fits the whole HMDA drawing; portrait centres on GHMC, fits its height
  // and lets the sides crop, so the drawing fills a tall screen instead of leaving blank bands
  const box = useMemo(() => {
    if (!data || !drawing) return null;
    const [fx0, fy0, fx1, fy1] = data.focus;
    const fw = fx1 - fx0;
    const fh = fy1 - fy0;
    const aspect = w / h;
    let vw;
    let cx;
    let cy;
    if (aspect >= 1) {
      vw = (drawing.xMax - drawing.xMin) * 0.88;
      cx = (drawing.xMin + drawing.xMax) / 2;
      cy = (drawing.yMin + drawing.yMax) / 2;
    } else {
      vw = Math.max(fh * 1.55 * aspect, fw * 0.52);
      cx = (fx0 + fx1) / 2;
      cy = (fy0 + fy1) / 2 + (vw / aspect) * 0.04;
    }
    const vh = vw / aspect;
    return { x: cx - vw / 2, y: cy - vh / 2, w: vw, h: vh };
  }, [data, drawing, w, h]);

  const mark = data && box ? data.landmarks[active] : null;

  // pan the drawing so the active landmark (and room for its label) is on screen —
  // on phones the sides are cropped, so the view glides to each point in turn
  const pan = useMemo(() => {
    if (!mark || !box || !drawing) return { tx: 0, ty: 0 };
    // glide the drawing just enough to bring the active landmark (plus label room) into a
    // comfortable window — points already on screen barely move, off-screen ones slide in
    const portrait = box.h > box.w;
    const xLo = box.x + box.w * (portrait ? 0.14 : 0.1);
    const xHi = box.x + box.w * (portrait ? 0.42 : 0.72); // label extends right of the dot
    const yLo = box.y + box.h * 0.2;                      // label sits above the dot
    const yHi = box.y + box.h * 0.82;
    let tx = 0;
    let ty = 0;
    if (mark.x < xLo) tx = xLo - mark.x;
    else if (mark.x > xHi) tx = xHi - mark.x;
    if (mark.y < yLo) ty = yLo - mark.y;
    else if (mark.y > yHi) ty = yHi - mark.y;
    const clamp = (v, lo, hi) => (lo > hi ? 0 : Math.max(lo, Math.min(hi, v)));
    return {
      tx: clamp(tx, box.x + box.w - drawing.xMax, box.x - drawing.xMin),
      ty: clamp(ty, box.y + box.h - drawing.yMax, box.y - drawing.yMin),
    };
  }, [mark, box, drawing]);

  useEffect(() => {
    if (!data || !box) return undefined;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;
    const { lines, x0, dx, zmin, exag, tilt } = data;
    const st = Math.sin((tilt * Math.PI) / 180);
    const ct = Math.cos((tilt * Math.PI) / 180);
    const n = lines[0].z.length;
    let raf = 0;
    // No readout within a margin of the page chrome either (buttons, hint, credit, header,
    // footer): a probe sitting next to a button reads as part of the UI.
    const CHROME = '.app-header, .home-actions, .home-hint, .home-credit, .app-footer, footer';
    const MARGIN = 40;
    const nearChrome = (x, y) => {
      for (const el of document.querySelectorAll(CHROME)) {
        const r = el.getBoundingClientRect();
        if (!r.width && !r.height) continue;
        if (x >= r.left - MARGIN && x <= r.right + MARGIN && y >= r.top - MARGIN && y <= r.bottom + MARGIN) return true;
      }
      return false;
    };
    const onMove = (e) => {
      // the header, its menu and any link or button are not terrain: a pointer over them
      // clears the probe instead of reading the ridgeline underneath (the burger tap bug)
      const t = e.target instanceof Element ? e.target : null;
      if ((t && t.closest('.app-header, .home-menu, a, button, nav')) || nearChrome(e.clientX, e.clientY)) {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        setProbe(null);
        return;
      }
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        // screen px -> view units (viewBox is centre-cropped by xMidYMid slice), minus the pan
        const scale = Math.max(w / box.w, h / box.h);
        const vx = box.x + box.w / 2 + (e.clientX - w / 2) / scale - pan.tx;
        const vy = box.y + box.h / 2 + (e.clientY - h / 2) / scale - pan.ty;
        const k = Math.round((vx - x0) / dx);
        if (k < 0 || k >= n) { setProbe(null); return; }
        let best = null;
        for (const l of lines) {
          const z = l.z[k];
          const y = -l.y * st - ((z - zmin) / 1000) * exag * ct;
          const d = Math.abs(y - vy);
          if (!best || d < best.d) best = { d, y, z, city: l.city.some(([a, b]) => k >= a && k <= b) };
        }
        if (best && best.d < 18 / scale) {
          setProbe({ x: x0 + k * dx, y: best.y, elev: best.z, city: best.city });
        } else setProbe(null);
      });
    };
    const clear = () => setProbe(null);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', clear);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', clear);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [data, box, pan, w, h]);

  return (
    <div className="terrain-hero" aria-hidden="true" ref={ref}>
      {drawing && box && (
        <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} preserveAspectRatio="xMidYMid slice">
          <g className="terrain-pan" style={{ transform: `translate(${pan.tx}px, ${pan.ty}px)` }}>
          {drawing.shapes.map(({ line, fill, inCity }, i) => (
            <g key={i}>
              <path d={fill} className="terrain-fill" />
              <path d={line} className="terrain-line" />
              {inCity && <path d={inCity} className="terrain-city" />}
            </g>
          ))}
          <path d={data.lakesOut} className="terrain-lake-out" />
          <path d={data.lakesCity} className="terrain-lake-city" />
          </g>
        </svg>
      )}
      {probe && box && (
        <div
          className={`terrain-probe${probe.city ? ' in-city' : ''}`}
          style={{
            left: `${((probe.x + pan.tx - box.x) / box.w) * 100}%`,
            top: `${((probe.y + pan.ty - box.y) / box.h) * 100}%`,
          }}
        >
          <span className="terrain-probe-dot" />
          <span className="terrain-probe-label">{probe.elev} m</span>
        </div>
      )}
      {mark && (
        <div
          key={active}
          className="terrain-mark"
          style={{
            left: `${((mark.x + pan.tx - box.x) / box.w) * 100}%`,
            top: `${((mark.y + pan.ty - box.y) / box.h) * 100}%`,
          }}
        >
          <span className="terrain-mark-stem" />
          <span className="terrain-mark-dot" />
          <span className="terrain-mark-label">
            <strong>{mark.name}</strong>
            {mark.lat.toFixed(4)}°N {mark.lon.toFixed(4)}°E{mark.elev ? ` · ${mark.elev} m` : ''}
          </span>
        </div>
      )}
    </div>
  );
}
