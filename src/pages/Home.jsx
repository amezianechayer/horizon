import * as React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import ledger from '../lib/ledger';
import useWatchlist from '../lib/useWatchlist';

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
  padding-bottom: 60px;

  /* Hero */
  .hero {
    padding: 52px 0 40px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 36px;

    .hero-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      background: var(--accent-dim);
      border: 1px solid var(--accent-glow);
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 18px;

      .dot {
        width: 5px; height: 5px; border-radius: 50%;
        background: var(--accent);
        box-shadow: 0 0 6px var(--accent);
        animation: pulse 2s infinite;
      }
    }

    h1 {
      font-size: 36px;
      font-weight: 700;
      letter-spacing: -0.04em;
      color: var(--text-1);
      margin-bottom: 8px;
      line-height: 1.15;
    }

    .hero-sub {
      font-size: 15px;
      color: var(--text-3);
      max-width: 480px;
    }
  }

  /* Stats */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
    margin-bottom: 40px;
  }

  .stat-card {
    position: relative;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    padding: 22px 24px;
    overflow: hidden;
    transition: border-color var(--t), box-shadow var(--t);

    &:hover {
      border-color: var(--border-2);
      box-shadow: var(--shadow);
    }

    .stat-glow {
      position: absolute;
      top: -30px; right: -30px;
      width: 100px; height: 100px;
      border-radius: 50%;
      opacity: 0.05;
      pointer-events: none;
    }

    .stat-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-3);
      margin-bottom: 12px;
    }

    .stat-value {
      font-family: var(--font-mono);
      font-size: 38px;
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1;
      background: linear-gradient(135deg, var(--text-1) 60%, var(--text-2));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .stat-skeleton {
      width: 80px;
      height: 38px;
    }
  }

  /* Section header */
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;

    .section-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-3);
    }

    a {
      font-size: 12px;
      color: var(--accent);
      &:hover { text-decoration: underline; }
    }
  }

  /* Quick links */
  .quick-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
    margin-bottom: 40px;
  }

  .quick-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    color: var(--text-2);
    font-size: 13px;
    font-weight: 500;
    transition: all var(--t);

    &:hover {
      border-color: var(--accent-glow);
      background: var(--surface-2);
      color: var(--text-1);
      box-shadow: var(--glow-accent);
      transform: translateY(-1px);
    }

    .qc-left {
      display: flex; align-items: center; gap: 10px;
      .qc-icon {
        font-size: 16px;
        width: 30px; height: 30px;
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: var(--r);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        transition: border-color var(--t);
      }
    }

    .arrow { font-size: 14px; opacity: 0.35; transition: opacity var(--t), transform var(--t); }
    &:hover .arrow { opacity: 0.7; transform: translateX(2px); }
    &:hover .qc-icon { border-color: var(--accent-glow); }
  }

  /* Watchlist */
  .watchlist-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 10px;
    margin-bottom: 40px;
  }

  .watchlist-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 14px 16px;
    transition: border-color var(--t);

    &:hover { border-color: var(--border-2); }

    .wc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .wc-address {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--blue);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      min-width: 0;
    }

    .wc-remove {
      background: none;
      border: none;
      color: var(--text-3);
      font-size: 14px;
      line-height: 1;
      padding: 0 0 0 8px;
      cursor: pointer;
      flex-shrink: 0;
      transition: color var(--t);
      &:hover { color: var(--red); }
    }

    .wc-balances {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;

      .wc-bal {
        display: flex;
        align-items: baseline;
        gap: 4px;

        .bal-val {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 600;
          color: var(--text-1);
        }
        .bal-asset {
          font-size: 10px;
          color: var(--text-3);
          text-transform: uppercase;
        }
      }
    }

    .wc-empty { font-size: 12px; color: var(--text-3); }

    .wc-link {
      display: block;
      margin-top: 10px;
      font-size: 11px;
      color: var(--accent);
      &:hover { text-decoration: underline; }
    }
  }

  .watchlist-empty {
    padding: 28px;
    background: var(--surface);
    border: 1px dashed var(--border-2);
    border-radius: var(--r-md);
    text-align: center;
    color: var(--text-3);
    font-size: 13px;
    line-height: 1.7;
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// WatchlistCard
// ─────────────────────────────────────────────────────────────────────────────

function WatchlistCard({ address, onRemove }) {
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    ledger().getAccount(address).then(res => setData(res.account)).catch(() => {});
  }, [address]);

  const balances = data ? Object.entries(data.balances || {}) : [];

  return (
    <div className="watchlist-card">
      <div className="wc-header">
        <span className="wc-address">{address}</span>
        <button className="wc-remove" onClick={() => onRemove(address)} title="Remove from watchlist">×</button>
      </div>
      {!data && <div className="wc-empty">Loading…</div>}
      {data && balances.length === 0 && <div className="wc-empty">No balances</div>}
      {data && balances.length > 0 && (
        <div className="wc-balances">
          {balances.map(([asset, val]) => (
            <div className="wc-bal" key={asset}>
              <span className="bal-val">{Number(val).toLocaleString('fr-FR')}</span>
              <span className="bal-asset">{asset.split('.')[0]}</span>
            </div>
          ))}
        </div>
      )}
      <Link className="wc-link" to={`/accounts/${address}`}>View account →</Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Home page
// ─────────────────────────────────────────────────────────────────────────────

function Home() {
  const [stats, setStats]   = React.useState(null);
  const { list, remove }    = useWatchlist();

  React.useEffect(() => {
    ledger().getStats().then(res => setStats(res.stats)).catch(() => {});
  }, []);

  return (
    <Wrapper>
      <div className="top-container">

        {/* Hero */}
        <div className="hero">
          <div className="hero-label">
            <div className="dot" />
            Corren Ledger
          </div>
          <h1>Horizon</h1>
          <p className="hero-sub">
            Financial transaction explorer, audit dashboard &amp; fund flow visualizer
          </p>
        </div>

        {/* Stats */}
        <div className="section-header">
          <span className="section-title">Ledger overview</span>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-glow" style={{ background: 'var(--accent)' }} />
            <div className="stat-label">Accounts</div>
            {stats
              ? <div className="stat-value">{stats.accounts.toLocaleString()}</div>
              : <div className="skeleton stat-skeleton" />
            }
          </div>
          <div className="stat-card">
            <div className="stat-glow" style={{ background: 'var(--blue)' }} />
            <div className="stat-label">Transactions</div>
            {stats
              ? <div className="stat-value">{stats.transactions.toLocaleString()}</div>
              : <div className="skeleton stat-skeleton" />
            }
          </div>
        </div>

        {/* Quick links */}
        <div className="section-header">
          <span className="section-title">Explore</span>
        </div>
        <div className="quick-grid">
          {[
            { to: '/accounts',     icon: '◎', label: 'Accounts' },
            { to: '/transactions', icon: '⇄', label: 'Transactions' },
            { to: '/assets',       icon: '◆', label: 'Assets' },
            { to: '/contracts',    icon: '▣', label: 'Contracts' },
            { to: '/graph',        icon: '◈', label: 'Fund Flow Graph' },
            { to: '/analytics',    icon: '▦', label: 'Analytics' },
          ].map(({ to, icon, label }) => (
            <Link key={to} to={to} className="quick-card">
              <div className="qc-left">
                <div className="qc-icon">{icon}</div>
                <span>{label}</span>
              </div>
              <span className="arrow">→</span>
            </Link>
          ))}
        </div>

        {/* Watchlist */}
        <div className="section-header">
          <span className="section-title">Watchlist</span>
          <Link to="/accounts">Manage →</Link>
        </div>

        {list.length === 0 ? (
          <div className="watchlist-empty">
            No accounts watched yet.<br />
            Open any account and click <strong>☆ Watch</strong> to pin it here.
          </div>
        ) : (
          <div className="watchlist-grid">
            {list.map(addr => (
              <WatchlistCard key={addr} address={addr} onRemove={remove} />
            ))}
          </div>
        )}

      </div>
    </Wrapper>
  );
}

export default Home;
