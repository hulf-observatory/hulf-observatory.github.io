import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import AppHeader from './components/layout/AppHeader';
import AppFooter from './components/layout/AppFooter';
import TerrainHero from './components/layout/TerrainHero';
import Home from './pages/Home';
import About from './pages/About';
import Disclaimer from './pages/Disclaimer';
import ExternalRedirect from './components/ui/ExternalRedirect';
import { MAPS_URL, DATA_URL, TOOLS_URL, STORIES_URL } from './lib/links';
import NotFound from './pages/NotFound';
import Live from './pages/live/Live';
import LiveTheme from './pages/live/LiveTheme';

const draftTheme = {
  token: {
    colorPrimary: '#111827',
    colorBgBase: '#FFFFFF',
    colorTextBase: '#111827',
    colorBorder: '#E5E7EB',
    colorBorderSecondary: '#E5E7EB',
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',
    colorBgLayout: '#FFFFFF',
    colorTextSecondary: '#374151',
    colorTextTertiary: '#6B7280',
    colorTextPlaceholder: '#9CA3AF',
    fontFamily: '"Lato", "Helvetica Neue", Arial, sans-serif',
    fontWeightStrong: 700,
    borderRadius: 4,
    borderRadiusLG: 4,
    borderRadiusSM: 4,
    borderRadiusXS: 4,
    boxShadow: 'none',
    boxShadowSecondary: 'none',
    lineWidth: 1,
    wireframe: false,
  },
  components: {
    Button: {
      colorPrimary: '#111827',
      colorPrimaryHover: '#374151',
      colorBgContainer: '#FFFFFF',
      colorText: '#111827',
      paddingContentHorizontal: 14,
    },
    Card: {
      colorBorderSecondary: '#E5E7EB',
      boxShadowTertiary: 'none',
    },
    Select: {
      colorBorder: '#E5E7EB',
      optionSelectedBg: '#F3F4F6',
    },
  },
};

export default function App() {
  const { pathname } = useLocation();
  return (
    <ConfigProvider theme={draftTheme}>
      <div className={`app-shell${pathname === '/' ? ' is-home' : ''}`}>
        {pathname === '/' && <TerrainHero />}
        <AppHeader />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          <Route path="/live" element={<Live />} />
          <Route path="/live/:id" element={<LiveTheme />} />
          {/* the in-site Data Observatory page is retired; "Data sources" is the open-data site */}
          <Route path="/explore/data-observatory" element={<ExternalRedirect to={DATA_URL} />} />
          {/* the old spatial data portal is retired; old links go to the map viewer */}
          <Route path="/explore/spatial-data-portal" element={<ExternalRedirect to={MAPS_URL + '/'} />} />
          {/* Thematic Areas and the stories moved to their own sites (tools., stories.) */}
          <Route path="/explore/thematic-areas" element={<ExternalRedirect to={TOOLS_URL} />} />
          <Route path="/stories/hyderabad-waterscapes" element={<ExternalRedirect to={STORIES_URL + 'hyderabad-waterscapes'} />} />
          <Route path="/stories/ghmc-wards-census" element={<ExternalRedirect to={STORIES_URL + 'ghmc-wards-census'} />} />
          <Route path="/stories/kgf-change-analysis" element={<ExternalRedirect to={STORIES_URL + 'kgf-change-analysis'} />} />
          {/* anything else: Pages serves 404.html (a copy of index.html), so the router lands here */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <AppFooter />
      </div>
    </ConfigProvider>
  );
}
