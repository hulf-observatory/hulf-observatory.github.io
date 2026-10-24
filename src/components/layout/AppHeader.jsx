import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';
import { MAPS_URL, DATA_URL, TOOLS_URL, STORIES_URL } from '../../lib/links';

// Slim header shared by the Observatory's pages (visual standard, 24 Oct 2026): a white bar with a hairline
// under it. On the home page Layers, Tools and Stories are the big buttons, so the bar lists only Data sources and About.
export default function AppHeader() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const [open, setOpen] = useState(false);
  const burgerRef = useRef(null);
  const menuRef = useRef(null);

  // the menu is a one-shot: it closes when the route changes, on Escape (focus goes back
  // to the burger) and on any pointer down outside the burger and the menu card
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); burgerRef.current?.focus(); } };
    const onDown = (e) => {
      if (burgerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [open]);

  const links = (
    <>
      {!isHome && <a href={MAPS_URL + '/'} rel="noopener">Layers</a>}
      {!isHome && <a href={TOOLS_URL} rel="noopener">Tools</a>}
      {!isHome && <a href={STORIES_URL} rel="noopener">Stories</a>}
      <a href={DATA_URL} rel="noopener">Data sources</a>
      <Link to="/about" aria-current={pathname === '/about' ? 'page' : undefined}>About</Link>
    </>
  );

  return (
    <header className={`obs-header${isHome ? ' is-home' : ''}`}>
      <Link to="/" className="obs-brand" aria-label="Hyderabad Urban Observatory, home">
        <span className="obs-logo"><Logo /></span><span className="obs-word">Hyderabad Urban Observatory</span>
      </Link>
      <nav className="obs-nav" aria-label="Observatory">{links}</nav>
      <button type="button" ref={burgerRef} className="obs-burger" aria-label="Menu" aria-expanded={open}
        aria-controls="obs-menu" onClick={() => setOpen((o) => !o)}><span /></button>
      {open && <nav className="obs-menu" id="obs-menu" ref={menuRef} aria-label="Observatory">{links}</nav>}
    </header>
  );
}
