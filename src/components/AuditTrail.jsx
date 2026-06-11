import * as React from 'react';
import styled from 'styled-components';
import Panel from '../parts/Panel.jsx';
import StateBadge from '../parts/StateBadge.jsx';

const Wrapper = styled.div`
  .chain {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;

    h3 { margin: 0; }

    .badge {
      padding: 6px 12px;
      border-radius: 100px;
      font-size: 13px;
      font-weight: 600;

      &.valid { background: #e8f5e9; color: #1b5e20; }
      &.invalid { background: #ffebee; color: #b71c1c; }
    }
  }

  ul {
    list-style-type: none;
    margin: 0;
    padding: 0;

    li {
      display: flex;
      align-items: baseline;
      gap: 10px;
      padding: 10px 0;
      border-bottom: solid 0.5px rgba(16, 0, 70, 0.05);
      font-size: 13px;

      .seq { font-family: 'Roboto Mono', monospace; opacity: 0.4; width: 28px; }
      .event { font-weight: 600; width: 110px; }
      .ref { font-family: 'Roboto Mono', monospace; font-size: 12px; opacity: 0.6; }
      .reason { color: #b71c1c; }
      .when { margin-left: auto; opacity: 0.4; font-size: 12px; }
    }
  }
`;

function AuditTrail({events, chainValid}) {
  return (
    <Wrapper>
      <Panel>
        <div className="chain">
          <h3>Audit trail</h3>
          <span className={'badge ' + (chainValid ? 'valid' : 'invalid')}>
            {chainValid ? '✓ chain verified' : '✗ chain BROKEN'}
          </span>
        </div>
        <ul>
          {(events || []).map(e => (
            <li key={e.seq}>
              <span className="seq">#{e.seq}</span>
              <span className="event">{e.transition || e.event}</span>
              <StateBadge state={e.decision}/>
              {e.standard_ref && <span className="ref">{e.standard_ref}</span>}
              {e.reason && <span className="reason">{e.reason}</span>}
              {e.tx_id >= 0 && <span className="ref">tx {e.tx_id}</span>}
              <span className="when">{(e.created_at || '').replace('T', ' ').replace('Z', '')}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </Wrapper>
  );
}

export default AuditTrail;
