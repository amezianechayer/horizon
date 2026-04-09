import * as React from 'react';
import styled from 'styled-components';
import fetchAllTransactions from '../lib/fetchAllTransactions';
import GraphVisualization, { bfsPath } from '../components/GraphVisualization.jsx';
import EdgeDetailPanel from '../components/EdgeDetailPanel.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
  padding-bottom: 48px;

  .page-header {
    padding: 20px 0 16px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 16px;
    display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 12px;

    h1 { font-size: 20px; font-weight: 700; color: var(--text-1); letter-spacing: -0.02em; margin-bottom: 2px; }
    p  { font-size: 13px; color: var(--text-3); }
  }

  .layout-switcher {
    display: flex; gap: 3px;
    background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r); padding: 3px;

    button {
      padding: 4px 11px; border-radius: var(--r-sm); background: none; border: none;
      font-size: 11px; font-weight: 500; color: var(--text-3); cursor: pointer; transition: all var(--t);
      &.active { background: var(--surface-3); color: var(--text-1); }
      &:hover:not(.active) { color: var(--text-2); }
    }
  }

  .filter-bar {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    margin-bottom: 12px; padding: 10px 14px;
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md);

    label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-3); white-space: nowrap; }

    select, input[type="date"], input[type="text"] {
      background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-sm);
      color: var(--text-1); padding: 5px 9px; font-size: 12px; font-family: var(--font-mono);
      &:focus { outline: none; border-color: var(--accent); }
    }
    input[type="text"] { width: 180px; &::placeholder { color: var(--text-3); } }
    input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.55); cursor: pointer; }

    .divider { width: 1px; height: 20px; background: var(--border-2); flex-shrink: 0; }
    .btn-ghost { background: none; border: 1px solid transparent; border-radius: var(--r-sm); color: var(--text-3); padding: 4px 7px; font-size: 12px; cursor: pointer; transition: all var(--t); &:hover { color: var(--red); border-color: rgba(255,92,92,0.3); } }
  }

  /* ── Path tracer ── */
  .path-tracer {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    padding: 10px 14px;
    background: var(--blue-dim);
    border: 1px solid rgba(77,168,255,0.18);
    border-radius: var(--r-md);
    margin-bottom: 12px;
    font-size: 12px;

    .pt-label { color: var(--blue); font-weight: 600; font-size: 11px; white-space: nowrap; min-width: 80px; }
    .pt-arrow { color: var(--text-3); font-size: 16px; }
    .pt-clear { background: none; border: none; color: var(--text-3); cursor: pointer; font-size: 15px; transition: color var(--t); &:hover { color: var(--red); } }

    .pt-field {
      position: relative;
      flex: 1; min-width: 160px; max-width: 240px;

      input {
        width: 100%; box-sizing: border-box;
        background: var(--surface); border: 1px solid rgba(77,168,255,0.3); border-radius: var(--r-sm);
        color: var(--text-1); padding: 6px 10px; font-size: 12px; font-family: var(--font-mono);
        &:focus { outline: none; border-color: var(--blue); }
        &::placeholder { color: var(--text-3); }
      }

      .pt-suggest {
        position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 200;
        background: var(--surface);
        border: 1px solid var(--border-2);
        border-radius: var(--r-md);
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        max-height: 180px; overflow-y: auto;

        .sug-item {
          padding: 7px 10px;
          font-size: 11px; font-family: var(--font-mono);
          color: var(--text-2); cursor: pointer;
          border-bottom: 1px solid var(--border);
          transition: background var(--t);
          display: flex; align-items: center; gap: 6px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;

          &:last-child { border-bottom: none; }
          &:hover, &.active { background: var(--surface-3); color: var(--text-1); }

          .sug-type { font-size: 9px; padding: 1px 5px; border-radius: 3px; flex-shrink: 0; }
        }
      }
    }

    .pt-result {
      display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
      padding: 5px 11px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r);
      font-family: var(--font-mono); font-size: 11px; color: var(--text-2);

      &.found { border-color: rgba(0,208,132,0.3); color: var(--accent); background: var(--accent-dim); }
      &.not-found { border-color: rgba(255,92,92,0.3); color: var(--red); background: var(--red-dim); }

      .pt-hop { display: inline-flex; align-items: center; gap: 4px; }
      .pt-step {
        display: inline-block; padding: 1px 7px; border-radius: 3px;
        background: rgba(0,208,132,0.15); border: 1px solid rgba(0,208,132,0.25);
        color: var(--accent); font-size: 10px; cursor: pointer;
        transition: background var(--t);
        max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        vertical-align: middle;
        &:hover { background: rgba(0,208,132,0.3); }
      }
      .pt-step-arrow { color: var(--text-3); font-size: 12px; }
    }
  }

  .depth-bar {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r);
    margin-bottom: 12px;
    font-size: 12px;
    color: var(--text-2);

    label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-3); white-space: nowrap; }

    input[type=range] {
      -webkit-appearance: none; height: 4px;
      background: var(--surface-3); border-radius: 2px; cursor: pointer; flex: 1; max-width: 160px;
      &::-webkit-slider-thumb {
        -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%;
        background: var(--accent); border: 2px solid var(--bg); cursor: pointer;
        box-shadow: 0 0 6px var(--accent);
      }
    }

    .depth-val {
      font-family: var(--font-mono); font-size: 13px; font-weight: 700;
      color: var(--accent); min-width: 20px;
    }

    .depth-desc { font-size: 11px; color: var(--text-3); }
  }

  .info-bar {
    font-size: 12px; color: var(--text-3); margin-bottom: 10px;
    display: flex; align-items: center; gap: 8px;

    .tag { background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 1px 7px; font-family: var(--font-mono); color: var(--yellow); }
  }

  .loading-state, .empty-state-graph {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    min-height: 380px; background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); gap: 10px; color: var(--text-3); font-size: 13px;
    .empty-icon { font-size: 32px; opacity: 0.25; }
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

function toISODate(ts) { return new Date(ts).toISOString().slice(0, 10); }

function buildClusterMap(allIds, expandedRoots) {
  const roots = new Map();
  Array.from(allIds).forEach(id => {
    const parts = id.split(':');
    if (parts.length < 2) return;
    const root = parts.slice(0, parts.length-1).join(':');
    if (!roots.has(root)) roots.set(root, []);
    roots.get(root).push(id);
  });
  const map = new Map();
  roots.forEach((children, root) => {
    if (children.length < 2 || expandedRoots.has(root)) return;
    children.forEach(child => { if (!expandedRoots.has(child)) map.set(child, root); });
  });
  return map;
}

const TYPE_COLOR = { world: '#ff5c5c', sub: '#4da8ff', account: '#00d084', cluster: '#9b7de8' };
const LAYOUTS = ['force', 'hierarchical', 'radial'];
const LAYOUT_LABELS = { force: 'Force', hierarchical: 'Hierarchy', radial: 'Radial' };

// ─────────────────────────────────────────────────────────────────────────────
// Autocomplete input
// ─────────────────────────────────────────────────────────────────────────────

function AutoInput({ value, onChange, placeholder, suggestions, onSelect }) {
  const [open, setOpen] = React.useState(false);
  const [cursor, setCursor] = React.useState(0);
  const ref = React.useRef(null);

  // Close on outside click
  React.useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = value.trim()
    ? suggestions.filter(s => s.id.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
    : suggestions.slice(0, 8);

  function handleKey(e) {
    if (!open || filtered.length === 0) {
      if (e.key === 'Enter') { e.preventDefault(); setOpen(false); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c+1, filtered.length-1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c-1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); onSelect(filtered[cursor].id); setOpen(false); }
    else if (e.key === 'Escape') { setOpen(false); }
  }

  return (
    <div className="pt-field" ref={ref}>
      <input
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true); setCursor(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
      />
      {open && filtered.length > 0 && (
        <div className="pt-suggest">
          {filtered.map((s, i) => (
            <div
              key={s.id}
              className={`sug-item${i === cursor ? ' active' : ''}`}
              onMouseDown={() => { onSelect(s.id); setOpen(false); }}
            >
              <span className="sug-type" style={{background: TYPE_COLOR[s.type]+'22', color: TYPE_COLOR[s.type]}}>
                {s.type.slice(0,1).toUpperCase()}
              </span>
              {s.id}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

class TransactionGraph extends React.Component {
  constructor(props) {
    super(props);
    const params = new URLSearchParams(window.location.search);
    const initSearch = params.get('search') || '';
    this.state = {
      rawTransactions: [], availableAssets: [], dateRange: { min:'', max:'' },
      filterAsset: 'all', filterDateFrom: '', filterDateTo: '',
      searchQuery: initSearch, maxNodes: 60, depth: 2,
      clusteringEnabled: true, expandedRoots: new Set(),
      layoutMode: 'force',
      pathSrc: '', pathDst: '', pathResult: null,
      nodes: [], links: [], highlightedIds: new Set(),
      totalNodes: 0, limited: false, loading: true, ready: false,
      selectedEdge: null,
    };
    this._searchTimer = null;
    this.fetch               = this.fetch.bind(this);
    this.applyFilters        = this.applyFilters.bind(this);
    this.handleSearch        = this.handleSearch.bind(this);
    this.handleClusterToggle = this.handleClusterToggle.bind(this);
    this.handleEdgeClick     = this.handleEdgeClick.bind(this);
    this.runPathTrace        = this.runPathTrace.bind(this);
  }

  componentDidMount() { this.fetch(); }
  componentWillUnmount() { clearTimeout(this._searchTimer); }

  fetch() {
    this.setState({ loading: true, ready: false });
    fetchAllTransactions().then(txs => {
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
        rawTransactions: txs, availableAssets: Array.from(assets).sort(),
        dateRange: { min: minDate, max: maxDate },
        filterDateFrom: minDate, filterDateTo: maxDate,
      }, this.applyFilters);
    }).catch(() => this.setState({ loading: false, ready: true }));
  }

  applyFilters() {
    const {
      rawTransactions, filterAsset, filterDateFrom, filterDateTo,
      searchQuery, maxNodes, clusteringEnabled, expandedRoots, depth,
    } = this.state;

    const dateFrom = filterDateFrom ? new Date(filterDateFrom).getTime() : 0;
    const dateTo   = filterDateTo   ? new Date(filterDateTo+'T23:59:59').getTime() : Infinity;

    const accountsMap = new Map();
    const linksMap    = new Map();

    rawTransactions.forEach(tx => {
      if (tx.timestamp < dateFrom || tx.timestamp > dateTo) return;
      tx.postings.forEach(p => {
        if (filterAsset !== 'all' && p.asset !== filterAsset) return;
        if (!accountsMap.has(p.source))      accountsMap.set(p.source,      { id: p.source,      type: nodeType(p.source) });
        if (!accountsMap.has(p.destination)) accountsMap.set(p.destination, { id: p.destination, type: nodeType(p.destination) });
        const key = `${p.source}||${p.destination}||${p.asset}`;
        if (linksMap.has(key)) { const e = linksMap.get(key); e.amount+=p.amount; e.count+=1; }
        else linksMap.set(key, { id:key, source:p.source, target:p.destination, asset:p.asset,
          amount:p.amount, count:1, originalSources:new Set([p.source]), originalTargets:new Set([p.destination]) });
      });
    });

    // Search + depth expansion
    const query = searchQuery.trim().toLowerCase();
    let highlightedIds = new Set();
    if (query) {
      const matched = new Set(Array.from(accountsMap.keys()).filter(id => id.toLowerCase().includes(query)));
      if (matched.size > 0) {
        highlightedIds = matched;
        // BFS expansion up to `depth` hops
        let frontier = new Set(matched);
        const ego = new Set(matched);
        for (let hop = 0; hop < depth; hop++) {
          const next = new Set();
          linksMap.forEach(l => {
            if (frontier.has(l.source) && !ego.has(l.target)) { ego.add(l.target); next.add(l.target); }
            if (frontier.has(l.target) && !ego.has(l.source)) { ego.add(l.source); next.add(l.source); }
          });
          frontier = next;
          if (!frontier.size) break;
        }
        for (const id of accountsMap.keys()) if (!ego.has(id)) accountsMap.delete(id);
        for (const [k,l] of linksMap.entries()) if (!ego.has(l.source)||!ego.has(l.target)) linksMap.delete(k);
      } else { accountsMap.clear(); linksMap.clear(); }
    }

    // Clustering
    let nodes, links;
    if (clusteringEnabled) {
      const cmap = buildClusterMap(accountsMap.keys(), expandedRoots);
      const nodeOut = new Map();
      accountsMap.forEach((n, id) => {
        const root = cmap.get(id)||id;
        if (root !== id) {
          if (!nodeOut.has(root)) nodeOut.set(root, { id:root, type:'account', isCluster:true, childCount:0, childIds:new Set() });
          const c = nodeOut.get(root); c.childCount++; c.childIds.add(id);
        } else { if (!nodeOut.has(id)) nodeOut.set(id, { ...n, isCluster:false }); }
      });
      const linkOut = new Map();
      linksMap.forEach(l => {
        const src = cmap.get(l.source)||l.source, tgt = cmap.get(l.target)||l.target;
        if (src===tgt) return;
        const key = `${src}||${tgt}||${l.asset}`;
        if (linkOut.has(key)) { const e=linkOut.get(key); e.amount+=l.amount; e.count+=l.count; e.originalSources.add(l.source); e.originalTargets.add(l.target); }
        else linkOut.set(key, { id:key, source:src, target:tgt, sourceId:src, targetId:tgt, asset:l.asset,
          amount:l.amount, count:l.count, originalSources:new Set([l.source]), originalTargets:new Set([l.target]) });
      });
      nodes = Array.from(nodeOut.values());
      links = Array.from(linkOut.values());
    } else {
      nodes = Array.from(accountsMap.values()).map(n => ({ ...n, isCluster:false }));
      links = Array.from(linksMap.values()).map(l => ({ ...l, sourceId:l.source, targetId:l.target }));
    }

    // Max nodes cap
    const totalNodes = nodes.length;
    let limited = false;
    if (!query && maxNodes !== 'all' && nodes.length > maxNodes) {
      limited = true;
      const vol = new Map();
      links.forEach(l => { vol.set(l.source,(vol.get(l.source)||0)+l.amount); vol.set(l.target,(vol.get(l.target)||0)+l.amount); });
      nodes.sort((a,b) => (vol.get(b.id)||0)-(vol.get(a.id)||0));
      const kept = new Set(nodes.slice(0, maxNodes).map(n => n.id));
      nodes = nodes.filter(n => kept.has(n.id));
      links = links.filter(l => kept.has(l.source)&&kept.has(l.target));
    }

    this.setState({ nodes, links, highlightedIds, totalNodes, limited, ready:true, loading:false }, () => {
      if (this.state.pathSrc && this.state.pathDst) this.runPathTrace();
    });
  }

  runPathTrace() {
    const { nodes, links, pathSrc, pathDst } = this.state;
    if (!pathSrc || !pathDst) { this.setState({ pathResult: null }); return; }

    const nodeIds = nodes.map(n => n.id);

    // Resolve input to a node ID — exact, then partial match
    function resolveId(input) {
      const exact = nodeIds.find(id => id === input);
      if (exact) return exact;
      const lower = input.toLowerCase();
      // Try sub-string match
      const partial = nodeIds.find(id => id.toLowerCase() === lower);
      if (partial) return partial;
      const contains = nodeIds.find(id => id.toLowerCase().includes(lower));
      if (contains) return contains;
      return null;
    }

    const src = resolveId(pathSrc);
    const dst = resolveId(pathDst);

    if (!src || !dst) {
      this.setState({ pathResult: { path: [], found: false, error: `Account not found in current graph` } });
      return;
    }

    const find = bfsPath(nodeIds, links);
    const path = find(src, dst);
    this.setState({ pathResult: path ? { path, found: true } : { path: [], found: false } });
  }

  handleClusterToggle(id) {
    this.setState(p => {
      const next = new Set(p.expandedRoots);
      next.has(id) ? next.delete(id) : next.add(id);
      return { expandedRoots: next };
    }, this.applyFilters);
  }

  handleEdgeClick(linkData) {
    const { rawTransactions } = this.state;
    const src = linkData.originalSources || new Set([linkData.source?.id||linkData.source]);
    const tgt = linkData.originalTargets || new Set([linkData.target?.id||linkData.target]);
    const asset = linkData.asset;
    const txs = rawTransactions.filter(tx =>
      tx.postings.some(p => src.has(p.source) && tgt.has(p.destination) && p.asset===asset)
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
      clusteringEnabled, selectedEdge, layoutMode, depth,
      pathSrc, pathDst, pathResult,
    } = this.state;

    const hasSearch  = searchQuery.trim().length > 0;
    const noResults  = ready && nodes.length === 0;
    const pathTrace  = pathResult ? { path: pathResult.path } : null;

    // Node suggestions for autocomplete (sorted by type priority)
    const nodeSuggestions = [...nodes].sort((a,b) => {
      const p = { world:0, account:1, sub:2, cluster:3 };
      return (p[a.type]||1) - (p[b.type]||1);
    });

    return (
      <Wrapper>
        <div className="top-container">
          <div className="page-header">
            <div>
              <h1>Transaction Graph</h1>
              <p>Fund flow visualization · {nodes.length} nodes · {links.length} flows</p>
            </div>
            <div className="layout-switcher">
              {LAYOUTS.map(l => (
                <button key={l} className={layoutMode===l?'active':''} onClick={()=>this.setState({layoutMode:l})}>
                  {LAYOUT_LABELS[l]}
                </button>
              ))}
            </div>
          </div>

          {/* Filter bar */}
          <div className="filter-bar">
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <label>Search</label>
              <input type="text" placeholder="account name…" value={searchQuery} onChange={this.handleSearch} />
              {hasSearch && <button className="btn-ghost" onClick={()=>this.setState({searchQuery:''},this.applyFilters)}>✕</button>}
            </div>
            <div className="divider"/>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <label>Asset</label>
              <select value={filterAsset} onChange={e=>this.setState({filterAsset:e.target.value},this.applyFilters)}>
                <option value="all">All</option>
                {availableAssets.map(a=><option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="divider"/>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <label>From</label>
              <input type="date" value={filterDateFrom} min={dateRange.min} max={filterDateTo||dateRange.max}
                onChange={e=>this.setState({filterDateFrom:e.target.value},this.applyFilters)}/>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <label>To</label>
              <input type="date" value={filterDateTo} min={filterDateFrom||dateRange.min} max={dateRange.max}
                onChange={e=>this.setState({filterDateTo:e.target.value},this.applyFilters)}/>
            </div>
            <div className="divider"/>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <label>Nodes</label>
              <select value={maxNodes} onChange={e=>{const v=e.target.value==='all'?'all':parseInt(e.target.value,10);this.setState({maxNodes:v},this.applyFilters);}}>
                {[25,50,60,100].map(n=><option key={n} value={n}>{n}</option>)}
                <option value="all">All</option>
              </select>
            </div>
            <div className="divider"/>
            <button
              className={`btn${clusteringEnabled?' btn-accent':''}`}
              onClick={()=>this.setState(p=>({clusteringEnabled:!p.clusteringEnabled,expandedRoots:new Set()}),this.applyFilters)}>
              ◈ {clusteringEnabled?'Clustering on':'Clustering off'}
            </button>
            <button className="btn" onClick={this.fetch} disabled={loading} style={{marginLeft:'auto'}}>
              {loading ? <span className="spinner" style={{width:13,height:13,borderWidth:2}}/> : '↻'} Refresh
            </button>
          </div>

          {/* Depth bar (only when searching) */}
          {hasSearch && (
            <div className="depth-bar">
              <label>Hop depth</label>
              <input type="range" min={1} max={5} value={depth}
                onChange={e=>this.setState({depth:parseInt(e.target.value,10)},this.applyFilters)}/>
              <span className="depth-val">{depth}</span>
              <span className="depth-desc">
                {depth === 1 ? 'direct connections only' : `up to ${depth} hops from search`}
              </span>
            </div>
          )}

          {/* Path tracer */}
          <div className="path-tracer">
            <span className="pt-label">◈ Path Tracer</span>

            <AutoInput
              value={pathSrc}
              placeholder="Source account…"
              suggestions={nodeSuggestions}
              onChange={v => this.setState({ pathSrc: v, pathResult: null })}
              onSelect={v => this.setState({ pathSrc: v, pathResult: null })}
            />

            <span className="pt-arrow">→</span>

            <AutoInput
              value={pathDst}
              placeholder="Destination account…"
              suggestions={nodeSuggestions}
              onChange={v => this.setState({ pathDst: v, pathResult: null })}
              onSelect={v => this.setState({ pathDst: v, pathResult: null })}
            />

            <button className="btn btn-accent" onClick={this.runPathTrace} disabled={!pathSrc||!pathDst}>
              Trace
            </button>

            {pathResult && (
              <div className={`pt-result${pathResult.found?' found':' not-found'}`}>
                {pathResult.found ? (
                  <div className="pt-hop">
                    {pathResult.path.map((step, i) => (
                      <React.Fragment key={step+i}>
                        {i > 0 && <span className="pt-step-arrow">›</span>}
                        <span
                          className="pt-step"
                          title={step}
                          onClick={() => this.setState({ searchQuery: step }, this.applyFilters)}
                        >
                          {step.length > 14 ? step.slice(0,13)+'…' : step}
                        </span>
                      </React.Fragment>
                    ))}
                    <span style={{marginLeft:4, color:'var(--text-3)', fontSize:10}}>
                      {pathResult.path.length-1} hop{pathResult.path.length>2?'s':''}
                    </span>
                  </div>
                ) : (
                  <span>{pathResult.error || 'No path found'}</span>
                )}
              </div>
            )}

            {(pathSrc||pathDst||pathResult) && (
              <button className="pt-clear" onClick={()=>this.setState({pathSrc:'',pathDst:'',pathResult:null})}>✕</button>
            )}
          </div>

          {/* Info bar */}
          {ready && !noResults && (
            <div className="info-bar">
              {hasSearch && <>Ego network of <span className="tag">{searchQuery}</span> · depth {depth} · {nodes.length} nodes, {links.length} flows</>}
              {!hasSearch && limited && <>Top {nodes.length}/{totalNodes} nodes · {links.length} flows (capped)</>}
              {!hasSearch && !limited && <>{nodes.length} nodes · {links.length} flows</>}
            </div>
          )}

          {loading && <div className="loading-state"><div className="spinner spinner-lg"/><span>Loading transactions…</span></div>}

          {noResults && !loading && (
            <div className="empty-state-graph">
              <div className="empty-icon">◎</div>
              <div>{hasSearch ? `No account matching "${searchQuery}"` : 'No transactions found'}</div>
            </div>
          )}

          {ready && nodes.length > 0 && (
            <GraphVisualization
              nodes={nodes} links={links}
              highlightedIds={highlightedIds}
              onClusterToggle={this.handleClusterToggle}
              onEdgeClick={this.handleEdgeClick}
              layoutMode={layoutMode}
              pathTrace={pathTrace}
            />
          )}
        </div>

        {selectedEdge && (
          <EdgeDetailPanel edge={selectedEdge} onClose={()=>this.setState({selectedEdge:null})}/>
        )}
      </Wrapper>
    );
  }
}

export default TransactionGraph;
