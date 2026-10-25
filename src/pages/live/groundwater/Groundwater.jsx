import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import useDocumentTitle from '../../../lib/useDocumentTitle';
import { useLiveJson } from '../data';
import { mount } from './charts';
import '../live.css';
import './groundwater.css';

const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// /live/groundwater/ — depth to water at the telemetry wells in HMDA, today and over time. The charts are drawn by
// charts.js from groundwater-history.json (repo live-feed, groundwater_history.py), redrawn only when the newest
// reading moves.
export default function Groundwater() {
  useDocumentTitle('Groundwater · Live');
  const { data, error } = useLiveJson('groundwater-history.json');
  const ref = useRef(null);
  const latest = data?.latest;
  useEffect(() => {
    if (!data || !ref.current) return undefined;
    return mount(ref.current, data);
  }, [latest]); // eslint-disable-line react-hooks/exhaustive-deps

  const yrs = data?.avg_years || [];
  const m = data?.monthly;
  const mLast = m && (() => { const [y, mo] = m.start.split('-').map(Number), k = mo - 1 + m.v.length - 1; return `${MONTH[k % 12]} ${y + Math.floor(k / 12)}`; })();
  return (
    <main className="content-main content-main--lg gw">
      <div className="gw-body">
        <div className="page-intro lt-intro">
          <span className="eyebrow-live"><Link to="/live">Live</Link> · HMDA</span>
          <h1>Groundwater</h1>
        </div>
        {!data && <p className="live-note">{error ? 'The groundwater numbers could not be loaded. Try again in a few minutes.' : 'Loading…'}</p>}
        <div ref={ref} style={{ display: 'contents' }} />
        <details className="gw-about" id="about">
          <summary>About this data</summary>
          <p>The Telangana State Ground Water Department (TSGW) and the Central Ground Water Board (CGWB) run telemetry wells,
            piezometers with recorders that report the depth to water below ground every six hours, published on the
            National Water Data Portal (NWDP). {data ? `${data.hmda_wells} of them are inside HMDA; ${data.wells.length} have reported in the last 10 days. ` : ''}
            The first 17 began in 2021, 52 were reporting in 2022, 127 in 2023, and about 230 since 2024.</p>
          <p>The usual depth for a month is the median of a well&apos;s own telemetry readings in that month of earlier years, and
            an area&apos;s is the median of its wells&apos; usual depths. Averages use the telemetry wells only: TSGW&apos;s manual
            wells read about 3 m shallower and would overstate the drop.{yrs.length ? ` For the wells reporting now they cover ${yrs[0]}${yrs.length > 1 ? `–${yrs[yrs.length - 1]}` : ''}; the wells that began in 2021 stopped reporting in early 2025.` : ''}</p>
          <p>Wells whose readings cannot be right are left out of every chart and number on this page: water deeper than 60 m,
            or a change of more than 20 m in a year. Wells are grouped by the four corporations formed in 2026 (GHMC,
            Cyberabad, Malkajgiri and Secunderabad Cantonment Board) and the rest of HMDA.</p>
          <p>The long view since 2007 uses TSGW&apos;s monthly wells inside HMDA, measured by hand{data ? ` (${data.manual_wells} wells over the years)` : ''};
            {mLast ? ` the newest readings are for ${mLast}.` : ''} Source: TSGW and CGWB via NWDP, and TSGW&apos;s monthly
            readings, collected by the observatory.</p>
        </details>
      </div>
    </main>
  );
}
