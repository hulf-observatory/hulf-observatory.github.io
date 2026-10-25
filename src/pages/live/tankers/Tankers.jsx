import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import useDocumentTitle from '../../../lib/useDocumentTitle';
import { useLiveJson } from '../data';
import { mount } from './charts';
import '../live.css';
import '../reservoirs/reservoirs.css';
import './tankers.css';

// /live/tankers/ — HMWSSB water tanker bookings, over time and across the city this year. The charts are drawn by
// charts.js from tankers-history.json (repo live-feed, tankers_history.py), redrawn only when a new month is in.
export default function Tankers() {
  useDocumentTitle('Water tankers · Live');
  const { data, error } = useLiveJson('tankers-history.json');
  const ref = useRef(null);
  const asOf = data?.as_of;
  useEffect(() => {
    if (!data || !ref.current) return undefined;
    return mount(ref.current, data);
  }, [asOf]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="content-main content-main--lg rv tk">
      <div className="rv-body">
        <div className="page-intro lt-intro">
          <span className="eyebrow-live"><Link to="/live">Live</Link> · HMWSSB area</span>
          <h1>Water tankers</h1>
        </div>
        {!data && <p className="live-note">{error ? 'The tanker numbers could not be loaded. Try again in a few minutes.' : 'Loading…'}</p>}
        <div ref={ref} style={{ display: 'contents' }} />
        <details className="rv-about" id="about">
          <summary>About this data</summary>
          <p>HMWSSB, the city&apos;s water board, sends water tankers to homes and buildings that book one, and publishes the
            bookings and deliveries for each of its sections every month on Open Data Telangana. The observatory collects
            each month&apos;s file when it comes out, at the end of the month. The numbers cover the whole HMWSSB service
            area, which reaches beyond the city corporations in places.</p>
          <p>Until March 2026 HMWSSB booked tankers by its own sections, about 175 of which booked in a month. From April
            2026 it books them by the 300 wards of the four corporations formed that year, and its divisions were re-drawn;
            March and April list both. The city-wide totals are comparable across the change, but places are not, so the
            map starts in April 2026. December 2022 is missing from HMWSSB&apos;s files.</p>
          <p>Sections and wards are placed on the map from TGRAC&apos;s section maps and the ward names; a few bookings a month
            are from sections that could not be placed. Last year&apos;s figures for each corporation count the old sections
            in the corporation their point falls in. Source: HMWSSB via Open Data Telangana, collected by the
            observatory.</p>
        </details>
      </div>
    </main>
  );
}
