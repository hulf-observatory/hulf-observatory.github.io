import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useDocumentTitle from '../../../lib/useDocumentTitle';
import { useLiveJson } from '../data';
import { mount } from './charts';
import '../live.css';
import './weather.css';

// /live/weather/ — temperature, heat index, humidity, rain, air quality and wind in HMDA, one figure each. The charts
// are drawn by charts.js from weather-history.json (repo live-feed, weather_history.py, rebuilt when a new TGDPS hour
// is in) with the monitors and wind stations now from air.json and wind.json; redrawn when the TGDPS hour moves.
// Replaces the Weather Dashboard (weather.hyderabad.urbanobservatory.in) and the six cards' own full views.
export default function Weather() {
  useDocumentTitle('Weather and air · Live');
  const wx = useLiveJson('weather-history.json');
  const air = useLiveJson('air.json');
  const wind = useLiveJson('wind.json');
  const ref = useRef(null);
  const { hash } = useLocation();
  const ready = wx.data && air.data && wind.data;
  const asOf = wx.data?.as_of;
  useEffect(() => {
    if (!ready || !ref.current) return undefined;
    const stop = mount(ref.current, { ...wx.data, air_now: air.data.stations, wind_now: wind.data.stations });
    // a card's Explore link opens its section (/live/weather#s-rain)
    const target = hash && document.getElementById(hash.slice(1));
    if (target) target.scrollIntoView({ block: 'start' });
    return stop;
  }, [asOf, !!ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const error = wx.error || air.error || wind.error;
  return (
    <main className="content-main content-main--lg wx">
      <div className="wx-body">
        <div className="page-intro lt-intro">
          <span className="eyebrow-live"><Link to="/live">Live</Link> · HMDA</span>
          <h1>Weather and air</h1>
        </div>
        {!ready && <p className="live-note">{error ? 'The weather numbers could not be loaded. Try again in a few minutes.' : 'Loading…'}</p>}
        <div ref={ref} style={{ display: 'contents' }} />
        <details className="wx-about" id="about">
          <summary>About this data</summary>
          <p>Temperature, heat index, humidity and rain come from the Telangana Development Planning Society&apos;s (TGDPS)
            automatic weather stations, about 240 of them inside HMDA, which report every hour. The observatory has collected
            them since 23 February 2026; there are no readings from 19 October 16:00 to 21 October. Each figure is the middle
            value (median) of the stations for that hour or day, except rain, which is the average of the station totals, and
            the corporation lines, which are the average of each corporation&apos;s stations. A rain day runs from 08:30 to
            08:30, as TGDPS counts it. Corporations are those formed in 2026 (GHMC, Cyberabad, Malkajgiri and Secunderabad
            Cantonment Board), and the rest of HMDA.</p>
          <p>Some readings are left out. During TGDPS outages every station reports 0 °C and over 90% humidity for hours (31
            July, 9 August, 4 September); readings at or below 2 °C are dropped. A station&apos;s rain day over 50 mm is
            dropped when none of its five nearest stations had a fifth of it: a faulty gauge, not a storm (15 station-days
            since February).</p>
          <p>Normals are IMD&apos;s 1991–2020 averages for its Begumpet observatory. The heat index is the US National Weather
            Service&apos;s feels-like temperature, banded as in IMD&apos;s experimental heat index, whose colours carry IMD&apos;s
            warning levels: no warning up to 35 °C, be aware 36–45, be prepared 46–55, take action above 55. A hot day has a
            high of 40 °C or more, a warm night a low of 25 °C or more, and a comfortable day a heat index under 35 °C all day.</p>
          <p>Air quality and wind come from the 14 CPCB and TSPCB monitors in HMDA (5 since 2021, the rest since 2022), through
            the OAQ platform, and wind also from Weather Union&apos;s 30 stations (since April 2026). The AQI is CPCB&apos;s
            National Air Quality Index: for each monitor the highest sub-index of at least three pollutants, one of them PM10
            or PM2.5, from 24-hour means (CO and ozone: the highest 8-hour mean). Most of January and February 2026 is missing
            from the monitors&apos; record. Their wind sensors changed over the years, so wind speed is not compared with
            earlier years.</p>
        </details>
      </div>
    </main>
  );
}
