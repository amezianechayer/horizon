import * as React from 'react';
import styled from 'styled-components';
import {withRouter} from 'react-router-dom';
import ledger from '../lib/ledger';
import Panel from '../parts/Panel.jsx';

const Wrapper = styled.div`
  max-width: 640px;

  form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;

    .field {
      label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        margin-bottom: 4px;
        opacity: 0.7;
      }

      input {
        width: 100%;
        box-sizing: border-box;
        border: solid 1px rgba(16, 0, 70, 0.2) !important;
      }

      .hint { font-size: 12px; opacity: 0.5; margin-top: 4px; font-family: 'Roboto Mono', monospace; }

      &.wide { grid-column: span 2; }
    }

    .submit { grid-column: span 2; }
  }

  .error {
    background: #ffe7e7;
    color: #a40000;
    border-radius: 8px;
    padding: 12px;
    margin-top: 14px;
    font-size: 14px;
  }
`;

function major(minor) {
  const n = parseInt(minor, 10);
  if (isNaN(n)) {
    return '';
  }
  return (n / 100).toLocaleString('en-US', {minimumFractionDigits: 2});
}

class ContractCreate extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      id: '',
      asset_code: '',
      asset: 'SAR2',
      cost: '',
      markup: '',
      client: '@client:',
      supplier: '@supplier:',
      installments: '12',
      first_due: '',
      period_days: '30',
      error: null,
      busy: false,
    };
    this.submit = this.submit.bind(this);
  }

  submit(e) {
    e.preventDefault();
    const s = this.state;

    const body = {
      type: 'murabaha',
      params: {
        asset_code: s.asset_code,
        cost: {asset: s.asset, amount: parseInt(s.cost, 10) || 0},
        markup: {asset: s.asset, amount: parseInt(s.markup, 10) || 0},
        client: s.client,
        supplier: s.supplier,
        installments: parseInt(s.installments, 10) || 0,
        first_due: s.first_due ? `${s.first_due}T00:00:00Z` : '',
        period_days: parseInt(s.period_days, 10) || 30,
      },
    };
    if (s.id) {
      body.id = s.id;
    }

    this.setState({busy: true, error: null});
    ledger().createContract(body)
      .then(data => {
        this.props.history.push(`/contracts/${data.contract.id}`);
      })
      .catch(err => {
        this.setState({busy: false, error: err});
      });
  }

  field(name, label, props = {}) {
    return (
      <div className={'field' + (props.wide ? ' wide' : '')}>
        <label>{label}</label>
        <input
          type={props.type || 'text'}
          name={name}
          placeholder={props.placeholder || ''}
          value={this.state[name]}
          onChange={e => this.setState({[name]: e.target.value})}
        />
        {props.hint && <div className="hint">{props.hint}</div>}
      </div>
    );
  }

  render() {
    const {error} = this.state;
    return (
      <Wrapper>
        <div className="top-container mt20 mb40">
          <h1>New Murabaha contract</h1>
          <Panel>
            <form onSubmit={this.submit}>
              {this.field('id', 'Contract ID (optional, lowercase)', {placeholder: 'auto-generated if empty'})}
              {this.field('asset_code', 'Physical asset code', {placeholder: 'VHCL42A'})}
              {this.field('asset', 'Monetary asset', {placeholder: 'SAR2'})}
              {this.field('cost', 'Cost (minor units)', {type: 'number', hint: this.state.cost ? `= ${major(this.state.cost)} major units` : ''})}
              {this.field('markup', 'Fixed markup (minor units)', {type: 'number', hint: this.state.markup ? `= ${major(this.state.markup)} major units` : ''})}
              {this.field('installments', 'Installments', {type: 'number'})}
              {this.field('client', 'Client account', {wide: true})}
              {this.field('supplier', 'Supplier account', {wide: true})}
              {this.field('first_due', 'First due date', {type: 'date'})}
              {this.field('period_days', 'Period (days)', {type: 'number'})}
              <div className="submit">
                <button className="primary" type="submit" disabled={this.state.busy}>
                  {this.state.busy ? 'Creating…' : 'Create contract'}
                </button>
              </div>
            </form>
            {error && (
              <div className="error">
                {error.code && <strong>{error.code} — </strong>}
                {error.message}
              </div>
            )}
          </Panel>
        </div>
      </Wrapper>
    );
  }
}

export default withRouter(ContractCreate);
