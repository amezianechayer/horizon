import * as React from 'react';
import Modal from 'react-modal';
import styled from 'styled-components';

const Body = styled.div`
  h2 { margin-top: 0; }

  .field {
    margin-bottom: 12px;

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

      &[readonly] { background: #f5f5f5; opacity: 0.8; }
    }

    .hint { font-size: 12px; opacity: 0.5; margin-top: 4px; }
  }

  .error {
    background: #ffe7e7;
    color: #a40000;
    border-radius: 8px;
    padding: 12px;
    margin: 12px 0;
    font-size: 14px;

    .ref { font-family: 'Roboto Mono', monospace; font-weight: 600; }
  }

  .actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 16px;
  }
`;

const MODAL_STYLE = {
  content: {
    top: '50%', left: '50%', right: 'auto', bottom: 'auto',
    transform: 'translate(-50%, -50%)',
    width: '420px', borderRadius: '12px', padding: '24px',
  },
  overlay: {background: 'rgba(0, 0, 0, 0.4)', zIndex: 100},
};

// Per-transition input fields. late_penalty destination is locked to the
// charity pool: the UI must not even offer another destination (AAOIFI SS-3).
const FIELDS = {
  acquire: [],
  sell: [],
  cancel: [],
  pay_installment: [
    {name: 'seq', label: 'Installment # (empty = next due)', type: 'number'},
  ],
  early_settle: [
    {name: 'rebate', label: "Rebate / ibra' in minor units (empty = full remaining profit)", type: 'number'},
  ],
  late_penalty: [
    {name: 'seq', label: 'Installment #', type: 'number'},
    {name: 'amount', label: 'Penalty amount (minor units)', type: 'number', required: true},
    {name: 'destination', label: 'Destination (charity only — AAOIFI SS-3)', type: 'text', value: '@charity:pool', readonly: true},
  ],
};

const CONFIRMATIONS = {
  acquire: 'The bank pays the supplier and takes possession of the asset.',
  sell: 'The asset is delivered to the client; the receivable and the deferred profit are created.',
  cancel: 'Cancel this contract. From ACQUIRED the bank keeps the asset in its unsold inventory.',
  pay_installment: 'Registers the client payment and recognizes this installment’s profit share.',
  early_settle: 'Settles all remaining installments. The rebated profit is never recognized as income.',
  late_penalty: 'The penalty goes to the charity pool. It can never become bank income.',
};

class TransitionModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {values: {}, error: null, busy: false};
    this.confirm = this.confirm.bind(this);
  }

  componentDidUpdate(prev) {
    if (prev.transition !== this.props.transition) {
      const values = {};
      (FIELDS[this.props.transition] || []).forEach(f => {
        if (f.value) {
          values[f.name] = f.value;
        }
      });
      this.setState({values, error: null, busy: false});
    }
  }

  confirm() {
    const {transition} = this.props;
    const input = {};
    (FIELDS[transition] || []).forEach(f => {
      const raw = this.state.values[f.name];
      if (raw === undefined || raw === '') {
        return;
      }
      input[f.name] = f.type === 'number' ? parseInt(raw, 10) : raw;
    });

    this.setState({busy: true, error: null});
    this.props.onConfirm(input)
      .catch(err => {
        this.setState({busy: false, error: err});
      });
  }

  render() {
    const {transition, onClose} = this.props;
    if (!transition) {
      return null;
    }
    const fields = FIELDS[transition] || [];
    const {error} = this.state;

    return (
      <Modal isOpen={!!transition} onRequestClose={onClose} style={MODAL_STYLE} ariaHideApp={false}>
        <Body>
          <h2>{transition.replace(/_/g, ' ')}</h2>
          <p className="opacity-05">{CONFIRMATIONS[transition]}</p>
          {fields.map(f => (
            <div className="field" key={f.name}>
              <label>{f.label}</label>
              <input
                type={f.type === 'number' ? 'number' : 'text'}
                name={f.name}
                readOnly={!!f.readonly}
                value={this.state.values[f.name] !== undefined ? this.state.values[f.name] : (f.value || '')}
                onChange={e => this.setState({
                  values: Object.assign({}, this.state.values, {[f.name]: e.target.value}),
                })}
              />
            </div>
          ))}
          {error && (
            <div className="error">
              {error.standardRef && <div className="ref">{error.code} — {error.standardRef}</div>}
              {!error.standardRef && error.code && <div className="ref">{error.code}</div>}
              <div>{error.message}</div>
            </div>
          )}
          <div className="actions">
            <button onClick={onClose}>Cancel</button>
            <button className="primary" onClick={this.confirm} disabled={this.state.busy}>
              {this.state.busy ? 'Executing…' : 'Confirm'}
            </button>
          </div>
        </Body>
      </Modal>
    );
  }
}

export default TransitionModal;
