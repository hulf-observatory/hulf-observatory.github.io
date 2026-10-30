// The Weather and air page (/live/weather/): temperature, heat index, humidity, rain, air quality and wind, one figure
// each with its views as tabs (today, trend, from normal, calendar, day counts, map, stations). Plain SVG strings drawn
// at the measured width. Data: weather-history.json (repo live-feed, weather_history.py), air.json and wind.json (the
// cards' station files), and weather-stations.json (every station by day), fetched only when a Trend view opens.
// mount(root, D) draws everything into root and returns a function that removes the window listeners.
import { LIVE_API } from '../../../lib/links';

export function mount(root, D) {
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const NOW = '#C2413B', LY = '#3F76B0', OTHER = '#D9DCE1';        // this year (today) red, last year (yesterday) blue, the rest grey
const SUMMER = '#FBF1E6', MONSOON = '#EEF3F8';
const WATER = '#3F76B0', HEAT = '#D3612A', HEAT_LO = '#EE9550';
// CPCB's six AQI colours, muted like the heat index's (Teja, 25 Oct)
const AQI_STEPS = [0, 50, 100, 200, 300, 400, 500], AQI_COL = ['#8FC9A0', '#C9E09C', '#F3E08C', '#F2B46E', '#D9665B', '#A84540'];
const AQI_NAMES = ['Good', 'Satisfactory', 'Moderate', 'Poor', 'Very poor', 'Severe'];
const PM_STEPS = { pm25: [0, 30, 60, 90, 120, 250, 380], pm10: [0, 50, 100, 250, 350, 430, 510] };
// IMD's green, yellow, orange and red, muted (Teja, 25 Oct)
const HI_COL = ['#A9D5B4', '#F3E08C', '#F2B46E', '#D9665B'], HI_NAMES = ['No warning', 'Be aware', 'Be prepared', 'Take action'];   // IMD's warning levels for green, yellow, orange, red
const hiLevel = (b) => (b ? `“${HI_NAMES[b].toLowerCase()}”` : 'no warning');
const hiBand = (v) => { const r = Math.round(v); return r <= 35 ? 0 : r <= 45 ? 1 : r <= 55 ? 2 : 3; };
const aqiBand = (v) => Math.max(0, AQI_STEPS.findIndex((s, i) => i && v <= s) - 1);
const POL = { pm25: 'PM2.5', pm10: 'PM10', no2: 'NO₂', so2: 'SO₂', co: 'CO', o3: 'ozone', nh3: 'NH₃' };

const $ = (s) => root.querySelector(s);
const listeners = [];
const on = (t, f, o) => { addEventListener(t, f, o); listeners.push([t, f]); };
const PHONE = () => innerWidth < 640;
const ticksOf = (lo, hi, n) => Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));
function niceMax(v) { if (v <= 0) return 1; const m = 10 ** Math.floor(Math.log10(v)); return [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((k) => k * m).find((k) => k >= v); }
function niceStep(span, n) { const raw = span / n, m = 10 ** Math.floor(Math.log10(raw)); return [1, 2, 5, 10].map((k) => k * m).find((k) => k >= raw); }
const median = (a) => { const v = a.filter((x) => x != null).sort((x, y) => x - y); if (!v.length) return null; const k = v.length >> 1; return v.length % 2 ? v[k] : (v[k - 1] + v[k]) / 2; };
const mean = (a) => { const v = a.filter((x) => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
const f1 = (v) => v.toFixed(1), f0 = (v) => Math.round(v).toLocaleString('en-IN');
const DAY = 864e5, tOf = (s) => Date.parse(`${s.slice(0, 10)}T00:00:00Z`);
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const nice = (s) => `${+s.slice(8, 10)} ${MON[+s.slice(5, 7) - 1]}`;
const doy = (s) => Math.round((tOf(s) - Date.parse(`${s.slice(0, 4)}-01-01T00:00:00Z`)) / DAY) + 1;

const AS_OF = D.as_of, TODAY = AS_OF.slice(0, 10), HOUR = +AS_OF.slice(11, 13), Y = +TODAY.slice(0, 4), P = Y - 1;
const START = '2026-02-23', T0 = tOf(START), T1 = tOf(TODAY) + DAY;

// IMD Begumpet normal for a date: the monthly normals, read as mid-month values and joined in straight lines
function normalOn(s, k) {
  const t = tOf(s), y = +s.slice(0, 4), m = +s.slice(5, 7) - 1;
  const mid = (yy, mm) => Date.UTC(yy, mm, 15);
  let a = mid(y, m), am = m, ay = y;
  if (t < a) { am = (m + 11) % 12; ay = m ? y : y - 1; a = mid(ay, am); }
  const bm = (am + 1) % 12, by = am === 11 ? ay + 1 : ay, b = mid(by, bm);
  const va = D.normals[am + 1][k], vb = D.normals[bm + 1][k];
  return va + (vb - va) * ((t - a) / (b - a));
}

// ── shared pieces, as on the Reservoirs page ──
const SHARE_ICON = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="11" cy="3" r="1.8"/><circle cx="3" cy="7" r="1.8"/><circle cx="11" cy="11" r="1.8"/><path d="M4.6 6.2 9.4 3.8M4.6 7.8l4.8 2.4"/></svg>';
const SRC = {
  tgdps: 'TGDPS automatic weather stations (Feb 2026 onwards); normals: IMD Begumpet, 1991–2020',
  wind: 'CPCB/TSPCB air-quality monitors via OAQ; Weather Union stations (April 2026 onwards)',
  air: 'CPCB/TSPCB air-quality monitors via OAQ (2021 onwards)',
};
const foot = (k) => `<div class="foot"><p><b>Data source:</b> ${SRC[k]} – <a href="#about">Learn more about this data</a><br>hyderabad.urbanobservatory.in/live/weather | Hyderabad Urban Observatory</p>
  <button class="btn share" type="button" aria-label="Share this page">${SHARE_ICON}</button></div>`;
const frame = (W, H, M, inner, label) => `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label || ''}">${inner}
  <line class="hair" y1="${M.t}" y2="${H - M.b}" stroke="#111827" stroke-width="1" visibility="hidden"/>
  <rect class="hit" x="${M.l}" y="${M.t}" width="${W - M.l - M.r}" height="${H - M.t - M.b}" fill="transparent"/></svg><div class="tip" hidden></div>`;
const gridY = (W, M, y, ticks, fmt) => ticks.map((t) => `<line x1="${M.l}" x2="${W - M.r}" y1="${y(t)}" y2="${y(t)}" stroke="#E5E7EB" stroke-dasharray="3 3"/><text x="${M.l - 6}" y="${y(t) + 4}" text-anchor="end" class="ax">${fmt(t)}</text>`).join('');
function hover(el, W, onMove, onLeave) {
  const hit = el.querySelector('.hit'), hair = el.querySelector('.hair'), tip = el.querySelector('.tip');
  hit.onmousemove = (e) => {
    const r = hit.getBoundingClientRect(), { x, html } = onMove((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    hair.setAttribute('x1', x); hair.setAttribute('x2', x); hair.setAttribute('visibility', 'visible');
    tip.hidden = false; tip.innerHTML = html; tip.style.left = `${Math.max(0, Math.min(x + 12, W - tip.offsetWidth - 4))}px`;
  };
  hit.onmouseleave = () => { hair.setAttribute('visibility', 'hidden'); tip.hidden = true; if (onLeave) onLeave(); };
}
// seasons as light bands across a date axis: summer March–May, monsoon June–September
function seasons(x, M, H, years, xOf) {
  return years.flatMap((y) => [[`${y}-03-01`, `${y}-06-01`, SUMMER, 'Summer'], [`${y}-06-01`, `${y}-10-01`, MONSOON, 'Monsoon']]).map(([a, b, c, n]) => {
    const x0 = Math.max(M.l, xOf(a)), x1 = Math.min(x, xOf(b));
    if (x1 - x0 < 2) return '';
    return `<rect x="${x0}" y="${M.t}" width="${x1 - x0}" height="${H - M.t - M.b}" fill="${c}"/>${x1 - x0 > 60 ? `<text x="${x0 + 6}" y="${M.t + 13}" class="ax" font-size="11">${n}</text>` : ''}`;
  }).join('');
}
const pathOf = (pts, x, y, gapDays = 1.5) => pts.map(([s, v], i) => `${i && tOf(s) - tOf(pts[i - 1][0]) > gapDays * DAY ? 'M' : i ? 'L' : 'M'}${x(s).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
const nearest = (pts, t) => pts.reduce((a, b) => (Math.abs(tOf(b[0]) - t) < Math.abs(tOf(a[0]) - t) ? b : a));

// a date axis from 23 February to today
function dateAxis(W, M) {
  const x = (s) => M.l + ((tOf(s) + DAY / 2 - T0) / (T1 - T0)) * (W - M.l - M.r);
  const months = []; for (let m = 2; m <= +TODAY.slice(5, 7); m++) months.push(`${Y}-${String(m).padStart(2, '0')}-15`);
  const labels = months.filter((s) => tOf(s) > T0 && tOf(s) < T1).filter((_, i) => !(W < 500) || i % 2 === 0);
  return { x, labels: (H) => labels.map((s) => `<text x="${x(s)}" y="${H - 8}" text-anchor="middle" class="ax">${MON[+s.slice(5, 7) - 1]}</text>`).join(''),
    fromFrac: (fx) => T0 + fx * (T1 - T0) };
}

// ── hourly data by day ──
const byDay = {};
D.hourly.forEach(([t, n, c, rh, hi]) => { const d = t.slice(0, 10); (byDay[d] = byDay[d] || []).push([+t.slice(11, 13), { temp: c, rh, hi }]); });
const days7 = Array.from({ length: 7 }, (_, i) => iso(tOf(TODAY) - (6 - i) * DAY)).filter((d) => byDay[d]);
const hourSeries = (d, k) => (byDay[d] || []).filter(([, v]) => v[k] != null).map(([h, v]) => [h, v[k]]);
const valAt = (d, k, h) => (hourSeries(d, k).find((p) => p[0] === h) || [])[1];
const YDAY = iso(tOf(TODAY) - DAY);

// today hour by hour: today red, yesterday blue, the five days before grey
// today hour by hour: today red, the six days before grey; normals: [[value, label]] drawn as dashed lines
function dayChart(el, k, { fmt, unit, bands, normals }) {
  const W = el.clientWidth, H = 280, narrow = W < 500, M = { l: 40, r: narrow ? 46 : normals ? 124 : 96, t: 12, b: 28 };
  const all = [...days7.flatMap((d) => hourSeries(d, k).map((p) => p[1])), ...(normals || []).map((q) => q[0])];
  const step = niceStep(Math.max(...all) - Math.min(...all), 5), lo = Math.floor(Math.min(...all) / step) * step, hi = Math.ceil(Math.max(...all) / step) * step;
  const x = (h) => M.l + (h / 23) * (W - M.l - M.r), y = (v) => M.t + (1 - (v - lo) / (hi - lo)) * (H - M.t - M.b);
  const line = (s) => s.map(([h, v], i) => `${i ? 'L' : 'M'}${x(h).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const others = days7.filter((d) => d !== TODAY);
  const sNow = hourSeries(TODAY, k), last = sNow[sNow.length - 1];
  const ticks = []; for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(v);
  const bandLines = (bands || []).filter(([v]) => v > lo && v < hi).map(([v, name, c]) => `<line x1="${M.l}" x2="${W - M.r}" y1="${y(v)}" y2="${y(v)}" stroke="${c}" stroke-width="2" opacity=".8"/><text x="${M.l + 4}" y="${y(v) - 5}" class="ax" font-size="11">${name}</text>`).join('');
  const normLines = (normals || []).map(([v, name]) => `<line x1="${M.l}" x2="${W - M.r}" y1="${y(v)}" y2="${y(v)}" stroke="#111827" stroke-width="1.3" stroke-dasharray="4 3"/><text x="${W - M.r + 6}" y="${y(v) + 4}" class="lbl lbl-muted">${narrow ? fmt(v) : `${name} ${fmt(v)}`}</text>`).join('');
  el.innerHTML = frame(W, H, M, `${gridY(W, M, y, ticks, (v) => `${v}${unit === '%' ? '%' : '°'}`)}${bandLines}${normLines}
    ${[0, 3, 6, 9, 12, 15, 18, 21].filter((h) => !narrow || h % 6 === 0).map((h) => `<text x="${x(h)}" y="${H - 8}" text-anchor="middle" class="ax">${String(h).padStart(2, '0')}:00</text>`).join('')}
    ${others.map((d) => `<path class="oth" data-d="${d}" d="${line(hourSeries(d, k))}" fill="none" stroke="${OTHER}" stroke-width="1"/>`).join('')}
    <path d="${line(sNow)}" fill="none" stroke="${NOW}" stroke-width="2"/>
    ${last ? `<circle cx="${x(last[0])}" cy="${y(last[1])}" r="4" fill="${NOW}"/><text x="${x(last[0]) + 8}" y="${y(last[1]) - 6}" class="lbl halo" font-weight="700">${narrow ? '' : 'now · '}${fmt(last[1])}</text>` : ''}`, 'Today hour by hour');
  hover(el, W, (fx, fy) => {
    const h = Math.max(0, Math.min(23, Math.round(fx * 23))), val = lo + (1 - fy) * (hi - lo);
    let best = null;
    others.forEach((d) => { const v = valAt(d, k, h); if (v != null && (!best || Math.abs(v - val) < Math.abs(best[1] - val))) best = [d, v]; });
    el.querySelectorAll('.oth').forEach((o) => { const hit = best && o.dataset.d === best[0]; o.setAttribute('stroke', hit ? '#374151' : OTHER); o.setAttribute('stroke-width', hit ? 1.5 : 1); });
    const a = valAt(TODAY, k, h);
    return { x: x(h), html: `<b>${String(h).padStart(2, '0')}:00</b>${a != null ? `<span><i style="background:${NOW}"></i>Today <b>${fmt(a)}</b></span>` : ''}${best ? `<span><i style="background:#374151"></i>${nice(best[0])} ${fmt(best[1])}</span>` : ''}` };
  }, () => el.querySelectorAll('.oth').forEach((o) => { o.setAttribute('stroke', OTHER); o.setAttribute('stroke-width', 1); }));
}
const KEY_DAYS = `<span><i class="ln" style="border-top:2px solid ${NOW}"></i>Today</span><span><i class="ln" style="border-top:1px solid #C4C8CE"></i>each of the 6 days before · point at a line to name it</span>`;

// lines over the days since 23 February; series: {pts, colour, width, dash, label}
function sinceChart(el, series, { fmt, unit, lo: lo0, H = 300, mark }) {
  const W = el.clientWidth, narrow = W < 500, M = { l: 40, r: narrow ? 46 : 104, t: 12, b: 28 }, A = dateAxis(W, M);
  const all = series.flatMap((s) => s.pts.map((p) => p[1]));
  const step = niceStep(Math.max(...all) - Math.min(...all), 5), lo = lo0 ?? Math.floor(Math.min(...all) / step) * step, hi = Math.ceil(Math.max(...all) / step) * step + (mark ? step : 0);   // room above for the marked day's label
  const y = (v) => M.t + (1 - (v - lo) / (hi - lo)) * (H - M.t - M.b);
  const ticks = []; for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(v);
  // end labels, pushed apart when close
  const ends = series.filter((s) => s.label && s.pts.length).map((s) => ({ y: y(s.pts[s.pts.length - 1][1]), s })).sort((a, b) => a.y - b.y);
  ends.forEach((e, i) => { if (i && e.y - ends[i - 1].y < 14) e.y = ends[i - 1].y + 14; });
  el.innerHTML = frame(W, H, M, `${seasons(W - M.r, M, H, [Y], A.x)}${gridY(W, M, y, ticks, (v) => `${v}${unit}`)}${A.labels(H)}
    ${series.map((s) => `<path d="${pathOf(s.pts, A.x, y)}" fill="none" stroke="${s.colour}" stroke-width="${s.width || 1.5}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''} stroke-linejoin="round"/>`).join('')}
    ${narrow ? '' : ends.map((e) => `<text x="${W - M.r + 8}" y="${e.y + 4}" class="lbl ${e.s.bold ? '' : 'lbl-muted'}" ${e.s.bold ? 'font-weight="700"' : ''}>${e.s.label} ${e.s.dash ? '' : fmt(e.s.pts[e.s.pts.length - 1][1])}</text>`).join('')}
    ${mark ? `<circle cx="${A.x(mark[0])}" cy="${y(mark[1])}" r="3.5" fill="${mark[3] || NOW}"/><text x="${A.x(mark[0])}" y="${y(mark[1]) - 9}" text-anchor="middle" class="lbl halo">${mark[2]}</text>` : ''}`, 'Since February');
  hover(el, W, (fx) => {
    const s0 = iso(T0 + Math.max(0, Math.min((T1 - T0) / DAY - 1, Math.floor(fx * ((T1 - T0) / DAY)))) * DAY);
    return { x: A.x(s0), html: `<b>${nice(s0)}</b>${series.map((s) => { const p = s.pts.find((q) => q[0] === s0); return p ? `<span><i style="background:${s.colour}"></i>${s.name || s.label} <b>${fmt(p[1])}</b></span>` : ''; }).join('')}` };
  });
}

// ── more shared pieces: calendars, maps, station lists, departures ──
const RAMP = { orange: ['#FCEBD9', '#F7C694', '#EE9550', '#D3612A', '#8F3212'], blue: ['#E4EDF6', '#B7CDE4', '#7FA6CE', '#3F76B0', '#123F70'] };
const ABOVE = '#EF8A62', BELOWC = '#67A9CF';           // the house diverging pair: warmer / wetter-than-usual sides
const HATCH = 'repeating-linear-gradient(135deg,#D1D5DB 0 1.5px,#fff 1.5px 4px)';
// five steps of a ramp: edges are the four inner breaks
const stepper = (edges, cols) => (v) => cols[edges.filter((e) => v >= e).length];
function legend(edges, cols, fmt, extra = '') {
  return `<span style="display:inline-flex;flex-direction:column;gap:3px"><span style="display:flex">${cols.map((c) => `<i style="width:44px;height:10px;margin:0;border-radius:0;background:${c}"></i>`).join('')}</span>
    <span style="position:relative;height:13px;width:${cols.length * 44}px">${edges.map((e, i) => `<span style="position:absolute;left:${(i + 1) * 44}px;transform:translateX(-50%);font-size:11.5px">${fmt(e)}</span>`).join('')}</span></span>${extra}`;
}
const noData = (label = 'No reading') => `<span><i style="width:16px;height:10px;border-radius:0;background:${HATCH};border:1px solid #D1D5DB"></i>${label}</span>`;
// equal steps across the values on show, at round numbers
function edgesFor(vals, step0) {
  const v = vals.filter((x) => x != null).sort((a, b) => a - b); if (!v.length) return [1, 2, 3, 4];
  const lo = v[Math.floor(v.length * 0.05)], hi = v[Math.ceil(v.length * 0.95) - 1];
  const step = Math.max(step0, niceStep(hi - lo, 4)), first = Math.ceil(lo / step) * step;
  return [0, 1, 2, 3].map((i) => first + i * step);
}

// months down, days across; colour(v) for a day's value, label(d, v) for its hover
function calendar(el, values, colour, label) {
  const narrow = el.clientWidth < 500, months = []; for (let m = 2; m <= +TODAY.slice(5, 7); m++) months.push(m);
  el.innerHTML = `<div class="cal" style="grid-template-columns:${narrow ? 30 : 40}px repeat(31,minmax(0,1fr))"><span></span>${Array.from({ length: 31 }, (_, i) => `<span class="h">${(i + 1) % 5 === 0 || i === 0 ? i + 1 : ''}</span>`).join('')}
    ${months.map((m) => `<span class="m">${MON[m - 1]}</span>${Array.from({ length: 31 }, (_, i) => {
      const d = `${Y}-${String(m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
      if (i + 1 > new Date(Date.UTC(Y, m, 0)).getUTCDate() || d > TODAY || d < START) return '<i class="c out"></i>';
      const v = values[d];
      return v != null ? `<i class="c" style="background:${colour(v)}" title="${label(d, v)}"></i>` : `<i class="c none" style="background:${HATCH}" title="${nice(d)}: no readings"></i>`;
    }).join('')}`).join('')}</div>`;
}

// stations on a map of HMDA and the 2026 corporations; pts: {lat, lon, fill, r, tip, arrow: [deg to, length]}
const HM = D.shapes.hmda.reduce((a, b) => (b[0].length > a[0].length ? b : a))[0];
function stationMap(el, pts) {
  const W = el.clientWidth, K = Math.cos((17.4 * Math.PI) / 180);
  const xs = HM.map((p) => p[0]), ys = HM.map((p) => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const H = Math.min(560, ((y1 - y0) / ((x1 - x0) * K)) * W), Wd = (H * ((x1 - x0) * K)) / (y1 - y0), ox = (W - Wd) / 2;
  const px = (lon) => ox + ((lon - x0) / (x1 - x0)) * Wd, py = (lat) => ((y1 - lat) / (y1 - y0)) * H;
  const ring = (r) => `M${r.map((p) => `${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join(' L')}Z`;
  const marks = pts.map((p, i) => {
    const x = px(p.lon), y = py(p.lat);
    if (p.arrow) {
      const [deg, len] = p.arrow, a = (deg * Math.PI) / 180, dx = Math.sin(a) * len, dy = -Math.cos(a) * len, hx = x + dx / 2, hy = y + dy / 2, tx = x - dx / 2, ty = y - dy / 2;
      const h1 = a + Math.PI * 0.82, h2 = a - Math.PI * 0.82;
      return `<g class="spk" data-i="${i}"><line x1="${tx}" y1="${ty}" x2="${hx}" y2="${hy}" stroke="${p.fill}" stroke-width="1.8"/><path d="M${hx},${hy} L${hx + Math.sin(h1) * 6},${hy - Math.cos(h1) * 6} L${hx + Math.sin(h2) * 6},${hy - Math.cos(h2) * 6}Z" fill="${p.fill}"/><circle cx="${x}" cy="${y}" r="9" fill="transparent"/></g>`;
    }
    return `<g class="spk" data-i="${i}"><circle cx="${x}" cy="${y}" r="${p.r || 4.5}" fill="${p.fill}" stroke="${p.stroke || '#fff'}" stroke-width="${p.stroke ? 1 : 0.8}"/></g>`;
  }).join('');
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="overflow:visible" role="img" aria-label="Map of the stations in HMDA">
    <path d="${D.shapes.hmda.map((p) => ring(p[0])).join(' ')}" fill="#FAFAFB" stroke="#D1D5DB"/>
    ${D.shapes.corps.map(([, polys]) => `<path d="${polys.map((pl) => ring(pl[0])).join(' ')}" fill="#F3F4F6" stroke="#9CA3AF" stroke-width="0.8"/>`).join('')}
    ${D.shapes.corps.filter(([n]) => n !== 'Secunderabad Cantonment').map(([n, polys]) => { const r = polys.reduce((a, b) => (b[0].length > a[0].length ? b : a))[0], cx = r.reduce((s, p) => s + p[0], 0) / r.length, cy = r.reduce((s, p) => s + p[1], 0) / r.length; return `<text x="${px(cx)}" y="${py(cy) - 22}" text-anchor="middle" class="ax halo">${n}</text>`; }).join('')}
    ${marks}</svg><div class="tip" hidden></div>`;
  const tip = el.querySelector('.tip');
  el.querySelectorAll('.spk').forEach((g) => {
    g.onmouseenter = () => { const p = pts[+g.dataset.i]; tip.innerHTML = p.tip; tip.hidden = false;
      const x = px(p.lon); tip.style.left = `${Math.max(0, Math.min(x + 12, W - tip.offsetWidth - 4))}px`; tip.style.top = `${Math.max(0, py(p.lat) - 20)}px`; };
    g.onmouseleave = () => { tip.hidden = true; };
  });
}

// a ranked list: rows {name, sub, v, frac, fill, right}; long lists show the first 15 until asked
function stationList(el, rows, unitWord = 'stations') {
  let all = rows.length <= 20;
  const draw = () => {
    el.innerHTML = `<div style="border-top:1px solid var(--border)">${(all ? rows : rows.slice(0, 15)).map((r) => `<div class="mon"><span class="n">${r.name}${r.sub ? ` <small style="color:var(--muted)">${r.sub}</small>` : ''}</span><span class="b"><i style="width:${Math.max(0.5, r.frac * 100)}%;background:${r.fill}"></i></span><span class="v">${r.right}</span></div>`).join('')}</div>
      ${all ? '' : `<button class="wl-more" type="button">Show all ${rows.length} ${unitWord}</button>`}`;
    const b = el.querySelector('.wl-more'); if (b) b.onclick = () => { all = true; draw(); };
  };
  draw();
}

// above or below normal, each day: bars up (warmer, wetter, more) in orange-red, down in blue
function devBars(el, pts, { fmt, unit, upCol = ABOVE, downCol = BELOWC, xFrom = START, yearAxis = false }) {
  const W = el.clientWidth, H = 260, narrow = W < 500, M = { l: 40, r: narrow ? 10 : 24, t: 12, b: 28 };
  const t0 = tOf(xFrom), t1 = T1, x = (s) => M.l + ((tOf(s) + DAY / 2 - t0) / (t1 - t0)) * (W - M.l - M.r);
  const m = niceMax(Math.max(...pts.map((p) => Math.abs(p[1]))) * 1.05), y = (v) => M.t + (1 - (v + m) / (2 * m)) * (H - M.t - M.b);
  const bw = Math.max(1.2, (W - M.l - M.r) / ((t1 - t0) / DAY) - 0.6);
  const months = []; for (let mm = +xFrom.slice(5, 7); mm <= +TODAY.slice(5, 7); mm++) months.push(`${Y}-${String(mm).padStart(2, '0')}-15`);
  el.innerHTML = frame(W, H, M, `${seasons(W - M.r, M, H, [Y], x)}${gridY(W, M, y, [-m, -m / 2, 0, m / 2, m], (v) => `${v > 0 ? '+' : ''}${fmt(v)}`)}
    ${months.filter((s) => tOf(s) > t0).filter((_, i) => !(narrow && yearAxis) || i % 3 === 0).map((s) => `<text x="${x(s)}" y="${H - 8}" text-anchor="middle" class="ax">${MON[+s.slice(5, 7) - 1]}</text>`).join('')}
    ${pts.map(([s, v]) => `<rect x="${(x(s) - bw / 2).toFixed(1)}" y="${Math.min(y(0), y(v)).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.abs(y(v) - y(0)).toFixed(1)}" fill="${v >= 0 ? upCol : downCol}"/>`).join('')}
    <line x1="${M.l}" x2="${W - M.r}" y1="${y(0)}" y2="${y(0)}" stroke="#111827" stroke-width="1"/>`, 'Difference from normal');
  hover(el, W, (fx) => { const p = nearest(pts, t0 + fx * (t1 - t0));
    return { x: x(p[0]), html: `<b>${nice(p[0])}</b><span><i style="background:${p[1] >= 0 ? upCol : downCol}"></i><b>${p[1] > 0 ? '+' : ''}${fmt(p[1])}</b>${unit}</span>` }; });
}

// ── every station as a faint dot, each corporation's mean as a line (after OWID's cherry-blossom chart) ──
const CORPS = ['GHMC', 'Cyberabad', 'Malkajgiri', 'Secunderabad Cantonment', 'Rest of HMDA'];
const CORP_COL = { GHMC: '#185FA5', Cyberabad: '#D9772B', Malkajgiri: '#2E8B7A', 'Secunderabad Cantonment': '#8E5AA8', 'Rest of HMDA': '#B59A2B' };
const CORP_SHORT = { 'Secunderabad Cantonment': 'Cantonment' };
let SD = D.station_days || null, sdLoad = null;
const loadSD = () => (sdLoad = sdLoad || fetch(`${LIVE_API}/weather-stations.json`).then((r) => r.json()).then((d) => { SD = d; }));
const CORP_OF = Object.fromEntries(D.stations.map((r) => [String(r[0]), r[r.length - 1]]));
const NAME_OF = Object.fromEntries(D.stations.map((r) => [String(r[0]), r[1].replace(/\s+/g, ' ').trim()]));
function corpSeries(key) {
  const out = {};
  CORPS.forEach((c) => {
    const ids = Object.keys(SD[key]).filter((a) => CORP_OF[a] === c);
    const day = SD.dates.map((d, i) => { const v = ids.map((a) => SD[key][a][i]).filter((x) => x != null); return v.length >= 2 ? v.reduce((s, x) => s + x, 0) / v.length : null; });
    // 7-day centred average, where at least 4 of the 7 days have a value
    out[c] = SD.dates.map((d, i) => { const w = day.slice(Math.max(0, i - 3), i + 4).filter((x) => x != null); return w.length >= 4 ? [d, w.reduce((s, x) => s + x, 0) / w.length] : null; }).filter(Boolean);
  });
  return out;
}
function rangeChart(el, key, { fmt, unit, normal }) {
  const W = el.clientWidth, H = 340, narrow = W < 500, M = { l: 40, r: narrow ? 12 : 128, t: 12, b: 28 }, A = dateAxis(W, M);
  const all = Object.values(SD[key]).flat().filter((v) => v != null).sort((a, b) => a - b);
  const p = (q) => all[Math.floor(q * (all.length - 1))], step = niceStep(p(0.998) - p(0.002), 5);
  const lo = Math.floor(p(0.002) / step) * step, hi = Math.ceil(p(0.998) / step) * step, y = (v) => M.t + (1 - (v - lo) / (hi - lo)) * (H - M.t - M.b);
  const ticks = []; for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(v);
  const cs = corpSeries(key), line = (s) => pathOf(s, A.x, y);
  const norm = normal ? SD.dates.filter((d) => d >= START).map((d) => [d, normalOn(d, normal)]) : null;
  const ends = CORPS.filter((c) => cs[c].length).map((c) => ({ c, v: cs[c][cs[c].length - 1][1], y: y(cs[c][cs[c].length - 1][1]) })).sort((a, b) => a.y - b.y);
  ends.forEach((e, i) => { if (i && e.y - ends[i - 1].y < 14) e.y = ends[i - 1].y + 14; });
  el.innerHTML = `<svg width="${W}" height="${H}" style="position:absolute;left:0;top:0">${seasons(W - M.r, M, H, [Y], A.x)}${gridY(W, M, y, ticks, (v) => `${v}${unit}`)}${A.labels(H)}</svg>
    <canvas width="${W * 2}" height="${H * 2}" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px"></canvas>
    <div style="position:relative">${frame(W, H, M, `${norm ? `<path d="${line(norm)}" fill="none" stroke="#111827" stroke-width="1.2" stroke-dasharray="4 3"/>` : ''}
      ${CORPS.map((c) => { const w = c === 'GHMC' || c === 'Rest of HMDA' ? 2.2 : 1.6;   // a white outline under each line lifts it off the dots
        return `<path d="${line(cs[c])}" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="${w + 1.5}" stroke-linejoin="round" stroke-linecap="round"/><path d="${line(cs[c])}" fill="none" stroke="${CORP_COL[c]}" stroke-width="${w}" stroke-linejoin="round"/>`; }).join('')}
      ${narrow ? '' : ends.map((e) => `<text x="${W - M.r + 8}" y="${e.y + 4}" class="lbl"><tspan fill="${CORP_COL[e.c]}" font-weight="700">${fmt(e.v)}</tspan> ${CORP_SHORT[e.c] || e.c}</text>`).join('')}`, 'Each station and each corporation')}</div>`;
  el.style.height = `${H}px`;
  const ctx = el.querySelector('canvas').getContext('2d'); ctx.scale(2, 2); ctx.fillStyle = `rgba(107,114,128,${narrow ? 0.06 : 0.12})`;   // lighter on phones, where the dots pile up
  const xs = SD.dates.map((d) => A.x(d));
  Object.values(SD[key]).forEach((arr) => arr.forEach((v, i) => { if (v != null && SD.dates[i] >= START) { ctx.beginPath(); ctx.arc(xs[i], y(Math.max(lo, Math.min(hi, v))), 1.3, 0, 6.283); ctx.fill(); } }));
  hover(el, W, (fx) => {
    const i = Math.max(0, Math.min(SD.dates.length - 1, Math.round(((A.fromFrac(fx) - tOf(SD.dates[0])) / DAY)))), d = SD.dates[i];
    const vals = Object.entries(SD[key]).map(([a, arr]) => [a, arr[i]]).filter(([, v]) => v != null).sort((a, b) => b[1] - a[1]);
    const at = (c) => (cs[c].find((q) => q[0] === d) || [])[1];
    return { x: A.x(d), html: `<b>${nice(d)}</b>${CORPS.map((c) => (at(c) != null ? `<span><i style="background:${CORP_COL[c]}"></i>${CORP_SHORT[c] || c} <b>${fmt(at(c))}</b></span>` : '')).join('')}${vals.length ? `<span style="color:var(--muted)">${vals.length} stations: ${fmt(vals[vals.length - 1][1])} to ${fmt(vals[0][1])}</span><span style="color:var(--muted)">top: ${NAME_OF[vals[0][0]] || vals[0][0]}</span>` : ''}` };
  });
  return cs;
}
const CORP_KEY = CORPS.map((c) => `<span><i class="ln" style="border-top:2px solid ${CORP_COL[c]}"></i>${c}</span>`).join('') + '<span><i style="background:rgba(107,114,128,.35)"></i>one station on one day</span>';
// the corporations against each other over the last 30 days
function corpGap(cs) {
  const avg = (c) => mean(cs[c].filter((q) => q[0] > iso(tOf(TODAY) - 30 * DAY)).map((q) => q[1]));
  const v = CORPS.map((c) => [c, avg(c)]).filter((q) => q[1] != null).sort((a, b) => b[1] - a[1]);
  return { top: v[0], bottom: v[v.length - 1], of: Object.fromEntries(v) };
}

// ── stations ──
const ST = D.stations.map((r) => Object.fromEntries(D.cols.stations.map((k, i) => [k, r[i]])));
const stName = (s) => s.name.replace(/\s+/g, ' ').trim();
const reporting = (k) => ST.filter((s) => s[k] != null);
const tipSt = (s, lines) => `<b>${stName(s)}</b><span style="color:var(--muted)">${s.mandal || ''}</span>${lines}`;
function stationViews(view, p, k, { cols, edges, fmt, word, extraKey = '' }) {
  const ss = reporting(k).sort((a, b) => b[k] - a[k]), col = stepper(edges, cols), top = Math.max(...ss.map((s) => s[k]));
  const missing = ST.filter((s) => s[k] == null);
  if (view === 'map') {
    stationMap(p.chart, [...missing.map((s) => ({ lat: s.lat, lon: s.lon, fill: '#fff', stroke: '#9CA3AF', r: 2.5, tip: tipSt(s, '<span>No reading</span>') })),
      ...ss.slice().reverse().map((s) => ({ lat: s.lat, lon: s.lon, fill: col(s[k]), tip: tipSt(s, `<span><i style="background:${col(s[k])}"></i>${word} <b>${fmt(s[k])}</b></span>`) }))]);
    return { key: legend(edges, cols, (v) => fmt(v).replace(/\.0(?=\D|$)/, '')) + (missing.length ? noData(`No reading (${missing.length})`) : '') + extraKey };
  }
  const lo = Math.min(0, ...ss.map((s) => s[k]));
  stationList(p.chart, ss.map((s) => ({ name: stName(s), sub: s.mandal, frac: (s[k] - lo) / (top - lo || 1), fill: col(s[k]), right: `<b>${fmt(s[k])}</b>` })));
  return { key: legend(edges, cols, (v) => fmt(v).replace(/\.0(?=\D|$)/, '')) };
}

// ── the sections: one figure each, the views as tabs ──
const NOW_ST = [['now', 'Now'], ['max', "Today's high"], ['min', "Today's low"]], RAIN_ST = [['today', 'Today'], ['month', 'This month'], ['season', 'Since 1 June']], POLS = [['aqi', 'AQI'], ['pm25', 'PM2.5'], ['pm10', 'PM10']];
// show: the options of the Show row for each view that has one
const SECTIONS = [
  { id: 'temp', needsSD: ['s'], label: 'Temperature', src: 'tgdps', views: [['d', 'Today'], ['map', 'Map'], ['list', 'Stations'], ['s', 'Trend'], ['n', 'From normal'], ['c', 'Calendar'], ['k', 'Day counts']],
    show: { s: [['max', 'High'], ['min', 'Low'], ['mean', 'Average']], map: NOW_ST, list: NOW_ST } },
  { id: 'hi', needsSD: ['s'], label: 'Heat index', src: 'tgdps', views: [['d', 'Today'], ['map', 'Map'], ['list', 'Stations'], ['s', 'Trend'], ['c', 'Calendar']],
    show: { map: [['now', 'Now'], ['max', "Today's peak"]], list: [['now', 'Now'], ['max', "Today's peak"]] } },
  { id: 'rh', needsSD: ['s'], label: 'Humidity', src: 'tgdps', views: [['d', 'Today'], ['map', 'Map'], ['list', 'Stations'], ['s', 'Trend'], ['c', 'Calendar']] },
  { id: 'rain', needsSD: ['m'], label: 'Rain', src: 'tgdps', views: [['map', 'Map'], ['list', 'Stations'], ['d', 'Each day'], ['m', 'Each month'], ['n', 'From normal'], ['c', 'Calendar']],
    show: { map: RAIN_ST, list: RAIN_ST } },
  { id: 'air', label: 'Air quality', src: 'air', views: [['map', 'Map'], ['list', 'Monitors'], ['d', 'Each day'], ['n', 'From usual'], ['c', 'Calendar'], ['y', 'Days per year']],
    show: { d: POLS, n: POLS } },
  { id: 'wind', label: 'Wind', src: 'wind', views: [['r', 'Direction'], ['list', 'Stations'], ['s', 'Trend']],
    show: { r: [['day', 'Last 24 hours'], ['month', 'This month'], ['since', 'Since April']] } },
];
root.innerHTML = SECTIONS.map((S, i) => `<h2 class="blk${i ? '' : ' first'}" id="s-${S.id}">${S.label}</h2>
<figure class="fig" id="f-${S.id}"><h2 class="fig-title"><span class="t"></span><small class="w"></small></h2><p class="fig-sub"></p>
  <div class="ctl"><div class="row"><span class="lab">View</span><div class="tabs" data-k="view">${S.views.map(([v, l], j) => `<button data-v="${v}"${j ? '' : ' class="on"'}>${l}</button>`).join('')}</div></div>
  <div class="row show-row" hidden><span class="lab">Show</span><div class="tabs" data-k="show"></div></div></div>
  <div class="key"></div><div class="chart"></div><p class="note"></p>${foot(S.src)}</figure>`).join('\n') +
  `<button class="more gone" id="wx-more" type="button"><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1V10M2 6.5 6 10.5 10 6.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>More below <span id="wx-more-next"></span></button>`;

function figure(S, render) {
  const fig = $(`#f-${S.id}`), state = { view: S.views[0][0], show: {} };   // the Show choice is kept per view
  const parts = { t: fig.querySelector('.t'), w: fig.querySelector('.w'), sub: fig.querySelector('.fig-sub'), key: fig.querySelector('.key'), chart: fig.querySelector('.chart'), note: fig.querySelector('.note') };
  const showRow = fig.querySelector('.show-row'), showTabs = showRow.querySelector('.tabs');
  function draw() {
    const opts = (S.show || {})[state.view];
    if (opts && !state.show[state.view]) state.show[state.view] = opts[0][0];
    showRow.hidden = !opts;
    showTabs.innerHTML = opts ? opts.map(([v, l]) => `<button data-v="${v}"${v === state.show[state.view] ? ' class="on"' : ''}>${l}</button>`).join('') : '';
    fig.querySelectorAll('[data-k="view"] button').forEach((x) => x.classList.toggle('on', x.dataset.v === state.view));
    parts.chart.innerHTML = ''; parts.chart.style.height = '';
    if ((S.needsSD || []).includes(state.view) && !SD) {   // every station's days are a separate, larger file
      parts.chart.innerHTML = '<p class="live-note">Loading every station…</p>';
      loadSD().then(draw, () => { parts.chart.innerHTML = '<p class="live-note">The station readings could not be loaded.</p>'; });
      return;
    }
    const o = render(state.view, state.show[state.view], parts) || {};
    parts.t.textContent = o.t || ''; parts.w.textContent = o.w || ''; parts.sub.textContent = o.sub || '';
    parts.key.innerHTML = o.key || ''; parts.key.hidden = !o.key; parts.note.textContent = o.note || '';
  }
  fig.querySelector('[data-k="view"]').onclick = (e) => { const x = e.target.closest('button'); if (!x) return; state.view = x.dataset.v; draw(); };
  showTabs.onclick = (e) => { const x = e.target.closest('button'); if (!x) return; state.show[state.view] = x.dataset.v; draw(); };
  on('resize', draw); draw();
}
const SEC = Object.fromEntries(SECTIONS.map((S) => [S.id, S]));
const whenToday = `${nice(TODAY)} ${Y}, to ${String(HOUR).padStart(2, '0')}:00`, whenSpan = `Feb–${MON[+TODAY.slice(5, 7) - 1]} ${Y}`;
const hh = (h) => `${String(h).padStart(2, '0')}:00`;
const last30 = (pts) => pts.filter((p) => p[0] > iso(tOf(TODAY) - 30 * DAY));
const SEASON_KEY = `<span><i style="background:${SUMMER};border-radius:0;border:1px solid #E5E7EB"></i>Summer</span><span><i style="background:${MONSOON};border-radius:0;border:1px solid #E5E7EB"></i>Monsoon</span>`;
const NO_GAP = 'No readings 19–20 October.';

// ── Temperature ──
const daily = D.daily.filter((r) => r[0] >= START);
const highs = daily.map((r) => [r[0], r[2]]), lows = daily.map((r) => [r[0], r[3]]);
const normDays = []; for (let t = T0; t < T1; t += DAY) normDays.push(iso(t));
const nHi = normDays.map((d) => [d, normalOn(d, 'max')]), nLo = normDays.map((d) => [d, normalOn(d, 'min')]);
const hottest = highs.reduce((a, b) => (b[1] > a[1] ? b : a));
const tMonth = (() => { const k = TODAY.slice(0, 7), r = daily.filter((x) => x[0].startsWith(k)); return r.length >= 5 ? k : iso(Date.UTC(Y, +k.slice(5) - 2, 1)).slice(0, 7); })();
const tmRows = daily.filter((x) => x[0].startsWith(tMonth)), tmHi = mean(tmRows.map((r) => r[2])), tmDep = mean(tmRows.map((r) => r[2] - normalOn(r[0], 'max')));
const tNow = valAt(TODAY, 'temp', HOUR), tY = valAt(YDAY, 'temp', HOUR);
const warmer = (a, b, u) => { const d = a - b; return Math.abs(d) < 0.3 ? 'about the same as' : `${f1(Math.abs(d))}${u} ${d > 0 ? 'warmer' : 'cooler'} than`; };
const peakToday = (k) => hourSeries(TODAY, k).reduce((a, b) => (b[1] > a[1] ? b : a), [0, -99]);
const degF = (v) => `${f1(v)}°`, intDeg = (v) => `${Math.round(v)}°`;
const T_EDGES = [30, 33, 36, 39];
figure(SEC.temp, (view, show, p) => {
  if (view === 'd') {
    const nh = normalOn(TODAY, 'max'), nl = normalOn(TODAY, 'min');
    dayChart(p.chart, 'temp', { fmt: degF, unit: '°C', normals: [[nh, 'normal high'], [nl, 'normal low']] });
    const pk = peakToday('temp'), dh = pk[1] - nh;
    return { t: `${f1(tNow)} °C at ${hh(HOUR)}; today's high of ${f1(pk[1])} °C was ${f1(Math.abs(dh))} °C ${dh >= 0 ? 'above' : 'below'} normal`, w: whenToday,
      sub: `°C · median of the stations in HMDA · each hour · high at ${hh(pk[0])}`,
      key: KEY_DAYS + `<span><i class="ln" style="border-top:1.5px dashed #111827"></i>Normal high and low for ${nice(TODAY)}, IMD Begumpet 1991–2020</span>` };
  }
  if (view === 's') {
    const word = { max: 'highs', min: 'lows', mean: 'average temperatures' }[show];
    const g = corpGap(rangeChart(p.chart, show, { fmt: degF, unit: '°', normal: show === 'mean' ? null : show }));
    const gh = g.of.GHMC, rest = g.of['Rest of HMDA'], diff = gh - rest;
    return { t: `Over the last 30 days GHMC's ${word} averaged ${f1(gh)} °C, ${f1(Math.abs(diff))} °C ${diff >= 0 ? 'warmer' : 'cooler'} than the rest of HMDA`, w: whenSpan,
      sub: `°C · each dot is one station's ${{ max: 'highest', min: 'lowest', mean: 'average' }[show]} reading of a day · lines: the average of each corporation's stations, 7-day average`,
      key: CORP_KEY + (show === 'mean' ? '' : `<span><i class="ln" style="border-top:1.5px dashed #111827"></i>Normal ${show === 'max' ? 'high' : 'low'}, IMD Begumpet</span>`) + SEASON_KEY,
      note: `Point at the chart for each corporation and the range across stations that day. Corporations as formed in 2026. ${NO_GAP}` };
  }
  if (view === 'n') {
    const dep = highs.map(([d, v]) => [d, v - normalOn(d, 'max')]), l30 = last30(dep), up = l30.filter((q) => q[1] > 0).length;
    devBars(p.chart, dep, { fmt: (v) => `${f1(v)}°`, unit: ' °C' });
    return { t: `Highs were above normal on ${up} of the last ${l30.length} days`, w: whenSpan,
      sub: "°C · each day's high (median of the stations in HMDA) minus IMD's normal high for the date",
      key: `<span><i style="background:${ABOVE};border-radius:0"></i>Warmer than normal</span><span><i style="background:${BELOWC};border-radius:0"></i>Cooler than normal</span>${SEASON_KEY}`, note: `Normal: IMD Begumpet, 1991–2020, monthly means joined in straight lines. ${NO_GAP}` };
  }
  if (view === 'c') {
    const vals = Object.fromEntries(highs), col = stepper(T_EDGES, RAMP.orange);
    calendar(p.chart, vals, col, (d, v) => `${nice(d)}: high ${f1(v)} °C (normal ${f1(normalOn(d, 'max'))})`);
    const hot = highs.filter((q) => q[1] >= 39).length;
    return { t: `${hot} days reached 39 °C or more this year`, w: whenSpan, sub: "Each day's high, median of the stations in HMDA · point at a day to read it",
      key: legend(T_EDGES, RAMP.orange, intDeg) + noData('No readings') };
  }
  if (view === 'k') {
    // hot days (high 40 °C or more), warm nights (low 25 °C or more), comfortable days (heat index under 35 °C all day),
    // each from the HMDA median of the day (Teja, 25 Oct)
    const peakOf = Object.fromEntries(hiPeak.filter((r) => r[0] < TODAY).map((r) => [r[0], r[1]]));
    const KINDS = [['hot', 'Hot days', 'high of 40 °C or more', HEAT], ['warm', 'Warm nights', 'low of 25 °C or more', '#8462AC'], ['comf', 'Comfortable days', 'heat index under 35 °C all day', '#4A9447']];
    const ms = [...new Set(daily.filter((r) => r[0] >= `${Y}-03`).map((r) => r[0].slice(0, 7)))];
    const cnt = Object.fromEntries(ms.map((m) => [m, { hot: 0, warm: 0, comf: 0, days: 0 }]));
    daily.filter((r) => r[0] >= `${Y}-03`).forEach(([d, , hi, lo]) => { const c = cnt[d.slice(0, 7)]; c.days += 1; if (hi >= 40) c.hot += 1; if (lo >= 25) c.warm += 1; if (peakOf[d] != null && peakOf[d] < 35) c.comf += 1; });
    const tot = { hot: 0, warm: 0, comf: 0 }; ms.forEach((m) => KINDS.forEach(([k]) => { tot[k] += cnt[m][k]; }));
    const el = p.chart, W = el.clientWidth, H = 260, narrow = W < 500, M = { l: 34, r: 10, t: 16, b: 28 }, cw = (W - M.l - M.r) / ms.length, bw = Math.min(16, (cw * 0.8) / 3);
    const top = 31, y = (v) => M.t + (1 - v / top) * (H - M.t - M.b), x = (i, j) => M.l + cw * i + cw / 2 + (j - 1) * (bw + 2);
    const stats = `<div style="display:flex;gap:28px;flex-wrap:wrap;margin:0 0 14px">${KINDS.map(([k, n, def, c]) => `<div style="font-size:12.5px;color:var(--muted)"><b style="display:block;font:700 26px/1.1 var(--font-ui);color:var(--ink)">${tot[k]}</b><i style="display:inline-block;width:10px;height:10px;background:${c};margin-right:6px"></i>${n.toLowerCase()} · ${def}</div>`).join('')}</div>`;
    el.innerHTML = stats + `<div class="chart" style="position:relative">${frame(W, H, M, `${gridY(W, M, y, [0, 10, 20, 30], (v) => v)}
      ${ms.map((m, i) => `<text x="${M.l + cw * i + cw / 2}" y="${H - 8}" text-anchor="middle" class="ax">${MON[+m.slice(5) - 1]}${m === TODAY.slice(0, 7) ? '*' : ''}</text>${KINDS.map(([k, , , c], j) => (cnt[m][k] ? `<rect x="${x(i, j) - bw / 2}" y="${y(cnt[m][k])}" width="${bw}" height="${y(0) - y(cnt[m][k])}" fill="${c}"/>${narrow ? '' : `<text x="${x(i, j)}" y="${y(cnt[m][k]) - 4}" text-anchor="middle" class="ax" font-size="10.5">${cnt[m][k]}</text>`}` : '')).join('')}`).join('')}`, 'Day counts each month')}</div>`;
    hover(el.querySelector('.chart'), W, (fx) => { const i = Math.max(0, Math.min(ms.length - 1, Math.floor(fx * ms.length))), c = cnt[ms[i]];
      return { x: M.l + cw * i + cw / 2, html: `<b>${MONTH[+ms[i].slice(5) - 1]} ${Y}</b>${KINDS.map(([k, n, , col]) => `<span><i style="background:${col}"></i>${n} <b>${c[k]}</b></span>`).join('')}<span style="color:var(--muted)">of ${c.days} days with readings</span>` }; });
    return { t: `${tot.hot} hot days, ${tot.warm} warm nights and ${tot.comf} comfortable days so far this year`, w: `Mar–${MON[+TODAY.slice(5, 7) - 1]} ${Y}`,
      sub: 'Days in each month · from the HMDA median of the stations each day', note: `* ${MONTH[+TODAY.slice(5, 7) - 1]} so far. ${NO_GAP}` };
  }
  const k = { now: 'temp_c', max: 'today_max_c', min: 'today_min_c' }[show], word = { now: 'Now', max: 'High', min: 'Low' }[show];
  const vals = reporting(k).map((s) => s[k]), edges = edgesFor(vals, 1);
  const o = stationViews(view, p, k, { cols: RAMP.orange, edges, fmt: degF, word });
  const ss = reporting(k).sort((a, b) => b[k] - a[k]), spread = ss[0][k] - ss[ss.length - 1][k];
  return { ...o, t: show === 'min' ? `${stName(ss[ss.length - 1])} was the coolest place this morning, at ${f1(ss[ss.length - 1][k])} °C` : `${stName(ss[0])} is the ${show === 'now' ? 'warmest' : 'hottest'} station${show === 'now' ? ` at ${hh(HOUR)}` : ' today'}, at ${f1(ss[0][k])} °C`,
    w: whenToday, sub: `°C · ${{ now: 'the newest hourly reading', max: "today's highest reading so far", min: "today's lowest reading" }[show]} · ${ss.length} stations in HMDA · ${f1(spread)} °C between the warmest and the coolest`,
    note: view === 'list' ? 'TGDPS station names as published.' : 'Point at a station to read it.' };
});

// ── Heat index ──
const hiPeak = Object.keys(byDay).sort().filter((d) => d >= START).map((d) => { const s = hourSeries(d, 'hi'); if (s.length < (d === TODAY ? 1 : 18)) return null; const pk = s.reduce((a, b) => (b[1] > a[1] ? b : a)); return [d, pk[1], pk[0]]; }).filter(Boolean);
const bandCount = [0, 0, 0, 0]; hiPeak.filter((r) => r[0] < TODAY).forEach((r) => { bandCount[hiBand(r[1])] += 1; });
const topBand = bandCount[3] ? 3 : bandCount[2] ? 2 : 1;
const topDays = hiPeak.filter((r) => r[0] < TODAY && hiBand(r[1]) === topBand), lastTop = topDays[topDays.length - 1];
const hiNow = valAt(TODAY, 'hi', HOUR), hiPk = peakToday('hi');
const HI_EDGES = [35.5, 45.5, 55.5], HI_KEY = HI_NAMES.map((n, i) => `<span><i style="background:${HI_COL[i]};border-radius:2px;border:1px solid rgba(17,24,39,.12)"></i>${n}${i === 0 ? ', up to 35 °C' : i === 1 ? ', 36–45' : i === 2 ? ', 46–55' : ', above 55'}</span>`).join('');
figure(SEC.hi, (view, show, p) => {
  if (view === 'd') {
    dayChart(p.chart, 'hi', { fmt: degF, unit: '°C', bands: [[35.5, 'Be aware from 36 °C', '#D9C24A'], [45.5, 'Be prepared from 46 °C', HI_COL[2]], [55.5, 'Take action above 55 °C', HI_COL[3]]] });
    return { t: `It feels like ${f1(hiNow)} °C at ${hh(HOUR)} (${hiLevel(hiBand(hiNow))}); today's peak was ${f1(hiPk[1])} °C at ${hh(hiPk[0])} (${hiLevel(hiBand(hiPk[1]))})`,
      w: whenToday, sub: 'Heat index (feels-like temperature), °C · median of the stations in HMDA · each hour', key: KEY_DAYS + `<span><i class="ln" style="border-top:2px solid ${HI_COL[2]}"></i>Where IMD's warning levels begin</span>` };
  }
  if (view === 's') {
    const g = corpGap(rangeChart(p.chart, 'hi', { fmt: degF, unit: '°' }));
    return { t: `Over the last 30 days the peak heat index was highest in ${g.top[0]} (${f1(g.top[1])} °C) and lowest in ${g.bottom[0]} (${f1(g.bottom[1])} °C)`, w: whenSpan,
      sub: "Heat index, °C · each dot is one station's highest of a day · lines: the average of each corporation's stations, 7-day average",
      key: CORP_KEY + SEASON_KEY, note: `IMD's levels: be aware from 36 °C, be prepared from 46. ${NO_GAP}` };
  }
  if (view === 'c') {
    calendar(p.chart, Object.fromEntries(hiPeak.map((r) => [r[0], r[1]])), (v) => HI_COL[hiBand(v)], (d, v) => `${nice(d)}: peak ${f1(v)} °C (${HI_NAMES[hiBand(v)]})${d === TODAY ? ', so far' : ''}`);
    return { t: `${bandCount[topBand]} days reached IMD's ${hiLevel(topBand)} level this year, the last on ${nice(lastTop[0])}`, w: whenSpan,
      sub: "Each day's highest heat index, median of the stations in HMDA, in IMD's bands · point at a day to read it",
      key: HI_NAMES.map((n, i) => `<span><i style="background:${HI_COL[i]};border-radius:2px;border:1px solid rgba(17,24,39,.12)"></i>${n} · ${bandCount[i]} days</span>`).join('') + noData('No readings'),
      note: "IMD's levels: no warning up to 35 °C, be aware 36–45, be prepared 46–55, take action above 55." };
  }
  const k = show === 'now' ? 'heat_index_c' : 'today_max_hi', ss = reporting(k).sort((a, b) => b[k] - a[k]);
  const col = (v) => HI_COL[hiBand(v)];
  if (view === 'map') {
    stationMap(p.chart, ss.slice().reverse().map((s) => ({ lat: s.lat, lon: s.lon, fill: col(s[k]), stroke: 'rgba(17,24,39,.35)', tip: tipSt(s, `<span><i style="background:${col(s[k])}"></i>Feels like <b>${degF(s[k])}</b> · ${HI_NAMES[hiBand(s[k])]}</span>`) })));
  } else {
    const top = ss[0][k], lo = Math.min(...ss.map((s) => s[k])) - 2;
    stationList(p.chart, ss.map((s) => ({ name: stName(s), sub: s.mandal, frac: (s[k] - lo) / (top - lo), fill: col(s[k]), right: `<b>${degF(s[k])}</b> ${HI_NAMES[hiBand(s[k])]}` })));
  }
  const n = [0, 0, 0, 0]; ss.forEach((s) => { n[hiBand(s[k])] += 1; });
  const worst = n[3] ? 3 : n[2] ? 2 : n[1] ? 1 : 0;
  return { t: `${worst ? `${n[worst]} of ${ss.length} stations ${show === 'now' ? 'are at' : 'reached'} IMD's ${hiLevel(worst)} level` : `All ${ss.length} stations ${show === 'now' ? 'are' : 'stayed'} below IMD's warning levels`}${show === 'now' ? ` at ${hh(HOUR)}` : ' today'}; the highest, ${stName(ss[0])}, ${show === 'now' ? 'feels like' : 'felt like'} ${f1(ss[0][k])} °C`,
    w: whenToday, sub: `Heat index, °C · ${show === 'now' ? 'the newest hourly reading' : "today's highest so far"} · each station in HMDA`, key: HI_KEY };
});

// ── Humidity ──
const rhDaily = Object.keys(byDay).sort().filter((d) => d < TODAY && d >= START).map((d) => [d, mean(hourSeries(d, 'rh').map((q) => q[1]))]).filter((q) => q[1] != null && hourSeries(q[0], 'rh').length >= 20);
const rhNow = valAt(TODAY, 'rh', HOUR), rhY = valAt(YDAY, 'rh', HOUR);
const wk = (a, b) => mean(rhDaily.filter((q) => q[0] >= iso(tOf(TODAY) - a * DAY) && q[0] < iso(tOf(TODAY) - b * DAY)).map((q) => q[1]));
const rhW = wk(7, 0), rhW2 = wk(14, 7), driest = rhDaily.reduce((a, b) => (b[1] < a[1] ? b : a));
const RH_EDGES = [30, 45, 60, 75], pctF = (v) => `${f0(v)}%`;
figure(SEC.rh, (view, show, p) => {
  if (view === 'd') {
    dayChart(p.chart, 'rh', { fmt: pctF, unit: '%' });
    const rs = hourSeries(TODAY, 'rh').map((q) => q[1]);
    return { t: `Humidity is ${f0(rhNow)}% at ${hh(HOUR)}; today it has ranged from ${f0(Math.min(...rs))}% to ${f0(Math.max(...rs))}%`, w: whenToday, sub: 'Relative humidity, % · median of the stations in HMDA · each hour', key: KEY_DAYS };
  }
  if (view === 's') {
    const g = corpGap(rangeChart(p.chart, 'rh', { fmt: pctF, unit: '%' }));
    return { t: `Humidity averaged ${f0(rhW)}% over the last 7 days; over 30 days ${g.top[0]} was the most humid (${f0(g.top[1])}%) and ${g.bottom[0]} the least (${f0(g.bottom[1])}%)`, w: whenSpan,
      sub: "Relative humidity, % · each dot is one station's average of a day · lines: the average of each corporation's stations, 7-day average",
      key: CORP_KEY + SEASON_KEY, note: NO_GAP };
  }
  if (view === 'c') {
    calendar(p.chart, Object.fromEntries(rhDaily), stepper(RH_EDGES, RAMP.blue), (d, v) => `${nice(d)}: ${f0(v)}% on average`);
    const humid = rhDaily.filter((q) => q[1] >= 75).length;
    return { t: `${humid} days averaged 75% humidity or more this year`, w: whenSpan, sub: "Each day's average humidity, stations in HMDA · point at a day to read it", key: legend(RH_EDGES, RAMP.blue, pctF) + noData('No readings') };
  }
  const o = stationViews(view, p, 'rh_pct', { cols: RAMP.blue, edges: RH_EDGES, fmt: pctF, word: 'Humidity' });
  const ss = reporting('rh_pct').sort((a, b) => b.rh_pct - a.rh_pct);
  return { ...o, t: `Humidity ranges from ${f0(ss[ss.length - 1].rh_pct)}% to ${f0(ss[0].rh_pct)}% across HMDA at ${hh(HOUR)}`, w: whenToday, sub: `Relative humidity, % · the newest hourly reading · ${ss.length} stations in HMDA` };
});

// ── Rain ──
const rain = D.rain.filter((r) => r[0] >= START);
const monthsRain = {}; rain.forEach(([d, , m]) => { monthsRain[d.slice(0, 7)] = (monthsRain[d.slice(0, 7)] || 0) + m; });
const lastRainDay = rain[rain.length - 1][0], curM = lastRainDay.slice(0, 7), dim = new Date(Date.UTC(Y, +curM.slice(5), 0)).getUTCDate(), dayOfM = +lastRainDay.slice(8, 10);
const titleMonth = dayOfM >= 5 ? curM : iso(Date.UTC(Y, +curM.slice(5) - 2, 1)).slice(0, 7), tmIdx = +titleMonth.slice(5) - 1, tmPart = titleMonth === curM;
const tmNorm = D.normals[tmIdx + 1].rain * (tmPart ? dayOfM / dim : 1), tmAct = monthsRain[titleMonth] || 0;
const pctOf = (a, n) => Math.round((a / n - 1) * 100), below = (q) => (q < 0 ? `${-q}% below normal` : q > 0 ? `${q}% above normal` : 'normal');
const monsoon = ['06', '07', '08', '09'].map((m) => monthsRain[`${Y}-${m}`] || 0).reduce((a, b) => a + b, 0), monsoonN = [6, 7, 8, 9].map((m) => D.normals[m].rain).reduce((a, b) => a + b, 0);
const mm = (v) => `${v < 10 && v > 0 ? f1(v) : f0(v)} mm`;
const R_EDGES = [1, 5, 10, 20];
figure(SEC.rain, (view, show, p) => {
  const el = p.chart, W = el.clientWidth, H = 280, narrow = W < 500;
  if (view === 'd') {
    const M = { l: 40, r: narrow ? 10 : 24, t: 12, b: 28 }, A = dateAxis(W, M), top = niceMax(Math.max(...rain.map((r) => r[2])) * 1.05);
    const dt = []; for (let v = 0; v <= top; v += niceStep(top, 4)) dt.push(v);
    const y = (v) => M.t + (1 - v / top) * (H - M.t - M.b), bw = Math.max(1.5, (W - M.l - M.r) / ((T1 - T0) / DAY) - 1), wet = rain.reduce((a, b) => (b[2] > a[2] ? b : a));
    el.innerHTML = frame(W, H, M, `${seasons(W - M.r, M, H, [Y], A.x)}${gridY(W, M, y, dt, (v) => `${f0(v)}`)}${A.labels(H)}
      ${rain.map(([d, , m, , , , open]) => `<rect x="${(A.x(d) - bw / 2).toFixed(1)}" y="${y(m).toFixed(1)}" width="${bw.toFixed(1)}" height="${(y(0) - y(m)).toFixed(1)}" fill="${WATER}" ${open ? 'opacity=".5"' : ''}/>`).join('')}
      <text x="${A.x(wet[0]) + 6}" y="${y(wet[2]) + 4}" class="lbl halo">${nice(wet[0])} · ${f1(wet[2])} mm</text>`, 'Rain each day');
    hover(el, W, (fx) => { const r = nearest(rain, A.fromFrac(fx));
      return { x: A.x(r[0]), html: `<b>${nice(r[0])}${r[6] ? ' (so far)' : ''}</b><span><i style="background:${WATER}"></i>Average <b>${f1(r[2])} mm</b></span><span>${r[3]} of ${r[1]} stations had rain</span>${r[5] ? `<span>Wettest: ${r[5]}, ${f1(r[4])} mm</span>` : ''}` }; });
    return { t: `${f0(tmAct)} mm of rain ${tmPart ? `so far in ${MONTH[tmIdx]}` : `in ${MONTH[tmIdx]}`}, against a normal of ${f0(tmNorm)} mm${tmPart ? ' by this date' : ''}`, w: whenSpan,
      sub: 'mm · average of the stations in HMDA · each rain day (08:30 to 08:30)', key: `<span><i style="background:${WATER};border-radius:0"></i>Rain that day</span>${SEASON_KEY}`,
      note: D.imd_season ? `IMD's district figures agree: ${f1(D.imd_season.actual_mm)} mm in HMDA's districts since ${nice(D.imd_season.from)}, ${below(D.imd_season.dep_pct)}. ${NO_GAP}` : NO_GAP };
  }
  if (view === 'm') {
    // each station's month as a dot, each corporation's average joined across the months, the normal as a dashed tick
    const ms = Object.keys(monthsRain).filter((k) => k >= `${Y}-03`).sort(), M = { l: 40, r: narrow ? 12 : 128, t: 16, b: 28 }, RM = SD.rain_month;
    const ids = Object.keys(RM), top = niceMax(Math.max(...ids.flatMap((a) => ms.map((k) => RM[a][k] || 0)), ...ms.map((k) => D.normals[+k.slice(5)].rain)) * 1.02);
    const mt = []; for (let v = 0; v <= top; v += niceStep(top, 5)) mt.push(v);
    const cw = (W - M.l - M.r) / ms.length, x = (i) => M.l + cw * i + cw / 2, y = (v) => M.t + (1 - v / top) * (H + 60 - M.t - M.b);
    const jit = (a) => ((((+a * 2654435761) >>> 0) % 1000) / 1000 - 0.5) * cw * 0.55;
    const cm = Object.fromEntries(CORPS.map((c) => [c, ms.map((k) => mean(ids.filter((a) => CORP_OF[a] === c).map((a) => RM[a][k]).filter((v) => v != null)))]));
    const Hh = H + 60;
    el.innerHTML = frame(W, Hh, M, `${gridY(W, M, y, mt, (v) => `${f0(v)}`)}
      ${ms.map((k, i) => `<text x="${x(i)}" y="${Hh - 8}" text-anchor="middle" class="ax">${MON[+k.slice(5) - 1]}${k === curM ? '*' : ''}</text>
        <line x1="${x(i) - cw * 0.36}" x2="${x(i) + cw * 0.36}" y1="${y(D.normals[+k.slice(5)].rain)}" y2="${y(D.normals[+k.slice(5)].rain)}" stroke="#111827" stroke-width="1.5" stroke-dasharray="4 3"/>
        ${ids.filter((a) => RM[a][k] != null).map((a) => `<circle cx="${(x(i) + jit(a)).toFixed(1)}" cy="${y(RM[a][k]).toFixed(1)}" r="1.8" fill="rgba(107,114,128,.28)"/>`).join('')}`).join('')}
      ${CORPS.map((c) => `<path d="${cm[c].map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v || 0).toFixed(1)}`).join(' ')}" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="3.3" stroke-linejoin="round"/><path d="${cm[c].map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v || 0).toFixed(1)}`).join(' ')}" fill="none" stroke="${CORP_COL[c]}" stroke-width="1.8"/>${cm[c].map((v, i) => `<circle cx="${x(i)}" cy="${y(v || 0)}" r="3" fill="${CORP_COL[c]}" stroke="#fff" stroke-width="1.5"/>`).join('')}`).join('')}
      ${narrow ? '' : (() => { const e = CORPS.map((c) => ({ c, v: cm[c][ms.length - 1], y: y(cm[c][ms.length - 1] || 0) })).sort((p1, p2) => p1.y - p2.y); e.forEach((q, i) => { if (i && q.y - e[i - 1].y < 14) q.y = e[i - 1].y + 14; }); const over = e.length ? e[e.length - 1].y - (Hh - M.b) : 0; if (over > 0) e.forEach((q) => { q.y -= over; }); return e.map((q) => `<text x="${W - M.r + 8}" y="${q.y + 4}" class="lbl"><tspan fill="${CORP_COL[q.c]}" font-weight="700">${f0(q.v || 0)}</tspan> ${CORP_SHORT[q.c] || q.c}</text>`).join(''); })()}`, 'Rain each month, each station');
    hover(el, W, (fx) => { const i = Math.max(0, Math.min(ms.length - 1, Math.floor(fx * ms.length))), k = ms[i];
      const v = ids.map((a) => [a, RM[a][k]]).filter(([, q]) => q != null).sort((p1, p2) => p2[1] - p1[1]);
      return { x: x(i), html: `<b>${MONTH[+k.slice(5) - 1]} ${Y}${k === curM ? ' (so far)' : ''}</b>${CORPS.map((c) => `<span><i style="background:${CORP_COL[c]}"></i>${CORP_SHORT[c] || c} <b>${f0(cm[c][i] || 0)} mm</b></span>`).join('')}<span><i style="background:#111827"></i>Normal ${f0(D.normals[+k.slice(5)].rain)} mm</span><span style="color:var(--muted)">${v.length} stations: ${f0(v[v.length - 1][1])} to ${f0(v[0][1])} mm (${NAME_OF[v[0][0]]})</span>` }; });
    const aug = ms.indexOf(`${Y}-08`), spread = aug >= 0 ? ids.map((a) => RM[a][`${Y}-08`]).filter((q) => q != null).sort((p1, p2) => p1 - p2) : null;
    return { t: `The ${Y} monsoon brought ${f0(monsoon)} mm of rain, ${below(pctOf(monsoon, monsoonN))}${spread ? `; in August stations got anything from ${f0(spread[0])} to ${f0(spread[spread.length - 1])} mm` : ''}`, w: `Mar–${MON[+TODAY.slice(5, 7) - 1]} ${Y}`,
      sub: "mm · each dot is one station's month · lines: the average of each corporation's stations", note: `* ${MONTH[+curM.slice(5) - 1]} so far. Normal: IMD Begumpet, 1991–2020 (June–September ${f0(monsoonN)} mm).`,
      key: CORP_KEY.replace('one station on one day', 'one station in one month') + '<span><i class="ln" style="border-top:1.5px dashed #111827"></i>Normal for the month</span>' };
  }
  if (view === 'n') {
    // running total since 1 June against the normal's running total (each month's normal spread evenly over its days)
    const from = `${Y}-06-01`, days = []; for (let t = tOf(from); t < tOf(lastRainDay) + DAY; t += DAY) days.push(iso(t));
    const byD = Object.fromEntries(rain.map((r) => [r[0], r[2]]));
    let a = 0, n = 0; const act = [], nor = [];
    days.forEach((d) => { a += byD[d] || 0; n += D.normals[+d.slice(5, 7)].rain / new Date(Date.UTC(Y, +d.slice(5, 7), 0)).getUTCDate(); act.push([d, a]); nor.push([d, n]); });
    const M = { l: 44, r: narrow ? 46 : 110, t: 12, b: 28 }, t0 = tOf(from), t1 = tOf(lastRainDay) + DAY, x = (s) => M.l + ((tOf(s) + DAY / 2 - t0) / (t1 - t0)) * (W - M.l - M.r);
    const top = niceMax(Math.max(a, n) * 1.05), y = (v) => M.t + (1 - v / top) * (H - M.t - M.b), line = (s) => s.map(([d, v], i) => `${i ? 'L' : 'M'}${x(d).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const mt = []; for (let v = 0; v <= top; v += niceStep(top, 5)) mt.push(v);
    const gap = `M${act.map(([d, v]) => `${x(d).toFixed(1)},${y(v).toFixed(1)}`).join(' L')} L${nor.slice().reverse().map(([d, v]) => `${x(d).toFixed(1)},${y(v).toFixed(1)}`).join(' L')}Z`;
    el.innerHTML = frame(W, H, M, `<defs><pattern id="wx-hatch" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="rgba(194,65,59,.45)" stroke-width="1.5"/></pattern></defs>
      ${gridY(W, M, y, mt, (v) => f0(v))}${['06', '07', '08', '09', '10', '11', '12'].filter((m) => tOf(`${Y}-${m}-15`) < t1).map((m) => `<text x="${x(`${Y}-${m}-15`)}" y="${H - 8}" text-anchor="middle" class="ax">${MON[+m - 1]}</text>`).join('')}
      ${a < n ? `<path d="${gap}" fill="url(#wx-hatch)"/>` : ''}<path d="${line(nor)}" fill="none" stroke="#111827" stroke-width="1.5" stroke-dasharray="4 3"/><path d="${line(act)}" fill="none" stroke="${WATER}" stroke-width="2"/>
      ${narrow ? '' : `<text x="${W - M.r + 8}" y="${y(a) + 4}" class="lbl" font-weight="700">${f0(a)} mm</text><text x="${W - M.r + 8}" y="${y(n) + 4}" class="lbl lbl-muted">normal ${f0(n)}</text>`}`, 'Rain since 1 June against normal');
    hover(el, W, (fx) => { const i = Math.max(0, Math.min(days.length - 1, Math.round(fx * (days.length - 1))));
      return { x: x(days[i]), html: `<b>${nice(days[i])}</b><span><i style="background:${WATER}"></i>Since 1 June <b>${f0(act[i][1])} mm</b></span><span><i style="background:#111827"></i>Normal ${f0(nor[i][1])} mm</span>` }; });
    return { t: `Since 1 June: ${f0(a)} mm of rain, ${below(pctOf(a, n))} (${f0(n)} mm)`, w: `Jun–${MON[+TODAY.slice(5, 7) - 1]} ${Y}`, sub: 'mm · running total, average of the stations in HMDA, against the normal by each date',
      key: `<span><i class="ln" style="border-top:2px solid ${WATER}"></i>Rain since 1 June</span><span><i class="ln" style="border-top:1.5px dashed #111827"></i>Normal by that date</span><span><i style="width:16px;height:10px;border-radius:0;background:repeating-linear-gradient(135deg,rgba(194,65,59,.6) 0 1.5px,transparent 1.5px 5px);border:1px solid #D1D5DB"></i>Shortfall</span>`,
      note: "Normal: IMD Begumpet's 1991–2020 monthly normals, each spread evenly over its days." };
  }
  if (view === 'c') {
    const vals = Object.fromEntries(rain.map((r) => [r[0], r[2]])), dry = rain.filter((r) => r[0] >= `${Y}-06-01` && r[2] < 1).length;
    calendar(el, vals, (v) => (v < 0.1 ? '#FFFFFF' : stepper(R_EDGES, RAMP.blue)(v)), (d, v) => `${nice(d)}: ${f1(v)} mm on average`);
    return { t: `${rain.filter((r) => r[2] >= 10).length} days brought 10 mm or more on average this year`, w: whenSpan, sub: 'Rain each day (08:30 to 08:30), average of the stations in HMDA · point at a day to read it',
      key: `<span><i style="background:#fff;border:1px solid #D1D5DB;border-radius:0"></i>None</span>${legend(R_EDGES, RAMP.blue, (v) => `${v}`)}<span>mm</span>${noData('No readings')}`, note: `${dry} days since 1 June had less than 1 mm.` };
  }
  const k = { today: 'rain_today_mm', month: 'rain_month_mm', season: 'rain_since_june_mm' }[show], ss = reporting(k).sort((a, b) => b[k] - a[k]);
  const vals = ss.map((s) => s[k]).filter((v) => v > 0), edges = show === 'today' ? R_EDGES : edgesFor(vals, show === 'season' ? 50 : 5);
  const col = (v) => (v < 0.1 ? '#FFFFFF' : stepper(edges, RAMP.blue)(v));
  if (view === 'map') {
    stationMap(p.chart, ss.slice().reverse().map((s) => ({ lat: s.lat, lon: s.lon, fill: col(s[k]), stroke: s[k] < 0.1 ? '#9CA3AF' : null, r: s[k] < 0.1 ? 3 : 4.5, tip: tipSt(s, `<span><i style="background:${col(s[k])}"></i>Rain <b>${mm(s[k])}</b></span>`) })));
  } else {
    stationList(p.chart, ss.map((s) => ({ name: stName(s), sub: s.mandal, frac: s[k] / (ss[0][k] || 1), fill: col(s[k]), right: `<b>${mm(s[k])}</b>` })));
  }
  const wetN = ss.filter((s) => s[k] > 0).length, what = { today: `today (since 08:30)`, month: `so far in ${MONTH[+curM.slice(5) - 1]}`, season: 'since 1 June' }[show];
  return { t: wetN ? `${stName(ss[0])} had the most rain ${what}: ${mm(ss[0][k])}` : `No station had rain ${what}`, w: whenToday,
    sub: `mm · ${what} · ${wetN} of ${ss.length} stations had rain`, key: `<span><i style="background:#fff;border:1px solid #9CA3AF;border-radius:50%"></i>None</span>${legend(edges, RAMP.blue, (v) => f0(v))}<span>mm</span>`,
    note: 'A station\'s day over 50 mm is left out when none of its five nearest stations had a fifth of it (a faulty gauge, not a storm).' };
});

// ── Air quality ──
const air = D.air, airBy = {};
air.forEach((r) => { (airBy[r[0].slice(0, 4)] = airBy[r[0].slice(0, 4)] || []).push(r); });
const COL = { aqi: 2, pm25: 3, pm10: 4 }, UNIT = { aqi: '', pm25: ' µg/m³', pm10: ' µg/m³' };
const roll7 = (rows, c) => rows.map((r, i) => { const w = rows.slice(Math.max(0, i - 6), i + 1).filter((q) => tOf(r[0]) - tOf(q[0]) < 7 * DAY && q[c] != null); return w.length >= 4 ? [doy(r[0]), w.reduce((a, q) => a + q[c], 0) / w.length] : null; }).filter(Boolean);
const yrs = Object.keys(airBy).sort();
const last7 = (y, c) => { const end = tOf(`${y}${TODAY.slice(4)}`); return mean(air.filter((r) => tOf(r[0]) > end - 7 * DAY && tOf(r[0]) <= end).map((r) => r[c])); };
const shortAQ = (n) => n.replace(/, Hyderabad - TSPCB$/, '').replace(/_/g, ' ');
const aqCol = (v) => AQI_COL[aqiBand(v)], AQ_KEY = AQI_NAMES.slice(0, 4).map((nm, i) => `<span><i style="background:${AQI_COL[i]};border-radius:0"></i>${nm}</span>`).join('');
figure(SEC.air, (view, show, p) => {
  const el = p.chart, W = el.clientWidth, narrow = W < 500;
  if (view === 'd') {
    const c = COL[show], H = 300, M = { l: 52, r: narrow ? 46 : 84, t: 12, b: 28 };
    const ser = Object.fromEntries(yrs.map((y) => [y, roll7(airBy[y], c)])), top = niceMax(Math.max(...Object.values(ser).flat().map((q) => q[1])) * 1.05);
    const x = (d) => M.l + ((d - 1) / 364) * (W - M.l - M.r), y = (v) => M.t + (1 - Math.min(v, top) / top) * (H - M.t - M.b);
    const line = (s) => s.map(([d, v], i) => `${i && d - s[i - 1][0] > 3 ? 'M' : i ? 'L' : 'M'}${x(d).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const steps = show === 'aqi' ? AQI_STEPS : PM_STEPS[show];
    const strip = steps.slice(0, -1).map((s, i) => [s, Math.min(steps[i + 1], top), i]).filter(([s]) => s < top).map(([a, b, i]) => `<rect x="${M.l - 8}" y="${y(b)}" width="5" height="${y(a) - y(b)}" fill="${AQI_COL[i]}"/>`).join('');
    const sNow = ser[Y] || [], sP = ser[P] || [], last = sNow[sNow.length - 1], lP = sP.find((q) => q[0] >= (last ? last[0] : 0)) || sP[sP.length - 1], others = yrs.filter((yy) => +yy < P);
    const ln = last ? y(last[1]) - 8 : 0; let lp = lP ? y(lP[1]) + 14 : 0; if (last && lP && Math.abs(lp - ln) < 16) lp = lP[1] < last[1] ? ln + 18 : ln - 18;
    el.innerHTML = frame(W, H, M, `${seasons(W - M.r, M, H, [Y], (s) => x(doy(s)))}${gridY(W, M, y, ticksOf(0, top, 5), (v) => f0(v))}${strip}
      ${MON.map((m, i) => (narrow && i % 3 ? '' : `<text x="${x(doy(`${Y}-${String(i + 1).padStart(2, '0')}-15`))}" y="${H - 8}" text-anchor="middle" class="ax">${m}</text>`)).join('')}
      ${others.map((yy) => `<path class="oth" data-yr="${yy}" d="${line(ser[yy])}" fill="none" stroke="${OTHER}" stroke-width="1"/>`).join('')}
      <path d="${line(sP)}" fill="none" stroke="${LY}" stroke-width="1.5"/><path d="${line(sNow)}" fill="none" stroke="${NOW}" stroke-width="2"/>
      ${last ? `<circle cx="${x(last[0])}" cy="${y(last[1])}" r="4" fill="${NOW}"/><text x="${x(last[0]) + 8}" y="${ln}" class="lbl halo" font-weight="700">${narrow ? '' : `${Y} · `}${f0(last[1])}</text>` : ''}
      ${lP ? `<text x="${x(lP[0]) + 8}" y="${lp}" class="lbl lbl-muted halo">${narrow ? '' : `${P} · `}${f0(lP[1])}</text>` : ''}
      ${!narrow ? `<text x="${x(32)}" y="${y((sNow.find((q) => q[0] > 70) || [0, top / 2])[1]) - 30}" class="ax halo" font-size="11.5">no readings Jan–Feb ${Y}</text>` : ''}`, `${Y} against ${P} and earlier years`);
    hover(el, W, (fx, fy) => {
      const d = Math.max(1, Math.min(365, Math.round(1 + fx * 364))), val = (1 - fy) * top, at = (s) => s.find((q) => q[0] === d);
      let best = null; others.forEach((yy) => { const q = at(ser[yy]); if (q && (!best || Math.abs(q[1] - val) < Math.abs(best[1] - val))) best = [yy, q[1]]; });
      el.querySelectorAll('.oth').forEach((o) => { const hit = best && o.dataset.yr === best[0]; o.setAttribute('stroke', hit ? '#374151' : OTHER); o.setAttribute('stroke-width', hit ? 1.5 : 1); });
      const a = at(sNow), b = at(sP), dt = new Date(Date.UTC(Y, 0, d));
      return { x: x(d), html: `<b>${dt.getUTCDate()} ${MON[dt.getUTCMonth()]}</b>${a ? `<span><i style="background:${NOW}"></i>${Y} <b>${f0(a[1])}</b>${UNIT[show]}</span>` : ''}${b ? `<span><i style="background:${LY}"></i>${P} ${f0(b[1])}${UNIT[show]}</span>` : ''}${best ? `<span><i style="background:#374151"></i>${best[0]} ${f0(best[1])}${UNIT[show]}</span>` : ''}` };
    }, () => el.querySelectorAll('.oth').forEach((o) => { o.setAttribute('stroke', OTHER); o.setAttribute('stroke-width', 1); }));
    const now7 = last7(Y, c), then7 = last7(P, c), name = show === 'aqi' ? 'The air quality index' : POL[show];
    return { t: `${name} averaged ${f0(now7)}${UNIT[show]}${show === 'aqi' ? ` (${AQI_NAMES[aqiBand(now7)]})` : ''} over the last 7 days, against ${f0(then7)} a year ago`, w: `${yrs[0]}–${Y}`,
      sub: `${show === 'aqi' ? "CPCB's National AQI" : `${POL[show]}, µg/m³, 24-hour mean`} · median of the monitors in HMDA · 7-day average · each day of the year`,
      key: `<span><i class="ln" style="border-top:2px solid ${NOW}"></i>${Y}</span><span><i class="ln" style="border-top:1.5px solid ${LY}"></i>${P}</span><span><i class="ln" style="border-top:1px solid #C4C8CE"></i>each year, ${yrs[0]}–${P - 1} · point at a line to name it</span><span><span class="bandkey">${AQI_COL.slice(0, 4).map((cc) => `<i style="background:${cc}"></i>`).join('')}</span> CPCB categories, on the axis</span>`,
      note: `5 monitors in 2021, 13–14 from mid-2022. Most of January and February ${Y} is missing from the record.` };
  }
  if (view === 'n') {
    // this year's 7-day average against the average of the same day in earlier years
    const c = COL[show], ser = Object.fromEntries(yrs.map((y) => [y, new Map(roll7(airBy[y], c))]));
    const dep = [...ser[Y]].map(([d, v]) => { const past = yrs.filter((y) => +y < Y).map((y) => ser[y].get(d)).filter((q) => q != null); return past.length >= 3 ? [iso(Date.UTC(Y, 0, d)), v - mean(past)] : null; }).filter(Boolean);
    devBars(el, dep, { fmt: (v) => f0(v), unit: UNIT[show], upCol: ABOVE, downCol: BELOWC, xFrom: `${Y}-01-01`, yearAxis: true });
    const l30 = last30(dep), cleaner = l30.filter((q) => q[1] < 0).length;
    return { t: `Air was cleaner than usual on ${cleaner} of the last ${l30.length} days`, w: `${Y}`,
      sub: `${show === 'aqi' ? 'AQI' : `${POL[show]}, µg/m³`} · this year's 7-day average minus the average for the same day in ${yrs[0]}–${P}`,
      key: `<span><i style="background:${ABOVE};border-radius:0"></i>Worse than usual</span><span><i style="background:${BELOWC};border-radius:0"></i>Cleaner than usual</span>`, note: `Usual = the average of ${yrs[0]}–${P}. No readings for most of January and February ${Y}.` };
  }
  if (view === 'c') {
    // one strip per year, a thin bar per day in CPCB's colours
    const rowH = 22, lab = 44, cw = (W - lab) / 366, byDate = Object.fromEntries(air.map((r) => [r[0], r[2]]));
    el.innerHTML = `<svg width="${W}" height="${yrs.length * (rowH + 6) + 20}" role="img" aria-label="AQI each day since 2021">${yrs.map((y, i) => {
      const n = (+y % 4 ? 365 : 366); let cells = '';
      for (let d = 1; d <= n; d++) { const s = iso(Date.UTC(+y, 0, d)), v = byDate[s]; if (s > TODAY) break; cells += `<rect x="${(lab + (d - 1) * cw).toFixed(1)}" y="${i * (rowH + 6)}" width="${(cw + 0.3).toFixed(1)}" height="${rowH}" fill="${v != null ? aqCol(v) : '#F3F4F6'}"><title>${nice(s)} ${y}: ${v != null ? `AQI ${v} (${AQI_NAMES[aqiBand(v)]})` : 'no reading'}</title></rect>`; }
      return `<text x="0" y="${i * (rowH + 6) + 15}" class="ax">${y}</text>${cells}`; }).join('')}
      ${MON.map((m, i) => (narrow && i % 3 ? '' : `<text x="${lab + (doy(`2025-${String(i + 1).padStart(2, '0')}-15`) - 1) * cw}" y="${yrs.length * (rowH + 6) + 12}" text-anchor="middle" class="ax">${m}</text>`)).join('')}</svg>`;
    const mAvg = MON.map((_, m) => mean(air.filter((r) => +r[0].slice(5, 7) === m + 1).map((r) => r[2]))), order = mAvg.map((v, m) => [m, v]).sort((a, b) => b[1] - a[1]);
    return { t: `Air is worst in ${MONTH[order[0][0]]} and ${MONTH[order[1][0]]} (average AQI ${f0(order[0][1])} and ${f0(order[1][1])}) and cleanest in ${MONTH[order[11][0]]} (${f0(order[11][1])})`, w: `${yrs[0]}–${Y}`, sub: "Each day's AQI, median of the monitors in HMDA, in CPCB's categories · point at a day to read it", key: AQ_KEY + '<span><i style="background:#F3F4F6;border-radius:0"></i>No reading</span>' };
  }
  if (view === 'y') {
    const rows = yrs.map((y) => { const c = [0, 0, 0, 0, 0, 0]; airBy[y].forEach((r) => { c[aqiBand(r[2])] += 1; }); return [y, c, airBy[y].length]; });
    const full = rows.filter(([y]) => +y < Y), first = full[0], lastFull = full[full.length - 1], bad = (r) => r[1][2] + r[1][3] + r[1][4] + r[1][5];
    el.innerHTML = rows.map(([y, c, n]) => `<div class="yb"><span>${y}${+y === Y ? ` <small>to ${nice(TODAY)}</small>` : ''}<br><small>${n} days</small></span><div class="bar">${c.map((v, i) => (v ? `<i style="width:${(v / 366) * 100}%;background:${AQI_COL[i]}" title="${AQI_NAMES[i]}: ${v} days">${v >= 12 ? v : ''}</i>` : '')).join('')}</div></div>`).join('');
    return { t: `Days with Moderate or worse air fell from ${bad(first)} in ${first[0]} to ${bad(lastFull)} in ${lastFull[0]}`, w: `${yrs[0]}–${Y}`,
      sub: "Days in each CPCB category · the day's AQI, median of the monitors in HMDA · each bar is a year, 366 days wide", key: AQ_KEY, note: 'A day counts when at least three monitors have an AQI. 2021 had 5 monitors.' };
  }
  const ms = D.air_now.filter((s) => s.aqi != null).sort((a, b) => b.aqi - a.aqi), top = Math.max(200, ...ms.map((s) => s.aqi));
  if (view === 'map') stationMap(el, ms.slice().reverse().map((s) => ({ lat: s.lat, lon: s.lon, r: 8, fill: aqCol(s.aqi), stroke: 'rgba(17,24,39,.4)', tip: `<b>${shortAQ(s.name)}</b><span><i style="background:${aqCol(s.aqi)}"></i>AQI <b>${s.aqi}</b> ${AQI_NAMES[aqiBand(s.aqi)]}</span><span>Set by ${POL[s.aqi_main] || s.aqi_main}</span><span>PM2.5 ${f0(s.pm25_24h || 0)} µg/m³ (24 h)</span>` })));
  else stationList(el, ms.map((s) => ({ name: shortAQ(s.name), frac: s.aqi / top, fill: aqCol(s.aqi), right: `<b>${s.aqi}</b> ${AQI_NAMES[aqiBand(s.aqi)]} · ${POL[s.aqi_main] || s.aqi_main}` })), 'monitors');
  const w = ms[0], mains = {}; ms.forEach((s) => { mains[s.aqi_main] = (mains[s.aqi_main] || 0) + 1; }); const main = Object.entries(mains).sort((a, b) => b[1] - a[1])[0];
  return { t: `${shortAQ(w.name)} has the worst air today: AQI ${w.aqi} (${AQI_NAMES[aqiBand(w.aqi)]})`, w: whenToday,
    sub: "CPCB's National AQI for the last 24 hours · each monitor · the pollutant that sets it", key: AQ_KEY, note: `${POL[main[0]]} sets the index at ${main[1]} of ${ms.length} monitors.` };
});

// ── Wind ──
const DIRS = { N: 'north', NE: 'north-east', E: 'east', SE: 'south-east', S: 'south', SW: 'south-west', W: 'west', NW: 'north-west' };
const compass = (deg) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round((deg % 360) / 45) % 8];
const PER = { day: 'In the last 24 hours', month: `So far in ${MONTH[+TODAY.slice(5, 7) - 1]}`, since: 'Since 6 April' };
const wDaily = D.wind.daily.filter((r) => r[0] >= START);
const wMonths = {}; wDaily.forEach(([d, v]) => { (wMonths[d.slice(0, 7)] = wMonths[d.slice(0, 7)] || []).push(v); });
const windiest = Object.entries(wMonths).filter(([k]) => k < TODAY.slice(0, 7)).map(([k, v]) => [k, median(v)]).reduce((a, b) => (b[1] > a[1] ? b : a));
const wWeek = median(wDaily.filter((r) => r[0] > iso(tOf(TODAY) - 7 * DAY)).map((r) => r[1]));
const WN = D.wind_now.filter((s) => s.speed_kmh != null && Date.parse(s.time) > Date.parse(`${AS_OF}:00+05:30`) - 3 * 3600e3);
const wName = (s) => s.name.replace(/, Hyderabad - TSPCB$/, '').replace(/_/g, ' ');
figure(SEC.wind, (view, show, p) => {
  if (view === 'r') {
    const R = D.wind.rose[show], el = p.chart, W = el.clientWidth, S = Math.min(W, 420), c = S / 2, rMax = c - 34;
    const top = Math.ceil(Math.max(...R.sectors.map((s) => s[1])) / 10) * 10, r = (v) => 22 + (v / top) * (rMax - 22);
    const ang = (i) => ((i * 45 - 90) * Math.PI) / 180, pt = (a, rr) => `${(c + rr * Math.cos(a)).toFixed(1)},${(c + rr * Math.sin(a)).toFixed(1)}`;
    const rings = ticksOf(0, top, 3).slice(1).map((v) => `<circle cx="${c}" cy="${c}" r="${r(v)}" fill="none" stroke="#E5E7EB" stroke-dasharray="3 3"/><text x="${c + 3}" y="${c - r(v) - 3}" class="ax" font-size="11">${v}%</text>`).join('');
    const petals = R.sectors.map(([d, pct, kmh], i) => { const a0 = ang(i) - 0.32, a1 = ang(i) + 0.32, rr = r(pct);
      return `<path d="M${pt(a0, 22)} L${pt(a0, rr)} A${rr},${rr} 0 0 1 ${pt(a1, rr)} L${pt(a1, 22)} A22,22 0 0 0 ${pt(a0, 22)}Z" fill="${WATER}" opacity="${0.45 + 0.55 * (pct / top)}"><title>From the ${DIRS[d]}: ${pct}% of readings, median ${f1(kmh || 0)} km/h</title></path>
        <text x="${c + (rMax + 16) * Math.cos(ang(i))}" y="${c + (rMax + 16) * Math.sin(ang(i)) + 4}" text-anchor="middle" class="lbl">${d}</text>`; }).join('');
    el.innerHTML = `<div class="rose"><svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" role="img" aria-label="Wind rose">${rings}${petals}
      <circle cx="${c}" cy="${c}" r="21" fill="#fff" stroke="#D1D5DB"/><text x="${c}" y="${c + 1}" text-anchor="middle" class="lbl" font-weight="700" font-size="12">${R.calm_pct}%</text><text x="${c}" y="${c + 12}" text-anchor="middle" class="ax" font-size="9.5">calm</text></svg></div>`;
    const best = R.sectors.reduce((a, b) => (b[1] > a[1] ? b : a));
    return { t: `${PER[show]} the wind came mostly from the ${DIRS[best[0]]} (${Math.round(best[1])}% of readings)`, w: show === 'day' ? whenToday : `${Y}`,
      sub: `Share of readings by the direction the wind blows from · ${R.readings.toLocaleString('en-IN')} readings, monitors and Weather Union stations in HMDA`,
      key: `<span><i style="background:${WATER};border-radius:0"></i>Share of readings from each direction (longer = more often)</span><span><i style="background:#fff;border:1px solid #D1D5DB"></i>Calm, under 1 km/h</span>`, note: 'Point at a petal for its median speed.' };
  }
  if (view === 's') {
    sinceChart(p.chart, [{ pts: wDaily, colour: WATER, label: 'daily', name: 'Median speed', bold: true }], { fmt: (v) => `${f1(v)} km/h`, unit: '', lo: 0 });
    return { t: `The wind is lighter now than in the monsoon: ${f1(wWeek)} km/h this week, against ${f1(windiest[1])} km/h in ${MONTH[+windiest[0].slice(5) - 1]}`, w: whenSpan,
      sub: "km/h · each day's median at the air-quality monitors in HMDA", key: `<span><i class="ln" style="border-top:1.5px solid ${WATER}"></i>Daily median speed</span>${SEASON_KEY}`,
      note: 'Only the CPCB/TSPCB monitors, which have readings since February; Weather Union stations read higher.' };
  }
  const ss = WN.slice().sort((a, b) => b.speed_kmh - a.speed_kmh), top = ss[0].speed_kmh;
  if (view === 'map') {
    stationMap(p.chart, ss.map((s) => (s.from_deg != null && s.speed_kmh >= 1
      ? { lat: s.lat, lon: s.lon, fill: '#123F70', arrow: [(s.from_deg + 180) % 360, 10 + Math.min(s.speed_kmh, 15) * 2.4], tip: `<b>${wName(s)}</b><span>${f1(s.speed_kmh)} km/h from the ${DIRS[compass(s.from_deg)]}</span>` }
      : { lat: s.lat, lon: s.lon, fill: '#fff', stroke: '#123F70', r: 3.5, tip: `<b>${wName(s)}</b><span>${s.speed_kmh < 1 ? 'Calm' : `${f1(s.speed_kmh)} km/h, no direction`}</span>` })));
  } else {
    stationList(p.chart, ss.map((s) => ({ name: wName(s), sub: s.id.startsWith('oaq') ? 'monitor' : 'Weather Union', frac: s.speed_kmh / top, fill: WATER, right: `<b>${f1(s.speed_kmh)} km/h</b>${s.from_deg != null && s.speed_kmh >= 1 ? ` from ${compass(s.from_deg)}` : s.speed_kmh < 1 ? ' calm' : ''}` })));
  }
  const n = ss.filter((s) => s.speed_kmh < 1).length;
  return { t: `${n ? `${n} of ${ss.length} stations are calm; ` : ''}the strongest wind is at ${wName(ss[0])}, ${f1(ss[0].speed_kmh)} km/h`, w: whenToday,
    sub: `km/h · the newest reading at each station, last 3 hours · ${ss.length} stations (monitors and Weather Union)`,
    key: view === 'map' ? '<span><svg width="26" height="10" style="vertical-align:-1px"><line x1="1" y1="5" x2="19" y2="5" stroke="#123F70" stroke-width="1.8"/><path d="M25,5 L18,1.5 L18,8.5Z" fill="#123F70"/></svg> Where the wind blows to · longer = stronger</span><span><i style="background:#fff;border:1px solid #123F70"></i>Calm or no direction</span>' : '' };
});

// share, "More below" and the section list, as on the Reservoirs page
root.querySelectorAll('.share').forEach((b) => { b.onclick = () => { const url = 'https://hyderabad.urbanobservatory.in/live/weather/';
  if (navigator.share) navigator.share({ title: 'Hyderabad weather and air', url }).catch(() => {}); else navigator.clipboard?.writeText(url).then(() => { b.classList.add('done'); setTimeout(() => b.classList.remove('done'), 1500); }); }; });
root.addEventListener('click', (e) => { if (e.target.closest('a[href="#about"]')) { const d = document.getElementById('about'); if (d) d.open = true; } });
const pill = $('#wx-more'), next = $('#wx-more-next');
function update() { const below = [...root.querySelectorAll('.blk')].find((h) => h.getBoundingClientRect().top > innerHeight - 60);
  pill.classList.toggle('gone', !below); if (below) { next.textContent = `· ${below.textContent}`; pill.onclick = () => below.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
on('scroll', update, { passive: true }); on('resize', update); update();
const heads = [...root.querySelectorAll('.blk')], about = document.getElementById('about');
const toc = document.createElement('nav'); toc.className = 'wx-toc'; toc.setAttribute('aria-label', 'On this page');
toc.innerHTML = `<p>On this page</p>${heads.map((h) => `<a href="#${h.id}">${h.textContent}</a>`).join('')}<a href="#about">About this data</a>`;
root.appendChild(toc);
toc.onclick = (e) => { const a = e.target.closest('a'); if (!a) return; e.preventDefault(); const t = document.getElementById(a.getAttribute('href').slice(1)); if (t === about) about.open = true; t.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
function mark() { const all = [...heads, about]; let cur = all[0]; all.forEach((h) => { if (h.getBoundingClientRect().top < 140) cur = h; }); toc.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === `#${cur.id}`)); }
on('scroll', mark, { passive: true }); mark();
return () => listeners.forEach(([type, fn]) => removeEventListener(type, fn));
}
