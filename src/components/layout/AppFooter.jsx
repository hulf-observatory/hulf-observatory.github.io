import { Link, useLocation } from 'react-router-dom';

// Footer bar shared by the Observatory's pages (visual standard, 24 Oct 2026): the feedback line and the
// data licence, with Disclaimer at the right. The site links live in the header only. The home page adds
// the terrain credit.
export default function AppFooter() {
  const pathname = useLocation().pathname.replace(/(.)\/$/, '$1'); // /disclaimer/ as /disclaimer
  const isHome = pathname === '/';

  return (
    <footer className={`obs-footer${isHome ? ' is-home' : ''}`}>
      <div className="obs-footer-fine">
        <span>
          This website is under continuous development; you may find errors or incomplete content.
          Feedback: <a href="mailto:hulf.observatory@gmail.com">hulf.observatory@gmail.com</a>
          <span className="obs-footer-sep"> · </span>
          {isHome
            ? 'Terrain: FABDEM 30 m · HMDA region · heights 22× · GHMC in slate, lakes in blue.'
            : "Processing and metadata CC BY 4.0; each layer keeps its source's licence."}
        </span>
        {pathname !== '/disclaimer' && <Link className="obs-footer-disclaimer" to="/disclaimer">Disclaimer</Link>}
      </div>
    </footer>
  );
}
