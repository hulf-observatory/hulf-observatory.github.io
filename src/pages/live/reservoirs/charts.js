// The Reservoirs page (/live/reservoirs/): storage today, storage over time, withdrawal, inflow and where the water
// comes from. Plain SVG strings drawn at the measured width; the data is reservoirs-history.json from the live feed
// (repo live-feed, reservoirs_history.py), already cleaned of HMWSSB's known faults.
// mount(root, D) draws everything into root and returns a function that removes the window listeners.

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MSTART = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
const MULTI = ['Singur', 'Osman Sagar', 'Himayat Sagar', 'Manjira', 'Akkampally', 'Yellampally'];
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];
const BLUE = '#7FA6CE', LIGHT = '#B7CDE4', WATER = '#7FA6CE', WATER_BACK = '#B7CDE4';
const OTHER = '#D9DCE1', LY = '#3F76B0', NOW = '#C2413B';   // this year red, last year blue, earlier years grey
// the house blue ramp; the smaller the river's share, the darker
const SRC_COL = { Krishna: '#B7CDE4', Godavari: '#7FA6CE', Manjira: '#3F76B0', 'Osman & Himayat Sagar': '#123F70' };

const n0 = (v) => (v >= 100 ? Math.round(v).toLocaleString('en-IN') : v >= 10 ? v.toFixed(0) : v.toFixed(1));
const pctF = (v) => `${Math.round(v)}%`;
const lastOf = (s) => s[s.length - 1][1];
const at = (s, d) => s.reduce((b, p) => (Math.abs(p[0] - d) < Math.abs(b[0] - d) ? p : b));
const ticksOf = (lo, hi, n) => Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));
const roll = (s) => s.map((p, i) => { const w = s.slice(Math.max(0, i - 3), i + 4); return [p[0], w.reduce((a, q) => a + q[1], 0) / w.length]; });
const ymd = (y, d) => new Date(Date.UTC(+y, 0, d)).toISOString().slice(0, 10);
function niceMax(v) { if (v <= 0) return 1; const m = 10 ** Math.floor(Math.log10(v)); return [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((k) => k * m).find((k) => k >= v); }
const range = (obj) => { const ys = Object.keys(obj).sort(); return ys.length ? `${ys[0]}–${ys[ys.length - 1]}` : ''; };

const SHARE_ICON = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="11" cy="3" r="1.8"/><circle cx="3" cy="7" r="1.8"/><circle cx="11" cy="11" r="1.8"/><path d="M4.6 6.2 9.4 3.8M4.6 7.8l4.8 2.4"/></svg>';
const foot = (Y) => `<div class="foot"><p><b>Data source:</b> HMWSSB daily reservoir levels (2014–${Y}) – <a href="#about">Learn more about this data</a><br>hyderabad.urbanobservatory.in/live/reservoirs | Hyderabad Urban Observatory</p>
  <button class="btn share" type="button" aria-label="Share this page">${SHARE_ICON}</button></div>`;

export function mount(root, D) {
  const Y = D.year, P = D.prev, SY = D.season_year;
  const asOf = new Date(`${D.as_of}T00:00:00`);
  const dayMon = `${asOf.getDate()} ${MON[asOf.getMonth()]}`, date = `${dayMon} ${Y}`, MONTHNAME = MONTH[asOf.getMonth()];
  const listeners = [];
  const on = (type, fn, opts) => { addEventListener(type, fn, opts); listeners.push([type, fn]); };
  const $ = (sel) => root.querySelector(sel);
  const PHONE = () => innerWidth < 640;

  root.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><pattern id="rv-hatch" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="rgba(194,65,59,.6)" stroke-width="1.5"/></pattern></defs></svg>
<h2 class="blk first">Storage</h2>
<figure class="fig">
  <h2 class="fig-title"><span id="rv-title"></span><small id="rv-when"></small></h2>
  <p class="fig-sub" id="rv-sub"></p>
  <div class="ctl">
    <div class="row"><span class="lab">View</span><div class="tabs" role="tablist" id="rv-a-tabs">
      <button role="tab" data-p="a" class="on"><svg width="14" height="14" viewBox="0 0 14 14"><rect x="1" y="6" width="5" height="7" fill="none" stroke="currentColor"/><rect x="8" y="1" width="5" height="12" fill="none" stroke="currentColor"/></svg>Today</button>
      <button role="tab" data-p="b"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 4H12M2 10H12" stroke="currentColor"/><circle cx="4" cy="4" r="2" fill="currentColor"/><circle cx="10" cy="10" r="2" fill="currentColor"/></svg>Against last year</button>
    </div></div>
    <div class="row" id="rv-size"><span class="lab">Size</span><div class="tabs"><button data-s="same" class="on">Same size</button><button data-s="cap">By capacity</button></div></div>
  </div>
  <div class="pane" id="rv-p-a">
    <div class="key">
      <span><i style="background:${WATER};border-radius:2px"></i>Today</span>
      <span><i class="ln" style="border-top:1.5px dashed #111827"></i>avg = ${MONTHNAME} average, 2014–${P}</span>
      <span><i class="ln" style="border-top:1.5px solid #6B7280"></i>last yr = this date in ${P}</span>
      <span><i style="width:14px;height:10px;border-radius:0;background:repeating-linear-gradient(135deg,rgba(194,65,59,.6) 0 1.5px,transparent 1.5px 5px);border:1px solid #D1D5DB"></i>below the average</span>
    </div>
    <div class="squares" id="rv-sq"></div>
  </div>
  <div class="pane" id="rv-p-b" hidden>
    <div class="key">
      <span><i style="background:${LIGHT}"></i>This date last year</span>
      <span><i style="background:${BLUE}"></i>Today</span>
      <span><i class="ln" style="width:0;height:12px;border-left:1.5px dashed #111827;vertical-align:-2px"></i>${MONTHNAME} average, 2014–${P}</span>
    </div>
    <div id="rv-rows"></div>
  </div>
  ${foot(Y)}
</figure>
<div id="rv-blocks"></div>
<h2 class="blk">Where the water comes from</h2>
<figure class="fig">
  <h2 class="fig-title"><span id="rv-src-title"></span><small>2014–${Y}</small></h2>
  <p class="fig-sub" id="rv-src-sub"></p>
  <div class="ctl"><div class="row"><span class="lab">Show</span><div class="tabs" id="rv-src-mode"><button data-v="mld" class="on">MLD</button><button data-v="pct">Share</button></div></div></div>
  <div class="key" id="rv-src-key"></div>
  <div class="chart" id="rv-src-chart"></div>
  <p class="note">Godavari water started in December 2015. These are the reservoirs in HMWSSB's daily table; groundwater and other sources are not in it.</p>
  ${foot(Y)}
</figure>
<button class="more gone" id="rv-more" type="button"><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1V10M2 6.5 6 10.5 10 6.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>More below <span id="rv-more-next"></span></button>`;

  // ── storage today: one tank per reservoir ──
  const SHOW = D.res;
  const city = D.res.filter((r) => r.city).sort((a, b) => b.ftl - a.ftl);
  const tot = city.reduce((s, r) => s + r.now, 0), cap = city.reduce((s, r) => s + r.ftl, 0), totLy = city.reduce((s, r) => s + (r.ly / 100) * r.ftl, 0);

  function wavePath(x0, w, y, amp, wl, phase, close, H) {
    let d = close ? `M${x0},${H} L${x0},${y}` : `M${x0},${y}`;
    for (let x = 0; x <= w; x += 2) d += ` L${x0 + x},${(y + amp * Math.sin((x / wl + phase) * 2 * Math.PI)).toFixed(1)}`;
    return close ? `${d} L${x0 + w},${H} Z` : d;
  }
  function spreadY(items, h, gap = 14) {
    const o = [...items].sort((a, b) => a.y - b.y);
    o.forEach((l, i) => { if (i && l.y - o[i - 1].y < gap) l.y = o[i - 1].y + gap; });
    const over = o.length ? o[o.length - 1].y - (h - 5) : 0;   // keep the labels beside the tank, not under it
    if (over > 0) o.forEach((l) => { l.y -= over; });
    return o;
  }
  // water to today (two layers drifting), the average dashed and last year solid as thin wavy lines, each labelled to
  // the right; a shortfall against the average hatched red (DESIGN-SYSTEM §5)
  function tank({ id, w, h, max, now, avg, ly, fmt }) {
    const pad = 4, LBL = PHONE() ? 70 : 80, W = w + pad * 2 + LBL, y = (v) => Math.max(0.75, h * (1 - Math.min(v, max) / max));
    const amp = Math.min(2.6, Math.max(1.3, w / 45)), wl = Math.max(16, Math.round(w / 3.5)), yw = h * (1 - Math.min(now, max) / max);
    const lines = [[avg, '#111827', '4 3'], [ly, '#6B7280', '']].filter(([v]) => v != null).map(([v, c, dash]) =>
      `<path class="wave" style="--wl:${wl}px;--t:${(wl / 5).toFixed(1)}s" d="${wavePath(pad - 3, w + 6 + wl, y(v), 1.1, wl, 0.25, false)}" fill="none" stroke="${c}" stroke-width="1.5" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`).join('');
    const labels = spreadY([{ y: yw, t: fmt(now), now: 1 }, ...(avg != null ? [{ y: y(avg), t: `avg ${fmt(avg)}` }] : []), { y: y(ly), t: `last yr ${fmt(ly)}` }], h)
      .map((l) => `<text x="${pad + w + 8}" y="${l.y + 4.5}" font-size="13" ${l.now ? 'font-weight="700" fill="#111827"' : 'fill="#374151"'}>${l.t}</text>`).join('');
    const gap = avg != null && now < avg ? `<rect x="${pad}" y="${y(avg)}" width="${w}" height="${Math.max(0, yw - y(avg))}" fill="url(#rv-hatch)"/>` : '';
    return `<svg width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" style="overflow:visible" role="img" aria-label="${fmt(now)} full">
      <defs><clipPath id="rv-c${id}"><rect x="${pad}" y="0" width="${w}" height="${h}"/></clipPath><clipPath id="rv-l${id}"><rect x="${pad - 3}" y="-4" width="${w + 6}" height="${h + 8}"/></clipPath></defs>
      <rect x="${pad}" y="0" width="${w}" height="${h}" fill="#FAFAFB"/>
      <g clip-path="url(#rv-c${id})">${gap}
        <path class="wave back" style="--wl:${wl}px;--t:${(wl / 6).toFixed(1)}s" d="${wavePath(pad - wl, w + wl * 2, yw - 1.5, amp, wl, 0.5, true, h)}" fill="${WATER_BACK}"/>
        <path class="wave" style="--wl:${wl}px;--t:${(wl / 9).toFixed(1)}s" d="${wavePath(pad - wl, w + wl * 2, yw + 1, amp * 0.8, wl, 0, true, h)}" fill="${WATER}"/>
      </g>
      <rect x="${pad + 0.5}" y=".5" width="${w - 1}" height="${h - 1}" fill="none" stroke="#D1D5DB"/>
      <g clip-path="url(#rv-l${id})">${lines}</g>${labels}</svg>`;
  }
  const TEXT = {
    a: [`City reservoirs are ${Math.round((tot / cap) * 100)}% full, against ${Math.round((totLy / cap) * 100)}% a year ago`, '', date],
    b: [`${SHOW.filter((r) => r.pct < r.ly).length} of ${SHOW.length} reservoirs are lower than a year ago`, `% of full storage, today against the same date last year and the ${MONTHNAME} average`, date],
  };
  let cur = 'a', size = 'same';
  function drawA() {
    // sized from the space there is, not the screen: three a row when they fit at full size, otherwise two, smaller
    const box = $('#rv-sq'), bw = box.clientWidth, cols = bw >= 690 ? 3 : 2, cell = Math.min(228, Math.floor((bw - 10 * (cols - 1)) / cols));
    const MAXS = Math.max(56, Math.min(140, cell - 8 - (PHONE() ? 70 : 80) - 4)), maxFtl = Math.max(...SHOW.map((r) => r.ftl));
    box.style.setProperty('--cell', `${cell}px`); box.style.setProperty('--side', `${MAXS}px`); box.style.gridTemplateColumns = `repeat(${cols}, max-content)`;
    const side = (r) => (size === 'same' ? MAXS : Math.max(24, Math.round(MAXS * Math.sqrt(r.ftl / maxFtl))));
    const item = (r, i, note = '') => `<div class="it"><div class="sqw">${tank({ id: i, w: side(r), h: side(r), max: 100, now: r.pct, avg: r.norm, ly: r.ly, fmt: pctF })}</div><div class="cap"><b>${r.name}</b>${note}${r.ftl} TMC when full</div></div>`;
    box.innerHTML = city.map((r, i) => item(r, i)).join('') + SHOW.filter((r) => !r.city).map((r, i) => item(r, 9 + i, 'Godavari, not in the city total<br>')).join('');
    root.querySelectorAll('#rv-size button').forEach((b) => b.classList.toggle('on', b.dataset.s === size));
    TEXT.a[1] = size === 'same' ? 'Each square is one reservoir, all drawn the same size · water = share full today'
      : 'Square size = what the reservoir holds when full · water = share full today';
    if (cur === 'a') $('#rv-sub').textContent = TEXT.a[1];
  }
  // against last year: one row per reservoir, the month's average as a dashed tick
  $('#rv-rows').innerHTML = [...SHOW].sort((a, b) => (a.pct - a.ly) - (b.pct - b.ly)).map((r) => {
    const a = Math.min(r.pct, r.ly), b = Math.max(r.pct, r.ly);
    return `<div class="db-row"><span class="n">${r.name}</span>
      <svg width="100%" height="20" style="overflow:visible" aria-hidden="true"><line x1="0" x2="100%" y1="10" y2="10" stroke="#E5E7EB"/>
       ${r.norm != null ? `<line x1="${r.norm}%" x2="${r.norm}%" y1="2" y2="18" stroke="#111827" stroke-width="1.5" stroke-dasharray="3 2"/>` : ''}
       <line x1="${a}%" x2="${b}%" y1="10" y2="10" stroke="${r.pct < r.ly ? NOW : '#9CA3AF'}" stroke-width="2"/>
       <circle cx="${r.ly}%" cy="10" r="6" fill="${LIGHT}"/><circle cx="${r.pct}%" cy="10" r="6" fill="${BLUE}" stroke="#fff" stroke-width="1.5"/></svg>
      <span class="v">was ${Math.round(r.ly)}%, now <b>${Math.round(r.pct)}%</b>${r.norm != null ? ` · avg ${Math.round(r.norm)}%` : ''}</span></div>`;
  }).join('');
  function showA(p) {
    cur = p;
    root.querySelectorAll('#rv-a-tabs button').forEach((b) => { b.classList.toggle('on', b.dataset.p === p); b.setAttribute('aria-selected', b.dataset.p === p); });
    $('#rv-p-a').hidden = p !== 'a'; $('#rv-p-b').hidden = p !== 'b'; $('#rv-size').hidden = p !== 'a';
    $('#rv-title').textContent = TEXT[p][0]; $('#rv-sub').textContent = TEXT[p][1]; $('#rv-when').textContent = TEXT[p][2];
  }
  $('#rv-a-tabs').onclick = (e) => { const b = e.target.closest('button'); if (b) showA(b.dataset.p); };
  $('#rv-size').onclick = (e) => { const b = e.target.closest('button'); if (b) { size = b.dataset.s; drawA(); } };
  drawA(); showA('a');
  on('resize', drawA);

  // ── charts over time ──
  const calName = (d) => { const t = new Date(Y, 0, d); return `${t.getDate()} ${MON[t.getMonth()]}`; };
  const juneName = (k) => { const t = new Date(Y, 5, 1 + k); return `${t.getDate()} ${MON[t.getMonth()]}`; };
  const CAL_X = { xs: [1, 365], labels: MSTART.map((d, i) => [d + 14, MON[i]]), name: calName };
  const JUNE_X = { xs: [0, 364], labels: [0, 30, 61, 92, 122, 153, 183, 214, 245, 273, 304, 334].map((o, i) => [o + 15, ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'][i]]), name: juneName };
  const KEY3 = (a, b, yrs) => `<span><i class="ln" style="border-top:2px solid ${NOW}"></i>${a}</span><span><i class="ln" style="border-top:1.5px solid ${LY}"></i>${b}</span><span><i class="ln" style="border-top:1px solid #C4C8CE"></i>each year, ${yrs} · point at a line to name it</span>`;

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
    <rect class="hit" x="${M.l}" y="${M.t}" width="${W - M.l - M.r}" height="${H - M.t - M.b}" fill="transparent"/></svg><div class="tip" hidden></div>`;
  const gridY = (W, M, y, ticks, fmt) => ticks.map((t) => `<line x1="${M.l}" x2="${W - M.r}" y1="${y(t)}" y2="${y(t)}" stroke="#E5E7EB" stroke-dasharray="3 3"/><text x="${M.l - 6}" y="${y(t) + 4}" text-anchor="end" class="ax">${fmt(t)}</text>`).join('');

  // one year across: this year red, last year blue, earlier years grey
  function yoy(el, { sNow, sPrev, yNow, yPrev, others = {}, X, H, small = false, fmt, unit = '', pct = false, zero = true, endValue }) {
    const W = el.clientWidth, narrow = W < 500, M = small ? { l: 36, r: 10, t: 8, b: 20 } : { l: 46, r: narrow ? 52 : 84, t: 12, b: 28 };
    const all = [...sNow, ...sPrev].map((p) => p[1]);
    const top = Math.max(...all, ...Object.values(others).flat().map((p) => p[1])) * 1.02;
    let lo = 0, hi = pct ? 100 : niceMax(top), step = null;
    if (!pct && !zero) { const base = Math.min(...all) * 0.85; step = [100, 200, 250, 500, 1000].find((k) => (top - base) / k <= 5) || 1000; lo = Math.floor(base / step) * step; hi = lo + Math.ceil((top - lo) / step) * step; }
    const x = (d) => M.l + ((d - X.xs[0]) / (X.xs[1] - X.xs[0])) * (W - M.l - M.r), y = (v) => M.t + (1 - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (H - M.t - M.b);
    const line = (s) => (s.length ? `M${s.map(([d, v]) => `${x(d).toFixed(1)},${y(v).toFixed(1)}`).join(' L')}` : '');
    const last = sNow[sNow.length - 1], lPrev = sPrev[sPrev.length - 1];
    const tf = (v) => (pct ? `${Math.round(v)}%` : v.toLocaleString('en-IN', { maximumFractionDigits: v < 10 ? 1 : 0 }));
    const ticks = small ? ticksOf(lo, hi, 3) : step ? Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step) : ticksOf(lo, hi, 5);
    el.innerHTML = frame(W, H, M, `${gridY(W, M, y, ticks, tf)}
      ${X.labels.filter((_, i) => !(small || narrow) || i % 3 === 0).map(([d, s]) => `<text x="${x(d)}" y="${H - (small ? 6 : 8)}" text-anchor="middle" class="ax">${s}</text>`).join('')}
      ${Object.entries(others).map(([yr, s]) => `<path class="oth" data-yr="${yr}" d="${line(s)}" fill="none" stroke="${OTHER}" stroke-width="1" stroke-linejoin="round"/>`).join('')}
      <path d="${line(sPrev)}" fill="none" stroke="${LY}" stroke-width="${small ? 1.2 : 1.5}" stroke-linejoin="round"/>
      <path d="${line(sNow)}" fill="none" stroke="${NOW}" stroke-width="${small ? 1.6 : 2}" stroke-linejoin="round"/>
      ${last ? `<circle cx="${x(last[0])}" cy="${y(last[1])}" r="${small ? 3 : 4}" fill="${NOW}"/>` : ''}
      ${small || !last ? '' : `<text x="${x(last[0]) + 8}" y="${y(last[1]) - 6}" class="lbl" font-weight="700">${narrow ? '' : `${yNow} · `}${fmt(endValue ?? last[1])}</text>
        ${lPrev ? `<text x="${Math.min(x(lPrev[0]) + 6, W - M.r + 6)}" y="${y(lPrev[1]) + 4}" class="lbl lbl-muted">${narrow ? '' : `${yPrev} · `}${fmt(lPrev[1])}</text>` : ''}`}`,
    `${yNow} against ${yPrev} and earlier years`);
    hover(el, W, (fx, fy) => {
      const d = Math.round(X.xs[0] + fx * (X.xs[1] - X.xs[0])), val = lo + (1 - fy) * (hi - lo);
      let best = null;
      Object.entries(others).forEach(([yr, s]) => { if (!s.length) return; const p = at(s, d); if (Math.abs(p[0] - d) > 4) return; if (!best || Math.abs(p[1] - val) < Math.abs(best[1] - val)) best = [yr, p[1]]; });
      el.querySelectorAll('.oth').forEach((o) => { const hit = best && o.dataset.yr === best[0]; o.setAttribute('stroke', hit ? '#374151' : OTHER); o.setAttribute('stroke-width', hit ? 1.5 : 1); if (hit) o.parentNode.insertBefore(o, o.parentNode.querySelector('path:not(.oth)')); });
      const a = last && d <= last[0] ? at(sNow, d) : null, b = sPrev.length ? at(sPrev, d) : null, u = unit ? ` ${unit}` : '';
      return { x: x(d), html: `<b>${X.name(d)}</b>${a ? `<span><i style="background:${NOW}"></i>${yNow} <b>${fmt(a[1])}</b>${u}</span>` : ''}${b ? `<span><i style="background:${LY}"></i>${yPrev} ${fmt(b[1])}${u}</span>` : ''}${best ? `<span><i style="background:#374151"></i>${best[0]} ${fmt(best[1])}${u}</span>` : ''}` };
    });
  }

  // since 2014: one line through every year, today marked; gaps of more than 20 days are left open
  function longLine(el, pts, { H, small = false, fmt, unit = '', pct = false, area = false }) {
    const W = el.clientWidth, M = small ? { l: 36, r: 10, t: 8, b: 20 } : { l: 46, r: 24, t: 16, b: 28 };
    const t = (s) => Date.parse(s), t0 = Date.parse('2014-01-01'), t1 = Date.parse(D.as_of);
    const hi = pct ? 100 : 4 * niceMax((Math.max(...pts.map((p) => p[1])) * 1.02) / 4);
    const x = (s) => M.l + ((t(s) - t0) / (t1 - t0)) * (W - M.l - M.r), y = (v) => M.t + (1 - Math.min(v, hi) / hi) * (H - M.t - M.b);
    const last = pts[pts.length - 1], low = pts.reduce((a, b) => (b[1] < a[1] ? b : a)), md = (s) => `${MON[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}`;
    const tf = (v) => (pct ? `${Math.round(v)}%` : v.toLocaleString('en-IN', { maximumFractionDigits: v < 10 ? 1 : 0 }));
    const years = Array.from({ length: Y - 2013 }, (_, i) => 2014 + i);
    el.innerHTML = frame(W, H, M, `${gridY(W, M, y, ticksOf(0, hi, small ? 3 : 5), tf)}
      ${years.filter((yr) => !(small || W < 500) || yr % 4 === 0).map((yr) => `<text x="${x(`${yr}-07-01`)}" y="${H - (small ? 6 : 8)}" text-anchor="middle" class="ax">${yr}</text>`).join('')}
      ${area ? `<path d="M${x(pts[0][0])},${y(0)} ${pts.map(([s, v]) => `L${x(s).toFixed(1)},${y(v).toFixed(1)}`).join(' ')} L${x(last[0])},${y(0)}Z" fill="${LIGHT}"/>` : ''}
      <path d="${pts.map(([s, v], i) => `${i && t(s) - t(pts[i - 1][0]) > 20 * 864e5 ? 'M' : i ? 'L' : 'M'}${x(s).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="${LY}" stroke-width="${small ? 1.1 : 1.5}" stroke-linejoin="round"/>
      ${pct && !small ? `<circle cx="${x(low[0])}" cy="${y(low[1])}" r="3.5" fill="${LY}"/><text x="${x(low[0])}" y="${y(low[1]) + 16}" text-anchor="middle" class="lbl halo">lowest · ${md(low[0])} · ${pctF(low[1])}</text>` : ''}
      <circle cx="${x(last[0])}" cy="${y(last[1])}" r="${small ? 3 : 4}" fill="${NOW}"/>
      ${small ? '' : `<text x="${x(last[0]) + 6}" y="${y(last[1]) + 20}" text-anchor="end" class="lbl halo" font-weight="700">now · ${fmt(last[1])}</text>`}`,
    'Since January 2014');
    hover(el, W, (fx) => {
      const tt = t0 + fx * (t1 - t0), p = pts.reduce((a, b) => (Math.abs(t(b[0]) - tt) < Math.abs(t(a[0]) - tt) ? b : a));
      return { x: x(p[0]), html: `<b>${+p[0].slice(8)} ${md(p[0])}</b><span><i style="background:${LY}"></i><b>${fmt(p[1])}</b>${unit ? ` ${unit}` : ''}</span>` };
    });
  }

  // ── the three blocks over time ──
  const smooth = (pts) => pts.map((p, i) => { const w = pts.slice(Math.max(0, i - 3), i + 4); return [p[0], w.reduce((a, q) => a + q[1], 0) / w.length]; });
  const stLong = (n) => {
    if (n === 'City total') return D.long;
    const s = D.st[n];
    return smooth([...Object.entries(s.years).flatMap(([y, ser]) => ser.map(([d, v]) => [ymd(y, d), v])), ...s.prev.map(([d, v]) => [ymd(P, d), v]), ...s.now.map(([d, v]) => [ymd(Y, d), v])]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1)).filter((_, i) => i % 2 === 0));
  };
  const infDays = Math.round((Date.parse(D.as_of) - Date.parse('2014-01-01')) / 864e5);
  const infDaily = (n) => { const m = new Map(D.infd[n]); return Array.from({ length: infDays + 1 }, (_, k) => [ymd(2014, 1 + k), m.get(k) || 0]); };

  // titles worked out from the numbers
  const stT = D.st['City total'], stNow = stT.now[stT.now.length - 1];
  const sameDay = (s) => (s && s.length ? at(s, stNow[0]) : null);
  const lowerYears = Object.entries({ ...stT.years, [P]: stT.prev }).filter(([, s]) => { const p = sameDay(s); return p && Math.abs(p[0] - stNow[0]) <= 4 && p[1] < stNow[1]; }).map(([y]) => +y);
  const lowestSince = lowerYears.length ? Math.max(...lowerYears) : null;
  const stTitle = lowestSince === P ? `City reservoirs are ${pctF(stNow[1])} full, a little above this date last year`
    : lowestSince ? `City reservoirs are ${pctF(stNow[1])} full, the lowest for ${dayMon} since ${lowestSince}` : `City reservoirs are ${pctF(stNow[1])} full, the lowest for ${dayMon} since 2014`;
  const lowestTwo = [...MULTI].sort((a, b) => lastOf(D.st[a].now) - lastOf(D.st[b].now)).slice(0, 2);
  const nearEmptyBefore = lowestTwo.every((n) => Object.values(D.st[n].years).flat().some((p) => p[1] < 5));
  const manjiraPair = lowestTwo.includes('Singur') && lowestTwo.includes('Manjira');
  const wdT = D.wdr['City total'], wdNow = lastOf(wdT.now), wdLy = (wdT.prev.find((p) => p[0] === wdT.now[wdT.now.length - 1][0]) || wdT.prev[wdT.prev.length - 1] || [0, 0])[1];
  const lw = D.longw['City total'], first = lw.filter((p) => p[0] < '2015'), w2014 = first.reduce((a, p) => a + p[1], 0) / (first.length || 1), wRecent = lw.slice(-10).reduce((a, p) => a + p[1], 0) / Math.min(10, lw.length);
  const yelFirst = (D.longw.Yellampally.find((p) => p[1] > 50) || ['2015-12'])[0], yelStart = `${MONTH[+yelFirst.slice(5, 7) - 1]} ${yelFirst.slice(0, 4)}`;
  const cumGain = MULTI.filter((n) => { const c = D.cumr[n]; if (!c.now.length || !c.prev.length) return false; const k = c.now[c.now.length - 1][0]; return lastOf(c.now) > at(c.prev, k)[1]; });
  const seasT = D.seasr['City total'], sinceYr = Object.keys(seasT).filter((y) => +y < SY && seasT[y] < seasT[SY]).pop();
  const dryCount = MULTI.filter((n) => { const s = D.seasr[n], past = Object.entries(s).filter(([y]) => +y < SY).map(([, v]) => v); return s[SY] < 0.1 * (past.reduce((a, b) => a + b, 0) / (past.length || 1)); }).length;

  const BLOCKS = [
    { id: 'st', label: 'Storage over time',
      key: { d: KEY3(Y, P, range(stT.years)), l: '' }, when: { d: `${P}–${Y}`, l: `2014–${Y}` },
      sub: { d: '% of full storage · each day of the year', l: '% of full storage · since January 2014' },
      title: { d: { t: stTitle, r: `${lowestTwo.join(' and ')}${manjiraPair ? ', both on the Manjira river,' : ''} are closest to empty` },
        l: { t: `${MONTHNAME} ${Y}: ${pctF(stNow[1])} full${lowestSince && lowestSince !== P ? `, the lowest since ${lowestSince}` : ''}`,
          r: nearEmptyBefore ? `${lowestTwo.join(' and ')}, now the lowest, have run near empty before` : `${lowestTwo.join(' and ')} are now the lowest` } },
      head: (n) => pctF(lastOf(D.st[n].now)), note: { t: "City total = the five city reservoirs (HMWSSB's Total 1 to 5).", r: '' },
      draw: (view, n, el, small) => { const s = D.st[n], H = small ? 150 : 300;
        if (view === 'l') return longLine(el, stLong(n), { H, small, fmt: pctF, pct: true });
        return yoy(el, { sNow: s.now, sPrev: s.prev, yNow: Y, yPrev: P, others: s.years, X: CAL_X, H, small, fmt: pctF, pct: true }); } },
    { id: 'wd', label: 'Withdrawal',
      key: { d: KEY3(Y, P, range(wdT.years)), l: '' }, when: { d: `${P}–${Y}`, l: `2014–${Y}` },
      sub: { d: 'Million litres a day (MLD) · 7-day average · each day of the year', l: 'Million litres a day (MLD) · since January 2014' },
      title: { d: { t: `The city is drawing ${n0(wdNow)} MLD a day, against ${n0(wdLy)} on this date last year`, r: `Akkampally, on Krishna water, supplies ${n0(lastOf(D.wdr.Akkampally.now))} of the ${n0(wdNow)} MLD the city draws` },
        l: { t: `The city draws ${Math.round((wRecent / w2014 - 1) * 100)}% more water than in 2014`, r: `Yellampally's Godavari water began in ${yelStart}, and is now ${n0(lastOf(D.wdr.Yellampally.now))} MLD a day` } },
      head: (n) => n0(lastOf(D.wdr[n].now)), note: { t: 'City total = the six reservoirs added up, including Yellampally (Godavari).', r: '' },
      noteL: 'Before April 2017 the table repeats one figure for each month. Days recorded in another unit (the 21st to month-end, 2014–2018) and Nov–Dec 2022, when the table is incomplete, are left out.',
      draw: (view, n, el, small) => { const s = D.wdr[n], H = small ? 150 : 300;
        if (view === 'l') return longLine(el, smooth(D.longw[n]), { H, small, fmt: n0, unit: 'MLD' });
        return yoy(el, { sNow: roll(s.now), sPrev: roll(s.prev), yNow: Y, yPrev: P, others: Object.fromEntries(Object.entries(s.years).map(([y, v]) => [y, roll(v)])), X: CAL_X, H, small, fmt: n0, unit: 'MLD', zero: small, endValue: lastOf(s.now) }); } },
    { id: 'in', label: 'Inflow',
      key: { d: KEY3(SY, SY - 1, range(D.cumr['City total'].years)), l: '' }, when: { d: `${SY - 1}–${SY}`, l: `2014–${Y}` },
      sub: { d: 'Running total of inflow from 1 June, in TMC', l: 'Inflow each day, in TMC · since January 2014' },
      title: { d: { t: `Since 1 June, ${n0(lastOf(D.cumr['City total'].now))} TMC has flowed in, against ${n0(seasT[SY - 1])} by this date last year`,
        r: cumGain.length === 1 ? `Only ${cumGain[0]} has taken in more than by this date last year` : `${WORDS[cumGain.length]} of six reservoirs have taken in more than by this date last year` },
        l: { t: sinceYr ? `This monsoon's inflow is the lowest since ${sinceYr}` : "This monsoon's inflow is the lowest since 2015", r: `${WORDS[dryCount]} of six reservoirs took in less than a tenth of their usual monsoon inflow` } },
      head: (n) => n0(lastOf(D.cumr[n].now)), note: { t: 'City total = the five city reservoirs. Yellampally (Godavari) is shown under By reservoir.', r: 'Large reservoirs count flood water passing through as inflow.' },
      noteL: '2014 inflow is not reported. A few single-day typos are left out, such as 466 TMC at Singur on 27 Sep 2021.',
      draw: (view, n, el, small) => { const H = small ? 150 : 300;
        if (view === 'l') return longLine(el, infDaily(n), { H, small, fmt: n0, unit: 'TMC', area: true });
        const c = D.cumr[n]; return yoy(el, { sNow: c.now, sPrev: c.prev, yNow: SY, yPrev: SY - 1, others: c.years, X: JUNE_X, H, small, fmt: n0, unit: 'TMC' }); } },
  ];
  $('#rv-blocks').innerHTML = BLOCKS.map((b) => `<h2 class="blk">${b.label}</h2>
<figure class="fig" id="rv-b-${b.id}">
  <h2 class="fig-title"><span class="t"></span><small class="w"></small></h2>
  <p class="fig-sub"></p>
  <div class="ctl">
    <div class="row"><span class="lab">View</span><div class="tabs" data-k="view"><button data-v="d" class="on">Each day</button><button data-v="l">Since 2014</button></div></div>
    <div class="row"><span class="lab">Show</span><div class="tabs" data-k="scope"><button data-v="t" class="on">City total</button><button data-v="r">By reservoir</button></div></div>
  </div>
  <div class="key"></div>
  <div class="chart total"></div>
  <div class="multiples" hidden></div>
  <p class="note"></p>
  ${foot(Y)}
</figure>`).join('\n');
  BLOCKS.forEach((b) => {
    const fig = $(`#rv-b-${b.id}`), st = { view: 'd', scope: 't' };
    function render() {
      fig.querySelectorAll('.tabs').forEach((t) => t.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.v === st[t.dataset.k])));
      fig.querySelector('.t').textContent = b.title[st.view][st.scope]; fig.querySelector('.w').textContent = b.when[st.view];
      fig.querySelector('.fig-sub').textContent = b.sub[st.view];
      const key = fig.querySelector('.key'); key.innerHTML = b.key[st.view]; key.hidden = !b.key[st.view];
      fig.querySelector('.note').textContent = [b.note[st.scope], st.view === 'l' && b.noteL ? b.noteL : ''].filter(Boolean).join(' ');
      const total = fig.querySelector('.total'), mult = fig.querySelector('.multiples');
      total.hidden = st.scope !== 't'; mult.hidden = st.scope !== 'r';
      if (st.scope === 't') { b.draw(st.view, 'City total', total, false); return; }
      mult.innerHTML = MULTI.map((n, i) => `<div class="mp"><p class="mp-t"><b>${n}</b><span>${b.head(n)}</span></p><div class="chart" id="rv-${b.id}-mp${i}"></div></div>`).join('');
      MULTI.forEach((n, i) => b.draw(st.view, n, $(`#rv-${b.id}-mp${i}`), true));
    }
    fig.querySelectorAll('.tabs').forEach((t) => { t.onclick = (e) => { const x = e.target.closest('button'); if (!x) return; st[t.dataset.k] = x.dataset.v; render(); }; });
    on('resize', render); render();
  });

  // ── where the water comes from: each river month by month since 2014, stacked MLD or share ──
  let srcMode = 'mld';
  const SRC_SUB = { pct: "Share of the city's withdrawal from each river, by month · Manjira = Singur and Manjira reservoirs",
    mld: 'Million litres a day (MLD) drawn from each river, monthly average · Manjira = Singur and Manjira reservoirs' };
  function drawSrc() {
    const el = $('#rv-src-chart'), W = el.clientWidth, H = 280, M = { l: 40, r: W < 500 ? 44 : 172, t: 8, b: 28 }, G = D.src.groups;
    const rows = D.src.monthly.filter((r) => r[1] > 0 && (r[0] < '2017' || r[2] > 0));   // a month with no Krishna or (after 2016) Godavari is a gap in the table
    const pct = rows.map((r) => { const t = r.slice(1).reduce((a, b) => a + b, 0); return r.slice(1).map((v) => (v / t) * 100); });
    const val = srcMode === 'pct' ? pct : rows.map((r) => r.slice(1)), top = srcMode === 'pct' ? 100 : niceMax(Math.max(...rows.map((r) => r.slice(1).reduce((a, b) => a + b, 0))));
    const x = (i) => M.l + (i / (rows.length - 1)) * (W - M.l - M.r), y = (v) => M.t + (1 - v / top) * (H - M.t - M.b);
    let base = rows.map(() => 0), layers = '';
    G.forEach((g, k) => {
      const tops = val.map((p, i) => base[i] + p[k]);
      layers += `<path d="M${tops.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' L')} L${base.map((v, i) => [i, v]).reverse().map(([i, v]) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' L')}Z" fill="${SRC_COL[g]}" stroke="#fff" stroke-width="1"/>`;
      const lastV = val[val.length - 1][k];
      layers += `<text x="${W - M.r + 8}" y="${y((base[base.length - 1] + tops[tops.length - 1]) / 2) + 4}" class="lbl"><tspan font-weight="700">${srcMode === 'pct' ? `${Math.round(lastV)}%` : n0(lastV)}</tspan>${W < 500 ? '' : ` ${g}`}</text>`;
      base = tops;
    });
    const yrs = rows.map((r, i) => [i, r[0]]).filter(([, m]) => m.endsWith('-01') && +m.slice(0, 4) % 2 === 0);
    el.innerHTML = frame(W, H, M, `${layers}${ticksOf(0, top, 5).map((t) => `<text x="${M.l - 6}" y="${y(t) + 4}" text-anchor="end" class="ax">${srcMode === 'pct' ? `${t}%` : t.toLocaleString('en-IN')}</text>`).join('')}
      ${yrs.map(([i, m]) => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" class="ax">${m.slice(0, 4)}</text>`).join('')}`, 'Withdrawal by river since 2014');
    el.querySelector('.hair').setAttribute('stroke', '#fff');
    hover(el, W, (fx) => {
      const i = Math.round(fx * (rows.length - 1)), row = rows[i];
      return { x: x(i), html: `<b>${MON[+row[0].slice(5) - 1]} ${row[0].slice(0, 4)}</b>${G.map((g, k) => `<span><i style="background:${SRC_COL[g]}"></i>${g} <b>${Math.round(pct[i][k])}%</b> · ${n0(row[k + 1])} MLD</span>`).join('')}` };
    });
  }
  const ls = D.src.monthly[D.src.monthly.length - 1], lsT = ls.slice(1).reduce((a, b) => a + b, 0);
  $('#rv-src-title').textContent = `Krishna and Godavari water now make up ${Math.round(((ls[1] + ls[2]) / lsT) * 100)}% of what the city draws`;
  $('#rv-src-sub').textContent = SRC_SUB[srcMode];
  $('#rv-src-key').innerHTML = D.src.groups.map((g) => `<span><i style="background:${SRC_COL[g]};border-radius:0"></i>${g}</span>`).join('');
  $('#rv-src-mode').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    srcMode = b.dataset.v; root.querySelectorAll('#rv-src-mode button').forEach((x) => x.classList.toggle('on', x === b));
    $('#rv-src-sub').textContent = SRC_SUB[srcMode]; drawSrc();
  };
  drawSrc(); on('resize', drawSrc);

  root.addEventListener('click', (e) => { if (e.target.closest('a[href="#about"]')) { const d = document.getElementById('about'); if (d) d.open = true; } });

  // share: the system share sheet where there is one, otherwise copy the link
  root.querySelectorAll('.share').forEach((b) => { b.onclick = () => {
    const url = 'https://hyderabad.urbanobservatory.in/live/reservoirs/';
    if (navigator.share) navigator.share({ title: 'Hyderabad reservoirs', url }).catch(() => {});
    else navigator.clipboard?.writeText(url).then(() => { b.setAttribute('aria-label', 'Link copied'); b.classList.add('done'); setTimeout(() => b.classList.remove('done'), 1500); });
  }; });

  // scroll-down pill: names the next block below the screen; gone once the last block is in view
  const pill = $('#rv-more'), next = $('#rv-more-next');
  function update() {
    const below = [...root.querySelectorAll('.blk')].find((h) => h.getBoundingClientRect().top > innerHeight - 60);
    pill.classList.toggle('gone', !below);
    if (below) { next.textContent = `· ${below.textContent}`; pill.onclick = () => below.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }
  on('scroll', update, { passive: true }); on('resize', update); update();

  return () => listeners.forEach(([type, fn]) => removeEventListener(type, fn));
}
