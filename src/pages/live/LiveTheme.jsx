import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import useDocumentTitle from '../../lib/useDocumentTitle';
import NotFound from '../NotFound';
import TimeChart from './TimeChart';
import DotMap from './DotMap';
import { describe, updated } from './Live';
import { useLiveJson, THEMES, num } from './data';
import './live.css';

// /live/<card>/ — one card in full: the headline and graphic, the trend, the stations on a map and in a list, and how
// the numbers are made. Station files and trends come from the live feed (repo live-feed, summary.py).
const BLUE = ['#E4EDF6', '#B7CDE4', '#7FA6CE', '#3F76B0', '#123F70'];
const ORANGE = ['#FCEBD9', '#F7C694', '#EE9550', '#D3612A', '#8F3212'];

const PAGES = {
  heat: { key: 'temp_c', unit: '°C', d: 1, ramp: ORANGE, about: 'Air temperature at the TGDPS automatic weather stations in HMDA, newest hourly reading; the card shows their median. The normal band is IMD Begumpet\'s normal low and high for the date (IMD\'s daily normal where published, otherwise its 1991–2020 monthly normals).', source: 'TGDPS; IMD' },
  humidity: { key: 'rh_pct', unit: '%', d: 0, ramp: BLUE, about: 'Relative humidity at the TGDPS automatic weather stations in HMDA, newest hourly reading; the card shows their median.', source: 'TGDPS' },
  heatindex: { key: 'heat_index_c', unit: '°C', d: 1, ramp: ORANGE, about: 'How hot it feels, from each station\'s temperature and humidity (the US National Weather Service heat index formula), banded on IMD\'s experimental heat index: Green up to 35 °C, Yellow 36–45, Orange 46–55, Red above 55.', source: 'TGDPS; formula: US NWS; bands: IMD', steps: [35, 45, 55, 1e9], colours: ['#00B050', '#FFFF00', '#FF9900', '#FF0000'] },
  air: { key: 'aqi', unit: 'AQI', d: 0, about: 'CPCB\'s National Air Quality Index at the 14 CPCB and TSPCB continuous monitors in HMDA: the highest sub-index of at least three pollutants (one of them PM10 or PM2.5), from 24-hour means (8-hour peaks for CO and ozone). The card shows the median of the stations.', source: 'CPCB / TSPCB via OAQ', steps: [50, 100, 200, 300, 400, 1e9], colours: ['#00B050', '#92D050', '#FFFF00', '#FF9900', '#FF0000', '#C00000'] },
  wind: { key: 'speed_kmh', unit: 'km/h', d: 1, ramp: ['#9DBBDB', '#7FA6CE', '#5B8DC0', '#3F76B0', '#123F70'], arrow: 'from_deg', about: 'Wind at the air-quality monitors and Weather Union stations in HMDA, last two hours. Each arrow points where the wind is going; the card shows the median speed and the speed-weighted direction.', source: 'CPCB / TSPCB via OAQ; Weather Union' },
  rain: { key: 'rain_mm', unit: 'mm', d: 1, ramp: BLUE, about: 'The card\'s season total is IMD\'s district rainfall for the seven HMDA districts, averaged by each district\'s area inside HMDA. The map and list show today\'s rain day (from 08:30) at the TGDPS stations.', source: 'IMD Hydromet (district rainfall); TGDPS' },
  groundwater: { key: 'depth_m', unit: 'm', d: 1, ramp: BLUE, about: 'Depth to water below ground at the Telangana Ground Water Department and CGWB telemetry wells in HMDA (six-hourly, via the National Water Data Portal). The card compares the same wells with the same date last year.', source: 'Telangana Ground Water Dept; CGWB (NWDP)' },
  reservoirs: { key: 'pct_full', unit: '%', d: 0, nomap: true, about: 'Storage in the reservoirs that supply Hyderabad, from HMWSSB\'s daily report; the card is HMWSSB\'s total of the five city reservoirs. The usual range is the middle half of the same date in 2014 to last year.', source: 'HMWSSB' },
  tankers: { key: 'bookings', unit: '', d: 0, nomap: true, name: (s) => `${s.section} (division ${s.division})`, about: 'Water tanker bookings by HMWSSB section for the latest month, from HMWSSB\'s monthly files on Open Data Telangana.', source: 'HMWSSB via Open Data Telangana' },
};

// five equal steps between the lowest and highest value, on round numbers
function equalSteps(vals) {
  const lo = Math.min(...vals); const hi = Math.max(...vals);
  const step = (hi - lo) / 5 || 1;
  return [1, 2, 3, 4].map((k) => +(lo + step * k).toPrecision(2)).concat([1e9]);
}

export default function LiveTheme() {
  const { id } = useParams();
  const page = PAGES[id];
  const summary = useLiveJson('summary.json');
  const detail = useLiveJson(`${id}.json`);
  const card = summary.data?.cards.find((c) => c.id === id);
  useDocumentTitle(card ? `${card.title} · Live` : 'Live');
  useEffect(() => { document.body.classList.add('is-live'); return () => document.body.classList.remove('is-live'); }, []);
  if (!page) return <NotFound />;
  const t = THEMES[id] || { colour: '#3F76B0' };
  const d = card ? describe(card) : null;
  const name = page.name || ((s) => s.name);
  const stations = (detail.data?.stations || []).filter((s) => s[page.key] != null);
  const vals = stations.map((s) => s[page.key]);
  const fmt = (v) => (v == null ? '–' : `${num(v, page.d)}${page.unit && page.unit !== 'AQI' ? ` ${page.unit}` : ''}`);
  const ramp = page.colours || page.ramp;
  const steps = page.steps || (vals.length ? equalSteps(vals) : [1e9]);
  const sorted = [...stations].sort((a, b) => b[page.key] - a[page.key]);
  return (
    <main className="content-main content-main--lg live lt">
      <Link to="/live" className="lt-back">← Live</Link>
      {!card && <p className="live-note">{summary.error ? 'The live numbers could not be loaded.' : 'Loading…'}</p>}
      {card && d && (
        <>
          <section className="live-card lt-head">
            <div className="live-card-text">
              <h1 className="live-eyebrow">{card.title}</h1>
              <div className="live-value">{d.value}{d.unit && <span className="live-unit">{d.unit}</span>}</div>
              <p className="live-line">{d.line}</p>
              {d.compare && <p className="live-compare">{d.compare}</p>}
              {!d.noDate && <p className="live-updated">{updated(d.asOf || card.as_of)}</p>}
            </div>
            <div className="live-card-graphic">{d.graphic && d.graphic(t.colour, d.compare || d.line)}</div>
          </section>

          {card.trend?.points?.length > 1 && (
            <section className="lt-block">
              <h2 className="lt-h2">{trendTitle(id, card)}</h2>
              <TimeChart points={card.trend.points} band={card.trend.band || []} colour={t.colour}
                mark={t.mark === 'bars' ? 'bars' : 'line'} invert={!!t.invert} monthly={!!t.monthly} minSpan={t.minSpan || 0} unit={page.unit === 'AQI' ? '' : page.unit}
                label={card.trend.label} />
              <p className="lt-note">{card.trend.label}{card.trend.band_label ? ` · shaded: ${card.trend.band_label}` : ''}</p>
            </section>
          )}

          <div className={`lt-grid${page.nomap ? ' is-nomap' : ''}`}>
            {!page.nomap && stations.length > 0 && (
              <section className="lt-block">
                <h2 className="lt-h2">Stations now</h2>
                <DotMap stations={stations} value={(s) => s[page.key]} ramp={ramp} steps={steps} arrow={page.arrow}
                  format={fmt} label={`${card.title} at ${stations.length} stations`} />
              </section>
            )}
            {stations.length > 0 && (
              <section className="lt-block">
                <h2 className="lt-h2">{page.nomap ? (id === 'tankers' ? 'By section' : 'By reservoir') : 'Highest to lowest'}</h2>
                <ol className="lt-list">
                  {sorted.slice(0, 30).map((s, i) => (
                    <li key={i}><span>{name(s)}</span><b>{fmt(s[page.key])}</b></li>
                  ))}
                </ol>
                {sorted.length > 30 && <p className="lt-note">Top 30 of {sorted.length}.</p>}
              </section>
            )}
          </div>

          <section className="lt-block lt-about">
            <h2 className="lt-h2">About these numbers</h2>
            <p>{page.about}</p>
            <p className="lt-note">Source: {page.source}. Values as published, not checked; a station can be wrong or late.</p>
          </section>
        </>
      )}
    </main>
  );
}

function trendTitle(id, card) {
  if (id === 'tankers') return 'Bookings per month';
  if (id === 'reservoirs') return 'City reservoirs, % full, last 12 months';
  if (id === 'groundwater') return 'Median depth to water, last 12 months';
  if (id === 'rain') return 'Daily rain, HMDA average of TGDPS stations';
  if (id === 'air') return 'PM2.5, hourly median, last 7 days';
  return `${card.title}, last 7 days`;
}
