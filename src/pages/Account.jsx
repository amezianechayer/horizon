import * as React from 'react';
import { useParams, Link } from 'react-router-dom';
import styled from 'styled-components';
import Balances from '../components/BalancesTable.jsx';
import Volumes from '../components/VolumesTable.jsx';
import ledger from '../lib/ledger';

const Wrapper = styled.div`
  padding-bottom: 48px;

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-3);
    margin-bottom: 20px;

    a { color: var(--text-3); transition: color 0.15s; &:hover { color: var(--text-1); } }
    .sep { opacity: 0.4; }
  }

  .account-header {
    margin-bottom: 28px;

    .account-id {
      font-family: var(--font-mono);
      font-size: 20px;
      font-weight: 600;
      color: var(--text-1);
      letter-spacing: -0.01em;
      word-break: break-all;
      margin-bottom: 8px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-world   { background: rgba(248,81,73,0.12);  color: #f85149;        border: 1px solid rgba(248,81,73,0.25); }
    .badge-sub     { background: rgba(88,166,255,0.1);  color: var(--blue);    border: 1px solid rgba(88,166,255,0.2); }
    .badge-account { background: rgba(63,185,80,0.1);   color: var(--accent);  border: 1px solid rgba(63,185,80,0.2); }
  }

  .data-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .section-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text-3);
    padding: 0 4px 10px;
  }

  .loading {
    display: flex; align-items: center; justify-content: center;
    height: 200px; color: var(--text-3); font-size: 13px;
  }
`;

function accountType(id) {
  if (!id) return 'account';
  if (id === '@world' || id.startsWith('@world')) return 'world';
  if (id.includes(':')) return 'sub';
  return 'account';
}

const TYPE_LABEL = { world: 'World', sub: 'Sub-account', account: 'Account' };

function Account() {
  const { id } = useParams();
  const [data, setData] = React.useState(null);
  const type = accountType(id);

  React.useEffect(() => {
    setData(null);
    ledger().getAccount(id).then(res => setData(res.account));
  }, [id]);

  return (
    <Wrapper>
      <div className="top-container mt20">
        <div className="breadcrumb">
          <Link to="/accounts">Accounts</Link>
          <span className="sep">/</span>
          <span>{id}</span>
        </div>

        <div className="account-header">
          <div className="account-id">{id}</div>
          <span className={`badge badge-${type}`}>{TYPE_LABEL[type]}</span>
        </div>

        {!data && <div className="loading">Loading…</div>}

        {data && (
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
        )}
      </div>
    </Wrapper>
  );
}

export default Account;
