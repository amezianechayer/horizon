import * as React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import ledger from '../lib/ledger';

const Wrapper = styled.div`
  .hero {
    padding: 48px 0 32px;

    .eyebrow {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--accent);
      margin-bottom: 10px;
    }

    h1 {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-1);
      letter-spacing: -0.03em;
      margin-bottom: 6px;
    }

    p {
      font-size: 14px;
      color: var(--text-3);
    }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    margin-bottom: 32px;
  }

  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px 22px;
    transition: border-color 0.15s;

    &:hover { border-color: var(--border-2); }

    .stat-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--text-3);
      margin-bottom: 10px;
    }

    .stat-value {
      font-family: var(--font-mono);
      font-size: 36px;
      font-weight: 700;
      color: var(--text-1);
      letter-spacing: -0.02em;
      line-height: 1;
    }

    .stat-icon {
      font-size: 18px;
      margin-bottom: 10px;
      opacity: 0.5;
    }
  }

  .quick-links {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
  }

  .quick-link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-2);
    font-size: 13px;
    font-weight: 500;
    transition: border-color 0.15s, color 0.15s, background 0.15s;

    &:hover {
      border-color: var(--border-2);
      color: var(--text-1);
      background: var(--surface-2);
    }

    .arrow { opacity: 0.4; font-size: 16px; }
  }

  .section-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-3);
    margin-bottom: 10px;
  }
`;

function Home() {
  const [data, setData] = React.useState({ accounts: 0, transactions: 0 });
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    ledger().getStats().then(res => {
      setData(res.stats);
      setReady(true);
    });
  }, []);

  return (
    <Wrapper>
      <div className="top-container">
        <div className="hero">
          <div className="eyebrow">Corren Ledger</div>
          <h1>Horizon</h1>
          <p>Financial transaction explorer &amp; audit dashboard</p>
        </div>

        <div className="section-label">Overview</div>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Accounts</div>
            <div className="stat-value">{ready ? data.accounts.toLocaleString() : '—'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Transactions</div>
            <div className="stat-value">{ready ? data.transactions.toLocaleString() : '—'}</div>
          </div>
        </div>

        <div className="section-label" style={{ marginBottom: 10 }}>Explore</div>
        <div className="quick-links">
          {[
            { to: '/accounts',     label: 'Browse Accounts' },
            { to: '/transactions', label: 'Transactions' },
            { to: '/graph',        label: 'Fund Flow Graph' },
            { to: '/analytics',    label: 'Analytics' },
          ].map(({ to, label }) => (
            <Link key={to} to={to} className="quick-link">
              <span>{label}</span>
              <span className="arrow">→</span>
            </Link>
          ))}
        </div>
      </div>
    </Wrapper>
  );
}

export default Home;
