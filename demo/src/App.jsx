import { Link, Route, Switch, useLocation } from 'wouter';
import MainDemo from './components/MainDemo';
import TestingData from './components/TestingData';

function App() {
  const [location] = useLocation();

  return (
    <div className="app-container">
      <div className="flex gap-20">
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
          href="/testing-data"
          className={`nav-link ${location === '/testing-data' ? 'active' : ''}`}
          aria-current={location === '/testing-data' ? 'page' : undefined}
        >
          Testing Data
        </Link>
      </div>

      <Switch>
        <Route path="/" component={MainDemo} />
        <Route path="/testing-data" component={TestingData} />
        <Route>404: Page not found</Route>
      </Switch>
    </div>
  );
}

export default App;
