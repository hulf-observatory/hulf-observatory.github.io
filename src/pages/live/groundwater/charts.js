// The Groundwater page (/live/groundwater/): groundwater today (by corporation, change since last year, depth now) and
// depth over time. Plain SVG strings drawn at the measured width; the data is groundwater-history.json from the live
// feed (repo live-feed, groundwater_history.py), with implausible wells already marked `odd`.
// mount(root, D) draws everything into root and returns a function that removes the window listeners.

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MSTART = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
const AREAS = ['GHMC', 'Cyberabad', 'Malkajgiri', 'Secunderabad Cantonment', 'Rest of HMDA'];
const OTHER = '#D9DCE1', LY = '#3F76B0', NOW = '#C2413B';   // this year red, last year blue, earlier years grey
const WATER = '#7FA6CE', WATER_BACK = '#B7CDE4';
const DEPTH_LIGHT = '#9DBAD6', USUAL = '#123F70', DROP = NOW, RISE = '#7FA6CE', DROP_MUTED = '#D9A19B', RISE_MUTED = '#B7CDE4';   // muted pair for the change bars (Teja, 25 Oct)

const mF = (v) => `${v.toFixed(1)} m`;
const at = (s, d) => s.reduce((b, p) => (Math.abs(p[0] - d) < Math.abs(b[0] - d) ? p : b));
const ticksOf = (lo, hi, n) => Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));
const roll = (s) => s.map((p, i) => { const w = s.slice(Math.max(0, i - 3), i + 4); return [p[0], w.reduce((a, q) => a + q[1], 0) / w.length]; });
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] / 2 + s[Math.ceil((s.length - 1) / 2)] / 2 : null; };
const doy = (s) => Math.round((Date.parse(s) - Date.UTC(+s.slice(0, 4), 0, 1)) / 864e5) + 1;
const span = (a, b) => (a === b ? `${a}` : `${a}–${b}`);
const list = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const depthTick = (v) => `${+v.toFixed(1)}${v === 0 ? ' m' : ''}`;
function niceMax(v) { if (v <= 0) return 1; const m = 10 ** Math.floor(Math.log10(v)); return [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((k) => k * m).find((k) => k >= v); }

const SHARE_ICON = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="11" cy="3" r="1.8"/><circle cx="3" cy="7" r="1.8"/><circle cx="11" cy="11" r="1.8"/><path d="M4.6 6.2 9.4 3.8M4.6 7.8l4.8 2.4"/></svg>';
const foot = (src) => `<div class="foot"><p><b>Data source:</b> ${src} – <a href="#about">Learn more about this data</a><br>hyderabad.urbanobservatory.in/live/groundwater | Hyderabad Urban Observatory</p>
  <button class="btn share" type="button" aria-label="Share this page">${SHARE_ICON}</button></div>`;

export function mount(root, D) {
  const L = new Date(`${D.as_of}T00:00:00`), Y = D.year, P = D.prev, MONTHNAME = MONTH[L.getMonth()];
  const dateStr = `${L.getDate()} ${MON[L.getMonth()]} ${Y}`;
  const listeners = [];
  const on = (type, fn, opts) => { addEventListener(type, fn, opts); listeners.push([type, fn]); };
  const $ = (sel) => root.querySelector(sel);
  const PHONE = () => innerWidth < 640;
  let alive = true;

  // the feed's series: a list of values from a start date (or month), null where too few wells reported
  const DAILY = Object.fromEntries(Object.entries(D.daily).map(([a, s]) => {
    const d0 = Date.parse(`${s.start}T00:00:00Z`), o = {};
    s.v.forEach((v, i) => { if (v != null) o[new Date(d0 + i * 864e5).toISOString().slice(0, 10)] = v; });
    return [a, o];
  }));
  const monthHMDA = [];
  { let [y, m] = D.monthly.start.split('-').map(Number);
    D.monthly.v.forEach((v, i) => { if (v != null) monthHMDA.push([`${y}-${String(m).padStart(2, '0')}`, v, D.monthly.n[i]]); m += 1; if (m > 12) { m = 1; y += 1; } }); }

  root.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><pattern id="gw-hatch" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="rgba(194,65,59,.6)" stroke-width="1.5"/></pattern></defs></svg>
<h2 class="blk first">Depth today</h2>
<figure class="fig">
  <h2 class="fig-title"><span id="gw-t1"></span><small id="gw-w1"></small></h2>
  <p class="fig-sub" id="gw-s1"></p>
  <div class="ctl">
    <div class="row"><span class="lab">View</span><div class="tabs" role="tablist" id="gw-view"><button role="tab" data-v="corp" class="on">By corporation</button><button role="tab" data-v="chg">Change since last year</button><button role="tab" data-v="dep">Depth now</button></div></div>
    <div class="row" id="gw-show-row"><span class="lab">Show</span><div class="tabs" id="gw-show"><button data-v="map" class="on">Map</button><button data-v="bars">Graph</button></div></div>
    <div class="row" id="gw-area-row" hidden><span class="lab">Area</span><div class="tabs" id="gw-area"></div></div>
  </div>
  <div class="stats" id="gw-stats"></div>
  <div class="key" id="gw-k1"></div>
  <div class="chart" id="gw-g1"></div>
  <p class="note" id="gw-n1"></p>
  ${foot('Telangana Ground Water Department and CGWB telemetry wells (via NWDP)')}
</figure>
<div id="gw-blocks"></div>
<button class="more gone" id="gw-more" type="button"><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1V10M2 6.5 6 10.5 10 6.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>More below <span id="gw-more-next"></span></button>`;

  // ── shared chart frame ──
  function hover(el, W, onMove) {
    const hit = el.querySelector('.hit'), hair = el.querySelector('.hair'), tip = el.querySelector('.tip');
    hit.onmousemove = (e) => {
      const r = hit.getBoundingClientRect(), { x, html } = onMove((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
      hair.setAttribute('x1', x); hair.setAttribute('x2', x); hair.setAttribute('visibility', 'visible');
      tip.hidden = false; tip.innerHTML = html; tip.style.left = `${Math.min(x + 12, W - tip.offsetWidth - 4)}px`;
    };
    hit.onmouseleave = () => { hair.setAttribute('visibility', 'hidden'); tip.hidden = true; el.querySelectorAll('.oth').forEach((o) => { o.setAttribute('stroke', OTHER); o.setAttribute('stroke-width', 1); }); };
  }
  const frame = (W, H, M, inner, label) => `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label || ''}">${inner}
    <line class="hair" y1="${M.t}" y2="${H - M.b}" stroke="#111827" stroke-width="1" visibility="hidden"/>
    <rect class="hit" x="${M.l}" y="${M.t}" width="${Math.max(0, W - M.l - M.r)}" height="${H - M.t - M.b}" fill="transparent"/></svg><div class="tip" hidden></div>`;
  const gridY = (W, M, y, ticks, fmt) => ticks.map((t) => `<line x1="${M.l}" x2="${W - M.r}" y1="${y(t)}" y2="${y(t)}" stroke="#E5E7EB" stroke-dasharray="3 3"/><text x="${M.l - 6}" y="${y(t) + 4}" text-anchor="end" class="ax">${fmt(t)}</text>`).join('');
  const calName = (d) => { const t = new Date(Y, 0, d); return `${t.getDate()} ${MON[t.getMonth()]}`; };

  // depth, one year across; depth grows downward (ground at the top)
  function yoy(el, { sNow, sPrev, others, H, small }) {
    const W = el.clientWidth, narrow = W < 500, M = small ? { l: 36, r: 10, t: 8, b: 20 } : { l: 46, r: narrow ? 52 : 84, t: 12, b: 28 };
    const all = [...sNow, ...sPrev, ...Object.values(others).flat()].map((p) => p[1]), hi = 4 * niceMax((Math.max(...all) * 1.05) / 4);
    const x = (d) => M.l + ((d - 1) / 364) * (W - M.l - M.r), y = (v) => M.t + (Math.min(v, hi) / hi) * (H - M.t - M.b);
    const line = (s) => (s.length ? `M${s.map(([d, v]) => `${x(d).toFixed(1)},${y(v).toFixed(1)}`).join(' L')}` : '');
    const last = sNow[sNow.length - 1], lp = sPrev[sPrev.length - 1];
    el.innerHTML = frame(W, H, M, `${gridY(W, M, y, ticksOf(0, hi, small ? 3 : 5), depthTick)}
      ${MSTART.map((d, i) => [d + 14, MON[i]]).filter((_, i) => !(small || narrow) || i % 3 === 0).map(([d, s]) => `<text x="${x(d)}" y="${H - (small ? 6 : 8)}" text-anchor="middle" class="ax">${s}</text>`).join('')}
      ${Object.entries(others).map(([yr, s]) => `<path class="oth" data-yr="${yr}" d="${line(s)}" fill="none" stroke="${OTHER}" stroke-width="1" stroke-linejoin="round"/>`).join('')}
      <path d="${line(sPrev)}" fill="none" stroke="${LY}" stroke-width="${small ? 1.2 : 1.5}" stroke-linejoin="round"/>
      <path d="${line(sNow)}" fill="none" stroke="${NOW}" stroke-width="${small ? 1.6 : 2}" stroke-linejoin="round"/>
      ${last ? `<circle cx="${x(last[0])}" cy="${y(last[1])}" r="${small ? 3 : 4}" fill="${NOW}"/>` : ''}
      ${small || !last ? '' : `<text x="${x(last[0]) + 8}" y="${y(last[1]) + 4}" class="lbl" font-weight="700">${narrow ? '' : `${Y} · `}${mF(last[1])}</text>
        ${lp ? `<text x="${Math.min(x(lp[0]) + 6, W - M.r + 6)}" y="${y(lp[1]) + 4}" class="lbl lbl-muted">${narrow ? '' : `${P} · `}${mF(lp[1])}</text>` : ''}`}`,
    `${Y} against ${P} and earlier years`);
    hover(el, W, (fx, fy) => {
      const d = Math.round(1 + fx * 364), val = fy * hi;
      let best = null;
      Object.entries(others).forEach(([yr, s]) => { if (!s.length) return; const p = at(s, d); if (Math.abs(p[0] - d) > 4) return; if (!best || Math.abs(p[1] - val) < Math.abs(best[1] - val)) best = [yr, p[1]]; });
      el.querySelectorAll('.oth').forEach((o) => { const h = best && o.dataset.yr === best[0]; o.setAttribute('stroke', h ? '#374151' : OTHER); o.setAttribute('stroke-width', h ? 1.5 : 1); if (h) o.parentNode.insertBefore(o, o.parentNode.querySelector('path:not(.oth)')); });
      const a = last && d <= last[0] ? at(sNow, d) : null, b = sPrev.length ? at(sPrev, d) : null;
      return { x: x(d), html: `<b>${calName(d)}</b>${a ? `<span><i style="background:${NOW}"></i>${Y} <b>${mF(a[1])}</b></span>` : ''}${b ? `<span><i style="background:${LY}"></i>${P} ${mF(b[1])}</span>` : ''}${best ? `<span><i style="background:#374151"></i>${best[0]} ${mF(best[1])}</span>` : ''}` };
    });
  }
  // a long run of days or months, depth downward
  function longLine(el, pts, { H, small, t0s }) {
    const W = el.clientWidth, M = small ? { l: 36, r: 10, t: 8, b: 20 } : { l: 46, r: 24, t: 16, b: 28 };
    const t = (s) => Date.parse(s.length === 7 ? `${s}-15` : s), t0 = Date.parse(t0s), t1 = Date.parse(D.as_of);
    const hi = 4 * niceMax((Math.max(...pts.map((p) => p[1])) * 1.05) / 4), x = (s) => M.l + ((t(s) - t0) / (t1 - t0)) * (W - M.l - M.r), y = (v) => M.t + (Math.min(v, hi) / hi) * (H - M.t - M.b);
    const y0 = +t0s.slice(0, 4), years = Array.from({ length: Y - y0 + 1 }, (_, i) => y0 + i), every = (small || W < 500) ? (Y - y0 > 8 ? 4 : 2) : (Y - y0 > 12 ? 2 : 1);
    const last = pts[pts.length - 1], deep = pts.reduce((a, b) => (b[1] > a[1] ? b : a));
    const name = (s) => (s.length === 7 ? `${MON[+s.slice(5) - 1]} ${s.slice(0, 4)}` : `${+s.slice(8)} ${MON[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}`);
    el.innerHTML = frame(W, H, M, `${gridY(W, M, y, ticksOf(0, hi, small ? 3 : 5), depthTick)}
      ${years.filter((yr) => (yr - y0) % every === 0).map((yr) => `<text x="${x(`${yr}-07-01`)}" y="${H - (small ? 6 : 8)}" text-anchor="middle" class="ax">${yr}</text>`).join('')}
      <path d="M${pts.map(([s, v]) => `${x(s).toFixed(1)},${y(v).toFixed(1)}`).join(' L')}" fill="none" stroke="${LY}" stroke-width="${small ? 1.1 : 1.6}" stroke-linejoin="round"/>
      ${small ? '' : `<circle cx="${x(deep[0])}" cy="${y(deep[1])}" r="3.5" fill="${LY}"/><text x="${x(deep[0])}" y="${y(deep[1]) + 16}" text-anchor="middle" class="lbl halo">deepest · ${MON[+deep[0].slice(5, 7) - 1]} ${deep[0].slice(0, 4)} · ${mF(deep[1])}</text>`}
      <circle cx="${x(last[0])}" cy="${y(last[1])}" r="${small ? 3 : 4}" fill="${NOW}"/>${small ? '' : `<text x="${x(last[0]) - 8}" y="${y(last[1]) - 8}" text-anchor="end" class="lbl halo" font-weight="700">latest · ${mF(last[1])}</text>`}`,
    `Since ${y0}`);
    hover(el, W, (fx) => {
      const tt = t0 + fx * (t1 - t0), p = pts.reduce((a, b) => (Math.abs(t(b[0]) - tt) < Math.abs(t(a[0]) - tt) ? b : a));
      return { x: x(p[0]), html: `<b>${name(p[0])}</b><span><i style="background:${LY}"></i><b>${mF(p[1])}</b></span>` };
    });
  }

  // ── depth today: the corporations as well shafts; change since last year and depth now, each as a map or as
  //    every well side by side ──
  // readings that cannot be right are left out: deeper than 60 m, or a change of more than 20 m in a year (Teja, 25 Oct)
  const left = D.wells.filter((w) => w.odd);
  const leftNote = left.length ? ` ${left.length} wells are left out because their readings look wrong (deeper than 60 m, or more than 20 m different from a year ago): ${left.map((w) => w.name.trim().replace(/\s+/g, ' ')).join(', ')}.` : '';
  const W1 = D.wells.filter((w) => !w.odd), wells = W1.filter((w) => w.ly != null), dropped = wells.filter((w) => w.depth > w.ly).length;
  const drop = (w) => w.depth - w.ly, depMed = med(W1.map((w) => w.depth)), dropMed = med(wells.map(drop));
  const chgTxt = (v) => `${Math.abs(v).toFixed(1)} m ${v > 0 ? 'drop' : 'rise'}`;
  const tipHTML = (w) => `<b>${w.name}</b><span style="color:var(--muted)">${w.area} · ${w.agency}</span><span>water <b>${mF(w.depth)}</b> below ground</span>${w.med != null ? `<span>usual for ${MONTHNAME}: ${mF(w.med)}</span>` : ''}${w.ly != null ? `<span>last year ${mF(w.ly)}</span><span><i style="background:${drop(w) > 0 ? DROP : RISE}"></i><b>${chgTxt(drop(w))}</b></span>` : ''}`;
  const avgYears = D.avg_years.length ? span(D.avg_years[0], D.avg_years[D.avg_years.length - 1]) : '';
  let view = 'corp', show = 'map', area = 'All';   // the corporations first, then change and depth (Teja, 25 Oct)
  const DLIST = ['All', ...AREAS.filter((a) => W1.some((w) => w.area === a))];
  $('#gw-area').innerHTML = DLIST.map((d) => `<button data-v="${d}" class="${d === 'All' ? 'on' : ''}">${d === 'All' ? 'All HMDA' : d}</button>`).join('');
  const arrow = (x, y, dir, c) => `<path d="M${x - 3.2},${y - 3.5 * dir} L${x},${y + 0.5 * dir} L${x + 3.2},${y - 3.5 * dir}" fill="none" stroke="${c}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>`;

  function wavePath(x0, w, y, amp, wl, phase, close, H) {
    let d = close ? `M${x0},${H} L${x0},${y}` : `M${x0},${y}`;
    for (let x = 0; x <= w; x += 2) d += ` L${x0 + x},${(y + amp * Math.sin((x / wl + phase) * 2 * Math.PI)).toFixed(1)}`;
    return close ? `${d} L${x0 + w},${H} Z` : d;
  }
  function spreadY(items, h, gap = 14) {
    const o = [...items].sort((a, b) => a.y - b.y);
    o.forEach((l, i) => { if (i && l.y - o[i - 1].y < gap) l.y = o[i - 1].y + gap; });
    const over = o.length ? o[o.length - 1].y - (h - 5) : 0;   // keep the labels beside the shaft, not under it
    if (over > 0) o.forEach((l) => { l.y -= over; });
    return o;
  }
  // a well shaft: the ground line on top, the dry part hatched from the ground down to the water, the water below it
  // fading out with depth; the month's average dashed and last year solid as thin wavy lines, labelled to the right
  function shaft({ id, w, h, max, now, avg, ly }) {
    const pad = 10, LBL = PHONE() ? 70 : 84, W = w + pad * 2 + LBL, y = (v) => Math.max(0.75, (h * Math.min(v, max)) / max), yw = y(now);
    const amp = Math.min(2.4, Math.max(1.2, w / 45)), wl = Math.max(16, Math.round(w / 3.5));
    const lines = [[avg, '#111827', '4 3'], [ly, '#6B7280', '']].filter(([v]) => v != null).map(([v, c, dash]) =>
      `<path class="wave" style="--wl:${wl}px;--t:${(wl / 5).toFixed(1)}s" d="${wavePath(pad - 3, w + 6 + wl, y(v), 1.1, wl, 0.25, false)}" fill="none" stroke="${c}" stroke-width="1.5" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`).join('');
    const labels = spreadY([{ y: yw, t: mF(now), now: 1 }, ...(avg != null ? [{ y: y(avg), t: `avg ${mF(avg)}` }] : []), ...(ly != null ? [{ y: y(ly), t: `last yr ${mF(ly)}` }] : [])], h)
      .map((l) => `<text x="${pad + w + 8}" y="${l.y + 4.5}" font-size="13" ${l.now ? 'font-weight="700" fill="#111827"' : 'fill="#374151"'}>${l.t}</text>`).join('');
    return `<svg width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" style="overflow:visible" role="img" aria-label="water ${mF(now)} below ground">
      <defs><clipPath id="gw-c${id}"><rect x="${pad}" y="0" width="${w}" height="${h}"/></clipPath><clipPath id="gw-l${id}"><rect x="${pad - 3}" y="-4" width="${w + 6}" height="${h + 8}"/></clipPath>
        <linearGradient id="gw-g${id}" x1="0" y1="${yw}" x2="0" y2="${h}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${WATER}" stop-opacity="1"/><stop offset="1" stop-color="${WATER}" stop-opacity="0"/></linearGradient>
        <linearGradient id="gw-b${id}" x1="0" y1="${yw}" x2="0" y2="${h}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${WATER_BACK}" stop-opacity="1"/><stop offset="1" stop-color="${WATER_BACK}" stop-opacity="0"/></linearGradient></defs>
      <g clip-path="url(#gw-c${id})"><rect x="${pad}" y="0" width="${w}" height="${yw}" fill="url(#gw-hatch)"/>
        <path class="wave back" style="--wl:${wl}px;--t:${(wl / 6).toFixed(1)}s" d="${wavePath(pad - wl, w + wl * 2, yw - 1.5, amp, wl, 0.5, true, h)}" fill="url(#gw-b${id})"/>
        <path class="wave" style="--wl:${wl}px;--t:${(wl / 9).toFixed(1)}s" d="${wavePath(pad - wl, w + wl * 2, yw + 1, amp * 0.8, wl, 0, true, h)}" fill="url(#gw-g${id})"/></g>
      <line x1="${pad}" x2="${pad}" y1="0" y2="${h}" stroke="#D1D5DB"/><line x1="${pad + w}" x2="${pad + w}" y1="0" y2="${h}" stroke="#D1D5DB"/>
      <line x1="0" x2="${pad * 2 + w}" y1="0" y2="0" stroke="#6B7280" stroke-width="2.5"/>
      <g clip-path="url(#gw-l${id})">${lines}</g>${labels}</svg>`;
  }
  const AREA_LIST = ['HMDA', ...AREAS].filter((a) => D.areas[a]);
  function drawShafts(el) {
    const st = AREA_LIST.map((a) => [a, D.areas[a]]), MAX = 4 * niceMax((Math.max(...st.flatMap(([, s]) => [s.now, s.ly || 0, s.avg || 0])) * 1.08) / 4);
    const cell = PHONE() ? Math.floor((el.clientWidth - 10) / 2) : 228, side = PHONE() ? Math.max(56, cell - 8 - 70 - 4) : 130, H = Math.round(side * 1.5);
    el.innerHTML = `<div class="squares" style="--cell:${cell}px;--side:${H}px">${st.map(([a, s], i) => `<div class="it"><p class="nm">${a}</p><div class="sqw">${
      shaft({ id: i, w: side * 0.55, h: H, max: MAX, now: s.now, avg: s.avg, ly: s.ly })
    }</div><div class="cap">${s.n} wells</div></div>`).join('')}</div>
    <p class="note" style="margin-top:6px">Each shaft runs from the ground (the line on top) to ${MAX} m: hatched where it is dry, water below fading out because its full depth is not measured. avg = the median of each well's own ${MONTHNAME} readings in earlier years (telemetry, ${avgYears}); last yr = this week in ${P}.${left.length ? ` ${left.length} wells whose readings look wrong are left out; the other two views name them.` : ''}</p>`;
    return D.areas.HMDA;
  }

  let hmda = null, renderId = 0;
  async function drawMap(el, id) {
    if (!hmda) hmda = (await (await fetch(`${import.meta.env.BASE_URL}live/hmda.geojson`)).json()).features[0].geometry.coordinates[0];
    if (id !== renderId || !alive) return null;
    const W = el.clientWidth, K = Math.cos((17.4 * Math.PI) / 180);
    const xs = hmda.map((p) => p[0]), ys = hmda.map((p) => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const H = Math.min(600, ((y1 - y0) / ((x1 - x0) * K)) * W), Wd = (H * ((x1 - x0) * K)) / (y1 - y0), ox = (W - Wd) / 2;
    const px = (lon) => ox + ((lon - x0) / (x1 - x0)) * Wd, py = (lat) => ((y1 - lat) / (y1 - y0)) * H;
    const CAP = view === 'dep' ? 40 : 20, k = view === 'dep' ? Math.min(2.2, H / 260) : Math.min(3.2, H / 180);      // px per metre; long lines stop at the cap
    const set = view === 'dep' ? W1 : wells, len = (v) => Math.min(Math.abs(v), CAP) * k;
    const marks = [...set].sort((a, b) => b.lat - a.lat).map((w) => {
      const x = px(w.lon), y = py(w.lat);
      if (view === 'dep') {
        const e = y + len(w.depth);
        return `<g class="spk" data-i="${W1.indexOf(w)}"><line x1="${x}" x2="${x}" y1="${y}" y2="${e}" stroke="${DEPTH_LIGHT}" stroke-width="1.6"/>${w.depth > CAP ? `<line x1="${x - 3}" x2="${x + 3}" y1="${e - 6}" y2="${e - 4}" stroke="#fff" stroke-width="2"/>` : ''}<circle cx="${x}" cy="${y}" r="2.6" fill="#374151"/><rect x="${x - 5}" y="${y - 5}" width="10" height="${len(w.depth) + 10}" fill="transparent"/></g>`;
      }
      const v = drop(w), dir = v > 0 ? 1 : -1, c = v > 0 ? DROP : RISE, e = y + dir * len(v);
      return `<g class="spk" data-i="${W1.indexOf(w)}"><line x1="${x}" x2="${x}" y1="${y}" y2="${e}" stroke="${c}" stroke-width="2"/>${Math.abs(v) > CAP ? `<line x1="${x - 3}" x2="${x + 3}" y1="${e - 5 * dir}" y2="${e - 3 * dir}" stroke="#fff" stroke-width="2"/>` : ''}${Math.abs(v) >= 0.3 ? arrow(x, e, dir, c) : ''}<circle cx="${x}" cy="${y}" r="2.6" fill="#374151"/><rect x="${x - 5}" y="${Math.min(y, e) - 5}" width="10" height="${Math.abs(e - y) + 10}" fill="transparent"/></g>`;
    }).join('');
    const scale = view === 'dep' ? 10 : 5, ring = (r) => `M${r.map((p) => `${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join(' L')}Z`;
    el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="overflow:visible" role="img" aria-label="Map of the wells in HMDA">
      <path d="${ring(hmda)}" fill="#FAFAFB" stroke="#D1D5DB"/>
      ${D.corps.map(([, polys]) => `<path d="${polys.map((pl) => ring(pl[0])).join(' ')}" fill="#F3F4F6" stroke="#9CA3AF" stroke-width="0.8"/>`).join('')}
      ${D.corps.filter(([n]) => n !== 'Secunderabad Cantonment').map(([n, polys]) => { const r = polys.reduce((a, b) => (b[0].length > a[0].length ? b : a))[0], cx = r.reduce((s, p) => s + p[0], 0) / r.length, cy = r.reduce((s, p) => s + p[1], 0) / r.length; return `<text x="${px(cx)}" y="${py(cy)}" text-anchor="middle" class="ax halo map-lbl">${n}</text>`; }).join('')}${marks}
      <g transform="translate(${W - 80},16)"><line x1="0" x2="0" y1="0" y2="${scale * k}" stroke="#374151" stroke-width="2"/><line x1="-4" x2="4" y1="${scale * k}" y2="${scale * k}" stroke="#374151"/><text x="8" y="${(scale * k) / 2 + 4}" class="ax">${scale} m</text></g>
    </svg><div class="tip" hidden></div>`;
    const tip = el.querySelector('.tip');
    el.querySelectorAll('.spk').forEach((g) => {
      g.onmouseenter = () => {
        tip.innerHTML = tipHTML(W1[+g.dataset.i]); tip.hidden = false;
        const r = g.getBoundingClientRect(), rr = el.getBoundingClientRect();
        tip.style.left = `${Math.min(r.left - rr.left + 12, W - tip.offsetWidth - 4)}px`; tip.style.top = `${r.top - rr.top}px`; g.parentNode.appendChild(g);
      };
      g.onmouseleave = () => { tip.hidden = true; };
    });
    return CAP;
  }
  function drawBars(el) {
    const base = (view === 'dep' ? W1 : wells).filter((w) => area === 'All' || w.area === area);
    const ws = [...base].sort((a, b) => (view === 'dep' ? b.depth - a.depth : drop(b) - drop(a)));
    const W = el.clientWidth, H = 320, M = { l: 46, r: 10, t: 12, b: 24 }, slot = (W - M.l - M.r) / ws.length, bw = Math.max(1, Math.min(14, slot * 0.72));
    let y, ticks, bars, fmt;
    if (view === 'dep') {
      const hi = 4 * niceMax((Math.max(...ws.map((w) => w.depth)) * 1.03) / 4);
      y = (v) => M.t + (v / hi) * (H - M.t - M.b); ticks = ticksOf(0, hi, 5); fmt = depthTick;
      bars = ws.map((w, i) => { const x = M.l + slot * i + (slot - bw) / 2; return `<rect x="${x}" y="${y(0)}" width="${bw}" height="${y(w.depth) - y(0)}" fill="${DEPTH_LIGHT}"/>${w.med != null ? `<circle cx="${x + bw / 2}" cy="${y(w.med)}" r="${Math.max(2.2, Math.min(3.5, bw / 2 + 0.6))}" fill="${USUAL}" stroke="#fff" stroke-width="0.8"/>` : ''}`; }).join('');
    } else {
      const dn = Math.max(...ws.map(drop), 0), up = Math.max(...ws.map((w) => -drop(w)), 0), step = niceMax(Math.max(dn, up) / 3), lo = -Math.ceil(up / step) * step, hi = Math.ceil(dn / step) * step;
      y = (v) => M.t + ((v - lo) / (hi - lo)) * (H - M.t - M.b); ticks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step); fmt = (v) => (v === 0 ? '0' : `${v > 0 ? '−' : '+'}${Math.abs(v)}`);
      bars = ws.map((w, i) => { const v = drop(w); return `<rect x="${M.l + slot * i + (slot - bw) / 2}" y="${Math.min(y(0), y(v))}" width="${bw}" height="${Math.max(0.6, Math.abs(y(v) - y(0)))}" fill="${v > 0 ? DROP_MUTED : RISE_MUTED}"/>`; }).join('');
    }
    el.innerHTML = frame(W, H, M, `${gridY(W, M, y, ticks, fmt)}<line x1="${M.l}" x2="${W - M.r}" y1="${y(0)}" y2="${y(0)}" stroke="#6B7280"/>
      <text x="${M.l}" y="${H - 6}" class="ax">${view === 'dep' ? 'deepest' : 'biggest drop'}</text><text x="${W - M.r}" y="${H - 6}" text-anchor="end" class="ax">${view === 'dep' ? 'shallowest' : 'risen most'} →</text>${bars}`,
    view === 'dep' ? 'Depth to water at each well' : 'Change since last year at each well');
    el.querySelector('.hair').setAttribute('stroke', 'transparent');
    hover(el, W, (fx) => { const i = Math.max(0, Math.min(ws.length - 1, Math.floor(fx * ws.length))); return { x: M.l + slot * (i + 0.5), html: tipHTML(ws[i]) }; });
    return ws;
  }
  const HATCH_KEY = 'width:14px;height:10px;border-radius:0;background:repeating-linear-gradient(135deg,rgba(194,65,59,.6) 0 1.5px,transparent 1.5px 5px);border:1px solid #D1D5DB';
  async function render() {
    const id = ++renderId;
    root.querySelectorAll('#gw-view button').forEach((b) => { b.classList.toggle('on', b.dataset.v === view); b.setAttribute('aria-selected', b.dataset.v === view); });
    root.querySelectorAll('#gw-show button').forEach((b) => b.classList.toggle('on', b.dataset.v === show));
    root.querySelectorAll('#gw-area button').forEach((b) => b.classList.toggle('on', b.dataset.v === area));
    $('#gw-area-row').hidden = view === 'corp' || show !== 'bars'; $('#gw-show-row').hidden = view === 'corp';
    $('#gw-w1').textContent = dateStr;
    const el = $('#gw-g1'), stats = $('#gw-stats'), key = $('#gw-k1');
    if (view === 'corp') {
      const h = drawShafts(el), d = h.now - h.avg;
      stats.innerHTML = `<div><b>${mF(h.now)}</b>median depth now, HMDA</div><div><b>${mF(h.avg)}</b>${MONTHNAME} average</div><div><b>${mF(h.ly)}</b>this week last year</div>`;
      key.innerHTML = `<span><i class="ln" style="border-top:2.5px solid #6B7280"></i>ground</span><span><i style="${HATCH_KEY}"></i>dry, from the ground to the water</span><span><i style="width:14px;height:10px;border-radius:0;background:linear-gradient(${WATER},rgba(127,166,206,0))"></i>water</span><span><i class="ln" style="border-top:1.5px dashed #111827"></i>avg = ${MONTHNAME} average</span><span><i class="ln" style="border-top:1.5px solid #6B7280"></i>last yr</span>`;
      $('#gw-s1').textContent = 'Median depth to water in each corporation: today, the average for this month, and this week last year';
      $('#gw-n1').textContent = '';
      $('#gw-t1').textContent = `Water is ${mF(h.now)} down across HMDA, a ${chgTxt(d)} on the ${MONTHNAME} average`;
      return;
    }
    stats.innerHTML = view === 'dep'
      ? `<div><b>${mF(depMed)}</b>median depth to water</div><div><b>${W1.filter((w) => w.depth > 20).length} of ${W1.length}</b>wells deeper than 20 m</div>`
      : `<div><b>${mF(dropMed)}</b>median drop since last year</div><div><b>${dropped} of ${wells.length}</b>wells where the water has dropped</div>`;
    key.innerHTML = view === 'dep'
      ? (show === 'bars' ? `<span><i style="width:12px;height:10px;border-radius:0;background:${DEPTH_LIGHT}"></i>depth to water today</span><span><i style="background:${USUAL}"></i>the well's usual depth for ${MONTHNAME}</span>`
        : `<span><i class="ln" style="width:0;height:12px;border-left:2px solid ${DEPTH_LIGHT};vertical-align:-2px"></i>from the well (dot) down to the water</span>`)
      : `<span><i class="ln" style="width:0;height:12px;border-left:3px solid ${show === 'bars' ? DROP_MUTED : DROP};vertical-align:-2px"></i>dropped (down)</span><span><i class="ln" style="width:0;height:12px;border-left:3px solid ${show === 'bars' ? RISE_MUTED : RISE};vertical-align:-2px"></i>risen (up)</span>`;
    if (show === 'map') {
      const cap = await drawMap(el, id); if (cap == null) return;
      $('#gw-s1').textContent = view === 'dep' ? 'From each well (dot) a line hangs down as far as the water is below ground: the longer the line, the deeper the water'
        : 'From each well a line shows how far the water has moved since this week last year: down for a drop, up for a rise';
      $('#gw-n1').textContent = `Telemetry wells with a reading in the last 10 days${view === 'chg' ? ' and one a year earlier' : ''}. Lines stop at ${cap} m. Point at a well for its name and numbers.${leftNote}`;
      $('#gw-t1').textContent = view === 'dep' ? `Water is ${mF(depMed)} below ground at the median well` : `The water has dropped in ${dropped} of ${wells.length} wells since this week last year`;
    } else {
      const ws = drawBars(el), where = area === 'All' ? '' : ` in ${area}`;
      $('#gw-s1').textContent = view === 'dep' ? `Each bar is one well: depth to water below ground today, deepest first; the dot is the well's usual ${MONTHNAME} depth (median of its readings in earlier years, ${avgYears})`
        : 'Each bar is one well: the drop since this week last year below the line, a rise above it';
      $('#gw-n1').textContent = `Point at a bar for the well's name and numbers.${leftNote}`;
      $('#gw-t1').textContent = view === 'dep' ? `The deepest well${where} has water ${mF(Math.max(...ws.map((w) => w.depth)))} below ground; the median is ${mF(med(ws.map((w) => w.depth)))}`
        : `The water has dropped in ${ws.filter((w) => drop(w) > 0).length} of ${ws.length} wells${where}; the median drop is ${mF(med(ws.map(drop)))}`;
    }
  }
  $('#gw-view').onclick = (e) => { const b = e.target.closest('button'); if (b) { view = b.dataset.v; render(); } };
  $('#gw-show').onclick = (e) => { const b = e.target.closest('button'); if (b) { show = b.dataset.v; render(); } };
  $('#gw-area').onclick = (e) => { const b = e.target.closest('button'); if (b) { area = b.dataset.v; render(); } };
  render(); on('resize', render);

  // ── depth over time ──
  const toDoy = (ser) => { const by = {}; Object.entries(ser).forEach(([d, v]) => { (by[d.slice(0, 4)] = by[d.slice(0, 4)] || []).push([doy(d), v]); }); return by; };
  const DISTS = AREAS.filter((a) => DAILY[a]);   // the 2026 corporations and the rest of HMDA
  const hmdaY = toDoy(DAILY.HMDA), hy = Object.keys(hmdaY).sort(), y0 = +hy[0];
  const nowHMDA = hmdaY[Y][hmdaY[Y].length - 1][1], lyPt = at(hmdaY[P], hmdaY[Y][hmdaY[Y].length - 1][0])[1];
  const corpY0 = Math.min(...DISTS.map((a) => +Object.keys(DAILY[a])[0].slice(0, 4)));
  const mFirst = monthHMDA[0], mLast = monthHMDA[monthHMDA.length - 1], mName = (m) => `${MON[+m.slice(5) - 1]} ${m.slice(0, 4)}`;
  const deepM = monthHMDA.reduce((a, b) => (b[1] > a[1] ? b : a));
  const dropped2 = DISTS.filter((k) => { const s = toDoy(DAILY[k]); return s[Y] && s[P] && s[Y].at(-1)[1] > at(s[P], s[Y].at(-1)[0])[1]; });
  const notDropped = DISTS.filter((k) => !dropped2.includes(k));
  const BLOCKS = [
    { id: 'dt', label: 'Depth over time',
      key: { d: `<span><i class="ln" style="border-top:2px solid ${NOW}"></i>${Y}</span><span><i class="ln" style="border-top:1.5px solid ${LY}"></i>${P}</span>${y0 < P ? `<span><i class="ln" style="border-top:1px solid #C4C8CE"></i>each year, ${span(y0, P - 1)} · point at a line to name it</span>` : ''}`, l: '' },
      when: { d: { t: `${y0}–${Y}`, r: `${corpY0}–${Y}` }, l: { t: `${mFirst[0].slice(0, 4)}–${Y}`, r: `${corpY0}–${Y}` } },
      sub: { d: 'Median depth to water below ground, telemetry wells · 7-day average · ground at the top',
        l: { t: 'Median depth to water below ground, TSGW monthly wells · ground at the top', r: 'Median depth to water below ground, telemetry wells · ground at the top' } },
      title: { d: { t: `Water is ${mF(nowHMDA)} down, against ${mF(lyPt)} this week last year`,
        r: notDropped.length ? `The water has dropped since last year everywhere but ${list(notDropped)}` : 'The water has dropped since last year in every corporation and the rest of HMDA' },
        l: { t: `Deepest in ${mName(deepM[0])}, at ${mF(deepM[1])}; ${mName(mLast[0])} was ${mF(mLast[1])}`, r: `Each corporation since the telemetry wells began in ${corpY0}` } },
      note: { d: 'Telemetry wells report every six hours; the line is the median of the wells reporting each day (at least 20).',
        l: `TSGW measures its monthly wells by hand; the line is the median of the wells measured each month. The set of wells grew from ${mFirst[2]} in ${mFirst[0].slice(0, 4)} to ${mLast[2]} now. Monthly readings so far run to ${MONTH[+mLast[0].slice(5) - 1]} ${mLast[0].slice(0, 4)}.` },
      noteR: `Corporations as formed in 2026 (GHMC, Cyberabad, Malkajgiri, Secunderabad Cantonment Board), and the rest of HMDA; telemetry wells only, each line starting when at least four of its wells reported (from ${corpY0}).`,
      draw: (v, n, el, small) => {
        const H = small ? 150 : 300;
        if (n === 'HMDA' && v === 'l') return longLine(el, monthHMDA, { H, small, t0s: `${mFirst[0].slice(0, 4)}-01-01` });
        if (v === 'l') return longLine(el, Object.entries(DAILY[n]), { H, small, t0s: `${corpY0}-01-01` });
        const s = toDoy(DAILY[n]), others = {};
        Object.keys(s).filter((y) => +y < P).forEach((y) => { others[y] = roll(s[y]); });
        return yoy(el, { sNow: roll(s[Y] || []), sPrev: roll(s[P] || []), others, H, small });
      },
      names: DISTS, head: (n) => { const s = toDoy(DAILY[n]); return s[Y] ? mF(s[Y].at(-1)[1]) : ''; } },
  ];
  $('#gw-blocks').innerHTML = BLOCKS.map((b) => `<h2 class="blk">${b.label}</h2>
<figure class="fig" id="gw-b-${b.id}">
  <h2 class="fig-title"><span class="t"></span><small class="w"></small></h2>
  <p class="fig-sub"></p>
  <div class="ctl">
    <div class="row"><span class="lab">View</span><div class="tabs" data-k="view"><button data-v="d" class="on">Each day</button><button data-v="l">Since ${mFirst[0].slice(0, 4)}</button></div></div>
    <div class="row"><span class="lab">Show</span><div class="tabs" data-k="scope"><button data-v="t" class="on">HMDA</button><button data-v="r">By corporation</button></div></div>
  </div>
  <div class="key"></div>
  <div class="chart total"></div>
  <div class="multiples" hidden></div>
  <p class="note"></p>
  ${foot('TSGW and CGWB telemetry wells (via NWDP); TSGW monthly wells')}
</figure>`).join('\n');
  BLOCKS.forEach((b) => {
    const fig = $(`#gw-b-${b.id}`), st = { view: 'd', scope: 't' };
    function render2() {
      fig.querySelectorAll('.tabs').forEach((t) => t.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.v === st[t.dataset.k])));
      const sub = b.sub[st.view];
      fig.querySelector('.t').textContent = b.title[st.view][st.scope]; fig.querySelector('.w').textContent = b.when[st.view][st.scope];
      fig.querySelector('.fig-sub').textContent = typeof sub === 'string' ? sub : sub[st.scope];
      const key = fig.querySelector('.key'); key.innerHTML = b.key[st.view]; key.hidden = !b.key[st.view];
      fig.querySelector('.note').textContent = st.scope === 'r' ? b.noteR : b.note[st.view];
      const total = fig.querySelector('.total'), mult = fig.querySelector('.multiples');
      total.hidden = st.scope !== 't'; mult.hidden = st.scope !== 'r';
      if (st.scope === 't') { b.draw(st.view, 'HMDA', total, false); return; }
      mult.innerHTML = b.names.map((n, i) => `<div class="mp"><p class="mp-t"><b>${n}</b><span>${b.head(n)}</span></p><div class="chart" id="gw-${b.id}-mp${i}"></div></div>`).join('');
      b.names.forEach((n, i) => b.draw(st.view, n, $(`#gw-${b.id}-mp${i}`), true));
    }
    fig.querySelectorAll('.tabs').forEach((t) => { t.onclick = (e) => { const x = e.target.closest('button'); if (!x) return; st[t.dataset.k] = x.dataset.v; render2(); }; });
    on('resize', render2); render2();
  });

  root.addEventListener('click', (e) => { if (e.target.closest('a[href="#about"]')) { const d = document.getElementById('about'); if (d) d.open = true; } });

  // share: the system share sheet where there is one, otherwise copy the link
  root.querySelectorAll('.share').forEach((b) => { b.onclick = () => {
    const url = 'https://hyderabad.urbanobservatory.in/live/groundwater/';
    if (navigator.share) navigator.share({ title: 'Hyderabad groundwater', url }).catch(() => {});
    else navigator.clipboard?.writeText(url).then(() => { b.setAttribute('aria-label', 'Link copied'); b.classList.add('done'); setTimeout(() => b.classList.remove('done'), 1500); });
  }; });

  // scroll-down pill: names the next block below the screen; gone once the last block is in view
  const pill = $('#gw-more'), next = $('#gw-more-next');
  function update() {
    const below = [...root.querySelectorAll('.blk')].find((h) => h.getBoundingClientRect().top > innerHeight - 60);
    pill.classList.toggle('gone', !below);
    if (below) { next.textContent = `· ${below.textContent}`; pill.onclick = () => below.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }
  on('scroll', update, { passive: true }); on('resize', update); update();

  // on wide screens a list of the page's sections sits in the left margin; the one being read is marked
  const heads = [...root.querySelectorAll('.blk')];
  heads.forEach((h, i) => { h.id = h.id || `gw-s${i}`; });
  const about = document.getElementById('about');
  const toc = document.createElement('nav');
  toc.className = 'gw-toc'; toc.setAttribute('aria-label', 'On this page');
  toc.innerHTML = `<p>On this page</p>${heads.map((h) => `<a href="#${h.id}">${h.textContent}</a>`).join('')}${about ? '<a href="#about" class="gw-toc-about">About this data</a>' : ''}`;
  root.appendChild(toc);
  toc.onclick = (e) => {
    const a = e.target.closest('a'); if (!a) return;
    e.preventDefault();
    const target = document.getElementById(a.getAttribute('href').slice(1));
    if (target === about) about.open = true;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  function mark() {
    const all = about ? [...heads, about] : heads;
    let current = all[0];
    all.forEach((h) => { if (h.getBoundingClientRect().top < 140) current = h; });
    toc.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === `#${current.id}`));
  }
  on('scroll', mark, { passive: true }); mark();

  return () => { alive = false; listeners.forEach(([type, fn]) => removeEventListener(type, fn)); };
}
