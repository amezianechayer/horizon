import * as React from 'react';
import styled from 'styled-components';
import ledger from '../lib/ledger';
import Panel from '../parts/Panel.jsx';
import Amount from '../parts/Amount.jsx';
import StateBadge from '../parts/StateBadge.jsx';
import FlowsTable from '../components/FlowsTable.jsx';
import Sparkline from '../components/Sparkline.jsx';
import FlowGraph from '../components/FlowGraph.jsx';
import GraphLegend from '../components/GraphLegend.jsx';
import TimeScrubber from '../components/TimeScrubber.jsx';
import { assetsOf, kindCounts, bucketsOf } from '../lib/buildGraph';

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
      graphAsset: '',
      collapsed: [],
      limit: 100,
      loading: true,
      error: false,
      bucketIndex: 0,
      playing: false,
    };
    this._playTimer = null;
    this.setLimit    = this.setLimit.bind(this);
    this.toggleKind  = this.toggleKind.bind(this);
    this.togglePlay  = this.togglePlay.bind(this);
  }

  componentDidMount() {
    this._mounted = true;
    const l = ledger();
    Promise.all([l.getLensOverview(), l.getLensRollup(), l.getLensFlows(100)])
      .then(([overview, rollup, flows]) => {
        if (!this._mounted) return;
        // Derive default account+asset for timeseries from top_accounts[0]
        const topAccounts = (overview && overview.top_accounts) || [];
        const topEntry = topAccounts[0];

        // Derive default graph asset: largest-volume asset from overview, else first from flows.
        const volAssets = (overview && overview.volume_by_asset)
          ? overview.volume_by_asset.slice().sort((a, b) => b.total - a.total)
          : [];
        const defaultAsset = (volAssets[0] && volAssets[0].asset) || assetsOf(flows || [])[0] || '';

        const defaultCollapsed = defaultAsset ? this._defaultCollapsed(flows || [], defaultAsset) : [];
        const defaultBuckets = bucketsOf(flows || [], defaultAsset);
        const defaultBucketIndex = defaultBuckets.length > 0 ? defaultBuckets.length - 1 : 0;
        this.setState({overview, rollup, flows: flows || [], graphAsset: defaultAsset, collapsed: defaultCollapsed, loading: false, bucketIndex: defaultBucketIndex});

        if (topEntry && topEntry.account && topEntry.asset) {
          l.getLensTimeseries(topEntry.account, topEntry.asset)
            .then(timeseries => {
              if (!this._mounted) return;
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
        if (this._mounted) this.setState({loading: false, error: true});
      });
  }

  componentWillUnmount() {
    this._mounted = false;
    if (this._playTimer) {
      clearInterval(this._playTimer);
      this._playTimer = null;
    }
  }

  // Compute which kinds have > 12 members for the given flows+asset.
  _defaultCollapsed(flows, asset) {
    const counts = kindCounts(flows, asset);
    return Object.keys(counts).filter(k => counts[k] > 12);
  }

  setLimit(n) {
    this.setState({limit: n});
    ledger().getLensFlows(n).then(flows => {
      if (!this._mounted) return;
      const assets = assetsOf(flows || []);
      this.setState(prev => {
        const nextAsset = assets.indexOf(prev.graphAsset) !== -1 ? prev.graphAsset : (assets[0] || '');
        const nextBuckets = bucketsOf(flows || [], nextAsset);
        const nextBucketIndex = nextBuckets.length > 0 ? nextBuckets.length - 1 : 0;
        return {
          flows: flows || [],
          graphAsset: nextAsset,
          collapsed: nextAsset ? this._defaultCollapsed(flows || [], nextAsset) : [],
          bucketIndex: nextBucketIndex,
        };
      });
    }).catch(() => {/* non-fatal */});
  }

  toggleKind(kind) {
    this.setState(prev => {
      const next = prev.collapsed.indexOf(kind) !== -1
        ? prev.collapsed.filter(k => k !== kind)
        : prev.collapsed.concat(kind);
      return {collapsed: next};
    });
  }

  togglePlay() {
    const { flows, graphAsset } = this.state;
    const buckets = bucketsOf(flows, graphAsset);

    if (this.state.playing) {
      // Turn OFF
      if (this._playTimer) {
        clearInterval(this._playTimer);
        this._playTimer = null;
      }
      this.setState({ playing: false });
    } else {
      // Turn ON. If the cursor is already at (or past) the last bucket — which is
      // the default on load — restart from the beginning so play always replays.
      const atEnd = buckets.length > 0 && this.state.bucketIndex >= buckets.length - 1;
      this._playTimer = setInterval(() => {
        if (!this._mounted) {
          clearInterval(this._playTimer);
          this._playTimer = null;
          return;
        }
        this.setState(prev => {
          const nextBuckets = bucketsOf(prev.flows, prev.graphAsset);
          const nextIndex = prev.bucketIndex + 1;
          if (nextIndex >= nextBuckets.length) {
            // Reached the end — stop
            clearInterval(this._playTimer);
            this._playTimer = null;
            return { bucketIndex: nextBuckets.length > 0 ? nextBuckets.length - 1 : 0, playing: false };
          }
          return { bucketIndex: nextIndex };
        });
      }, 700);
      this.setState({ playing: true, bucketIndex: atEnd ? 0 : this.state.bucketIndex });
    }
  }

  render() {
    const {overview, rollup, flows, timeseries, timeseriesLabel, graphAsset, collapsed, limit, loading, error, bucketIndex, playing} = this.state;
    const buckets = bucketsOf(flows, graphAsset);
    const tBucket = buckets.length > 0 ? buckets[bucketIndex] : undefined;

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
                    <div className="stat-row" key={(entry.account + ':' + entry.asset) || i}>
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

              {/* Flow graph */}
              {!loading && flows.length > 0 && graphAsset && (
                <div style={{marginBottom: 24}}>
                  <Panel>
                    <div className="card-title">Flow graph</div>
                    <GraphLegend
                      assets={assetsOf(flows)}
                      value={graphAsset}
                      onChange={a => {
                        const nextBuckets = bucketsOf(flows, a);
                        const nextBucketIndex = nextBuckets.length > 0 ? nextBuckets.length - 1 : 0;
                        this.setState({
                          graphAsset: a,
                          collapsed: a ? this._defaultCollapsed(flows, a) : [],
                          bucketIndex: nextBucketIndex,
                        });
                      }}
                      limit={limit}
                      onLimitChange={this.setLimit}
                      collapsed={collapsed}
                      onToggleKind={this.toggleKind}
                    />
                    <FlowGraph
                      flows={flows}
                      asset={graphAsset}
                      collapsed={collapsed}
                      onToggleKind={this.toggleKind}
                      tBucket={tBucket}
                    />
                    <TimeScrubber
                      buckets={buckets}
                      index={bucketIndex}
                      onChange={i => {
                        if (this.state.playing) {
                          clearInterval(this._playTimer);
                          this._playTimer = null;
                          this.setState({ bucketIndex: i, playing: false });
                        } else {
                          this.setState({ bucketIndex: i });
                        }
                      }}
                      playing={playing}
                      onTogglePlay={this.togglePlay}
                    />
                  </Panel>
                </div>
              )}

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
