import * as React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import TransactionsTable from '../components/TransactionsTable.jsx';
import ledger from '../lib/ledger';

const POLL_MS = 8000;

const Wrapper = styled.div`
  padding-bottom: 60px;

  .page-header {
    display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;
    gap: 12px; padding: 20px 0 18px; border-bottom: 1px solid var(--border); margin-bottom: 20px;
  }

  .page-title { font-size: 18px; font-weight: 700; letter-spacing: -0.03em; color: var(--text-1); }

  .header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

  .view-toggle {
    display: flex; gap: 2px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r); padding: 2px;
    button {
      padding: 5px 12px; border-radius: var(--r-sm); border: none; background: none;
      font-size: 12px; font-weight: 500; color: var(--text-3); cursor: pointer; transition: all var(--t);
      &.active { background: var(--surface-3); color: var(--text-1); }
      &:hover:not(.active) { color: var(--text-2); }
    }
  }

  .live-toggle {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 6px 12px; border-radius: var(--r); font-size: 12px; font-weight: 500;
    border: 1px solid var(--border); background: var(--surface-2); color: var(--text-2);
    cursor: pointer; transition: all var(--t);

    .live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-3); transition: all var(--t); flex-shrink: 0; }

    &.on {
      border-color: var(--accent-glow); background: var(--accent-dim); color: var(--accent);
      .live-dot { background: var(--accent); box-shadow: 0 0 6px var(--accent); animation: pulse 2s infinite; }
    }
    &:hover:not(.on) { border-color: var(--border-2); color: var(--text-1); }
  }

  /* Filter bar */
  .filter-bar {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    padding: 10px 14px; margin-bottom: 16px;
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md);

    label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-3); white-space: nowrap; }

    input[type="text"], input[type="number"], input[type="date"], select {
      background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-sm);
      color: var(--text-1); padding: 5px 9px; font-size: 12px; font-family: var(--font-mono);
      &:focus { outline: none; border-color: var(--accent); }
      &::placeholder { color: var(--text-3); }
    }
    input[type="text"]   { width: 150px; }
    input[type="number"] { width: 90px; }
    input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.55); cursor: pointer; }

    .divider { width: 1px; height: 20px; background: var(--border-2); flex-shrink: 0; }

    .clear-btn {
      margin-left: auto; background: none; border: 1px solid transparent; border-radius: var(--r-sm);
      color: var(--text-3); padding: 4px 9px; font-size: 11px; cursor: pointer; transition: all var(--t);
      &:hover { color: var(--red); border-color: rgba(255,92,92,0.3); }
    }
  }

  /* New transactions banner */
  .new-banner {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 10px 16px; margin-bottom: 16px;
    background: var(--accent-dim); border: 1px solid var(--accent-glow); border-radius: var(--r);
    font-size: 13px; color: var(--accent); animation: fadeUp 0.25s ease;

    .banner-left { display: flex; align-items: center; gap: 8px; }
    .banner-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 8px var(--accent); animation: pulse 1.5s infinite; flex-shrink: 0; }
    .reload-btn { padding: 4px 12px; border-radius: var(--r); font-size: 12px; font-weight: 500; background: var(--accent); color: #000; border: none; cursor: pointer; transition: opacity var(--t); flex-shrink: 0; &:hover { opacity: 0.85; } }
  }

  /* Timeline */
  .timeline {
    position: relative;
    padding-left: 24px;

    &::before {
      content: '';
      position: absolute;
      left: 8px; top: 8px; bottom: 8px;
      width: 1px;
      background: var(--border-2);
    }
  }

  .timeline-date-sep {
    display: flex; align-items: center; gap: 10px;
    margin: 20px 0 10px;

    .tds-dot {
      position: absolute; left: 4px;
      width: 9px; height: 9px; border-radius: 50%;
      background: var(--accent); border: 2px solid var(--bg);
      box-shadow: 0 0 6px var(--accent);
    }

    .tds-label {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.07em; color: var(--text-3);
    }
  }

  .tl-item {
    position: relative;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 12px 16px;
    margin-bottom: 8px;
    transition: border-color var(--t), box-shadow var(--t);

    &:hover { border-color: var(--border-2); box-shadow: var(--shadow); }

    &::before {
      content: '';
      position: absolute;
      left: -20px; top: 50%; transform: translateY(-50%);
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--surface-3); border: 1.5px solid var(--border-2);
    }

    .tl-header {
      display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap;
      .tl-txid { font-family: var(--font-mono); font-size: 12px; color: var(--accent); font-weight: 600; }
      .tl-time { font-size: 11px; color: var(--text-3); margin-left: auto; }
    }

    .tl-postings { display: flex; flex-direction: column; gap: 5px; }

    .tl-posting {
      display: flex; align-items: center; gap: 8px; font-size: 12px; font-family: var(--font-mono);
      padding: 5px 8px; background: var(--surface-2); border-radius: var(--r-sm);
      .tl-from { color: var(--text-2); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .tl-arrow { color: var(--text-3); font-size: 11px; }
      .tl-to   { color: var(--text-2); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .tl-amount { margin-left: auto; font-weight: 600; color: var(--text-1); white-space: nowrap; }
      .tl-asset  { font-size: 10px; color: var(--text-3); margin-left: 4px; }
    }
  }

  .timeline-loading, .timeline-empty {
    padding: 40px; text-align: center; color: var(--text-3); font-size: 13px;
    display: flex; flex-direction: column; align-items: center; gap: 10px;
  }

  .tl-load-more {
    display: flex; justify-content: center; margin-top: 16px;
    button { padding: 8px 24px; font-size: 12px; }
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Timeline component (own data fetch)
// ─────────────────────────────────────────────────────────────────────────────

function Timeline({ filters }) {
  const [txs, setTxs]         = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [cursor, setCursor]   = React.useState(null);
  const [hasMore, setHasMore] = React.useState(false);

  React.useEffect(() => {
    setLoading(true); setTxs([]); setCursor(null);
    const params = {};
    if (filters.account)   params.account   = filters.account;
    if (filters.asset)     params.asset     = filters.asset;
    ledger().getTransactions(params)
      .then(res => {
        const data = res.cursor?.data || res.transactions || [];
        setTxs(data);
        setHasMore(res.cursor?.has_more || false);
        setCursor(res.cursor);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filters.account, filters.asset]);

  function loadMore() {
    if (!cursor || !hasMore) return;
    const last = txs[txs.length-1];
    if (!last) return;
    ledger().getTransactions({ after: last.txid })
      .then(res => {
        const data = res.cursor?.data || res.transactions || [];
        setTxs(t => [...t, ...data]);
        setHasMore(res.cursor?.has_more || false);
        setCursor(res.cursor);
      })
      .catch(() => {});
  }

  if (loading) {
    return (
      <div className="timeline-loading">
        <div className="spinner spinner-lg"/>
        <span>Loading transactions…</span>
      </div>
    );
  }

  if (!txs.length) {
    return <div className="timeline-empty"><span style={{fontSize:28,opacity:0.2}}>⇄</span> No transactions found</div>;
  }

  // Group by date
  const byDate = new Map();
  txs.forEach(tx => {
    const d = new Date(tx.timestamp).toLocaleDateString('en-US', { weekday:'short', year:'numeric', month:'short', day:'numeric' });
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d).push(tx);
  });

  return (
    <div>
      <div className="timeline">
        {Array.from(byDate.entries()).map(([date, dayTxs]) => (
          <div key={date}>
            <div className="timeline-date-sep">
              <div className="tds-dot"/>
              <span className="tds-label">{date}</span>
            </div>
            {dayTxs.map(tx => (
              <div className="tl-item" key={tx.txid}>
                <div className="tl-header">
                  <Link to={`/transactions`} className="tl-txid">#{tx.txid}</Link>
                  <span style={{fontSize:10, padding:'1px 6px', background:'rgba(0,208,132,0.1)', color:'var(--accent)', borderRadius:3, border:'1px solid rgba(0,208,132,0.2)'}}>completed</span>
                  <span className="tl-time">
                    {new Date(tx.timestamp).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })}
                  </span>
                </div>
                <div className="tl-postings">
                  {tx.postings.map((p, i) => {
                    const asset = p.asset.split('.')[0];
                    const prec  = p.asset.includes('.') ? parseInt(p.asset.split('.')[1], 10) : 0;
                    const val   = prec > 0 ? (p.amount / Math.pow(10, prec)).toLocaleString('fr-FR', {minimumFractionDigits:prec, maximumFractionDigits:prec}) : p.amount.toLocaleString('fr-FR');
                    return (
                      <div className="tl-posting" key={i}>
                        <Link to={`/accounts/${p.source}`} className="tl-from" title={p.source}>{p.source}</Link>
                        <span className="tl-arrow">→</span>
                        <Link to={`/accounts/${p.destination}`} className="tl-to" title={p.destination}>{p.destination}</Link>
                        <span className="tl-amount">{val}</span>
                        <span className="tl-asset">{asset}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      {hasMore && (
        <div className="tl-load-more">
          <button className="btn" onClick={loadMore}>Load more</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Transactions page
// ─────────────────────────────────────────────────────────────────────────────

function Transactions() {
  const [viewMode, setViewMode]   = React.useState('table');
  const [liveOn, setLiveOn]       = React.useState(false);
  const [newCount, setNewCount]   = React.useState(0);
  const [tableKey, setTableKey]   = React.useState(0);
  const lastTxidRef               = React.useRef(null);
  const intervalRef               = React.useRef(null);

  // Filters
  const [filterAccount, setFilterAccount] = React.useState('');
  const [filterAsset,   setFilterAsset]   = React.useState('');
  const [filterMinAmt,  setFilterMinAmt]  = React.useState('');
  const [filterMaxAmt,  setFilterMaxAmt]  = React.useState('');
  const [filterFrom,    setFilterFrom]    = React.useState('');
  const [filterTo,      setFilterTo]      = React.useState('');

  const hasFilters = filterAccount || filterAsset || filterMinAmt || filterMaxAmt || filterFrom || filterTo;

  // Build filter obj for TransactionsTable + Timeline
  const filters = React.useMemo(() => {
    const f = {};
    if (filterAccount) f.account = filterAccount;
    if (filterAsset)   f.asset   = filterAsset;
    if (filterFrom)    f.start_time = filterFrom;
    if (filterTo)      f.end_time   = filterTo + 'T23:59:59Z';
    return f;
  }, [filterAccount, filterAsset, filterFrom, filterTo]);

  // Baseline txid on mount
  React.useEffect(() => {
    ledger().getTransactions({ page_size: 1 })
      .then(res => {
        const txs = res.cursor?.data || res.transactions || [];
        if (txs.length) lastTxidRef.current = txs[0].txid;
      }).catch(() => {});
  }, []);

  // Live polling
  React.useEffect(() => {
    if (!liveOn) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      ledger().getTransactions({ page_size: 5 })
        .then(res => {
          const txs = res.cursor?.data || res.transactions || [];
          if (!txs.length) return;
          const latestId = txs[0].txid;
          if (lastTxidRef.current === null) { lastTxidRef.current = latestId; return; }
          if (latestId !== lastTxidRef.current) {
            const idx = txs.findIndex(t => t.txid === lastTxidRef.current);
            const count = idx === -1 ? txs.length : idx;
            setNewCount(c => c + count);
            lastTxidRef.current = latestId;
            // Notify navbar
            window.dispatchEvent(new CustomEvent('horizon:new-txs', { detail: { count } }));
          }
        }).catch(() => {});
    }, POLL_MS);
    return () => clearInterval(intervalRef.current);
  }, [liveOn]);

  // Reset navbar badge when this page is viewed
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('horizon:txs-viewed'));
  }, []);

  function handleReload() {
    setNewCount(0);
    setTableKey(k => k + 1);
    ledger().getTransactions({ page_size: 1 })
      .then(res => {
        const txs = res.cursor?.data || res.transactions || [];
        if (txs.length) lastTxidRef.current = txs[0].txid;
      }).catch(() => {});
  }

  function clearFilters() {
    setFilterAccount(''); setFilterAsset(''); setFilterMinAmt('');
    setFilterMaxAmt(''); setFilterFrom(''); setFilterTo('');
  }

  return (
    <Wrapper>
      <div className="top-container">
        <div className="page-header">
          <h1 className="page-title">Transactions</h1>
          <div className="header-right">
            <div className="view-toggle">
              <button className={viewMode==='table'?'active':''} onClick={()=>setViewMode('table')}>⊞ Table</button>
              <button className={viewMode==='timeline'?'active':''} onClick={()=>setViewMode('timeline')}>⊟ Timeline</button>
            </div>
            <button
              className={`live-toggle${liveOn?' on':''}`}
              onClick={() => { setLiveOn(v=>!v); setNewCount(0); }}
            >
              <span className="live-dot"/>
              {liveOn ? 'Live' : 'Live off'}
            </button>
          </div>
        </div>

        {/* Advanced filter bar */}
        <div className="filter-bar">
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <label>Account</label>
            <input type="text" placeholder="filter by account…" value={filterAccount} onChange={e=>setFilterAccount(e.target.value)}/>
          </div>
          <div className="divider"/>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <label>Asset</label>
            <input type="text" placeholder="e.g. USD" value={filterAsset} onChange={e=>setFilterAsset(e.target.value)}/>
          </div>
          <div className="divider"/>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <label>From</label>
            <input type="date" value={filterFrom} onChange={e=>setFilterFrom(e.target.value)}/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <label>To</label>
            <input type="date" value={filterTo} onChange={e=>setFilterTo(e.target.value)}/>
          </div>
          {hasFilters && <button className="clear-btn" onClick={clearFilters}>Clear filters ✕</button>}
        </div>

        {/* New transactions banner */}
        {newCount > 0 && (
          <div className="new-banner">
            <div className="banner-left">
              <span className="banner-dot"/>
              <span><strong>{newCount}</strong> new transaction{newCount > 1 ? 's' : ''} detected</span>
            </div>
            <button className="reload-btn" onClick={handleReload}>Reload</button>
          </div>
        )}

        {/* Table view */}
        {viewMode === 'table' && (
          <TransactionsTable key={`${tableKey}-${JSON.stringify(filters)}`} paginate filters={filters}/>
        )}

        {/* Timeline view */}
        {viewMode === 'timeline' && <Timeline filters={filters}/>}
      </div>
    </Wrapper>
  );
}

export default Transactions;
