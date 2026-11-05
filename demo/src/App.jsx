import { Link, Route, Switch, useLocation } from 'wouter';
import MainDemo from './components/MainDemo';
import TestingPlayground from './components/TestingPlayground';
import ReadoutDemo from './components/ReadoutDemo';
import Cdf from './components/Cdf';

function App() {
  const [location] = useLocation();

  return (
    <div className="app-container">
      <div className="flex gap-20" style={{ flexWrap: 'wrap' }}>
        <h1>WIZARD Charts Demo</h1>
        <span style={{ borderLeft: '2px solid #737373', height: '30px' }} />
        <Link
          href="/"
          className={`nav-link ${location === '/' ? 'active' : ''}`}
          aria-current={location === '/' ? 'page' : undefined}
        >
          Main Demo
        </Link>
        <Link
          href="/testing-playground"
          className={`nav-link ${location === '/testing-playground' ? 'active' : ''}`}
          aria-current={location === '/testing-playground' ? 'page' : undefined}
        >
          Testing Playground
        </Link>
        <Link
          href="/readouts"
          className={`nav-link ${location === '/readouts' ? 'active' : ''}`}
        >
          Readouts
        </Link>
        <Link
          href="/cdf"
          className={`nav-link ${location === '/cdf' ? 'active' : ''}`}
          aria-current={location === '/cdf' ? 'page' : undefined}
        >
          CDF
        </Link>
      </div>

      <Switch>
        <Route path="/" component={MainDemo} />
        <Route path="/testing-playground" component={TestingPlayground} />
        <Route path="/readouts" component={ReadoutDemo} />
        <Route path="/cdf" component={Cdf} />
        <Route>404: Page not found</Route>
      </Switch>
    </div>
  );
}

export default App;
