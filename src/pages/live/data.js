import { useEffect, useState } from 'react';
import { LIVE_API } from '../../lib/links';

// The feed is rewritten every 15 minutes on the server; the page asks again every 5.
const REFRESH_MS = 5 * 60 * 1000;

export function useLiveJson(name) {
  const [state, setState] = useState({ data: null, error: null });
  useEffect(() => {
    let alive = true;
    const load = () => fetch(`${LIVE_API}/${name}`, { cache: 'no-cache' })
      .then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then((data) => alive && setState({ data, error: null }))
      .catch((error) => alive && setState((s) => ({ data: s.data, error })));
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(id); };
  }, [name]);
  return state;
}

// the cards whose Explore opens a section of the Weather and air page (/live/weather#s-…)
export const WEATHER_SECTION = { heat: 's-temp', heatindex: 's-hi', humidity: 's-rh', rain: 's-rain', air: 's-air', wind: 's-wind' };
export const exploreLink = (id) => (WEATHER_SECTION[id] ? `/live/weather#${WEATHER_SECTION[id]}` : `/live/${id}`);

// one colour per card, from the data palette (DESIGN-SYSTEM §2); the interface stays ink and grey
export const THEMES = {
  rain: { colour: '#3F76B0', mark: 'bars', minSpan: 10, span: '7 days' },
  heat: { colour: '#D3612A', mark: 'line', span: '7 days', bandLabel: 'normal' },
  air: { colour: '#8462AC', mark: 'line', span: '7 days' },
  humidity: { colour: '#3F76B0' },
  heatindex: { colour: '#D3612A' },
  wind: { colour: '#3F76B0', mark: 'line', span: '7 days' },
  groundwater: { colour: '#3F76B0', mark: 'line', invert: true, span: '12 months' },   // all water cards one blue (Teja, 25 Oct)
  reservoirs: { colour: '#3F76B0', mark: 'line', span: '12 months', bandLabel: 'usual range' },
  tankers: { colour: '#3F76B0', mark: 'bars', monthly: true, span: 'per month' },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const fmtDay = (iso) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}${y !== new Date().getFullYear() ? ` ${y}` : ''}`;
};

export const fmtMonth = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1]} ${y}`;
};

// "08:03" for a reading from today, "22 Oct" for an older one
export const fmtWhen = (iso) => {
  if (!iso) return '';
  if (iso.length === 7) return `${MONTHS[Number(iso.slice(5)) - 1]} ${iso.slice(0, 4)}`; // a monthly series: "Sep 2026"
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return iso.slice(0, 10) === today && iso.length > 10 ? iso.slice(11, 16) : fmtDay(iso);
};

export const num = (v, digits = 1) => (v == null ? '–' : Number(v).toLocaleString('en-IN', {
  minimumFractionDigits: digits, maximumFractionDigits: digits,
}));
