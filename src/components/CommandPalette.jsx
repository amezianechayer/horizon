import * as React from 'react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import ledger from '../lib/ledger';

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 9000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 14vh;
  animation: fadeIn 0.12s ease;
`;

const Modal = styled.div`
  width: 620px;
  max-width: calc(100vw - 32px);
  background: var(--surface);
  border: 1px solid var(--border-2);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg), 0 0 0 1px rgba(0,208,132,0.04);
  overflow: hidden;
  animation: scaleIn 0.14s ease;

  .cp-search {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);

    .cp-icon {
      font-size: 16px;
      color: var(--text-3);
      flex-shrink: 0;
    }

    input {
      flex: 1;
      background: none;
      border: none;
      outline: none;
      font-size: 15px;
      color: var(--text-1);
      font-family: var(--font-ui);

      &::placeholder { color: var(--text-3); }
    }

    .cp-kbd {
      padding: 2px 6px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 4px;
      font-size: 10px;
      color: var(--text-3);
      font-family: var(--font-mono);
      flex-shrink: 0;
    }
  }

  .cp-results {
    max-height: 360px;
    overflow-y: auto;
    padding: 6px;
  }

  .cp-section {
    margin-bottom: 2px;

    .cp-section-title {
      padding: 6px 10px 4px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-3);
    }
  }

  .cp-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 10px;
    border-radius: var(--r);
    cursor: pointer;
    transition: background var(--t-fast);
    text-align: left;
    width: 100%;
    border: none;
    background: none;
    color: var(--text-1);

    &.active, &:hover { background: var(--surface-3); }
    &.active { background: var(--surface-3); }

    .cp-item-icon {
      width: 28px; height: 28px;
      border-radius: var(--r-sm);
      background: var(--surface-3);
      border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      font-size: 13px;
      flex-shrink: 0;
    }

    .cp-item-body {
      flex: 1;
      min-width: 0;

      .cp-item-label {
        font-size: 13px;
        font-weight: 500;
        color: var(--text-1);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family: var(--font-mono);
      }

      .cp-item-sub {
        font-size: 11px;
        color: var(--text-3);
        margin-top: 1px;
      }
    }

    .cp-item-hint {
      font-size: 11px;
      color: var(--text-3);
      flex-shrink: 0;
    }
  }

  .cp-empty {
    padding: 32px;
    text-align: center;
    color: var(--text-3);
    font-size: 13px;
  }

  .cp-footer {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 8px 14px;
    border-top: 1px solid var(--border);
    background: var(--surface-2);

    .cp-shortcut {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: var(--text-3);

      kbd {
        padding: 1px 5px;
        background: var(--surface-3);
        border: 1px solid var(--border-2);
        border-radius: 3px;
        font-size: 10px;
        font-family: var(--font-mono);
      }
    }
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Static nav items
// ─────────────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'nav-home',      icon: '⌂',  label: 'Overview',            sub: 'Dashboard',    path: '/' },
  { id: 'nav-accounts',  icon: '◎',  label: 'Accounts',            sub: 'Browse all',   path: '/accounts' },
  { id: 'nav-txns',      icon: '⇄',  label: 'Transactions',        sub: 'History',      path: '/transactions' },
  { id: 'nav-graph',     icon: '◈',  label: 'Transaction Graph',   sub: 'Visualize',    path: '/graph' },
  { id: 'nav-analytics', icon: '▦',  label: 'Analytics',           sub: 'Charts',       path: '/analytics' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

function CommandPalette({ onClose }) {
  const [query, setQuery]   = useState('');
  const [cursor, setCursor] = useState(0);
  const [accounts, setAccounts]     = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [searching, setSearching]   = useState(false);
  const inputRef = useRef(null);
  const history  = useHistory();
  const searchTimer = useRef(null);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current && inputRef.current.focus(), 30);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Load recent transactions on open (for quick access when query is empty)
  const [recentTxs, setRecentTxs] = useState([]);
  useEffect(() => {
    ledger().getTransactions({ page_size: 5 })
      .then(res => {
        const data = (res.cursor && res.cursor.data) || res.transactions || [];
        setRecentTxs(data.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  // Search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (!query.trim()) {
      setAccounts([]);
      setTransactions([]);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(() => {
      Promise.all([
        ledger().getAccounts({ address: query }).catch(() => ({ cursor: { data: [] } })),
        ledger().getTransactions({ page_size: 10 }).catch(() => ({ cursor: { data: [] } })),
      ]).then(([accRes, txRes]) => {
        const q = query.toLowerCase();
        const accs = (accRes.cursor && accRes.cursor.data) || [];
        const txData = (txRes.cursor && txRes.cursor.data) || txRes.transactions || [];
        const filteredAccs = accs.filter(a => a.address && a.address.toLowerCase().includes(q)).slice(0, 6);
        // Match transactions by txid or account in postings
        const filteredTxs = txData.filter(tx =>
          String(tx.txid).includes(query) ||
          tx.postings.some(p => p.source.toLowerCase().includes(q) || p.destination.toLowerCase().includes(q))
        ).slice(0, 4);
        setAccounts(filteredAccs);
        setTransactions(filteredTxs);
        setSearching(false);
      });
    }, 200);
  }, [query]);

  // Build flat results list
  const navItems   = query.trim()
    ? NAV_ITEMS.filter(n => n.label.toLowerCase().includes(query.toLowerCase()))
    : NAV_ITEMS;

  const txItems = (query.trim() ? transactions : recentTxs).map(tx => ({
    id: `tx-${tx.txid}`,
    icon: '⇄',
    label: `#${tx.txid}`,
    sub: tx.postings.length > 0
      ? `${tx.postings[0].source} → ${tx.postings[0].destination}`
      : 'Transaction',
    path: `/transactions`,
    kind: 'transaction',
  }));

  const results = [
    ...navItems.map(n => ({ ...n, kind: 'nav' })),
    ...accounts.map(a => ({
      id: `acc-${a.address}`,
      icon: '◎',
      label: a.address,
      sub: 'Account',
      path: `/accounts/${a.address}`,
      kind: 'account',
    })),
    ...txItems,
  ];

  const totalItems = results.length;

  // Keyboard navigation
  useEffect(() => {
    const handler = e => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor(c => Math.min(c + 1, totalItems - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor(c => Math.max(c - 1, 0));
      } else if (e.key === 'Enter') {
        const item = results[cursor];
        if (item) navigate(item);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cursor, results]);

  function navigate(item) {
    history.push(item.path);
    onClose();
  }

  // Group results
  const navResults  = results.filter(r => r.kind === 'nav');
  const accResults  = results.filter(r => r.kind === 'account');
  const txResults   = results.filter(r => r.kind === 'transaction');

  let idx = 0;
  function renderItem(item) {
    const i = idx++;
    const isActive = cursor === i;
    return (
      <button
        key={item.id}
        className={`cp-item${isActive ? ' active' : ''}`}
        onClick={() => navigate(item)}
        onMouseEnter={() => setCursor(i)}
      >
        <div className="cp-item-icon">{item.icon}</div>
        <div className="cp-item-body">
          <div className="cp-item-label">{item.label}</div>
          {item.sub && <div className="cp-item-sub">{item.sub}</div>}
        </div>
        {item.kind === 'nav' && <div className="cp-item-hint">Go to</div>}
      </button>
    );
  }

  return (
    <Backdrop onClick={onClose}>
      <Modal onClick={e => e.stopPropagation()}>

        <div className="cp-search">
          <span className="cp-icon">⌕</span>
          <input
            ref={inputRef}
            placeholder="Search accounts, navigate…"
            value={query}
            onChange={e => { setQuery(e.target.value); setCursor(0); }}
          />
          {searching && <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />}
          <span className="cp-kbd">Esc</span>
        </div>

        <div className="cp-results">
          {results.length === 0 && query && (
            <div className="cp-empty">No results for "{query}"</div>
          )}

          {navResults.length > 0 && (
            <div className="cp-section">
              <div className="cp-section-title">Navigation</div>
              {navResults.map(renderItem)}
            </div>
          )}

          {accResults.length > 0 && (
            <div className="cp-section">
              <div className="cp-section-title">Accounts</div>
              {accResults.map(renderItem)}
            </div>
          )}

          {txResults.length > 0 && (
            <div className="cp-section">
              <div className="cp-section-title">{query.trim() ? 'Transactions' : 'Recent transactions'}</div>
              {txResults.map(renderItem)}
            </div>
          )}
        </div>

        <div className="cp-footer">
          <div className="cp-shortcut"><kbd>↑↓</kbd> Navigate</div>
          <div className="cp-shortcut"><kbd>↵</kbd> Open</div>
          <div className="cp-shortcut"><kbd>Esc</kbd> Close</div>
        </div>

      </Modal>
    </Backdrop>
  );
}

export default CommandPalette;
