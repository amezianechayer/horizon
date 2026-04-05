import * as React from 'react';
import styled from 'styled-components';
import ledger from '../lib/ledger';
import GraphVisualization from '../components/GraphVisualization.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
  color: #c9d1d9;

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding: 14px 18px;
    background: #111;
    border-radius: 10px;
    border: 1px solid #21262d;
    flex-wrap: wrap;
    gap: 10px;

    h1 {
      margin: 0 0 2px;
      font-size: 19px;
      font-weight: 700;
      color: #f0f6fc;
    }
    p { margin: 0; font-size: 13px; opacity: 0.45; }
  }

  .filter-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 14px;
    padding: 10px 14px;
    background: #0d1117;
    border: 1px solid #21262d;
    border-radius: 8px;

    .filter-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: rgba(201,209,217,0.45);
      white-space: nowrap;
    }

    select, input[type="date"], input[type="text"] {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 5px;
      color: #c9d1d9;
      padding: 5px 9px;
      font-size: 12px;
      font-family: 'Roboto Mono', monospace;
      cursor: pointer;
      &:focus { outline: none; border-color: #58a6ff; }
    }

    input[type="text"] {
      width: 200px;
      &::placeholder { color: rgba(201,209,217,0.3); }
    }

    input[type="date"]::-webkit-calendar-picker-indicator {
      filter: invert(0.6);
      cursor: pointer;
    }

    .divider {
      width: 1px;
      height: 20px;
      background: #21262d;
      margin: 0 4px;
    }

    .badge {
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 4px;
      padding: 2px 8px;
      font-size: 11px;
      color: #8b949e;
    }

    .search-clear {
      background: none;
      border: none;
      color: #8b949e;
      cursor: pointer;
      font-size: 14px;
      padding: 0 2px;
      line-height: 1;
      &:hover { color: #f0f6fc; }
    }

    .refresh-btn {
      margin-left: auto;
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 6px;
      color: #c9d1d9;
      padding: 5px 13px;
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: background 0.15s;
      white-space: nowrap;
      &:hover { background: #30363d; color: #f0f6fc; }
      &:disabled { opacity: 0.4; cursor: default; }
    }
  }

  .no-results {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 300px;
    background: #0d1117;
    border: 1px solid #21262d;
    border-radius: 12px;
    gap: 10px;
    color: rgba(201,209,217,0.4);

    .icon { font-size: 32px; opacity: 0.35; }
    p { margin: 0; font-size: 13px; }
    .sub { font-size: 11px; }
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 420px;
    background: #0d1117;
    border: 1px solid #21262d;
    border-radius: 12px;
    gap: 12px;
    color: rgba(201,209,217,0.4);
    font-size: 13px;

    .spinner {
      width: 26px;
      height: 26px;
      border: 3px solid #21262d;
      border-top-color: #3fb950;
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  }

  .result-info {
    margin-bottom: 10px;
    font-size: 12px;
    color: rgba(201,209,217,0.5);
    display: flex;
    align-items: center;
    gap: 8px;

    .tag {
      background: #1f2937;
      border: 1px solid #374151;
      border-radius: 4px;
      padding: 1px 7px;
      font-family: 'Roboto Mono', monospace;
      color: #e3b341;
    }
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function nodeType(id) {
  if (!id) return 'account';
  if (id === '@world' || id.startsWith('@world')) return 'world';
  if (id.includes(':')) return 'sub';
  return 'account';
}

function toISODate(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

class TransactionGraph extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      // Data
      rawTransactions: [],
      availableAssets: [],
      dateRange: { min: '', max: '' },

      // Filters
      filterAsset: 'all',
      filterDateFrom: '',
      filterDateTo: '',
      searchQuery: '',
      maxNodes: 60,

      // Derived
      nodes: [],
      links: [],
      highlightedIds: new Set(),
      totalNodes: 0,    // before maxNodes cap
      limited: false,   // true if maxNodes cap was applied

      // UI state
      loading: true,
      ready: false,
    };

    this._searchTimer = null;
    this.fetch         = this.fetch.bind(this);
    this.applyFilters  = this.applyFilters.bind(this);
    this.handleSearch  = this.handleSearch.bind(this);
  }

  componentDidMount() {
    this.fetch();
  }

  componentWillUnmount() {
    clearTimeout(this._searchTimer);
  }

  // ── Fetch all transaction pages ──────────────────────────────────────────
  fetch() {
    this.setState({ loading: true, ready: false });
    const all = [];

    const fetchPage = query =>
      ledger().getTransactions(query).then(data => {
        const page = data.cursor.data || [];
        all.push(...page);
        if (page.length > 0 && page.length >= data.cursor.page_size) {
          return fetchPage({ after: page[page.length - 1].txid });
        }
        return all;
      });

    fetchPage({})
      .then(txs => {
        const assets = new Set();
        let minTs = Infinity, maxTs = -Infinity;

        txs.forEach(tx => {
          const ts = tx.timestamp;
          if (ts < minTs) minTs = ts;
          if (ts > maxTs) maxTs = ts;
          tx.postings.forEach(p => assets.add(p.asset));
        });

        const minDate = isFinite(minTs) ? toISODate(minTs) : '';
        const maxDate = isFinite(maxTs) ? toISODate(maxTs) : '';

        this.setState({
          rawTransactions: txs,
          availableAssets: Array.from(assets).sort(),
          dateRange: { min: minDate, max: maxDate },
          filterDateFrom: minDate,
          filterDateTo: maxDate,
        }, this.applyFilters);
      })
      .catch(() => this.setState({ loading: false, ready: true }));
  }

  // ── Build graph from current filters ────────────────────────────────────
  applyFilters() {
    const {
      rawTransactions, filterAsset,
      filterDateFrom, filterDateTo,
      searchQuery, maxNodes,
    } = this.state;

    const accountsMap = new Map();
    const linksMap    = new Map();

    const dateFrom = filterDateFrom ? new Date(filterDateFrom).getTime() : 0;
    const dateTo   = filterDateTo   ? new Date(filterDateTo + 'T23:59:59').getTime() : Infinity;

    rawTransactions.forEach(tx => {
      const ts = tx.timestamp;
      if (ts < dateFrom || ts > dateTo) return;

      tx.postings.forEach(p => {
        if (filterAsset !== 'all' && p.asset !== filterAsset) return;

        const src = p.source;
        const dst = p.destination;

        if (!accountsMap.has(src)) accountsMap.set(src, { id: src, type: nodeType(src) });
        if (!accountsMap.has(dst)) accountsMap.set(dst, { id: dst, type: nodeType(dst) });

        const key = `${src}||${dst}||${p.asset}`;
        if (linksMap.has(key)) {
          const e = linksMap.get(key);
          e.amount += p.amount;
          e.count  += 1;
        } else {
          linksMap.set(key, {
            id: key, source: src, target: dst,
            asset: p.asset, amount: p.amount, count: 1,
          });
        }
      });
    });

    // ── Search: ego-network filter ─────────────────────────────────────────
    const query = searchQuery.trim().toLowerCase();
    let highlightedIds = new Set();

    if (query) {
      // Find directly matched node IDs
      const matchedIds = new Set(
        Array.from(accountsMap.keys()).filter(id => id.toLowerCase().includes(query))
      );

      if (matchedIds.size > 0) {
        highlightedIds = matchedIds;

        // Expand to 1-hop neighbors
        const egoIds = new Set(matchedIds);
        linksMap.forEach(l => {
          if (matchedIds.has(l.source)) egoIds.add(l.target);
          if (matchedIds.has(l.target)) egoIds.add(l.source);
        });

        // Remove nodes outside ego network
        for (const id of accountsMap.keys()) {
          if (!egoIds.has(id)) accountsMap.delete(id);
        }

        // Remove links that cross out of ego network
        for (const [k, l] of linksMap.entries()) {
          if (!egoIds.has(l.source) || !egoIds.has(l.target)) linksMap.delete(k);
        }
      } else {
        // No match: show nothing
        accountsMap.clear();
        linksMap.clear();
      }
    }

    // ── Performance cap: top N nodes by total flow volume ─────────────────
    let nodes     = Array.from(accountsMap.values());
    let links     = Array.from(linksMap.values());
    const totalNodes = nodes.length;
    let limited   = false;

    if (!query && maxNodes !== 'all' && nodes.length > maxNodes) {
      limited = true;
      const volMap = new Map();
      links.forEach(l => {
        volMap.set(l.source, (volMap.get(l.source) || 0) + l.amount);
        volMap.set(l.target, (volMap.get(l.target) || 0) + l.amount);
      });
      nodes.sort((a, b) => (volMap.get(b.id) || 0) - (volMap.get(a.id) || 0));
      const kept = new Set(nodes.slice(0, maxNodes).map(n => n.id));
      nodes = nodes.filter(n => kept.has(n.id));
      links = links.filter(l => kept.has(l.source) && kept.has(l.target));
    }

    this.setState({ nodes, links, highlightedIds, totalNodes, limited, ready: true, loading: false });
  }

  // ── Filter handlers ──────────────────────────────────────────────────────
  handleSearch(e) {
    const value = e.target.value;
    this.setState({ searchQuery: value });
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(this.applyFilters, 280);
  }

  render() {
    const {
      loading, ready, nodes, links, highlightedIds,
      filterAsset, availableAssets, filterDateFrom, filterDateTo,
      searchQuery, maxNodes, dateRange,
      totalNodes, limited,
    } = this.state;

    const hasSearch  = searchQuery.trim().length > 0;
    const noResults  = ready && nodes.length === 0;

    return (
      <Wrapper>
        <div className="top-container mt20 mb40">

          {/* Header */}
          <div className="page-header">
            <div>
              <h1>Transaction Graph</h1>
              <p>Interactive fund flow visualization — accounts as nodes, transfers as edges</p>
            </div>
          </div>

          {/* Filter bar */}
          <div className="filter-bar">

            {/* Search */}
            <div className="filter-group">
              <label>Search</label>
              <input
                type="text"
                placeholder="account name…"
                value={searchQuery}
                onChange={this.handleSearch}
              />
              {hasSearch && (
                <button className="search-clear" onClick={() => this.setState({ searchQuery: '' }, this.applyFilters)}>
                  ✕
                </button>
              )}
            </div>

            <div className="divider" />

            {/* Asset */}
            <div className="filter-group">
              <label>Asset</label>
              <select
                value={filterAsset}
                onChange={e => this.setState({ filterAsset: e.target.value }, this.applyFilters)}
              >
                <option value="all">All assets</option>
                {availableAssets.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div className="divider" />

            {/* Date range */}
            <div className="filter-group">
              <label>From</label>
              <input
                type="date"
                value={filterDateFrom}
                min={dateRange.min}
                max={filterDateTo || dateRange.max}
                onChange={e => this.setState({ filterDateFrom: e.target.value }, this.applyFilters)}
              />
            </div>
            <div className="filter-group">
              <label>To</label>
              <input
                type="date"
                value={filterDateTo}
                min={filterDateFrom || dateRange.min}
                max={dateRange.max}
                onChange={e => this.setState({ filterDateTo: e.target.value }, this.applyFilters)}
              />
            </div>

            <div className="divider" />

            {/* Max nodes */}
            <div className="filter-group">
              <label>Max nodes</label>
              <select
                value={maxNodes}
                onChange={e => {
                  const v = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
                  this.setState({ maxNodes: v }, this.applyFilters);
                }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={60}>60</option>
                <option value={100}>100</option>
                <option value="all">All</option>
              </select>
            </div>

            <button className="refresh-btn" onClick={this.fetch} disabled={loading}>
              {loading ? '…' : '↻'} Refresh
            </button>
          </div>

          {/* Result info line */}
          {ready && !noResults && (
            <div className="result-info">
              {hasSearch && (
                <>
                  Ego network of <span className="tag">{searchQuery}</span>
                  &mdash; {nodes.length} accounts, {links.length} flows
                </>
              )}
              {!hasSearch && limited && (
                <>
                  Showing top {nodes.length} / {totalNodes} accounts by volume
                  &nbsp;·&nbsp; {links.length} flows
                </>
              )}
              {!hasSearch && !limited && (
                <>{nodes.length} accounts · {links.length} flows</>
              )}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="loading-state">
              <div className="spinner" />
              <span>Loading transactions…</span>
            </div>
          )}

          {/* No results */}
          {noResults && !loading && (
            <div className="no-results">
              <div className="icon">◎</div>
              {hasSearch
                ? <p>No account matching <strong>"{searchQuery}"</strong></p>
                : <p>No transactions found</p>
              }
              <span className="sub">
                {hasSearch
                  ? 'Try a different search term'
                  : 'Execute some FaRl scripts to see fund flows here'
                }
              </span>
            </div>
          )}

          {/* Graph */}
          {ready && nodes.length > 0 && (
            <GraphVisualization
              nodes={nodes}
              links={links}
              highlightedIds={highlightedIds}
            />
          )}

        </div>
      </Wrapper>
    );
  }
}

export default TransactionGraph;
