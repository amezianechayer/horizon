import * as React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;

  .icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    margin-bottom: 20px;
  }

  h2 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-1);
    margin-bottom: 8px;
    letter-spacing: -0.02em;
  }

  p {
    font-size: 14px;
    color: var(--text-3);
    max-width: 320px;
    line-height: 1.6;
    margin-bottom: 24px;
  }

  .hint {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: 12px;
    font-family: var(--font-mono);
    color: var(--text-3);
  }
`;

function Empty() {
  return (
    <Wrapper>
      <div className="icon">◎</div>
      <h2>Ledger is empty</h2>
      <p>No transactions yet. Execute a FaRl script to record your first fund movement.</p>
      <div className="hint">POST /{'{ledger}'}/transactions</div>
    </Wrapper>
  );
}

export default Empty;
