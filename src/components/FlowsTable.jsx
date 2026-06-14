import * as React from 'react';
import styled, { keyframes } from 'styled-components';
import Amount from '../parts/Amount.jsx';

/* ── CountUp ────────────────────────────────────────────────────────────── */

class CountUp extends React.Component {
  constructor(props) {
    super(props);
    this.state = { displayed: 0 };
    this._raf = null;
  }

  componentDidMount() {
    const target = Number(this.props.value) || 0;
    const duration = 600; // ms
    const start = performance.now();

    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      this.setState({ displayed: Math.round(eased * target) });
      if (progress < 1) {
        this._raf = requestAnimationFrame(step);
      }
    };

    this._raf = requestAnimationFrame(step);
  }

  componentWillUnmount() {
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  render() {
    return <span>{this.state.displayed}</span>;
  }
}

/* ── Bar animation ─────────────────────────────────────────────────────── */

const growIn = keyframes`
  from { width: 0; }
`;

const Bar = styled.div`
  height: 6px;
  border-radius: 3px;
  background: #13e07e;
  width: ${props => props.pct}%;
  animation: ${growIn} 0.6s ease both;
  transition: width 0.3s ease;
`;

const BarTrack = styled.div`
  width: 120px;
  height: 6px;
  background: rgba(19, 224, 126, 0.12);
  border-radius: 3px;
  overflow: hidden;
`;

/* ── Table styles ──────────────────────────────────────────────────────── */

const Wrapper = styled.div`
  overflow-x: auto;

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  thead th {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    opacity: 0.45;
    text-align: left;
    padding: 0 12px 10px 12px;
    white-space: nowrap;
  }

  tbody tr {
    border-top: solid 1px rgba(0, 0, 0, 0.05);
    transition: background 0.15s ease;

    &:hover {
      background: rgba(19, 224, 126, 0.04);
    }
  }

  tbody td {
    padding: 8px 12px;
    vertical-align: middle;
    white-space: nowrap;
  }

  .edge {
    font-family: 'Roboto Mono', monospace;
    font-size: 12px;
    opacity: 0.8;
  }

  .asset {
    font-family: 'Roboto Mono', monospace;
    font-size: 12px;
    font-weight: 600;
    color: #455a64;
  }

  .count {
    font-family: 'Roboto Mono', monospace;
    font-size: 12px;
    opacity: 0.6;
  }

  .empty {
    opacity: 0.45;
    font-size: 13px;
    padding: 16px 12px;
  }
`;

/* ── Helpers ───────────────────────────────────────────────────────────── */

function collapseFlows(flows) {
  if (!flows || flows.length === 0) return [];

  const map = {};
  flows.forEach(row => {
    const key = `${row.source}||${row.destination}||${row.asset}`;
    if (map[key]) {
      map[key].amount += Number(row.amount) || 0;
      map[key].count  += Number(row.count)  || 0;
    } else {
      map[key] = {
        source:      row.source,
        destination: row.destination,
        asset:       row.asset,
        amount:      Number(row.amount) || 0,
        count:       Number(row.count)  || 0,
      };
    }
  });

  return Object.values(map).sort((a, b) => b.amount - a.amount);
}

/* ── Component ─────────────────────────────────────────────────────────── */

class FlowsTable extends React.Component {
  render() {
    const { flows } = this.props;
    const rows = collapseFlows(flows);

    if (rows.length === 0) {
      return (
        <Wrapper>
          <span className="empty">No flows yet.</span>
        </Wrapper>
      );
    }

    const maxAmount = rows[0].amount || 1;

    return (
      <Wrapper>
        <table>
          <thead>
            <tr>
              <th>Source → Destination</th>
              <th>Asset</th>
              <th>Amount</th>
              <th>Count</th>
              <th>Volume</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const pct = (row.amount / maxAmount) * 100;
              return (
                <tr key={i}>
                  <td className="edge">
                    {row.source}&nbsp;<span style={{opacity: 0.4}}>→</span>&nbsp;{row.destination}
                  </td>
                  <td>
                    <span className="asset">{row.asset}</span>
                  </td>
                  <td>
                    <Amount>
                      <CountUp value={row.amount} />
                    </Amount>
                  </td>
                  <td className="count">
                    <CountUp value={row.count} />
                  </td>
                  <td>
                    <BarTrack>
                      <Bar pct={pct} />
                    </BarTrack>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Wrapper>
    );
  }
}

export default FlowsTable;
