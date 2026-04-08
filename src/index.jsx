import * as React from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import './global.css';

import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";

import { getInfo, url } from './lib/ledger';
import useTheme from './lib/useTheme';

import Navbar from './parts/Navbar.jsx';
import Home from './pages/Home.jsx';
import Transactions from './pages/Transactions.jsx';
import Accounts from './pages/Accounts.jsx';
import Account from './pages/Account.jsx';
import Create from './pages/Create.jsx';
import TransactionGraph from './pages/TransactionGraph.jsx';
import Analytics from './pages/Analytics.jsx';
import ScrollToTop from './parts/Scroll.jsx';

const Wrapper = styled.div`
  min-height: 100vh;
  background: var(--bg);
  color: var(--text-1);
  font-family: var(--font-ui, 'Inter', system-ui, sans-serif);
  transition: background 0.25s, color 0.25s;

  a { text-decoration: none; color: inherit; }
  button { font-family: inherit; cursor: pointer; }
`;

const ErrorPanel = styled.div`
  max-width: 480px;
  margin: 80px auto;
  padding: 32px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  text-align: center;

  h1 { font-size: 18px; font-weight: 600; margin-bottom: 8px; color: var(--text-1); }
  p  { font-size: 13px; color: var(--text-3); font-family: 'Roboto Mono', monospace; }
`;

function AppInner() {
  const { theme, toggle } = useTheme();
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    getInfo()
      .then(() => setReady(true))
      .catch(() => { setReady(true); setError(true); });
  }, []);

  if (!ready) return null;

  if (error) {
    return (
      <Wrapper>
        <ErrorPanel>
          <h1>Cannot connect to ledger</h1>
          <p>{url()}</p>
        </ErrorPanel>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <Router>
        <ScrollToTop />
        <Navbar theme={theme} onToggleTheme={toggle} />
        <Switch>
          <Route path="/accounts/:id" exact><Account /></Route>
          <Route path="/accounts"     exact><Accounts /></Route>
          <Route path="/transactions" exact><Transactions /></Route>
          <Route path="/graph"        exact><TransactionGraph /></Route>
          <Route path="/analytics"    exact><Analytics /></Route>
          <Route path="/new"          exact><Create /></Route>
          <Route path="/"><Home /></Route>
        </Switch>
      </Router>
    </Wrapper>
  );
}

const container = document.querySelector('#app');
ReactDOM.render(React.createElement(AppInner), container);
