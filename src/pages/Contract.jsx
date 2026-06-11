import * as React from 'react';
import styled from 'styled-components';
import {withRouter} from 'react-router-dom';
import ledger from '../lib/ledger';
import Panel from '../parts/Panel.jsx';
import StateBadge from '../parts/StateBadge.jsx';
import Amount from '../parts/Amount.jsx';
import TransitionModal from '../parts/TransitionModal.jsx';
import ScheduleTable from '../components/ScheduleTable.jsx';
import AuditTrail from '../components/AuditTrail.jsx';
import {SessionContext, canOperate} from '../lib/session.jsx';

const Wrapper = styled.div`
  .header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;

    h1 { margin: 0; font-family: 'Roboto Mono', monospace; font-size: 22px; }
  }

  .stepper {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
    font-size: 13px;
    font-weight: 600;

    .step {
      padding: 6px 14px;
      border-radius: 100px;
      background: #eceff1;
      color: #90a4ae;

      &.done { background: #e8f5e9; color: #1b5e20; }
      &.current { background: #111; color: white; }
      &.terminal-cancelled { background: #ffebee; color: #b71c1c; }
    }

    .arrow { opacity: 0.3; }
  }

  .params {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 20px;

    .param {
      .label { font-size: 12px; opacity: 0.5; margin-bottom: 4px; }
      .value { font-family: 'Roboto Mono', monospace; font-size: 14px; }
    }
  }

  .actions {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }

  .section-title { margin: 24px 0 12px 0; }
`;

const STEPS = ['PROMISE', 'ACQUIRED', 'SOLD', 'SETTLED'];

// legal transitions per state — mirrors the engine FSM
const TRANSITIONS = {
  PROMISE: ['acquire', 'cancel'],
  ACQUIRED: ['sell', 'cancel'],
  SOLD: ['pay_installment', 'early_settle', 'late_penalty'],
  SETTLED: [],
  CANCELLED: [],
};

class Contract extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      contract: null,
      schedule: [],
      events: [],
      chainValid: null,
      notFound: false,
      modal: null,
    };
    this.refresh = this.refresh.bind(this);
    this.execute = this.execute.bind(this);
  }

  componentDidMount() {
    this.refresh();
  }

  refresh() {
    const id = this.props.match.params.id;
    const l = ledger();
    return Promise.all([l.getContract(id), l.getAudit(id)])
      .then(([detail, audit]) => {
        this.setState({
          contract: detail.contract,
          schedule: detail.schedule || [],
          events: audit.events || [],
          chainValid: audit.chain_valid,
        });
      })
      .catch(() => this.setState({notFound: true}));
  }

  execute(input) {
    const id = this.props.match.params.id;
    return ledger().transition(id, this.state.modal, input)
      .then(() => {
        this.setState({modal: null});
        return this.refresh();
      });
    // errors propagate to the modal, which displays code + standard_ref
  }

  renderStepper(state) {
    if (state === 'CANCELLED') {
      return (
        <div className="stepper">
          <span className="step terminal-cancelled">CANCELLED</span>
        </div>
      );
    }
    const idx = STEPS.indexOf(state);
    return (
      <div className="stepper">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            {i > 0 && <span className="arrow">→</span>}
            <span className={'step ' + (i < idx ? 'done' : i === idx ? 'current' : '')}>{s}</span>
          </React.Fragment>
        ))}
      </div>
    );
  }

  render() {
    const {contract, schedule, events, chainValid, notFound, modal} = this.state;

    if (notFound) {
      return (
        <div className="top-container mt20">
          <Panel><h1>Contract not found</h1></Panel>
        </div>
      );
    }
    if (!contract) {
      return null;
    }

    const p = contract.params;
    const transitions = TRANSITIONS[contract.state] || [];

    return (
      <Wrapper>
        <div className="top-container mt20 mb40">
          <div className="header">
            <h1>{contract.id}</h1>
            <StateBadge state={contract.state}/>
            <span className="opacity-05">{contract.template_version}</span>
          </div>

          {this.renderStepper(contract.state)}

          <Panel>
            <div className="params">
              <div className="param">
                <div className="label">Asset</div>
                <div className="value">{p.asset_code}</div>
              </div>
              <div className="param">
                <div className="label">Cost</div>
                <div className="value"><Amount>{p.cost.amount}</Amount> {p.cost.asset}</div>
              </div>
              <div className="param">
                <div className="label">Markup (fixed)</div>
                <div className="value"><Amount>{p.markup.amount}</Amount> {p.markup.asset}</div>
              </div>
              <div className="param">
                <div className="label">Total</div>
                <div className="value"><Amount>{p.cost.amount + p.markup.amount}</Amount> {p.cost.asset}</div>
              </div>
              <div className="param">
                <div className="label">Client</div>
                <div className="value">{p.client}</div>
              </div>
              <div className="param">
                <div className="label">Supplier</div>
                <div className="value">{p.supplier}</div>
              </div>
              <div className="param">
                <div className="label">Treasury</div>
                <div className="value">{p.bank_treasury}</div>
              </div>
              <div className="param">
                <div className="label">Installments</div>
                <div className="value">{p.installments} × {p.period_days}d</div>
              </div>
            </div>
          </Panel>

          <SessionContext.Consumer>
            {identity => canOperate(identity) && transitions.length > 0 && (
              <div className="actions mt20">
                {transitions.map(name => (
                  <button
                    key={name}
                    className={name === 'cancel' ? '' : 'primary'}
                    onClick={() => this.setState({modal: name})}
                  >
                    {name.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            )}
          </SessionContext.Consumer>

          <h3 className="section-title">Schedule</h3>
          <ScheduleTable schedule={schedule}/>

          <h3 className="section-title"></h3>
          <AuditTrail events={events} chainValid={chainValid}/>

          <TransitionModal
            transition={modal}
            onClose={() => this.setState({modal: null})}
            onConfirm={this.execute}
          />
        </div>
      </Wrapper>
    );
  }
}

export default withRouter(Contract);
