import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import useDocumentTitle from '../../lib/useDocumentTitle';
import NotFound from '../NotFound';
import TimeChart from './TimeChart';
import DotMap from './DotMap';
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
  wind: { key: 'speed_kmh', unit: 'km/h', d: 1, ramp: BLUE.slice(1), arrow: 'from_deg',   // the palest step is too faint for an arrow
 about: 'Wind at the air-quality monitors and Weather Union stations in HMDA, last two hours. Each arrow points where the wind is going; the card shows the median speed and the speed-weighted direction.', source: 'CPCB / TSPCB via OAQ; Weather Union' },
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
  const name = page.name || ((s) => s.name);
  const stations = (detail.data?.stations || []).filter((s) => s[page.key] != null);
  const vals = stations.map((s) => s[page.key]);
  const fmt = (v) => (v == null ? '–' : `${num(v, page.d)}${page.unit && page.unit !== 'AQI' ? ` ${page.unit}` : ''}`);
  const ramp = page.colours || page.ramp;
  const steps = page.steps || (vals.length ? equalSteps(vals) : [1e9]);
  const sorted = [...stations].sort((a, b) => b[page.key] - a[page.key]);
  const unitWord = page.unit === 'AQI' ? 'AQI' : page.unit === '' ? 'bookings' : page.unit;
  const sourceLine = `Source: ${page.source} · Hyderabad Urban Observatory`;
  return (
    <main className="content-main content-main--lg live lt">
      {!card && <p className="live-note">{summary.error ? 'The live numbers could not be loaded.' : 'Loading…'}</p>}
      {card && (
        <>
          <div className="page-intro lt-intro">
            <span className="eyebrow-live"><Link to="/live">Live</Link> · HMDA</span>
            <h1>{card.title}</h1>
          </div>

          {card.trend?.points?.length > 1 && (
            <figure className="lt-fig">
              <h2 className="lt-fig-title">{trendTitle(id, card)}</h2>
              <p className="lt-fig-sub">{unitWord} · {AREA[id] || 'HMDA'} · {period(card.trend.points, !!t.monthly)}{card.trend.band_label ? ` · shaded: ${card.trend.band_label}` : ''}</p>
              <TimeChart points={card.trend.points} band={card.trend.band || []} colour={t.colour}
                mark={t.mark === 'bars' ? 'bars' : 'line'} invert={!!t.invert} monthly={!!t.monthly} minSpan={t.minSpan || 0}
                unit={page.unit === 'AQI' ? '' : page.unit} label={card.trend.label} />
              <figcaption className="lt-fig-foot">{sourceLine}</figcaption>
            </figure>
          )}

          <div className={`lt-grid${page.nomap ? ' is-nomap' : ''}`}>
            {!page.nomap && stations.length > 0 && (
              <figure className="lt-fig">
                <h2 className="lt-fig-title">{card.title} at each station</h2>
                <p className="lt-fig-sub">{unitWord} · {stations.length} stations in HMDA · {stationTime(detail.data)}</p>
                <DotMap stations={stations} value={(s) => s[page.key]} ramp={ramp} steps={steps} arrow={page.arrow}
                  format={fmt} label={`${card.title} at ${stations.length} stations`} />
                <figcaption className="lt-fig-foot">{sourceLine}</figcaption>
              </figure>
            )}
            {stations.length > 0 && (
              <figure className="lt-fig">
                <h2 className="lt-fig-title">{page.nomap ? (id === 'tankers' ? 'Bookings by section' : 'Storage by reservoir') : 'Highest to lowest'}</h2>
                <p className="lt-fig-sub">{unitWord} · {sorted.length > 30 ? `top 30 of ${sorted.length}` : `${sorted.length} ${id === 'tankers' ? 'sections' : id === 'reservoirs' ? 'reservoirs' : 'stations'}`}</p>
                <ol className="lt-list">
                  {sorted.slice(0, 30).map((s, i) => (
                    <li key={i}><span>{name(s)}</span><b>{fmt(s[page.key])}</b></li>
                  ))}
                </ol>
                <figcaption className="lt-fig-foot">{sourceLine}</figcaption>
              </figure>
            )}
          </div>

          <section className="lt-fig lt-about">
            <h2 className="lt-fig-title">About these numbers</h2>
            <p style={{ marginTop: 12 }}>{page.about}</p>
            <p className="live-note">Values as published, not checked; a station can be wrong or late.</p>
          </section>
        </>
      )}
    </main>
  );
}

// the area each trend covers
const AREA = { rain: 'HMDA average of TGDPS stations', reservoirs: 'city reservoirs (HMWSSB)', tankers: 'HMWSSB area', groundwater: 'HMDA wells' };
const MONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// "21–25 Oct 2026", "Oct 2025–Oct 2026", "Jan 2022–Sep 2026"
function period(points, monthly) {
  const a = points[0][0]; const b = points[points.length - 1][0];
  const [ya, ma, da] = a.slice(0, 10).split('-').map(Number); const [yb, mb, db] = b.slice(0, 10).split('-').map(Number);
  if (monthly || (yb - ya) * 12 + mb - ma > 2) return `${MONS[ma - 1]} ${ya}–${MONS[mb - 1]} ${yb}`;
  return ma === mb ? `${da}–${db} ${MONS[mb - 1]} ${yb}` : `${da} ${MONS[ma - 1]}–${db} ${MONS[mb - 1]} ${yb}`;
}
// when the station file was written, "25 Oct 2026, 1:00 pm"
function stationTime(data) {
  const a = data?.as_of; if (!a) return '';
  if (a.length === 7) return `${MONS[Number(a.slice(5, 7)) - 1]} ${a.slice(0, 4)}`;
  const [y, m, d] = a.slice(0, 10).split('-').map(Number);
  if (a.length === 10) return `${d} ${MONS[m - 1]} ${y}`;
  const hh = Number(a.slice(11, 13));
  return `${d} ${MONS[m - 1]} ${y}, ${hh % 12 || 12}:${a.slice(14, 16)} ${hh < 12 ? 'am' : 'pm'}`;
}

function trendTitle(id) {
  return {
    heat: 'Temperature over the last 7 days, against the normal low and high',
    humidity: 'Humidity over the last 7 days',
    heatindex: 'How hot it felt over the last 7 days',
    rain: 'Rain each day over the last 7 days',
    wind: 'Wind speed over the last 7 days',
    air: 'Fine particles (PM2.5) over the last 7 days',
    reservoirs: 'City reservoirs over the last 12 months, against the usual range',
    groundwater: 'Depth to water over the last 12 months',
    tankers: 'Tanker bookings each month',
  }[id];
}
