import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import useDocumentTitle from '../../../lib/useDocumentTitle';
import { useLiveJson } from '../data';
import { mount } from './charts';
import '../live.css';
import './reservoirs.css';

// /live/reservoirs/ — storage, withdrawal and inflow for the reservoirs that supply Hyderabad. The charts are drawn by
// charts.js from reservoirs-history.json (repo live-feed, reservoirs_history.py), redrawn only when HMWSSB's date moves.
export default function Reservoirs() {
  useDocumentTitle('Reservoirs · Live');
  const { data, error } = useLiveJson('reservoirs-history.json');
  const ref = useRef(null);
  const asOf = data?.as_of;
  useEffect(() => {
    if (!data || !ref.current) return undefined;
    return mount(ref.current, data);
  }, [asOf]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="content-main content-main--lg rv">
      <div className="rv-body">
        <div className="page-intro lt-intro">
          <span className="eyebrow-live"><Link to="/live">Live</Link> · HMDA</span>
          <h1>Reservoirs</h1>
        </div>
        {!data && <p className="live-note">{error ? 'The reservoir numbers could not be loaded. Try again in a few minutes.' : 'Loading…'}</p>}
        <div ref={ref} style={{ display: 'contents' }} />
        <details className="rv-about" id="about">
          <summary>About this data</summary>
          <p>HMWSSB, the city&apos;s water board, publishes the level, storage, withdrawal and inflow of each reservoir every day. The
            five city reservoirs are Osman Sagar and Himayat Sagar on the Musi, Singur and Manjira on the Manjira, and Akkampally,
            which holds Krishna water brought from Nagarjuna Sagar. Yellampally on the Godavari has supplied the city since
            December 2015; HMWSSB counts its withdrawal in the city total but not its storage.</p>
          <p>The table has known faults, and the page leaves those days out: from 2014 to 2018 the withdrawal for the 21st to the
            end of each month is in another unit; November and December 2022 are incomplete; and a few single days are typing
            errors (one-day jumps in storage, lone spikes in inflow, a withdrawal figure in the inflow column). Before April 2017
            the table repeats one withdrawal figure for each month, and inflow for 2014 is not reported.</p>
          <p>Averages are of the same month in 2014 to last year. Source: HMWSSB daily reservoir levels, collected every morning by
            the observatory.</p>
        </details>
      </div>
    </main>
  );
}
