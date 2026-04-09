import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';

const Nav = styled.nav`
  position: sticky;
  top: 0;
  z-index: 100;
  height: 56px;
  background: rgba(8, 11, 16, 0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  transition: background 0.25s, border-color 0.25s;

  [data-theme="light"] & {
    background: rgba(255, 255, 255, 0.88);
  }

  .inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 24px;
    height: 100%;
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 15px;
    font-weight: 700;
    color: var(--text-1);
    letter-spacing: -0.03em;
    flex-shrink: 0;
    img { border-radius: 6px; }
  }

  .links {
    display: flex;
    align-items: center;
    gap: 2px;
    list-style: none;
  }

  .nav-link {
    position: relative;
    padding: 6px 10px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-2);
    border-radius: 6px;
    transition: color 0.15s, background 0.15s;
    white-space: nowrap;

    &:hover {
      color: var(--text-1);
      background: var(--surface-3);
    }

    &.active {
      color: var(--text-1);
      &::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 10px; right: 10px;
        height: 2px;
        background: var(--accent);
        border-radius: 2px 2px 0 0;
      }
    }
  }

  .right {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ledger-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 11px;
    color: var(--text-2);
    font-family: 'Roboto Mono', monospace;

    .dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 6px var(--accent);
      flex-shrink: 0;
    }
  }

  .nav-link-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;

    .notif-badge {
      position: absolute;
      top: -2px; right: -4px;
      min-width: 16px; height: 16px;
      padding: 0 4px;
      background: var(--accent);
      color: #000;
      border-radius: 8px;
      font-size: 9px;
      font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 8px var(--accent);
      animation: pulse 2s infinite;
      pointer-events: none;
    }
  }

  .theme-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-2);
    font-size: 15px;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    flex-shrink: 0;

    &:hover {
      background: var(--surface-3);
      border-color: var(--border-2);
      color: var(--text-1);
    }
  }
`;

const LINKS = [
  { to: '/',             label: 'Overview',      exact: true },
  { to: '/accounts',     label: 'Accounts' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/graph',        label: 'Graph' },
  { to: '/analytics',    label: 'Analytics' },
];

function Navbar({ theme, onToggleTheme }) {
  const location = useLocation();
  const [txBadge, setTxBadge] = React.useState(0);

  React.useEffect(() => {
    function onNewTxs(e) {
      // Only show badge if not currently on /transactions
      if (!window.location.pathname.startsWith('/transactions')) {
        setTxBadge(n => n + (e.detail?.count || 1));
      }
    }
    function onViewed() { setTxBadge(0); }
    window.addEventListener('horizon:new-txs', onNewTxs);
    window.addEventListener('horizon:txs-viewed', onViewed);
    return () => {
      window.removeEventListener('horizon:new-txs', onNewTxs);
      window.removeEventListener('horizon:txs-viewed', onViewed);
    };
  }, []);

  // Clear badge when navigating to /transactions
  React.useEffect(() => {
    if (location.pathname.startsWith('/transactions')) setTxBadge(0);
  }, [location.pathname]);

  function isActive(to, exact) {
    if (exact) return location.pathname === to;
    return location.pathname.startsWith(to);
  }

  return (
    <Nav>
      <div className="inner">
        <Link to="/" className="logo">
          <img src="/img/corren-square.png" width="26" height="26" />
          <span>Horizon</span>
        </Link>

        <ul className="links">
          {LINKS.map(({ to, label, exact }) => (
            <li key={to}>
              <div className="nav-link-wrap">
                <Link to={to} className={`nav-link${isActive(to, exact) ? ' active' : ''}`}>
                  {label}
                </Link>
                {to === '/transactions' && txBadge > 0 && (
                  <span className="notif-badge">{txBadge > 99 ? '99+' : txBadge}</span>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="right">
          <div className="ledger-badge">
            <div className="dot" />
            <span>quickstart</span>
          </div>

          <button
            className="theme-btn"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? '☀' : '☽'}
          </button>
        </div>
      </div>
    </Nav>
  );
}

export default Navbar;
