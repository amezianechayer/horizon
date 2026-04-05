import * as React from 'react';
import styled from 'styled-components';
import ledger from '../lib/ledger';
import GraphVisualization from '../components/GraphVisualization.jsx';
import EdgeDetailPanel from '../components/EdgeDetailPanel.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
  color: #c9d1d9;

  .page-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 16px; padding: 14px 18px;
    background: #111; border-radius: 10px; border: 1px solid #21262d;
    flex-wrap: wrap; gap: 10px;
    h1 { margin: 0 0 2px; font-size: 19px; font-weight: 700; color: #f0f6fc; }
    p  { margin: 0; font-size: 13px; opacity: 0.45; }
  }

  .filter-bar {
    display: flex; align-items: center; gap: 10px;
    flex-wrap: wrap; margin-bottom: 14px;
    padding: 10px 14px;
    background: #0d1117; border: 1px solid #21262d; border-radius: 8px;

    .filter-group { display: flex; align-items: center; gap: 6px; }

    label {
      font-size: 11px; text-transform: uppercase;
      letter-spacing: 0.05em; color: rgba(201,209,217,0.45); white-space: nowrap;
    }

    select, input[type="date"], input[type="text"] {
      background: #161b22; border: 1px solid #30363d; border-radius: 5px;
      color: #c9d1d9; padding: 5px 9px; font-size: 12px;
      font-family: 'Roboto Mono', monospace; cursor: pointer;
      &:focus { outline: none; border-color: #58a6ff; }
    }

    input[type="text"] {
      width: 200px;
      &::placeholder { color: rgba(201,209,217,0.3); }
    }
    input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.6); cursor: pointer; }

    .divider { width: 1px; height: 20px; background: #21262d; margin: 0 4px; }

    .search-clear {
      background: none; border: none; color: #8b949e;
      cursor: pointer; font-size: 14px; padding: 0 2px; line-height: 1;
      &:hover { color: #f0f6fc; }
    }

    .cluster-toggle {
      display: flex; align-items: center; gap: 6px;
      padding: 5px 11px;
      background: #161b22; border: 1px solid #30363d; border-radius: 5px;
      color: #c9d1d9; font-size: 12px; cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      &:hover { background: #21262d; }
      &.on { border-color: #8957e5; color: #c8b3ff; background: #1a1030; }
      .dot {
        width: 8px; height: 8px; border-radius: 50%;
        background: #8957e5; flex-shrink: 0;
      }
    }

    .refresh-btn {
      margin-left: auto;
      background: #21262d; border: 1px solid #30363d; border-radius: 6px;
      color: #c9d1d9; padding: 5px 13px; font-size: 12px; cursor: pointer;
      display: flex; align-items: center; gap: 5px; transition: background 0.15s;
      white-space: nowrap;
      &:hover { background: #30363d; color: #f0f6fc; }
      &:disabled { opacity: 0.4; cursor: default; }
    }
  }

  .no-results, .loading-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 400px; background: #0d1117; border: 1px solid #21262d; border-radius: 12px;
    gap: 10px; color: rgba(201,209,217,0.4);
    .icon { font-size: 32px; opacity: 0.35; }
    p { margin: 0; font-size: 13px; }
    .sub { font-size: 11px; }
  }

  .loading-state {
    font-size: 13px;
    .spinner {
      width: 26px; height: 26px;
      border: 3px solid #21262d; border-top-color: #3fb950;
      border-radius: 50%; animation: spin 0.75s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  }

  .result-info {
    margin-bottom: 10px; font-size: 12px; color: rgba(201,209,217,0.5);
    display: flex; align-items: center; gap: 8px;
    .tag {
      background: #1f2937; border: 1px solid #374151; border-radius: 4px;
      padding: 1px 7px; font-family: 'Roboto Mono', monospace; color: #e3b341;
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

/**
 * Given a set of node IDs and a set of expanded cluster roots,
 * return the "display ID" for a node:
 *   - if the node belongs to an UNEXPANDED cluster root → the cluster root ID
 *   - otherwise → its own ID
 *
 * A node belongs to cluster root R when:
 *   id.startsWith(R + ':') && R itself is a real account prefix
 */
function getClusterRoot(id, clusterMap) {
  return clusterMap.get(id) || id;
}

/**
 * Build a clusterMap: nodeId → clusterRootId
 * A cluster root is the shortest @prefix that has at least 2 children.
 * We only cluster if clusteringEnabled.
 */
function buildClusterMap(allIds, expandedRoots) {
  // Find all potential roots (accounts that appear as prefix of others)
  const roots = new Map(); // rootId → [childIds]
  const idArr = Array.from(allIds);

  idArr.forEach(id => {
    // Walk up the prefix chain
    const parts = id.split(':');
    if (parts.length < 2) return;
    // potential root is everything except last segment
    const root = parts.slice(0, parts.length - 1).join(':');
    if (!roots.has(root)) roots.set(root, []);
    roots.get(root).push(id);
  });

  const clusterMap = new Map(); // childId → rootId

  roots.forEach((children, root) => {
    // Only cluster if root has 2+ children AND root itself is NOT expanded
    if (children.length < 2) return;
    if (expandedRoots.has(root)) return;

    children.forEach(child => {
      // Only cluster a child if the child itself is not also a root with expanded state
      if (!expandedRoots.has(child)) {
        clusterMap.set(child, root);
      }
    });
  });

  return clusterMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

class TransactionGraph extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      // Raw data
      rawTransactions: [],
      availableAssets: [],
      dateRange: { min: '', max: '' },

      // Filters
      filterAsset: 'all',
      filterDateFrom: '',
      filterDateTo: '',
      searchQuery: '',
      maxNodes: 60,
      clusteringEnabled: true,

      // Cluster state: set of root IDs that have been manually expanded
      expandedRoots: new Set(),

      // Derived graph
      nodes: [],
      links: [],
      highlightedIds: new Set(),
      totalNodes: 0,
      limited: false,

      // UI
      loading: true,
      ready: false,

      // Edge detail panel
      selectedEdge: null,   // { link, transactions }
    };

    this._searchTimer = null;
    this.fetch              = this.fetch.bind(this);
    this.applyFilters       = this.applyFilters.bind(this);
    this.handleSearch       = this.handleSearch.bind(this);
    this.handleClusterToggle = this.handleClusterToggle.bind(this);
    this.handleEdgeClick    = this.handleEdgeClick.bind(this);
  }

  componentDidMount() { this.fetch(); }
  componentWillUnmount() { clearTimeout(this._searchTimer); }

  // ── Fetch all pages ──────────────────────────────────────────────────────
  fetch() {
    this.setState({ loading: true, ready: false });
    const all = [];

    const fetchPage = query =>
      ledger().getTransactions(query).then(data => {
        const page = data.cursor.data || [];
        all.push(...page);
        if (page.length > 0 && page.length >= data.cursor.page_size)
          return fetchPage({ after: page[page.length-1].txid });
        return all;
      });

    fetchPage({}).then(txs => {
      const assets = new Set();
      let minTs = Infinity, maxTs = -Infinity;
      txs.forEach(tx => {
        if (tx.timestamp < minTs) minTs = tx.timestamp;
        if (tx.timestamp > maxTs) maxTs = tx.timestamp;
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
    }).catch(() => this.setState({ loading: false, ready: true }));
  }

  // ── Build graph ──────────────────────────────────────────────────────────
  applyFilters() {
    const {
      rawTransactions, filterAsset, filterDateFrom, filterDateTo,
      searchQuery, maxNodes, clusteringEnabled, expandedRoots,
    } = this.state;

    const dateFrom = filterDateFrom ? new Date(filterDateFrom).getTime() : 0;
    const dateTo   = filterDateTo   ? new Date(filterDateTo + 'T23:59:59').getTime() : Infinity;

    // 1. Collect raw accounts and links from filtered transactions
    const accountsMap = new Map();  // id → { id, type }
    const linksMap    = new Map();  // key → link

    rawTransactions.forEach(tx => {
      if (tx.timestamp < dateFrom || tx.timestamp > dateTo) return;
      tx.postings.forEach(p => {
        if (filterAsset !== 'all' && p.asset !== filterAsset) return;
        if (!accountsMap.has(p.source))      accountsMap.set(p.source,      { id: p.source,      type: nodeType(p.source) });
        if (!accountsMap.has(p.destination)) accountsMap.set(p.destination, { id: p.destination, type: nodeType(p.destination) });
        const key = `${p.source}||${p.destination}||${p.asset}`;
        if (linksMap.has(key)) {
          const e = linksMap.get(key);
          e.amount += p.amount; e.count += 1;
        } else {
          linksMap.set(key, { id: key, source: p.source, target: p.destination, asset: p.asset, amount: p.amount, count: 1, originalSources: new Set([p.source]), originalTargets: new Set([p.destination]) });
        }
      });
    });

    // 2. Search ego-network filter
    const query = searchQuery.trim().toLowerCase();
    let highlightedIds = new Set();

    if (query) {
      const matchedIds = new Set(Array.from(accountsMap.keys()).filter(id => id.toLowerCase().includes(query)));
      if (matchedIds.size > 0) {
        highlightedIds = matchedIds;
        const egoIds = new Set(matchedIds);
        linksMap.forEach(l => {
          if (matchedIds.has(l.source)) egoIds.add(l.target);
          if (matchedIds.has(l.target)) egoIds.add(l.source);
        });
        for (const id of accountsMap.keys()) if (!egoIds.has(id)) accountsMap.delete(id);
        for (const [k, l] of linksMap.entries()) if (!egoIds.has(l.source) || !egoIds.has(l.target)) linksMap.delete(k);
      } else {
        accountsMap.clear(); linksMap.clear();
      }
    }

    // 3. Clustering
    let nodes, links;

    if (clusteringEnabled) {
      const clusterMap = buildClusterMap(accountsMap.keys(), expandedRoots);

      // Build cluster nodes + pass-through nodes
      const nodeOutMap = new Map(); // displayId → node
      accountsMap.forEach((n, id) => {
        const root = getClusterRoot(id, clusterMap);
        if (root !== id) {
          // This node is absorbed into a cluster
          if (!nodeOutMap.has(root)) {
            nodeOutMap.set(root, {
              id: root, type: 'account', isCluster: true,
              childCount: 0, childIds: new Set(),
            });
          }
          const clNode = nodeOutMap.get(root);
          clNode.childCount += 1;
          clNode.childIds.add(id);
        } else {
          if (!nodeOutMap.has(id)) nodeOutMap.set(id, { ...n, isCluster: false });
        }
      });

      // Reroute links through cluster display IDs
      const linkOutMap = new Map();
      linksMap.forEach(l => {
        const src = getClusterRoot(l.source, clusterMap);
        const tgt = getClusterRoot(l.target, clusterMap);
        if (src === tgt) return; // internal cluster link, skip

        const key = `${src}||${tgt}||${l.asset}`;
        if (linkOutMap.has(key)) {
          const e = linkOutMap.get(key);
          e.amount += l.amount; e.count += l.count;
          e.originalSources.add(l.source);
          e.originalTargets.add(l.target);
        } else {
          linkOutMap.set(key, {
            id: key, source: src, target: tgt,
            sourceId: src, targetId: tgt,
            asset: l.asset, amount: l.amount, count: l.count,
            originalSources: new Set([l.source]),
            originalTargets: new Set([l.target]),
          });
        }
      });

      nodes = Array.from(nodeOutMap.values());
      links = Array.from(linkOutMap.values());
    } else {
      nodes = Array.from(accountsMap.values()).map(n => ({ ...n, isCluster: false }));
      links = Array.from(linksMap.values()).map(l => ({ ...l, sourceId: l.source, targetId: l.target }));
    }

    // 4. Max nodes cap (top N by volume)
    const totalNodes = nodes.length;
    let limited = false;
    if (!query && maxNodes !== 'all' && nodes.length > maxNodes) {
      limited = true;
      const volMap = new Map();
      links.forEach(l => {
        volMap.set(l.source, (volMap.get(l.source)||0) + l.amount);
        volMap.set(l.target, (volMap.get(l.target)||0) + l.amount);
      });
      nodes.sort((a,b) => (volMap.get(b.id)||0) - (volMap.get(a.id)||0));
      const kept = new Set(nodes.slice(0, maxNodes).map(n => n.id));
      nodes = nodes.filter(n => kept.has(n.id));
      links = links.filter(l => kept.has(l.source) && kept.has(l.target));
    }

    this.setState({ nodes, links, highlightedIds, totalNodes, limited, ready: true, loading: false });
  }

  // ── Cluster toggle ───────────────────────────────────────────────────────
  handleClusterToggle(clusterId) {
    this.setState(prev => {
      const next = new Set(prev.expandedRoots);
      if (next.has(clusterId)) {
        next.delete(clusterId);
      } else {
        next.add(clusterId);
      }
      return { expandedRoots: next };
    }, this.applyFilters);
  }

  // ── Edge click → open detail panel ──────────────────────────────────────
  handleEdgeClick(linkData) {
    const { rawTransactions } = this.state;
    const sources = linkData.originalSources || new Set([linkData.source?.id || linkData.source]);
    const targets = linkData.originalTargets || new Set([linkData.target?.id || linkData.target]);
    const asset   = linkData.asset;

    // Find transactions that contain at least one matching posting
    const txs = rawTransactions.filter(tx =>
      tx.postings.some(p => sources.has(p.source) && targets.has(p.destination) && p.asset === asset)
    );

    this.setState({ selectedEdge: { link: linkData, transactions: txs } });
  }

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
      searchQuery, maxNodes, dateRange, totalNodes, limited,
      clusteringEnabled, selectedEdge,
    } = this.state;

    const hasSearch = searchQuery.trim().length > 0;
    const noResults = ready && nodes.length === 0;

    return (
      <Wrapper>
        <div className="top-container mt20 mb40">

          <div className="page-header">
            <div>
              <h1>Transaction Graph</h1>
              <p>Interactive fund flow visualization — accounts as nodes, transfers as edges</p>
            </div>
          </div>

          <div className="filter-bar">

            {/* Search */}
            <div className="filter-group">
              <label>Search</label>
              <input type="text" placeholder="account name…" value={searchQuery} onChange={this.handleSearch} />
              {hasSearch && (
                <button className="search-clear" onClick={() => this.setState({ searchQuery: '' }, this.applyFilters)}>✕</button>
              )}
            </div>

            <div className="divider" />

            {/* Asset */}
            <div className="filter-group">
              <label>Asset</label>
              <select value={filterAsset} onChange={e => this.setState({ filterAsset: e.target.value }, this.applyFilters)}>
                <option value="all">All assets</option>
                {availableAssets.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div className="divider" />

            {/* Date range */}
            <div className="filter-group">
              <label>From</label>
              <input type="date" value={filterDateFrom} min={dateRange.min} max={filterDateTo || dateRange.max}
                onChange={e => this.setState({ filterDateFrom: e.target.value }, this.applyFilters)} />
            </div>
            <div className="filter-group">
              <label>To</label>
              <input type="date" value={filterDateTo} min={filterDateFrom || dateRange.min} max={dateRange.max}
                onChange={e => this.setState({ filterDateTo: e.target.value }, this.applyFilters)} />
            </div>

            <div className="divider" />

            {/* Max nodes */}
            <div className="filter-group">
              <label>Max nodes</label>
              <select value={maxNodes} onChange={e => {
                const v = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
                this.setState({ maxNodes: v }, this.applyFilters);
              }}>
                {[25, 50, 60, 100].map(n => <option key={n} value={n}>{n}</option>)}
                <option value="all">All</option>
              </select>
            </div>

            <div className="divider" />

            {/* Clustering toggle */}
            <button
              className={`cluster-toggle${clusteringEnabled ? ' on' : ''}`}
              onClick={() => this.setState(p => ({ clusteringEnabled: !p.clusteringEnabled, expandedRoots: new Set() }), this.applyFilters)}
            >
              <div className="dot" />
              {clusteringEnabled ? 'Clustering on' : 'Clustering off'}
            </button>

            <button className="refresh-btn" onClick={this.fetch} disabled={loading}>
              {loading ? '…' : '↻'} Refresh
            </button>
          </div>

          {/* Result info */}
          {ready && !noResults && (
            <div className="result-info">
              {hasSearch && (
                <>Ego network of <span className="tag">{searchQuery}</span> — {nodes.length} nodes, {links.length} flows</>
              )}
              {!hasSearch && limited && (
                <>Showing top {nodes.length} / {totalNodes} nodes by volume · {links.length} flows</>
              )}
              {!hasSearch && !limited && (
                <>{nodes.length} nodes · {links.length} flows</>
              )}
            </div>
          )}

          {loading && (
            <div className="loading-state">
              <div className="spinner" />
              <span>Loading transactions…</span>
            </div>
          )}

          {noResults && !loading && (
            <div className="no-results">
              <div className="icon">◎</div>
              {hasSearch
                ? <p>No account matching <strong>"{searchQuery}"</strong></p>
                : <p>No transactions found</p>
              }
              <span className="sub">
                {hasSearch ? 'Try a different search term' : 'Execute some FaRl scripts to see fund flows here'}
              </span>
            </div>
          )}

          {ready && nodes.length > 0 && (
            <GraphVisualization
              nodes={nodes}
              links={links}
              highlightedIds={highlightedIds}
              onClusterToggle={this.handleClusterToggle}
              onEdgeClick={this.handleEdgeClick}
            />
          )}
        </div>

        {/* Edge detail panel */}
        {selectedEdge && (
          <EdgeDetailPanel
            edge={selectedEdge}
            onClose={() => this.setState({ selectedEdge: null })}
          />
        )}
      </Wrapper>
    );
  }
}

export default TransactionGraph;
