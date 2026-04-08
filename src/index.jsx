import * as React from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import './global.css';

import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";

import {getInfo, url} from './lib/ledger';

import Navbar from './parts/Navbar.jsx';
import Home from './pages/Home.jsx';
import Transactions from './pages/Transactions.jsx';
import Accounts from './pages/Accounts.jsx';
import Account from './pages/Account.jsx';
import Create from './pages/Create.jsx';
import TransactionGraph from './pages/TransactionGraph.jsx';
import Analytics from './pages/Analytics.jsx';
import ScrollToTop from './parts/Scroll.jsx';
import Panel from './parts/Panel.jsx';

const Wrapper = styled.div`
  min-height: 100vh;
  background: var(--bg);
  color: var(--text-1);
  font-family: var(--font-ui);

  a { text-decoration: none; color: inherit; }

  button {
    font-family: var(--font-ui);
    cursor: pointer;
  }
`;

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      ready: false,
      error: false,
      info: {},
    };
  }

  componentWillMount() {
    getInfo()
    .then(() => {
      this.setState({
        ready: true,
      });
    })
    .catch(e => {
      this.setState({
        ready: true,
        error: true,
      });
    });
  }

  render() {
    if (this.state.error) {
      return (
        <Wrapper>
          <Panel>
            <h1>Failed to connect to the ledger</h1>
            <h2 className="opacity-05 fw300">Is the ledger started on {url()}?</h2>
          </Panel>
        </Wrapper>
      );
    }

    return (
      <Wrapper>
        <Router>
          <ScrollToTop></ScrollToTop>
          <Navbar></Navbar>
          <Switch>
            <Route path="/accounts/:id" exact>
              <Account></Account>
            </Route>
            <Route path="/accounts" exact>
              <Accounts></Accounts>
            </Route>
            <Route path="/transactions" exact>
              <Transactions></Transactions>
            </Route>
            <Route path="/graph" exact>
              <TransactionGraph></TransactionGraph>
            </Route>
            <Route path="/analytics" exact>
              <Analytics></Analytics>
            </Route>
            <Route path="/new" exact>
              <Create></Create>
            </Route>
            <Route path="/">
              <Home></Home>
            </Route>
          </Switch>
        </Router>
      </Wrapper>
    );
  }
}

const container = document.querySelector('#app');
ReactDOM.render(React.createElement(App), container);