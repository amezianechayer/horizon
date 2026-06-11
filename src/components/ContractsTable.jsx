import * as React from 'react';
import styled from 'styled-components';
import {Link} from 'react-router-dom';
import ledger from '../lib/ledger';
import Panel from '../parts/Panel.jsx';
import StateBadge from '../parts/StateBadge.jsx';
import Amount from '../parts/Amount.jsx';

const Wrapper = styled.div`
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;

    td, th {
      padding: 14px;
      text-align: left;
    }

    thead tr {
      border-bottom: solid 1px rgba(0, 0, 0, 0.05);
      th { font-weight: 500; opacity: 0.65; }
    }

    tbody tr {
      border-bottom: solid 0.5px rgba(16, 0, 70, 0.05);
      cursor: pointer;
      &:hover { background: rgba(0, 0, 0, 0.02); }
    }

    .mono { font-family: 'Roboto Mono', monospace; }
  }

  .empty {
    padding: 40px;
    text-align: center;
    opacity: 0.5;
  }
`;

function progression(schedule) {
  if (!schedule || !schedule.length) {
    return '';
  }
  const done = schedule.filter(i => i.status === 'paid' || i.status === 'settled_early').length;
  return `${done}/${schedule.length}`;
}

class ContractsTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {contracts: [], loaded: false};
  }

  componentDidMount() {
    ledger().getContracts()
      .then(contracts => this.setState({contracts: contracts || [], loaded: true}))
      .catch(() => this.setState({loaded: true}));
  }

  render() {
    const {contracts, loaded} = this.state;

    if (loaded && contracts.length === 0) {
      return (
        <Wrapper>
          <Panel>
            <div className="empty">
              <p>No contract yet.</p>
              <Link className="button action" to="/contracts/new">Create the first Murabaha</Link>
            </div>
          </Panel>
        </Wrapper>
      );
    }

    return (
      <Wrapper>
        <Panel nopad>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>State</th>
                <th>Cost</th>
                <th>Markup</th>
                <th>Client</th>
                <th>Installments</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map(c => (
                <tr key={c.id} onClick={() => { window.location.href = `/contracts/${c.id}`; }}>
                  <td className="mono">{c.id}</td>
                  <td>{c.type}</td>
                  <td><StateBadge state={c.state}/></td>
                  <td><Amount>{c.params.cost.amount}</Amount> <span className="mono">{c.params.cost.asset}</span></td>
                  <td><Amount>{c.params.markup.amount}</Amount></td>
                  <td className="mono">{c.params.client}</td>
                  <td>{c.params.installments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </Wrapper>
    );
  }
}

export default ContractsTable;
export {progression};
