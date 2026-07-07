import { Link, Route, Switch } from 'wouter';
import MainDemo from './components/MainDemo';
import TestingData from './components/TestingData';

function App() {
  return (
    <div className="app-container">
      <h1>WIZARD Charts Demo</h1>
      <div className="flex gap-10">
        <Link href="/">Main Demo</Link>
        <Link href="/testing-data">Testing Data</Link>
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
