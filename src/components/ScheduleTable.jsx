import * as React from 'react';
import styled from 'styled-components';
import Panel from '../parts/Panel.jsx';
import StateBadge from '../parts/StateBadge.jsx';
import Amount from '../parts/Amount.jsx';

const Wrapper = styled.div`
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;

    td, th { padding: 10px 14px; text-align: right; }
    td:first-child, th:first-child,
    td:nth-child(2), th:nth-child(2),
    td:last-child, th:last-child { text-align: left; }

    thead tr th { font-weight: 500; opacity: 0.65; }
    tbody tr { border-bottom: solid 0.5px rgba(16, 0, 70, 0.05); }
    .mono { font-family: 'Roboto Mono', monospace; }
  }
`;

function ScheduleTable({schedule}) {
  if (!schedule || !schedule.length) {
    return null;
  }
  return (
    <Wrapper>
      <Panel nopad>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Due date</th>
              <th>Amount</th>
              <th>Principal</th>
              <th>Profit</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map(i => (
              <tr key={i.seq}>
                <td>{i.seq}</td>
                <td className="mono">{(i.due_date || '').slice(0, 10)}</td>
                <td><Amount>{i.amount}</Amount></td>
                <td><Amount>{i.principal_part}</Amount></td>
                <td><Amount>{i.profit_part}</Amount></td>
                <td>
                  <StateBadge state={i.status}/>
                  {i.paid_tx_id >= 0 && <span className="ml10 mono opacity-05">tx {i.paid_tx_id}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </Wrapper>
  );
}

export default ScheduleTable;
