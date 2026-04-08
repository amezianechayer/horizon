import * as React from 'react';
import styled from 'styled-components';

const Table = styled.div`
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 16px;
    border-bottom: 1px solid var(--border);
    transition: background 0.1s;

    &:last-child { border-bottom: none; }
    &:hover { background: var(--surface-2); }

    .asset {
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 500;
      color: var(--text-2);
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 2px 7px;
    }

    .balance {
      font-family: var(--font-mono);
      font-size: 14px;
      font-weight: 600;
      color: var(--text-1);
    }
  }

  .empty {
    padding: 28px 16px;
    text-align: center;
    color: var(--text-3);
    font-size: 13px;
  }
`;

function Balances({ balances }) {
  const rows = Object.keys(balances || {}).map(asset => ({ asset, balance: balances[asset] }));

  return (
    <Table>
      {rows.length === 0 && <div className="empty">No balances</div>}
      {rows.map(({ asset, balance }) => (
        <div className="row" key={asset}>
          <span className="asset">{asset}</span>
          <span className="balance">{balance.toLocaleString('fr-FR')}</span>
        </div>
      ))}
    </Table>
  );
}

export default Balances;
