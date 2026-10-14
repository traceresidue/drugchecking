import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppSidebar } from './components/AppSidebar';
import { DataProvider, useData } from './context/DataContext';
import { HomePage } from './pages/HomePage';
import { getVizEntry } from './registry';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

const PAGES: Record<string, React.LazyExoticComponent<() => JSX.Element>> = {
  '01-mirror-match': lazy(() => import('./pages/01-mirror-match/MirrorMatchPage')),
  '02-chromatogram-explorer': lazy(() => import('./pages/02-chromatogram-explorer/ChromatogramExplorerPage')),
  '03-ftir-overlay': lazy(() => import('./pages/03-ftir-overlay/FtirOverlayPage')),
  '05-chromatogram-3d': lazy(() => import('./pages/05-chromatogram-3d/Chromatogram3dPage')),
  '06-spectral-ridgeline': lazy(() => import('./pages/06-spectral-ridgeline/RidgelinePage')),
  '07-ftir-waterfall': lazy(() => import('./pages/07-ftir-waterfall/FtirWaterfallPage')),
  '09-sonification': lazy(() => import('./pages/09-sonification/SonificationPage')),
  '11-supply-streamgraph': lazy(() => import('./pages/11-supply-streamgraph/StreamgraphPage')),
  '12-cooccurrence-chord': lazy(() => import('./pages/12-cooccurrence-chord/CooccurrencePage')),
  '13-expected-detected-sankey': lazy(() => import('./pages/13-expected-detected-sankey/SankeyPage')),
  '14-horizon-wall': lazy(() => import('./pages/14-horizon-wall/HorizonWallPage')),
  '15-emergence-beeswarm': lazy(() => import('./pages/15-emergence-beeswarm/BeeswarmPage')),
  '16-supply-terrain-3d': lazy(() => import('./pages/16-supply-terrain-3d/Terrain3dPage')),
  '17-adulterant-network': lazy(() => import('./pages/17-adulterant-network/NetworkPage')),
  '18-result-card': lazy(() => import('./pages/18-result-card/ResultCardPage')),
  '19-expected-reality-gap': lazy(() => import('./pages/19-expected-reality-gap/GapPage')),
  '21-geo-tilegrid': lazy(() => import('./pages/21-geo-tilegrid/TilegridPage')),
  '22-xylazine-spread': lazy(() => import('./pages/22-xylazine-spread/XylazinePage')),
  '24-anatomy-scrolly': lazy(() => import('./pages/24-anatomy-scrolly/ScrollyPage')),
  'chromatogram-sample-3d': lazy(() => import('./pages/chromatogram-sample-3d/Sample3dPage')),
};

function VizRoute() {
  const { id } = useParams<{ id: string }>();
  const entry = id ? getVizEntry(id) : undefined;
  const Page = id ? PAGES[id] : undefined;

  if (!id || !entry || !Page) return <Navigate to="/" replace />;

  return (
    <Suspense fallback={<div className="loader-screen">Loading visualization…</div>}>
      <Page />
    </Suspense>
  );
}

function AppBody() {
  const { loading } = useData();
  const [navOpen, setNavOpen] = useState(true);

  if (loading) {
    return <div className="loader-screen">Loading datasets…</div>;
  }

  return (
    <div className="app-shell">
      <AppSidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="app-main">
        <header className="app-header">
          <button
            type="button"
            className="app-header-menu"
            aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
            onClick={() => setNavOpen((v) => !v)}
          >
            ☰
          </button>
        </header>
        <div className="app-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/viz/:id" element={<VizRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <AppBody />
    </DataProvider>
  );
}
