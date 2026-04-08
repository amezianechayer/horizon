import * as React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid var(--border);

  .counter {
    font-size: 12px;
    color: var(--text-3);
  }

  .actions {
    margin-left: auto;
    display: flex;
    gap: 6px;

    button {
      height: 30px;
      padding: 0 12px;
      background: var(--surface-2);
      border: 1px solid var(--border-2);
      border-radius: var(--radius-sm);
      color: var(--text-2);
      font-size: 12px;
      font-weight: 500;
      transition: background 0.15s, color 0.15s, border-color 0.15s;

      &:hover:not(:disabled) {
        background: var(--surface-3);
        border-color: var(--blue);
        color: var(--text-1);
      }

      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
    }
  }
`;

function Pagination({ handler, previous, next, total, size }) {
  return (
    <Wrapper>
      <div className="counter">
        {total > 0 && <span>{total.toLocaleString()} total</span>}
        {total > 0 && size > 0 && <span> · </span>}
        {size > 0 && <span>showing {size}</span>}
      </div>
      <div className="actions">
        <button onClick={() => handler('previous')} disabled={!previous}>← Prev</button>
        <button onClick={() => handler('next')} disabled={!next}>Next →</button>
      </div>
    </Wrapper>
  );
}

export default Pagination;
