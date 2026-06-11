import * as React from 'react';
import styled from 'styled-components';
import Panel from '../parts/Panel.jsx';
import {login} from '../lib/auth';

const Wrapper = styled.div`
  max-width: 420px;
  margin: 80px auto;

  form {
    display: flex;
    flex-direction: column;
    gap: 12px;

    input {
      border: solid 1px rgba(16, 0, 70, 0.2) !important;
    }
  }

  .error {
    background: #ffe7e7;
    color: #a40000;
    border-radius: 8px;
    padding: 12px;
    margin-top: 12px;
    font-size: 14px;
  }
`;

class Login extends React.Component {
  constructor(props) {
    super(props);
    this.state = {username: '', password: '', error: '', busy: false};
    this.submit = this.submit.bind(this);
  }

  submit(e) {
    e.preventDefault();
    this.setState({busy: true, error: ''});
    login(this.state.username, this.state.password)
      .then(() => {
        window.location.href = '/contracts';
      })
      .catch(() => {
        this.setState({busy: false, error: 'Invalid username or password'});
      });
  }

  render() {
    return (
      <Wrapper>
        <Panel>
          <h1>Sign in</h1>
          <h2 className="opacity-05 fw300">Horizon back-office</h2>
          <form onSubmit={this.submit}>
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={this.state.username}
              onChange={e => this.setState({username: e.target.value})}
              autoFocus
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={this.state.password}
              onChange={e => this.setState({password: e.target.value})}
            />
            <button className="primary" type="submit" disabled={this.state.busy}>
              {this.state.busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          {this.state.error && <div className="error">{this.state.error}</div>}
        </Panel>
      </Wrapper>
    );
  }
}

export default Login;
