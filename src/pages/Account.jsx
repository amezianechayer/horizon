import * as React from 'react';
import { useParams, Link } from 'react-router-dom';
import styled from 'styled-components';
import Balances from '../components/BalancesTable.jsx';
import Volumes from '../components/VolumesTable.jsx';
import ledger from '../lib/ledger';
import useWatchlist from '../lib/useWatchlist';
import TransactionsTable from '../components/TransactionsTable.jsx';

const Wrapper = styled.div`
  padding-bottom: 60px;

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-3);
    padding: 18px 0 16px;
    a { transition: color var(--t); &:hover { color: var(--text-1); } }
    .sep { opacity: 0.35; }
  }

  .account-hero {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 32px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border);

    .account-id {
      font-family: var(--font-mono);
      font-size: 22px;
      font-weight: 600;
      color: var(--text-1);
      word-break: break-all;
      margin-bottom: 8px;
    }

    .account-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
  }

  .watch-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: var(--r);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--t);
    flex-shrink: 0;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text-2);

    &:hover {
      border-color: var(--yellow);
      color: var(--yellow);
      background: var(--yellow-dim);
    }

    &.watching {
      border-color: var(--yellow);
      color: var(--yellow);
      background: var(--yellow-dim);
    }
  }

  .data-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    @media (max-width: 680px) { grid-template-columns: 1fr; }
  }

  .section-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-3);
    margin-bottom: 10px;
  }

  .graph-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r);
    font-size: 13px;
    color: var(--text-2);
    transition: all var(--t);

    &:hover {
      border-color: var(--accent-glow);
      color: var(--accent);
      background: var(--accent-dim);
    }
  }

  .txs-section {
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid var(--border);
  }

  .txs-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    gap: 10px;
    color: var(--text-3);
    font-size: 13px;
  }
`;

function accountType(id) {
  if (!id) return 'account';
  if (id === '@world' || id.startsWith('@world')) return 'world';
  if (id.includes(':')) return 'sub';
  return 'account';
}

const TYPE_CLASS = { world: 'badge-red', sub: 'badge-blue', account: 'badge-green' };
const TYPE_LABEL = { world: 'World',     sub: 'Sub-account', account: 'Account' };

function Account() {
  const { id }           = useParams();
  const [data, setData]  = React.useState(null);
  const { has, add, remove } = useWatchlist();
  const watching         = has(id);
  const type             = accountType(id);

  React.useEffect(() => {
    setData(null);
    ledger().getAccount(id).then(res => setData(res.account)).catch(() => {});
  }, [id]);

  return (
    <Wrapper>
      <div className="top-container">
        <div className="breadcrumb">
          <Link to="/accounts">Accounts</Link>
          <span className="sep">/</span>
          <span>{id}</span>
        </div>

        <div className="account-hero">
          <div>
            <div className="account-id">{id}</div>
            <div className="account-meta">
              <span className={`badge ${TYPE_CLASS[type]}`}>{TYPE_LABEL[type]}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className={`watch-btn${watching ? ' watching' : ''}`}
              onClick={() => watching ? remove(id) : add(id)}
            >
              {watching ? '★ Watching' : '☆ Watch'}
            </button>
          </div>
        </div>

        {!data && (
          <div className="loading-state">
            <div className="spinner" />
            <span>Loading account…</span>
          </div>
        )}

        {data && (
          <>
            <div className="data-grid">
              <div>
                <div className="section-title">Balances</div>
                <Balances balances={data.balances} />
              </div>
              <div>
                <div className="section-title">Volumes</div>
                <Volumes volumes={data.volumes} />
              </div>
            </div>

            <div className="txs-section">
              <div className="txs-section-header">
                <div className="section-title">Transaction history</div>
                <Link
                  className="graph-link"
                  to={`/graph?search=${encodeURIComponent(id)}`}
                >
                  ◈ View in graph
                </Link>
              </div>
              <TransactionsTable filters={{ account: id }} paginate />
            </div>
          </>
        )}
      </div>
    </Wrapper>
  );
}

export default Account;
