import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MAPS_URL, TOOLS_URL, STORIES_URL } from '../lib/links';
import useDocumentTitle from '../lib/useDocumentTitle';

// the map viewer, the tools and the stories are each their own site; Live is a page of this one
const ACTIONS = [
  { label: 'Layers', href: MAPS_URL + '/' },
  { label: 'Tools', href: TOOLS_URL },
  { label: 'Stories', href: STORIES_URL },
];

const ArrowIcon = () => (
  <svg className="home-action-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="1.5" d="M5 19L19 5M19 5H5M19 5V19" />
  </svg>
);

export default function Home() {
  useDocumentTitle();
  // a click or tap on the terrain itself nudges the eye to the three buttons
  const [hint, setHint] = useState(false);
  const timer = useRef(0);
  useEffect(() => {
    const onDown = (e) => {
      if (e.target.closest && e.target.closest('a, button, nav')) return;
      setHint(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setHint(false), 2200);
    };
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      clearTimeout(timer.current);
    };
  }, []);

  return (
    <main className="home-main">
      {hint && <p className="home-hint">Dive deeper — explore the city's layers, tools and stories</p>}
      <div className={`home-actions${hint ? ' is-hint' : ''}`}>
        <Link to="/live" className="home-action home-action--live"><i className="obs-live-dot" aria-hidden="true" />Live<ArrowIcon /></Link>
        {ACTIONS.map(({ label, href }) => (
          <a key={label} href={href} rel="noopener" className="home-action">
            {label}
            <ArrowIcon />
          </a>
        ))}
      </div>
      <p className="home-credit">
        Terrain: FABDEM 30 m · HMDA region · heights 22× · GHMC in slate, lakes in blue
      </p>
    </main>
  );
}
