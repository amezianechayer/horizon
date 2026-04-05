import * as React from 'react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 200;
  display: flex;
  justify-content: flex-end;
`;

const Panel = styled.div`
  width: 380px;
  height: 100%;
  background: #0d1117;
  border-left: 1px solid #30363d;
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 32px rgba(0,0,0,0.5);
  animation: slideIn 0.22s ease;

  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }

  .panel-header {
    padding: 16px 18px;
    border-bottom: 1px solid #21262d;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;

    h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      color: #f0f6fc;
    }

    .close-btn {
      background: none;
      border: none;
      color: #8b949e;
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
      padding: 0 4px;
      transition: color 0.15s;
      &:hover { color: #f0f6fc; }
    }
  }

  .panel-summary {
    padding: 14px 18px;
    border-bottom: 1px solid #21262d;
    flex-shrink: 0;

    .flow-line {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: 'Roboto Mono', monospace;
      font-size: 11px;
      color: #c9d1d9;
      margin-bottom: 10px;
      flex-wrap: wrap;

      .account {
        background: #161b22;
        border: 1px solid #30363d;
        border-radius: 5px;
        padding: 3px 8px;
        color: #58a6ff;
        text-decoration: none;
        transition: border-color 0.15s;
        word-break: break-all;
        &:hover { border-color: #58a6ff; }
      }

      .arrow {
        color: #8b949e;
        font-size: 14px;
        flex-shrink: 0;
      }
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;

      .meta-item {
        background: #161b22;
        border: 1px solid #21262d;
        border-radius: 6px;
        padding: 8px 10px;

        .label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #6e7681;
          margin-bottom: 3px;
        }

        .value {
          font-size: 14px;
          font-weight: 600;
          color: #f0f6fc;
          font-family: 'Roboto Mono', monospace;
        }
      }
    }
  }

  .panel-list-header {
    padding: 10px 18px 6px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #6e7681;
    flex-shrink: 0;
  }

  .panel-list {
    overflow-y: auto;
    flex: 1;
    padding: 0 12px 16px;

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: #30363d; border-radius: 4px; }

    .tx-item {
      display: grid;
      grid-template-columns: 80px 1fr auto;
      align-items: center;
      gap: 8px;
      padding: 9px 10px;
      margin-bottom: 4px;
      background: #161b22;
      border: 1px solid #21262d;
      border-radius: 7px;
      transition: border-color 0.15s;
      cursor: default;

      &:hover { border-color: #30363d; }

      .txid {
        font-family: 'Roboto Mono', monospace;
        font-size: 11px;
        color: #58a6ff;
        text-decoration: none;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        &:hover { text-decoration: underline; }
      }

      .date {
        font-size: 11px;
        color: #8b949e;
      }

      .amount {
        font-family: 'Roboto Mono', monospace;
        font-size: 12px;
        font-weight: 600;
        color: #3fb950;
        white-space: nowrap;
        text-align: right;
      }
    }

    .empty {
      text-align: center;
      padding: 40px 20px;
      color: #6e7681;
      font-size: 13px;
    }
  }
`;

function formatAmount(amount, asset) {
  const parts = (asset || '').split('.');
  const precision = parts.length > 1 ? parseInt(parts[1], 10) : 0;
  const assetName = parts[0];
  const value = precision > 0 ? amount / Math.pow(10, precision) : amount;
  return `${value.toLocaleString('fr-FR', { minimumFractionDigits: precision, maximumFractionDigits: precision })} ${assetName}`;
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function EdgeDetailPanel({ edge, onClose }) {
  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!edge) return null;

  const { link, transactions } = edge;
  const sourceId = link.sourceId || (link.source?.id || link.source);
  const targetId = link.targetId || (link.target?.id || link.target);
  const asset    = link.asset;

  // Extract individual postings from matching transactions
  const postings = [];
  transactions.forEach(tx => {
    tx.postings.forEach(p => {
      if (
        link.originalSources.has(p.source) &&
        link.originalTargets.has(p.destination) &&
        p.asset === asset
      ) {
        postings.push({ ...p, txid: tx.txid, timestamp: tx.timestamp });
      }
    });
  });
  postings.sort((a, b) => b.timestamp - a.timestamp);

  const totalFormatted   = formatAmount(link.amount, asset);
  const txCount          = transactions.length;

  return (
    <Overlay onClick={onClose}>
      <Panel onClick={e => e.stopPropagation()}>

        <div className="panel-header">
          <h3>Flow Detail</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="panel-summary">
          <div className="flow-line">
            <Link className="account" to={`/accounts/${sourceId}`} onClick={onClose}>
              {sourceId.length > 22 ? sourceId.slice(0, 21) + '…' : sourceId}
            </Link>
            <span className="arrow">→</span>
            <Link className="account" to={`/accounts/${targetId}`} onClick={onClose}>
              {targetId.length > 22 ? targetId.slice(0, 21) + '…' : targetId}
            </Link>
          </div>

          <div className="meta-grid">
            <div className="meta-item">
              <div className="label">Asset</div>
              <div className="value">{asset.split('.')[0]}</div>
            </div>
            <div className="meta-item">
              <div className="label">Total</div>
              <div className="value" style={{ fontSize: 12 }}>{totalFormatted}</div>
            </div>
            <div className="meta-item">
              <div className="label">Transactions</div>
              <div className="value">{txCount}</div>
            </div>
            <div className="meta-item">
              <div className="label">Postings</div>
              <div className="value">{postings.length}</div>
            </div>
          </div>
        </div>

        <div className="panel-list-header">Transactions</div>

        <div className="panel-list">
          {postings.length === 0 && (
            <div className="empty">No matching transactions found</div>
          )}
          {postings.map((p, i) => (
            <div className="tx-item" key={i}>
              <span className="txid">#{p.txid}</span>
              <span className="date">{formatDate(p.timestamp)}</span>
              <span className="amount">{formatAmount(p.amount, p.asset)}</span>
            </div>
          ))}
        </div>

      </Panel>
    </Overlay>
  );
}

export default EdgeDetailPanel;
