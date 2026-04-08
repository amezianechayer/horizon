import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';

const Nav = styled.nav`
  position: sticky;
  top: 0;
  z-index: 100;
  height: 56px;
  background: rgba(8, 11, 16, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);

  .inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 24px;
    height: 100%;
    display: flex;
    align-items: center;
    gap: 32px;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    font-weight: 600;
    color: var(--text-1);
    letter-spacing: -0.02em;
    flex-shrink: 0;

    img { border-radius: 6px; }

    .dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--accent);
    }
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
    font-size: 13.5px;
    font-weight: 500;
    color: var(--text-2);
    border-radius: var(--radius-sm);
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
    padding: 5px 10px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: 12px;
    color: var(--text-2);
    font-family: var(--font-mono);

    .indicator {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 6px var(--accent);
    }
  }
`;

const LINKS = [
  { to: '/',            label: 'Overview',     exact: true },
  { to: '/accounts',   label: 'Accounts' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/graph',      label: 'Graph' },
  { to: '/analytics',  label: 'Analytics' },
];

function Navbar() {
  const location = useLocation();

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
              <Link to={to} className={`nav-link${isActive(to, exact) ? ' active' : ''}`}>
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="right">
          <div className="ledger-badge">
            <div className="indicator" />
            <span>quickstart</span>
          </div>
        </div>
      </div>
    </Nav>
  );
}

export default Navbar;
