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
import {me, installUnauthorizedRedirect} from './lib/auth';
import {SessionContext} from './lib/session.jsx';

import Navbar from './parts/Navbar.jsx';
import Home from './pages/Home.jsx';
import Transactions from './pages/Transactions.jsx';
import Accounts from './pages/Accounts.jsx';
import Account from './pages/Account.jsx';
import Create from './pages/Create.jsx';
import Login from './pages/Login.jsx';
import Contracts from './pages/Contracts.jsx';
import Contract from './pages/Contract.jsx';
import ContractCreate from './pages/ContractCreate.jsx';
import Lens from './pages/Lens.jsx';
import ScrollToTop from './parts/Scroll.jsx';
import Panel from './parts/Panel.jsx';

const Wrapper = styled.div`
  font-family: 'Inter', sans-serif;

  button, a.button {
    display: inline-block;
    border: none;
    border-radius: 4px;
    cursor: pointer;

    padding: 9px 14px;
    font-size: 14px;

    &.primary {
      border: solid 2px black;
      border-radius: 100px;
      background: white;
      color: black;
      font-weight: 500;

      background: black;
      color: white;
    }

    &.action {
      background: #13e07e;
      color: #222;
      border-radius: 8px;
      font-weight: 500;
      padding: 12px;
    }
  }

  input[type="text"], input[type="email"] {
    padding: 12px;
    font-size: 16px;
    border-radius: 100px;
    border-radius: 8px;
    border: none;
    margin-left: 0;

    /* &:focus {
      outline: none;
      outline: solid 4px rgba(0, 0, 0, 0.2);
    } */
  }

  a {
    text-decoration: none;
    color: inherit;
  }
`;

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      ready: false,
      error: false,
      info: {},
      identity: null,
    };

    installUnauthorizedRedirect();
  }

  componentWillMount() {
    getInfo()
    .then(() => {
      this.setState({
        ready: true,
      });
      me().then(identity => this.setState({identity}));
    })
    .catch(e => {
      // an HTTP response means the server is alive; a 401 means auth is
      // enabled and the interceptor is already redirecting to /login —
      // only a network failure is a real connection error
      if (e && e.response) {
        this.setState({ready: true});
        me().then(identity => this.setState({identity}));
        return;
      }
      this.setState({
        ready: true,
        error: true,
      });
    });
  }

  render() {
    if (this.state.error && window.location.pathname !== '/login') {
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
        <SessionContext.Provider value={this.state.identity}>
          <Router>
            <ScrollToTop></ScrollToTop>
            <Switch>
              <Route path="/login" exact>
                <Login></Login>
              </Route>
              <Route path="/">
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
                  <Route path="/contracts/new" exact>
                    <ContractCreate></ContractCreate>
                  </Route>
                  <Route path="/contracts/:id" exact>
                    <Contract></Contract>
                  </Route>
                  <Route path="/contracts" exact>
                    <Contracts></Contracts>
                  </Route>
                  <Route path="/lens" exact>
                    <Lens></Lens>
                  </Route>
                  <Route path="/new" exact>
                    <Create></Create>
                  </Route>
                  <Route path="/">
                    <Home></Home>
                  </Route>
                </Switch>
              </Route>
            </Switch>
          </Router>
        </SessionContext.Provider>
      </Wrapper>
    );
  }
}

const container = document.querySelector('#app');
ReactDOM.render(React.createElement(App), container);