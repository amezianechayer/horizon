import * as React from 'react';
import styled from 'styled-components';
import ledger from '../lib/ledger';
import Panel from '../parts/Panel.jsx';
import Amount from '../parts/Amount.jsx';
import StateBadge from '../parts/StateBadge.jsx';
import FlowsTable from '../components/FlowsTable.jsx';
import Sparkline from '../components/Sparkline.jsx';

const Wrapper = styled.div`
  .page-header {
    margin-bottom: 20px;

    h1 { margin: 0 0 4px 0; }
    .subtitle { opacity: 0.45; font-size: 14px; }
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }

  .card-title {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    opacity: 0.45;
    margin-bottom: 12px;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    border-bottom: solid 1px rgba(0, 0, 0, 0.05);
    font-size: 14px;

    &:last-child { border-bottom: none; }

    .stat-label { opacity: 0.7; }
    .stat-value { font-family: 'Roboto Mono', monospace; font-weight: 500; }
  }

  .rollup-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }

  .badge-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: solid 1px rgba(0, 0, 0, 0.05);

    &:last-child { border-bottom: none; }

    .badge-count {
      font-family: 'Roboto Mono', monospace;
      font-size: 13px;
      font-weight: 600;
    }
  }

  .guard-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 100px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.3px;

    &.deny    { background: #ffebee; color: #b71c1c; }
    &.monitor { background: #eceff1; color: #455a64; }
  }
`;

class Lens extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      overview: null,
      rollup: null,
      flows: [],
      timeseries: [],
      timeseriesLabel: '',
      loading: true,
      error: false,
    };
  }

  componentDidMount() {
    const l = ledger();
    Promise.all([l.getLensOverview(), l.getLensRollup(), l.getLensFlows(100)])
      .then(([overview, rollup, flows]) => {
        // Derive default account+asset for timeseries from top_accounts[0]
        const topAccounts = (overview && overview.top_accounts) || [];
        const topEntry = topAccounts[0];

        this.setState({overview, rollup, flows: flows || [], loading: false});

        if (topEntry && topEntry.account && topEntry.asset) {
          l.getLensTimeseries(topEntry.account, topEntry.asset)
            .then(timeseries => {
              this.setState({
                timeseries: timeseries || [],
                timeseriesLabel: `${topEntry.account} (${topEntry.asset})`,
              });
            })
            .catch(() => {
              // timeseries failing is non-fatal; just leave empty
            });
        }
      })
      .catch(() => {
        this.setState({loading: false, error: true});
      });
  }

  render() {
    const {overview, rollup, flows, timeseries, timeseriesLabel, loading, error} = this.state;

    return (
      <Wrapper>
        <div className="top-container mt20 mb40">
          <div className="page-header">
            <h1>Lens</h1>
            <span className="subtitle">Financial observability</span>
          </div>

          {error && (
            <Panel>
              <span className="opacity-05">Could not load Lens data. Is the ledger running?</span>
            </Panel>
          )}

          {!error && (
            <>
              {/* Overview cards */}
              <div className="cards">
                {/* Counts card */}
                <Panel>
                  <div className="card-title">Ledger</div>
                  <div className="stat-row">
                    <span className="stat-label">Transactions</span>
                    <span className="stat-value">
                      {loading ? '—' : (overview && overview.transactions != null ? overview.transactions : '—')}
                    </span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Accounts</span>
                    <span className="stat-value">
                      {loading ? '—' : (overview && overview.accounts != null ? overview.accounts : '—')}
                    </span>
                  </div>
                </Panel>

                {/* Volume by asset card */}
                <Panel>
                  <div className="card-title">Volume by asset</div>
                  {loading && <span className="opacity-05">Loading…</span>}
                  {!loading && (overview && (overview.volume_by_asset || []).length === 0) && (
                    <span className="opacity-05">No data</span>
                  )}
                  {!loading && (overview ? (overview.volume_by_asset || []) : []).map((entry, i) => (
                    <div className="stat-row" key={entry.asset || i}>
                      <span className="stat-label">{entry.asset}</span>
                      <span className="stat-value">
                        <Amount>{entry.total}</Amount>
                      </span>
                    </div>
                  ))}
                </Panel>

                {/* Top accounts card */}
                <Panel>
                  <div className="card-title">Top accounts</div>
                  {loading && <span className="opacity-05">Loading…</span>}
                  {!loading && (overview && (overview.top_accounts || []).length === 0) && (
                    <span className="opacity-05">No data</span>
                  )}
                  {!loading && (overview ? (overview.top_accounts || []).slice(0, 5) : []).map((entry, i) => (
                    <div className="stat-row" key={entry.account || i}>
                      <span className="stat-label" style={{fontFamily: 'Roboto Mono, monospace', fontSize: 12}}>
                        {entry.account}
                      </span>
                      <span className="stat-value">
                        <Amount>{entry.volume}</Amount>
                        {entry.asset && <span className="opacity-05 ml4"> {entry.asset}</span>}
                      </span>
                    </div>
                  ))}
                </Panel>
              </div>

              {/* Rollup section */}
              <div className="rollup-grid">
                {/* Contracts by state */}
                <Panel>
                  <div className="card-title">Contracts by state</div>
                  {loading && <span className="opacity-05">Loading…</span>}
                  {!loading && Object.keys((rollup && rollup.contracts_by_state) || {}).length === 0 && (
                    <span className="opacity-05">No contracts</span>
                  )}
                  {!loading && Object.entries((rollup && rollup.contracts_by_state) || {}).map(([state, count]) => (
                    <div className="badge-row" key={state}>
                      <StateBadge state={state}/>
                      <span className="badge-count">{count}</span>
                    </div>
                  ))}
                </Panel>

                {/* Guard events by action */}
                <Panel>
                  <div className="card-title">Guard events</div>
                  {loading && <span className="opacity-05">Loading…</span>}
                  {!loading && Object.keys((rollup && rollup.guard_events_by_action) || {}).length === 0 && (
                    <span className="opacity-05">No guard events</span>
                  )}
                  {!loading && Object.entries((rollup && rollup.guard_events_by_action) || {}).map(([action, count]) => (
                    <div className="badge-row" key={action}>
                      <span className={'guard-badge ' + (action === 'deny' ? 'deny' : 'monitor')}>{action}</span>
                      <span className="badge-count">{count}</span>
                    </div>
                  ))}
                </Panel>
              </div>

              {/* Flows table */}
              {!loading && (
                <div className="mb24" style={{marginBottom: 24}}>
                  <Panel>
                    <div className="card-title">Flows</div>
                    <FlowsTable flows={flows} />
                  </Panel>
                </div>
              )}

              {/* Timeseries sparkline */}
              {!loading && timeseries.length >= 2 && (
                <div style={{marginBottom: 24}}>
                  <Panel>
                    <div className="card-title">
                      {'Flow over time'}
                      {timeseriesLabel && (
                        <span style={{fontWeight: 400, textTransform: 'none', opacity: 0.6, marginLeft: 6}}>
                          — {timeseriesLabel}
                        </span>
                      )}
                    </div>
                    <Sparkline series={timeseries} />
                  </Panel>
                </div>
              )}
            </>
          )}
        </div>
      </Wrapper>
    );
  }
}

export default Lens;
