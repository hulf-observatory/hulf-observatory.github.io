// The Tankers page (/live/tankers/): bookings over time, then this year's bookings across the city as an animated map
// with a stacked graph by corporation. Plain SVG strings drawn at the measured width; the data is tankers-history.json
// from the live feed (repo live-feed, tankers_history.py).
// mount(root, D) draws everything into root and returns a function that stops the animation and removes the listeners.

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const OLD = '#9DBAD6', NEW = '#123F70';   // bars: earlier years light, this year dark (Teja, 25 Oct)
// one colour per corporation, on the map and in the graph
const CC = { Cyberabad: '#123F70', GHMC: '#3F76B0', Malkajgiri: '#9DBAD6' };
// seasons shaded behind the bars: summer March–May, monsoon June–September (IMD's seasons)
const SEASONS = [{ from: 2, to: 4, fill: '#FBF1E6' }, { from: 5, to: 8, fill: '#EEF3F8' }];
const SEASON_KEY = '<span><i style="width:14px;height:10px;border-radius:0;background:#FBF1E6;border:1px solid #E5E7EB"></i>summer (Mar–May)</span><span><i style="width:14px;height:10px;border-radius:0;background:#EEF3F8;border:1px solid #E5E7EB"></i>monsoon (Jun–Sep)</span>';
const sq = (c) => `<i style="width:12px;height:10px;border-radius:0;background:${c}"></i>`;

const nf = (v) => Math.round(v).toLocaleString('en-IN');
const comp = (v) => (v >= 1e5 ? `${(v / 1e5).toFixed(2)} lakh` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : nf(v));
const mName = (k) => `${MONTHS[+k.slice(5) - 1]} ${k.slice(0, 4)}`, mShort = (k) => `${MON[+k.slice(5) - 1]} ${k.slice(0, 4)}`;
const lyK = (k) => `${+k.slice(0, 4) - 1}${k.slice(4)}`;
const run = (a) => { let t = 0; return a.map((v) => (t += v)); };
const ticksOf = (lo, hi, n) => Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));
function niceMax(v) { if (v <= 0) return 1; const m = 10 ** Math.floor(Math.log10(v)); return [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((k) => k * m).find((k) => k >= v); }
// as many gridlines as give round steps
const niceN = (hi) => [5, 6, 4, 3].find((k) => { const st = hi / (k - 1), m = 10 ** Math.floor(Math.log10(st)); return [1, 2, 2.5, 5, 10].some((z) => Math.abs(st / m - z) < 1e-9); }) || 5;
const lakhs = (hi) => (v) => (hi >= 1e5 ? (v ? `${+(v / 1e5).toFixed(2)} lakh` : '0') : comp(v));
const gridY = (W, M, y, ticks, fmt) => ticks.map((t) => `<line x1="${M.l}" x2="${W - M.r}" y1="${y(t)}" y2="${y(t)}" stroke="#E5E7EB" stroke-dasharray="3 3"/><text x="${M.l - 6}" y="${y(t) + 4}" text-anchor="end" class="ax">${fmt(t)}</text>`).join('');
const frame = (W, H, M, inner, label) => `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">${inner}<rect class="hit" x="${M.l}" y="${M.t}" width="${W - M.l - M.r}" height="${H - M.t - M.b}" fill="transparent"/></svg><div class="tip" hidden></div>`;
function hover(el, W, onMove) {
  const hit = el.querySelector('.hit'), tip = el.querySelector('.tip');
  hit.onmousemove = (e) => {
    const r = hit.getBoundingClientRect(), { x, html } = onMove((e.clientX - r.left) / r.width);
    tip.hidden = false; tip.innerHTML = html; tip.style.left = `${Math.min(x + 12, W - tip.offsetWidth - 4)}px`;
  };
  hit.onmouseleave = () => { tip.hidden = true; };
}

const SHARE_ICON = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="11" cy="3" r="1.8"/><circle cx="3" cy="7" r="1.8"/><circle cx="11" cy="11" r="1.8"/><path d="M4.6 6.2 9.4 3.8M4.6 7.8l4.8 2.4"/></svg>';
const foot = `<div class="foot"><p><b>Data source:</b> HMWSSB tanker bookings by section, monthly, via Open Data Telangana – <a href="#about">Learn more about this data</a><br>hyderabad.urbanobservatory.in/live/tankers | Hyderabad Urban Observatory</p>
  <button class="btn share" type="button" aria-label="Share this page">${SHARE_ICON}</button></div>`;

export function mount(root, D) {
  const months = D.months, byM = Object.fromEntries(months.map(([k, b, d]) => [k, { b, d }]));
  const last = D.last, Y = +last.slice(0, 4);
  const SW = D.switch, SWITCH_Y = SW.slice(0, 4), SWITCH_M = +SW.slice(5) - 1;
  const listeners = [];
  const on = (type, fn, opts) => { addEventListener(type, fn, opts); listeners.push([type, fn]); };
  const $ = (sel) => root.querySelector(sel);

  root.innerHTML = `<h2 class="blk first">Bookings over time</h2>
<figure class="fig">
  <h2 class="fig-title"><span id="tk-t2"></span><small id="tk-w2"></small></h2>
  <p class="fig-sub">Tanker bookings in the HMWSSB area, each month</p>
  <div class="ctl"><div class="row"><span class="lab">View</span><div class="tabs" id="tk-v2"><button data-v="grp" class="on">By month</button><button data-v="all">In sequence</button></div></div></div>
  <div class="key" id="tk-k2"></div>
  <div class="chart" id="tk-g2"></div>
  <p class="note">From April 2026 HMWSSB books tankers by the 300 wards instead of its old sections (about 175 booked each month before), and its divisions were re-drawn (March and April list both); the city-wide totals are comparable across the change. December 2022 is missing from HMWSSB's files. Bookings are the whole HMWSSB service area, not only HMDA.</p>
  ${foot}
</figure>
<h2 class="blk">Tankers across the city</h2>
<figure class="fig">
  <h2 class="fig-title"><span id="tk-t1"></span><small id="tk-w1"></small></h2>
  <p class="fig-sub" id="tk-s1"></p>
  <div class="ctl"><div class="row"><span class="lab">View</span><div class="tabs" id="tk-v1"><button data-v="month" class="on">By month</button><button data-v="cum">Cumulative</button></div></div></div>
  <div class="tk-player"><button class="btn" id="tk-play" type="button" aria-label="Play">▶</button><input type="range" id="tk-slide" min="0" step="1" aria-label="Month"><span class="tk-pm" id="tk-pm"></span></div>
  <div class="tk-stats" id="tk-stats"></div>
  <div class="key" id="tk-k1"></div>
  <div class="tk-duo"><div class="chart" id="tk-map"></div><div><div class="key tk-k1b" id="tk-k1b"></div><div class="chart" id="tk-bars"></div></div></div>
  <p class="note" id="tk-n1"></p>
  ${foot}
</figure>
<button class="more gone" id="tk-more" type="button"><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1V10M2 6.5 6 10.5 10 6.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>More below <span id="tk-more-next"></span></button>`;

  // ── bookings over time: by month (a bar per year in each month) or the months in sequence ──
  let view2 = 'grp';
  const val = (k) => (byM[k] ? byM[k].b : null);
  const years = [...new Set(months.map((m) => m[0].slice(0, 4)))];
  const yearCol = (y) => (y === String(Y) ? NEW : OLD);
  function grouped(el) {
    const W = el.clientWidth, H = 320, narrow = W < 500, M = { l: 56, r: 12, t: 28, b: 28 };
    const v = (y, i) => val(`${y}-${String(i + 1).padStart(2, '0')}`);
    const hi = niceMax(Math.max(...months.map((m) => m[1])) * 1.08);
    const slot = (W - M.l - M.r) / 12, gw = slot * 0.84, bw = gw / years.length, y = (t) => M.t + (1 - t / hi) * (H - M.t - M.b);
    const bx = (i, j) => M.l + slot * i + (slot - gw) / 2 + bw * j;
    const bars = [];
    years.forEach((yy, j) => { for (let i = 0; i < 12; i++) { const t = v(yy, i); if (t != null) bars.push(`<rect x="${bx(i, j)}" y="${y(t)}" width="${Math.max(1, bw - 1)}" height="${Math.max(0.5, y(0) - y(t))}" fill="${yearCol(yy)}"/>`); } });
    // notes on the chart: the record month and the April 2026 switch to the 300 wards
    const ext = months.reduce((a, b) => (b[1] > a[1] ? b : a));
    const ei = +ext[0].slice(5) - 1, ex = bx(ei, years.indexOf(ext[0].slice(0, 4))) + bw / 2, ey = y(ext[1]);
    const note = `<line x1="${ex}" x2="${ex}" y1="${ey - 4}" y2="${M.t - 6}" stroke="#374151"/><text x="${W < 560 ? Math.min(Math.max(ex, M.l + 90), W - M.r - 90) : ex + (ei > 8 ? -6 : 6)}" y="${M.t - 10}" text-anchor="${W < 560 ? 'middle' : ei > 8 ? 'end' : 'start'}" class="lbl" font-size="12" font-weight="700">${mShort(ext[0])}: ${comp(ext[1])}, ${W < 560 ? 'a record' : 'the most on record'}</text>`;
    const sw = years.indexOf(SWITCH_Y), swx = sw >= 0 ? bx(SWITCH_M, sw) : null;
    const swNote = swx != null && !narrow ? `<line x1="${swx - 0.5}" x2="${swx - 0.5}" y1="${y(hi * 0.97)}" y2="${H - M.b}" stroke="#6B7280" stroke-dasharray="3 3"/><text x="${swx - 4}" y="${y(hi * 0.86)}" text-anchor="end" class="lbl halo" style="fill:#374151" font-size="11.5">from ${MONTHS[SWITCH_M]} ${SWITCH_Y}: the 300 wards</text>` : '';
    const bands = SEASONS.map((z) => `<rect x="${M.l + slot * z.from}" y="${M.t}" width="${slot * (z.to - z.from + 1)}" height="${H - M.t - M.b}" fill="${z.fill}"/>`).join('');
    el.innerHTML = frame(W, H, M, `${bands}${gridY(W, M, y, ticksOf(0, hi, 5), comp)}${bars.join('')}
      ${MON.map((m, i) => `<text x="${M.l + slot * (i + 0.5)}" y="${H - 8}" text-anchor="middle" class="ax">${narrow ? m[0] : m}</text>`).join('')}${note}${swNote}`, 'Bookings each month, a bar for each year');
    hover(el, W, (fx) => {
      const i = Math.max(0, Math.min(11, Math.floor(fx * 12)));
      return { x: M.l + slot * (i + 0.5), html: `<b>${MONTHS[i]}</b>${years.slice().reverse().map((yy) => { const t = v(yy, i); return t == null ? '' : `<span><i style="background:${yearCol(yy)}"></i>${yy} <b>${nf(t)}</b></span>`; }).join('')}` };
    });
  }
  function allBars(el) {
    const W = el.clientWidth, H = 300, M = { l: 56, r: 16, t: 12, b: 28 }, ks = months.map((m) => m[0]);
    const vals = ks.map(val), hi = niceMax(Math.max(...vals) * 1.05);
    const slot = (W - M.l - M.r) / ks.length, bw = Math.max(2, slot * 0.72), y = (v) => M.t + (1 - v / hi) * (H - M.t - M.b);
    const yrs = [...new Set(ks.map((k) => k.slice(0, 4)))];
    const bands = yrs.flatMap((yy) => SEASONS.map((z) => {
      const a = ks.indexOf(`${yy}-${String(z.from + 1).padStart(2, '0')}`), b = ks.indexOf(`${yy}-${String(z.to + 1).padStart(2, '0')}`);
      return a < 0 || b < 0 ? '' : `<rect x="${M.l + slot * a}" y="${M.t}" width="${slot * (b - a + 1)}" height="${H - M.t - M.b}" fill="${z.fill}"/>`;
    })).join('');
    const peaks = yrs.map((yy) => {
      const i = ks.reduce((a, k, j) => (k.startsWith(yy) && (a < 0 || vals[j] > vals[a]) ? j : a), -1);
      return `<text x="${M.l + slot * (i + 0.5)}" y="${y(vals[i]) - 5}" text-anchor="middle" class="lbl" font-size="11" ${yy === String(Y) ? 'font-weight="700"' : 'style="fill:#374151"'}>${comp(vals[i])}</text>`;
    }).join('');
    const si = ks.indexOf(SW), SX = M.l + slot * si;
    el.innerHTML = frame(W, H, M, `${bands}${gridY(W, M, y, ticksOf(0, hi, 5), comp)}
      ${ks.map((k, i) => `<rect x="${M.l + slot * i + (slot - bw) / 2}" y="${y(vals[i])}" width="${bw}" height="${y(0) - y(vals[i])}" fill="${k.startsWith(String(Y)) ? NEW : OLD}"/>`).join('')}
      ${ks.map((k, i) => (k.endsWith('-01') ? `<text x="${M.l + slot * i}" y="${H - 8}" class="ax">${k.slice(0, 4)}</text>` : '')).join('')}${peaks}
      ${si < 0 ? '' : `<line x1="${SX}" x2="${SX}" y1="${M.t}" y2="${H - M.b}" stroke="#6B7280" stroke-dasharray="3 3"/><text x="${SX - 6}" y="${M.t + 12}" text-anchor="end" class="lbl halo" style="fill:#374151" font-size="12">${W < 500 ? `${MON[SWITCH_M]} ${SWITCH_Y}: 175 sections → 300 wards` : `${MONTHS[SWITCH_M]} ${SWITCH_Y}: about 175 sections → the 300 wards →`}</text>`}`, 'Bookings each month since 2022');
    hover(el, W, (fx) => { const i = Math.max(0, Math.min(ks.length - 1, Math.floor(fx * ks.length))); return { x: M.l + slot * (i + 0.5), html: `<b>${mShort(ks[i])}</b><span><b>${nf(vals[i])}</b> bookings</span>` }; });
  }
  function render2() {
    root.querySelectorAll('#tk-v2 button').forEach((b) => b.classList.toggle('on', b.dataset.v === view2));
    const el = $('#tk-g2');
    const ytd = (y) => months.filter((m) => m[0].startsWith(y) && +m[0].slice(5) <= +last.slice(5)).reduce((s, m) => s + m[1], 0);
    const peak = months.reduce((a, b) => (b[1] > a[1] ? b : a));
    $('#tk-w2').textContent = `${years[0]}–${Y}`;
    if (view2 === 'grp') {
      grouped(el);
      $('#tk-k2').innerHTML = `<span>${sq(OLD)}${years[0]}–${Y - 1}, oldest on the left</span><span>${sq(NEW)}${Y}</span>${SEASON_KEY}`;
      $('#tk-t2').textContent = `${nf(ytd(String(Y)))} bookings so far in ${Y}, against ${nf(ytd(String(Y - 1)))} by ${MONTHS[+last.slice(5) - 1]} last year`;
    } else {
      allBars(el);
      $('#tk-k2').innerHTML = `<span>${sq(OLD)}each month</span><span>${sq(NEW)}${Y}</span>${SEASON_KEY}`;
      $('#tk-t2').textContent = `The busiest month on record was ${mName(peak[0])}, with ${nf(peak[1])} bookings`;
    }
  }
  $('#tk-v2').onclick = (e) => { const b = e.target.closest('button'); if (b) { view2 = b.dataset.v; render2(); } };
  render2(); on('resize', render2);

  // ── tankers across the city: this year's months at each ward, animated, with a stacked graph by corporation ──
  const A = D.map, ms = A.months, n = ms.length;
  const cum = A.b.map(run);
  const m26 = ms.map((k) => byM[k].b), m25 = ms.map((k) => (byM[lyK(k)] ? byM[lyK(k)].b : 0));
  const c26 = run(m26), c25 = run(m25);
  const corpN = Object.keys(CC).filter((c) => D.corp[c]).sort((p, q) => (D.corp[q][last] || 0) - (D.corp[p][last] || 0));
  const cm26 = Object.fromEntries(corpN.map((c) => [c, ms.map((k) => D.corp[c][k] || 0)]));
  const cm25 = Object.fromEntries(corpN.map((c) => [c, ms.map((k) => D.corp[c][lyK(k)] || 0)]));
  const vs = (a, b, when) => (a / b >= 1.1 ? `${(a / b).toFixed(1)} times as many as ${when}` : `against ${nf(b)} ${when}`);
  const from = MONTHS[+ms[0].slice(5) - 1];
  let view = 'month', fr = n - 1, timer = null, played = false, R = () => 0;
  const valAt = (j, i) => (view === 'month' ? A.b[j][i] : cum[j][i]);
  const span = () => (fr ? `${from} – ${mName(ms[fr])}` : mName(ms[0]));

  function drawMap() {
    const el = $('#tk-map'), W = el.clientWidth, K = Math.cos((17.4 * Math.PI) / 180);
    const xy = D.corps.flatMap(([, polys]) => polys.flatMap((pl) => pl[0]));
    const x0 = Math.min(...xy.map((p) => p[0])), x1 = Math.max(...xy.map((p) => p[0])), y0 = Math.min(...xy.map((p) => p[1])), y1 = Math.max(...xy.map((p) => p[1]));
    const H = Math.min(400, ((y1 - y0) / ((x1 - x0) * K)) * W), Wd = (H * ((x1 - x0) * K)) / (y1 - y0), ox = (W - Wd) / 2;
    const px = (lon) => ox + ((lon - x0) / (x1 - x0)) * Wd, py = (lat) => ((y1 - lat) / (y1 - y0)) * H;
    const mx = Math.max(...(view === 'month' ? A.b.flat() : cum.map((r) => r[n - 1]))), big = Wd > 420 ? 22 : 16;
    R = (v) => (v > 0 ? Math.max(1.6, Math.sqrt(v / mx) * big) : 0);
    const outlines = D.corps.map(([, polys]) => `<path d="${polys.map((pl) => `M${pl[0].map((p) => `${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join(' L')}Z`).join(' ')}" fill="#F7F8F9" stroke="#C9CDD3" stroke-width="0.8"/>`).join('');
    const names = D.corps.filter(([nm]) => CC[nm]).map(([nm, polys]) => {
      const r = polys.reduce((a, b) => (b[0].length > a[0].length ? b : a))[0], cx = r.reduce((t, p) => t + p[0], 0) / r.length, cy = r.reduce((t, p) => t + p[1], 0) / r.length;
      return `<text x="${px(cx)}" y="${py(cy)}" text-anchor="middle" class="ax halo" style="font-size:10.5px;fill:#9CA3AF;text-transform:uppercase;letter-spacing:.08em">${nm}</text>`;
    }).join('');
    const sizes = view === 'month' ? [1000, 5000] : [5000, 20000], top = (v) => 50 - 2 * R(v), lab = (i) => (i ? top(sizes[1]) : Math.max(top(sizes[0]), top(sizes[1]) + 14));
    el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="overflow:hidden" role="img" aria-label="Map of tanker bookings by ward">${outlines}${names}
      ${A.locs.map((l, j) => `<circle class="tk-loc" data-j="${j}" cx="${px(l[1]).toFixed(1)}" cy="${py(l[0]).toFixed(1)}" r="0" fill="${CC[l[3]] || '#9CA3AF'}" fill-opacity=".8" stroke="#fff" stroke-width="1"/>`).join('')}
      <g transform="translate(${ox + Wd - 100},${H - 60})">${sizes.map((v, i) => `<circle cx="20" cy="${50 - R(v)}" r="${R(v)}" fill="none" stroke="#9CA3AF"/><line x1="20" x2="${26 + big}" y1="${top(v)}" y2="${lab(i)}" stroke="#C9CDD3"/><text x="${30 + big}" y="${lab(i) + 4}" class="ax">${nf(v)}</text>`).join('')}</g></svg><div class="tip" hidden></div>`;
    const tip = el.querySelector('.tip');
    el.querySelectorAll('circle.tk-loc').forEach((c) => {
      const j = +c.dataset.j;
      c.onmouseenter = () => {
        const l = A.locs[j];
        tip.innerHTML = `<b>${l[2]}</b><span style="color:var(--muted)">${l[3] || ''}</span><span><b>${nf(valAt(j, fr))}</b> bookings ${view === 'month' ? `in ${mName(ms[fr])}` : `from ${from} to ${mName(ms[fr])}`}</span>`;
        tip.hidden = false;
        const r = c.getBoundingClientRect(), rr = el.getBoundingClientRect();
        tip.style.left = `${Math.min(r.right - rr.left + 6, el.clientWidth - tip.offsetWidth - 4)}px`; tip.style.top = `${r.top - rr.top}px`;
        c.setAttribute('stroke', '#111827');
      };
      c.onmouseleave = () => { tip.hidden = true; c.setAttribute('stroke', '#fff'); };
    });
    show();
  }
  // one stacked bar a month, a band per corporation; last year's city total as a grey mark; the shown month at full strength
  function drawBars() {
    const el = $('#tk-bars'), W = el.clientWidth, H = Math.min(320, Math.max(240, $('#tk-map').clientHeight - 40)), M = { l: 52, r: 8, t: 22, b: 26 };
    const part = (c) => (view === 'month' ? cm26[c] : run(cm26[c])), part25 = (c) => (view === 'month' ? cm25[c] : run(cm25[c]));
    const tot = view === 'month' ? m26 : c26, b = view === 'month' ? m25 : c25;
    const hi = niceMax(Math.max(...tot, ...b)), y = (v) => M.t + (H - M.t - M.b) * (1 - v / hi);
    const slot = (W - M.l - M.r) / n, bw = slot * 0.62, bx = (i) => M.l + slot * i + (slot - bw) / 2;
    el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bookings each month by corporation">${gridY(W, M, y, ticksOf(0, hi, niceN(hi)), lakhs(hi))}
      ${ms.map((k, i) => {
        let base = 0; const op = i === fr ? 1 : i < fr ? 0.5 : 0.18;
        const segs = corpN.map((c) => { const v = part(c)[i], r = `<rect x="${bx(i)}" y="${y(base + v)}" width="${bw}" height="${y(base) - y(base + v)}" fill="${CC[c]}" fill-opacity="${op}" stroke="#fff" stroke-width="${i === fr ? 1 : 0.5}"/>`; base += v; return r; }).join('');
        return `<g class="tk-mb" data-i="${i}" style="cursor:pointer">${segs}<rect x="${M.l + slot * i}" y="${M.t}" width="${slot}" height="${H - M.t - M.b}" fill="transparent"/></g>
        <line x1="${bx(i) - 3}" x2="${bx(i) + bw + 3}" y1="${y(b[i])}" y2="${y(b[i])}" stroke="#6B7280" stroke-width="2"/>
        <text x="${bx(i) + bw / 2}" y="${H - M.b + 16}" text-anchor="middle" class="ax" style="${i === fr ? 'font-weight:700;fill:#111827' : ''}">${MON[+k.slice(5) - 1]}</text>
        ${i === fr ? `<text x="${bx(i) + bw / 2}" y="${Math.min(y(tot[i]), y(b[i])) - 6}" text-anchor="middle" class="lbl halo" style="font-weight:700">${comp(tot[i])}</text>` : ''}`;
      }).join('')}
      <line x1="${M.l}" x2="${W - M.r}" y1="${y(0)}" y2="${y(0)}" stroke="#9CA3AF"/></svg>`;
    el.querySelectorAll('g.tk-mb').forEach((g) => { g.onclick = () => { stop(); fr = +g.dataset.i; show(); }; });
    // the key carries each corporation's number for the shown month, and its change on last year
    $('#tk-k1b').innerHTML = corpN.map((c) => `<span>${sq(CC[c])}${c} <b style="color:var(--ink)">${nf(part(c)[fr])}</b>&nbsp;${(part(c)[fr] / part25(c)[fr]).toFixed(1)}×</span>`).join('')
      + `<span><i class="ln" style="border-top:2px solid #6B7280"></i>all, the same ${view === 'cum' ? 'months' : 'month'} of ${Y - 1}</span>`;
  }
  function show() {
    const k = ms[fr], ky = lyK(k);
    root.querySelectorAll('#tk-map circle.tk-loc').forEach((c) => c.setAttribute('r', R(valAt(+c.dataset.j, fr)).toFixed(1)));
    $('#tk-slide').value = fr; $('#tk-pm').textContent = view === 'month' ? mName(k) : span();
    if (view === 'month') {
      $('#tk-t1').textContent = `${nf(m26[fr])} tankers booked in ${mName(k)}, ${vs(m26[fr], m25[fr], 'a year earlier')}`;
      $('#tk-stats').innerHTML = `<div><b>${nf(m26[fr])}</b>bookings in ${mName(k)}</div><div><b>${(m26[fr] / m25[fr]).toFixed(1)}×</b>${mName(ky)} (${nf(m25[fr])})</div>`;
    } else {
      $('#tk-t1').textContent = `${nf(c26[fr])} tankers booked ${fr ? `from ${from} to ${mName(k)}` : `in ${mName(k)}`}, ${vs(c26[fr], c25[fr], fr ? `in the same months of ${Y - 1}` : 'a year earlier')}`;
      $('#tk-stats').innerHTML = `<div><b>${nf(c26[fr])}</b>bookings, ${span()}</div><div><b>${(c26[fr] / c25[fr]).toFixed(1)}×</b>the same months of ${Y - 1} (${nf(c25[fr])})</div>`;
    }
    drawBars();
  }
  const playBtn = $('#tk-play');
  function stop() { clearInterval(timer); timer = null; playBtn.textContent = '▶'; playBtn.setAttribute('aria-label', 'Play'); }
  function play() {
    if (timer) { stop(); return; }
    if (fr >= n - 1) { fr = 0; show(); }
    playBtn.textContent = '❚❚'; playBtn.setAttribute('aria-label', 'Pause');
    timer = setInterval(() => { if (fr >= n - 1) { stop(); return; } fr += 1; show(); }, 1200);
  }
  function setView(v) {
    view = v; root.querySelectorAll('#tk-v1 button').forEach((b) => b.classList.toggle('on', b.dataset.v === view));
    $('#tk-s1').textContent = view === 'month' ? `Bookings in each ward, ${from} ${Y} onwards; circle area = bookings that month` : `Bookings in each ward since ${from} ${Y}; circle area = bookings so far`;
    $('#tk-k1').innerHTML = `<span>${corpN.map((c) => `<i style="background:${CC[c]};margin-right:2px"></i>`).join('')}&nbsp;${view === 'month' ? 'bookings in the ward that month' : 'bookings in the ward so far'}, coloured by corporation</span>`;
    drawMap();
  }
  const slide = $('#tk-slide'); slide.max = n - 1;
  slide.oninput = () => { stop(); fr = +slide.value; show(); };
  playBtn.onclick = play;
  $('#tk-v1').onclick = (e) => { const b = e.target.closest('button'); if (b) setView(b.dataset.v); };
  $('#tk-w1').textContent = `${from}–${MONTHS[+last.slice(5) - 1]} ${Y}`;
  $('#tk-n1').textContent = `${ms[0] === SW ? `From ${MONTHS[SWITCH_M]} ${SWITCH_Y} HMWSSB books tankers by the 300 wards of the four corporations, so the map starts then; before that its sections were different and are not comparable place by place. ` : ''}${Y - 1}'s figures are the city-wide totals. Point at a circle for its numbers, or at a month to show it. In the graph, ${Y - 1}'s old sections are counted in the corporation their point falls in. No HMWSSB tanker bookings fall in Secunderabad Cantonment.`;
  setView('month'); on('resize', drawMap);
  // plays once from the first month the first time the map comes into view
  let io = null;
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    io = new IntersectionObserver((es) => { if (es[0].isIntersecting && !played) { played = true; io.disconnect(); fr = n - 1; play(); } }, { threshold: 0.5 });
    io.observe($('#tk-map'));
  }

  root.addEventListener('click', (e) => { if (e.target.closest('a[href="#about"]')) { const d = document.getElementById('about'); if (d) d.open = true; } });

  // share: the system share sheet where there is one, otherwise copy the link
  root.querySelectorAll('.share').forEach((b) => { b.onclick = () => {
    const url = 'https://hyderabad.urbanobservatory.in/live/tankers/';
    if (navigator.share) navigator.share({ title: 'Hyderabad water tankers', url }).catch(() => {});
    else navigator.clipboard?.writeText(url).then(() => { b.setAttribute('aria-label', 'Link copied'); b.classList.add('done'); setTimeout(() => b.classList.remove('done'), 1500); });
  }; });

  // scroll-down pill: names the next block below the screen; gone once the last block is in view
  const pill = $('#tk-more'), next = $('#tk-more-next');
  function update() {
    const below = [...root.querySelectorAll('.blk')].find((h) => h.getBoundingClientRect().top > innerHeight - 60);
    pill.classList.toggle('gone', !below);
    if (below) { next.textContent = `· ${below.textContent}`; pill.onclick = () => below.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }
  on('scroll', update, { passive: true }); on('resize', update); update();

  // on wide screens a list of the page's sections sits in the left margin; the one being read is marked
  const heads = [...root.querySelectorAll('.blk')];
  heads.forEach((h, i) => { h.id = h.id || `tk-s${i}`; });
  const about = document.getElementById('about');
  const toc = document.createElement('nav');
  toc.className = 'rv-toc'; toc.setAttribute('aria-label', 'On this page');
  toc.innerHTML = `<p>On this page</p>${heads.map((h) => `<a href="#${h.id}">${h.textContent}</a>`).join('')}${about ? '<a href="#about">About this data</a>' : ''}`;
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

  return () => { stop(); if (io) io.disconnect(); listeners.forEach(([type, fn]) => removeEventListener(type, fn)); };
}
